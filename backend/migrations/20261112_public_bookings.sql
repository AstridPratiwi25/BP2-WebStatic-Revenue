USE revenue_tracker;

ALTER TABLE reservations
    ADD COLUMN guest_email VARCHAR(190) NOT NULL DEFAULT '' AFTER guest_name,
    ADD COLUMN guest_phone VARCHAR(40) NOT NULL DEFAULT '' AFTER guest_email,
    MODIFY booking_status ENUM(
        'Pending',
        'Confirmed',
        'Checked-in',
        'Checked-out',
        'Cancelled',
        'No-show'
    ) NOT NULL DEFAULT 'Pending';
