<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

require_once __DIR__ . '/../config/database.php';

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function apiStatus(string $status): string
{
    return match (strtolower($status)) {
        'pending' => 'Pending',
        'confirmed' => 'Confirmed',
        'checked-in' => 'Checked-in',
        'checked-out' => 'Checked-out',
        'cancelled' => 'Cancelled',
        'no-show' => 'No-show',
        default => 'Pending',
    };
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    try {
        $query = $pdo->query(
            'SELECT id, booking_date, check_in, check_out, guest_name, ota, room_type,
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
        respond(200, ['reservations' => $rows]);
    } catch (Throwable $error) {
        error_log($error->getMessage());
        respond(500, ['error' => 'Reservasi belum dapat dimuat.']);
    }
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Metode tidak didukung.']);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    respond(400, ['error' => 'Data booking tidak valid.']);
}

$guest = trim((string) ($input['guest'] ?? ''));
$email = trim((string) ($input['email'] ?? ''));
$phone = trim((string) ($input['phone'] ?? ''));
$room = trim((string) ($input['room'] ?? ''));
$checkIn = (string) ($input['checkInDate'] ?? '');
$checkOut = (string) ($input['checkOutDate'] ?? '');
$rooms = filter_var($input['rooms'] ?? 1, FILTER_VALIDATE_INT);
$guests = filter_var($input['guests'] ?? 1, FILTER_VALIDATE_INT);
$roomRates = [
    'Standard Twin' => 900000,
    'Standard Double' => 1000000,
    'Superior Double' => 1200000,
    'Deluxe Double' => 1600000,
    'Executive Double' => 2000000,
    'Junior Suite Double' => 2500000,
];
$start = DateTimeImmutable::createFromFormat('!Y-m-d', $checkIn);
$end = DateTimeImmutable::createFromFormat('!Y-m-d', $checkOut);
$today = new DateTimeImmutable('today', new DateTimeZone('Asia/Jakarta'));

if ($guest === '' || mb_strlen($guest) > 150 || !filter_var($email, FILTER_VALIDATE_EMAIL)
    || mb_strlen($email) > 190 || $phone === '' || mb_strlen($phone) > 40
    || !isset($roomRates[$room]) || !$start || !$end || $start < $today || $end <= $start
    || $rooms === false || $rooms < 1 || $rooms > 3 || $guests === false || $guests < 1 || $guests > 4) {
    respond(422, ['error' => 'Periksa kembali nama, kontak, kamar, jumlah tamu, dan tanggal menginap.']);
}

$nights = (int) $start->diff($end)->days;
$revenue = $roomRates[$room] * $rooms * $nights;
try {
    $insert = $pdo->prepare(
        'INSERT INTO reservations
            (property_name, booking_date, check_in, check_out, guest_name, guest_email,
             guest_phone, ota, room_type, rooms, room_revenue, booking_status)
         VALUES
            (:property, :booking_date, :check_in, :check_out, :guest, :email,
             :phone, :ota, :room, :rooms, :revenue, :status)'
    );
    $insert->execute([
        ':property' => 'Villa & Sanctuary by Astrid',
        ':booking_date' => (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d'),
        ':check_in' => $start->format('Y-m-d'),
        ':check_out' => $end->format('Y-m-d'),
        ':guest' => $guest,
        ':email' => $email,
        ':phone' => $phone,
        ':ota' => 'Direct Website',
        ':room' => $room,
        ':rooms' => $rooms,
        ':revenue' => $revenue,
        ':status' => 'Pending',
    ]);
    respond(201, ['id' => 'BK-' . str_pad((string) $pdo->lastInsertId(), 3, '0', STR_PAD_LEFT), 'status' => 'pending']);
} catch (Throwable $error) {
    error_log($error->getMessage());
    respond(500, ['error' => 'Booking gagal disimpan. Coba lagi beberapa saat.']);
}
