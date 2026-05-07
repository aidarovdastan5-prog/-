<?php
require_once 'config.php';//поделючаем файл с настройками  БД

try {
    //выполняем SQL запрос для получ всех категорий
    $stmt = $pdo->query("
        SELECT 
            CategoryID as id,
            CategoryName as name,
            Image as image
        FROM Categories
    ");
    //получаем все запросы в виде массива
    $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
    //возвращаем данные в формаате джсон
    echo json_encode($categories);
} catch(PDOException $e) {
    //в случчаем ошибке возвращаем об ошибке
    echo json_encode(['error' => $e->getMessage()]);
}
?>