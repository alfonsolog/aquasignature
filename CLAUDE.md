# CLAUDE.md — agent instructions for the Aqua Signature site

## Overview

Bilingual EN/ES brand mini-site for Aqua Signature (Dominican poly-rattan
home accessories). Single-page React app loaded via Babel standalone, no
build step.

## File layout

- `index.html` — entry, loads fonts and all scripts in order
- `styles.css` — all CSS (single file, design tokens at top in `:root`)
- `tweaks-panel.jsx` — host-toolbar Tweaks UI primitives
- `src/i18n.jsx` — EN/ES `DICT` + `LangProvider`/`useLang`/`<LangSwitch>`
- `src/currency.jsx` — USD/DOP/EUR provider + `<CurrencySwitch>`
- `src/trade.jsx` — wholesale gate (`TRADE_PASSWORD = "trade2026"`)
- `src/components.jsx` — `Nav`, `Footer`, `Logo`, `Reveal`, `Media`,
  `Marquee`, `Toast`, `SectionHead`
- `src/page-*.jsx` — five pages
- `src/app.jsx` — routing (hash-based), providers, root mount

Scripts share scope via `Object.assign(window, ...)` at the bottom of
each file. **Do not** use ES module syntax — Babel standalone doesn't
import/export. To add a new component, define it in a `<script
type="text/babel">` file and assign to `window`.

## Conventions

- Strings go through `t("flat.key")` — both EN and ES must be added in
  `src/i18n.jsx`
- Prices use `format(usdAmount)` from `useCurrency()` — never hard-code
  `$` or `.toLocaleString`
- Trade-aware totals: `applyDiscount(retail)` from `useTrade()` first,
  then `format(...)`
- All routes are hash-based (`#/path`); use the `navigate(path)` helper
  passed down from `App`
- `<Reveal>` wraps anything that should fade in on scroll. `variant="scale"`
  for image-shaped reveals.
- Mobile breakpoints: 760px (tablet→phone) and 520px (small phone)
- Two CSS files only — `styles.css` and the bundled component CSS
  inside `tweaks-panel.jsx`. Keep new styles in `styles.css` near
  related rules.

## Adding a new page

1. Create `src/page-foo.jsx` with `function PageFoo({ navigate }) { ... }`
2. `Object.assign(window, { PageFoo });` at the bottom
3. Add the script tag in `index.html` between the existing pages
4. Wire it into the route parser in `src/app.jsx`
5. Add nav link if needed in `Nav` (`src/components.jsx`)

## Adding a tweak

1. Add a default in `TWEAK_DEFAULTS` in `src/app.jsx` (inside the
   `EDITMODE-BEGIN/END` markers — the host parses this JSON to persist)
2. Apply it in a `useEffect` in `App`
3. Render a control in the `<TweaksPanel>` block — `TweakRadio`,
   `TweakSlider`, `TweakToggle`, etc.
4. Localise the labels via `t()`

## Cache busting

Both `styles.css` and `assets/logo.svg` are loaded with `?v=N` query
strings. Bump the version when you change them or browser caching will
bite.

## Don't

- Don't introduce a build step without consulting the user
- Don't add new top-level CSS files; extend `styles.css`
- Don't use `scrollIntoView` (it interferes with the host's scroll)
- Don't put hard-coded English strings in components
