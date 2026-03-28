<?php
session_start();
header('Content-Type: application/json');
require_once '../config.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

if (!$email || !$password) {
    echo json_encode(['success' => false, 'message' => 'Email and password required']);
    exit;
}

// Check if email exists
$stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$stmt->execute([$email]);
if ($stmt->fetch()) {
    echo json_encode(['success' => false, 'message' => 'Email already exists']);
    exit;
}

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $pdo->prepare('INSERT INTO users (email, password_hash) VALUES (?, ?)');

if ($stmt->execute([$email, $hash])) {
    $_SESSION['user_id'] = $pdo->lastInsertId();
    $_SESSION['email'] = $email;
    echo json_encode(['success' => true]);
} else {
    echo json_encode(['success' => false, 'message' => 'Registration failed']);
}
?>
