package com.foodconnect.tracking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * GPS breadcrumb recorded by collector (volunteer/NGO) during a pickup.
 */
@Entity
@Table(name = "tracking_points")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TrackingPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "donation_id", nullable = false)
    private Long donationId;

    @Column(name = "collector_id", nullable = false)
    private Long collectorId;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(name = "speed_kmh")
    private Double speedKmh;

    @Column
    private Double heading;

    @CreationTimestamp
    @Column(name = "recorded_at", updatable = false)
    private LocalDateTime recordedAt;
}
