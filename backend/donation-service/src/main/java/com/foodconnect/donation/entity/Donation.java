package com.foodconnect.donation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

/**
 * Central donation entity.
 * Uses @Version for optimistic locking to prevent the race condition
 * where two NGOs try to accept simultaneously.
 */
@Entity
@Table(name = "donations")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Donation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "donor_id", nullable = false)
    private Long donorId;

    @Column(name = "food_name", nullable = false, length = 200)
    private String foodName;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "food_type", nullable = false)
    private FoodType foodType = FoodType.VEG;

    @Column(nullable = false)
    private Integer quantity; // servings

    @Column(name = "cooked_at", nullable = false)
    private LocalDateTime cookedAt;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "pickup_address", nullable = false, columnDefinition = "TEXT")
    private String pickupAddress;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @Column(name = "contact_number", nullable = false, length = 20)
    private String contactNumber;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DonationStatus status = DonationStatus.POSTED;

    @Column(name = "accepted_ngo_id")
    private Long acceptedNgoId;

    @Column(name = "assigned_volunteer_id")
    private Long assignedVolunteerId;

    @Builder.Default
    @Column(name = "notification_radius_km", nullable = false)
    private Double notificationRadiusKm = 10.0;

    @Column(name = "pickup_otp", length = 10)
    private String pickupOtp;

    @Column(name = "delivery_otp", length = 10)
    private String deliveryOtp;

    /**
     * Optimistic lock version for preventing concurrent acceptance.
     */
    @Version
    private Integer version;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Enums ─────────────────────────────────────────────────────────────────

    public enum FoodType {
        VEG,
        NON_VEG,
        BOTH
    }

    public enum DonationStatus {
        POSTED,
        ACCEPTED_BY_NGO,
        VOLUNTEER_ASSIGNED,
        PICKUP_IN_PROGRESS,
        PICKED_UP,
        REACHED_NGO,
        OUT_FOR_DISTRIBUTION,
        DISTRIBUTED,
        EXPIRED,
        CANCELLED
    }
}