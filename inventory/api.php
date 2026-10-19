<?php
/* ------------------------------------------------------------------ *
 * Aqua Signature — internal inventory API
 *
 * Single JSON endpoint. Reads use GET, writes use POST and must carry
 * the session CSRF token in X-CSRF-Token.
 *
 * Stock rules, enforced here AND as CHECK constraints in the schema so
 * a logic bug fails loudly instead of quietly corrupting a count:
 *   available = on_hand - reserved
 *   on_hand >= 0, reserved >= 0, reserved <= on_hand
 * ------------------------------------------------------------------ */

declare(strict_types=1);

// ---------------------------------------------------------------- setup

const MOVEMENT_TYPES = ['produced', 'delivered', 'reserve', 'release', 'count', 'write_off'];
const LOGIN_MAX_TRIES = 8;      // per window, per IP
const LOGIN_WINDOW    = 600;    // seconds

$CONFIG_PATH = __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: same-origin');

function out(array $payload, int $code = 200): void {
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}
function fail(string $msg, int $code = 400, string $slug = '', array $meta = []): void {
    // $msg is a developer-facing fallback; the UI renders $slug + $meta
    // through its own i18n so staff see Spanish.
    out(['ok' => false, 'error' => $msg, 'code' => $slug, 'meta' => $meta], $code);
}

if (!is_file($CONFIG_PATH)) {
    fail('inventory/config.php is missing. Copy config.example.php and set a password hash.', 500, 'no_config');
}
$config = require $CONFIG_PATH;
if (!is_array($config) || empty($config['password_hash']) || str_contains((string)$config['password_hash'], 'REPLACE_THIS')) {
    fail('config.php has no real password hash yet.', 500, 'no_password');
}

// ---------------------------------------------------------------- session

$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
      || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => rtrim(dirname($_SERVER['SCRIPT_NAME'] ?? '/inventory/api.php'), '/') . '/',
    'httponly' => true,
    'samesite' => 'Strict',
    'secure'   => $https,
]);
session_name('aqua_inv');
session_start();

// ---------------------------------------------------------------- database

function db(array $config): PDO {
    static $pdo = null;
    if ($pdo instanceof PDO) return $pdo;

    $path = $config['db_path'] ?? (__DIR__ . '/data/inventory.sqlite');
    $dir  = dirname($path);
    if (!is_dir($dir) && !@mkdir($dir, 0775, true) && !is_dir($dir)) {
        fail('Cannot create the data directory.', 500, 'no_data_dir');
    }
    try {
        $pdo = new PDO('sqlite:' . $path, null, null, [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]);
    } catch (PDOException $e) {
        fail('Cannot open the database.', 500, 'db_open');
    }

    $pdo->exec('PRAGMA journal_mode = WAL');
    $pdo->exec('PRAGMA foreign_keys = ON');
    $pdo->exec('PRAGMA busy_timeout = 5000');

    migrate($pdo);
    return $pdo;   // starts empty — every SKU is entered by hand
}

