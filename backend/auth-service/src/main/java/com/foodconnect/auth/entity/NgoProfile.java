package com.foodconnect.auth.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * NGO profile - stores organisation details, service area and location.
 */
@Entity
@Table(name = "ngo_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NgoProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false, length = 200)
    private String organization;

    @Column(name = "registration_no", length = 100)
    private String registrationNo;

    @Column(name = "service_area", length = 200)
    private String serviceArea;

    @Column(columnDefinition = "TEXT")
    private String address;

    @Column(length = 100)
    private String city;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Builder.Default
    @Column(name = "service_radius_km", nullable = false)
    private Double serviceRadiusKm = 10.0;

    @Builder.Default
    @Column(nullable = false)
    private boolean verified = false;
}
