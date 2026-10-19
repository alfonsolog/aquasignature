# Aqua Signature — Brand Mini-site

A bilingual (EN/ES) brand mini-site for Aqua Signature, a Dominican
poly-rattan home accessories brand. Built as a single HTML page using
React 18 + inline JSX (no build step required).

---

## Quick start

Just open `index.html` in a browser, or serve the folder over any
static HTTP server:

```bash
npx serve .
# or
python3 -m http.server 8000
```

There is no build step. JSX is transpiled in-browser by Babel
standalone. For production you can pre-compile the JSX with esbuild or
Vite, but it is optional.

---

## Project structure

```
index.html              — entry, loads scripts + fonts
styles.css              — all styles (single file, CSS variables)
tweaks-panel.jsx        — in-page Tweaks UI (theme/accent/etc.)
assets/
  logo.svg              — brand droplet logo (replace with your master)
  logo.jpg              — fallback raster
src/
  i18n.jsx              — EN/ES dictionary + LangProvider/useLang
  currency.jsx          — USD/DOP/EUR provider + CurrencySwitch
  trade.jsx             — Trade gate (password-protected wholesale)
  components.jsx        — Nav, Footer, Logo, Reveal, Media, Marquee...
  page-home.jsx         — Home (hero, marquee, products, story...)
  page-collection.jsx   — Collection grid + per-product feature rows
  page-product.jsx      — Product detail + configurator
  page-story.jsx        — About / materials / steps
  page-contact.jsx      — Contact form, quote builder, coverage map
  app.jsx               — Routing, providers, mount
```

Pages are routed by URL hash (`#/`, `#/collection`, `#/product/aqua-tray`,
`#/story`, `#/contact`).

---

## Features

- **Bilingual:** EN/ES toggle pinned top-right, persists in
  `localStorage("aqua_lang")`.
- **Currency:** USD / DOP / EUR. Prices auto-convert with a fixed FX
  table in `src/currency.jsx` — wire to a live FX API if you need it.
- **Trade gate:** wholesale 30% pricing unlocked by a password modal.
  Demo password: `trade2026` (in `src/trade.jsx`). When unlocked the
  product page shows retail price struck through, trade tag and
  discounted total.
- **Quote builder:** add product configurations to a quote that pre-fills
  the contact form.
- **Tweaks panel:** in-page panel exposed by the host's toolbar. Lets
  you flip theme (paper/sand/ocean), accent color, stripe overlays
  on placeholder media, and marquee speed.
- **Mobile:** breakpoints at 760px and 520px in `styles.css`.
- **Reveal-on-scroll:** `<Reveal>` and `RevealStagger` use
  IntersectionObserver.
- **Hash routing:** all internal links use `#/path`.

---

## Replacing placeholders with real content

### Logo

Drop your real logo at `assets/logo.svg` (or `.png` — change the path in
`src/components.jsx` Droplet). The component falls back to a hand-drawn
SVG droplet if the file is missing.

### Photography

`<Media>` placeholders in every page (`src/components.jsx`). Each one
takes `tone="ocean|teal|pale|sand"` and a label. To swap to real photos:
replace the `<Media .../>` JSX with `<img src="..." />` or a styled
`<div style={{backgroundImage: "url(...)"}}>` — you might prefer to
extend the Media component to accept a `src` prop.

### Contact form endpoint

