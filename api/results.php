<?php
header('Content-Type: application/json');
require_once '../config.php';

try {
    $stmt = $pdo->query('SELECT party, COUNT(*) as count FROM votes GROUP BY party');
    $results = $stmt->fetchAll(PDO::FETCH_KEY_PAIR);

    $response = [
        'LDF' => (int)($results['LDF'] ?? 0),
        'UDF' => (int)($results['UDF'] ?? 0),
        'NDA' => (int)($results['NDA'] ?? 0),
        'Others' => (int)($results['Others'] ?? 0)
    ];

    echo json_encode($response);
} catch (\Exception $e) {
    // Graceful fallback if database isn't ready
    echo json_encode([
        'LDF' => 0,
        'UDF' => 0,
        'NDA' => 0,
        'Others' => 0
    ]);
}
?>
