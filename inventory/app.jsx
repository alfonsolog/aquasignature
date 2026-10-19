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

/* Every money figure in the app comes from here, so the panel, the ledger,
 * the summary and the CSV can never disagree.
 *
 * list_price is the price BEFORE tax. A unit_cost of 0 means "not entered
 * yet", not "free": profit and margin come back null so the UI can print an
 * em dash rather than claiming a 100% margin on an unknown cost. */
function finance(sku, rate) {
  const list   = Number(sku.list_price) || 0;
  const cost   = Number(sku.unit_cost)  || 0;
  const onHand = Number(sku.on_hand)    || 0;
  const hasCost = cost > 0;

  const itbis      = Math.round(list * rate);
  const withItbis  = list + itbis;
  const profit     = hasCost ? list - cost : null;
  const margin     = hasCost && list > 0 ? (profit / list) * 100 : null;

  return {
    hasCost, cost, list, itbis, withItbis, profit, margin,
    costValue:   onHand * cost,
    salesValue:  onHand * list,
    itbisValue:  onHand * itbis,
    profitValue: profit === null ? null : onHand * profit,
  };
}

const pct = (n) => (n === null || n === undefined) ? "—" : `${n.toFixed(1)}%`;
/* class for a signed figure; a missing cost is muted, not green */
const moneyTone = (n) => n === null || n === undefined ? "inv-money--none"
                       : n > 0 ? "inv-money--up"
                       : n < 0 ? "inv-money--down" : "inv-money--down";

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


/* ---------------------------------------------------------------- periods */

const ymNow = () => new Date().toISOString().slice(0, 7);

function ymAdd(ym, n) {
  const [y, m] = ym.split("-").map(Number);
  const t = y * 12 + (m - 1) + n;
  return `${String(Math.floor(t / 12)).padStart(4, "0")}-${String((t % 12) + 1).padStart(2, "0")}`;
}

/* {kind, anchor} -> the key the API speaks */
function periodKey(p) {
  const [y, m] = p.anchor.split("-").map(Number);
  if (p.kind === "all")     return "all";
  if (p.kind === "year")    return String(y);
  if (p.kind === "quarter") return `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
  return p.anchor;
}

function periodStep(p, dir) {
  const by = p.kind === "year" ? 12 : p.kind === "quarter" ? 3 : 1;
  return { ...p, anchor: ymAdd(p.anchor, by * dir) };
}

/* Month names come from Intl rather than the dictionary: they are locale
 * data, not copy, and Intl already has all of them in both languages. */
function monthName(ym, lang, style = "long") {
  const [y, m] = ym.split("-").map(Number);
  // timeZone must be UTC: the Date is midnight UTC, and formatting it in a
  // negative-offset zone (as the DR is) would name the PREVIOUS month.
  return new Intl.DateTimeFormat(lang === "es" ? "es-DO" : "en-US",
                                 { month: style, timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, 1)));
}

function periodLabel(p, lang, t) {
  const [y, m] = p.anchor.split("-").map(Number);
  if (p.kind === "all")     return t("inv.period.all");
  if (p.kind === "year")    return String(y);
  if (p.kind === "quarter") return `Q${Math.floor((m - 1) / 3) + 1} ${y}`;
  const name = monthName(p.anchor, lang);
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`;
}

const figs = (report, skuId) =>
  (report && report.per_sku && report.per_sku[skuId]) || {
    produced: 0, delivered: 0, written_off: 0, sales: 0, itbis: 0,
    cogs: 0, profit: 0, uncosted_sales: 0,
    opening_units: 0, opening_value: 0, closing_units: 0, closing_value: 0,
  };

const marginOf = (f) => (f && f.sales > 0 ? (f.profit / f.sales) * 100 : null);

/* ------------------------------------------------------------- YTD chart */

