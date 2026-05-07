<?php
session_start();
require_once '../config.php';

$data = json_decode(file_get_contents('php://input'), true);

$stmt = $pdo->prepare("UPDATE Orders SET Status = ? WHERE OrderID = ?");
echo json_encode(['success' => $stmt->execute([$data['status'], $data['orderId']])]);
?>