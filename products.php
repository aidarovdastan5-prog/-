<?php
require_once 'config.php';//подключаем config  с бд

try {
    //запрос на получение всех товаров с присоединением для получения названия категорий
    $stmt = $pdo->query("
        SELECT 
            p.ProductID as id,
            p.ProductName as name,
            c.CategoryName as category,
            p.Price as price,
            p.StockQuantity as stock,
            p.Image as image,
            p.Badge as badge
        FROM Products p
        LEFT JOIN Categories c ON p.CategoryID = c.CategoryID
    ");
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode($products);
} catch(PDOException $e) {
    echo json_encode(['error' => $e->getMessage()]);
}
?>