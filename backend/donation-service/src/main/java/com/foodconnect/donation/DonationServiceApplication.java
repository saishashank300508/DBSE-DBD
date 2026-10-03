package com.foodconnect.donation;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Food Connect – Donation Service
 * Manages donation CRUD, nearby NGO matching, status lifecycle.
 */
@SpringBootApplication
@EnableScheduling
public class DonationServiceApplication {
    public static void main(String[] args) {
        SpringApplication.run(DonationServiceApplication.class, args);
    }
}
