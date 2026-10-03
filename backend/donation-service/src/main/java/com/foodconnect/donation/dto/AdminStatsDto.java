package com.foodconnect.donation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Admin stats response.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminStatsDto {
    private long totalDonations;
    private long activeDonations;
    private long distributedDonations;
    private long totalMealsServed;
    private long totalUsers;
    private long totalNgos;
    private long totalVolunteers;
    private long totalDonors;
    private long expiredDonations;
    private long cancelledDonations;
}
