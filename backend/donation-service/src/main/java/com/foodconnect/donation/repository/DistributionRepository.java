package com.foodconnect.donation.repository;

import com.foodconnect.donation.entity.Distribution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DistributionRepository extends JpaRepository<Distribution, Long> {
    Optional<Distribution> findByDonationId(Long donationId);
    List<Distribution> findByNgoId(Long ngoId);

    @Query("SELECT COALESCE(SUM(d.beneficiaryCount), 0) FROM Distribution d")
    Long sumBeneficiaries();

    @Query("SELECT COALESCE(SUM(d.beneficiaryCount), 0) FROM Distribution d WHERE d.ngoId = :ngoId")
    Long sumBeneficiariesByNgo(Long ngoId);
}
