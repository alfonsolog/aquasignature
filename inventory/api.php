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

    /* AQUA_INV_DB lets a test run work on a COPY of the database. Production
     * never sets it; anyone who can set env vars already owns the process. */
    $path = getenv('AQUA_INV_DB') ?: ($config['db_path'] ?? (__DIR__ . '/data/inventory.sqlite'));
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
            unit_cost     INTEGER NOT NULL DEFAULT 0,
            reorder_point INTEGER NOT NULL DEFAULT 0,
            on_hand       INTEGER NOT NULL DEFAULT 0,
            reserved      INTEGER NOT NULL DEFAULT 0,
            created_at    TEXT    NOT NULL,
            updated_at    TEXT    NOT NULL,
            CHECK (on_hand  >= 0),
            CHECK (reserved >= 0),
            CHECK (reserved <= on_hand),
            CHECK (list_price >= 0),
            CHECK (unit_cost >= 0),
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
    /* Additive migrations for databases created before a column existed.
     * SQLite's ALTER TABLE cannot attach a CHECK to an existing table, so a
     * migrated database relies on the API's own max(0, ...) validation for
     * unit_cost while a fresh one also has the constraint above. Both reject
     * negatives; only the enforcement point differs. */
    $have = array_column($pdo->query('PRAGMA table_info(skus)')->fetchAll(), 'name');
    if (!in_array('unit_cost', $have, true)) {
        $pdo->exec('ALTER TABLE skus ADD COLUMN unit_cost INTEGER NOT NULL DEFAULT 0');
    }

    /* Price snapshots. A movement has to remember what a unit was worth when
     * it happened, or re-pricing a SKU would silently rewrite last month's
     * reported sales. Existing rows are backfilled once, from the SKU's
     * current values — the best estimate available after the fact. */
    $mv = array_column($pdo->query('PRAGMA table_info(movements)')->fetchAll(), 'name');
    if (!in_array('unit_price', $mv, true)) {
        $pdo->exec('ALTER TABLE movements ADD COLUMN unit_price INTEGER NOT NULL DEFAULT 0');
        $pdo->exec('UPDATE movements SET unit_price =
                      COALESCE((SELECT list_price FROM skus WHERE skus.id = movements.sku_id), 0)');
    }
    if (!in_array('unit_cost', $mv, true)) {
        $pdo->exec('ALTER TABLE movements ADD COLUMN unit_cost INTEGER NOT NULL DEFAULT 0');
        $pdo->exec('UPDATE movements SET unit_cost =
                      COALESCE((SELECT unit_cost FROM skus WHERE skus.id = movements.sku_id), 0)');
    }
    if (!in_array('itbis_rate', $mv, true)) {
        $pdo->exec('ALTER TABLE movements ADD COLUMN itbis_rate REAL NOT NULL DEFAULT 0');
        $st = $pdo->prepare('UPDATE movements SET itbis_rate = ?');
        $st->execute([itbis_rate($GLOBALS['config'])]);
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS period_closes (
            period       TEXT PRIMARY KEY,          -- 'YYYY-MM'
            closed_at    TEXT NOT NULL,
            closed_by    TEXT NOT NULL DEFAULT '',
            totals_json  TEXT NOT NULL,
            per_sku_json TEXT NOT NULL
        )");

    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_mov_sku     ON movements(sku_id)');
    $pdo->exec('CREATE INDEX IF NOT EXISTS idx_mov_created ON movements(id DESC)');
}

function now(): string { return gmdate('Y-m-d H:i:s'); }

/* Falls back to 18% so an install whose config.php predates this setting
 * keeps working instead of pricing everything at 0% tax. */
function itbis_rate(array $config): float {
    $r = $config['itbis_rate'] ?? 0.18;
    return (is_numeric($r) && $r >= 0 && $r <= 1) ? (float)$r : 0.18;
}


/* ------------------------------------------------------------------ *
 * Periods
 *
 * Every figure below is derived from the price SNAPSHOT on each movement,
 * never from the SKU's current price. Re-pricing a product must not move
 * a number in a month that has already been reported.
 * ------------------------------------------------------------------ */

function this_month(): string { return gmdate('Y-m'); }

function month_add(string $ym, int $n): string {
    [$y, $m] = array_map('intval', explode('-', $ym));
    $t = ($y * 12 + ($m - 1)) + $n;
    return sprintf('%04d-%02d', intdiv($t, 12), ($t % 12) + 1);
}
function month_start(string $ym): string { return $ym . '-01 00:00:00'; }

/* Resolve a period spec into bounds. Accepts YYYY-MM, YYYY-Qn, YYYY, all. */
function period_bounds(string $key): array {
    if ($key === 'all') {
        return ['kind' => 'all', 'key' => 'all', 'from' => '0000-01-01 00:00:00',
                'to' => '9999-12-31 23:59:59', 'months' => []];
    }
    if (preg_match('/^(\d{4})-Q([1-4])$/', $key, $m)) {
        $first = sprintf('%04d-%02d', (int)$m[1], (((int)$m[2] - 1) * 3) + 1);
        $months = [$first, month_add($first, 1), month_add($first, 2)];
        return ['kind' => 'quarter', 'key' => $key, 'from' => month_start($first),
                'to' => month_start(month_add($first, 3)), 'months' => $months];
    }
    if (preg_match('/^(\d{4})$/', $key)) {
        $months = [];
        for ($i = 1; $i <= 12; $i++) $months[] = sprintf('%s-%02d', $key, $i);
        return ['kind' => 'year', 'key' => $key, 'from' => $key . '-01-01 00:00:00',
                'to' => ((int)$key + 1) . '-01-01 00:00:00', 'months' => $months];
    }
    if (preg_match('/^\d{4}-\d{2}$/', $key)) {
        return ['kind' => 'month', 'key' => $key, 'from' => month_start($key),
                'to' => month_start(month_add($key, 1)), 'months' => [$key]];
    }
    fail('Unknown period.', 422, 'bad_period');
}

function blank_figures(): array {
    return ['produced' => 0, 'delivered' => 0, 'written_off' => 0,
            'sales' => 0, 'itbis' => 0, 'cogs' => 0, 'profit' => 0,
            // sales whose movement carried no cost basis: profit on these is
            // overstated, and the UI says so rather than quietly inflating
            'uncosted_sales' => 0,
            'opening_units' => 0, 'opening_value' => 0,
            'closing_units' => 0, 'closing_value' => 0];
}

/* Stock level and cost basis as of an instant, taken from the last movement
 * before it — the ledger is the only record of what was on the shelf then. */
function stock_at(PDO $pdo, string $instant): array {
    $st = $pdo->prepare(
        'SELECT m.sku_id, m.on_hand_after, m.unit_cost
           FROM movements m
           JOIN (SELECT sku_id, MAX(id) AS mid FROM movements
                  WHERE created_at < ? GROUP BY sku_id) x ON x.mid = m.id');
    $st->execute([$instant]);
    $out = [];
    foreach ($st->fetchAll() as $r) {
        $out[(int)$r['sku_id']] = ['units' => (int)$r['on_hand_after'],
                                   'cost'  => (int)$r['unit_cost']];
    }
    return $out;
}

/* Compute a window straight from the ledger. */
function compute_window(PDO $pdo, string $from, string $to): array {
    $perSku = [];
    $get = function (int $id) use (&$perSku) {
        if (!isset($perSku[$id])) $perSku[$id] = blank_figures();
        return $id;
    };

    $st = $pdo->prepare(
        'SELECT sku_id, type, qty, unit_price, unit_cost, itbis_rate
           FROM movements WHERE created_at >= ? AND created_at < ?');
    $st->execute([$from, $to]);
    foreach ($st->fetchAll() as $r) {
        $id = $get((int)$r['sku_id']);
        $qty = (int)$r['qty'];
        switch ($r['type']) {
            case 'produced':
                $perSku[$id]['produced'] += $qty;
                break;
            case 'write_off':
                $perSku[$id]['written_off'] += $qty;
                break;
            case 'delivered':
                $line = $qty * (int)$r['unit_price'];
                $perSku[$id]['delivered'] += $qty;
                $perSku[$id]['sales']     += $line;
                $perSku[$id]['itbis']     += (int)round($line * (float)$r['itbis_rate']);
                $perSku[$id]['cogs']      += $qty * (int)$r['unit_cost'];
                if ((int)$r['unit_cost'] === 0) $perSku[$id]['uncosted_sales'] += $line;
                break;
        }
    }

    $open  = stock_at($pdo, $from);
    $close = stock_at($pdo, $to);
    foreach (array_keys($open + $close) as $id) {
        $get((int)$id);
    }
    foreach ($perSku as $id => &$f) {
        $f['opening_units'] = $open[$id]['units']  ?? 0;
        $f['opening_value'] = ($open[$id]['units'] ?? 0) * ($open[$id]['cost'] ?? 0);
        $f['closing_units'] = $close[$id]['units'] ?? 0;
        $f['closing_value'] = ($close[$id]['units'] ?? 0) * ($close[$id]['cost'] ?? 0);
        $f['profit']        = $f['sales'] - $f['cogs'];
    }
    unset($f);

    return ['per_sku' => $perSku, 'totals' => sum_figures($perSku)];
}

function sum_figures(array $perSku): array {
    $t = blank_figures();
    foreach ($perSku as $f) {
        foreach ($t as $k => $_) $t[$k] += $f[$k] ?? 0;
    }
    $t['profit'] = $t['sales'] - $t['cogs'];
    return $t;
}

/* Add b into a, key by key — used to fold closed months into a quarter/year. */
function merge_per_sku(array $a, array $b): array {
    foreach ($b as $id => $f) {
        if (!isset($a[$id])) { $a[$id] = $f; continue; }
        foreach ($f as $k => $v) {
            // stock levels are points in time, not sums
            if ($k === 'opening_units' || $k === 'opening_value') continue;
            if ($k === 'closing_units' || $k === 'closing_value') { $a[$id][$k] = $v; continue; }
            $a[$id][$k] = ($a[$id][$k] ?? 0) + $v;
        }
    }
    return $a;
}

function closed_months(PDO $pdo): array {
    $out = [];
    foreach ($pdo->query('SELECT * FROM period_closes')->fetchAll() as $r) {
        $out[$r['period']] = $r;
    }
    return $out;
}

/* A closed month is final: its stored snapshot is what reports read. */
function month_figures(PDO $pdo, string $ym, array $closed): array {
    if (isset($closed[$ym])) {
        return ['per_sku' => json_decode($closed[$ym]['per_sku_json'], true) ?: [],
                'totals'  => json_decode($closed[$ym]['totals_json'], true) ?: blank_figures(),
                'closed'  => true];
    }
    $b = period_bounds($ym);
    $w = compute_window($pdo, $b['from'], $b['to']);
    $w['closed'] = false;
    return $w;
}

function close_month(PDO $pdo, string $ym, string $by): void {
    $b = period_bounds($ym);
    $w = compute_window($pdo, $b['from'], $b['to']);
    $st = $pdo->prepare(
        'INSERT OR IGNORE INTO period_closes (period, closed_at, closed_by, totals_json, per_sku_json)
         VALUES (?, ?, ?, ?, ?)');
    $st->execute([$ym, now(), $by,
                  json_encode($w['totals'], JSON_UNESCAPED_UNICODE),
                  json_encode($w['per_sku'], JSON_UNESCAPED_UNICODE)]);
}

/* Called on every authenticated request: once the calendar rolls over, every
 * earlier month that is still open gets sealed. */
function auto_close(PDO $pdo, array $config): array {
    $first = $pdo->query('SELECT MIN(created_at) FROM movements')->fetchColumn();
    if (!$first) return [];
    $ym      = substr((string)$first, 0, 7);
    $current = this_month();
    $closed  = closed_months($pdo);
    $done    = [];
    for ($i = 0; $i < 240 && $ym < $current; $i++) {
        if (!isset($closed[$ym])) {
            close_month($pdo, $ym, (string)($config['default_user'] ?? 'auto'));
            $done[] = $ym;
        }
        $ym = month_add($ym, 1);
    }
    return $done;
}

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
    auto_close($pdo, $config);
    $skus = $pdo->query(
        'SELECT * FROM skus ORDER BY product, finish'
    )->fetchAll();

    $rate = itbis_rate($config);
    $units = $res = $value = 0;
    $costValue = $profit = 0;
    $needs = $missingCost = 0;
    foreach ($skus as &$s) {
        $s['id']            = (int)$s['id'];
        $s['list_price']    = (int)$s['list_price'];
        $s['unit_cost']     = (int)($s['unit_cost'] ?? 0);
        $s['reorder_point'] = (int)$s['reorder_point'];
        $s['on_hand']       = (int)$s['on_hand'];
        $s['reserved']      = (int)$s['reserved'];
        $s['available']     = $s['on_hand'] - $s['reserved'];
        $s['status']        = $s['on_hand'] === 0 ? 'out'
                            : ($s['available'] <= $s['reorder_point'] ? 'low' : 'ok');
        $units     += $s['on_hand'];
        $res       += $s['reserved'];
        $value     += $s['on_hand'] * $s['list_price'];
        $costValue += $s['on_hand'] * $s['unit_cost'];
        if ($s['unit_cost'] > 0) {
            // Only SKUs with a real cost contribute, otherwise a missing cost
            // would be read as pure profit and overstate the total.
            $profit += $s['on_hand'] * ($s['list_price'] - $s['unit_cost']);
        } else {
            $missingCost++;
        }
        if ($s['status'] !== 'ok') $needs++;
    }
    unset($s);

    out(['ok' => true, 'skus' => $skus, 'itbis_rate' => $rate, 'summary' => [
        'skus' => count($skus), 'on_hand' => $units, 'reserved' => $res,
        'value' => $value, 'cost_value' => $costValue, 'profit' => $profit,
        'needs_production' => $needs, 'missing_cost' => $missingCost,
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

    /* A closed month is history. Movements are always stamped with the
     * current time, so this bites when someone closes the month they are
     * still working in — which is exactly when it should. */
    $month = substr(now(), 0, 7);
    $seal  = $pdo->prepare('SELECT closed_at FROM period_closes WHERE period = ?');
    $seal->execute([$month]);
    if ($closedAt = $seal->fetchColumn()) {
        fail("The month $month was closed on $closedAt and no longer accepts movements.",
             409, 'period_closed', ['period' => $month, 'closed_at' => $closedAt]);
    }

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
                                    on_hand_after, unit_price, unit_cost, itbis_rate,
                                    client_ref, note, user_label, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $mv->execute([
            $skuId, $type, $qty,
            $newOnHand - $onHand,
            $newReserved - $reserved,
            $newOnHand,
            // prices as they stand right now, frozen onto the row
            (int)$sku['list_price'],
            (int)($sku['unit_cost'] ?? 0),
            itbis_rate($config),
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

case 'report': {
    require_auth();
    $pdo  = $pdoLazy();
    auto_close($pdo, $config);

    $key    = (string)($_GET['period'] ?? this_month());
    $b      = period_bounds($key);
    $closed = closed_months($pdo);
    $rate   = itbis_rate($config);
    $now    = this_month();

    if ($b['kind'] === 'all') {
        $w = compute_window($pdo, $b['from'], $b['to']);
        $perSku = $w['per_sku']; $totals = $w['totals'];
        $isClosed = false; $closedAt = null; $closedBy = null;
    } else {
        /* A quarter or a year is the sum of its months: sealed ones come from
         * their snapshot, the open one is computed live. Months in the future
         * contribute nothing. */
        $perSku = []; $monthly = [];
        foreach ($b['months'] as $ym) {
            if ($ym > $now) { $monthly[$ym] = blank_figures(); continue; }
            $m = month_figures($pdo, $ym, $closed);
            $monthly[$ym] = $m['totals'];
            $perSku = merge_per_sku($perSku, $m['per_sku']);
        }
        $totals = sum_figures($perSku);
        // opening comes from the first month, closing from the last
        $firstM = $b['months'][0];
        $lastM  = end($b['months']);
        $fb = period_bounds($firstM); $lb = period_bounds(min($lastM, $now) === $lastM ? $lastM : $now);
        $openStock  = stock_at($pdo, $fb['from']);
        $closeStock = stock_at($pdo, $lb['to']);
        $totals['opening_units'] = array_sum(array_column($openStock, 'units'));
        $totals['opening_value'] = array_sum(array_map(fn($x) => $x['units'] * $x['cost'], $openStock));
        $totals['closing_units'] = array_sum(array_column($closeStock, 'units'));
        $totals['closing_value'] = array_sum(array_map(fn($x) => $x['units'] * $x['cost'], $closeStock));
        foreach ($perSku as $id => &$f) {
            $f['opening_units'] = $openStock[$id]['units']  ?? 0;
            $f['opening_value'] = ($openStock[$id]['units'] ?? 0) * ($openStock[$id]['cost'] ?? 0);
            $f['closing_units'] = $closeStock[$id]['units'] ?? 0;
            $f['closing_value'] = ($closeStock[$id]['units'] ?? 0) * ($closeStock[$id]['cost'] ?? 0);
        }
        unset($f);

        $isClosed = $b['kind'] === 'month' && isset($closed[$key]);
        $closedAt = $isClosed ? $closed[$key]['closed_at'] : null;
        $closedBy = $isClosed ? $closed[$key]['closed_by'] : null;
    }

    /* YTD: twelve months of the selected year, each either sealed, live, or
     * not reached yet. The chart renders the last state as empty bars. */
    $year = $b['kind'] === 'all' ? (int)gmdate('Y') : (int)substr($b['key'], 0, 4);
    $ytd = []; $run = ['sales' => 0, 'profit' => 0];
    for ($i = 1; $i <= 12; $i++) {
        $ym = sprintf('%04d-%02d', $year, $i);
        $reached = $ym <= $now;
        $f = $reached ? month_figures($pdo, $ym, $closed)['totals'] : blank_figures();
        if ($reached) { $run['sales'] += $f['sales']; $run['profit'] += $f['profit']; }
        $ytd[] = ['month' => $ym, 'reached' => $reached, 'closed' => isset($closed[$ym]),
                  'sales' => $f['sales'], 'profit' => $f['profit'],
                  'run_sales' => $run['sales'], 'run_profit' => $run['profit']];
    }

    out(['ok' => true, 'itbis_rate' => $rate,
         'period' => ['key' => $b['key'], 'kind' => $b['kind'],
                      'from' => $b['from'], 'to' => $b['to'],
                      'closed' => $isClosed, 'closed_at' => $closedAt, 'closed_by' => $closedBy],
         'totals' => $totals, 'per_sku' => $perSku, 'ytd' => $ytd,
         'ytd_sales' => $run['sales'], 'ytd_profit' => $run['profit']]);
}

case 'close_month': {
    require_post();
    $pdo = $pdoLazy();
    $ym  = str_field(body(), 'period', 7);
    if (!preg_match('/^\d{4}-\d{2}$/', $ym)) fail('Expected a month like 2026-10.', 422, 'bad_period');
    if ($ym > this_month())                  fail('That month has not happened yet.', 422, 'future_period');

    $closed = closed_months($pdo);
    if (isset($closed[$ym])) fail("$ym is already closed.", 409, 'already_closed', ['period' => $ym]);

    close_month($pdo, $ym, str_field(body(), 'user_label', 40) ?: (string)($config['default_user'] ?? ''));
    $c = closed_months($pdo)[$ym] ?? null;
    out(['ok' => true, 'period' => $ym, 'closed_at' => $c['closed_at'] ?? null]);
}

case 'closes': {
    require_auth();
    $pdo = $pdoLazy();
    auto_close($pdo, $config);
    $rows = [];
    foreach (closed_months($pdo) as $k => $r) {
        $rows[] = ['period' => $k, 'closed_at' => $r['closed_at'], 'closed_by' => $r['closed_by'],
                   'totals' => json_decode($r['totals_json'], true)];
    }
    out(['ok' => true, 'closes' => $rows, 'this_month' => this_month()]);
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
                               unit_cost, reorder_point, on_hand, reserved,
                               created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        $st->execute([
            $code, $product, $finish, $hex,
            str_field($in, 'location', 80),
            max(0, int_field($in, 'list_price')),
            max(0, int_field($in, 'unit_cost')),
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
                             list_price = ?, unit_cost = ?, reorder_point = ?,
                             updated_at = ?
             WHERE id = ?');
        $up->execute([
            $code, $product, $finish, $hex,
            str_field($in, 'location', 80),
            max(0, int_field($in, 'list_price')),
            max(0, int_field($in, 'unit_cost')),
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
