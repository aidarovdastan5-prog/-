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

$stmt = $pdo->query("SELECT CustomerID, FirstName, LastName, Email, RegistrationDate FROM Customers");
echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
?>