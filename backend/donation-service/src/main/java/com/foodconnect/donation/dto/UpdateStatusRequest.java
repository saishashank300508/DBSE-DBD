package com.foodconnect.donation.dto;

import com.foodconnect.donation.entity.Donation;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

/**
 * Request to update the status of a donation.
 */
@Data
public class UpdateStatusRequest {

    @NotNull(message = "Status is required")
    private Donation.DonationStatus status;

    private String note;
    private Double latitude;
    private Double longitude;

    /** For VOLUNTEER_ASSIGNED status */
    private Long volunteerId;

    /** For OTP verification on pickup or delivery */
    private String otp;
}
