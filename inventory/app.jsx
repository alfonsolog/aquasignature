/* ------------------------------------------------------------------ *
 * Aqua Signature — internal inventory app
 *
 * Standalone page at /inventory/. Reuses the site's i18n, Logo and
 * LangSwitch; everything else is local to this file. No ES modules —
 * globals are published via Object.assign at the bottom, as elsewhere.
 * ------------------------------------------------------------------ */

/* React hooks are destructured in inv-i18n.jsx, which loads first;
 * redeclaring them here would throw "already declared". */

const INV_API   = "api.php";
const MV_TYPES  = ["produced", "delivered", "reserve", "release", "count", "write_off"];

const rd = (n) => "RD$ " + Number(n || 0).toLocaleString("en-US");

/* The API answers with a slug plus the numbers involved; the wording is
 * chosen here so staff read it in their own language. Falls back to the
 * server's English text for anything not translated yet. */
function useErrText() {
  const { t } = useLang();
  return (ex) => {
    if (!ex) return "";
    if (ex.slug) {
      const key = `inv.e.${ex.slug}`;
      const tpl = t(key);
      if (tpl !== key) {
        return tpl.replace(/\{(\w+)\}/g, (m, k) =>
          (ex.meta && ex.meta[k] !== undefined) ? ex.meta[k] : m);
      }
    }
    return ex.message || t("inv.err.network");
  };
}

function invApi(action, opts) {
  const o = opts || {};
  const init = {
    method: o.method || "GET",
    headers: { "Accept": "application/json" },
    credentials: "same-origin",
  };
  if (o.body) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(o.body);
  }
  if (o.csrf) init.headers["X-CSRF-Token"] = o.csrf;
  // params go through URLSearchParams — folding them into `action` and
  // encoding the whole string turns "&" into "%26" and the server sees
  // one nonsense action name.
  const qs = new URLSearchParams({ action });
  Object.entries(o.params || {}).forEach(([k, v]) => qs.set(k, v));
  return fetch(`${INV_API}?${qs.toString()}`, init)
    .then(async (res) => {
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        const err = new Error(data.error || "request failed");
        err.status = res.status;
        err.slug = data.code || "";
        err.meta = data.meta || {};
        throw err;
      }
      return data;
    });
}

