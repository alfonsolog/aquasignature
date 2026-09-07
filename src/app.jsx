/* ------------------------------------------------------------------ *
 * App shell — routing, tweaks, mount
 * ------------------------------------------------------------------ */

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "paper",
  "accent": "teal",
  "showStripes": true,
  "marqueeSpeed": 40
}/*EDITMODE-END*/;

function useRoute() {
  const [route, setRoute] = useState(() => {
    const h = window.location.hash.replace(/^#/, "");
    return h || "/";
  });
  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace(/^#/, "") || "/");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = useCallback((to) => {
    window.location.hash = to;
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);
  return [route, navigate];
}

function App() {
  const [route, navigate] = useRoute();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [quoteItems, setQuoteItems] = useState([]);
  const [tradeGateOpen, setTradeGateOpen] = useState(false);
  const { t } = useLang();

  const addToQuote = (item) => setQuoteItems((q) => [...q, item]);
  const removeQuoteItem = (i) => setQuoteItems((q) => q.filter((_, idx) => idx !== i));

  // Apply tweaks
  useEffect(() => {
    const root = document.documentElement;
    if (tweaks.theme === "ocean") {
      root.style.setProperty("--bg", "#08252E");
      root.style.setProperty("--fg", "#DCF2F6");
      root.style.setProperty("--muted", "#7B9BA3");
      root.style.setProperty("--rule", "rgba(220,242,246,0.12)");
      root.style.setProperty("--rule-strong", "rgba(220,242,246,0.25)");
      root.style.setProperty("--sand", "#0F2F38");
      root.style.setProperty("--sand-warm", "#143A45");
      root.style.setProperty("--paper", "#08252E");
    } else if (tweaks.theme === "sand") {
      root.style.setProperty("--bg", "#F5EDE0");
      root.style.setProperty("--fg", "#0A2A33");
      root.style.setProperty("--muted", "#5C6B72");
      root.style.setProperty("--rule", "rgba(10,42,51,0.12)");
      root.style.setProperty("--rule-strong", "rgba(10,42,51,0.25)");
      root.style.setProperty("--sand", "#EFE3D0");
      root.style.setProperty("--sand-warm", "#E5D7BE");
      root.style.setProperty("--paper", "#F5EDE0");
    } else {
      // paper (default) — clear all overrides so styles.css wins
      ["--bg","--fg","--muted","--rule","--rule-strong","--sand","--sand-warm","--paper"]
        .forEach((k) => root.style.removeProperty(k));
    }
    if (tweaks.accent === "ocean") {
      root.style.setProperty("--teal", "#0E6E80");
      root.style.setProperty("--teal-deep", "#0A4D5A");
    } else if (tweaks.accent === "coral") {
      root.style.setProperty("--teal", "#E08864");
      root.style.setProperty("--teal-deep", "#B86A4A");
    } else if (tweaks.accent === "sage") {
      root.style.setProperty("--teal", "#92A88E");
      root.style.setProperty("--teal-deep", "#5E7758");
    } else {
      // teal (default) — clear so styles.css wins
      root.style.removeProperty("--teal");
      root.style.removeProperty("--teal-deep");
    }
  }, [tweaks.theme, tweaks.accent]);

  // Stripes visibility
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--stripes-display",
      tweaks.showStripes ? "block" : "none"
    );
    document.querySelectorAll(".media__stripes").forEach(el => {
      el.style.display = tweaks.showStripes ? "block" : "none";
    });
  }, [tweaks.showStripes, route]);

  // Marquee speed
  useEffect(() => {
    document.querySelectorAll(".marquee__track").forEach(el => {
      el.style.animationDuration = `${tweaks.marqueeSpeed}s`;
    });
  }, [tweaks.marqueeSpeed, route]);

  // Route parser
  let page = null;
  let darkNav = false;
  if (route === "/" || route === "") {
    page = <PageHome navigate={navigate} />;
    darkNav = true; // hero is dark
  } else if (route.startsWith("/collection")) {
    page = <PageCollection navigate={navigate} />;
  } else if (route.startsWith("/story")) {
    page = <PageStory navigate={navigate} />;
  } else if (route.startsWith("/materials")) {
    page = <PageStory navigate={navigate} anchor="materials" />;
  } else if (route.startsWith("/product/")) {
    const slug = route.replace("/product/", "");
    page = <PageProduct slug={slug} navigate={navigate} onAddToQuote={addToQuote} />;
  } else if (route.startsWith("/contact")) {
    page = <PageContact quoteItems={quoteItems} removeQuoteItem={removeQuoteItem} />;
  } else {
    page = <PageHome navigate={navigate} />;
    darkNav = true;
  }

  // Dark nav only when at top of home hero
  const [atHeroTop, setAtHeroTop] = useState(true);
  useEffect(() => {
    if (!darkNav) { setAtHeroTop(false); return; }
    const onScroll = () => setAtHeroTop(window.scrollY < window.innerHeight - 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [darkNav, route]);

  return (
    <>
      <TradeBanner />
      <Nav route={route} navigate={navigate} dark={darkNav && atHeroTop} />
      <LangSwitch />
      <main>{page}</main>
      <Footer navigate={navigate} onTradeLogin={() => setTradeGateOpen(true)} />
      <TradeGate open={tradeGateOpen} onClose={() => setTradeGateOpen(false)} />

      <TweaksPanel title="Tweaks">
        <TweakSection title={t("tw.theme")}>
          <TweakRadio
            label={t("tw.bg")}
            value={tweaks.theme}
            onChange={(v) => setTweak("theme", v)}
            options={[
              { value: "paper", label: t("tw.bg.paper") },
              { value: "sand", label: t("tw.bg.sand") },
              { value: "ocean", label: t("tw.bg.ocean") },
            ]}
          />
          <TweakRadio
            label={t("tw.accent")}
            value={tweaks.accent}
            onChange={(v) => setTweak("accent", v)}
            options={[
              { value: "teal",  label: t("tw.accent.teal") },
              { value: "ocean", label: t("tw.accent.deep") },
              { value: "coral", label: t("tw.accent.coral") },
              { value: "sage",  label: t("tw.accent.sage") },
            ]}
          />
        </TweakSection>
        <TweakSection title={t("tw.imagery")}>
          <TweakToggle
            label={t("tw.stripes")}
            value={tweaks.showStripes}
            onChange={(v) => setTweak("showStripes", v)}
          />
        </TweakSection>
        <TweakSection title={t("tw.motion")}>
          <TweakSlider
            label={t("tw.marquee")}
            value={tweaks.marqueeSpeed}
            onChange={(v) => setTweak("marqueeSpeed", v)}
            min={10} max={120} step={5}
          />
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

function TweaksI18n() { return null; }

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <LangProvider>
    <TradeProvider>
      <App />
    </TradeProvider>
  </LangProvider>
);
