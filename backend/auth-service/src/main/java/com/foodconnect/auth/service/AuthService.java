package com.foodconnect.auth.service;

import com.foodconnect.auth.dto.*;
import com.foodconnect.auth.entity.*;
import com.foodconnect.auth.exception.ResourceNotFoundException;
import com.foodconnect.auth.repository.*;
import com.foodconnect.auth.security.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.*;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Core authentication service – registration, login, token refresh, profile retrieval.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final DonorProfileRepository donorProfileRepository;
    private final NgoProfileRepository ngoProfileRepository;
    private final VolunteerProfileRepository volunteerProfileRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    // ── Register ──────────────────────────────────────────────────────────────
    @Transactional
    public AuthResponse register(RegisterRequest req) {
        if (userRepository.existsByEmail(req.getEmail())) {
            throw new IllegalStateException("Email already registered: " + req.getEmail());
        }

        Role role = roleRepository.findByName(req.getRole())
                .orElseThrow(() -> new ResourceNotFoundException("Role not found: " + req.getRole()));

        User user = User.builder()
                .email(req.getEmail())
                .passwordHash(passwordEncoder.encode(req.getPassword()))
                .fullName(req.getFullName())
                .phone(req.getPhone())
                .role(role)
                .enabled(true)
                .build();
        user = userRepository.save(user);

        // Create role-specific profile
        Long profileId = createProfile(user, req, role.getName());

        log.info("New user registered: {} ({})", user.getEmail(), role.getName());
        return buildAuthResponse(user, profileId);
    }

    // ── Login ─────────────────────────────────────────────────────────────────
    @Transactional
    public AuthResponse login(LoginRequest req) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(req.getEmail(), req.getPassword()));

        User user = userRepository.findByEmail(req.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Long profileId = resolveProfileId(user);
        log.info("User logged in: {}", user.getEmail());
        return buildAuthResponse(user, profileId);
    }

    // ── Refresh Token ─────────────────────────────────────────────────────────
    @Transactional
    public AuthResponse refreshToken(RefreshTokenRequest req) {
        RefreshToken rt = refreshTokenRepository.findByToken(req.getRefreshToken())
                .orElseThrow(() -> new IllegalArgumentException("Invalid refresh token"));

        if (rt.getExpiresAt().isBefore(LocalDateTime.now())) {
            refreshTokenRepository.delete(rt);
            throw new IllegalArgumentException("Refresh token expired, please login again");
        }

        User user = rt.getUser();
        Long profileId = resolveProfileId(user);
        return buildAuthResponse(user, profileId);
    }

    // ── Profile ───────────────────────────────────────────────────────────────
    public UserDto getProfile(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Long profileId = resolveProfileId(user);
        return mapToDto(user, profileId);
    }

    public UserDto getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + id));
        Long profileId = resolveProfileId(user);
        return mapToDto(user, profileId);
    }

    // ── Admin: list all users ─────────────────────────────────────────────────
    public java.util.List<UserDto> getAllUsers() {
        return userRepository.findAll().stream()
                .map(u -> mapToDto(u, resolveProfileId(u)))
                .toList();
    }

    // ── Volunteer & NGO queries for inter-service and assignment ───────────────
    public java.util.List<VolunteerDto> getAvailableVolunteers() {
        return volunteerProfileRepository.findByAvailableTrue().stream()
                .map(vp -> VolunteerDto.builder()
                        .id(vp.getId())
                        .userId(vp.getUser().getId())
                        .fullName(vp.getUser().getFullName())
                        .phone(vp.getUser().getPhone())
                        .email(vp.getUser().getEmail())
                        .currentLat(vp.getCurrentLat())
                        .currentLng(vp.getCurrentLng())
                        .available(vp.isAvailable())
                        .lastLocationAt(vp.getLastLocationAt())
                        .build())
                .toList();
    }

    public VolunteerDto getVolunteerById(Long id) {
        VolunteerProfile vp = volunteerProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Volunteer not found: " + id));
        return VolunteerDto.builder()
                .id(vp.getId())
                .userId(vp.getUser().getId())
                .fullName(vp.getUser().getFullName())
                .phone(vp.getUser().getPhone())
                .email(vp.getUser().getEmail())
                .currentLat(vp.getCurrentLat())
                .currentLng(vp.getCurrentLng())
                .available(vp.isAvailable())
                .lastLocationAt(vp.getLastLocationAt())
                .build();
    }

    public NgoDto getNgoById(Long id) {
        NgoProfile np = ngoProfileRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NGO not found: " + id));
        return NgoDto.builder()
                .id(np.getId())
                .userId(np.getUser().getId())
                .organization(np.getOrganization())
                .registrationNo(np.getRegistrationNo())
                .serviceArea(np.getServiceArea())
                .address(np.getAddress())
                .city(np.getCity())
                .latitude(np.getLatitude())
                .longitude(np.getLongitude())
                .serviceRadiusKm(np.getServiceRadiusKm())
                .phone(np.getUser().getPhone())
                .email(np.getUser().getEmail())
                .build();
    }

    // ── Internal helpers ──────────────────────────────────────────────────────
    private Long createProfile(User user, RegisterRequest req, String roleName) {
        return switch (roleName) {
            case "DONOR" -> {
                DonorProfile dp = DonorProfile.builder()
                        .user(user)
                        .donorType(req.getDonorType() != null
                                ? req.getDonorType() : DonorProfile.DonorType.OTHER)
                        .organization(req.getOrganization())
                        .address(req.getAddress())
                        .city(req.getCity())
                        .latitude(req.getLatitude())
                        .longitude(req.getLongitude())
                        .build();
                yield donorProfileRepository.save(dp).getId();
            }
            case "NGO" -> {
                NgoProfile np = NgoProfile.builder()
                        .user(user)
                        .organization(req.getOrganization() != null
                                ? req.getOrganization() : user.getFullName())
                        .registrationNo(req.getRegistrationNo())
                        .serviceArea(req.getServiceArea())
                        .address(req.getAddress())
                        .city(req.getCity())
                        .latitude(req.getLatitude())
                        .longitude(req.getLongitude())
                        .serviceRadiusKm(req.getServiceRadiusKm() != null
                                ? req.getServiceRadiusKm() : 10.0)
                        .verified(false)
                        .build();
                yield ngoProfileRepository.save(np).getId();
            }
            case "VOLUNTEER" -> {
                // For VOLUNTEER, address and city are optional; store null if empty
                String addr = req.getAddress() != null && !req.getAddress().trim().isEmpty()
                        ? req.getAddress() : null;
                String cty = req.getCity() != null && !req.getCity().trim().isEmpty()
                        ? req.getCity() : null;
                Double vLat = req.getLatitude() != null ? req.getLatitude() : null;
                Double vLng = req.getLongitude() != null ? req.getLongitude() : null;
                VolunteerProfile vp = VolunteerProfile.builder()
                        .user(user)
                        .address(addr)
                        .city(cty)
                        .currentLat(vLat)
                        .currentLng(vLng)
                        .lastLocationAt(vLat != null ? LocalDateTime.now() : null)
                        .available(true)
                        .build();
                yield volunteerProfileRepository.save(vp).getId();
            }
            default -> null;
        };
    }

    private Long resolveProfileId(User user) {
        String role = user.getRole().getName();
        return switch (role) {
            case "DONOR"     -> donorProfileRepository.findByUserId(user.getId())
                                    .map(DonorProfile::getId).orElse(null);
            case "NGO"       -> ngoProfileRepository.findByUserId(user.getId())
                                    .map(NgoProfile::getId).orElse(null);
            case "VOLUNTEER" -> volunteerProfileRepository.findByUserId(user.getId())
                                    .map(VolunteerProfile::getId).orElse(null);
            default          -> null;
        };
    }

    private AuthResponse buildAuthResponse(User user, Long profileId) {
        UserDetails ud = userDetailsService.loadUserByUsername(user.getEmail());
        String accessToken = jwtUtil.generateToken(ud, user.getRole().getName(), user.getId());
        String refreshTokenStr = generateAndSaveRefreshToken(user);

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshTokenStr)
                .tokenType("Bearer")
                .expiresIn(jwtUtil.getExpirationMs() / 1000)
                .user(mapToDto(user, profileId))
                .build();
    }

    private String generateAndSaveRefreshToken(User user) {
        String tokenStr = UUID.randomUUID().toString();
        RefreshToken rt = refreshTokenRepository.findByUser(user)
                .orElse(RefreshToken.builder().user(user).build());
        rt.setToken(tokenStr);
        rt.setExpiresAt(LocalDateTime.now()
                .plusSeconds(refreshExpirationMs / 1000));
        refreshTokenRepository.save(rt);
        return tokenStr;
    }

    private UserDto mapToDto(User user, Long profileId) {
        return UserDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phone(user.getPhone())
                .role(user.getRole().getName())
                .enabled(user.isEnabled())
                .createdAt(user.getCreatedAt())
                .profileId(profileId)
                .build();
    }
}
