package com.foodconnect.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * Lightweight user projection sent in auth responses and profile APIs.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private String email;
    private String fullName;
    private String phone;
    private String role;
    private boolean enabled;
    private LocalDateTime createdAt;
    /** profileId is the primary key of donor/ngo/volunteer_profiles row */
    private Long profileId;
}
