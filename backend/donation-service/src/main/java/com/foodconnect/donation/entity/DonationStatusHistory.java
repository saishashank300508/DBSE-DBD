package com.foodconnect.donation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

/**
 * Immutable audit trail of every donation status change.
 */
@Entity
@Table(name = "donation_status_history")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DonationStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "donation_id", nullable = false)
    private Long donationId;

    @Column(nullable = false, length = 50)
    private String status;

    @Column(name = "changed_by")
    private Long changedBy;

    @Column(columnDefinition = "TEXT")
    private String note;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    @CreationTimestamp
    @Column(name = "changed_at", updatable = false)
    private LocalDateTime changedAt;
}