/* ------------------------------------------------------------------ *
 * Shared components for Aqua Signature
 * ------------------------------------------------------------------ */

const { useState, useEffect, useRef, useMemo, useCallback } = React;

// ---------- Reveal-on-scroll ----------
function useReveal() {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

function Reveal({ as = "div", className = "", variant = "", children, ...rest }) {
  const ref = useReveal();
  const Tag = as;
  const cls = ["reveal", variant && `reveal--${variant}`, className].filter(Boolean).join(" ");
  return <Tag ref={ref} className={cls} {...rest}>{children}</Tag>;
}

function RevealStagger({ as = "div", className = "", children, ...rest }) {
  const ref = useReveal();
  const Tag = as;
  return <Tag ref={ref} className={`reveal-stagger ${className}`} {...rest}>{children}</Tag>;
}

// ---------- Logo ----------
// To swap in the real logo: drop a file at `assets/logo.svg` (or .png).
// The <Droplet> falls back to a CSS-drawn droplet if the file is missing.
function Droplet({ className = "" }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  if (!imgFailed) {
    return (
      <img
        src="assets/logo.svg?v=1"
        alt=""
        aria-hidden="true"
        className={`logo__drop logo__drop--img ${className}`}
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <svg className={`logo__drop ${className}`} viewBox="0 0 64 76" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <defs>
        <linearGradient id="dropGrad" x1="32" y1="2" x2="32" y2="74" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9FE3F0" />
          <stop offset="35%" stopColor="#5CC4DA" />
          <stop offset="70%" stopColor="#1B96A8" />
          <stop offset="100%" stopColor="#0A4D5A" />
        </linearGradient>
        <radialGradient id="dropShine" cx="42%" cy="32%" r="22%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.85)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <path
        d="M32 2 C32 2, 56 30, 56 50 C56 64, 45 74, 32 74 C19 74, 8 64, 8 50 C8 30, 32 2, 32 2 Z"
        fill="url(#dropGrad)"
      />
      <ellipse cx="26" cy="22" rx="6" ry="9" fill="url(#dropShine)" />
    </svg>
  );
}

function Logo({ size = "sm", variant = "", stack = false, className = "" }) {
  const { t } = useLang();
  const cls = [
    "logo",
    size === "lg" && "logo--lg",
    size === "xl" && "logo--xl",
    stack && "logo--stack",
    variant && `logo--${variant}`,
    className,
  ].filter(Boolean).join(" ");
  return (
    <span className={cls}>
      <Droplet />
      <span className="logo__wordmark">
        <span className="logo__aqua">AQUA</span>
        <span className="logo__sig">Signature</span>
        <span className="logo__country">{t("logo.country")}</span>
      </span>
    </span>
  );
}

// ---------- Nav ----------
function Nav({ route, navigate, dark }) {
  const [scrolled, setScrolled] = useState(false);
  const { t } = useLang();
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const items = [
    { id: "collection", label: t("nav.collection") },
    { id: "story", label: t("nav.story") },
    { id: "materials", label: t("nav.materials") },
    { id: "contact", label: t("nav.contact") },
  ];

  return (
    <nav className={`nav ${scrolled ? "is-scrolled" : ""} ${dark ? "is-dark" : ""}`}>
      <a href="#/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
        <Logo />
      </a>
      <div className="nav__links">
        {items.map((it) => (
          <a
            key={it.id}
            href={`#/${it.id}`}
            className={`nav__link ${route.startsWith("/" + it.id) ? "is-active" : ""}`}
            onClick={(e) => { e.preventDefault(); navigate("/" + it.id); }}
          >
            {it.label}
          </a>
        ))}
      </div>
      <a
        href="#/contact"
        className="nav__cta"
        onClick={(e) => { e.preventDefault(); navigate("/contact"); }}
      >
        <span>{t("nav.cta")}</span>
      </a>
    </nav>
  );
}

// ---------- LangSwitch — sits below the Request Quote CTA, centered ----------
function LangSwitch() {
  const { lang, setLang } = useLang();
  return (
    <div className="lang-switch" role="group" aria-label="Language">
      <button
        className={`lang-switch__btn ${lang === "en" ? "is-on" : ""}`}
        onClick={() => setLang("en")}
        aria-pressed={lang === "en"}
      >EN</button>
      <span className="lang-switch__sep" aria-hidden="true">·</span>
      <button
        className={`lang-switch__btn ${lang === "es" ? "is-on" : ""}`}
        onClick={() => setLang("es")}
        aria-pressed={lang === "es"}
      >ES</button>
    </div>
  );
}

// ---------- Footer ----------
function Footer({ navigate, onTradeLogin }) {
  const { t } = useLang();
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div>
          <Logo variant="inv" />
          <p style={{ marginTop: 24, opacity: 0.7, maxWidth: "32ch", fontSize: 14, lineHeight: 1.6 }}>
            {t("footer.tagline")}
          </p>
        </div>
        <div>
          <h4>{t("footer.collection")}</h4>
          <div className="footer__list">
            <a href="#/product/aqua-tray" onClick={(e) => { e.preventDefault(); navigate("/product/aqua-tray"); }}>{t("p.tray.name")}</a>
            <a href="#/product/aqua-box" onClick={(e) => { e.preventDefault(); navigate("/product/aqua-box"); }}>{t("p.box.name")}</a>
            <a href="#/product/aqua-bar" onClick={(e) => { e.preventDefault(); navigate("/product/aqua-bar"); }}>{t("p.bar.name")}</a>
          </div>
        </div>
        <div>
          <h4>{t("footer.company")}</h4>
          <div className="footer__list">
            <a href="#/story" onClick={(e) => { e.preventDefault(); navigate("/story"); }}>{t("footer.ourstory")}</a>
            <a href="#/materials" onClick={(e) => { e.preventDefault(); navigate("/materials"); }}>{t("footer.materials")}</a>
            <a href="#/contact" onClick={(e) => { e.preventDefault(); navigate("/contact"); }}>{t("footer.trade")}</a>
            <a href="#/contact" onClick={(e) => { e.preventDefault(); navigate("/contact"); }}>{t("footer.showroom")}</a>
            <a href="#trade" onClick={(e) => { e.preventDefault(); onTradeLogin && onTradeLogin(); }}>◆ {t("trade.toggle")}</a>
          </div>
        </div>
        <div>
          <h4>{t("footer.connect")}</h4>
          <div className="footer__list">
            <a href="https://www.instagram.com/aquasignaturerd/" target="_blank" rel="noopener noreferrer">Instagram</a>
            <a href="mailto:info@aquasignaturerd.com">info@aquasignaturerd.com</a>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        <span>{t("footer.copyright")}</span>
        <span>{t("footer.motto")}</span>
      </div>
    </footer>
  );
}

// ---------- Placeholder media ----------
function Media({ tone = "sand", label = "image", note = "", center = "", src, alt = "", className = "", style }) {
  const t = tone === "ocean" ? "media--ocean"
        : tone === "teal" ? "media--teal"
        : tone === "pale" ? "media--pale"
        : "media--sand";
  return (
    <div className={`media ${t} ${src ? "media--photo" : ""} ${className}`} style={style}>
      {src
        ? <img src={src} alt={alt} className="media__img" loading="lazy" />
        : <div className="media__stripes" />
      }
      {center && !src && <div className="media__center">{center}</div>}
      {(label || note) && (
        <div className="media__label">
          <span>{label}</span>
          <span>{note}</span>
        </div>
      )}
    </div>
  );
}

// ---------- Marquee ----------
function Marquee({ items }) {
  return (
    <div className="marquee">
      <div className="marquee__track">
        {[...items, ...items, ...items].map((it, i) => (
          <span key={i} className="marquee__item">{it}</span>
        ))}
      </div>
    </div>
  );
}

// ---------- Toast ----------
function Toast({ message, show }) {
  return <div className={`toast ${show ? "is-on" : ""}`}>{message}</div>;
}

// ---------- Section head ----------
function SectionHead({ eyebrow, title, kicker, count }) {
  return (
    <div className="section-head">
      <div className="section-head__intro">
        {eyebrow && <Reveal><div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 18 }}>{eyebrow}</div></Reveal>}
        <Reveal><h2 className="t-h1" style={{ margin: 0 }}>{title}</h2></Reveal>
        {kicker && <Reveal><p className="t-lead" style={{ marginTop: 24 }}>{kicker}</p></Reveal>}
      </div>
      {count && <Reveal className="section-head__count">{count}</Reveal>}
    </div>
  );
}

// Expose to other Babel scripts
Object.assign(window, {
  Reveal, RevealStagger, useReveal, Logo, Nav, LangSwitch, Footer, Media, Marquee, Toast, SectionHead
});
