/* ------------------------------------------------------------------ *
 * Story page (i18n)
 * ------------------------------------------------------------------ */

function PageStory({ navigate, anchor }) {
  const { t } = useLang();
  const values = [0,1,2,3,4,5].map(i => ({ title: t(`values.${i}.title`), desc: t(`values.${i}.desc`) }));
  const steps = [0,1,2,3,4].map(i => ({ name: t(`steps.${i}.name`), desc: t(`steps.${i}.desc`) }));
  const materials = [0,1,2,3,4,5,6,7].map(i => ({ title: t(`mat.${i}.title`), desc: t(`mat.${i}.desc`) }));

  React.useEffect(() => {
    if (!anchor) { window.scrollTo({ top: 0 }); return; }
    let raf = 0, tries = 0;
    const go = () => {
      const el = document.getElementById(anchor);
      if (el) { window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 88, behavior: "smooth" }); }
      else if (tries++ < 30) { raf = requestAnimationFrame(go); }
    };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [anchor]);

  return (
    <div className="page">
      <section className="section" style={{ paddingTop: 180 }}>
        <div className="container">
          <Reveal><div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 24 }}>{t("story.eyebrow")}</div></Reveal>
          <Reveal>
            <h1 className="t-display" style={{ margin: 0, maxWidth: "16ch" }}>
              {t("story.title.a")}<em>{t("story.title.em")}</em>{t("story.title.b")}
            </h1>
          </Reveal>
        </div>
      </section>

      <section className="section--sm">
        <div className="container">
          <div className="feature-row">
            <Reveal variant="scale" className="feature-row__media">
              <Media tone="ocean" label={t("story.media.label")} note={t("story.media.note")} center={t("story.media.center")} />
            </Reveal>
            <div>
              <Reveal><p className="t-lead" style={{ marginTop: 0 }}>{t("story.lead")}</p></Reveal>
              <Reveal><p className="t-body" style={{ marginTop: 24 }}>{t("story.body1")}</p></Reveal>
              <Reveal><p className="t-body" style={{ marginTop: 18 }}>{t("story.body2")}</p></Reveal>
            </div>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: "var(--sand)" }}>
        <div className="container">
          <SectionHead
            eyebrow={t("story.values.eyebrow")}
            title={<>{t("story.values.title.a")}<em className="serif t-italic">{t("story.values.title.em")}</em></>}
            count={t("story.values.count")}
          />
          <RevealStagger style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, background: "var(--rule)", borderTop: "1px solid var(--rule)", borderBottom: "1px solid var(--rule)" }} className="values-grid">
            {values.map((v, i) => (
              <div key={v.title} style={{ background: "var(--sand)", padding: 36, display: "flex", flexDirection: "column", gap: 14, minHeight: 220 }}>
                <span className="t-mono" style={{ color: "var(--teal-deep)" }}>0{i+1}</span>
                <h3 className="t-h3" style={{ margin: 0 }}>{v.title}</h3>
                <p className="t-body" style={{ margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </RevealStagger>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow={t("story.process.eyebrow")}
            title={<>{t("story.process.title.a")}<br/><em className="serif t-italic">{t("story.process.title.em")}</em></>}
            count={t("story.process.count")}
          />
          <RevealStagger className="steps">
            {steps.map((s, i) => (
              <div key={i} className="step">
                <span className="step__num">0{i+1}</span>
                <h4 className="step__name">{s.name}</h4>
                <p className="step__desc">{s.desc}</p>
              </div>
            ))}
          </RevealStagger>
        </div>
      </section>

      <section id="materials" className="section" style={{ background: "var(--ocean)", color: "var(--paper)" }}>
        <div className="container">
          <Reveal><div className="t-eyebrow" style={{ color: "rgba(255,255,255,0.55)", marginBottom: 24 }}>{t("story.mat.eyebrow")}</div></Reveal>
          <Reveal>
            <h2 className="t-h1" style={{ margin: 0, color: "var(--paper)", maxWidth: "20ch" }}>
              {t("story.mat.title.a")}<em className="serif t-italic" style={{ color: "var(--aqua-pale)" }}>{t("story.mat.title.em")}</em>
            </h2>
          </Reveal>

          <RevealStagger className="mat-strip">
            {[
              { src: "assets/photos/tray-aerial-sun.jpg",   label: "WEAVE · 01", note: "HDPE poly rattan · sun-cured" },
              { src: "assets/photos/box-towel-woman.jpg",   label: "FRAME · 02", note: "Marine aluminium core" },
              { src: "assets/photos/bar-archway.jpg",       label: "FIELD · 03", note: "Stone, salt and shade" },
            ].map((m, i) => (
              <figure key={i} className="mat-strip__tile">
                <img src={m.src} alt={m.note} loading="lazy" />
                <figcaption>
                  <span className="t-mono">{m.label}</span>
                  <span>{m.note}</span>
                </figcaption>
              </figure>
            ))}
          </RevealStagger>

          <RevealStagger style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "rgba(255,255,255,0.1)", marginTop: 48, border: "1px solid rgba(255,255,255,0.1)" }} className="mat-grid">
            {materials.map((m, i) => (
              <div key={i} style={{ background: "var(--ocean)", padding: 28, minHeight: 200, display: "flex", flexDirection: "column", gap: 14 }}>
                <span className="t-mono" style={{ color: "var(--aqua-pale)", opacity: 0.7 }}>0{i+1}</span>
                <h4 style={{ fontFamily: "var(--display)", fontSize: 22, margin: 0 }}>{m.title}</h4>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(255,255,255,0.7)", margin: 0 }}>{m.desc}</p>
              </div>
            ))}
          </RevealStagger>
        </div>
      </section>

      <section className="section" style={{ textAlign: "center" }}>
        <div className="container">
          <Reveal><div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 24 }}>{t("story.cta.eyebrow")}</div></Reveal>
          <Reveal>
            <h2 className="t-display" style={{ margin: "0 auto", maxWidth: "16ch" }}>
              {t("story.cta.title.a")}<em>{t("story.cta.title.em1")}</em><br/>{t("story.cta.title.b")}<em>{t("story.cta.title.em2")}</em>
            </h2>
          </Reveal>
          <Reveal><p className="t-lead" style={{ margin: "32px auto 40px" }}>{t("story.cta.body")}</p></Reveal>
          <Reveal>
            <button className="btn btn--primary" onClick={() => navigate("/contact")}>
              {t("story.cta.button")} <span className="arr">→</span>
            </button>
          </Reveal>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { PageStory });
