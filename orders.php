<?php
session_start();
require_once '../config.php';

if (!isset($_SESSION['user_id'])) {
    echo json_encode(['error' => 'Не авторизован']);
    exit;
}

$stmt = $pdo->prepare("SELECT is_admin FROM Customers WHERE CustomerID = ?");
$stmt->execute([$_SESSION['user_id']]);
$user = $stmt->fetch();

if (!$user || !$user['is_admin']) {
    echo json_encode(['error' => 'Доступ запрещён']);
    exit;
}

$stmt = $pdo->query("
    SELECT o.*, CONCAT(c.FirstName, ' ', c.LastName) as CustomerName, c.Email 
    FROM Orders o
    LEFT JOIN Customers c ON o.CustomerID = c.CustomerID
    ORDER BY o.OrderDate DESC
");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>