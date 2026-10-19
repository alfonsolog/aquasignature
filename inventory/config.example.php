<?php
/* Copy to config.php (which is gitignored) and set your own hash.
 *
 * Generate one with:
 *   php -r 'echo password_hash("your-staff-password", PASSWORD_DEFAULT), "\n";'
 *
 * Never commit config.php. */
return [
    // Output of password_hash() — NOT the password itself.
    'password_hash' => '$2y$12$REPLACE_THIS_WITH_YOUR_OWN_HASH_FROM_THE_COMMAND_ABOVE',

    // Shown against every movement if the browser has no staff initials set.
    'default_user'  => 'taller',

    // Where the SQLite file lives. Keep it under data/, which is denied
    // over HTTP by data/.htaccess.
    'db_path'       => __DIR__ . '/data/inventory.sqlite',
];
