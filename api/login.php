<?php
session_start();
header('Content-Type: application/json');
require_once '../config.php';

$data = json_decode(file_get_contents('php://input'), true);
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';

$stmt = $pdo->prepare('SELECT id, password_hash, has_voted, voted_for FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user && password_verify($password, $user['password_hash'])) {
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['email'] = $email;
    echo json_encode([
        'success' => true,
        'hasVoted' => (bool)$user['has_voted'],
        'votedFor' => $user['voted_for']
    ]);
} else {
    echo json_encode(['success' => false, 'message' => 'Invalid email or password']);
}
?>
