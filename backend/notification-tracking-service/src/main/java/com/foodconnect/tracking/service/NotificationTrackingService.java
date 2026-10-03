package com.foodconnect.tracking.service;

import com.foodconnect.tracking.dto.*;
import com.foodconnect.tracking.entity.*;
import com.foodconnect.tracking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * Handles:
 * 1. Persisting and broadcasting notifications to nearby NGOs via WebSocket.
 * 2. Live GPS tracking – saves breadcrumbs and broadcasts to /topic/tracking/{donationId}.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationTrackingService {

    private final NotificationRepository notificationRepository;
    private final TrackingPointRepository trackingPointRepository;
    private final SimpMessagingTemplate messagingTemplate;

    // ── Notification: create and push ─────────────────────────────────────────
    @Transactional
    public Notification createAndPush(Long recipientId, Long donationId,
                                       Notification.NotificationType type,
                                       String title, String message) {
        Notification n = Notification.builder()
                .recipientId(recipientId)
                .donationId(donationId)
                .type(type)
                .title(title)
                .message(message)
                .isRead(false)
                .build();
        n = notificationRepository.save(n);

        // Push to /topic/user/{recipientId}/notifications and /topic/ngo/{recipientId}/notifications
        messagingTemplate.convertAndSend("/topic/user/" + recipientId + "/notifications", n);
        messagingTemplate.convertAndSend("/topic/ngo/" + recipientId + "/notifications", n);
        log.debug("Pushed notification to recipient {}: {}", recipientId, title);

        return n;
    }

    /** Called by donation-service to notify all NGOs within the donation radius. */
    @Transactional
    public void notifyNearbyNgos(NotifyNgosRequest req) {
        // The NGO user IDs are passed in the request (donation-service resolved them)
        if (req.getNgoUserIds() != null) {
            for (Long ngoUserId : req.getNgoUserIds()) {
                createAndPush(
                        ngoUserId,
                        req.getDonationId(),
                        Notification.NotificationType.DONATION_NEARBY,
                        "New Food Donation Nearby!",
                        buildNearbyMessage(req)
                );
            }
        }

        // Broadcast to all active NGO dashboards
        messagingTemplate.convertAndSend("/topic/donations", Map.of(
                "event", "NEW_DONATION",
                "donationId", req.getDonationId() != null ? req.getDonationId() : 0,
                "foodName", req.getFoodName() != null ? req.getFoodName() : "",
                "donorName", req.getDonorName() != null ? req.getDonorName() : ""
        ));
    }

    /** Notify donor that an NGO accepted, and other NGOs that donation is gone. */
    @Transactional
    public void notifyAcceptance(AcceptanceNotifyRequest req) {
        // Notify donor
        createAndPush(req.getDonorUserId(), req.getDonationId(),
                Notification.NotificationType.DONATION_ACCEPTED,
                "Your Donation Was Accepted!",
                "An NGO has accepted your donation and will pick it up soon.");

        // Notify other NGOs that received the NEARBY notification
        if (req.getOtherNgoUserIds() != null) {
            for (Long otherNgoUserId : req.getOtherNgoUserIds()) {
                createAndPush(otherNgoUserId, req.getDonationId(),
                        Notification.NotificationType.DONATION_ALREADY_TAKEN,
                        "Donation Already Accepted",
                        "Another NGO accepted this donation before you.");
            }
        }
    }

    /** Notify volunteer and donor upon volunteer assignment. */
    @Transactional
    public void notifyVolunteerAssignment(VolunteerAssignNotifyRequest req) {
        // 1. Notify volunteer
        if (req.getVolunteerUserId() != null) {
            createAndPush(
                    req.getVolunteerUserId(),
                    req.getDonationId(),
                    Notification.NotificationType.VOLUNTEER_ASSIGNED,
                    "New Food Pickup Task Assigned!",
                    "You are assigned to pick up " + req.getFoodName() + " at " + req.getPickupAddress() + "."
            );
        }

        // 2. Notify donor
        if (req.getDonorUserId() != null) {
            createAndPush(
                    req.getDonorUserId(),
                    req.getDonationId(),
                    Notification.NotificationType.VOLUNTEER_ASSIGNED,
                    "Volunteer Assigned to Your Donation",
                    "Volunteer " + (req.getVolunteerName() != null ? req.getVolunteerName() : "") + " is coming to pick up your food donation."
            );
        }

        // 3. Push real-time event directly to volunteer's assignment channel
        if (req.getVolunteerProfileId() != null) {
            messagingTemplate.convertAndSend("/topic/volunteer/" + req.getVolunteerProfileId() + "/assignments",
                    Map.of(
                            "event", "ASSIGNED",
                            "donationId", req.getDonationId(),
                            "foodName", req.getFoodName() != null ? req.getFoodName() : "",
                            "pickupAddress", req.getPickupAddress() != null ? req.getPickupAddress() : ""
                    ));
        }

        // 4. Broadcast on /topic/donations
        messagingTemplate.convertAndSend("/topic/donations", Map.of(
                "event", "VOLUNTEER_ASSIGNED",
                "donationId", req.getDonationId()
        ));
    }

    /** Push a generic status update notification to the donor. */
    @Transactional
    public void notifyStatusUpdate(Long donorUserId, Long donationId, String status) {
        createAndPush(donorUserId, donationId,
                Notification.NotificationType.STATUS_UPDATED,
                "Donation Status Updated",
                "Your donation status is now: " + status.replace("_", " "));

        // Also broadcast update to tracking topic and donations topic
        messagingTemplate.convertAndSend("/topic/donations", Map.of(
                "event", "STATUS_UPDATED",
                "donationId", donationId,
                "status", status
        ));
    }

    // ── Notification: inbox ───────────────────────────────────────────────────
    public List<Notification> getInbox(Long userId) {
        return notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
    }

    public List<Notification> getUnread(Long userId) {
        return notificationRepository.findByRecipientIdAndIsReadFalseOrderByCreatedAtDesc(userId);
    }

    public long getUnreadCount(Long userId) {
        return notificationRepository.countByRecipientIdAndIsReadFalse(userId);
    }

    @Transactional
    public Notification markRead(Long notificationId) {
        Notification n = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new RuntimeException("Notification not found: " + notificationId));
        n.setRead(true);
        return notificationRepository.save(n);
    }

    @Transactional
    public void markAllRead(Long userId) {
        notificationRepository.markAllReadForUser(userId);
    }

    // ── Tracking: record GPS ping and broadcast ───────────────────────────────
    @Transactional
    public TrackingPoint recordLocation(Long donationId, Long collectorId,
                                        LocationUpdateRequest req) {
        TrackingPoint tp = TrackingPoint.builder()
                .donationId(donationId)
                .collectorId(collectorId)
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .speedKmh(req.getSpeedKmh())
                .heading(req.getHeading())
                .build();
        tp = trackingPointRepository.save(tp);

        // Broadcast to everyone tracking this donation
        messagingTemplate.convertAndSend(
                "/topic/tracking/" + donationId,
                Map.of(
                        "donationId", donationId,
                        "lat", req.getLatitude(),
                        "lng", req.getLongitude(),
                        "speed", req.getSpeedKmh() != null ? req.getSpeedKmh() : 0,
                        "heading", req.getHeading() != null ? req.getHeading() : 0,
                        "timestamp", tp.getRecordedAt().toString()
                )
        );
        return tp;
    }

    public List<TrackingPoint> getTrail(Long donationId) {
        return trackingPointRepository.findByDonationIdOrderByRecordedAtAsc(donationId);
    }

    public TrackingPoint getLatestLocation(Long donationId) {
        return trackingPointRepository.findFirstByDonationIdOrderByRecordedAtDesc(donationId)
                .orElseThrow(() -> new RuntimeException("No tracking data for donation: " + donationId));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────
    private String buildNearbyMessage(NotifyNgosRequest req) {
        return String.format(
                "Donor: %s | Food: %s | Qty: %d servings | Distance: ~%.1f km | Expires in: soon. Click Accept to claim.",
                req.getDonorName(),
                req.getFoodName(),
                req.getQuantity(),
                req.getDistanceKm() != null ? req.getDistanceKm() : 0.0
        );
    }
}
