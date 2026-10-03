package com.foodconnect.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VolunteerDto {
    private Long id;
    private Long userId;
    private String fullName;
    private String phone;
    private String email;
    private Double currentLat;
    private Double currentLng;
    private boolean available;
    private LocalDateTime lastLocationAt;
}
