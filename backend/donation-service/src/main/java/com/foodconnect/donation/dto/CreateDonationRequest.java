package com.foodconnect.donation.dto;

import com.foodconnect.donation.entity.Donation;
import jakarta.validation.constraints.*;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * Request body to create a new donation.
 */
@Data
public class CreateDonationRequest {

    @NotBlank(message = "Food name is required")
    @Size(min = 2, max = 200)
    private String foodName;

    @NotNull(message = "Food type is required")
    private Donation.FoodType foodType;

    @NotNull(message = "Quantity is required")
    @Min(value = 1, message = "Quantity must be at least 1 serving")
    @Max(value = 10000, message = "Quantity seems unreasonably large")
    private Integer quantity;

    @NotNull(message = "Cooked time is required")
    private LocalDateTime cookedAt;

    @NotNull(message = "Expiry time is required")
    @Future(message = "Expiry time must be in the future")
    private LocalDateTime expiresAt;

    @NotBlank(message = "Pickup address is required")
    private String pickupAddress;

    @NotNull(message = "Latitude is required")
    @DecimalMin(value = "-90.0", message = "Invalid latitude")
    @DecimalMax(value = "90.0",  message = "Invalid latitude")
    private Double latitude;

    @NotNull(message = "Longitude is required")
    @DecimalMin(value = "-180.0", message = "Invalid longitude")
    @DecimalMax(value = "180.0",  message = "Invalid longitude")
    private Double longitude;

    @Size(max = 500)
    private String photoUrl;

    @NotBlank(message = "Contact number is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid phone number")
    private String contactNumber;

    @Size(max = 1000)
    private String description;

    private Double notificationRadiusKm;
}
