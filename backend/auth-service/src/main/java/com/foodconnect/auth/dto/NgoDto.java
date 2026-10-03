package com.foodconnect.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NgoDto {
    private Long id;
    private Long userId;
    private String organization;
    private String registrationNo;
    private String serviceArea;
    private String address;
    private String city;
    private Double latitude;
    private Double longitude;
    private Double serviceRadiusKm;
    private String phone;
    private String email;
}
