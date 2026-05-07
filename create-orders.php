<?php
session_start();//сессия для проверки авторизации 
require_once 'config.php';//поделючаем БД
//получаем данные заказа из тела запроса
$data = json_decode(file_get_contents('php://input'), true);
//проверяем авторизован ли пользователь
if (!isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'error' => 'Не авторизован']);
    exit;
}
//извлекаем данные заказа
$customerId = $data['customerId'];//айди заказчика
$items = $data['items'];//массив товаров в корзине
$deliveryAddress = $data['deliveryAddress'] ?? 'Адрес не указан';

try {
//начинаем транзакцию  все операции выполн только при успешном завершении всех шагов
    $pdo->beginTransaction();
    //вычисляем общую сумму заказа
    $totalAmount = 0;
    foreach ($items as $item) {
        //получаем цену товара из бд
        $stmt = $pdo->prepare("SELECT Price FROM Products WHERE ProductID = ?");
        $stmt->execute([$item['id']]);
        $product = $stmt->fetch();
        if ($product) {
            $totalAmount += $product['Price'] * $item['quantity'];
        }
    }
    //создаем запись в таблице orders
    $stmt = $pdo->prepare("
        INSERT INTO Orders (CustomerID, OrderDate, TotalAmount, Status, DeliveryAddress) 
        VALUES (?, NOW(), ?, 'Новый', ?)
    ");
    $stmt->execute([$customerId, $totalAmount, $deliveryAddress]);
    $orderId = $pdo->lastInsertId();
    //добавление деталей заказа и отправка на склад
    foreach ($items as $item) {//добавляем товар в ордерст
        $stmt = $pdo->prepare("
            INSERT INTO OrderDetails (OrderID, ProductID, Quantity, UnitPrice) 
            VALUES (?, ?, ?, (SELECT Price FROM Products WHERE ProductID = ?))
        ");
        $stmt->execute([$orderId, $item['id'], $item['quantity'], $item['id']]);
        //уменьшаем колличество товара на складе
        $stmt = $pdo->prepare("UPDATE Products SET StockQuantity = StockQuantity - ? WHERE ProductID = ?");
        $stmt->execute([$item['quantity'], $item['id']]);
    }
    //успешный результат с айти созданного заказа возвращаем
    $pdo->commit();
    echo json_encode(['success' => true, 'orderId' => $orderId]);
    
} catch (Exception $e) {
    //откат всех изменений при ошибке
    $pdo->rollBack();
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>