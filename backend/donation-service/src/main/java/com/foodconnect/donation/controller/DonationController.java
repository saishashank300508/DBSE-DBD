package com.foodconnect.donation.controller;

import com.foodconnect.donation.dto.*;
import com.foodconnect.donation.entity.*;
import com.foodconnect.donation.service.DonationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller exposing all donation-related endpoints.
 */
@RestController
@RequestMapping("/api/donations")
@RequiredArgsConstructor
@Tag(name = "Donations", description = "Create, manage and track food donations")
@SecurityRequirement(name = "bearerAuth")
public class DonationController {

    private final DonationService donationService;

    // Helper: extract userId from the JWT credentials stored by JwtAuthFilter
    private Long userId(Authentication auth) {
        return (Long) auth.getCredentials();
    }

    // ── Donor ─────────────────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('DONOR')")
    @Operation(summary = "Create a new food donation")
    public ResponseEntity<DonationDto> create(@Valid @RequestBody CreateDonationRequest req,
                                              Authentication auth) {
        String donorName = auth.getName();
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(donationService.create(req, userId(auth), donorName));
    }

    @GetMapping("/my")
    @PreAuthorize("hasRole('DONOR')")
    @Operation(summary = "Get my donations")
    public ResponseEntity<List<DonationDto>> myDonations(Authentication auth) {
        return ResponseEntity.ok(donationService.getMyDonations(userId(auth)));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('DONOR')")
    @Operation(summary = "Cancel a POSTED donation")
    public ResponseEntity<DonationDto> cancel(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(donationService.cancel(id, userId(auth)));
    }

    // ── NGO ───────────────────────────────────────────────────────────────────
    @GetMapping("/nearby")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @Operation(summary = "Get available donations near a coordinate")
    public ResponseEntity<List<DonationDto>> nearby(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "10") double radius) {
        return ResponseEntity.ok(donationService.getNearby(lat, lng, radius));
    }

    @PutMapping("/{id}/accept")
    @PreAuthorize("hasRole('NGO')")
    @Operation(summary = "Accept an available food donation")
    public ResponseEntity<DonationDto> accept(@PathVariable Long id,
                                              @RequestParam Long ngoId,
                                              Authentication auth) {
        return ResponseEntity.ok(donationService.acceptDonation(id, ngoId, userId(auth)));
    }

    @GetMapping("/{id}/available-volunteers")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @Operation(summary = "Get available volunteers ranked for a donation")
    public ResponseEntity<List<AvailableVolunteerDto>> getAvailableVolunteers(@PathVariable Long id) {
        return ResponseEntity.ok(donationService.getAvailableVolunteers(id));
    }

    @PutMapping("/{id}/assign-volunteer")
    @PreAuthorize("hasRole('NGO')")
    @Operation(summary = "Assign a volunteer to an accepted donation")
    public ResponseEntity<DonationDto> assignVolunteer(@PathVariable Long id,
                                                      @RequestBody AssignVolunteerRequest req,
                                                      Authentication auth) {
        return ResponseEntity.ok(donationService.assignVolunteer(id, req.getVolunteerId(), userId(auth)));
    }

    @PostMapping("/{id}/auto-assign-volunteer")
    @PreAuthorize("hasRole('NGO')")
    @Operation(summary = "Auto-assign nearest volunteer to accepted donation")
    public ResponseEntity<DonationDto> autoAssignVolunteer(@PathVariable Long id,
                                                           Authentication auth) {
        return ResponseEntity.ok(donationService.autoAssignVolunteer(id, userId(auth)));
    }

    @GetMapping("/ngo/{ngoId}")
    @PreAuthorize("hasAnyRole('NGO','ADMIN')")
    @Operation(summary = "Get all donations accepted by a specific NGO")
    public ResponseEntity<List<DonationDto>> byNgo(@PathVariable Long ngoId) {
        return ResponseEntity.ok(donationService.getByNgo(ngoId));
    }

    // ── Volunteer ─────────────────────────────────────────────────────────────
    @GetMapping("/volunteer/{volunteerId}")
    @PreAuthorize("hasAnyRole('VOLUNTEER','NGO','ADMIN')")
    @Operation(summary = "Get donations assigned to a volunteer")
    public ResponseEntity<List<DonationDto>> byVolunteer(@PathVariable Long volunteerId) {
        return ResponseEntity.ok(donationService.getByVolunteer(volunteerId));
    }

    @PutMapping("/{id}/accept-task")
    @PreAuthorize("hasRole('VOLUNTEER')")
    @Operation(summary = "Volunteer accepts an assigned pickup task")
    public ResponseEntity<DonationDto> acceptTask(@PathVariable Long id, Authentication auth) {
        return ResponseEntity.ok(donationService.volunteerAcceptTask(id, userId(auth)));
    }

    // ── Status update ─────────────────────────────────────────────────────────
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('NGO','VOLUNTEER','ADMIN')")
    @Operation(summary = "Update donation status")
    public ResponseEntity<DonationDto> updateStatus(@PathVariable Long id,
                                                     @Valid @RequestBody UpdateStatusRequest req,
                                                     Authentication auth) {
        return ResponseEntity.ok(donationService.updateStatus(id, req, userId(auth)));
    }

    @GetMapping("/{id}/history")
    @Operation(summary = "Get status change timeline")
    public ResponseEntity<List<DonationStatusHistory>> history(@PathVariable Long id) {
        return ResponseEntity.ok(donationService.getStatusHistory(id));
    }

    // ── Distribution ──────────────────────────────────────────────────────────
    @PostMapping("/distributions")
    @PreAuthorize("hasAnyRole('NGO','VOLUNTEER')")
    @Operation(summary = "Record food distribution to beneficiaries")
    public ResponseEntity<Distribution> distribute(
            @Valid @RequestBody CreateDistributionRequest req,
            @RequestParam Long ngoId,
            Authentication auth) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(donationService.recordDistribution(req, ngoId, userId(auth)));
    }

    @GetMapping("/{id}/distribution")
    @Operation(summary = "Get distribution details for a donation")
    public ResponseEntity<Distribution> getDistribution(@PathVariable Long id) {
        return ResponseEntity.ok(donationService.getDistribution(id));
    }

    // ── Single ────────────────────────────────────────────────────────────────
    @GetMapping("/{id}")
    @Operation(summary = "Get a donation by ID")
    public ResponseEntity<DonationDto> getById(@PathVariable Long id) {
        return ResponseEntity.ok(donationService.getById(id));
    }

    // ── Admin ─────────────────────────────────────────────────────────────────
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get all donations (ADMIN only)")
    public ResponseEntity<List<DonationDto>> all() {
        return ResponseEntity.ok(donationService.getAll());
    }

    @GetMapping("/admin/stats")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Get platform statistics (ADMIN only)")
    public ResponseEntity<AdminStatsDto> stats() {
        return ResponseEntity.ok(donationService.getAdminStats());
    }
}
