package com.foodconnect.donation.dto;

import com.foodconnect.donation.entity.Donation;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Full donation response DTO.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DonationDto {
    private Long id;
    private Long donorId;
    private String donorName;
    private String foodName;
    private Donation.FoodType foodType;
    private Integer quantity;
    private LocalDateTime cookedAt;
    private LocalDateTime expiresAt;
    private String pickupAddress;
    private Double latitude;
    private Double longitude;
    private String photoUrl;
    private String contactNumber;
    private String description;
    private Donation.DonationStatus status;
    private Long acceptedNgoId;
    private String ngoName;
    private String ngoAddress;
    private Double ngoLatitude;
    private Double ngoLongitude;
    private Long assignedVolunteerId;
    private String assignedVolunteerName;
    private String assignedVolunteerPhone;
    private String pickupOtp;
    private String deliveryOtp;
    private Double notificationRadiusKm;
    private Double distanceKm;          // populated in nearby queries
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