function downloadCsv(filename, rows) {
  const esc = (v) => {
    const s = String(v === null || v === undefined ? "" : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  // BOM so Excel on Windows reads the accents correctly
  const body = "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/* ---------------------------------------------------------------- login */

function InvLogin({ onIn }) {
  const { t } = useLang();
  const errText = useErrText();
  const [pw, setPw]       = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (!pw || busy) return;
    setBusy(true); setErr("");
    try {
      const r = await invApi("login", { method: "POST", body: { password: pw } });
      setPw("");
      onIn(r.csrf);
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="inv-login">
      <form className="inv-login__card" onSubmit={submit}>
        <Logo size="lg" stack />
        <div className="inv-login__head">
          <h1>{t("inv.login.title")}</h1>
          <p>{t("inv.login.body")}</p>
        </div>
        <label className="inv-field">
          <span>{t("inv.login.pw")}</span>
          <input
            type="password" value={pw} autoFocus autoComplete="current-password"
            onChange={(e) => { setPw(e.target.value); setErr(""); }}
          />
        </label>
        {err && <div className="inv-err">{err}</div>}
        <button className="btn btn--primary" type="submit" disabled={busy || !pw}>
          {busy ? t("inv.login.busy") : t("inv.login.btn")} <span className="arr">→</span>
        </button>
      </form>
    </div>
  );
}

/* -------------------------------------------------------------- summary */

function InvSummary({ summary }) {
  const { t } = useLang();
  const s = summary || {};
  const cells = [
    [t("inv.sum.skus"),     s.skus || 0],
    [t("inv.sum.onhand"),   s.on_hand || 0],
    [t("inv.sum.reserved"), s.reserved || 0],
    [t("inv.sum.value"),    rd(s.value)],
    [t("inv.sum.needs"),    s.needs_production || 0, (s.needs_production || 0) > 0 ? "warn" : ""],
  ];
  return (
    <div className="inv-sum">
      {cells.map(([label, value, tone]) => (
        <div className={`inv-sum__cell ${tone || ""}`} key={label}>
          <span className="inv-sum__n">{value}</span>
          <span className="inv-sum__l">{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- table */

function InvRow({ sku, onPick, active }) {
  const { t } = useLang();
  const finish = sku.finish;
  return (
    <button
      className={`inv-row ${active ? "is-on" : ""} is-${sku.status}`}
      onClick={() => onPick(sku)}
    >
      <span className="inv-row__item">
        <i className="inv-sw" style={{ background: sku.hex || "transparent" }} aria-hidden="true" />
        {finish}
      </span>
      <span className="inv-row__code t-mono" data-l={t("inv.col.code")}>{sku.code}</span>
      <span data-l={t("inv.col.location")}>{sku.location || "—"}</span>
      <span className="inv-row__n" data-l={t("inv.col.onhand")}>{sku.on_hand}</span>
      <span className="inv-row__n" data-l={t("inv.col.reserved")}>{sku.reserved}</span>
      <span className="inv-row__n inv-row__avail" data-l={t("inv.col.available")}>{sku.available}</span>
      <span className="inv-row__n" data-l={t("inv.col.reorder")}>{sku.reorder_point}</span>
      <span className="inv-row__n" data-l={t("inv.col.value")}>{rd(sku.on_hand * sku.list_price)}</span>
      <span className="inv-row__status" data-l={t("inv.col.status")}>
        <i className={`inv-pill inv-pill--${sku.status}`}>{t(`inv.status.${sku.status}`)}</i>
      </span>
    </button>
  );
}

function InvTable({ skus, onPick, activeId }) {
  const { t } = useLang();
  const groups = useMemo(() => {
    const m = new Map();
    skus.forEach((s) => {
      if (!m.has(s.product)) m.set(s.product, []);
      m.get(s.product).push(s);
    });
    return [...m.entries()];
  }, [skus]);

  if (!skus.length) return <p className="inv-empty">{t("inv.empty")}</p>;

  return (
    <div className="inv-table">
      {groups.map(([product, rows]) => (
        <section className="inv-group" key={product}>
          <h3 className="inv-group__head">
            <span>{product}</span>
            <span className="t-mono">{rows.reduce((a, r) => a + r.on_hand, 0)} {t("inv.col.onhand").toLowerCase()}</span>
          </h3>
          <div className="inv-head" aria-hidden="true">
            <span>{t("inv.col.item")}</span><span>{t("inv.col.code")}</span>
            <span>{t("inv.col.location")}</span><span className="inv-row__n">{t("inv.col.onhand")}</span>
            <span className="inv-row__n">{t("inv.col.reserved")}</span><span className="inv-row__n">{t("inv.col.available")}</span>
            <span className="inv-row__n">{t("inv.col.reorder")}</span><span className="inv-row__n">{t("inv.col.value")}</span>
            <span>{t("inv.col.status")}</span>
          </div>
          {rows.map((s) => (
            <InvRow key={s.id} sku={s} onPick={onPick} active={s.id === activeId} />
          ))}
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------ sku form */

function InvSkuForm({ sku, csrf, onDone, onCancel }) {
  const { t } = useLang();
  const errText = useErrText();
  const editing = !!sku;
  const [f, setF] = useState(() => ({
    code: sku ? sku.code : "",
    product: sku ? sku.product : "",
    finish: sku ? sku.finish : "",
    hex: sku ? sku.hex : "",
    location: sku ? sku.location : "",
    list_price: sku ? String(sku.list_price) : "",
    reorder_point: sku ? String(sku.reorder_point) : "4",
    on_hand: "0",
  }));
  const [busy, setBusy] = useState(false);
  const [err, setErr]   = useState("");
  const up = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setErr(""); };

  const save = async (e) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr("");
    const body = {
      ...f,
      list_price: Number(f.list_price) || 0,
      reorder_point: Number(f.reorder_point) || 0,
      on_hand: editing ? undefined : (Number(f.on_hand) || 0),
      user_label: localStorage.getItem("aqua_inv_user") || "",
    };
    if (editing) body.id = sku.id;
    try {
      await invApi(editing ? "sku_update" : "sku_create", { method: "POST", body, csrf });
      onDone();
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  };

  const field = (key, label, extra) => (
    <label className="inv-field">
      <span>{label}</span>
      <input value={f[key]} onChange={up(key)} {...(extra || {})} />
    </label>
  );

  return (
    <form className="inv-skuform" onSubmit={save}>
      <h3>{editing ? t("inv.sku.edit") : t("inv.sku.new")}</h3>
      <div className="inv-skuform__grid">
        {field("code", t("inv.sku.code"), { required: true, autoCapitalize: "characters" })}
        {field("product", t("inv.sku.product"), { required: true })}
        {field("finish", t("inv.sku.finish"), { required: true })}
        {field("hex", t("inv.sku.hex"), { placeholder: "#D9C29B" })}
        {field("location", t("inv.sku.location"))}
        {field("list_price", t("inv.sku.price"), { type: "number", min: "0", inputMode: "numeric" })}
        {field("reorder_point", t("inv.sku.reorder"), { type: "number", min: "0", inputMode: "numeric" })}
        {!editing && field("on_hand", t("inv.sku.onhand"), { type: "number", min: "0", inputMode: "numeric" })}
      </div>
      {editing && <p className="inv-hint">{t("inv.sku.editnote")}</p>}
      {err && <div className="inv-err">{err}</div>}
      <div className="inv-actions">
        <button className="btn btn--primary" type="submit" disabled={busy}>{t("inv.sku.save")}</button>
        <button className="btn btn--ghost" type="button" onClick={onCancel}>{t("inv.sku.cancel")}</button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------- side panel */

function InvPanel({ sku, csrf, onClose, onChanged, onToast }) {
  const { t } = useLang();
  const errText = useErrText();
  const [type, setType]   = useState("produced");
  const [qty, setQty]     = useState("");
  const [ref, setRef]     = useState("");
  const [note, setNote]   = useState("");
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");
  const [mode, setMode]   = useState("move");   // move | edit | confirmDelete
  const [hist, setHist]   = useState([]);

  useEffect(() => {
    setType("produced"); setQty(""); setRef(""); setNote("");
    setErr(""); setMode("move");
    let live = true;
    invApi("movements", { params: { sku_id: sku.id, limit: 8 } })
      .then((r) => { if (live) setHist(r.movements); })
      .catch(() => {});
    return () => { live = false; };
  }, [sku.id]);

  const record = async (e) => {
    e.preventDefault();
    const q = Number(qty);
    if (busy || qty === "" || !Number.isFinite(q) || q < 0) return;
    setBusy(true); setErr("");
    try {
      await invApi("movement", {
        method: "POST", csrf,
        body: {
          sku_id: sku.id, type, qty: Math.round(q),
          client_ref: ref, note,
          user_label: localStorage.getItem("aqua_inv_user") || "",
        },
      });
      setQty(""); setRef(""); setNote("");
      onToast(`${t(`inv.mv.${type}`)} · ${sku.code}`);
      onChanged();
    } catch (ex) {
      setErr(errText(ex));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true); setErr("");
    try {
      await invApi("sku_delete", { method: "POST", csrf, body: { id: sku.id } });
      onToast(sku.code);
      onChanged(); onClose();
    } catch (ex) {
      setErr(errText(ex)); setBusy(false);
    }
  };

  const finish = sku.finish;

  return (
    <aside className="inv-panel" role="dialog" aria-label={sku.code}>
      <header className="inv-panel__top">
        <div>
          <div className="t-mono inv-panel__code">{sku.code}</div>
          <h2>
            <i className="inv-sw" style={{ background: sku.hex || "transparent" }} aria-hidden="true" />
            {sku.product} · {finish}
          </h2>
        </div>
        <button className="inv-x" onClick={onClose} aria-label={t("inv.panel.close")}>×</button>
      </header>

      <div className="inv-figs">
        {[["inv.col.onhand", sku.on_hand], ["inv.col.reserved", sku.reserved], ["inv.col.available", sku.available]].map(([k, v]) => (
          <div key={k}><span className="inv-figs__n">{v}</span><span className="inv-figs__l">{t(k)}</span></div>
        ))}
      </div>

      {mode === "edit" ? (
        <InvSkuForm
          sku={sku} csrf={csrf}
          onDone={() => { setMode("move"); onChanged(); onToast(sku.code); }}
          onCancel={() => setMode("move")}
        />
      ) : (
        <>
          <form className="inv-move" onSubmit={record}>
            <h3>{t("inv.panel.movement")}</h3>
            <div className="inv-types">
              {MV_TYPES.map((ty) => (
                <button
                  key={ty} type="button"
                  className={`inv-type ${type === ty ? "is-on" : ""}`}
                  onClick={() => { setType(ty); setErr(""); }}
                >{t(`inv.mv.${ty}`)}</button>
              ))}
            </div>
            <p className="inv-hint">{t(`inv.mv.${type}.hint`)}</p>

            <label className="inv-field">
              <span>{t("inv.panel.qty")}</span>
              <input
                type="number" min="0" inputMode="numeric" value={qty} required
                onChange={(e) => { setQty(e.target.value); setErr(""); }}
              />
            </label>
            <label className="inv-field">
              <span>{t("inv.panel.ref")}</span>
              <input value={ref} onChange={(e) => setRef(e.target.value)} placeholder={t("inv.panel.ref.ph")} />
            </label>
            <label className="inv-field">
              <span>{t("inv.panel.note")}</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("inv.panel.note.ph")} />
            </label>

            {err && <div className="inv-err">{err}</div>}
            <button className="btn btn--primary inv-record" type="submit" disabled={busy || qty === ""}>
              {busy ? t("inv.panel.busy") : t("inv.panel.record")} <span className="arr">→</span>
            </button>
          </form>

          {mode === "confirmDelete" ? (
            <div className="inv-confirm">
              <p>{t("inv.panel.del.ask")}</p>
              <div className="inv-actions">
                <button className="btn btn--danger" onClick={remove} disabled={busy}>{t("inv.panel.del.yes")}</button>
                <button className="btn btn--ghost" onClick={() => setMode("move")}>{t("inv.panel.del.no")}</button>
              </div>
            </div>
          ) : (
            <div className="inv-actions inv-actions--sep">
              <button className="btn btn--ghost" onClick={() => setMode("edit")}>{t("inv.panel.edit")}</button>
              <button className="btn btn--ghost inv-del" onClick={() => setMode("confirmDelete")}>{t("inv.panel.delete")}</button>
            </div>
          )}

          {hist.length > 0 && (
            <div className="inv-hist">
              <h3>{t("inv.panel.history")}</h3>
              {hist.map((m) => (
                <div className="inv-hist__row" key={m.id}>
                  <span className={`inv-tag inv-tag--${m.type}`}>{t(`inv.mv.${m.type}`)}</span>
                  <span className="t-mono">{m.delta_on_hand > 0 ? "+" : ""}{m.delta_on_hand}</span>
                  <span className="inv-hist__meta">{m.client_ref || m.note || "—"}</span>
                  <span className="t-mono inv-hist__when">{m.created_at.slice(5, 16)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ log */

function InvLog({ skus, reloadKey }) {
  const { t } = useLang();
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let live = true;
    const params = filter ? { sku_id: filter, limit: 200 } : { limit: 200 };
    invApi("movements", { params }).then((r) => { if (live) setRows(r.movements); }).catch(() => {});
    return () => { live = false; };
  }, [filter, reloadKey]);

  return (
    <section className="inv-log">
      <div className="inv-log__top">
        <h2>{t("inv.log.title")}</h2>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="inv-select">
          <option value="">{t("inv.log.all")}</option>
          {skus.map((s) => <option key={s.id} value={s.id}>{s.code}</option>)}
        </select>
      </div>
      {rows.length === 0 ? <p className="inv-empty">{t("inv.log.empty")}</p> : (
        <div className="inv-logtable">
          {rows.map((m) => (
            <div className="inv-logrow" key={m.id}>
              <span className="t-mono inv-logrow__when">{m.created_at.slice(0, 16).replace("T", " ")}</span>
              <span className="t-mono">{m.code}</span>
              <span><i className={`inv-tag inv-tag--${m.type}`}>{t(`inv.mv.${m.type}`)}</i></span>
              <span className="inv-row__n">{m.qty}</span>
              <span className="inv-row__n inv-delta">{m.delta_on_hand > 0 ? "+" : ""}{m.delta_on_hand}</span>
              <span className="inv-row__n">{m.on_hand_after}</span>
              <span className="inv-logrow__meta">{m.client_ref || m.note || ""}</span>
              <span className="inv-logrow__by t-mono">{m.user_label}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ app */

function InventoryApp() {
  const { t } = useLang();
  const [csrf, setCsrf]       = useState(null);
  const [ready, setReady]     = useState(false);
  const [skus, setSkus]       = useState([]);
  const [summary, setSummary] = useState(null);
  const [tab, setTab]         = useState("");
  const [q, setQ]             = useState("");
  const [picked, setPicked]   = useState(null);
  const [adding, setAdding]   = useState(false);
  const [toast, setToast]     = useState("");
  const [bump, setBump]       = useState(0);
  const [user, setUser]       = useState(() => {
    try { return localStorage.getItem("aqua_inv_user") || ""; } catch (e) { return ""; }
  });

  const load = useCallback(async () => {
    try {
      const r = await invApi("state");
      setSkus(r.skus);
      setSummary(r.summary);
      setPicked((p) => (p ? r.skus.find((s) => s.id === p.id) || null : null));
    } catch (ex) {
      if (ex.status === 401) { setCsrf(null); }
    }
  }, []);

  useEffect(() => {
    invApi("session")
      .then((r) => { if (r.authed) { setCsrf(r.csrf); } })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  useEffect(() => { if (csrf) load(); }, [csrf, load]);

  useEffect(() => {
    try { localStorage.setItem("aqua_inv_user", user); } catch (e) {}
  }, [user]);

  const changed = useCallback(() => { load(); setBump((b) => b + 1); }, [load]);
  const flash = useCallback((m) => {
    setToast(`${m} · ${t("inv.saved")}`);
    setTimeout(() => setToast(""), 2600);
  }, [t]);

  const products = useMemo(() => [...new Set(skus.map((s) => s.product))], [skus]);

  const shown = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return skus.filter((s) => {
      if (tab && s.product !== tab) return false;
      if (!needle) return true;
      return [s.code, s.product, s.finish, s.location, s.finish]
        .join(" ").toLowerCase().includes(needle);
    });
  }, [skus, tab, q, t]);

  const exportStock = () => {
    const head = ["code", "product", "finish", "location", "on_hand", "reserved",
                  "available", "reorder_point", "list_price_rd", "stock_value_rd", "status"];
    const rows = shown.map((s) => [
      s.code, s.product, s.finish, s.location,
      s.on_hand, s.reserved, s.available, s.reorder_point,
      s.list_price, s.on_hand * s.list_price, t(`inv.status.${s.status}`),
    ]);
    downloadCsv(`aqua-stock-${new Date().toISOString().slice(0, 10)}.csv`, [head, ...rows]);
  };

  const exportMovements = async () => {
    const r = await invApi("movements", { params: { limit: 0 } });   // 0 = every row
    const head = ["when_utc", "code", "product", "finish", "type", "qty",
                  "delta_on_hand", "delta_reserved", "on_hand_after", "client_ref", "note", "by"];
    const rows = r.movements.map((m) => [
      m.created_at, m.code, m.product, m.finish,
      t(`inv.mv.${m.type}`), m.qty, m.delta_on_hand, m.delta_reserved,
      m.on_hand_after, m.client_ref, m.note, m.user_label,
    ]);
    downloadCsv(`aqua-movements-${new Date().toISOString().slice(0, 10)}.csv`, [head, ...rows]);
  };

  const signOut = async () => {
    try { await invApi("logout", { method: "POST", csrf }); } catch (e) {}
    setCsrf(null); setSkus([]); setSummary(null); setPicked(null);
  };

  if (!ready) return <div className="inv-boot">{t("inv.loading")}</div>;
  if (!csrf)  return <InvLogin onIn={setCsrf} />;

  return (
    <div className={`inv ${picked || adding ? "has-panel" : ""}`}>
      <header className="inv-top">
        <Logo size="sm" />
        <div className="inv-top__right">
          <label className="inv-user">
            <span>{t("inv.staff")}</span>
            <input
              value={user} maxLength={6} placeholder={t("inv.staff.ph")}
              onChange={(e) => setUser(e.target.value.toUpperCase())}
            />
          </label>
          <LangSwitch />
          <button className="btn btn--ghost btn--sm" onClick={signOut}>{t("inv.logout")}</button>
        </div>
      </header>

      <main className="inv-main">
        <div className="inv-title">
          <h1>{t("inv.title")}</h1>
          <p>{t("inv.sub")}</p>
        </div>

        <InvSummary summary={summary} />

        <div className="inv-bar">
          <div className="inv-tabs">
            <button className={`inv-tab ${tab === "" ? "is-on" : ""}`} onClick={() => setTab("")}>{t("inv.tab.all")}</button>
            {products.map((p) => (
              <button key={p} className={`inv-tab ${tab === p ? "is-on" : ""}`} onClick={() => setTab(p)}>{p}</button>
            ))}
          </div>
          <input
            className="inv-search" value={q} onChange={(e) => setQ(e.target.value)}
            placeholder={t("inv.search.ph")} type="search"
          />
          <div className="inv-bar__btns">
            <button className="btn btn--ghost btn--sm" onClick={exportStock}>{t("inv.export.stock")}</button>
            <button className="btn btn--ghost btn--sm" onClick={exportMovements}>{t("inv.export.mov")}</button>
            <button className="btn btn--primary btn--sm" onClick={() => { setPicked(null); setAdding(true); }}>
              {t("inv.sku.add")}
            </button>
          </div>
        </div>

        {skus.length === 0 ? (
          <div className="inv-first">
            <h2>{t("inv.first.title")}</h2>
            <p>{t("inv.first.body")}</p>
            <button className="btn btn--primary" onClick={() => setAdding(true)}>
              {t("inv.sku.add")} <span className="arr">→</span>
            </button>
          </div>
        ) : (
          <InvTable skus={shown} onPick={(s) => { setAdding(false); setPicked(s); }} activeId={picked && picked.id} />
        )}

        <InvLog skus={skus} reloadKey={bump} />
      </main>

      {(picked || adding) && <div className="inv-scrim" onClick={() => { setPicked(null); setAdding(false); }} />}

      {adding && (
        <aside className="inv-panel" role="dialog">
          <header className="inv-panel__top">
            <h2>{t("inv.sku.new")}</h2>
            <button className="inv-x" onClick={() => setAdding(false)} aria-label={t("inv.panel.close")}>×</button>
          </header>
          <InvSkuForm
            csrf={csrf}
            onDone={() => { setAdding(false); changed(); flash(t("inv.sku.new")); }}
            onCancel={() => setAdding(false)}
          />
        </aside>
      )}

      {picked && !adding && (
        <InvPanel
          sku={picked} csrf={csrf}
          onClose={() => setPicked(null)}
          onChanged={changed}
          onToast={flash}
        />
      )}

      {toast && <div className="inv-toast">{toast}</div>}
    </div>
  );
}

Object.assign(window, { InventoryApp });
