USE revenue_tracker;

ALTER TABLE reservations
    MODIFY booking_status ENUM(
        'Pending',
        'Confirmed',
        'Checked-in',
        'Checked-out',
        'Cancelled',
        'No-show'
    ) NOT NULL DEFAULT 'Pending';

SET @guest_count_exists = (
    SELECT COUNT(*)
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'reservations'
      AND COLUMN_NAME = 'guest_count'
);
SET @guest_count_migration = IF(
    @guest_count_exists = 0,
    'ALTER TABLE reservations ADD COLUMN guest_count TINYINT UNSIGNED NOT NULL DEFAULT 1 AFTER guest_phone',
    'SELECT 1'
);
PREPARE guest_count_statement FROM @guest_count_migration;
EXECUTE guest_count_statement;
DEALLOCATE PREPARE guest_count_statement;

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

CREATE TABLE IF NOT EXISTS hotel_rooms (
    room_number VARCHAR(20) PRIMARY KEY,
    room_type VARCHAR(100) NOT NULL,
    capacity TINYINT UNSIGNED NOT NULL DEFAULT 2,
    operational_status ENUM('Active','Maintenance','Inactive') NOT NULL DEFAULT 'Active',
    housekeeping_status ENUM('Clean','Needs cleaning','In progress','Inspection') NOT NULL DEFAULT 'Clean',
    housekeeping_note VARCHAR(500) NOT NULL DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_hotel_room_type_status (room_type, operational_status)
);

INSERT INTO hotel_rooms (room_number, room_type, capacity, operational_status) VALUES
    ('101', 'Standard Twin', 2, 'Active'),
    ('102', 'Standard Double', 2, 'Active'),
    ('201', 'Superior Double', 2, 'Active'),
    ('202', 'Deluxe Double', 2, 'Active'),
    ('301', 'Executive Double', 3, 'Active'),
    ('302', 'Junior Suite Double', 3, 'Active')
ON DUPLICATE KEY UPDATE room_number = VALUES(room_number);

CREATE TABLE IF NOT EXISTS hotel_settings (
    id TINYINT UNSIGNED PRIMARY KEY,
    property_name VARCHAR(150) NOT NULL,
    tax_percent DECIMAL(5,2) UNSIGNED NOT NULL DEFAULT 11.00,
    ota_commission_percent DECIMAL(5,2) UNSIGNED NOT NULL DEFAULT 15.00,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO hotel_settings (id, property_name, tax_percent, ota_commission_percent)
VALUES (1, 'Villa & Sanctuary by Astrid', 11.00, 15.00)
ON DUPLICATE KEY UPDATE id = VALUES(id);

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

CREATE TABLE IF NOT EXISTS booking_rate_limits (
    ip_hash CHAR(64) PRIMARY KEY,
    attempts SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    window_started_at DATETIME NOT NULL
);
