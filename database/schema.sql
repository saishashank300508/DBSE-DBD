-- ============================================================
-- FOOD CONNECT - MySQL Schema
-- Database: food_connect
-- ============================================================

CREATE DATABASE IF NOT EXISTS food_connect CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE food_connect;

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE IF NOT EXISTS roles (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(50) NOT NULL UNIQUE  -- DONOR, NGO, VOLUNTEER, ADMIN
);

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(150) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(150) NOT NULL,
    phone           VARCHAR(20),
    role_id         BIGINT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
);
CREATE INDEX idx_users_email  ON users(email);
CREATE INDEX idx_users_role   ON users(role_id);

-- ============================================================
-- TABLE: donor_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS donor_profiles (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE,
    donor_type      ENUM('RESTAURANT','HOTEL','EVENT','HOUSEHOLD','CANTEEN','OTHER') NOT NULL DEFAULT 'OTHER',
    organization    VARCHAR(150),
    address         TEXT,
    city            VARCHAR(100),
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    CONSTRAINT fk_donor_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE: ngo_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS ngo_profiles (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE,
    organization    VARCHAR(200) NOT NULL,
    registration_no VARCHAR(100),
    service_area    VARCHAR(200),
    address         TEXT,
    city            VARCHAR(100),
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    service_radius_km DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    verified        BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_ngo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX idx_ngo_lat_lng ON ngo_profiles(latitude, longitude);

-- ============================================================
-- TABLE: volunteer_profiles
-- ============================================================
CREATE TABLE IF NOT EXISTS volunteer_profiles (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id         BIGINT NOT NULL UNIQUE,
    ngo_id          BIGINT,                  -- affiliated NGO (nullable)
    address         TEXT,
    city            VARCHAR(100),
    available       BOOLEAN NOT NULL DEFAULT TRUE,
    current_lat     DECIMAL(10, 7),
    current_lng     DECIMAL(10, 7),
    last_location_at DATETIME,
    CONSTRAINT fk_vol_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_vol_ngo  FOREIGN KEY (ngo_id)  REFERENCES ngo_profiles(id)
);

-- ============================================================
-- TABLE: donations
-- ============================================================
CREATE TABLE IF NOT EXISTS donations (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    donor_id            BIGINT NOT NULL,          -- references users.id
    food_name           VARCHAR(200) NOT NULL,
    food_type           ENUM('VEG','NON_VEG','BOTH') NOT NULL DEFAULT 'VEG',
    quantity            INT NOT NULL,             -- number of servings
    cooked_at           DATETIME NOT NULL,
    expires_at          DATETIME NOT NULL,
    pickup_address      TEXT NOT NULL,
    latitude            DECIMAL(10, 7) NOT NULL,
    longitude           DECIMAL(10, 7) NOT NULL,
    photo_url           VARCHAR(500),
    contact_number      VARCHAR(20) NOT NULL,
    description         TEXT,
    status              ENUM(
                            'POSTED',
                            'ACCEPTED_BY_NGO',
                            'VOLUNTEER_ASSIGNED',
                            'PICKUP_IN_PROGRESS',
                            'PICKED_UP',
                            'REACHED_NGO',
                            'OUT_FOR_DISTRIBUTION',
                            'DISTRIBUTED',
                            'EXPIRED',
                            'CANCELLED'
                        ) NOT NULL DEFAULT 'POSTED',
    accepted_ngo_id     BIGINT,
    assigned_volunteer_id BIGINT,
    notification_radius_km DECIMAL(5,2) NOT NULL DEFAULT 10.00,
    pickup_otp          VARCHAR(10),
    delivery_otp        VARCHAR(10),
    version             INT NOT NULL DEFAULT 0,  -- optimistic locking
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_don_donor    FOREIGN KEY (donor_id)               REFERENCES users(id),
    CONSTRAINT fk_don_ngo      FOREIGN KEY (accepted_ngo_id)        REFERENCES ngo_profiles(id),
    CONSTRAINT fk_don_volunteer FOREIGN KEY (assigned_volunteer_id) REFERENCES volunteer_profiles(id)
);
CREATE INDEX idx_don_status   ON donations(status);
CREATE INDEX idx_don_donor    ON donations(donor_id);
CREATE INDEX idx_don_ngo      ON donations(accepted_ngo_id);
CREATE INDEX idx_don_lat_lng  ON donations(latitude, longitude);
CREATE INDEX idx_don_expires  ON donations(expires_at);

-- ============================================================
-- TABLE: donation_status_history
-- ============================================================
CREATE TABLE IF NOT EXISTS donation_status_history (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id     BIGINT NOT NULL,
    status          VARCHAR(50) NOT NULL,
    changed_by      BIGINT,                -- user_id who changed it
    note            TEXT,
    latitude        DECIMAL(10, 7),
    longitude       DECIMAL(10, 7),
    changed_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dsh_donation FOREIGN KEY (donation_id) REFERENCES donations(id) ON DELETE CASCADE,
    CONSTRAINT fk_dsh_user     FOREIGN KEY (changed_by)  REFERENCES users(id)
);
CREATE INDEX idx_dsh_donation ON donation_status_history(donation_id);

-- ============================================================
-- TABLE: tracking_points  (live GPS breadcrumb trail)
-- ============================================================
CREATE TABLE IF NOT EXISTS tracking_points (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id     BIGINT NOT NULL,
    collector_id    BIGINT NOT NULL,          -- volunteer or NGO user id
    latitude        DECIMAL(10, 7) NOT NULL,
    longitude       DECIMAL(10, 7) NOT NULL,
    speed_kmh       DECIMAL(6,2),
    heading         DECIMAL(5,2),
    recorded_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tp_donation  FOREIGN KEY (donation_id)  REFERENCES donations(id) ON DELETE CASCADE,
    CONSTRAINT fk_tp_collector FOREIGN KEY (collector_id) REFERENCES users(id)
);
CREATE INDEX idx_tp_donation   ON tracking_points(donation_id);
CREATE INDEX idx_tp_recorded   ON tracking_points(recorded_at);

-- ============================================================
-- TABLE: notifications
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    recipient_id    BIGINT NOT NULL,          -- user_id who receives it
    donation_id     BIGINT,
    type            ENUM(
                        'DONATION_NEARBY',
                        'DONATION_ACCEPTED',
                        'DONATION_REJECTED',
                        'VOLUNTEER_ASSIGNED',
                        'STATUS_UPDATED',
                        'DONATION_ALREADY_TAKEN',
                        'DONATION_EXPIRED',
                        'RADIUS_EXPANDED'
                    ) NOT NULL,
    title           VARCHAR(200) NOT NULL,
    message         TEXT NOT NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_notif_user     FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_notif_donation FOREIGN KEY (donation_id)  REFERENCES donations(id) ON DELETE SET NULL
);
CREATE INDEX idx_notif_recipient ON notifications(recipient_id, is_read);
CREATE INDEX idx_notif_donation  ON notifications(donation_id);

-- ============================================================
-- TABLE: distributions  (Stage 2: NGO -> beneficiaries)
-- ============================================================
CREATE TABLE IF NOT EXISTS distributions (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    donation_id         BIGINT NOT NULL UNIQUE,
    ngo_id              BIGINT NOT NULL,
    distributed_by      BIGINT NOT NULL,          -- user_id (NGO staff/volunteer)
    beneficiary_count   INT NOT NULL,
    location_name       VARCHAR(200),
    latitude            DECIMAL(10, 7),
    longitude           DECIMAL(10, 7),
    notes               TEXT,
    photo_url           VARCHAR(500),
    distributed_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_dist_donation FOREIGN KEY (donation_id)    REFERENCES donations(id),
    CONSTRAINT fk_dist_ngo      FOREIGN KEY (ngo_id)         REFERENCES ngo_profiles(id),
    CONSTRAINT fk_dist_user     FOREIGN KEY (distributed_by) REFERENCES users(id)
);
CREATE INDEX idx_dist_donation ON distributions(donation_id);
CREATE INDEX idx_dist_ngo      ON distributions(ngo_id);

-- ============================================================
-- TABLE: refresh_tokens
-- ============================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id     BIGINT NOT NULL UNIQUE,
    token       VARCHAR(500) NOT NULL,
    expires_at  DATETIME NOT NULL,
    CONSTRAINT fk_rt_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
