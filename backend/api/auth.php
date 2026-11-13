<?php
declare(strict_types=1);

require_once __DIR__ . '/../config/app.php';
try {
    require_once __DIR__ . '/../config/database.php';
} catch (Throwable $error) {
    error_log($error->getMessage());
    jsonResponse(503, ['error' => 'Database belum siap. Periksa konfigurasi koneksi dan migrasi.']);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    if (!empty($_SESSION['admin_id'])) {
        jsonResponse(200, [
            'authenticated' => true,
            'username' => (string) $_SESSION['admin_username'],
            'csrfToken' => (string) $_SESSION['csrf_token'],
        ]);
    }
    jsonResponse(200, ['authenticated' => false]);
}

if ($method === 'POST') {
    $input = requestJson();
    $username = trim((string) ($input['username'] ?? ''));
    $password = (string) ($input['password'] ?? '');
    if ($username === '' || strlen($username) > 64 || strlen($password) < 1 || strlen($password) > 1024) {
        jsonResponse(422, ['error' => 'Masukkan username dan password.']);
    }

    $ipHash = hash('sha256', (string) ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
    $attemptQuery = $pdo->prepare('SELECT attempts, window_started_at, blocked_until FROM admin_login_attempts WHERE ip_hash = ?');
    $attemptQuery->execute([$ipHash]);
    $attempt = $attemptQuery->fetch();
    $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
    if ($attempt && $attempt['blocked_until'] && new DateTimeImmutable($attempt['blocked_until'], new DateTimeZone('UTC')) > $now) {
        jsonResponse(429, ['error' => 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.']);
    }
    if ($attempt && new DateTimeImmutable($attempt['window_started_at'], new DateTimeZone('UTC')) < $now->modify('-15 minutes')) {
        $attempt = null;
    }

    $userQuery = $pdo->prepare('SELECT id, username, password_hash FROM admin_users WHERE username = ? AND is_active = 1 LIMIT 1');
    $userQuery->execute([$username]);
    $user = $userQuery->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        $attempts = (int) ($attempt['attempts'] ?? 0) + 1;
        $windowStarted = $attempt['window_started_at'] ?? $now->format('Y-m-d H:i:s');
        $blockedUntil = $attempts >= 8 ? $now->modify('+15 minutes')->format('Y-m-d H:i:s') : null;
        $saveAttempt = $pdo->prepare(
            'INSERT INTO admin_login_attempts (ip_hash, attempts, window_started_at, blocked_until)
             VALUES (?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE attempts = VALUES(attempts), window_started_at = VALUES(window_started_at), blocked_until = VALUES(blocked_until)'
        );
        $saveAttempt->execute([$ipHash, $attempts, $windowStarted, $blockedUntil]);
        usleep(250000);
        jsonResponse(401, ['error' => 'Username atau password tidak cocok.']);
    }

    session_regenerate_id(true);
    $_SESSION['admin_id'] = (int) $user['id'];
    $_SESSION['admin_username'] = (string) $user['username'];
    $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    $pdo->prepare('UPDATE admin_users SET last_login_at = UTC_TIMESTAMP() WHERE id = ?')->execute([$user['id']]);
    $pdo->prepare('DELETE FROM admin_login_attempts WHERE ip_hash = ?')->execute([$ipHash]);
    jsonResponse(200, ['authenticated' => true, 'username' => $user['username'], 'csrfToken' => $_SESSION['csrf_token']]);
}

if ($method === 'DELETE') {
    requireAdmin();
    requireCsrf();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', [
            'expires' => time() - 42000,
            'path' => $params['path'],
            'domain' => $params['domain'],
            'secure' => $params['secure'],
            'httponly' => $params['httponly'],
            'samesite' => $params['samesite'] ?? 'Lax',
        ]);
    }
    session_destroy();
    jsonResponse(200, ['authenticated' => false]);
}

header('Allow: GET, POST, DELETE');
jsonResponse(405, ['error' => 'Metode tidak didukung.']);
