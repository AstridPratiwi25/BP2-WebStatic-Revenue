<?php
declare(strict_types=1);

$isHttps = (getenv('APP_ENV') === 'production')
    || (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
if (session_status() !== PHP_SESSION_ACTIVE) {
    ini_set('session.use_strict_mode', '1');
    ini_set('session.use_only_cookies', '1');
    session_name('villa_sanctuary_admin');
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $isHttps,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);
    session_start();
}

function jsonResponse(int $status, array $data): never
{
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function requestJson(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || strlen($raw) > 16384) {
        jsonResponse(413, ['error' => 'Ukuran permintaan terlalu besar.']);
    }
    $data = json_decode($raw, true);
    if (!is_array($data)) {
        jsonResponse(400, ['error' => 'Format data tidak valid.']);
    }
    return $data;
}

function requireAdmin(): array
{
    if (empty($_SESSION['admin_id']) || empty($_SESSION['csrf_token'])) {
        jsonResponse(401, ['error' => 'Silakan login kembali.']);
    }
    return ['id' => (int) $_SESSION['admin_id'], 'username' => (string) $_SESSION['admin_username']];
}

function requireCsrf(): void
{
    $provided = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? '';
    if (empty($_SESSION['csrf_token']) || !is_string($provided)
        || !hash_equals((string) $_SESSION['csrf_token'], $provided)) {
        jsonResponse(419, ['error' => 'Sesi formulir kedaluwarsa. Muat ulang halaman dan coba lagi.']);
    }
}
