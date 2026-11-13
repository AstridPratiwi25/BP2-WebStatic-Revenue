<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/app.php';
require_once __DIR__ . '/../config/database.php';

function validStayDate(string $value): ?DateTimeImmutable
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors !== false && ($errors['warning_count'] || $errors['error_count'])) || $date->format('Y-m-d') !== $value) {
        return null;
    }
    return $date;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'GET') {
    $checkInRaw = trim((string) ($_GET['check_in'] ?? ''));
    $checkOutRaw = trim((string) ($_GET['check_out'] ?? ''));
    $hasDates = $checkInRaw !== '' || $checkOutRaw !== '';
    $checkIn = $hasDates ? validStayDate($checkInRaw) : null;
    $checkOut = $hasDates ? validStayDate($checkOutRaw) : null;
    if ($hasDates && (!$checkIn || !$checkOut || $checkOut <= $checkIn)) {
        jsonResponse(422, ['error' => 'Tanggal check-in dan check-out tidak valid.']);
    }

    try {
        $types = $pdo->query(
            'SELECT room_type, description, max_guests, base_rate, inventory_count
             FROM room_types WHERE is_active = 1 ORDER BY base_rate, room_type'
        )->fetchAll();
        $availability = $pdo->prepare(
            "SELECT COALESCE(SUM(rooms), 0) FROM reservations
             WHERE room_type = ? AND booking_status IN ('Pending','Confirmed','Checked-in')
               AND check_in < ? AND check_out > ?"
        );
        $rooms = [];
        foreach ($types as $type) {
            $occupied = 0;
            if ($hasDates) {
                $availability->execute([
                    $type['room_type'],
                    $checkOut->format('Y-m-d'),
                    $checkIn->format('Y-m-d'),
                ]);
                $occupied = (int) $availability->fetchColumn();
            }
            $inventory = (int) $type['inventory_count'];
            $rooms[] = [
                'name' => $type['room_type'],
                'description' => $type['description'],
                'capacity' => (int) $type['max_guests'],
                'rate' => (float) $type['base_rate'],
                'inventory' => $inventory,
                'available' => max(0, $inventory - $occupied),
            ];
        }
        jsonResponse(200, ['rooms' => $rooms]);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        jsonResponse(500, ['error' => 'Informasi kamar belum dapat dimuat.']);
    }
}

if ($method === 'PATCH') {
    requireAdmin();
    requireCsrf();
    $input = requestJson();
    $name = trim((string) ($input['name'] ?? ''));
    $rate = filter_var($input['rate'] ?? null, FILTER_VALIDATE_FLOAT);
    $inventory = filter_var($input['inventory'] ?? null, FILTER_VALIDATE_INT);
    $capacity = filter_var($input['capacity'] ?? null, FILTER_VALIDATE_INT);
    $active = filter_var($input['active'] ?? null, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    if ($name === '' || $rate === false || $rate < 0 || $rate > 100000000
        || $inventory === false || $inventory < 0 || $inventory > 1000
        || $capacity === false || $capacity < 1 || $capacity > 20 || $active === null) {
        jsonResponse(422, ['error' => 'Periksa kembali tarif, inventaris, kapasitas, dan status kamar.']);
    }
    try {
        $update = $pdo->prepare(
            'UPDATE room_types SET base_rate = ?, inventory_count = ?, max_guests = ?, is_active = ? WHERE room_type = ?'
        );
        $update->execute([$rate, $inventory, $capacity, $active ? 1 : 0, $name]);
        if ($update->rowCount() === 0) {
            $exists = $pdo->prepare('SELECT 1 FROM room_types WHERE room_type = ?');
            $exists->execute([$name]);
            if (!$exists->fetchColumn()) jsonResponse(404, ['error' => 'Tipe kamar tidak ditemukan.']);
        }
        jsonResponse(200, ['updated' => true]);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        jsonResponse(500, ['error' => 'Pengaturan kamar gagal disimpan.']);
    }
}

header('Allow: GET, PATCH');
jsonResponse(405, ['error' => 'Metode tidak didukung.']);
