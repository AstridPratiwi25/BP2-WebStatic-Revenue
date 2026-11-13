<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/../config/database.php';

$username = trim((string) readline('Admin username: '));
if (!preg_match('/^[A-Za-z0-9._-]{3,64}$/', $username)) {
    fwrite(STDERR, "Username harus 3-64 karakter: huruf, angka, titik, garis bawah, atau strip.\n");
    exit(1);
}

fwrite(STDOUT, "Password (minimal 12 karakter; input terlihat di terminal): ");
$password = trim((string) fgets(STDIN));
fwrite(STDOUT, "Ulangi password: ");
$confirmation = trim((string) fgets(STDIN));
if (strlen($password) < 12 || !hash_equals($password, $confirmation)) {
    fwrite(STDERR, "Password harus minimal 12 karakter dan kedua input harus sama.\n");
    exit(1);
}

try {
    $insert = $pdo->prepare('INSERT INTO admin_users (username, password_hash) VALUES (?, ?)');
    $insert->execute([$username, password_hash($password, PASSWORD_DEFAULT)]);
    fwrite(STDOUT, "Admin berhasil dibuat. Simpan kredensial dengan aman.\n");
} catch (Throwable $error) {
    error_log($error->getMessage());
    fwrite(STDERR, "Admin gagal dibuat. Pastikan migration sudah dijalankan dan username belum dipakai.\n");
    exit(1);
}
