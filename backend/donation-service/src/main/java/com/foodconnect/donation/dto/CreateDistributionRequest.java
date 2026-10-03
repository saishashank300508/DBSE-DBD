package com.foodconnect.donation.dto;

import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request to record a distribution event.
 */
@Data
public class CreateDistributionRequest {

    @NotNull
    private Long donationId;

    @NotNull
    @Min(1)
    private Integer beneficiaryCount;

    @Size(max = 200)
    private String locationName;

    private Double latitude;
    private Double longitude;

    @Size(max = 1000)
    private String notes;

    @Size(max = 500)
    private String photoUrl;
}
