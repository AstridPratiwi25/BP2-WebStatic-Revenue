
CREATE DATABASE IF NOT EXISTS revenue_tracker
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE revenue_tracker;

CREATE TABLE IF NOT EXISTS reservations (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    property_name VARCHAR(150) NOT NULL,
    booking_date DATE NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guest_name VARCHAR(150) NOT NULL,
    guest_email VARCHAR(190) NOT NULL,
    guest_phone VARCHAR(40) NOT NULL,
    guest_count TINYINT UNSIGNED NOT NULL DEFAULT 1,
    ota VARCHAR(80) NOT NULL,
    room_type VARCHAR(100) NOT NULL,
    rooms INT UNSIGNED NOT NULL DEFAULT 1,
    room_revenue DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    booking_status ENUM(
        'Pending',
        'Confirmed',
        'Checked-in',
        'Checked-out',
        'Cancelled',
        'No-show'
    ) NOT NULL DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_reservation_dates
        CHECK (check_out > check_in),

    INDEX idx_check_in (check_in),
    INDEX idx_ota (ota),
    INDEX idx_booking_status (booking_status)
);

CREATE TABLE IF NOT EXISTS room_types (
    room_type VARCHAR(100) PRIMARY KEY,
    description VARCHAR(500) NOT NULL DEFAULT '',
    max_guests TINYINT UNSIGNED NOT NULL DEFAULT 2,
    base_rate DECIMAL(12,2) UNSIGNED NOT NULL DEFAULT 0.00,
    inventory_count SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO room_types (room_type, description, max_guests, base_rate, inventory_count, is_active) VALUES
    ('Standard Twin', 'Kamar praktis dan nyaman dengan dua tempat tidur single.', 2, 900000, 1, TRUE),
    ('Standard Double', 'Kamar hangat dengan satu tempat tidur double.', 2, 1000000, 1, TRUE),
    ('Superior Double', 'Ruang nyaman dengan tempat tidur queen.', 2, 1200000, 1, TRUE),
    ('Deluxe Double', 'Kamar lebih lapang dengan kenyamanan ekstra.', 2, 1600000, 1, TRUE),
    ('Executive Double', 'Kenyamanan ekstra dan ruang lebih lega.', 3, 2000000, 1, TRUE),
    ('Junior Suite Double', 'Suite dengan area duduk dan tempat tidur king.', 3, 2500000, 1, TRUE)
ON DUPLICATE KEY UPDATE room_type = VALUES(room_type);

CREATE TABLE IF NOT EXISTS admin_users (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
    ip_hash CHAR(64) PRIMARY KEY,
    attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NOT NULL,
    blocked_until DATETIME NULL DEFAULT NULL
);
