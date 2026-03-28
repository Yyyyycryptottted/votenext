<?php
session_start();
header('Content-Type: application/json');
require_once '../config.php';

if (isset($_SESSION['user_id'])) {
    // Refresh voted status
    $stmt = $pdo->prepare('SELECT has_voted, voted_for FROM users WHERE id = ?');
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if ($user) {
        echo json_encode([
            'loggedIn' => true, 
            'email' => $_SESSION['email'],
            'hasVoted' => (bool)$user['has_voted'],
            'votedFor' => $user['voted_for']
        ]);
        exit;
    }
}

echo json_encode(['loggedIn' => false]);
?>
