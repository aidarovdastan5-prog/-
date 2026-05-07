<?php
session_start();//запуск сессии для доступа к данным пользователя
require_once 'config.php';//БД
//проверка авторизован ли пользователь
if (isset($_SESSION['user_id'])) {
    //получ актуальные данные данные пользователя из бд
    $stmt = $pdo->prepare("SELECT CustomerID, Email, FirstName, LastName, is_admin FROM Customers WHERE CustomerID = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    //возвращаем информ о пользователе
    echo json_encode([
        'authenticated' => true,
        'user' => [
            'id' => $user['CustomerID'],
            'email' => $user['Email'],
            'name' => $user['FirstName'] . ' ' . $user['LastName'],
            'is_admin' => $user['is_admin'] == 1
        ]
    ]);
} else {
    //пользователь не авторизован 
    echo json_encode(['authenticated' => false]);
}
?>