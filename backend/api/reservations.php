<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/app.php';
try {
    require_once __DIR__ . '/../config/database.php';
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(503, ['error' => 'Database belum siap. Periksa konfigurasi koneksi dan migrasi.']);
}

function parseApiDate(string $value): ?DateTimeImmutable
{
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    $errors = DateTimeImmutable::getLastErrors();
    if (!$date || ($errors !== false && ($errors['warning_count'] || $errors['error_count'])) || $date->format('Y-m-d') !== $value) {
        return null;
    }
    return $date;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        requireAdmin();
        $query = $pdo->query(
            'SELECT id, booking_date, check_in, check_out, guest_name, guest_email, guest_phone,
                    guest_count, ota, room_type,
                    rooms, room_revenue, booking_status
             FROM reservations ORDER BY created_at DESC, id DESC'
        );
        $rows = array_map(static function (array $row): array {
            $checkIn = $row['check_in'];
            $checkOut = $row['check_out'];
            $nights = max(1, (int) ((strtotime($checkOut) - strtotime($checkIn)) / 86400));
            $rooms = (int) $row['rooms'];
            $price = (float) $row['room_revenue'];
            return [
                'id' => 'BK-' . str_pad((string) $row['id'], 3, '0', STR_PAD_LEFT),
                'guest' => $row['guest_name'],
                'email' => $row['guest_email'],
                'phone' => $row['guest_phone'],
                'guests' => (int) $row['guest_count'],
                'channel' => $row['ota'],
                'otaClass' => $row['ota'] === 'Direct Website' ? 'ota-website' : '',
                'room' => $row['room_type'],
                'rooms' => $rooms,
                'nights' => $nights,
                'rate' => $rooms > 0 && $nights > 0 ? $price / ($rooms * $nights) : $price,
                'price' => $price,
                'status' => strtolower($row['booking_status']),
                'bookingDate' => $row['booking_date'],
                'checkInDate' => $checkIn,
                'departureDate' => $checkOut,
                'checkOutDate' => $checkOut,
            ];
        }, $query->fetchAll());
        jsonResponse(200, ['reservations' => $rows]);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        if ($error instanceof PDOException || $error instanceof RuntimeException) {
            jsonResponse(500, ['error' => 'Reservasi belum dapat dimuat.']);
        }
        throw $error;
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'PATCH') {
    requireAdmin();
    requireCsrf();
    $input = requestJson();
    $idText = (string) ($input['id'] ?? '');
    if (!preg_match('/^BK-(\d+)$/', $idText, $idMatch)) {
        jsonResponse(422, ['error' => 'ID booking tidak valid.']);
    }
    $id = (int) $idMatch[1];
    $guest = trim((string) ($input['guest'] ?? ''));
    $email = trim((string) ($input['email'] ?? ''));
    $phone = trim((string) ($input['phone'] ?? ''));
    $channel = trim((string) ($input['channel'] ?? ''));
    $room = trim((string) ($input['room'] ?? ''));
    $checkIn = parseApiDate((string) ($input['checkInDate'] ?? ''));
    $checkOut = parseApiDate((string) ($input['departureDate'] ?? ''));
    $rooms = filter_var($input['rooms'] ?? null, FILTER_VALIDATE_INT);
    $guests = filter_var($input['guests'] ?? null, FILTER_VALIDATE_INT);
    $statusMap = [
        'pending' => 'Pending', 'confirmed' => 'Confirmed', 'checked-in' => 'Checked-in',
        'checked-out' => 'Checked-out', 'cancelled' => 'Cancelled', 'no-show' => 'No-show',
    ];
    $status = $statusMap[strtolower((string) ($input['status'] ?? ''))] ?? null;
    $allowedChannels = ['Traveloka', 'Tiket.com', 'Agoda', 'Booking.com', 'Expedia', 'Trip.com', 'Direct Website'];
    $emailValid = $email === '' || filter_var($email, FILTER_VALIDATE_EMAIL);
    if ($id < 1 || $guest === '' || mb_strlen($guest) > 150 || !$emailValid || mb_strlen($email) > 190
        || mb_strlen($phone) > 40 || !in_array($channel, $allowedChannels, true)
        || !$checkIn || !$checkOut || $checkOut <= $checkIn || $rooms === false || $rooms < 1 || $rooms > 50
        || $guests === false || $guests < 1 || $guests > 20 || !$status) {
        jsonResponse(422, ['error' => 'Periksa kembali data reservasi.']);
    }

    try {
        $pdo->beginTransaction();
        $roomQuery = $pdo->prepare('SELECT base_rate, max_guests, inventory_count, is_active FROM room_types WHERE room_type = ? FOR UPDATE');
        $roomQuery->execute([$room]);
        $roomData = $roomQuery->fetch();
        if (!$roomData) {
            $pdo->rollBack();
            jsonResponse(422, ['error' => 'Tipe kamar tidak ditemukan.']);
        }
        if ($guests > (int) $roomData['max_guests'] * $rooms) {
            $pdo->rollBack();
            jsonResponse(422, ['error' => 'Jumlah tamu melebihi kapasitas kamar yang dipilih.']);
        }
        $currentQuery = $pdo->prepare('SELECT rooms, booking_status FROM reservations WHERE id = ? FOR UPDATE');
        $currentQuery->execute([$id]);
        $current = $currentQuery->fetch();
        if (!$current) {
            $pdo->rollBack();
            jsonResponse(404, ['error' => 'Booking tidak ditemukan.']);
        }
        $reservesRoom = !in_array($status, ['Cancelled', 'No-show'], true);
        if ($reservesRoom) {
            $occupiedQuery = $pdo->prepare(
                "SELECT COALESCE(SUM(rooms), 0) FROM reservations
                 WHERE room_type = ? AND id <> ? AND booking_status IN ('Pending','Confirmed','Checked-in')
                   AND check_in < ? AND check_out > ?"
            );
            $occupiedQuery->execute([$room, $id, $checkOut->format('Y-m-d'), $checkIn->format('Y-m-d')]);
            $occupied = (int) $occupiedQuery->fetchColumn();
            if ($occupied + $rooms > (int) $roomData['inventory_count']) {
                $pdo->rollBack();
                jsonResponse(409, ['error' => 'Jumlah kamar melebihi inventaris yang tersedia pada tanggal tersebut.']);
            }
        }
        $nights = (int) $checkIn->diff($checkOut)->days;
        $rate = filter_var($input['rate'] ?? $roomData['base_rate'], FILTER_VALIDATE_FLOAT);
        if ($rate === false || $rate < 0 || $rate > 100000000) {
            $pdo->rollBack();
            jsonResponse(422, ['error' => 'Tarif per malam tidak valid.']);
        }
        $update = $pdo->prepare(
            'UPDATE reservations SET guest_name = ?, guest_email = ?, guest_phone = ?, guest_count = ?, ota = ?, room_type = ?,
             rooms = ?, room_revenue = ?, check_in = ?, check_out = ?, booking_status = ? WHERE id = ?'
        );
        $update->execute([
            $guest, $email, $phone, $guests, $channel, $room, $rooms, $rate * $rooms * $nights,
            $checkIn->format('Y-m-d'), $checkOut->format('Y-m-d'), $status, $id,
        ]);
        $pdo->commit();
        jsonResponse(200, ['updated' => true]);
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        error_log($error->getMessage());
        jsonResponse(500, ['error' => 'Perubahan reservasi gagal disimpan.']);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST, PATCH');
    jsonResponse(405, ['error' => 'Metode tidak didukung.']);
}

$input = requestJson();
$isAdminCreate = ($input['source'] ?? '') === 'dashboard';
if ($isAdminCreate) {
    requireAdmin();
    requireCsrf();
} elseif (!empty($input['website'])) {
    jsonResponse(422, ['error' => 'Data booking tidak valid.']);
} else {
    $originHost = strtolower((string) parse_url($_SERVER['HTTP_ORIGIN'] ?? '', PHP_URL_HOST));
    $requestHost = strtolower((string) preg_replace('/:\\d+$/', '', $_SERVER['HTTP_HOST'] ?? ''));
    if ($originHost !== '' && $requestHost !== '' && !hash_equals($requestHost, $originHost)) {
        jsonResponse(403, ['error' => 'Permintaan lintas situs tidak diizinkan.']);
    }
}

$guest = trim((string) ($input['guest'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$channel = $isAdminCreate ? trim((string) ($input['channel'] ?? '')) : 'Direct Website';
$room = trim((string) ($input['room'] ?? ''));
$checkIn = (string) ($input['checkInDate'] ?? '');
$checkOut = (string) ($input['checkOutDate'] ?? '');
$rooms = filter_var($input['rooms'] ?? 1, FILTER_VALIDATE_INT);
$guests = filter_var($input['guests'] ?? 1, FILTER_VALIDATE_INT);
$statusMap = [
    'pending' => 'Pending', 'confirmed' => 'Confirmed', 'checked-in' => 'Checked-in',
    'checked-out' => 'Checked-out', 'cancelled' => 'Cancelled', 'no-show' => 'No-show',
];
$status = $isAdminCreate
    ? ($statusMap[strtolower((string) ($input['status'] ?? 'confirmed'))] ?? null)
    : 'Pending';
$allowedChannels = ['Traveloka', 'Tiket.com', 'Agoda', 'Booking.com', 'Expedia', 'Trip.com', 'Direct Website'];
$rateInput = $isAdminCreate ? filter_var($input['rate'] ?? null, FILTER_VALIDATE_FLOAT) : null;
$start = parseApiDate($checkIn);
$end = parseApiDate($checkOut);
$today = new DateTimeImmutable('today', new DateTimeZone('Asia/Jakarta'));

if ($guest === '' || mb_strlen($guest) > 150
    || ($email !== '' && !filter_var($email, FILTER_VALIDATE_EMAIL)) || (!$isAdminCreate && $email === '')
    || mb_strlen($email) > 190 || (!$isAdminCreate && $phone === '') || mb_strlen($phone) > 40
    || ($isAdminCreate && !in_array($channel, $allowedChannels, true))
    || !$status || !$start || !$end || (!$isAdminCreate && $start < $today) || $end <= $start
    || $rooms === false || $rooms < 1 || $rooms > ($isAdminCreate ? 50 : 3)
    || $guests === false || $guests < 1 || $guests > ($isAdminCreate ? 20 : 4)
    || ($isAdminCreate && ($rateInput === false || $rateInput < 0 || $rateInput > 100000000))) {
    jsonResponse(422, ['error' => 'Periksa kembali nama, kontak, kamar, jumlah tamu, dan tanggal menginap.']);
}

if (!$isAdminCreate) {
    $ipHash = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $limit = $pdo->prepare(
        'INSERT INTO booking_rate_limits (ip_hash, attempts, window_started_at)
         VALUES (?, 1, UTC_TIMESTAMP())
         ON DUPLICATE KEY UPDATE
            attempts = IF(window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), 1, attempts + 1),
            window_started_at = IF(window_started_at < DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR), UTC_TIMESTAMP(), window_started_at)'
    );
    $limit->execute([$ipHash]);
    $attempts = $pdo->prepare('SELECT attempts FROM booking_rate_limits WHERE ip_hash = ?');
    $attempts->execute([$ipHash]);
    if ((int) $attempts->fetchColumn() > 20) {
        jsonResponse(429, ['error' => 'Terlalu banyak permintaan booking dari koneksi ini. Coba lagi nanti.']);
    }
}

$nights = (int) $start->diff($end)->days;
try {
    $pdo->beginTransaction();
    $roomQuery = $pdo->prepare('SELECT base_rate, max_guests, inventory_count, is_active FROM room_types WHERE room_type = ? FOR UPDATE');
    $roomQuery->execute([$room]);
    $roomData = $roomQuery->fetch();
    if (!$roomData || (!$isAdminCreate && !(bool) $roomData['is_active'])) {
        $pdo->rollBack();
        jsonResponse(422, ['error' => 'Tipe kamar ini tidak tersedia untuk dipesan.']);
    }
    if ($guests > (int) $roomData['max_guests'] * $rooms) {
        $pdo->rollBack();
        jsonResponse(422, ['error' => 'Jumlah tamu melebihi kapasitas kamar yang dipilih.']);
    }
    $occupiedQuery = $pdo->prepare(
        "SELECT COALESCE(SUM(rooms), 0) FROM reservations
         WHERE room_type = ? AND booking_status IN ('Pending','Confirmed','Checked-in')
           AND check_in < ? AND check_out > ?"
    );
    $occupiedQuery->execute([$room, $end->format('Y-m-d'), $start->format('Y-m-d')]);
    $occupied = (int) $occupiedQuery->fetchColumn();
    if (!in_array($status, ['Cancelled', 'No-show'], true) && $occupied + $rooms > (int) $roomData['inventory_count']) {
        $pdo->rollBack();
        jsonResponse(409, ['error' => 'Kamar sudah tidak tersedia untuk tanggal tersebut. Pilih tanggal atau tipe kamar lain.']);
    }
    $rate = $isAdminCreate ? (float) $rateInput : (float) $roomData['base_rate'];
    $revenue = $rate * $rooms * $nights;
    $propertyName = (string) ($pdo->query('SELECT property_name FROM hotel_settings WHERE id = 1')->fetchColumn() ?: 'Villa & Sanctuary by Astrid');
    $insert = $pdo->prepare(
        'INSERT INTO reservations
            (property_name, booking_date, check_in, check_out, guest_name, guest_email, guest_phone,
             guest_count, ota, room_type, rooms, room_revenue, booking_status)
         VALUES
            (:property, :booking_date, :check_in, :check_out, :guest, :email, :phone,
             :guest_count, :ota, :room, :rooms, :revenue, :status)'
    );
    $insert->execute([
        ':property' => $propertyName,
        ':booking_date' => (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d'),
        ':check_in' => $start->format('Y-m-d'),
        ':check_out' => $end->format('Y-m-d'),
        ':guest' => $guest,
        ':email' => $email,
        ':phone' => $phone,
        ':guest_count' => $guests,
        ':ota' => $channel,
        ':room' => $room,
        ':rooms' => $rooms,
        ':revenue' => $revenue,
        ':status' => $status,
    ]);
    $newId = $pdo->lastInsertId();
    $pdo->commit();
    jsonResponse(201, ['id' => 'BK-' . str_pad((string) $newId, 3, '0', STR_PAD_LEFT), 'status' => strtolower($status)]);
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    error_log($error->getMessage());
    jsonResponse(500, ['error' => 'Booking gagal disimpan. Coba lagi beberapa saat.']);
}
