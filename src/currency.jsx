/* ------------------------------------------------------------------ *
 * Currency — locked to USD. Kept as a thin shim so existing
 * `useCurrency()` call sites continue to work without edits.
 * ------------------------------------------------------------------ */

const CurrencyContext = React.createContext({
  currency: "USD",
  format: (n) => `RD$ ${Number(n).toLocaleString("en-US")}`,
});

function useCurrency() {
  return React.useContext(CurrencyContext);
}

Object.assign(window, { useCurrency });
