<?php
/* ------------------------------------------------------------------ *
 * Aqua Signature — enquiry form endpoint
 *
 * Receives the Trade & Contact form and mails it to the address in
 * $TO below. No third-party service is involved.
 *
 * Deliverability note: From: MUST stay on our own domain or SPF fails
 * and the mail is filed as spam. The visitor's address goes in
 * Reply-To:, so hitting Reply in your mail client still reaches them.
 * ------------------------------------------------------------------ */

declare(strict_types=1);

const TO        = 'info@aquasignaturerd.com';
const FROM      = 'noreply@aquasignaturerd.com';
const FROM_NAME = 'Aqua Signature Website';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

function fail(int $code, string $msg): never {
    http_response_code($code);
    echo json_encode(['ok' => false, 'error' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    fail(405, 'Method not allowed.');
}

/* --- read body: accepts JSON or classic form encoding ------------- */
$raw   = file_get_contents('php://input') ?: '';
$data  = [];
if (str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json')) {
    $data = json_decode($raw, true) ?: [];
} else {
    $data = $_POST;
}
if (!is_array($data) || !$data) fail(400, 'Empty submission.');

/* --- honeypot: real people never fill a hidden field -------------- */
if (!empty($data['website'])) {
    echo json_encode(['ok' => true]);   // silently accept, do not send
    exit;
}

/* --- crude per-IP throttle: 5 sends per 10 minutes ---------------- */
$ip   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$jar  = sys_get_temp_dir() . '/aqua_rate_' . md5($ip);
$hits = array_values(array_filter(
    file_exists($jar) ? (json_decode((string)file_get_contents($jar), true) ?: []) : [],
    fn($t) => $t > time() - 600
));
if (count($hits) >= 5) fail(429, 'Too many submissions. Please try again shortly.');
$hits[] = time();
@file_put_contents($jar, json_encode($hits));

/* --- pull + validate ---------------------------------------------- */
$str = function (string $k, int $max = 500) use ($data): string {
    $v = $data[$k] ?? '';
    if (is_array($v)) $v = implode(', ', $v);
    return mb_substr(trim((string)$v), 0, $max);
};

$name    = $str('name', 120);
$email   = $str('email', 200);
$message = $str('message', 5000);

if ($name === '' || $message === '')                        fail(422, 'Name and message are required.');
if (!filter_var($email, FILTER_VALIDATE_EMAIL))             fail(422, 'A valid email address is required.');

/* Header injection guard: a newline in a header field lets an
   attacker append Bcc: and turn this into an open relay. */
$safeHeader = fn(string $v): string => str_replace(["\r", "\n", "\0"], ' ', $v);

/* --- compose ------------------------------------------------------ */
$rows = [
    'Name'      => $name,
    'Company'   => $str('company', 200),
    'Email'     => $email,
    'Phone'     => $str('phone', 60),
    'Role'      => $str('role', 120),
    'Location'  => $str('location', 200),
    'Interests' => $str('interests', 400),
    'Timeline'  => $str('timeline', 120),
];

$body = "New enquiry from aquasignaturerd.com\n";
$body .= str_repeat('-', 52) . "\n\n";
foreach ($rows as $label => $value) {
    if ($value !== '') $body .= sprintf("%-11s %s\n", $label . ':', $value);
}
$body .= "\nMessage:\n" . $message . "\n";

$quote = $str('quote', 3000);
if ($quote !== '') {
    $body .= "\nQuote basket:\n" . $quote . "\n";
}

$body .= "\n" . str_repeat('-', 52) . "\n";
$body .= 'Sent ' . date('Y-m-d H:i:s T') . ' from ' . $ip . "\n";
$body .= "Reply directly to this email to answer " . $name . ".\n";

$subject = sprintf('Enquiry — %s%s', $name, ($rows['Company'] !== '' ? ' (' . $rows['Company'] . ')' : ''));

$headers = [
    'From: '         . FROM_NAME . ' <' . FROM . '>',
    'Reply-To: '     . $safeHeader($name) . ' <' . $safeHeader($email) . '>',
    'Content-Type: text/plain; charset=UTF-8',
    'MIME-Version: 1.0',
    'X-Mailer: aqua-contact',
];

/* -f sets the envelope sender so SPF aligns with our domain. */
$sent = mail(
    TO,
    '=?UTF-8?B?' . base64_encode($safeHeader($subject)) . '?=',
    $body,
    implode("\r\n", $headers),
    '-f' . FROM
);

if (!$sent) fail(502, 'The mail server rejected the message. Please email us directly.');

echo json_encode(['ok' => true], JSON_UNESCAPED_UNICODE);
