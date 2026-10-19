<?php
header('Content-Type: application/json');
echo json_encode([
  'php'        => PHP_VERSION,
  'pdo'        => class_exists('PDO'),
  'drivers'    => class_exists('PDO') ? PDO::getAvailableDrivers() : [],
  'sqlite3'    => class_exists('SQLite3'),
  'sessions'   => function_exists('session_start'),
  'docroot_w'  => is_writable(__DIR__),
  'open_basedir' => ini_get('open_basedir') ?: null,
], JSON_PRETTY_PRINT);
