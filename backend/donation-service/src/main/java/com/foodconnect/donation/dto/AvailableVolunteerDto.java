package com.foodconnect.donation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AvailableVolunteerDto {
    private Long id;              // volunteer_profiles.id
    private Long userId;          // users.id
    private String fullName;
    private String phone;
    private String email;
    private Double currentLat;
    private Double currentLng;
    private Double distanceKm;
    private int activeTasks;
    private double score;
}
