package com.foodconnect.tracking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VolunteerAssignNotifyRequest {
    private Long donationId;
    private Long volunteerUserId;
    private Long volunteerProfileId;
    private Long donorUserId;
    private String volunteerName;
    private String foodName;
    private String pickupAddress;
}
