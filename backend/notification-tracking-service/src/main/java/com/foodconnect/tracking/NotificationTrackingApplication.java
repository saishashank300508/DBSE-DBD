package com.foodconnect.tracking;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Food Connect – Notification & Tracking Service
 * Handles WebSocket (STOMP), real-time notifications and live GPS tracking.
 */
@SpringBootApplication
public class NotificationTrackingApplication {
    public static void main(String[] args) {
        SpringApplication.run(NotificationTrackingApplication.class, args);
    }
}
