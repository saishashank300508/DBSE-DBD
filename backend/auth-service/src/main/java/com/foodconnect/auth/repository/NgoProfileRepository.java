package com.foodconnect.auth.repository;

import com.foodconnect.auth.entity.NgoProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface NgoProfileRepository extends JpaRepository<NgoProfile, Long> {

    Optional<NgoProfile> findByUserId(Long userId);

    /**
     * Haversine formula to find NGOs within a given radius of a coordinate.
     * Returns NGO ids ordered by distance ascending.
     */
    @Query(value = """
            SELECT n.* FROM ngo_profiles n
            WHERE n.latitude IS NOT NULL AND n.longitude IS NOT NULL
              AND (
                6371 * ACOS(
                  COS(RADIANS(:lat)) * COS(RADIANS(n.latitude)) *
                  COS(RADIANS(n.longitude) - RADIANS(:lng)) +
                  SIN(RADIANS(:lat)) * SIN(RADIANS(n.latitude))
                )
              ) <= :radiusKm
            ORDER BY (
                6371 * ACOS(
                  COS(RADIANS(:lat)) * COS(RADIANS(n.latitude)) *
                  COS(RADIANS(n.longitude) - RADIANS(:lng)) +
                  SIN(RADIANS(:lat)) * SIN(RADIANS(n.latitude))
                )
            ) ASC
            """, nativeQuery = true)
    List<NgoProfile> findNearby(@Param("lat") double lat,
                                @Param("lng") double lng,
                                @Param("radiusKm") double radiusKm);
}
