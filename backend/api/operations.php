<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/app.php';
try {
    require_once __DIR__ . '/../config/database.php';
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(503, ['error' => 'Database belum siap. Periksa konfigurasi koneksi dan migrasi.']);
}

requireAdmin();
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    try {
        $rooms = $pdo->query(
            'SELECT room_number, room_type, capacity, operational_status, housekeeping_status, housekeeping_note
             FROM hotel_rooms ORDER BY room_number'
        )->fetchAll();
        $types = $pdo->query(
            'SELECT room_type, description, max_guests, base_rate, is_active,
                    (SELECT COUNT(*) FROM hotel_rooms hr
                     WHERE hr.room_type = room_types.room_type AND hr.operational_status = \'Active\') AS inventory_count
             FROM room_types ORDER BY base_rate, room_type'
        )->fetchAll();
        $settings = $pdo->query(
            'SELECT property_name, tax_percent, ota_commission_percent FROM hotel_settings WHERE id = 1'
        )->fetch() ?: [
            'property_name' => 'Villa & Sanctuary by Astrid',
            'tax_percent' => 11,
            'ota_commission_percent' => 15,
        ];
        jsonResponse(200, ['rooms' => $rooms, 'roomTypes' => $types, 'settings' => $settings]);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        jsonResponse(500, ['error' => 'Data operasional belum dapat dimuat.']);
    }
}

if ($method !== 'PATCH' && $method !== 'POST') {
    header('Allow: GET, PATCH, POST');
    jsonResponse(405, ['error' => 'Metode tidak didukung.']);
}
requireCsrf();
$input = requestJson();
$action = (string) ($input['action'] ?? '');

try {
    if ($action === 'settings') {
        $name = trim((string) ($input['propertyName'] ?? ''));
        $tax = filter_var($input['tax'] ?? null, FILTER_VALIDATE_FLOAT);
        $commission = filter_var($input['commission'] ?? null, FILTER_VALIDATE_FLOAT);
        if ($name === '' || mb_strlen($name) > 150 || $tax === false || $tax < 0 || $tax > 100
            || $commission === false || $commission < 0 || $commission > 100) {
            jsonResponse(422, ['error' => 'Periksa nama properti, pajak, dan komisi.']);
        }
        $statement = $pdo->prepare(
            'INSERT INTO hotel_settings (id, property_name, tax_percent, ota_commission_percent)
             VALUES (1, ?, ?, ?)
             ON DUPLICATE KEY UPDATE property_name = VALUES(property_name), tax_percent = VALUES(tax_percent),
                 ota_commission_percent = VALUES(ota_commission_percent)'
        );
        $statement->execute([$name, $tax, $commission]);
        jsonResponse(200, ['updated' => true]);
    }

    if ($action === 'room-status') {
        $number = trim((string) ($input['roomNumber'] ?? ''));
        $operational = (string) ($input['operationalStatus'] ?? '');
        $housekeeping = (string) ($input['housekeepingStatus'] ?? '');
        $note = trim((string) ($input['housekeepingNote'] ?? ''));
        $validOperational = ['Active', 'Maintenance', 'Inactive'];
        $validHousekeeping = ['Clean', 'Needs cleaning', 'In progress', 'Inspection'];
        if ($number === '' || !in_array($operational, $validOperational, true)
            || !in_array($housekeeping, $validHousekeeping, true) || mb_strlen($note) > 500) {
            jsonResponse(422, ['error' => 'Status atau catatan kamar tidak valid.']);
        }
        $pdo->beginTransaction();
        $update = $pdo->prepare(
            'UPDATE hotel_rooms SET operational_status = ?, housekeeping_status = ?, housekeeping_note = ? WHERE room_number = ?'
        );
        $update->execute([$operational, $housekeeping, $note, $number]);
        if ($update->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT 1 FROM hotel_rooms WHERE room_number = ?');
            $exists->execute([$number]);
            if (!$exists->fetchColumn()) {
                $pdo->rollBack();
                jsonResponse(404, ['error' => 'Nomor kamar tidak ditemukan.']);
            }
        }
        $roomType = $pdo->prepare('SELECT room_type FROM hotel_rooms WHERE room_number = ?');
        $roomType->execute([$number]);
        $type = (string) $roomType->fetchColumn();
        $syncInventory = $pdo->prepare(
            "UPDATE room_types SET inventory_count =
             (SELECT COUNT(*) FROM hotel_rooms WHERE room_type = ? AND operational_status = 'Active')
             WHERE room_type = ?"
        );
        $syncInventory->execute([$type, $type]);
        $pdo->commit();
        jsonResponse(200, ['updated' => true]);
    }

    if ($action === 'add-room') {
        $number = trim((string) ($input['roomNumber'] ?? ''));
        $type = trim((string) ($input['roomType'] ?? ''));
        if (!preg_match('/^[A-Za-z0-9-]{1,20}$/', $number) || $type === '') {
            jsonResponse(422, ['error' => 'Nomor kamar atau tipe kamar tidak valid.']);
        }
        $pdo->beginTransaction();
        $typeQuery = $pdo->prepare('SELECT max_guests FROM room_types WHERE room_type = ? AND is_active = 1 FOR UPDATE');
        $typeQuery->execute([$type]);
        $roomType = $typeQuery->fetch();
        if (!$roomType) {
            $pdo->rollBack();
            jsonResponse(422, ['error' => 'Pilih tipe kamar yang aktif.']);
        }
        $insert = $pdo->prepare(
            'INSERT INTO hotel_rooms (room_number, room_type, capacity) VALUES (?, ?, ?)'
        );
        $insert->execute([$number, $type, (int) $roomType['max_guests']]);
        $syncInventory = $pdo->prepare(
            "UPDATE room_types SET inventory_count =
             (SELECT COUNT(*) FROM hotel_rooms WHERE room_type = ? AND operational_status = 'Active')
             WHERE room_type = ?"
        );
        $syncInventory->execute([$type, $type]);
        $pdo->commit();
        jsonResponse(201, ['created' => true]);
    }

    jsonResponse(422, ['error' => 'Aksi operasional tidak dikenal.']);
} catch (PDOException $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    if ($error->getCode() === '23000') {
        jsonResponse(409, ['error' => 'Nomor kamar sudah digunakan atau data terkait tidak valid.']);
    }
    error_log($error->getMessage());
    jsonResponse(500, ['error' => 'Perubahan operasional gagal disimpan.']);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log($error->getMessage());
    jsonResponse(500, ['error' => 'Perubahan operasional gagal disimpan.']);
}
