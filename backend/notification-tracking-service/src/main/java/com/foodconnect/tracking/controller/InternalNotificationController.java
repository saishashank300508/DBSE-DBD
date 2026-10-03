package com.foodconnect.tracking.controller;

import com.foodconnect.tracking.dto.*;
import com.foodconnect.tracking.service.NotificationTrackingService;
import io.swagger.v3.oas.annotations.Hidden;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/internal")
@RequiredArgsConstructor
@Hidden // Hide from public Swagger docs
public class InternalNotificationController {

    private final NotificationTrackingService service;

    @PostMapping("/notify-ngos")
    public void notifyNearbyNgos(@RequestBody NotifyNgosRequest req) {
        service.notifyNearbyNgos(req);
    }

    @PostMapping("/notify-acceptance")
    public void notifyAcceptance(@RequestBody AcceptanceNotifyRequest req) {
        service.notifyAcceptance(req);
    }

    @PostMapping("/status-update")
    public void statusUpdate(@RequestBody StatusUpdateRequest req) {
        service.notifyStatusUpdate(req.getDonorId(), req.getDonationId(), req.getStatus());
    }

    @PostMapping("/notify-volunteer-assignment")
    public void notifyVolunteerAssignment(@RequestBody VolunteerAssignNotifyRequest req) {
        service.notifyVolunteerAssignment(req);
    }
}
