package com.foodconnect.auth.controller;

import com.foodconnect.auth.dto.*;
import com.foodconnect.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller for authentication and user management.
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Register, login, token refresh and profile APIs")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @Operation(summary = "Register a new user (DONOR / NGO / VOLUNTEER)")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(req));
    }

    @PostMapping("/login")
    @Operation(summary = "Login and receive JWT tokens")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest req) {
        return ResponseEntity.ok(authService.login(req));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Refresh access token using refresh token")
    public ResponseEntity<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest req) {
        return ResponseEntity.ok(authService.refreshToken(req));
    }

    @GetMapping("/me")
    @Operation(summary = "Get the authenticated user's profile")
    public ResponseEntity<UserDto> getProfile(Authentication auth) {
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equals(auth.getPrincipal())) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(authService.getProfile(auth.getName()));
    }

    @GetMapping("/users/{id}")
    @Operation(summary = "Get user profile by ID")
    public ResponseEntity<UserDto> getUserById(@PathVariable Long id) {
        return ResponseEntity.ok(authService.getUserById(id));
    }

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List all users (ADMIN only)")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        return ResponseEntity.ok(authService.getAllUsers());
    }

    @GetMapping("/volunteers")
    @Operation(summary = "List all available volunteers")
    public ResponseEntity<List<VolunteerDto>> getVolunteers() {
        return ResponseEntity.ok(authService.getAvailableVolunteers());
    }

    @GetMapping("/volunteers/{id}")
    @Operation(summary = "Get volunteer profile by ID")
    public ResponseEntity<VolunteerDto> getVolunteerById(@PathVariable Long id) {
        return ResponseEntity.ok(authService.getVolunteerById(id));
    }

    @GetMapping("/ngos/{id}")
    @Operation(summary = "Get NGO profile by ID")
    public ResponseEntity<NgoDto> getNgoById(@PathVariable Long id) {
        return ResponseEntity.ok(authService.getNgoById(id));
    }
}
