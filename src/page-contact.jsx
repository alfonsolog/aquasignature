/* ------------------------------------------------------------------ *
 * Contact page (i18n)
 * ------------------------------------------------------------------ */

function PageContact({ quoteItems, removeQuoteItem }) {
  const { t } = useLang();
  const { format } = useCurrency();
  const roles = [0,1,2,3,4,5].map(i => t(`contact.role.${i}`));
  const interestKeys = ["tray","box","bar","custom","sample","showroom"];
  const interests = interestKeys.map(k => t(`contact.interest.${k}`));
  const timelines = [0,1,2,3].map(i => t(`contact.timeline.${i}`));

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    role: roles[0],
    location: "",
    interests: [interests[0]],
    message: "",
    timeline: timelines[1],
    website: "",           // honeypot — must stay empty
  });
  const [errors, setErrors]       = useState({});
  const [sent, setSent]           = useState(false);
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState("");

  // Honor sample-pack prefill from product page
  React.useEffect(() => {
    try {
      if (localStorage.getItem("aqua_prefill_interest") === "sample") {
        const sampleLabel = t("contact.interest.sample");
        setForm((f) => ({
          ...f,
          interests: f.interests.includes(sampleLabel) ? f.interests : [...f.interests.filter(x => x !== interests[0]), sampleLabel],
        }));
        localStorage.removeItem("aqua_prefill_interest");
      }
    } catch (e) {}
  }, []);

  const update = (k) => (e) => {
    const v = e && e.target ? e.target.value : e;
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((er) => ({ ...er, [k]: undefined }));
  };

  const toggleInterest = (i) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(i)
        ? f.interests.filter((x) => x !== i)
        : [...f.interests, i],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    const er = {};
    if (!form.name.trim()) er.name = t("common.required");
    if (!form.email.trim()) er.email = t("common.required");
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) er.email = t("contact.email.invalid");
    if (!form.message.trim()) er.message = t("contact.field.message.err");
    setErrors(er);
    if (Object.keys(er).length > 0) return;

    setSendError("");
    setSending(true);
    try {
      const payload = { ...form, interests: form.interests.join(", ") };
      if (quoteItems && quoteItems.length) {
        payload.quote = quoteItems
          .map((q) => `${q.product.name} \u00b7 ${q.color.name} \u00b7 ${q.size.name} \u00b7 \u00d7${q.qty}`)
          .join("\n");
      }
      const res = await fetch("/contact.php", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(payload),
      });
      const out = await res.json().catch(() => ({}));
      // Only claim success once the server actually accepted the mail.
      if (!res.ok || !out.ok) throw new Error(out.error || t("contact.send.err"));
      setSent(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setSendError(t("contact.send.err"));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    const firstName = form.name.split(" ")[0];
    return (
      <div className="page">
        <section className="section" style={{ paddingTop: 220, minHeight: "70vh" }}>
          <div className="container" style={{ textAlign: "center" }}>
            <Reveal>
              <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 24 }}>{t("contact.received")} #{Math.floor(Math.random() * 90000 + 10000)}</div>
            </Reveal>
            <Reveal>
              <h1 className="t-display" style={{ margin: "0 auto", maxWidth: "16ch" }}>
                {t("contact.thanks.a")}<em>{firstName}.</em>
              </h1>
            </Reveal>
            <Reveal>
              <p className="t-lead" style={{ margin: "32px auto 0" }}>
                {t("contact.thanks.body.a")}
                <span style={{ fontFamily: "var(--display)", fontStyle: "italic" }}>{form.email}</span>
                {t("contact.thanks.body.b")}
              </p>
            </Reveal>
          </div>
        </section>
      </div>
    );
  }

  const showroomLines = t("contact.showrooms.addr").split("\n");

  return (
    <div className="page">
      <section className="section" style={{ paddingTop: 180 }}>
        <div className="container">
          <Reveal><div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 24 }}>{t("contact.eyebrow")}</div></Reveal>
          <Reveal>
            <h1 className="t-display" style={{ margin: 0, maxWidth: "14ch" }}>
              {t("contact.title.a")}<br/><em>{t("contact.title.em")}</em>
            </h1>
          </Reveal>
          <Reveal>
            <p className="t-lead" style={{ marginTop: 32, maxWidth: "60ch" }}>{t("contact.body")}</p>
          </Reveal>
        </div>
      </section>

      <section className="section--sm">
        <div className="container">
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: "clamp(40px, 6vw, 80px)" }} className="contact-grid">
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 36 }}>
              {quoteItems && quoteItems.length > 0 && (
                <Reveal>
                  <div style={{ padding: 24, background: "var(--sand)", display: "flex", flexDirection: "column", gap: 14 }}>
                    <div className="t-eyebrow t-eyebrow--ink">{t("contact.quote.in")} {quoteItems.length}</div>
                    {quoteItems.map((q, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < quoteItems.length - 1 ? "1px solid var(--rule)" : "none", fontSize: 14 }}>
                        <div>
                          <div style={{ fontFamily: "var(--display)", fontSize: 18 }}>{q.product.name}</div>
                          <div className="t-mono t-small">{q.color.name} · {q.size.name} · ×{q.qty}</div>
                        </div>
                        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--display)", fontSize: 18 }}>{format(q.total)}</span>
                          <button type="button" onClick={() => removeQuoteItem(i)} style={{ color: "var(--muted)", fontSize: 12 }}>{t("contact.quote.remove")}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Reveal>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
                <Reveal className={`field ${errors.name ? "field--error" : ""}`}>
                  <label>{t("contact.field.name")}</label>
                  <input type="text" value={form.name} onChange={update("name")} placeholder={t("contact.field.name.ph")} />
                  {errors.name && <span className="field__err">{errors.name}</span>}
                </Reveal>
                <Reveal className="field">
                  <label>{t("contact.field.company")}</label>
                  <input type="text" value={form.company} onChange={update("company")} placeholder={t("contact.field.company.ph")} />
                </Reveal>
                <Reveal className={`field ${errors.email ? "field--error" : ""}`}>
                  <label>{t("contact.field.email")}</label>
                  <input type="email" value={form.email} onChange={update("email")} placeholder={t("contact.field.email.ph")} />
                  {errors.email && <span className="field__err">{errors.email}</span>}
                </Reveal>
                <Reveal className="field">
                  <label>{t("contact.field.phone")}</label>
                  <input type="tel" value={form.phone} onChange={update("phone")} placeholder={t("contact.field.phone.ph")} />
                </Reveal>
                <Reveal className="field">
                  <label>{t("contact.field.role")}</label>
                  <select value={form.role} onChange={update("role")}>
                    {roles.map((r) => <option key={r}>{r}</option>)}
                  </select>
                </Reveal>
                <Reveal className="field">
                  <label>{t("contact.field.location")}</label>
                  <input type="text" value={form.location} onChange={update("location")} placeholder={t("contact.field.location.ph")} />
                </Reveal>
              </div>

              <Reveal className="field">
                <label>{t("contact.field.interest")}</label>
                <div className="checks">
                  {interests.map((it) => (
                    <label key={it} className={`check ${form.interests.includes(it) ? "is-on" : ""}`}>
                      <span className="check__box" />
                      <input type="checkbox" checked={form.interests.includes(it)} onChange={() => toggleInterest(it)} />
                      <span>{it}</span>
                    </label>
                  ))}
                </div>
              </Reveal>

              <Reveal className="field">
                <label>{t("contact.field.timeline")}</label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  {timelines.map((tl) => (
                    <button
                      key={tl}
                      type="button"
                      onClick={() => update("timeline")(tl)}
                      style={{
                        padding: "10px 16px",
                        border: "1px solid var(--rule)",
                        background: form.timeline === tl ? "var(--ocean)" : "transparent",
                        color: form.timeline === tl ? "var(--paper)" : "var(--fg)",
                        fontSize: 13,
                        transition: "all 0.3s",
                      }}
                    >{tl}</button>
                  ))}
                </div>
              </Reveal>

              <Reveal className={`field ${errors.message ? "field--error" : ""}`}>
                <label>{t("contact.field.message")}</label>
                <textarea
                  value={form.message}
                  onChange={update("message")}
                  placeholder={t("contact.field.message.ph")}
                  rows={5}
                />
                {errors.message && <span className="field__err">{errors.message}</span>}
              </Reveal>

              {/* Honeypot: hidden from people, catnip for bots. */}
              <input
                type="text"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={form.website}
                onChange={update("website")}
                style={{ position: "absolute", left: "-9999px", width: 1, height: 1, opacity: 0 }}
              />

              <Reveal style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <button type="submit" className="btn btn--primary" disabled={sending}>
                  {sending ? t("contact.sending") : t("contact.send")} <span className="arr">→</span>
                </button>
                <span className="t-mono t-small" style={{ color: "var(--muted)" }}>
                  {t("contact.respond")}
                </span>
              </Reveal>
              {sendError && <span className="field__err">{sendError}</span>}
            </form>

            <aside style={{ display: "flex", flexDirection: "column", gap: 36 }}>
              <Reveal>
                <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 18 }}>{t("contact.direct")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div>
                    <div className="t-mono t-small">{t("contact.direct.email")}</div>
                    <a href="mailto:info@aquasignaturerd.com" className="link-u" style={{ fontFamily: "var(--display)", fontSize: 22 }}>info@aquasignaturerd.com</a>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <div className="t-mono t-small">{t("contact.direct.phone")}</div>
                    <a href="tel:+18095551234" className="link-u" style={{ fontFamily: "var(--display)", fontSize: 22 }}>+1 809 555 1234</a>
                  </div>
                </div>
              </Reveal>
              <Reveal>
                <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 18 }}>{t("contact.showrooms")}</div>
                <div style={{ fontFamily: "var(--display)", fontSize: 18, lineHeight: 1.5 }}>
                  {showroomLines.map((ln, i) => (
                    <React.Fragment key={i}>
                      {ln}{i < showroomLines.length - 1 && <br/>}
                    </React.Fragment>
                  ))}
                </div>
                <div className="t-mono t-small" style={{ marginTop: 8 }}>{t("contact.showrooms.note")}</div>
              </Reveal>
              <Reveal>
                <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 18 }}>{t("contact.hours")}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>{t("contact.hours.weekday")}</span><span style={{ fontFamily: "var(--display)" }}>09:00 — 18:00</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>{t("contact.hours.sat")}</span><span style={{ fontFamily: "var(--display)" }}>10:00 — 14:00</span></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--muted)" }}>{t("contact.hours.sun")}</span><span style={{ fontFamily: "var(--display)" }}>{t("contact.hours.closed")}</span></div>
                </div>
              </Reveal>
            </aside>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <SectionHead
            eyebrow={t("contact.coverage.eyebrow")}
            title={<>{t("contact.coverage.title.a")}<em className="serif t-italic">{t("contact.coverage.title.em")}</em></>}
            count={t("contact.coverage.count")}
          />
          <Reveal variant="scale">
            <CaribbeanMap />
          </Reveal>
        </div>
      </section>
    </div>
  );
}

Object.assign(window, { PageContact });
