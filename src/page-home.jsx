/* ------------------------------------------------------------------ *
 * Home page (i18n)
 * ------------------------------------------------------------------ */

function PageHome({ navigate }) {
  const { t } = useLang();
  const heroTitle = t("home.hero.title"); // array of 4 strings
  const productsTitle = t("home.products.title"); // array of 2
  return (
    <div className="page">
      {/* HERO — Editorial Collage */}
      <section className="hero hero--collage">
        <div className="hero__bg" />
        <div className="hero__top">
          <span>{t("home.location")}</span>
          <span className="hero__top-mid">— Floating Editions · No. 01 —</span>
          <span>N 18°28′ · W 69°54′</span>
        </div>

        <div className="hero__inner">
          <div className="hero__title-block">
            <Reveal>
              <div className="hero__eyebrow">
                <span className="hero__rule"></span>
                <span>The 2026 Collection</span>
              </div>
            </Reveal>
            <Reveal>
              <h1 className="hero__title">
                {heroTitle[0]}<br/>
                {heroTitle[1]}{" "}
                <em>{heroTitle[2]}</em><br/>
                {heroTitle[3]}
              </h1>
            </Reveal>
            <Reveal>
              <p className="hero__sub">{t("home.hero.sub")}</p>
            </Reveal>
            <Reveal>
              <div className="hero__cta-row">
                <button className="btn btn--primary btn--inv" onClick={() => navigate("/collection")}>
                  {t("home.intro.cta1")} <span className="arr">→</span>
                </button>
                <span className="hero__pieces">
                  <span className="hero__pieces-num">03</span>
                  <span className="hero__pieces-lbl">Signature<br/>Pieces</span>
                </span>
              </div>
            </Reveal>
          </div>

          <div className="hero__collage">
            <Reveal variant="scale" className="hero__tile hero__tile--1">
              <img src="assets/photos/tray-hero-woman.jpg" alt="" loading="eager" />
              <span className="hero__tile-cap"><i>01</i> Aqua Tray · Casa de Campo</span>
            </Reveal>
            <Reveal variant="scale" className="hero__tile hero__tile--2">
              <img src="assets/photos/tray-turquoise-woman.jpg" alt="" loading="eager" />
              <span className="hero__tile-cap"><i>02</i> Turquoise · Cap Cana</span>
            </Reveal>
            <Reveal variant="scale" className="hero__tile hero__tile--3">
              <img src="assets/photos/box-woman-open.jpg" alt="" loading="eager" />
              <span className="hero__tile-cap"><i>03</i> Aqua Box</span>
            </Reveal>
            <Reveal variant="scale" className="hero__tile hero__tile--4">
              <img src="assets/photos/bar-detail.jpg" alt="" loading="eager" />
              <span className="hero__tile-cap"><i>04</i> Aqua Bar</span>
            </Reveal>
            <svg className="hero__leaf hero__leaf--a" viewBox="0 0 200 200" aria-hidden="true">
              <path d="M100 10 C 130 30, 160 70, 165 110 C 165 150, 130 180, 100 180 C 70 180, 35 150, 35 110 C 40 70, 70 30, 100 10 Z M 100 25 L 100 175" fill="none" stroke="rgba(208,238,242,0.32)" strokeWidth="1.5"/>
              <g stroke="rgba(208,238,242,0.32)" strokeWidth="1.2" fill="none">
                <path d="M100 40 L 60 60"/><path d="M100 60 L 55 80"/><path d="M100 80 L 53 100"/>
                <path d="M100 100 L 55 120"/><path d="M100 120 L 60 138"/><path d="M100 140 L 70 155"/>
                <path d="M100 40 L 140 60"/><path d="M100 60 L 145 80"/><path d="M100 80 L 147 100"/>
                <path d="M100 100 L 145 120"/><path d="M100 120 L 140 138"/><path d="M100 140 L 130 155"/>
              </g>
            </svg>
            <span className="hero__droplet hero__droplet--a"></span>
            <span className="hero__droplet hero__droplet--b"></span>
            <span className="hero__droplet hero__droplet--c"></span>
          </div>
        </div>

        <div className="hero__footnote">
          <span><i>—</i> Designed in the Dominican Republic.</span>
          <span><i>—</i> Crafted for the Caribbean climate.</span>
        </div>
        <div className="hero__scroll">{t("common.scroll")}</div>
      </section>

      {/* MARQUEE */}
      <Marquee items={[
        t("marquee.0"), t("marquee.1"), t("marquee.2"),
        t("marquee.3"), t("marquee.4"), t("marquee.5"),
      ]}/>

      {/* INTRO */}
      <section className="section">
        <div className="container">
          <div className="feature-row">
            <div>
              <Reveal><div className="divider-num">{t("home.intro.eyebrow")}</div></Reveal>
              <Reveal><h2 className="t-h1" style={{ margin: 0 }}>
                {t("home.intro.title.a")}<em className="serif t-italic">{t("home.intro.title.b")}</em>
              </h2></Reveal>
              <Reveal>
                <p className="t-lead" style={{ marginTop: 28 }}>{t("home.intro.body")}</p>
              </Reveal>
              <Reveal style={{ marginTop: 36, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button className="btn btn--primary" onClick={() => navigate("/collection")}>
                  {t("home.intro.cta1")} <span className="arr">→</span>
                </button>
                <button className="btn btn--ghost" onClick={() => navigate("/story")}>
                  {t("home.intro.cta2")}
                </button>
              </Reveal>
            </div>
            <Reveal variant="scale" className="feature-row__media intro-collage">
              <div className="intro-collage__tile intro-collage__tile--1">
                <img src="assets/photos/box-poolside.jpg" alt="Aqua Box poolside with stripe towel" loading="lazy" />
                <span className="intro-collage__cap"><i>i.</i> Aqua Box</span>
              </div>
              <div className="intro-collage__tile intro-collage__tile--2">
                <img src="assets/photos/tray-charcuterie.jpg" alt="Aqua Tray charcuterie on pool tile" loading="lazy" />
                <span className="intro-collage__cap"><i>ii.</i> Aqua Tray</span>
              </div>
              <div className="intro-collage__tile intro-collage__tile--3">
                <img src="assets/photos/bar-archway.jpg" alt="Aqua Bar under stone archway" loading="lazy" />
                <span className="intro-collage__cap"><i>iii.</i> Aqua Bar</span>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section className="section--sm" id="collection">
        <div className="container">
          <SectionHead
            eyebrow={t("home.products.eyebrow")}
            title={<>{productsTitle[0]}<br/>{productsTitle[1]}</>}
            count={t("home.products.count")}
          />
        </div>
        <div className="container">
          <RevealStagger className="products">
            {getProducts(t).map((p, i) => (
              <ProductCard key={p.id} product={p} num={`0${i+1}`} navigate={navigate} t={t} />
            ))}
          </RevealStagger>
        </div>
      </section>

      {/* PULL QUOTE */}
      <section className="section" style={{ background: "var(--sand)" }}>
        <div className="container" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px, 6vw, 100px)", alignItems: "center" }}>
          <Reveal>
            <div className="t-eyebrow" style={{ marginBottom: 24 }}>{t("home.quote.eyebrow")}</div>
            <blockquote className="pullquote" style={{ margin: 0 }}>
              {t("home.quote.body")}
            </blockquote>
            <div style={{ marginTop: 32, display: "flex", gap: 14, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--mist-pale)" }} />
              <div>
                <div style={{ fontFamily: "var(--display)", fontSize: 16 }}>{t("home.quote.name")}</div>
                <div className="t-mono" style={{ color: "var(--muted)" }}>{t("home.quote.role")}</div>
              </div>
            </div>
          </Reveal>
          <Reveal variant="scale">
            <Media src="assets/photos/tray-turquoise-empty.jpg" alt="Turquoise Aqua Tray" label={t("home.quote.media.label")} note={t("home.quote.media.note")} style={{ aspectRatio: "4/5" }} />
          </Reveal>
        </div>
      </section>

      {/* MATERIALS */}
      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow={t("home.materials.eyebrow")}
            title={<>{t("home.materials.title.a")}<em className="serif t-italic">{t("home.materials.title.em")}</em>{t("home.materials.title.b")}</>}
            kicker={t("home.materials.kicker")}
          />
          <div className="stats">
            {getStats(t).map((s, i) => (
              <Reveal key={i} className="stat">
                <div className="stat__num">{s.num}</div>
                <div className="stat__label">{s.label}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section className="section" style={{ background: "var(--ocean)", color: "var(--paper)" }}>
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: "clamp(40px, 6vw, 100px)", alignItems: "center" }}
               className="coverage-grid">
            <div>
              <Reveal><div className="t-eyebrow" style={{ color: "rgba(255,255,255,0.6)", marginBottom: 24 }}>{t("home.coverage.eyebrow")}</div></Reveal>
              <Reveal><h2 className="t-h1" style={{ margin: 0, color: "var(--paper)" }}>
                {t("home.coverage.title.a")}<em className="serif t-italic" style={{ color: "var(--aqua-pale)" }}>{t("home.coverage.title.em")}</em>{t("home.coverage.title.b")}
              </h2></Reveal>
              <Reveal>
                <p className="t-lead" style={{ marginTop: 24, color: "rgba(255,255,255,0.7)" }}>
                  {t("home.coverage.body")}
                </p>
              </Reveal>
              <Reveal style={{ marginTop: 28 }}>
                <button className="btn btn--ghost" style={{ borderColor: "rgba(255,255,255,0.3)", color: "var(--paper)" }} onClick={() => navigate("/contact")}>
                  {t("home.coverage.cta")} <span className="arr">→</span>
                </button>
              </Reveal>
            </div>
            <Reveal variant="scale">
              <CaribbeanMap mini />
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section">
        <div className="container" style={{ textAlign: "center" }}>
          <Reveal><div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 24 }}>{t("home.cta.eyebrow")}</div></Reveal>
          <Reveal>
            <h2 className="t-display" style={{ margin: "0 auto", maxWidth: "16ch" }}>
              {t("home.cta.title.a")}<em>{t("home.cta.title.em1")}</em><br/>{t("home.cta.title.b")}<em>{t("home.cta.title.em2")}</em>
            </h2>
          </Reveal>
          <Reveal>
            <p className="t-lead" style={{ margin: "32px auto 40px" }}>
              {t("home.cta.body")}
            </p>
          </Reveal>
          <Reveal>
            <button className="btn btn--primary" onClick={() => navigate("/contact")}>
              {t("home.cta.button")} <span className="arr">→</span>
            </button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

// Translated product builder
function getProducts(t) {
  return [
    {
      id: "aqua-tray",
      name: t("p.tray.name"),
      tagline: t("p.tray.tagline"),
      desc: t("p.tray.desc"),
      tone: "sand",
      photo: "assets/photos/tray-hero-woman.jpg",
      photoAlt: "assets/photos/tray-charcuterie.jpg",
      gallery: [
        { src: "assets/photos/tray-hero-woman.jpg",      label: "01 · Poolside",      crop: "Aqua Tray · Casa de Campo" },
        { src: "assets/photos/tray-charcuterie.jpg",     label: "02 · Charcuterie",   crop: "Floating service · golden hour" },
        { src: "assets/photos/tray-aerial-water.jpg",    label: "03 · Aerial",        crop: "Stillwater shot" },
        { src: "assets/photos/tray-turquoise-woman.jpg", label: "04 · Turquoise",     crop: "Cap Cana · woman & tray" },
        { src: "assets/photos/tray-turquoise-breakfast.jpg", label: "05 · Breakfast", crop: "Morning ritual" },
        { src: "assets/photos/tray-aerial-sun.jpg",      label: "06 · Weave",         crop: "HDPE poly rattan · close" },
      ],
      dim: "50 × 35 cm",
      colors: [
        { id: "natural", name: t("color.natural"), hex: "#D9C29B" },
        { id: "sand",    name: t("color.sand"),    hex: "#EFE3D0" },
        { id: "ocean",   name: t("color.ocean"),   hex: "#1A2E35" },
        { id: "teal",    name: t("color.teal"),    hex: "#3AA4AF" },
        { id: "ivory",   name: t("color.ivory"),   hex: "#F5EDE0" },
      ],
      basePrice: 13500,
      features: [t("feat.tray.0"), t("feat.tray.1"), t("feat.tray.2"), t("feat.tray.3")],
      ideal: [t("ideal.hotels"), t("ideal.resorts"), t("ideal.villas"), t("ideal.beachclubs")],
    },
    {
      id: "aqua-box",
      name: t("p.box.name"),
      tagline: t("p.box.tagline"),
      desc: t("p.box.desc"),
      tone: "ocean",
      photo: "assets/photos/box-towel-woman.jpg",
      photoAlt: "assets/photos/box-poolside.jpg",
      gallery: [
        { src: "assets/photos/box-towel-woman.jpg",  label: "01 · Morning swim", crop: "Aqua Box · the ritual" },
        { src: "assets/photos/box-poolside.jpg",     label: "02 · Terrace",       crop: "Pool deck · stripe towel" },
        { src: "assets/photos/box-woman-open.jpg",   label: "03 · Open",          crop: "Loading folded linens" },
        { src: "assets/photos/box-towel-load.jpg",   label: "04 · Load",          crop: "Capacity & weave" },
        { src: "assets/photos/box-towel-drape.jpg",  label: "05 · Drape",         crop: "Lid detail · linen drape" },
        { src: "assets/photos/box-product.jpg",      label: "06 · Studio",        crop: "Studio finish" },
      ],
      dim: "70 × 50 × 50 cm",
      colors: [
        { id: "natural", name: t("color.natural"),  hex: "#D9C29B" },
        { id: "ocean",   name: t("color.ocean"),    hex: "#1A2E35" },
        { id: "graphite",name: t("color.graphite"), hex: "#3D4A50" },
        { id: "ivory",   name: t("color.ivory"),    hex: "#F5EDE0" },
      ],
      basePrice: 17500,
      features: [t("feat.box.0"), t("feat.box.1"), t("feat.box.2"), t("feat.box.3")],
      ideal: [t("ideal.poolDecks"), t("ideal.spa"), t("ideal.terraceLounges"), t("ideal.beachfronts")],
    },
    {
      id: "aqua-bar",
      name: t("p.bar.name"),
      tagline: t("p.bar.tagline"),
      desc: t("p.bar.desc"),
      tone: "teal",
      photo: "assets/photos/bar-poolside-woman.jpg",
      photoAlt: "assets/photos/bar-full-trays.jpg",
      gallery: [
        { src: "assets/photos/bar-poolside-woman.jpg", label: "01 · Sunset",   crop: "Aqua Bar · Punta Cana" },
        { src: "assets/photos/bar-archway.jpg",        label: "02 · Archway",  crop: "Stone vestibule" },
        { src: "assets/photos/bar-detail.jpg",         label: "03 · Drinks",   crop: "Service detail" },
        { src: "assets/photos/bar-full-trays.jpg",     label: "04 · Full set", crop: "Bar + matching trays" },
        { src: "assets/photos/bar-product.jpg",        label: "05 · Studio",   crop: "Open bar configuration" },
      ],
      dim: "160 × 60 × 105 cm",
      colors: [
        { id: "natural", name: t("color.natural"), hex: "#D9C29B" },
        { id: "ocean",   name: t("color.ocean"),   hex: "#1A2E35" },
        { id: "teal",    name: t("color.teal"),    hex: "#3AA4AF" },
        { id: "ivory",   name: t("color.ivory"),   hex: "#F5EDE0" },
      ],
      basePrice: 27500,
      features: [t("feat.bar.0"), t("feat.bar.1"), t("feat.bar.2"), t("feat.bar.3")],
      ideal: [t("ideal.luxuryVillas"), t("ideal.resortPools"), t("ideal.rooftopBars"), t("ideal.eventSpaces")],
    },
  ];
}

function getStats(t) {
  return [
    { num: "10+",  label: t("stats.0.label") },
    { num: "100%", label: t("stats.1.label") },
    { num: "0kg",  label: t("stats.2.label") },
    { num: "48h",  label: t("stats.3.label") },
  ];
}

function ProductCard({ product, num, navigate, t }) {
  return (
    <article
      className="product-card"
      onClick={() => navigate(`/product/${product.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter") navigate(`/product/${product.id}`); }}
    >
      <div className="product-card__media">
        <Media src={product.photo} alt={product.name} tone={product.tone} label={`PRODUCT · ${num}`} note={product.id} />
      </div>
      <div className="product-card__head">
        <h3 className="product-card__name">{product.name}</h3>
        <span className="product-card__num">{num}</span>
      </div>
      <p className="product-card__desc">{product.desc}</p>
      <div className="product-card__meta">
        <span>RD$ {product.basePrice.toLocaleString("en-US")}</span>
        <span>{t("common.view")} <span style={{ display: "inline-block", marginLeft: 4 }}>→</span></span>
      </div>
    </article>
  );
}

// ---------- Caribbean Map ----------
function CaribbeanMap({ mini = false }) {
  const { t } = useLang();
  const [active, setActive] = useState(null);
  const locations = [
    { id: "sd",  name: t("map.sd"),  x: 38, y: 62 },
    { id: "pc",  name: t("map.pc"),  x: 56, y: 58 },
    { id: "puj", name: t("map.lr"),  x: 48, y: 64 },
    { id: "stm", name: t("map.sm"),  x: 50, y: 48 },
    { id: "pop", name: t("map.pp"),  x: 35, y: 40 },
    { id: "sju", name: t("map.sju"), x: 82, y: 56 },
    { id: "mtj", name: t("map.mtj"), x: 12, y: 76 },
    { id: "nas", name: t("map.nas"), x: 22, y: 18 },
    { id: "ctw", name: t("map.ctw"), x: 22, y: 50 },
  ];

  return (
    <div className="map">
      <svg viewBox="0 0 100 60" preserveAspectRatio="none">
        <defs>
          <pattern id="dots" width="2" height="2" patternUnits="userSpaceOnUse">
            <circle cx="0.4" cy="0.4" r="0.2" fill="rgba(208,238,242,0.18)" />
          </pattern>
        </defs>
        <rect width="100" height="60" fill="url(#dots)" />
        <g fill="rgba(208,238,242,0.18)" stroke="rgba(208,238,242,0.35)" strokeWidth="0.15">
          <path d="M 16 14 Q 22 12 28 16 Q 26 20 22 22 Q 18 20 16 14 Z"/>
          <path d="M 4 30 Q 16 26 30 32 Q 34 34 28 38 Q 14 38 4 34 Z"/>
          <path d="M 20 50 Q 32 46 46 50 Q 56 52 60 56 Q 56 62 46 64 Q 32 64 22 60 Q 18 56 20 50 Z"/>
          <path d="M 8 72 Q 16 70 22 74 Q 18 78 12 78 Q 8 76 8 72 Z"/>
          <path d="M 76 54 Q 84 52 90 56 Q 88 60 80 60 Q 76 58 76 54 Z"/>
        </g>
      </svg>
      {locations.map((loc) => {
        if (mini && !["sd","pc","sju","mtj","nas"].includes(loc.id)) return null;
        return (
          <React.Fragment key={loc.id}>
            <button
              className={`map__pin ${active === loc.id ? "is-active" : ""}`}
              style={{ left: `${loc.x}%`, top: `${loc.y}%` }}
              onMouseEnter={() => setActive(loc.id)}
              onMouseLeave={() => setActive(null)}
              aria-label={loc.name}
            />
            {active === loc.id && (
              <div
                className="map__tip is-on"
                style={{
                  left: `${loc.x}%`,
                  top: `${loc.y - 8}%`,
                  bottom: "auto",
                  transform: "translate(-50%, -100%)",
                  opacity: 1,
                }}
              >
                {loc.name}
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// Backward-compat exports — other pages import PRODUCTS at module-eval time,
// but we now want them to call getProducts(t). Keep PRODUCTS for any legacy
// reference but pre-fill with English so it doesn't crash if used.
const PRODUCTS_EN = (function () {
  const tEN = (k) => (DICT.en[k] !== undefined ? DICT.en[k] : k);
  return getProducts(tEN);
})();

Object.assign(window, { PageHome, PRODUCTS: PRODUCTS_EN, getProducts, getStats, ProductCard, CaribbeanMap });
