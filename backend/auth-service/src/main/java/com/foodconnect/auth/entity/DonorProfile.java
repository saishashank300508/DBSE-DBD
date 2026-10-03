package com.foodconnect.auth.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Donor profile - extends the User entity with donor-specific data.
 */
@Entity
@Table(name = "donor_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "donor_type", nullable = false, length = 20)
    private DonorType donorType = DonorType.OTHER;

    @Column(length = 150)
    private String organization;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    public enum DonorType {
        RESTAURANT, HOTEL, EVENT, HOUSEHOLD, CANTEEN, OTHER
    }
}
