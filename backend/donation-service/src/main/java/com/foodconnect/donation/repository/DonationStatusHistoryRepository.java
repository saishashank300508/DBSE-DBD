package com.foodconnect.donation.repository;

import com.foodconnect.donation.entity.DonationStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DonationStatusHistoryRepository extends JpaRepository<DonationStatusHistory, Long> {
    List<DonationStatusHistory> findByDonationIdOrderByChangedAtAsc(Long donationId);
}
