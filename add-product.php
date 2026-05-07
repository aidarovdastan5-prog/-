<?php
session_start();
require_once '../config.php';

$data = json_decode(file_get_contents('php://input'), true);

$stmt = $pdo->prepare("
    INSERT INTO Products (ProductName, CategoryID, Price, StockQuantity, Image, Badge) 
    VALUES (?, ?, ?, ?, ?, ?)
");
$result = $stmt->execute([
    $data['name'], $data['category_id'], $data['price'], 
    $data['stock'], $data['image'], $data['badge']
]);
echo json_encode(['success' => $result]);
?>