<?php
session_start();//запускаем сессию для сохранения данных пользователя
require_once 'config.php';//подключ бд
//подключаем json  с email и паролем
$data = json_decode(file_get_contents('php://input'), true);

$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
//проверка что поля заполнены 
if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'error' => 'Заполните все поля']);
    exit;
}
//ищем пользователя по эмайл
$stmt = $pdo->prepare("
    SELECT CustomerID, Email, FirstName, LastName, Password 
    FROM Customers 
    WHERE Email = ?
");
$stmt->execute([$email]);
$user = $stmt->fetch(PDO::FETCH_ASSOC);
//проверяем пользовател найден и пароль совпадает с хэшем в бд
if ($user && password_verify($password, $user['Password'])) {
    //сохраняем данны пользвоателя в сессию
    $_SESSION['user_id'] = $user['CustomerID'];
    $_SESSION['user_email'] = $user['Email'];
    $_SESSION['user_name'] = $user['FirstName'] . ' ' . $user['LastName'];
    //возращаем успешный ответ с данными пользователя без пароля
    echo json_encode([
        'success' => true,
        'user' => [
            'id' => $user['CustomerID'],
            'email' => $user['Email'],
            'name' => $user['FirstName'] . ' ' . $user['LastName']
        ]
    ]);
} else {
    echo json_encode(['success' => false, 'error' => 'Неверный email или пароль']);
}
?>