/* ------------------------------------------------------------------ *
 * Collection page — gallery + mosaic (i18n)
 * ------------------------------------------------------------------ */

function PageCollection({ navigate }) {
  const { t } = useLang();
  const products = getProducts(t);
  return (
    <div className="page">
      <section className="section" style={{ paddingTop: "180px" }}>
        <div className="container">
          <Reveal><div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 24 }}>{t("col.eyebrow")}</div></Reveal>
          <Reveal>
            <h1 className="t-display" style={{ margin: 0, maxWidth: "14ch" }}>
              {t("col.title.a")}<br/><em>{t("col.title.em")}</em>{t("col.title.b")}
            </h1>
          </Reveal>
          <Reveal>
            <p className="t-lead" style={{ marginTop: 32, maxWidth: "60ch" }}>
              {t("col.body")}
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ paddingBottom: "var(--gutter)" }}>
        <div className="container">
          <CollectionCollage />
        </div>
      </section>

      <section className="section">
        <div className="container">
          {products.map((p, i) => (
            <CollectionRow
              key={p.id}
              product={p}
              num={`0${i+1}`}
              reverse={i % 2 === 1}
              navigate={navigate}
              t={t}
              photoOverride={ROW_PHOTOS[p.id]}
            />
          ))}
        </div>
      </section>

      <section className="section" style={{ background: "var(--sand)" }}>
        <div className="container">
          <SectionHead
            eyebrow={t("col.editorial.eyebrow")}
            title={<>{t("col.editorial.title.a")}<br/><em className="serif t-italic">{t("col.editorial.title.em")}</em></>}
            count={t("col.editorial.count")}
          />
          <div className="prod-groups">
            {[
              {
                num: "01",
                name: t("p.tray.name"),
                tagline: t("p.tray.tagline"),
                photos: [
                  { src: "assets/photos/tray-hero-woman.jpg",         label: "POOLSIDE · 01", note: "Aqua Tray · Casa de Campo" },
                  { src: "assets/photos/tray-charcuterie.jpg",        label: "FLOATING · 02", note: "Charcuterie at golden hour" },
                  { src: "assets/photos/tray-turquoise-breakfast.jpg",label: "TURQUOISE · 03",note: "Morning ritual · Cap Cana" },
                ],
              },
              {
                num: "02",
                name: t("p.box.name"),
                tagline: t("p.box.tagline"),
                photos: [
                  { src: "assets/photos/box-towel-woman.jpg", label: "RITUAL · 01",  note: "Aqua Box · the morning swim" },
                  { src: "assets/photos/box-poolside.jpg",    label: "TERRACE · 02", note: "Pool deck · stripe towel" },
                  { src: "assets/photos/box-woman-open.jpg",  label: "OPEN · 03",    note: "Loading folded linens" },
                ],
              },
              {
                num: "03",
                name: t("p.bar.name"),
                tagline: t("p.bar.tagline"),
                photos: [
                  { src: "assets/photos/bar-poolside-woman.jpg", label: "SUNSET · 01",  note: "Aqua Bar · Punta Cana" },
                  { src: "assets/photos/bar-archway.jpg",        label: "ARCHWAY · 02", note: "Stone vestibule" },
                  { src: "assets/photos/bar-detail.jpg",         label: "DRINKS · 03",  note: "Service detail" },
                ],
              },
            ].map((g) => (
              <Reveal key={g.num} className="prod-group">
                <div className="prod-group__head">
                  <span className="prod-group__num t-mono">{g.num}</span>
                  <h3 className="prod-group__name">{g.name}</h3>
                  <span className="prod-group__tag t-mono">{g.tagline}</span>
                </div>
                <div className="prod-group__grid">
                  {g.photos.map((p, i) => (
                    <div key={i} className="prod-group__item">
                      <Media src={p.src} alt={p.note} label={p.label} note={p.note} />
                    </div>
                  ))}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

// Distinct hero photos for each product row — different from the collage
// at the top and the editorial groups at the bottom of this page.
const ROW_PHOTOS = {
  "aqua-tray": {
    src: "assets/photos/tray-row-fruits-wine.jpg",
    label: "STILL LIFE · TRAY",
    note: "Wine & tropical fruit · overhead",
  },
  "aqua-box": {
    src: "assets/photos/box-row-towel-open.jpg",
    label: "POOLSIDE · BOX",
    note: "Towels loaded · golden hour",
  },
  "aqua-bar": {
    src: "assets/photos/bar-row-poolside.jpg",
    label: "SERVICE · BAR",
    note: "Bar cart · pool deck",
  },
};

function CollectionCollage() {
  const tiles = [
    { c: "1", src: "assets/photos/tray-aerial-water.jpg", num: "i",   cap: "Aqua Tray · still water" },
    { c: "2", src: "assets/photos/box-towel-drape.jpg",   num: "ii",  cap: "Aqua Box · linen drape" },
    { c: "3", src: "assets/photos/bar-full-trays.jpg",    num: "iii", cap: "Aqua Bar · full set" },
    { c: "4", src: "assets/photos/tray-float-leaves.jpg", num: "iv",  cap: "Tray · floating leaves" },
  ];
  return (
    <div className="col-collage">
      {tiles.map((t) => (
        <Reveal key={t.c} variant="scale" className={`col-collage__tile col-collage__tile--${t.c}`}>
          <img src={t.src} alt={t.cap} loading="lazy" />
          <span className="col-collage__cap"><i>{t.num}</i> {t.cap}</span>
        </Reveal>
      ))}
      <span className="col-collage__rule col-collage__rule--h" />
      <span className="col-collage__rule col-collage__rule--v" />
      <span className="col-collage__droplet col-collage__droplet--a" />
      <span className="col-collage__droplet col-collage__droplet--b" />
      <div className="col-collage__meta">
        <span>— Collection 2026 · 04 frames</span>
        <span>Dominican Republic</span>
      </div>
    </div>
  );
}

function CollectionRow({ product, num, reverse, navigate, t, photoOverride }) {
  const { format } = useCurrency();
  const photo = photoOverride || { src: product.photo, label: `PRODUCT · ${num}`, note: product.id };
  return (
    <div style={{ marginBottom: "clamp(80px, 12vh, 140px)" }}>
      <div className={`feature-row ${reverse ? "feature-row--rev" : ""}`}>
        <Reveal variant="scale" className="feature-row__media" style={{ aspectRatio: "4/5" }}>
          <Media src={photo.src} alt={product.name} tone={product.tone} label={photo.label} note={photo.note} />
        </Reveal>
        <div>
          <Reveal><div className="divider-num">{num} — {product.tagline}</div></Reveal>
          <Reveal><h2 className="t-h1" style={{ margin: 0 }}>{product.name}</h2></Reveal>
          <Reveal>
            <p className="t-lead" style={{ marginTop: 24 }}>{product.desc}</p>
          </Reveal>
          <Reveal style={{ marginTop: 32 }}>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              {product.features.map((f) => (
                <li key={f} style={{ display: "flex", gap: 14, alignItems: "baseline", fontSize: 15 }}>
                  <span style={{ width: 16, height: 1, background: "var(--ocean)", display: "inline-block", flexShrink: 0, transform: "translateY(-4px)" }} />
                  {f}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal style={{ marginTop: 36, display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
            <button className="btn btn--primary" onClick={() => navigate(`/product/${product.id}`)}>
              {t("col.row.cta")} <span className="arr">→</span>
            </button>
            <span className="t-mono" style={{ color: "var(--muted)" }}>{format(product.basePrice)}</span>
          </Reveal>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PageCollection });
