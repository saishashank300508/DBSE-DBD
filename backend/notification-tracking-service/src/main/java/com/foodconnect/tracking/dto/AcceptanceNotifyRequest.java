package com.foodconnect.tracking.dto;

import lombok.Data;
import java.util.List;

@Data
public class AcceptanceNotifyRequest {
    private Long donationId;
    private Long donorUserId;
    private Long acceptedNgoId;
    private List<Long> otherNgoUserIds;
}
