<?php
declare(strict_types=1);

$localConfigPath = __DIR__ . '/database.local.php';
$localConfig = is_file($localConfigPath) ? require $localConfigPath : [];
$appEnvironment = getenv('APP_ENV') ?: 'local';
$host = getenv('DB_HOST') ?: ($localConfig['host'] ?? '127.0.0.1');
$dbname = getenv('DB_NAME') ?: ($localConfig['name'] ?? 'revenue_tracker');
$username = getenv('DB_USER') ?: ($localConfig['user'] ?? 'root');
$password = getenv('DB_PASS');
if ($password === false) {
    $password = $localConfig['password'] ?? '';
}

if ($appEnvironment === 'production' && ($password === '' || getenv('DB_USER') === false)) {
    throw new RuntimeException('Production database credentials must be configured in the hosting environment.');
}

try {
    $pdo = new PDO(
        "mysql:host=$host;dbname=$dbname;charset=utf8mb4",
        $username,
        $password,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_PERSISTENT => false,
            PDO::ATTR_TIMEOUT => 5,
        ]
    );
} catch (PDOException $e) {
    error_log($e->getMessage());
    throw new RuntimeException('Database connection failed.', 0, $e);
}
