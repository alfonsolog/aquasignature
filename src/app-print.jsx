/* ------------------------------------------------------------------ *
 * App shell — PRINT VERSION
 * Renders every page stacked with page breaks for PDF export.
 * No routing, no nav, no footer-per-page, no tweaks panel.
 * ------------------------------------------------------------------ */

function PrintApp() {
  const noop = () => {};
  const navigate = noop;

  // Disable Reveal animation gate so everything appears immediately.
  React.useEffect(() => {
    document.querySelectorAll(".reveal").forEach(el => el.classList.add("is-in"));
    document.querySelectorAll(".reveal-stagger").forEach(el => el.classList.add("is-in"));
    // Re-run periodically while React mounts more content
    const id = setInterval(() => {
      document.querySelectorAll(".reveal:not(.is-in)").forEach(el => el.classList.add("is-in"));
      document.querySelectorAll(".reveal-stagger:not(.is-in)").forEach(el => el.classList.add("is-in"));
    }, 200);
    setTimeout(() => clearInterval(id), 4000);
    return () => clearInterval(id);
  }, []);

  const sections = [
    { key: "home",       el: <PageHome navigate={navigate} /> },
    { key: "collection", el: <PageCollection navigate={navigate} /> },
    { key: "tray",       el: <PageProduct slug="aqua-tray" navigate={navigate} onAddToQuote={noop} /> },
    { key: "box",        el: <PageProduct slug="aqua-box"  navigate={navigate} onAddToQuote={noop} /> },
    { key: "bar",        el: <PageProduct slug="aqua-bar"  navigate={navigate} onAddToQuote={noop} /> },
    { key: "story",      el: <PageStory   navigate={navigate} /> },
    { key: "contact",    el: <PageContact quoteItems={[]} removeQuoteItem={noop} /> },
  ];

  return (
    <>
      {sections.map((s, i) => (
        <div key={s.key} className="print-page" data-page={s.key}>
          {s.el}
        </div>
      ))}
      <Footer navigate={navigate} onTradeLogin={noop} />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <LangProvider>
    <TradeProvider>
      <PrintApp />
    </TradeProvider>
  </LangProvider>
);
