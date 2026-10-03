package com.foodconnect.tracking.dto;

import lombok.Data;
import java.util.List;

/** Sent by donation-service when a new donation is posted. */
@Data
public class NotifyNgosRequest {
    private Long donationId;
    private String donorName;
    private String foodName;
    private Integer quantity;
    private Double lat;
    private Double lng;
    private Double radiusKm;
    private Double distanceKm;
    private List<Long> ngoUserIds;  // resolved by this service using auth-service
}
