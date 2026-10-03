-- ============================================================
-- FOOD CONNECT - Seed Data
-- Run after schema.sql
-- ============================================================

USE food_connect;

-- Roles
INSERT INTO roles (name) VALUES ('DONOR'), ('NGO'), ('VOLUNTEER'), ('ADMIN')
    ON DUPLICATE KEY UPDATE name = VALUES(name);

-- Admin user  (password: Admin@123 BCrypt hash)
INSERT INTO users (email, password_hash, full_name, phone, role_id, enabled) VALUES
('admin@foodconnect.com',
 '$2a$12$dFJ20fqe4AAgFSNi/M.5QONivlaWgltbTo2njOmGIr7oftCsTMblC',
 'System Admin', '9999999999', 4, TRUE);

-- Donor user  (password: Donor@123)
INSERT INTO users (email, password_hash, full_name, phone, role_id, enabled) VALUES
('hotel.sunrise@demo.com',
 '$2a$12$xbgGLzQhCCveaszLd/DmNeLlCHt5MSHSAHwnZEwpBnKaJIjGENN2S',
 'Sunrise Hotel', '9876543210', 1, TRUE),
('green.canteen@demo.com',
 '$2a$12$xbgGLzQhCCveaszLd/DmNeLlCHt5MSHSAHwnZEwpBnKaJIjGENN2S',
 'Green Canteen', '9876543211', 1, TRUE);

-- NGO users   (password: Ngo@12345)
INSERT INTO users (email, password_hash, full_name, phone, role_id, enabled) VALUES
('helpinghands@demo.com',
 '$2a$12$XYzHpoKvWtrEqsezp/TUBe5aJjITFQTusNXKsPMnUSv2BzlLKakxK',
 'Helping Hands NGO', '9123456780', 2, TRUE),
('feedthehungry@demo.com',
 '$2a$12$XYzHpoKvWtrEqsezp/TUBe5aJjITFQTusNXKsPMnUSv2BzlLKakxK',
 'Feed The Hungry', '9123456781', 2, TRUE);

-- Volunteer user (password: Vol@12345)
INSERT INTO users (email, password_hash, full_name, phone, role_id, enabled) VALUES
('ravi.volunteer@demo.com',
 '$2a$12$Bl0SfaNewmMxx9.M7eGreeEytCoxI45C/ewwuJnGJHiGlKEqIEugq',
 'Ravi Kumar', '9012345678', 3, TRUE);

-- Donor profiles
INSERT INTO donor_profiles (user_id, donor_type, organization, address, city, latitude, longitude) VALUES
(2, 'HOTEL',    'Sunrise Hotel',  '12 MG Road', 'Bangalore', 12.9716, 77.5946),
(3, 'CANTEEN',  'Green Canteen',  '5 Park Street', 'Bangalore', 12.9741, 77.6101);

-- NGO profiles
INSERT INTO ngo_profiles (user_id, organization, registration_no, service_area, address, city, latitude, longitude, service_radius_km, verified) VALUES
(4, 'Helping Hands NGO', 'NGO-BLR-0001', 'South Bangalore', '22 Brigade Road', 'Bangalore', 12.9667, 77.5917, 12.00, TRUE),
(5, 'Feed The Hungry',   'NGO-BLR-0002', 'North Bangalore', '7 Hebbal Ring Road', 'Bangalore', 13.0358, 77.5970, 15.00, TRUE);

-- Volunteer profile
INSERT INTO volunteer_profiles (user_id, ngo_id, address, city, available) VALUES
(6, 1, '88 Koramangala 4th Block', 'Bangalore', TRUE);

-- Sample posted donation
INSERT INTO donations
    (donor_id, food_name, food_type, quantity, cooked_at, expires_at, pickup_address,
     latitude, longitude, contact_number, description, status, notification_radius_km)
VALUES
(2, 'Vegetable Biryani', 'VEG', 120,
 NOW() - INTERVAL 1 HOUR,
 NOW() + INTERVAL 3 HOUR,
 '12 MG Road, Bangalore',
 12.9716, 77.5946,
 '9876543210',
 'Fresh biryani, 120 servings available for pickup',
 'POSTED', 10.00);

-- Status history for the sample donation
INSERT INTO donation_status_history (donation_id, status, changed_by, note) VALUES
(1, 'POSTED', 2, 'Donation created by donor');
