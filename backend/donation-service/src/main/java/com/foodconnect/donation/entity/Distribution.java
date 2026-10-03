package com.foodconnect.donation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Distribution record – Stage 2 proof of NGO -> beneficiaries.
 */
@Entity
@Table(name = "distributions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Distribution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "donation_id", nullable = false, unique = true)
    private Long donationId;

    @Column(name = "ngo_id", nullable = false)
    private Long ngoId;

    @Column(name = "distributed_by", nullable = false)
    private Long distributedBy;

    @Column(name = "beneficiary_count", nullable = false)
    private Integer beneficiaryCount;

    @Column(name = "location_name", length = 200)
    private String locationName;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(name = "photo_url", length = 500)
    private String photoUrl;

    @CreationTimestamp
    @Column(name = "distributed_at", updatable = false)
    private LocalDateTime distributedAt;
}
