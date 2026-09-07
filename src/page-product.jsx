/* ------------------------------------------------------------------ *
 * Product detail page — with configurator (i18n)
 * ------------------------------------------------------------------ */

function PageProduct({ slug, navigate, onAddToQuote }) {
  const { t } = useLang();
  const { format } = useCurrency();
  const { isTrade, applyDiscount, discount } = useTrade();
  const products = getProducts(t);
  const product = products.find((p) => p.id === slug) || products[0];
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize]   = useState(product.sizes[1]);
  const [qty, setQty]     = useState(1);
  const [toast, setToast] = useState(false);
  const [shot, setShot]   = useState(0);

  // reset on product change
  useEffect(() => {
    setColor(product.colors[0]);
    setSize(product.sizes[1]);
    setQty(1);
    setShot(0);
  }, [product.id]);

  // keep selected color/size in sync with current language (preserve the selected id)
  useEffect(() => {
    setColor((c) => product.colors.find((x) => x.id === c.id) || product.colors[0]);
    setSize((s) => product.sizes.find((x) => x.id === s.id) || product.sizes[1]);
  }, [product]);

  const sizeMult = { s: 1, m: 1.25, l: 1.55 };
  const retailTotal = Math.round(product.basePrice * sizeMult[size.id] * qty);
  const total = applyDiscount(retailTotal);

  const gallery = product.gallery && product.gallery.length
    ? product.gallery
    : [{ src: product.photo, label: product.id, crop: product.name }];
  const current = gallery[Math.min(shot, gallery.length - 1)];

  return (
    <div className="page">
      <section style={{ paddingTop: 140, paddingBottom: 32 }}>
        <div className="container">
          <Reveal>
            <div className="t-eyebrow" style={{ display: "flex", gap: 14 }}>
              <a href="#/collection" onClick={(e) => { e.preventDefault(); navigate("/collection"); }} className="link-u">{t("prod.crumb")}</a>
              <span>/</span>
              <span className="t-eyebrow--ink">{product.name}</span>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section--sm">
        <div className="container">
          <div className="cfg">
            <Reveal variant="scale" className="cfg__gallery">
              <div className="cfg__main">
                {gallery.map((g, i) => (
                  <img
                    key={g.src}
                    src={g.src}
                    alt={g.crop}
                    className={`cfg__main-img ${i === shot ? "is-on" : ""}`}
                    loading={i === 0 ? "eager" : "lazy"}
                  />
                ))}
                <div className="cfg__main-meta">
                  <span className="t-mono">{current.label}</span>
                  <span>{current.crop}</span>
                </div>
                {gallery.length > 1 && (
                  <React.Fragment>
                    <button
                      className="cfg__main-nav cfg__main-nav--prev"
                      onClick={() => setShot((shot - 1 + gallery.length) % gallery.length)}
                      aria-label={t("common.previous")}
                    >←</button>
                    <button
                      className="cfg__main-nav cfg__main-nav--next"
                      onClick={() => setShot((shot + 1) % gallery.length)}
                      aria-label={t("common.next")}
                    >→</button>
                  </React.Fragment>
                )}
              </div>
              {gallery.length > 1 && (
                <div className="cfg__thumbs">
                  {gallery.map((g, i) => (
                    <button
                      key={g.src}
                      className={`cfg__thumb ${i === shot ? "is-on" : ""}`}
                      onClick={() => setShot(i)}
                      aria-label={g.crop}
                    >
                      <img src={g.src} alt="" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </Reveal>

            <div className="cfg__panel">
              <div>
                <Reveal>
                  <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 10 }}>{product.tagline}</div>
                </Reveal>
                <Reveal>
                  <h1 className="t-h1" style={{ margin: 0 }}>{product.name}</h1>
                </Reveal>
                <Reveal>
                  <p className="t-lead" style={{ marginTop: 18 }}>{product.desc}</p>
                </Reveal>
              </div>

              <div className="cfg__group">
                <h4>
                  <span>{t("prod.finish")}</span>
                  <span>{color.name}</span>
                </h4>
                <div className="cfg__swatches">
                  {product.colors.map((c) => (
                    <button
                      key={c.id}
                      className={`cfg__swatch ${color.id === c.id ? "is-on" : ""}`}
                      style={{ background: c.hex }}
                      onClick={() => setColor(c)}
                      aria-label={c.name}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <div className="cfg__group">
                <h4>
                  <span>{t("prod.size")}</span>
                  <span>{size.dim}</span>
                </h4>
                <div className="cfg__sizes">
                  {product.sizes.map((s) => (
                    <button
                      key={s.id}
                      className={`cfg__size ${size.id === s.id ? "is-on" : ""}`}
                      onClick={() => setSize(s)}
                    >
                      <span className="size-name">{s.name}</span>
                      <span className="size-dim">{s.dim}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="cfg__group">
                <h4>
                  <span>{t("prod.qty")}</span>
                  <span>{qty} {qty !== 1 ? t("common.units") : t("common.unit")}</span>
                </h4>
                <div className="cfg__qty">
                  <button onClick={() => setQty(Math.max(1, qty - 1))}>−</button>
                  <input type="text" readOnly value={qty} />
                  <button onClick={() => setQty(qty + 1)}>+</button>
                </div>
              </div>

              <div className="cfg__total">
                <span className="label">{t("prod.estimate")}</span>
                <span className="price-stack">
                  {isTrade && <span className="trade-tag">{t("trade.tag")} −{Math.round(discount * 100)}%</span>}
                  {isTrade && <span className="retail">{format(retailTotal)}</span>}
                  <span className="price">{format(total)}</span>
                </span>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    onAddToQuote && onAddToQuote({ product, color, size, qty, total });
                    setToast(true);
                    setTimeout(() => setToast(false), 2400);
                  }}
                >
                  {t("prod.add")} <span className="arr">→</span>
                </button>
                <button className="btn btn--ghost" onClick={() => {
                  try { localStorage.setItem("aqua_prefill_interest", "sample"); } catch (e) {}
                  navigate("/contact");
                }}>
                  {t("prod.sample")}
                </button>
              </div>

              <div className="t-mono t-small" style={{ color: "var(--muted)", lineHeight: 1.6 }}>
                {t("prod.lead")}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "clamp(40px, 6vw, 100px)" }} className="prod-spec">
            <Reveal>
              <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 18 }}>{t("prod.spec")}</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 0 }}>
                {product.features.map((f) => (
                  <li key={f} style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--rule)", fontSize: 14 }}>
                    <span style={{ color: "var(--muted)" }}>{t("prod.spec.feature")}</span>
                    <span style={{ fontFamily: "var(--display)" }}>{f}</span>
                  </li>
                ))}
                <li style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--rule)", fontSize: 14 }}>
                  <span style={{ color: "var(--muted)" }}>{t("prod.spec.material")}</span>
                  <span style={{ fontFamily: "var(--display)" }}>{t("prod.spec.materialVal")}</span>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--rule)", fontSize: 14 }}>
                  <span style={{ color: "var(--muted)" }}>{t("prod.spec.origin")}</span>
                  <span style={{ fontFamily: "var(--display)" }}>{t("prod.spec.originVal")}</span>
                </li>
                <li style={{ display: "flex", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px solid var(--rule)", fontSize: 14 }}>
                  <span style={{ color: "var(--muted)" }}>{t("prod.spec.warranty")}</span>
                  <span style={{ fontFamily: "var(--display)" }}>{t("prod.spec.warrantyVal")}</span>
                </li>
              </ul>
            </Reveal>
            <Reveal>
              <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 18 }}>{t("prod.ideal")}</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {product.ideal.map((i) => (
                  <span key={i} style={{ padding: "10px 16px", border: "1px solid var(--rule)", fontSize: 13, fontFamily: "var(--display)" }}>{i}</span>
                ))}
              </div>
              <div style={{ marginTop: 36 }} className="t-eyebrow t-eyebrow--ink">{t("prod.pairs")}</div>
              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {products.filter((p) => p.id !== product.id).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { navigate(`/product/${p.id}`); window.scrollTo({ top: 0 }); }}
                    style={{ padding: 16, border: "1px solid var(--rule)", textAlign: "left", display: "flex", flexDirection: "column", gap: 6, transition: "border 0.3s" }}
                    onMouseEnter={(e) => e.currentTarget.style.borderColor = "var(--ocean)"}
                    onMouseLeave={(e) => e.currentTarget.style.borderColor = "var(--rule)"}
                  >
                    <span className="t-mono" style={{ color: "var(--muted)", fontSize: 10 }}>{p.tagline}</span>
                    <span style={{ fontFamily: "var(--display)", fontSize: 22 }}>{p.name}</span>
                    <span className="t-mono t-small">{t("common.from")} {format(p.basePrice)} →</span>
                  </button>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Toast show={toast} message={`${product.name} (${color.name}, ${size.name}) ${t("prod.toast")}`} />
    </div>
  );
}

Object.assign(window, { PageProduct });
