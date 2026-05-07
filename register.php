<?php
require_once 'config.php';//поделюч к Бд
//получаем данные из тела запроса и преобразуем в массив
$data = json_decode(file_get_contents('php://input'), true);
//извлекаем поля регистрации с значениями по умлчанию 
$email = $data['email'] ?? '';
$password = $data['password'] ?? '';
$firstName = $data['firstName'] ?? '';
$lastName = $data['lastName'] ?? '';
//обязательный пароль эмайл
if (empty($email) || empty($password)) {
    echo json_encode(['success' => false, 'error' => 'Заполните все поля']);
    exit;
}

// Проверяем, есть ли уже такой email у пользователя
$stmt = $pdo->prepare("SELECT CustomerID FROM Customers WHERE Email = ?");
$stmt->execute([$email]);

if ($stmt->fetch()) {
    //пользователь уже зареган
    echo json_encode(['success' => false, 'error' => 'Email уже зарегистрирован']);
    exit;
}
//хеширование пароля в Бд для безопасности
$hashedPassword = password_hash($password, PASSWORD_DEFAULT);

// Добавляем пользователя в таблицу Customers
$stmt = $pdo->prepare("
    INSERT INTO Customers (FirstName, LastName, Email, Password, RegistrationDate) 
    VALUES (?, ?, ?, ?, NOW())
");
$result = $stmt->execute([$firstName, $lastName, $email, $hashedPassword]);
//возвращаем успех не удачу
echo json_encode(['success' => $result]);
?>
