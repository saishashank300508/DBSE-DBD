package com.foodconnect.tracking.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.*;

/**
 * Configures the STOMP WebSocket endpoint and message broker.
 * The React client connects to /ws using SockJS, then subscribes to
 * /topic/... channels for real-time pushes.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","))
                .withSockJS();   // SockJS fallback for environments without native WS
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Messages from client with /app prefix go to @MessageMapping methods
        registry.setApplicationDestinationPrefixes("/app");
        // Server pushes on /topic (broadcast) and /queue (point-to-point)
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setUserDestinationPrefix("/user");
    }
}
