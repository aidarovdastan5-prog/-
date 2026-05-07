<?php
session_start();//запуск сессиии
session_destroy();//уничтожаем все данные сессии
echo json_encode(['success' => true]);//подвежждаем успешный выход
?>