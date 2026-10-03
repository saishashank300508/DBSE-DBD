package com.foodconnect.tracking.controller;

import com.foodconnect.tracking.entity.Notification;
import com.foodconnect.tracking.service.NotificationTrackingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "User inbox and notification management")
@SecurityRequirement(name = "bearerAuth")
public class NotificationController {

    private final NotificationTrackingService service;

    private Long userId(Authentication auth) {
        return (Long) auth.getCredentials();
    }

    @GetMapping
    @Operation(summary = "Get all notifications for the current user")
    public ResponseEntity<List<Notification>> getInbox(Authentication auth) {
        return ResponseEntity.ok(service.getInbox(userId(auth)));
    }

    @GetMapping("/unread")
    @Operation(summary = "Get unread notifications")
    public ResponseEntity<List<Notification>> getUnread(Authentication auth) {
        return ResponseEntity.ok(service.getUnread(userId(auth)));
    }

    @GetMapping("/unread/count")
    @Operation(summary = "Get count of unread notifications")
    public ResponseEntity<Long> getUnreadCount(Authentication auth) {
        return ResponseEntity.ok(service.getUnreadCount(userId(auth)));
    }

    @PutMapping("/{id}/read")
    @Operation(summary = "Mark a single notification as read")
    public ResponseEntity<Notification> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(service.markRead(id));
    }

    @PutMapping("/read-all")
    @Operation(summary = "Mark all notifications as read")
    public ResponseEntity<Void> markAllRead(Authentication auth) {
        service.markAllRead(userId(auth));
        return ResponseEntity.ok().build();
    }
}
