/* ------------------------------------------------------------------ *
 * Trade Gate — password-protected wholesale pricing context
 * Persisted to localStorage("aqua_trade")
 * Demo password: "trade2026"
 * ------------------------------------------------------------------ */

const TRADE_PASSWORD = "trade2026";
const TRADE_DISCOUNT = 0.30; // 30% off retail for trade partners

const TradeContext = React.createContext({
  isTrade: false,
  unlock: () => false,
  lock: () => {},
  applyDiscount: (n) => n,
});

function TradeProvider({ children }) {
  const [isTrade, setIsTrade] = React.useState(() => {
    try { return localStorage.getItem("aqua_trade") === "1"; }
    catch (e) { return false; }
  });

  const unlock = React.useCallback((pw) => {
    if (pw === TRADE_PASSWORD) {
      setIsTrade(true);
      try { localStorage.setItem("aqua_trade", "1"); } catch (e) {}
      return true;
    }
    return false;
  }, []);

  const lock = React.useCallback(() => {
    setIsTrade(false);
    try { localStorage.removeItem("aqua_trade"); } catch (e) {}
  }, []);

  const applyDiscount = React.useCallback((retail) => {
    return isTrade ? Math.round(retail * (1 - TRADE_DISCOUNT)) : retail;
  }, [isTrade]);

  return (
    <TradeContext.Provider value={{ isTrade, unlock, lock, applyDiscount, discount: TRADE_DISCOUNT }}>
      {children}
    </TradeContext.Provider>
  );
}

function useTrade() {
  return React.useContext(TradeContext);
}

// ---------- Trade Gate Modal ----------
function TradeGate({ open, onClose }) {
  const { unlock } = useTrade();
  const { t } = useLang();
  const [pw, setPw] = React.useState("");
  const [err, setErr] = React.useState("");
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
    if (!open) { setPw(""); setErr(""); }
  }, [open]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (unlock(pw)) {
      setErr("");
      onClose();
    } else {
      setErr(t("trade.gate.err"));
    }
  };

  return (
    <div className="trade-gate" onClick={onClose}>
      <div className="trade-gate__card" onClick={(e) => e.stopPropagation()}>
        <button className="trade-gate__close" onClick={onClose} aria-label="Close">×</button>
        <div className="t-eyebrow t-eyebrow--ink" style={{ marginBottom: 16 }}>{t("trade.gate.eyebrow")}</div>
        <h2 className="t-h2" style={{ margin: 0, marginBottom: 16 }}>
          {t("trade.gate.title.a")}<em className="serif t-italic">{t("trade.gate.title.em")}</em>
        </h2>
        <p style={{ color: "var(--muted)", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
          {t("trade.gate.body")}
        </p>
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className={`field ${err ? "field--error" : ""}`}>
            <label>{t("trade.gate.pw")}</label>
            <input
              ref={inputRef}
              type="password"
              value={pw}
              onChange={(e) => { setPw(e.target.value); setErr(""); }}
              placeholder="••••••••"
              autoComplete="off"
            />
            {err && <span className="field__err">{err}</span>}
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 4 }}>
            <button type="submit" className="btn btn--primary">
              {t("trade.gate.unlock")} <span className="arr">→</span>
            </button>
            <span className="t-mono t-small" style={{ color: "var(--muted)" }}>
              {t("trade.gate.demo")} <code style={{ background: "var(--sand)", padding: "2px 6px", fontSize: 11 }}>trade2026</code>
            </span>
          </div>
        </form>
        <div className="t-mono t-small" style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid var(--rule)", color: "var(--muted)", lineHeight: 1.7 }}>
          {t("trade.gate.foot")}
        </div>
      </div>
    </div>
  );
}

// ---------- Trade banner — shown at top when unlocked ----------
function TradeBanner() {
  const { isTrade, lock, discount } = useTrade();
  const { t } = useLang();
  if (!isTrade) return null;
  return (
    <div className="trade-banner">
      <span className="t-mono t-small">
        ◆ {t("trade.banner.a")} {Math.round(discount * 100)}% {t("trade.banner.b")}
      </span>
      <button onClick={lock} className="trade-banner__exit">{t("trade.banner.exit")}</button>
    </div>
  );
}

Object.assign(window, { TradeProvider, useTrade, TradeGate, TradeBanner });
