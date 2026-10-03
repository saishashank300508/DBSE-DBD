package com.foodconnect.donation.service;

import com.foodconnect.donation.dto.*;
import com.foodconnect.donation.entity.*;
import com.foodconnect.donation.exception.ResourceNotFoundException;
import com.foodconnect.donation.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.LocalDateTime;
import java.util.*;

/**
 * Core business logic for donations.
 * Handles CRUD, optimistic locking acceptance, strict status state machine,
 * smart volunteer matching, OTP handover, and auto-expiry.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DonationService {

    private final DonationRepository donationRepository;
    private final DonationStatusHistoryRepository statusHistoryRepository;
    private final DistributionRepository distributionRepository;
    private final WebClient webClient;

    @Value("${services.auth-service.url:http://localhost:8081}")
    private String authServiceUrl;

    @Value("${services.notification-service.url:http://localhost:8083}")
    private String notificationServiceUrl;

    @Value("${donation.default-radius-km:10}")
    private double defaultRadiusKm;

    @Value("${donation.radius-expansion-km:5}")
    private double radiusExpansionKm;

    @Value("${donation.max-radius-km:50}")
    private double maxRadiusKm;

    @Value("${donation.no-accept-timeout-minutes:30}")
    private int noAcceptTimeoutMinutes;

    // ── Create ────────────────────────────────────────────────────────────────
    @Transactional
    public DonationDto create(CreateDonationRequest req, Long donorId, String donorName) {
        LocalDateTime now = LocalDateTime.now();
        if (req.getCookedAt() == null) {
            req.setCookedAt(now);
        }
        if (req.getExpiresAt() == null || req.getExpiresAt().isBefore(now)) {
            throw new IllegalArgumentException("Expires at must be in the future");
        }
        if (req.getExpiresAt().isBefore(req.getCookedAt())) {
            throw new IllegalArgumentException("Expires at must be after cooked at time");
        }

        Donation donation = Donation.builder()
                .donorId(donorId)
                .foodName(req.getFoodName())
                .foodType(req.getFoodType() != null ? req.getFoodType() : Donation.FoodType.VEG)
                .quantity(req.getQuantity())
                .cookedAt(req.getCookedAt())
                .expiresAt(req.getExpiresAt())
                .pickupAddress(req.getPickupAddress())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .photoUrl(req.getPhotoUrl())
                .contactNumber(req.getContactNumber())
                .description(req.getDescription())
                .status(Donation.DonationStatus.POSTED)
                .notificationRadiusKm(req.getNotificationRadiusKm() != null
                        ? req.getNotificationRadiusKm() : defaultRadiusKm)
                .pickupOtp(generateOtp())
                .deliveryOtp(generateOtp())
                .build();

        donation = donationRepository.save(donation);

        Map<String, Object> donorUser = fetchUser(donorId);
        String realDonorName = donorUser != null && donorUser.get("fullName") != null
                ? (String) donorUser.get("fullName")
                : donorName;

        recordHistory(donation, "POSTED", donorId, "Donation posted by " + realDonorName);

        // Notify nearby NGOs asynchronously
        notifyNearbyNgos(donation, realDonorName);

        log.info("Donation created: id={} donor={}", donation.getId(), donorId);
        return toDto(donation, realDonorName, null);
    }

    // ── Read ──────────────────────────────────────────────────────────────────
    @Transactional
    public DonationDto getById(Long id) {
        Donation d = donationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + id));
        d = checkAndExpire(d);
        return toDto(d, null, null);
    }

    @Transactional
    public List<DonationDto> getMyDonations(Long donorId) {
        return donationRepository.findByDonorId(donorId)
                .stream()
                .map(this::checkAndExpire)
                .map(d -> toDto(d, null, null))
                .toList();
    }

    @Transactional
    public List<DonationDto> getNearby(double lat, double lng, double radiusKm) {
        return donationRepository.findNearby(lat, lng, radiusKm)
                .stream()
                .map(this::checkAndExpire)
                .filter(d -> d.getStatus() == Donation.DonationStatus.POSTED)
                .map(d -> {
                    double dist = haversine(lat, lng, d.getLatitude(), d.getLongitude());
                    return toDto(d, null, dist);
                }).toList();
    }

    @Transactional
    public List<DonationDto> getByNgo(Long ngoId) {
        return donationRepository.findByAcceptedNgoId(ngoId)
                .stream()
                .map(this::checkAndExpire)
                .map(d -> toDto(d, null, null)).toList();
    }

    @Transactional
    public List<DonationDto> getByVolunteer(Long volunteerId) {
        return donationRepository.findByAssignedVolunteerId(volunteerId)
                .stream()
                .map(this::checkAndExpire)
                .map(d -> toDto(d, null, null)).toList();
    }

    public List<DonationDto> getAll() {
        return donationRepository.findAll()
                .stream().map(d -> toDto(d, null, null)).toList();
    }

    // ── Accept (NGO) ──────────────────────────────────────────────────────────
    @Transactional
    public DonationDto acceptDonation(Long donationId, Long ngoId, Long ngoUserId) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + donationId));

        donation = checkAndExpire(donation);
        if (donation.getStatus() == Donation.DonationStatus.EXPIRED) {
            throw new IllegalStateException("Donation has already expired and cannot be accepted");
        }

        if (donation.getStatus() != Donation.DonationStatus.POSTED) {
            throw new IllegalStateException(
                    donation.getStatus() == Donation.DonationStatus.ACCEPTED_BY_NGO
                            ? "Donation already accepted by another NGO"
                            : "Donation is no longer available (status: " + donation.getStatus() + ")");
        }

        validateStatusTransition(donation.getStatus(), Donation.DonationStatus.ACCEPTED_BY_NGO);

        Map<String, Object> ngo = fetchNgo(ngoId);
        String ngoName = ngo != null && ngo.get("organization") != null
                ? (String) ngo.get("organization") : "NGO #" + ngoId;

        donation.setStatus(Donation.DonationStatus.ACCEPTED_BY_NGO);
        donation.setAcceptedNgoId(ngoId);
        if (donation.getPickupOtp() == null) donation.setPickupOtp(generateOtp());
        if (donation.getDeliveryOtp() == null) donation.setDeliveryOtp(generateOtp());
        donation = donationRepository.save(donation);

        recordHistory(donation, "ACCEPTED_BY_NGO", ngoUserId, "Accepted by " + ngoName);

        // Notify donor + other NGOs
        notifyAcceptance(donation, ngoId);

        log.info("Donation {} accepted by NGO {} ({})", donationId, ngoId, ngoName);
        return toDto(donation, null, null);
    }

    // ── Smart Volunteer Matching & Available Volunteers ───────────────────────
    public List<AvailableVolunteerDto> getAvailableVolunteers(Long donationId) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + donationId));

        List<Map<String, Object>> volunteers = fetchAllVolunteers();
        List<AvailableVolunteerDto> list = new ArrayList<>();

        for (Map<String, Object> v : volunteers) {
            Long vId = v.get("id") != null ? ((Number) v.get("id")).longValue() : null;
            Long vUserId = v.get("userId") != null ? ((Number) v.get("userId")).longValue() : null;
            String name = (String) v.get("fullName");
            String phone = (String) v.get("phone");
            String email = (String) v.get("email");
            Double vLat = v.get("currentLat") != null ? ((Number) v.get("currentLat")).doubleValue() : null;
            Double vLng = v.get("currentLng") != null ? ((Number) v.get("currentLng")).doubleValue() : null;

            double dist = 0.0;
            if (vLat != null && vLng != null) {
                dist = haversine(donation.getLatitude(), donation.getLongitude(), vLat, vLng);
            } else {
                dist = 5.0; // fallback moderate distance if location not yet detected
            }

            // Workload: count active tasks
            int activeTasks = 0;
            if (vId != null) {
                activeTasks = (int) donationRepository.findByAssignedVolunteerId(vId).stream()
                        .filter(d -> d.getStatus() == Donation.DonationStatus.VOLUNTEER_ASSIGNED ||
                                     d.getStatus() == Donation.DonationStatus.PICKUP_IN_PROGRESS ||
                                     d.getStatus() == Donation.DonationStatus.PICKED_UP)
                        .count();
            }

            // Composite score: distance + (active tasks * 3 km penalty)
            double score = dist + (activeTasks * 3.0);

            list.add(AvailableVolunteerDto.builder()
                    .id(vId)
                    .userId(vUserId)
                    .fullName(name)
                    .phone(phone)
                    .email(email)
                    .currentLat(vLat)
                    .currentLng(vLng)
                    .distanceKm(Math.round(dist * 10.0) / 10.0)
                    .activeTasks(activeTasks)
                    .score(score)
                    .build());
        }

        // Rank by composite score (nearest with lowest workload first)
        list.sort(Comparator.comparingDouble(AvailableVolunteerDto::getScore));
        return list;
    }

    // ── Auto-assign nearest volunteer ─────────────────────────────────────────
    @Transactional
    public DonationDto autoAssignVolunteer(Long donationId, Long ngoUserId) {
        List<AvailableVolunteerDto> ranked = getAvailableVolunteers(donationId);
        if (ranked.isEmpty()) {
            throw new IllegalStateException("No available volunteers found to assign");
        }
        AvailableVolunteerDto top = ranked.get(0);
        return assignVolunteer(donationId, top.getId(), ngoUserId);
    }

    // ── Assign volunteer (manual) ─────────────────────────────────────────────
    @Transactional
    public DonationDto assignVolunteer(Long donationId, Long volunteerId, Long ngoUserId) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + donationId));

        if (donation.getStatus() != Donation.DonationStatus.ACCEPTED_BY_NGO) {
            throw new IllegalStateException(
                    "Cannot assign volunteer: donation status is " + donation.getStatus());
        }

        validateStatusTransition(donation.getStatus(), Donation.DonationStatus.VOLUNTEER_ASSIGNED);

        Map<String, Object> vol = fetchVolunteer(volunteerId);
        String volName = vol != null && vol.get("fullName") != null
                ? (String) vol.get("fullName") : "Volunteer #" + volunteerId;
        Long volUserId = vol != null && vol.get("userId") != null
                ? ((Number) vol.get("userId")).longValue() : volunteerId;

        donation.setAssignedVolunteerId(volunteerId);
        donation.setStatus(Donation.DonationStatus.VOLUNTEER_ASSIGNED);
        donation = donationRepository.save(donation);

        recordHistory(donation, "VOLUNTEER_ASSIGNED", ngoUserId,
                "Assigned to volunteer " + volName + " for pickup");

        // Notify volunteer and donor via notification-service
        notifyVolunteerAssignment(donation, volUserId, volunteerId, volName);

        log.info("Volunteer {} ({}) assigned to donation {} by NGO user {}", volunteerId, volName, donationId, ngoUserId);
        return toDto(donation, null, null);
    }

    // ── Volunteer accepts task ────────────────────────────────────────────────
    @Transactional
    public DonationDto volunteerAcceptTask(Long donationId, Long userId) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + donationId));

        validateStatusTransition(donation.getStatus(), Donation.DonationStatus.PICKUP_IN_PROGRESS);

        Map<String, Object> u = fetchUser(userId);
        String name = u != null && u.get("fullName") != null ? (String) u.get("fullName") : "Volunteer";

        donation.setStatus(Donation.DonationStatus.PICKUP_IN_PROGRESS);
        donation = donationRepository.save(donation);

        recordHistory(donation, "PICKUP_IN_PROGRESS", userId, name + " is on the way for pickup");
        pushStatusUpdate(donation);

        return toDto(donation, null, null);
    }

    // ── Update Status (Strict Flow & OTP Verification) ─────────────────────────
    @Transactional
    public DonationDto updateStatus(Long donationId, UpdateStatusRequest req, Long userId) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + donationId));

        // If duplicate status request, ignore without error
        if (donation.getStatus() == req.getStatus()) {
            return toDto(donation, null, null);
        }

        validateStatusTransition(donation.getStatus(), req.getStatus());

        // OTP verification for pickup
        if (req.getStatus() == Donation.DonationStatus.PICKED_UP) {
            if (donation.getPickupOtp() != null && !donation.getPickupOtp().isEmpty()) {
                if (req.getOtp() == null || !req.getOtp().trim().equalsIgnoreCase(donation.getPickupOtp().trim())) {
                    throw new IllegalArgumentException("Invalid Pickup OTP. Please enter the 4-digit code provided by the donor.");
                }
            }
        }

        // OTP verification for delivery (reached NGO)
        if (req.getStatus() == Donation.DonationStatus.REACHED_NGO || req.getStatus() == Donation.DonationStatus.DISTRIBUTED) {
            if (donation.getDeliveryOtp() != null && !donation.getDeliveryOtp().isEmpty() && req.getOtp() != null && !req.getOtp().trim().isEmpty()) {
                if (!req.getOtp().trim().equalsIgnoreCase(donation.getDeliveryOtp().trim())) {
                    throw new IllegalArgumentException("Invalid Delivery OTP. Please enter the 4-digit code provided by the NGO.");
                }
            }
        }

        Map<String, Object> u = fetchUser(userId);
        String userName = u != null && u.get("fullName") != null ? (String) u.get("fullName") : "User #" + userId;

        donation.setStatus(req.getStatus());
        if (req.getVolunteerId() != null) {
            donation.setAssignedVolunteerId(req.getVolunteerId());
        }
        donation = donationRepository.save(donation);

        String note = req.getNote();
        if (note == null || note.trim().isEmpty()) {
            note = switch (req.getStatus()) {
                case PICKUP_IN_PROGRESS -> userName + " is on the way for pickup";
                case PICKED_UP -> "Food picked up by " + userName + " (verified with OTP)";
                case REACHED_NGO -> "Food safely delivered to NGO by " + userName + " (verified with OTP)";
                case OUT_FOR_DISTRIBUTION -> "Food out for distribution to beneficiaries";
                case DISTRIBUTED -> "Food distributed to beneficiaries by " + userName;
                case CANCELLED -> "Donation cancelled by " + userName;
                default -> "Status updated to " + req.getStatus().name().replace('_', ' ');
            };
        }

        recordHistory(donation, req.getStatus().name(), userId, note,
                req.getLatitude(), req.getLongitude());

        pushStatusUpdate(donation);

        return toDto(donation, null, null);
    }

    // ── Cancel (Donor) ────────────────────────────────────────────────────────
    @Transactional
    public DonationDto cancel(Long donationId, Long donorId) {
        Donation donation = donationRepository.findById(donationId)
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found: " + donationId));

        if (!donation.getDonorId().equals(donorId)) {
            throw new AccessDeniedException("You can only cancel your own donations");
        }
        if (donation.getStatus() != Donation.DonationStatus.POSTED && donation.getStatus() != Donation.DonationStatus.ACCEPTED_BY_NGO) {
            throw new IllegalStateException("Donations already in transit cannot be cancelled");
        }

        Map<String, Object> donor = fetchUser(donorId);
        String donorName = donor != null && donor.get("fullName") != null ? (String) donor.get("fullName") : "Donor";

        donation.setStatus(Donation.DonationStatus.CANCELLED);
        donation = donationRepository.save(donation);
        recordHistory(donation, "CANCELLED", donorId, "Cancelled by " + donorName);
        pushStatusUpdate(donation);
        return toDto(donation, null, null);
    }

    // ── Distribution ──────────────────────────────────────────────────────────
    @Transactional
    public Distribution recordDistribution(CreateDistributionRequest req,
                                           Long ngoId, Long distributedBy) {
        Donation donation = donationRepository.findById(req.getDonationId())
                .orElseThrow(() -> new ResourceNotFoundException("Donation not found"));

        if (!ngoId.equals(donation.getAcceptedNgoId())) {
            throw new AccessDeniedException("Only the accepting NGO can record distribution");
        }

        Map<String, Object> ngo = fetchNgo(ngoId);
        String ngoName = ngo != null && ngo.get("organization") != null ? (String) ngo.get("organization") : "NGO";

        Distribution dist = Distribution.builder()
                .donationId(req.getDonationId())
                .ngoId(ngoId)
                .distributedBy(distributedBy)
                .beneficiaryCount(req.getBeneficiaryCount())
                .locationName(req.getLocationName())
                .latitude(req.getLatitude())
                .longitude(req.getLongitude())
                .notes(req.getNotes())
                .photoUrl(req.getPhotoUrl())
                .build();
        dist = distributionRepository.save(dist);

        donation.setStatus(Donation.DonationStatus.DISTRIBUTED);
        donationRepository.save(donation);
        recordHistory(donation, "DISTRIBUTED", distributedBy,
                "Distributed to " + req.getBeneficiaryCount() + " people at "
                        + (req.getLocationName() != null ? req.getLocationName() : "community")
                        + " by " + ngoName);

        pushStatusUpdate(donation);
        return dist;
    }

    public Distribution getDistribution(Long donationId) {
        return distributionRepository.findByDonationId(donationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Distribution not found for donation: " + donationId));
    }

    // ── Admin Stats ───────────────────────────────────────────────────────────
    public AdminStatsDto getAdminStats() {
        return AdminStatsDto.builder()
                .totalDonations(donationRepository.count())
                .activeDonations(donationRepository.countByStatus(Donation.DonationStatus.POSTED)
                        + donationRepository.countByStatus(Donation.DonationStatus.ACCEPTED_BY_NGO)
                        + donationRepository.countByStatus(Donation.DonationStatus.VOLUNTEER_ASSIGNED)
                        + donationRepository.countByStatus(Donation.DonationStatus.PICKUP_IN_PROGRESS)
                        + donationRepository.countByStatus(Donation.DonationStatus.PICKED_UP)
                        + donationRepository.countByStatus(Donation.DonationStatus.REACHED_NGO))
                .distributedDonations(donationRepository.countByStatus(Donation.DonationStatus.DISTRIBUTED))
                .totalMealsServed(distributionRepository.sumBeneficiaries())
                .expiredDonations(donationRepository.countByStatus(Donation.DonationStatus.EXPIRED))
                .cancelledDonations(donationRepository.countByStatus(Donation.DonationStatus.CANCELLED))
                .build();
    }

    // ── Status History ────────────────────────────────────────────────────────
    public List<DonationStatusHistory> getStatusHistory(Long donationId) {
        return statusHistoryRepository.findByDonationIdOrderByChangedAtAsc(donationId);
    }

    // ── Scheduled: Auto-Expiry (every 1 min) ───────────────────────────────────
    @Scheduled(fixedDelay = 60000)
    @Transactional
    public void autoExpireDonations() {
        LocalDateTime now = LocalDateTime.now();
        List<Donation> all = donationRepository.findAll();
        for (Donation d : all) {
            if ((d.getStatus() == Donation.DonationStatus.POSTED || d.getStatus() == Donation.DonationStatus.ACCEPTED_BY_NGO)
                    && d.getExpiresAt() != null && d.getExpiresAt().isBefore(now)) {
                d.setStatus(Donation.DonationStatus.EXPIRED);
                donationRepository.save(d);
                recordHistory(d, "EXPIRED", null, "Donation expired automatically past safe consumption time");
                pushStatusUpdate(d);
                log.info("Auto-expired donation {}", d.getId());
            }
        }
    }

    // ── Scheduled: Radius Expansion ───────────────────────────────────────────
    @Scheduled(fixedDelayString = "PT5M")
    public void expandRadiusForUnansweredDonations() {
        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(noAcceptTimeoutMinutes);
        List<Donation> stale = donationRepository.findStalePostedDonations(
                cutoff, maxRadiusKm, LocalDateTime.now());

        for (Donation d : stale) {
            double newRadius = Math.min(d.getNotificationRadiusKm() + radiusExpansionKm, maxRadiusKm);
            d.setNotificationRadiusKm(newRadius);
            donationRepository.save(d);
            log.info("Expanded radius for donation {} to {}km", d.getId(), newRadius);
            notifyNearbyNgos(d, null);
        }
    }

    // ── Internal Helpers ──────────────────────────────────────────────────────
    private void validateStatusTransition(Donation.DonationStatus current, Donation.DonationStatus target) {
        if (current == target) {
            return;
        }
        boolean valid = switch (current) {
            case POSTED -> target == Donation.DonationStatus.ACCEPTED_BY_NGO ||
                           target == Donation.DonationStatus.EXPIRED ||
                           target == Donation.DonationStatus.CANCELLED;
            case ACCEPTED_BY_NGO -> target == Donation.DonationStatus.VOLUNTEER_ASSIGNED ||
                                   target == Donation.DonationStatus.PICKUP_IN_PROGRESS ||
                                   target == Donation.DonationStatus.CANCELLED ||
                                   target == Donation.DonationStatus.EXPIRED;
            case VOLUNTEER_ASSIGNED -> target == Donation.DonationStatus.PICKUP_IN_PROGRESS ||
                                      target == Donation.DonationStatus.CANCELLED ||
                                      target == Donation.DonationStatus.EXPIRED;
            case PICKUP_IN_PROGRESS -> target == Donation.DonationStatus.PICKED_UP ||
                                      target == Donation.DonationStatus.CANCELLED;
            case PICKED_UP -> target == Donation.DonationStatus.REACHED_NGO ||
                              target == Donation.DonationStatus.DISTRIBUTED;
            case REACHED_NGO -> target == Donation.DonationStatus.OUT_FOR_DISTRIBUTION ||
                                target == Donation.DonationStatus.DISTRIBUTED;
            case OUT_FOR_DISTRIBUTION -> target == Donation.DonationStatus.DISTRIBUTED;
            case DISTRIBUTED, EXPIRED, CANCELLED -> false;
        };

        if (!valid) {
            throw new IllegalStateException("Invalid status transition: cannot move from " + current + " to " + target);
        }
    }

    private Donation checkAndExpire(Donation d) {
        if (d.getExpiresAt() != null && d.getExpiresAt().isBefore(LocalDateTime.now())) {
            if (d.getStatus() == Donation.DonationStatus.POSTED || d.getStatus() == Donation.DonationStatus.ACCEPTED_BY_NGO) {
                d.setStatus(Donation.DonationStatus.EXPIRED);
                d = donationRepository.save(d);
                recordHistory(d, "EXPIRED", null, "Donation expired automatically past safe consumption time");
                pushStatusUpdate(d);
            }
        }
        return d;
    }

    private String generateOtp() {
        return String.format("%04d", new Random().nextInt(10000));
    }

    private void recordHistory(Donation d, String status, Long changedBy, String note) {
        recordHistory(d, status, changedBy, note, null, null);
    }

    private void recordHistory(Donation d, String status, Long changedBy,
                               String note, Double lat, Double lng) {
        statusHistoryRepository.save(DonationStatusHistory.builder()
                .donationId(d.getId())
                .status(status)
                .changedBy(changedBy)
                .note(note)
                .latitude(lat)
                .longitude(lng)
                .build());
    }

    private void notifyNearbyNgos(Donation donation, String donorName) {
        try {
            webClient.post()
                    .uri(notificationServiceUrl + "/internal/notify-ngos")
                    .bodyValue(Map.of(
                            "donationId", donation.getId(),
                            "lat", donation.getLatitude(),
                            "lng", donation.getLongitude(),
                            "radiusKm", donation.getNotificationRadiusKm(),
                            "donorName", donorName != null ? donorName : "Donor",
                            "foodName", donation.getFoodName(),
                            "quantity", donation.getQuantity()
                    ))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .subscribe(
                            v -> log.debug("NGO notification sent for donation {}", donation.getId()),
                            e -> log.warn("Failed to notify NGOs: {}", e.getMessage())
                    );
        } catch (Exception e) {
            log.warn("Notification service unavailable: {}", e.getMessage());
        }
    }

    private void notifyAcceptance(Donation donation, Long ngoId) {
        try {
            webClient.post()
                    .uri(notificationServiceUrl + "/internal/notify-acceptance")
                    .bodyValue(Map.of(
                            "donationId", donation.getId(),
                            "ngoId", ngoId,
                            "donorUserId", donation.getDonorId()
                    ))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .subscribe(
                            v -> log.debug("Acceptance notification pushed"),
                            e -> log.warn("Could not notify acceptance: {}", e.getMessage())
                    );
        } catch (Exception e) {
            log.warn("Could not notify acceptance: {}", e.getMessage());
        }
    }

    private void notifyVolunteerAssignment(Donation donation, Long volunteerUserId, Long volunteerProfileId, String volunteerName) {
        try {
            webClient.post()
                    .uri(notificationServiceUrl + "/internal/notify-volunteer-assignment")
                    .bodyValue(Map.of(
                            "donationId", donation.getId(),
                            "volunteerUserId", volunteerUserId != null ? volunteerUserId : 0L,
                            "volunteerProfileId", volunteerProfileId != null ? volunteerProfileId : 0L,
                            "donorUserId", donation.getDonorId(),
                            "volunteerName", volunteerName != null ? volunteerName : "Volunteer",
                            "foodName", donation.getFoodName(),
                            "pickupAddress", donation.getPickupAddress()
                    ))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .subscribe(
                            v -> log.debug("Volunteer assignment notification pushed"),
                            e -> log.warn("Could not notify volunteer assignment: {}", e.getMessage())
                    );
        } catch (Exception e) {
            log.warn("Could not notify volunteer assignment: {}", e.getMessage());
        }
    }

    private void pushStatusUpdate(Donation donation) {
        try {
            webClient.post()
                    .uri(notificationServiceUrl + "/internal/status-update")
                    .bodyValue(Map.of(
                            "donationId", donation.getId(),
                            "status", donation.getStatus().name(),
                            "donorId", donation.getDonorId()
                    ))
                    .retrieve()
                    .bodyToMono(Void.class)
                    .subscribe(
                            v -> log.debug("Status update pushed"),
                            e -> log.warn("Could not push status update: {}", e.getMessage())
                    );
        } catch (Exception e) {
            log.warn("Could not push status update: {}", e.getMessage());
        }
    }

    private Map<String, Object> fetchUser(Long userId) {
        if (userId == null) return null;
        try {
            return webClient.get()
                    .uri(authServiceUrl + "/api/auth/users/" + userId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> fetchVolunteer(Long volunteerId) {
        if (volunteerId == null) return null;
        try {
            return webClient.get()
                    .uri(authServiceUrl + "/api/auth/volunteers/" + volunteerId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            return null;
        }
    }

    private Map<String, Object> fetchNgo(Long ngoId) {
        if (ngoId == null) return null;
        try {
            return webClient.get()
                    .uri(authServiceUrl + "/api/auth/ngos/" + ngoId)
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {})
                    .block();
        } catch (Exception e) {
            return null;
        }
    }

    private List<Map<String, Object>> fetchAllVolunteers() {
        try {
            return webClient.get()
                    .uri(authServiceUrl + "/api/auth/volunteers")
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<List<Map<String, Object>>>() {})
                    .block();
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    /** Haversine formula to compute distance between two coordinates in km. */
    public static double haversine(double lat1, double lon1, double lat2, double lon2) {
        final double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    private DonationDto toDto(Donation d, String donorName, Double distKm) {
        String ngoName = null;
        String ngoAddress = null;
        Double ngoLat = null;
        Double ngoLng = null;

        if (d.getAcceptedNgoId() != null) {
            Map<String, Object> ngo = fetchNgo(d.getAcceptedNgoId());
            if (ngo != null) {
                ngoName = (String) ngo.get("organization");
                ngoAddress = (String) ngo.get("address");
                if (ngo.get("latitude") != null) ngoLat = ((Number) ngo.get("latitude")).doubleValue();
                if (ngo.get("longitude") != null) ngoLng = ((Number) ngo.get("longitude")).doubleValue();
            }
        }

        String volName = null;
        String volPhone = null;
        if (d.getAssignedVolunteerId() != null) {
            Map<String, Object> vol = fetchVolunteer(d.getAssignedVolunteerId());
            if (vol != null) {
                volName = (String) vol.get("fullName");
                volPhone = (String) vol.get("phone");
            }
        }

        if (donorName == null && d.getDonorId() != null) {
            Map<String, Object> donor = fetchUser(d.getDonorId());
            if (donor != null && donor.get("fullName") != null) {
                donorName = (String) donor.get("fullName");
            }
        }

        return DonationDto.builder()
                .id(d.getId())
                .donorId(d.getDonorId())
                .donorName(donorName != null ? donorName : "Donor")
                .foodName(d.getFoodName())
                .foodType(d.getFoodType())
                .quantity(d.getQuantity())
                .cookedAt(d.getCookedAt())
                .expiresAt(d.getExpiresAt())
                .pickupAddress(d.getPickupAddress())
                .latitude(d.getLatitude())
                .longitude(d.getLongitude())
                .photoUrl(d.getPhotoUrl())
                .contactNumber(d.getContactNumber())
                .description(d.getDescription())
                .status(d.getStatus())
                .acceptedNgoId(d.getAcceptedNgoId())
                .ngoName(ngoName)
                .ngoAddress(ngoAddress)
                .ngoLatitude(ngoLat)
                .ngoLongitude(ngoLng)
                .assignedVolunteerId(d.getAssignedVolunteerId())
                .assignedVolunteerName(volName)
                .assignedVolunteerPhone(volPhone)
                .pickupOtp(d.getPickupOtp())
                .deliveryOtp(d.getDeliveryOtp())
                .notificationRadiusKm(d.getNotificationRadiusKm())
                .distanceKm(distKm)
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
