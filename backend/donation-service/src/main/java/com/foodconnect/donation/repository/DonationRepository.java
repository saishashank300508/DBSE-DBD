package com.foodconnect.donation.repository;

import com.foodconnect.donation.entity.Donation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface DonationRepository extends JpaRepository<Donation, Long> {

    List<Donation> findByDonorId(Long donorId);

    List<Donation> findByStatus(Donation.DonationStatus status);

    List<Donation> findByAcceptedNgoId(Long ngoId);

    List<Donation> findByAssignedVolunteerId(Long volunteerId);

    /**
     * Find all POSTED donations within a given radius of a coordinate
     * using the Haversine formula (native SQL).
     */
    @Query(value = """
            SELECT d.* FROM donations d
            WHERE d.status = 'POSTED'
              AND d.expires_at > NOW()
              AND (
                6371 * ACOS(
                  COS(RADIANS(:lat)) * COS(RADIANS(d.latitude)) *
                  COS(RADIANS(d.longitude) - RADIANS(:lng)) +
                  SIN(RADIANS(:lat)) * SIN(RADIANS(d.latitude))
                )
              ) <= :radiusKm
            ORDER BY (
                6371 * ACOS(
                  COS(RADIANS(:lat)) * COS(RADIANS(d.latitude)) *
                  COS(RADIANS(d.longitude) - RADIANS(:lng)) +
                  SIN(RADIANS(:lat)) * SIN(RADIANS(d.latitude))
                )
            ) ASC
            """, nativeQuery = true)
    List<Donation> findNearby(@Param("lat") double lat,
                              @Param("lng") double lng,
                              @Param("radiusKm") double radiusKm);

    /**
     * Find POSTED donations that haven't been accepted within the timeout
     * and still have radius room to expand.
     */
    @Query("""
            SELECT d FROM Donation d
            WHERE d.status = 'POSTED'
              AND d.createdAt < :cutoff
              AND d.notificationRadiusKm < :maxRadius
              AND d.expiresAt > :now
            """)
    List<Donation> findStalePostedDonations(@Param("cutoff") LocalDateTime cutoff,
                                             @Param("maxRadius") double maxRadius,
                                             @Param("now") LocalDateTime now);

    long countByStatus(Donation.DonationStatus status);
}
