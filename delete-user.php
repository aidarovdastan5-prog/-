<?php
session_start();
require_once '../config.php';

$data = json_decode(file_get_contents('php://input'), true);

$stmt = $pdo->prepare("DELETE FROM Customers WHERE CustomerID = ?");
echo json_encode(['success' => $stmt->execute([$data['userId']])]);
?>