function migrate(PDO $pdo): void {
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS skus (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            code          TEXT    NOT NULL UNIQUE,
            product       TEXT    NOT NULL,
            finish        TEXT    NOT NULL,
            hex           TEXT    NOT NULL DEFAULT '',
            location      TEXT    NOT NULL DEFAULT '',
            list_price    INTEGER NOT NULL DEFAULT 0,
            reorder_point INTEGER NOT NULL DEFAULT 0,
            on_hand       INTEGER NOT NULL DEFAULT 0,
            reserved      INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT    NOT NULL,
            updated_at    TEXT    NOT NULL,
            CHECK (on_hand  >= 0),
            CHECK (reserved >= 0),
            CHECK (reserved <= on_hand),
            CHECK (list_price >= 0),
            CHECK (reorder_point >= 0)
        )");
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS movements (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            sku_id         INTEGER NOT NULL REFERENCES skus(id) ON DELETE CASCADE,
            type           TEXT    NOT NULL,
            qty            INTEGER NOT NULL,
            delta_on_hand  INTEGER NOT NULL,
            delta_reserved INTEGER NOT NULL,
            on_hand_after  INTEGER NOT NULL,
            client_ref     TEXT    NOT NULL DEFAULT '',
            note           TEXT    NOT NULL DEFAULT '',
            user_label     TEXT    NOT NULL DEFAULT '',
            created_at     TEXT    NOT NULL
        )");
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_mov_sku     ON movements(sku_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_mov_created ON movements(id DESC)');
}

function now(): string { return gmdate('Y-m-d H:i:s'); }

// ---------------------------------------------------------------- helpers

function body(): array {
    $raw = file_get_contents('php://input') ?: '';
    if ($raw !== '' && str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
        $j = json_decode($raw, true);
        if (is_array($j)) return $j;
    }
    return $_POST;
}
function str_field(array $src, string $key, int $max = 300): string {
    $v = $src[$key] ?? '';
    if (is_array($v)) $v = '';
    return mb_substr(trim((string)$v), 0, $max);
}
function int_field(array $src, string $key): int {
    $v = $src[$key] ?? 0;
    if (!is_numeric($v)) return 0;
    return (int)$v;
}
function authed(): bool { return !empty($_SESSION['inv_auth']); }
function require_auth(): void {
    if (!authed()) fail('Not signed in.', 401, 'unauthenticated');
}
function csrf_token(): string {
    if (empty($_SESSION['csrf'])) $_SESSION['csrf'] = bin2hex(random_bytes(32));
    return $_SESSION['csrf'];
}
function require_csrf(): void {
    $sent = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? (body()['csrf'] ?? '');
    if (empty($_SESSION['csrf']) || !is_string($sent) || !hash_equals($_SESSION['csrf'], $sent)) {
        fail('Invalid or missing CSRF token.', 403, 'bad_csrf');
    }
}
function require_post(): void {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST required.', 405, 'bad_method');
    require_auth();
    require_csrf();
}

// ---------------------------------------------------------------- actions

$action = (string)($_GET['action'] ?? (body()['action'] ?? ''));
$pdoLazy = static fn() => db($GLOBALS['config']);

switch ($action) {

case 'session':
    out(['ok' => true, 'authed' => authed(), 'csrf' => authed() ? csrf_token() : null]);

case 'login': {
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST required.', 405, 'bad_method');

    // throttle by IP so the shared password can't be ground down
    $ip  = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $jar = sys_get_temp_dir() . '/aqua_inv_login_' . md5($ip);
    $hits = array_values(array_filter(
        is_file($jar) ? (json_decode((string)@file_get_contents($jar), true) ?: []) : [],
        static fn($t) => $t > time() - LOGIN_WINDOW
    ));
    if (count($hits) >= LOGIN_MAX_TRIES) {
        fail('Too many attempts. Wait a few minutes.', 429, 'throttled');
    }

    $pw = (string)(body()['password'] ?? '');
    if (!password_verify($pw, (string)$config['password_hash'])) {
        $hits[] = time();
        @file_put_contents($jar, json_encode($hits));
        usleep(300000); // blunt the timing signal
        fail('Wrong password.', 401, 'bad_password');
    }

    @unlink($jar);
    session_regenerate_id(true);           // no session fixation
    $_SESSION['inv_auth'] = true;
    $_SESSION['since']    = time();
    out(['ok' => true, 'csrf' => csrf_token()]);
}

case 'logout':
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') fail('POST required.', 405, 'bad_method');
    $_SESSION = [];
    session_destroy();
    out(['ok' => true]);

case 'state': {
    require_auth();
    $pdo  = $pdoLazy();
    $skus = $pdo->query(
        'SELECT * FROM skus ORDER BY product, finish'
    )->fetchAll();

    $units = $res = $value = 0;
    $needs = 0;
    foreach ($skus as &$s) {
        $s['id']            = (int)$s['id'];
        $s['list_price']    = (int)$s['list_price'];
        $s['reorder_point'] = (int)$s['reorder_point'];
        $s['on_hand']       = (int)$s['on_hand'];
        $s['reserved']      = (int)$s['reserved'];
        $s['available']     = $s['on_hand'] - $s['reserved'];
        $s['status']        = $s['on_hand'] === 0 ? 'out'
                            : ($s['available'] <= $s['reorder_point'] ? 'low' : 'ok');
        $units += $s['on_hand'];
        $res   += $s['reserved'];
        $value += $s['on_hand'] * $s['list_price'];
        if ($s['status'] !== 'ok') $needs++;
    }
    unset($s);

    out(['ok' => true, 'skus' => $skus, 'summary' => [
        'skus' => count($skus), 'on_hand' => $units, 'reserved' => $res,
        'value' => $value, 'needs_production' => $needs,
    ]]);
}

case 'movements': {
    require_auth();
    $pdo   = $pdoLazy();
    $skuId = int_field($_GET, 'sku_id');
    $limit = isset($_GET['limit']) ? max(0, (int)$_GET['limit']) : 200;

    $sql = 'SELECT m.*, s.code, s.product, s.finish
              FROM movements m JOIN skus s ON s.id = m.sku_id';
    $args = [];
    if ($skuId > 0) { $sql .= ' WHERE m.sku_id = ?'; $args[] = $skuId; }
    $sql .= ' ORDER BY m.id DESC';
    if ($limit > 0) { $sql .= ' LIMIT ?'; $args[] = $limit; }

    $st = $pdo->prepare($sql);
    $st->execute($args);
    out(['ok' => true, 'movements' => $st->fetchAll()]);
}

case 'movement': {
    require_post();
    $pdo = $pdoLazy();
    $in  = body();

    $skuId = int_field($in, 'sku_id');
    $type  = str_field($in, 'type', 20);
    $qty   = int_field($in, 'qty');

    if (!in_array($type, MOVEMENT_TYPES, true)) fail('Unknown movement type.', 422, 'bad_type');
    if ($qty < 0)                                fail('Quantity cannot be negative.', 422, 'bad_qty');
    if ($qty === 0 && $type !== 'count')         fail('Quantity must be at least 1.', 422, 'bad_qty');
    if ($qty > 1000000)                          fail('Quantity is implausibly large.', 422, 'bad_qty');

    // IMMEDIATE takes the write lock up front, so a concurrent movement on
    // the same SKU waits instead of computing from a stale read.
    $pdo->exec('BEGIN IMMEDIATE');
    try {
        $st = $pdo->prepare('SELECT * FROM skus WHERE id = ?');
        $st->execute([$skuId]);
        $sku = $st->fetch();
        if (!$sku) { $pdo->exec('ROLLBACK'); fail('SKU not found.', 404, 'no_sku'); }

        $onHand    = (int)$sku['on_hand'];
        $reserved  = (int)$sku['reserved'];
        $available = $onHand - $reserved;

        $newOnHand  = $onHand;
        $newReserved = $reserved;

        switch ($type) {
            case 'produced':
                $newOnHand = $onHand + $qty;
                break;

            case 'delivered':
                if ($qty > $onHand) {
                    $pdo->exec('ROLLBACK');
                    fail("Cannot deliver $qty — only $onHand on hand.", 422, 'insufficient_stock', ['want' => $qty, 'have' => $onHand]);
                }
                $newOnHand   = $onHand - $qty;
                $newReserved = $reserved - min($qty, $reserved);
                break;

            case 'reserve':
                if ($qty > $available) {
                    $pdo->exec('ROLLBACK');
                    fail("Cannot reserve $qty — only $available available.", 422, 'insufficient_available', ['want' => $qty, 'have' => $available]);
                }
                $newReserved = $reserved + $qty;
                break;

            case 'release':
                if ($qty > $reserved) {
                    $pdo->exec('ROLLBACK');
                    fail("Cannot release $qty — only $reserved reserved.", 422, 'insufficient_reserved', ['want' => $qty, 'have' => $reserved]);
                }
                $newReserved = $reserved - $qty;
                break;

            case 'count':
                $newOnHand = $qty;
                break;

            case 'write_off':
                if ($qty > $onHand) {
                    $pdo->exec('ROLLBACK');
                    fail("Cannot write off $qty — only $onHand on hand.", 422, 'insufficient_stock', ['want' => $qty, 'have' => $onHand]);
                }
                $newOnHand = $onHand - $qty;
                break;
        }

        // count and write_off can leave reserved stranded above on_hand
        if ($newReserved > $newOnHand) $newReserved = $newOnHand;
        if ($newOnHand < 0 || $newReserved < 0) {   // unreachable; a tripwire
            $pdo->exec('ROLLBACK');
            fail('Refused: that would drive stock negative.', 422, 'negative');
        }

        $when = now();
        $up = $pdo->prepare('UPDATE skus SET on_hand = ?, reserved = ?, updated_at = ? WHERE id = ?');
        $up->execute([$newOnHand, $newReserved, $when, $skuId]);

        $mv = $pdo->prepare(
            'INSERT INTO movements (sku_id, type, qty, delta_on_hand, delta_reserved,
                                    on_hand_after, client_ref, note, user_label, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $mv->execute([
            $skuId, $type, $qty,
            $newOnHand - $onHand,
            $newReserved - $reserved,
            $newOnHand,
            str_field($in, 'client_ref', 160),
            str_field($in, 'note', 500),
            str_field($in, 'user_label', 40) ?: (string)($config['default_user'] ?? ''),
            $when,
        ]);
        $movementId = (int)$pdo->lastInsertId();
        $pdo->exec('COMMIT');

        out(['ok' => true, 'movement_id' => $movementId, 'sku' => [
            'id' => $skuId, 'on_hand' => $newOnHand, 'reserved' => $newReserved,
            'available' => $newOnHand - $newReserved,
        ]]);
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->exec('ROLLBACK');
        fail('The movement was rejected by the database.', 500, 'db_error');
    }
}

case 'sku_create': {
    require_post();
    $pdo = $pdoLazy(); $in = body();

    $code = strtoupper(str_field($in, 'code', 40));
    if ($code === '')                              fail('Code is required.', 422, 'bad_code');
    if (!preg_match('/^[A-Z0-9][A-Z0-9\-_]*$/', $code)) fail('Code may use letters, numbers, - and _ only.', 422, 'bad_code');
    $product = str_field($in, 'product', 80);
    $finish  = str_field($in, 'finish', 80);
    if ($product === '' || $finish === '')         fail('Product and finish are required.', 422, 'bad_fields');

    $hex = str_field($in, 'hex', 9);
    if ($hex !== '' && !preg_match('/^#[0-9A-Fa-f]{3,8}$/', $hex)) fail('Hex must look like #RRGGBB.', 422, 'bad_hex');

    $onHand   = max(0, int_field($in, 'on_hand'));
    $reserved = max(0, int_field($in, 'reserved'));
    if ($reserved > $onHand) fail('Reserved cannot exceed on hand.', 422, 'bad_reserved');

    $now = now();
    try {
        $pdo->exec('BEGIN IMMEDIATE');
        $st = $pdo->prepare(
            'INSERT INTO skus (code, product, finish, hex, location, list_price,
                               reorder_point, on_hand, reserved, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $st->execute([
            $code, $product, $finish, $hex,
            str_field($in, 'location', 80),
            max(0, int_field($in, 'list_price')),
            max(0, int_field($in, 'reorder_point')),
            $onHand, $reserved, $now, $now,
        ]);
        $newId = (int)$pdo->lastInsertId();

        /* Opening stock gets its own ledger row, so every unit on hand can
         * be traced to a movement rather than appearing from nowhere. */
        if ($onHand > 0 || $reserved > 0) {
            $mv = $pdo->prepare(
                'INSERT INTO movements (sku_id, type, qty, delta_on_hand, delta_reserved,
                                        on_hand_after, client_ref, note, user_label, created_at)
                 VALUES (?, \'count\', ?, ?, ?, ?, \'\', ?, ?, ?)');
            $mv->execute([
                $newId, $onHand, $onHand, $reserved, $onHand,
                'Opening balance',
                str_field($in, 'user_label', 40) ?: (string)($config['default_user'] ?? ''),
                $now,
            ]);
        }
        $pdo->exec('COMMIT');
    } catch (PDOException $e) {
        if ($pdo->inTransaction()) $pdo->exec('ROLLBACK');
        if ((int)$e->getCode() === 23000 || str_contains($e->getMessage(), 'UNIQUE')) {
            fail("SKU code $code already exists.", 409, 'duplicate_code', ['code' => $code]);
        }
        fail('Could not create that SKU.', 500, 'db_error');
    }
    out(['ok' => true, 'id' => $newId]);
}

case 'sku_update': {
    require_post();
    $pdo = $pdoLazy(); $in = body();
    $id  = int_field($in, 'id');

    $st = $pdo->prepare('SELECT * FROM skus WHERE id = ?');
    $st->execute([$id]);
    $sku = $st->fetch();
    if (!$sku) fail('SKU not found.', 404, 'no_sku');

    $code = strtoupper(str_field($in, 'code', 40));
    if ($code === '' || !preg_match('/^[A-Z0-9][A-Z0-9\-_]*$/', $code)) fail('Invalid code.', 422, 'bad_code');
    $product = str_field($in, 'product', 80);
    $finish  = str_field($in, 'finish', 80);
    if ($product === '' || $finish === '') fail('Product and finish are required.', 422, 'bad_fields');
    $hex = str_field($in, 'hex', 9);
    if ($hex !== '' && !preg_match('/^#[0-9A-Fa-f]{3,8}$/', $hex)) fail('Hex must look like #RRGGBB.', 422, 'bad_hex');

    /* Deliberately does NOT touch on_hand / reserved — stock only ever moves
     * through a movement, so the ledger stays the whole truth. */
    try {
        $up = $pdo->prepare(
            'UPDATE skus SET code = ?, product = ?, finish = ?, hex = ?, location = ?,
                             list_price = ?, reorder_point = ?, updated_at = ?
             WHERE id = ?');
        $up->execute([
            $code, $product, $finish, $hex,
            str_field($in, 'location', 80),
            max(0, int_field($in, 'list_price')),
            max(0, int_field($in, 'reorder_point')),
            now(), $id,
        ]);
    } catch (PDOException $e) {
        if ((int)$e->getCode() === 23000 || str_contains($e->getMessage(), 'UNIQUE')) {
            fail("SKU code $code already exists.", 409, 'duplicate_code', ['code' => $code]);
        }
        fail('Could not update that SKU.', 500, 'db_error');
    }
    out(['ok' => true]);
}

case 'sku_delete': {
    require_post();
    $pdo = $pdoLazy();
    $id  = int_field(body(), 'id');

    $st = $pdo->prepare('SELECT code FROM skus WHERE id = ?');
    $st->execute([$id]);
    if (!$st->fetch()) fail('SKU not found.', 404, 'no_sku');

    // movements cascade with the SKU
    $del = $pdo->prepare('DELETE FROM skus WHERE id = ?');
    $del->execute([$id]);
    out(['ok' => true]);
}

default:
    fail('Unknown action.', 404, 'bad_action');
}