Open `src/page-contact.jsx` and set `FORMSPREE_ID` to your
[Formspree](https://formspree.io) form id. The form will then POST to
`https://formspree.io/f/<id>`. Without an id the form just simulates
success.

You can also swap to any other static-form endpoint (Netlify, Basin,
your own webhook) — the submit handler builds a `FormData` you can pipe
anywhere.

### Currency rates

`src/currency.jsx` has a static `CURRENCIES` table. Replace the rates
manually, or wire `useEffect` in `CurrencyProvider` to fetch from
exchangerate.host or similar.

### Trade password

Change `TRADE_PASSWORD` and `TRADE_DISCOUNT` in `src/trade.jsx`.
You probably want to move auth server-side eventually — this is a
front-end gate suitable for soft-gating pricing, not real security.

---

## Customising design tokens

All colors / typography / spacing live in `:root` at the top of
`styles.css` as CSS custom properties. Change them once and the whole
site reflows.

The Tweaks panel writes runtime overrides to the same variables via
`src/app.jsx`'s tweak `useEffect`s — you can extend that pattern to
expose more knobs.

---

## i18n: adding strings & languages

`src/i18n.jsx` exports a single `DICT` keyed by language code. Each key
is a flat string id used via `t("...")`. Add a new language by adding a
new top-level key alongside `en` and `es`, then add it as an option in
`<LangSwitch>` in `src/components.jsx`.

---

## Production checklist

- [ ] Replace `assets/logo.svg` with master art
- [ ] Drop real product photography in place of `<Media>` placeholders
- [ ] Set `FORMSPREE_ID` in `src/page-contact.jsx`
- [ ] Update `TRADE_PASSWORD` in `src/trade.jsx` (or move to backend)
- [ ] Update FX rates in `src/currency.jsx`
- [ ] Pre-compile JSX with esbuild/Vite for production (optional but
      drops Babel standalone — saves ~700KB)
- [ ] Replace `react.development.js` / `react-dom.development.js` with
      the `.production.min.js` builds
- [ ] Set canonical OG/Twitter meta tags in `index.html`
- [ ] Wire a real analytics endpoint
- [ ] Add a sitemap + robots.txt for the route hashes (or migrate to
      file-system routing if you want crawlable subpaths)

---

## Shipping a single-file build

Use whatever HTML inliner you like (e.g. the included
`AquaSignature-standalone.html` is a self-contained bundle of this
project — open it offline, no server needed).

---

## Inventory (internal)

A staff-only stock app at `/inventory/`. It is **not linked from the public
nav** and carries `noindex, nofollow`. Same fonts, tokens, logo and EN/ES
toggle as the public site; it defaults to Spanish.

It is **fully standalone**: it shares no CSS, JavaScript or dictionary with
the public site, and keeps its own language preference, so using it never
changes what a visitor sees. The folder can be lifted to any PHP + SQLite
host on its own.

```
inventory/
  index.html          — entry (loads nothing from outside this folder)
  app.jsx             — the whole UI
  inv-i18n.jsx        — its own EN/ES dictionary, Logo and LangSwitch
  inv.css             — its own styles (brand tokens copied, not shared)
  logo.svg            — its own copy of the droplet
  api.php             — JSON API: auth, stock, movements, SKU CRUD
  config.example.php  — copy to config.php (gitignored)
  .htaccess           — denies data/, *.sqlite and config.php over HTTP
  data/               — gitignored; SQLite lives here
```

Because the brand tokens in `inv.css` are a copy rather than a link, a change
to the site palette will not reach the app — update both if the brand ever
shifts. That is the deliberate price of keeping the two independent.

### Setup

1. Create the config from the template and put your own password hash in it:

   ```bash
   cp inventory/config.example.php inventory/config.php
   php -r 'echo password_hash("choose-a-staff-password", PASSWORD_DEFAULT), "\n";'
   ```

   Paste the output into `password_hash` in `inventory/config.php`. The file is
   gitignored — the password never enters the repository.

2. Serve the project with PHP (the public site is static, but this app is not):

   ```bash
   php -S localhost:8000
   ```

3. Open `http://localhost:8000/inventory/`. The first request creates
   `inventory/data/inventory.sqlite`, **empty**. Nothing is pre-loaded from the
   website — add each SKU by hand with **Add SKU**, entering your own codes,
   products, finishes, locations and prices. Opening stock entered on the form
   is written to the ledger as a `count`, so every unit traces to a movement.

On the live server `config.php` and `data/` are gitignored, so a `git pull`
never overwrites them — but it also means **you must create `config.php` on the
server once, by hand**. Until you do, the app refuses every request with a
setup error rather than letting anyone in.

### Movement types

Stock only ever changes through a movement, each one a single DB transaction
that updates the SKU and appends to the ledger. `available = on_hand - reserved`,
and `on_hand` can never go below zero (enforced in code *and* as SQLite CHECK
constraints).

| Type | Effect |
|------|--------|
| `produced`  | `on_hand += qty` — units arriving from the workshop |
| `delivered` | `on_hand -= qty`, frees reserved units first — shipped to a client |
| `reserve`   | `reserved += qty` — rejected if it exceeds available |
| `release`   | `reserved -= qty` — rejected if it exceeds reserved |
| `count`     | sets `on_hand` to a physical count; clamps reserved down to it |
| `write_off` | `on_hand -= qty` — damaged, sample or lost |

Editing a SKU deliberately **cannot** change stock levels: record a `count`
instead, so the ledger stays the whole explanation of what is on the shelf.

### Tax (ITBIS) and production cost

`list_price` is the price **before** tax. Each SKU also carries a
`unit_cost` (what it costs you to make one), and the app derives everything
else from those two numbers in a single helper, so the panel, the ledger,
the summary and the CSV can never disagree:

```
itbis            = list_price × rate
price_with_itbis = list_price + itbis
profit per unit  = list_price − unit_cost
margin %         = profit / list_price
```

The rate lives in `inventory/config.php` as `itbis_rate` (default `0.18`)
and is sent to the browser by the API — it is never written into the JSX.
Change it in that one file. An install whose `config.php` predates this
setting keeps working and falls back to 18%.

A `unit_cost` of `0` means "not entered yet", not "free": profit and margin
show an em dash and a prompt to add a cost, rather than a fabricated 100%
margin, and the summary's **Potential profit** excludes those SKUs (it says
so under the figure).

