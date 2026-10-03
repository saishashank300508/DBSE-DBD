package com.foodconnect.tracking.controller;

import com.foodconnect.tracking.dto.LocationUpdateRequest;
import com.foodconnect.tracking.entity.TrackingPoint;
import com.foodconnect.tracking.service.NotificationTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@Tag(name = "Tracking", description = "Live GPS tracking and history")
@SecurityRequirement(name = "bearerAuth")
public class TrackingController {

    private final NotificationTrackingService service;

    private Long userId(Authentication auth) {
        return (Long) auth.getCredentials();
    }

    // ── WebSocket Endpoint ──────────────────────────────────────────────────
    /**
     * Called by collector (NGO/Volunteer) via WebSocket:
     * stompClient.send("/app/tracking/" + donationId, {}, JSON.stringify(location))
     */
    @MessageMapping("/tracking/{donationId}")
    public void receiveLocationPing(@DestinationVariable Long donationId,
                                    LocationUpdateRequest req,
                                    Authentication auth) {
        // Normally we'd extract collectorId from STOMP Principal (auth), but for simplicity:
        Long collectorId = 0L; // In a real app with STOMP security fully wired, use auth.getName()
        if (auth != null && auth.getCredentials() != null) {
            collectorId = (Long) auth.getCredentials();
        }
        service.recordLocation(donationId, collectorId, req);
    }

    // ── REST Fallback / History ───────────────────────────────────────────────
    @PostMapping("/api/tracking/{donationId}/location")
    @Operation(summary = "REST fallback to record live location")
    public ResponseEntity<TrackingPoint> postLocation(@PathVariable Long donationId,
                                                      @RequestBody LocationUpdateRequest req,
                                                      Authentication auth) {
        return ResponseEntity.ok(service.recordLocation(donationId, userId(auth), req));
    }

    @GetMapping("/api/tracking/{donationId}")
    @Operation(summary = "Get full GPS breadcrumb trail")
    public ResponseEntity<List<TrackingPoint>> getTrail(@PathVariable Long donationId) {
        return ResponseEntity.ok(service.getTrail(donationId));
    }

    @GetMapping("/api/tracking/{donationId}/latest")
    @Operation(summary = "Get latest GPS location")
    public ResponseEntity<TrackingPoint> getLatest(@PathVariable Long donationId) {
        return ResponseEntity.ok(service.getLatestLocation(donationId));
    }
}
