package com.foodconnect.auth.repository;

import com.foodconnect.auth.entity.VolunteerProfile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface VolunteerProfileRepository extends JpaRepository<VolunteerProfile, Long> {
    Optional<VolunteerProfile> findByUserId(Long userId);
    List<VolunteerProfile> findByNgoIdAndAvailableTrue(Long ngoId);
    List<VolunteerProfile> findByAvailableTrue();
}
