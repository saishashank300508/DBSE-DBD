package com.foodconnect.tracking.repository;

import com.foodconnect.tracking.entity.TrackingPoint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TrackingPointRepository extends JpaRepository<TrackingPoint, Long> {

    List<TrackingPoint> findByDonationIdOrderByRecordedAtAsc(Long donationId);

    Optional<TrackingPoint> findFirstByDonationIdOrderByRecordedAtDesc(Long donationId);
}