### Changing the staff password

Generate a new hash and replace the `password_hash` value in
`inventory/config.php`:

```bash
php -r 'echo password_hash("the-new-password", PASSWORD_DEFAULT), "\n";'
```

It takes effect immediately. Anyone already signed in keeps their session until
they sign out — destroy `data/` sessions by restarting PHP if you need everyone
out at once. Login is throttled to 8 attempts per 10 minutes per IP.

### Backing up

The database is a single SQLite file, but it runs in **WAL mode**, so recent
writes may still be sitting in `inventory.sqlite-wal`. Copying only the
`.sqlite` file can therefore silently lose the most recent movements. Use
SQLite's own backup, which is consistent and safe to run while the app is in use:

```bash
sqlite3 inventory/data/inventory.sqlite ".backup '/path/to/aqua-inv-$(date +%F).sqlite'"
```

If `sqlite3` is unavailable, copy all three files together
(`inventory.sqlite`, `-wal`, `-shm`) while nobody is writing.

You can also pull a point-in-time snapshot straight from the UI with
**Export stock CSV** and **Export movements CSV** — worth doing before any
large stocktake.

### Security notes

- Single shared password, hashed with `password_hash()`; sessions are
  HttpOnly + SameSite=Strict, and Secure over HTTPS.
- Every write requires a CSRF token in `X-CSRF-Token`; reads require a session.
- All SQL goes through prepared statements.
- `data/` and `config.php` are blocked over HTTP by `inventory/.htaccess`.
  That protection is Apache/LiteSpeed-specific — if you ever move to nginx,
  port those rules or the database becomes downloadable.

---

## Browser support

Modern evergreen browsers. Uses `:has()`, IntersectionObserver,
container queries (none yet, but feel free), CSS variables.

---

## License / notes

The brand assets, copy and design system are property of Aqua
Signature. Code structure is yours to use as a starting point.
