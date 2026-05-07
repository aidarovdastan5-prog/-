<?php
//устанавливаем загаловки для api все ответы в json и разрешаем и разрешаем запросы с любого домена (cors)
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
//параметры подключения к базе данных
$host = 'localhost'; //хост бд локал хост
$dbname = 'JewelryStore';     // ← Имя  БД
$username = 'root';        //имя пользователя               
$password = '';            //пароль (пустой для локального сервера)    

try {
    //создаем соединение pdo c mySQL
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8", $username, $password);
   //устанавливаем режим ошибок :выбрасывать исключение
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $e) {
    //в случае ошибки возвращаем json с сообщением об ошибкой 
    echo json_encode(['error' => 'Ошибка подключения: ' . $e->getMessage()]);
    exit;// прерываем выполнение скрипта
}
?>