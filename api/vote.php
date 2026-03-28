<?php
session_start();
header('Content-Type: application/json');
require_once '../config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$party = $data['party'] ?? '';

$validParties = ['LDF', 'UDF', 'NDA', 'Others'];
if (!in_array($party, $validParties)) {
    echo json_encode(['success' => false, 'message' => 'Invalid party selection']);
    exit;
}

$userId = $_SESSION['user_id'];

// Check if already voted
$stmt = $pdo->prepare('SELECT has_voted FROM users WHERE id = ?');
$stmt->execute([$userId]);
$user = $stmt->fetch();

if ($user['has_voted']) {
    echo json_encode(['success' => false, 'message' => 'You have already cast an opinion from this account.']);
    exit;
}

// Start transaction to insert vote and update user together
$pdo->beginTransaction();
try {
    // Record vote
    $stmt = $pdo->prepare('INSERT INTO votes (party, user_id) VALUES (?, ?)');
    $stmt->execute([$party, $userId]);

    // Update user
    $stmt = $pdo->prepare('UPDATE users SET has_voted = 1, voted_for = ? WHERE id = ?');
    $stmt->execute([$party, $userId]);

    $pdo->commit();
    echo json_encode(['success' => true]);
} catch (\Exception $e) {
    $pdo->rollBack();
    echo json_encode(['success' => false, 'message' => 'Voting process failed due to server error.']);
}
?>
