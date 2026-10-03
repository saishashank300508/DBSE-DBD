package com.foodconnect.auth.dto;

import com.foodconnect.auth.entity.DonorProfile;
import jakarta.validation.constraints.*;
import lombok.Data;

/**
 * Request body for /api/auth/register
 */
@Data
public class RegisterRequest {

    @NotBlank(message = "Full name is required")
    @Size(min = 2, max = 150)
    private String fullName;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[0-9])(?=.*[@#$%^&+=!]).+$",
        message = "Password must contain at least one uppercase letter, one digit and one special character"
    )
    private String password;

    @NotBlank(message = "Phone is required")
    @Pattern(regexp = "^[6-9]\\d{9}$", message = "Invalid Indian phone number")
    private String phone;

    /**
     * Must be one of: DONOR, NGO, VOLUNTEER
     * (ADMIN role is assigned only by existing admins)
     */
    @NotBlank(message = "Role is required")
    @Pattern(regexp = "^(DONOR|NGO|VOLUNTEER)$", message = "Role must be DONOR, NGO or VOLUNTEER")
    private String role;

    // ── Donor-specific (optional, required when role = DONOR) ──
    private DonorProfile.DonorType donorType;
    private String organization;
    private String address;
    private String city;
    private Double latitude;
    private Double longitude;

    // ── NGO-specific ──
    private String registrationNo;
    private String serviceArea;
    private Double serviceRadiusKm;
}
