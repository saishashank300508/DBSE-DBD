package com.foodconnect.donation.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request body to assign a volunteer to a donation.
 */
@Data
public class AssignVolunteerRequest {

    /** The volunteer user ID to assign */
    @NotNull(message = "Volunteer ID is required")
    @Positive(message = "Volunteer ID must be a positive number")
    private Long volunteerId;
}