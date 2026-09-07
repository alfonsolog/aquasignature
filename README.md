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

## Browser support

Modern evergreen browsers. Uses `:has()`, IntersectionObserver,
container queries (none yet, but feel free), CSS variables.

---

## License / notes

The brand assets, copy and design system are property of Aqua
Signature. Code structure is yours to use as a starting point.
