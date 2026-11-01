
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
    ota VARCHAR(80) NOT NULL,
    room_type VARCHAR(100) NOT NULL,
    rooms INT UNSIGNED NOT NULL DEFAULT 1,
    room_revenue DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    booking_status ENUM(
        'Confirmed',
        'Checked-in',
        'Checked-out',
        'Cancelled',
        'No-show'
    ) NOT NULL DEFAULT 'Confirmed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT chk_reservation_dates
        CHECK (check_out > check_in),

    INDEX idx_check_in (check_in),
    INDEX idx_ota (ota),
    INDEX idx_booking_status (booking_status)
);