function YtdChart({ ytd }) {
  const { t } = useLang();
  const { lang } = useLang();
  if (!ytd || !ytd.length) return null;

  const max = Math.max(1, ...ytd.map((m) => Math.max(m.sales, m.profit)));
  const W = 12 * 56, H = 120, pad = 2;

  return (
    <div className="inv-ytd">
      <div className="inv-ytd__head">
        <h3>{t("inv.ytd.title")}</h3>
        <div className="inv-ytd__key">
          <span><i className="inv-swatch inv-swatch--sales" />{t("inv.ytd.sales")}</span>
          <span><i className="inv-swatch inv-swatch--profit" />{t("inv.ytd.profit")}</span>
        </div>
      </div>
      <svg className="inv-ytd__svg" viewBox={`0 0 ${W} ${H + 26}`} role="img"
           aria-label={t("inv.ytd.title")} preserveAspectRatio="none">
        {ytd.map((m, i) => {
          const x = i * 56;
          const sh = Math.round((m.sales  / max) * H);
          const ph = Math.round((Math.max(0, m.profit) / max) * H);
          return (
            <g key={m.month}>
              {!m.reached ? (
                /* a month that has not happened yet is an empty slot, not a zero */
                <rect x={x + 8} y={2} width={40} height={H - 2} className="inv-bar--future" />
              ) : (
                <>
                  <rect x={x + 8}  y={H - sh} width={19} height={Math.max(sh, 1)} className="inv-bar--sales" />
                  <rect x={x + 29} y={H - ph} width={19} height={Math.max(ph, 1)} className="inv-bar--profit" />
                </>
              )}
              <text x={x + 28} y={H + 17} textAnchor="middle" className="inv-ytd__lbl">
                {monthName(m.month, lang, "short").slice(0, 3)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
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
  const profit = s.profit || 0;
  const cells = [
    [t("inv.sum.skus"),      s.skus || 0],
    [t("inv.sum.onhand"),    s.on_hand || 0],
    [t("inv.sum.reserved"),  s.reserved || 0],
    [t("inv.sum.value"),     rd(s.value)],
    [t("inv.sum.costvalue"), rd(s.cost_value)],
    [t("inv.sum.profit"),    rd(profit), "", moneyTone(profit || null),
     (s.missing_cost || 0) > 0 ? t("inv.sum.profit.note") : ""],
    [t("inv.sum.needs"),     s.needs_production || 0,
     (s.needs_production || 0) > 0 ? "warn" : ""],
  ];
  return (
    <div className="inv-sum">
      {cells.map(([label, value, tone, numTone, note]) => (
        <div className={`inv-sum__cell ${tone || ""}`} key={label}>
          <span className={`inv-sum__n ${numTone || ""}`}>{value}</span>
          <span className="inv-sum__l">{label}</span>
          {note && <span className="inv-sum__note">{note}</span>}
        </div>
      ))}
    </div>
  );
}


/* ------------------------------------------------------- period selector */

function PeriodBar({ period, setPeriod, report, csrf, onClosed, onToast }) {
  const { t, lang } = useLang();
  const errText = useErrText();
  const [busy, setBusy] = useState(false);
  const [ask, setAsk]   = useState(false);
  const [err, setErr]   = useState("");

  const p   = report && report.period;
  const key = periodKey(period);
  const isMonth   = period.kind === "month";
  const isClosed  = !!(p && p.closed);
  const canClose  = isMonth && !isClosed && key <= ymNow();

  const close = async () => {
    setBusy(true); setErr("");
    try {
      await invApi("close_month", {
        method: "POST", csrf,
        body: { period: key, user_label: localStorage.getItem("aqua_inv_user") || "" },
      });
      setAsk(false);
      onToast(`${t("inv.period.close")} ${key}`);
      onClosed();
    } catch (ex) { setErr(errText(ex)); } finally { setBusy(false); }
  };

  return (
    <div className="inv-period">
      <div className="inv-period__kinds">
        {["month", "quarter", "year", "all"].map((k) => (
          <button key={k}
            className={`inv-tab ${period.kind === k ? "is-on" : ""}`}
            onClick={() => setPeriod({ ...period, kind: k })}>
            {t(`inv.period.${k}`)}
          </button>
        ))}
      </div>

      {period.kind !== "all" && (
        <div className="inv-period__nav">
          <button className="inv-step" onClick={() => setPeriod(periodStep(period, -1))}
                  aria-label={t("inv.period.prev")}>‹</button>
          <span className="inv-period__label">{periodLabel(period, lang, t)}</span>
          <button className="inv-step" onClick={() => setPeriod(periodStep(period, 1))}
                  aria-label={t("inv.period.next")}>›</button>
        </div>
      )}

      {isMonth && (
        <span className={`inv-pill ${isClosed ? "inv-pill--sealed" : "inv-pill--ok"}`}>
          {isClosed ? `${t("inv.period.closed")} ${(p.closed_at || "").slice(0, 10)}` : t("inv.period.open")}
        </span>
      )}

      {canClose && !ask && (
        <button className="btn btn--ghost btn--sm" onClick={() => setAsk(true)}>{t("inv.period.close")}</button>
      )}
      {ask && (
        <span className="inv-period__ask">
          <span>{t("inv.period.closeask").replace("{m}", periodLabel(period, lang, t))}</span>
          <button className="btn btn--danger btn--sm" onClick={close} disabled={busy}>
            {busy ? t("inv.period.closing") : t("inv.period.close")}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={() => setAsk(false)}>{t("inv.sku.cancel")}</button>
        </span>
      )}
      {err && <span className="inv-err">{err}</span>}
    </div>
  );
}

/* ------------------------------------------------------- period summary */

function PeriodSummary({ report }) {
  const { t } = useLang();
  const tot = (report && report.totals) || {};
  const margin = marginOf(tot);
  const cells = [
    [t("inv.p.produced"),   tot.produced || 0],
    [t("inv.p.delivered"),  tot.delivered || 0],
    [t("inv.p.writtenoff"), tot.written_off || 0],
    [t("inv.p.sales"),      rd(tot.sales)],
    [t("inv.p.itbis"),      rd(tot.itbis)],
    [t("inv.p.cogs"),       rd(tot.cogs)],
    [t("inv.p.profit"),     rd(tot.profit), moneyTone(tot.profit || null)],
    [t("inv.p.margin"),     pct(margin),    moneyTone(margin)],
  ];
  return (
    <>
      <div className="inv-sum">
        {cells.map(([label, value, tone]) => (
          <div className="inv-sum__cell" key={label}>
            <span className={`inv-sum__n ${tone || ""}`}>{value}</span>
            <span className="inv-sum__l">{label}</span>
          </div>
        ))}
      </div>
      {tot.uncosted_sales > 0 && (
        <p className="inv-hint inv-hint--nudge">
          {t("inv.p.uncosted").replace("{v}", rd(tot.uncosted_sales))}
        </p>
      )}
    </>
  );
}

/* ---------------------------------------------------------------- table */

function InvRow({ sku, onPick, active, rate, report }) {
  const { t } = useLang();
  const finish = sku.finish;
  const f = finance(sku, rate);
  const g = figs(report, sku.id);          // period activity for this SKU
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
      <span className="inv-row__n" data-l={t("inv.col.value")}>{rd(f.salesValue)}</span>
      <span className="inv-row__n" data-l={t("inv.col.cost")}>
        {f.hasCost ? rd(f.cost) : <i className="inv-money--none">—</i>}
      </span>
      <span className={`inv-row__n ${moneyTone(f.margin)}`} data-l={t("inv.col.margin")}>
        {pct(f.margin)}
      </span>
      <span className="inv-row__n inv-row__p" data-l={t("inv.col.deliv")}>{g.delivered}</span>
      <span className="inv-row__n inv-row__p" data-l={t("inv.col.sales")}>{rd(g.sales)}</span>
      <span className={`inv-row__n inv-row__p ${moneyTone(g.sales ? g.profit : null)}`} data-l={t("inv.col.pprofit")}>
        {g.sales ? rd(g.profit) : "—"}
      </span>
      <span className="inv-row__status" data-l={t("inv.col.status")}>
        <i className={`inv-pill inv-pill--${sku.status}`}>{t(`inv.status.${sku.status}`)}</i>
      </span>
    </button>
  );
}

function InvTable({ skus, onPick, activeId, rate, report, periodLabelText }) {
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
    <div className="inv-table inv-tablewrap">
      {groups.map(([product, rows]) => (
        <section className="inv-group" key={product}>
          <h3 className="inv-group__head">
            <span>{product}</span>
            <span className="t-mono">{rows.reduce((a, r) => a + r.on_hand, 0)} {t("inv.col.onhand").toLowerCase()}</span>
          </h3>
          {/* group spans must match the column counts below, in order */}
          <div className="inv-grouphead" aria-hidden="true">
            <span className="inv-gh" style={{ gridColumn: "span 3" }} />
            <span className="inv-gh inv-gh--live"   style={{ gridColumn: "span 5" }}>{t("inv.sum.live")}</span>
            <span className="inv-gh inv-gh--unit"   style={{ gridColumn: "span 2" }}>{t("inv.det.unit")}</span>
            <span className="inv-gh inv-gh--period" style={{ gridColumn: "span 3" }}>{periodLabelText}</span>
            <span className="inv-gh" />
          </div>
          <div className="inv-head" aria-hidden="true">
            <span>{t("inv.col.item")}</span><span>{t("inv.col.code")}</span>
            <span>{t("inv.col.location")}</span>
            <span className="inv-row__n">{t("inv.col.onhand")}</span>
            <span className="inv-row__n">{t("inv.col.reserved")}</span>
            <span className="inv-row__n">{t("inv.col.available")}</span>
            <span className="inv-row__n">{t("inv.col.reorder")}</span>
            <span className="inv-row__n">{t("inv.col.value")}</span>
            <span className="inv-row__n">{t("inv.col.cost")}</span>
            <span className="inv-row__n">{t("inv.col.margin")}</span>
            <span className="inv-row__n inv-row__p">{t("inv.col.deliv")}</span>
            <span className="inv-row__n inv-row__p">{t("inv.col.sales")}</span>
            <span className="inv-row__n inv-row__p">{t("inv.col.pprofit")}</span>
            <span>{t("inv.col.status")}</span>
          </div>
          {rows.map((s) => (
            <InvRow key={s.id} sku={s} onPick={onPick} active={s.id === activeId} rate={rate} report={report} />
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
    unit_cost: sku ? String(sku.unit_cost || 0) : "0",
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
      unit_cost: Number(f.unit_cost) || 0,
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
        {field("unit_cost", t("inv.sku.cost"), { type: "number", min: "0", inputMode: "numeric" })}
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

function InvDetails({ sku, rate }) {
  const { t } = useLang();
  const f = finance(sku, rate);
  const pctLabel = t("inv.f.itbis").replace("{rate}", String(Math.round(rate * 1000) / 10));

  // a missing cost prints an em dash and a nudge, never a fabricated margin
  const money = (v) => f.hasCost ? rd(v) : <i className="inv-money--none">—</i>;
  const row = (label, value, tone) => (
    <div className="inv-dl__row" key={label}>
      <span className="inv-dl__k">{label}</span>
      <span className={`inv-dl__v ${tone || ""}`}>{value}</span>
    </div>
  );

  return (
    <div className="inv-details">
      <h3>{t("inv.det.stock")}</h3>
      <div className="inv-dl">
        {row(t("inv.col.onhand"), sku.on_hand)}
        {row(t("inv.col.reserved"), sku.reserved)}
        {row(t("inv.col.available"), sku.available, `inv-avail--${sku.status}`)}
        {row(t("inv.col.reorder"), sku.reorder_point)}
      </div>

      <h3>{t("inv.det.unit")}</h3>
      <div className="inv-dl">
        {row(t("inv.f.cost"), f.hasCost ? rd(f.cost) : <i className="inv-money--none">—</i>)}
        {row(t("inv.f.list"), rd(f.list))}
        {row(pctLabel, rd(f.itbis))}
        {row(t("inv.f.withitbis"), rd(f.withItbis))}
        {row(t("inv.f.profit"), money(f.profit), moneyTone(f.profit))}
        {row(t("inv.f.margin"), pct(f.margin), moneyTone(f.margin))}
      </div>
      {!f.hasCost && <p className="inv-hint inv-hint--nudge">{t("inv.f.nocost")}</p>}

      <h3>{t("inv.det.totals")}</h3>
      <div className="inv-dl">
        {row(t("inv.f.costvalue"), money(f.costValue))}
        {row(t("inv.f.salesvalue"), rd(f.salesValue))}
        {row(t("inv.f.itbistotal"), rd(f.itbisValue))}
        {row(t("inv.f.profittotal"), money(f.profitValue), moneyTone(f.profitValue))}
      </div>
    </div>
  );
}

function InvPanel({ sku, csrf, onClose, onChanged, onToast, rate }) {
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
          <div className="inv-panel__meta">
            <i className={`inv-pill inv-pill--${sku.status}`}>{t(`inv.status.${sku.status}`)}</i>
            <span className="t-mono">{sku.location || "—"}</span>
          </div>
        </div>
        <button className="inv-x" onClick={onClose} aria-label={t("inv.panel.close")}>×</button>
      </header>

      <div className="inv-figs">
        {[["inv.col.onhand", sku.on_hand, ""],
          ["inv.col.reserved", sku.reserved, ""],
          ["inv.col.available", sku.available, `inv-avail--${sku.status}`]].map(([k, v, tone]) => (
          <div key={k}>
            <span className={`inv-figs__n ${tone}`}>{v}</span>
            <span className="inv-figs__l">{t(k)}</span>
          </div>
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
          <InvDetails sku={sku} rate={rate} />

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
                  <span className={`t-mono ${m.delta_on_hand > 0 ? "inv-delta--up" : m.delta_on_hand < 0 ? "inv-delta--down" : "inv-delta--flat"}`}>
                    {m.delta_on_hand > 0 ? "+" : ""}{m.delta_on_hand}
                  </span>
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
              <span className={`inv-row__n inv-delta ${m.delta_on_hand > 0 ? "inv-delta--up" : m.delta_on_hand < 0 ? "inv-delta--down" : "inv-delta--flat"}`}>
                {m.delta_on_hand > 0 ? "+" : ""}{m.delta_on_hand}
              </span>
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


/* ------------------------------------------------------- full report page */

function Figure({ label, value, tone, mono = true }) {
  return (
    <div className="inv-fig">
      <span className="inv-fig__l">{label}</span>
      <span className={`inv-fig__v ${mono ? "t-mono" : ""} ${tone || ""}`}>{value}</span>
    </div>
  );
}

function ReportCard({ sku, rate, report, movements }) {
  const { t } = useLang();
  const f = finance(sku, rate);
  const g = figs(report, sku.id);
  const margin = marginOf(g);
  const mine = movements.filter((m) => m.sku_id === sku.id);

  return (
    <article className="inv-card">
      <header className="inv-card__top">
        <span className="inv-card__id">
          <i className="inv-sw" style={{ background: sku.hex || "transparent" }} aria-hidden="true" />
          <span>
            <span className="inv-card__name">{sku.product} · {sku.finish}</span>
            <span className="t-mono inv-card__code">{sku.code} · {sku.location || "—"}</span>
          </span>
        </span>
        <i className={`inv-pill inv-pill--${sku.status}`}>{t(`inv.status.${sku.status}`)}</i>
      </header>

      <div className="inv-card__grid">
        <section>
          <h4>{t("inv.all.stocknow")}</h4>
          <Figure label={t("inv.col.onhand")}    value={sku.on_hand} />
          <Figure label={t("inv.col.reserved")}  value={sku.reserved} />
          <Figure label={t("inv.col.available")} value={sku.available} tone={`inv-avail--${sku.status}`} />
          <Figure label={t("inv.col.reorder")}   value={sku.reorder_point} />
          <Figure label={t("inv.f.costvalue")}   value={f.hasCost ? rd(f.costValue) : "—"} />
          <Figure label={t("inv.stock.list")}    value={rd(f.salesValue)} />
        </section>

        <section>
          <h4>{t("inv.det.unit")}</h4>
          <Figure label={t("inv.f.cost")}       value={f.hasCost ? rd(f.cost) : "—"} />
          <Figure label={t("inv.f.list")}       value={rd(f.list)} />
          <Figure label={t("inv.f.itbis").replace("{rate}", String(Math.round(rate * 1000) / 10))} value={rd(f.itbis)} />
          <Figure label={t("inv.f.withitbis")}  value={rd(f.withItbis)} />
          <Figure label={t("inv.f.profit")}     value={f.hasCost ? rd(f.profit) : "—"} tone={moneyTone(f.profit)} />
          <Figure label={t("inv.f.margin")}     value={pct(f.margin)} tone={moneyTone(f.margin)} />
        </section>

        <section>
          <h4>{t("inv.all.activity")}</h4>
          <Figure label={t("inv.p.opening")}    value={`${g.opening_units} · ${rd(g.opening_value)}`} />
          <Figure label={t("inv.p.produced")}   value={g.produced} />
          <Figure label={t("inv.p.delivered")}  value={g.delivered} />
          <Figure label={t("inv.p.writtenoff")} value={g.written_off} />
          <Figure label={t("inv.p.sales")}      value={rd(g.sales)} />
          <Figure label={t("inv.p.itbis")}      value={rd(g.itbis)} />
          <Figure label={t("inv.p.cogs")}       value={rd(g.cogs)} />
          <Figure label={t("inv.p.profit")}     value={g.sales ? rd(g.profit) : "—"} tone={moneyTone(g.sales ? g.profit : null)} />
          <Figure label={t("inv.p.margin")}     value={pct(margin)} tone={moneyTone(margin)} />
          <Figure label={t("inv.p.closing")}    value={`${g.closing_units} · ${rd(g.closing_value)}`} />
        </section>
      </div>

      <div className="inv-card__hist">
        <h4>{t("inv.all.history")}</h4>
        {mine.length === 0 ? <p className="inv-empty">{t("inv.all.nomov")}</p> : (
          <div className="inv-histtable">
            {mine.map((m) => (
              <div className="inv-histrow" key={m.id}>
                <span className="t-mono">{m.created_at.slice(0, 16)}</span>
                <span><i className={`inv-tag inv-tag--${m.type}`}>{t(`inv.mv.${m.type}`)}</i></span>
                <span className="inv-row__n">{m.qty}</span>
                <span className={`inv-row__n ${m.delta_on_hand > 0 ? "inv-delta--up" : m.delta_on_hand < 0 ? "inv-delta--down" : "inv-delta--flat"}`}>
                  {m.delta_on_hand > 0 ? "+" : ""}{m.delta_on_hand}
                </span>
                <span className="inv-row__n">{m.on_hand_after}</span>
                <span className="inv-histrow__meta">{m.client_ref || m.note || ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

function TotalsRow({ label, skus, rate, report, strong }) {
  const { t } = useLang();
  let units = 0, cost = 0, list = 0, itbis = 0, prof = 0;
  let pSales = 0, pProfit = 0, pDeliv = 0, pCogs = 0;
  skus.forEach((s) => {
    const f = finance(s, rate), g = figs(report, s.id);
    units += s.on_hand; cost += f.costValue; list += f.salesValue; itbis += f.itbisValue;
    if (f.hasCost) prof += f.profitValue || 0;
    pSales += g.sales; pProfit += g.profit; pDeliv += g.delivered; pCogs += g.cogs;
  });
  const pMargin = pSales > 0 ? (pProfit / pSales) * 100 : null;
  return (
    <div className={`inv-totals ${strong ? "is-grand" : ""}`}>
      <span className="inv-totals__l">{label}</span>
      <Figure label={t("inv.col.onhand")}     value={units} />
      <Figure label={t("inv.f.costvalue")}    value={rd(cost)} />
      <Figure label={t("inv.stock.list")}     value={rd(list)} />
      <Figure label={t("inv.stock.itbis")}    value={rd(itbis)} />
      <Figure label={t("inv.sum.profit")}     value={rd(prof)} tone={moneyTone(prof || null)} />
      <Figure label={t("inv.p.delivered")}    value={pDeliv} />
      <Figure label={t("inv.p.sales")}        value={rd(pSales)} />
      <Figure label={t("inv.p.cogs")}         value={rd(pCogs)} />
      <Figure label={t("inv.p.profit")}       value={pSales ? rd(pProfit) : "—"} tone={moneyTone(pSales ? pProfit : null)} />
      <Figure label={t("inv.p.margin")}       value={pct(pMargin)} tone={moneyTone(pMargin)} />
    </div>
  );
}

function ReportPage({ skus, rate, report, period, onBack, onExport }) {
  const { t, lang } = useLang();
  const [movements, setMovements] = useState([]);

  useEffect(() => {
    if (!report) return;
    let live = true;
    invApi("movements", { params: { limit: 0 } })
      .then((r) => {
        if (!live) return;
        const from = report.period.from, to = report.period.to;
        setMovements(r.movements.filter((m) => m.created_at >= from && m.created_at < to));
      })
      .catch(() => {});
    return () => { live = false; };
  }, [report && report.period.key]);

  const groups = useMemo(() => {
    const m = new Map();
    skus.forEach((s) => { if (!m.has(s.product)) m.set(s.product, []); m.get(s.product).push(s); });
    return [...m.entries()];
  }, [skus]);

  const p = report && report.period;

  return (
    <div className="inv-report">
      <header className="inv-report__top">
        <div>
          <button className="btn btn--ghost btn--sm inv-noprint" onClick={onBack}>← {t("inv.all.back")}</button>
          <h1>{t("inv.all.title")}</h1>
          <p className="inv-report__period">
            {periodLabel(period, lang, t)}
            {p && period.kind === "month" && (
              <i className={`inv-pill ${p.closed ? "inv-pill--sealed" : "inv-pill--ok"}`}>
                {p.closed ? `${t("inv.period.closed")} ${(p.closed_at || "").slice(0, 10)}` : t("inv.period.open")}
              </i>
            )}
          </p>
        </div>
        <div className="inv-report__btns inv-noprint">
          <button className="btn btn--ghost btn--sm" onClick={onExport}>{t("inv.all.export")}</button>
          <button className="btn btn--ghost btn--sm" onClick={() => window.print()}>{t("inv.all.print")}</button>
        </div>
      </header>

      <TotalsRow label={t("inv.all.grand")} skus={skus} rate={rate} report={report} strong />
      {report && report.totals && report.totals.uncosted_sales > 0 && (
        <p className="inv-hint inv-hint--nudge">
          {t("inv.p.uncosted").replace("{v}", rd(report.totals.uncosted_sales))}
        </p>
      )}
      {report && <YtdChart ytd={report.ytd} />}

      {groups.map(([product, rows]) => (
        <section className="inv-prodsec" key={product}>
          <h2>{product}</h2>
          {rows.map((s) => (
            <ReportCard key={s.id} sku={s} rate={rate} report={report} movements={movements} />
          ))}
          <TotalsRow label={`${t("inv.all.subtotal")} · ${product}`} skus={rows} rate={rate} report={report} />
        </section>
      ))}

      <TotalsRow label={t("inv.all.grand")} skus={skus} rate={rate} report={report} strong />
    </div>
  );
}

/* ------------------------------------------------------------------ app */

function InventoryApp() {
  const { t, lang } = useLang();
  const [csrf, setCsrf]       = useState(null);
  const [ready, setReady]     = useState(false);
  const [skus, setSkus]       = useState([]);
  const [summary, setSummary] = useState(null);
  const [rate, setRate]       = useState(0.18);   // replaced by the server's value
  const [route, setRoute]     = useState(() => (location.hash === "#/all" ? "all" : "ledger"));
  const [report, setReport]   = useState(null);
  const [period, setPeriod]   = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem("aqua_inv_period") || "null");
      if (raw && raw.kind && raw.anchor) return raw;
    } catch (e) {}
    return { kind: "month", anchor: ymNow() };
  });
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
      if (typeof r.itbis_rate === "number") setRate(r.itbis_rate);
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

  useEffect(() => {
    try { localStorage.setItem("aqua_inv_period", JSON.stringify(period)); } catch (e) {}
  }, [period]);

  useEffect(() => {
    const onHash = () => setRoute(location.hash === "#/all" ? "all" : "ledger");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // the report is the single source for every period figure on screen
  const loadReport = useCallback(async () => {
    try {
      const r = await invApi("report", { params: { period: periodKey(period) } });
      setReport(r);
      if (typeof r.itbis_rate === "number") setRate(r.itbis_rate);
    } catch (ex) {
      if (ex.status === 401) setCsrf(null);
    }
  }, [period]);

  useEffect(() => { if (csrf) loadReport(); }, [csrf, loadReport]);

  const changed = useCallback(() => { load(); loadReport(); setBump((b) => b + 1); }, [load, loadReport]);
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
                  "available", "reorder_point", "unit_cost_rd", "list_price_rd",
                  "itbis_per_unit_rd", "price_with_itbis_rd", "profit_per_unit_rd",
                  "margin_pct", "stock_value_rd", "status"];
    const rows = shown.map((s) => {
      const f = finance(s, rate);
      return [
        s.code, s.product, s.finish, s.location,
        s.on_hand, s.reserved, s.available, s.reorder_point,
        f.cost, f.list, f.itbis, f.withItbis,
        f.profit === null ? "" : f.profit,
        f.margin === null ? "" : f.margin.toFixed(1),
        f.salesValue, t(`inv.status.${s.status}`),
      ];
    });
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

  const exportReport = () => {
    const head = ["period", "code", "product", "finish", "location", "status",
                  "on_hand", "reserved", "available", "reorder_point",
                  "unit_cost_rd", "list_price_rd", "itbis_per_unit_rd", "price_with_itbis_rd",
                  "profit_per_unit_rd", "margin_pct",
                  "stock_at_cost_rd", "stock_at_list_rd",
                  "opening_units", "opening_value_rd",
                  "produced", "delivered", "written_off",
                  "sales_rd", "itbis_on_sales_rd", "cogs_rd", "period_profit_rd", "period_margin_pct",
                  "closing_units", "closing_value_rd"];
    const key = periodKey(period);
    const rows = skus.map((s) => {
      const f = finance(s, rate), g = figs(report, s.id), m = marginOf(g);
      return [
        key, s.code, s.product, s.finish, s.location, t(`inv.status.${s.status}`),
        s.on_hand, s.reserved, s.available, s.reorder_point,
        f.cost, f.list, f.itbis, f.withItbis,
        f.profit === null ? "" : f.profit,
        f.margin === null ? "" : f.margin.toFixed(1),
        f.costValue, f.salesValue,
        g.opening_units, g.opening_value,
        g.produced, g.delivered, g.written_off,
        g.sales, g.itbis, g.cogs, g.profit,
        m === null ? "" : m.toFixed(1),
        g.closing_units, g.closing_value,
      ];
    });
    downloadCsv(`aqua-report-${key}.csv`, [head, ...rows]);
  };

  const signOut = async () => {
    try { await invApi("logout", { method: "POST", csrf }); } catch (e) {}
    setCsrf(null); setSkus([]); setSummary(null); setPicked(null);
  };

  if (!ready) return <div className="inv-boot">{t("inv.loading")}</div>;
  if (!csrf)  return <InvLogin onIn={setCsrf} />;

  if (route === "all") {
    return (
      <div className="inv">
        <header className="inv-top inv-noprint">
          <Logo size="sm" />
          <div className="inv-top__right">
            <LangSwitch />
            <button className="btn btn--ghost btn--sm" onClick={signOut}>{t("inv.logout")}</button>
          </div>
        </header>
        <main className="inv-main">
          <ReportPage
            skus={skus} rate={rate} report={report} period={period}
            onBack={() => { location.hash = "#/"; }}
            onExport={exportReport}
          />
        </main>
        {toast && <div className="inv-toast">{toast}</div>}
      </div>
    );
  }

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
          <button className="btn btn--primary btn--sm" onClick={() => { location.hash = "#/all"; }}>
            {t("inv.all.view")}
          </button>
          <button className="btn btn--ghost btn--sm" onClick={signOut}>{t("inv.logout")}</button>
        </div>
      </header>

      <main className="inv-main">
        <div className="inv-title">
          <h1>{t("inv.title")}</h1>
          <p>{t("inv.sub")}</p>
        </div>

        <PeriodBar
          period={period} setPeriod={setPeriod} report={report} csrf={csrf}
          onClosed={() => { loadReport(); load(); }} onToast={flash}
        />

        <h2 className="inv-groupcap">{t("inv.sum.live")}</h2>
        <InvSummary summary={summary} />

        <h2 className="inv-groupcap">{t("inv.sum.period")} · {periodLabel(period, lang, t)}</h2>
        <PeriodSummary report={report} />
        <YtdChart ytd={report && report.ytd} />

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
          <InvTable
            skus={shown} onPick={(s) => { setAdding(false); setPicked(s); }}
            activeId={picked && picked.id} rate={rate} report={report}
            periodLabelText={periodLabel(period, lang, t)}
          />
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
          sku={picked} csrf={csrf} rate={rate}
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
