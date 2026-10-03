package com.foodconnect.auth.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Volunteer profile.
 * Note: address and city are optional (nullable) for VOLUNTEER role signups.
 */
@Entity
@Table(name = "volunteer_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class VolunteerProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "ngo_id")
    private Long ngoId;

    @Column(name = "address", columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Builder.Default
    @Column(nullable = false)
    private boolean available = true;

    @Column(name = "current_lat")
    private Double currentLat;

    @Column(name = "current_lng")
    private Double currentLng;

    @Column(name = "last_location_at")
    private LocalDateTime lastLocationAt;
}
