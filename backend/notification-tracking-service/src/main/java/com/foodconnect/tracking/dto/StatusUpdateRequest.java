package com.foodconnect.tracking.dto;

import lombok.Data;

@Data
public class StatusUpdateRequest {
    private Long donationId;
    private Long donorId;
    private String status;
}
