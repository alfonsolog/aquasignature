<?php
header('Content-Type: application/json');
echo json_encode([
  'php'  => PHP_VERSION,
  'mail' => function_exists('mail'),
  'sapi' => PHP_SAPI,
]);
