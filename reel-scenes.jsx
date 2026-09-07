// reel-scenes.jsx — Aqua Signature · Reel "La Bandeja Flotante"
// 1080×1920 (9:16), 30 s. Composed of full-bleed Ken Burns shots with
// crossfades, an aqua wipe between the two colorways, and brand bookends.

const REEL_W = 1080;
const REEL_H = 1920;
const REEL_DUR = 30;

const reelFonts = {
  caps: '"Cinzel", serif',
  display: '"Cormorant Garamond", serif',
  mono: '"JetBrains Mono", monospace',
};
const reelColors = {
  ocean: '#0A2A33',
  aqua: '#2FAFC9',
  aquaPale: '#DCF2F6',
  paper: '#FAFBFB',
};

// ── Full-bleed Ken Burns shot ───────────────────────────────────────────────
// from/to: { scale, x, y } — x/y are translate % of frame (camera move).
function Shot({
  start, end, src,
  from = { scale: 1, x: 0, y: 0 },
  to = { scale: 1.1, x: 0, y: 0 },
  fadeIn = 0.6, fadeOut = 0.6,
  objectPosition = 'center',
  ease = Easing.linear,
  z = 1,
  children,
}) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration, progress }) => {
        const p = ease(progress);
        const scale = from.scale + (to.scale - from.scale) * p;
        const x = from.x + (to.x - from.x) * p;
        const y = from.y + (to.y - from.y) * p;
        let opacity = 1;
        if (localTime < fadeIn) opacity = Easing.easeOutQuad(localTime / fadeIn);
        else if (localTime > duration - fadeOut) opacity = Easing.easeInQuad((duration - localTime) / fadeOut);
        return (
          <div style={{ position: 'absolute', inset: 0, opacity, zIndex: z, overflow: 'hidden', background: '#06181d' }}>
            <img
              src={src} alt=""
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'cover', objectPosition,
                transform: `scale(${scale}) translate(${x}%, ${y}%)`,
                transformOrigin: 'center',
                willChange: 'transform, opacity',
              }}
            />
            {children}
          </div>
        );
      }}
    </Sprite>
  );
}

// ── Colorway caption (small, elegant, bottom-left) ──────────────────────────
function ColorCaption({ start, end, label, num }) {
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const inT = Easing.easeOutCubic(clamp(localTime / 0.7, 0, 1));
        const outT = Easing.easeInCubic(clamp((localTime - (duration - 0.5)) / 0.5, 0, 1));
        const opacity = inT * (1 - outT);
        return (
          <div style={{
            position: 'absolute', left: 72, bottom: 150, zIndex: 30,
            opacity, transform: `translateY(${(1 - inT) * 26}px)`,
            color: reelColors.paper,
            textShadow: '0 2px 24px rgba(8,25,30,0.55)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ width: 56, height: 1, background: reelColors.aquaPale, opacity: 0.9 }}></div>
              <div style={{ fontFamily: reelFonts.mono, fontSize: 24, letterSpacing: '0.34em', textTransform: 'uppercase' }}>{num}</div>
            </div>
            <div style={{ fontFamily: reelFonts.display, fontSize: 104, fontWeight: 500, fontStyle: 'italic', lineHeight: 1.05, marginTop: 14 }}>
              {label}
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ── Aqua wipe transition ────────────────────────────────────────────────────
function AquaWipe({ start, dur = 0.9 }) {
  return (
    <Sprite start={start} end={start + dur}>
      {({ progress }) => {
        const p = Easing.easeInOutQuart(progress);
        // diagonal band sweeps across the frame
        const x = -130 + 260 * p;
        return (
          <div style={{ position: 'absolute', inset: 0, zIndex: 60, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', top: '-25%', bottom: '-25%',
              left: `${x}%`, width: '130%',
              background: `linear-gradient(105deg, transparent 0%, ${reelColors.aqua} 18%, ${reelColors.ocean} 50%, ${reelColors.aqua} 82%, transparent 100%)`,
              transform: 'skewX(-8deg)',
            }}></div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ── Scene 1: apertura ───────────────────────────────────────────────────────
function SceneOpen() {
  return (
    <React.Fragment>
      <Shot
        start={0} end={5.6}
        src="assets/photos/tray-hero-woman.jpg"
        from={{ scale: 1.18, x: 0, y: 2 }} to={{ scale: 1.0, x: 0, y: 0 }}
        ease={Easing.easeOutSine}
        fadeIn={0.8} fadeOut={0.7}
        objectPosition="center 30%"
      />
      {/* soft vignette only behind the logo moment, fades away */}
      <Sprite start={0} end={5.6}>
        {({ localTime }) => {
          const a = animate({ from: 0, to: 0.5, start: 0.6, end: 1.6 })(localTime) *
                    animate({ from: 1, to: 0, start: 4.2, end: 5.2 })(localTime);
          return <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'radial-gradient(ellipse at center 22%, rgba(8,25,30,0.72) 0%, rgba(8,25,30,0) 58%)', opacity: a }}></div>;
        }}
      </Sprite>
      <Sprite start={0.9} end={5.2}>
        {({ localTime, duration }) => {
          const inT = Easing.easeOutCubic(clamp(localTime / 1.0, 0, 1));
          const outT = Easing.easeInCubic(clamp((localTime - (duration - 0.6)) / 0.6, 0, 1));
          return (
            <div style={{
              position: 'absolute', left: 0, right: 0, top: '13%', zIndex: 20,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40,
              opacity: inT * (1 - outT),
              transform: `translateY(${(1 - inT) * 30}px) scale(${0.96 + 0.04 * inT})`,
            }}>
              <img src="assets/logo-lockup-white.png" alt="Aqua Signature" style={{ width: 380, filter: 'drop-shadow(0 4px 28px rgba(8,25,30,0.75))' }} />
              <div style={{
                fontFamily: reelFonts.mono, fontSize: 26, letterSpacing: '0.42em', textTransform: 'uppercase',
                color: reelColors.aquaPale, textShadow: '0 2px 18px rgba(8,25,30,0.6)', textIndent: '0.42em',
              }}>
                La Bandeja Flotante
              </div>
            </div>
          );
        }}
      </Sprite>
    </React.Fragment>
  );
}

// ── Scene 2: colorway Natural ───────────────────────────────────────────────
function SceneNatural() {
  return (
    <React.Fragment>
      <Shot
        start={5.2} end={9.2}
        src="assets/photos/tray-aerial-sun.jpg"
        from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.16, x: -1.5, y: 1 }}
        fadeIn={0.7} fadeOut={0.6}
      />
      <Shot
        start={8.8} end={12.4}
        src="assets/photos/tray-charcuterie.jpg"
        from={{ scale: 1.16, x: 2, y: -1 }} to={{ scale: 1.0, x: 0, y: 0 }}
        ease={Easing.easeOutSine}
        fadeIn={0.6} fadeOut={0.6} z={2}
      />
      <Shot
        start={12.0} end={15.4}
        src="assets/photos/tray-hand-pool.jpg"
        from={{ scale: 1.14, x: -2.5, y: 0 }} to={{ scale: 1.14, x: 2.5, y: 0 }}
        fadeIn={0.6} fadeOut={0.9} z={3}
      />
      <ColorCaption start={5.9} end={14.6} num="Color 01" label="Ébano" />
    </React.Fragment>
  );
}

// ── Scene 3: colorway Turquesa ──────────────────────────────────────────────
function SceneTurquesa() {
  return (
    <React.Fragment>
      <AquaWipe start={14.7} dur={1.0} />
      <Shot
        start={15.1} end={19.8}
        src="assets/photos/tray-turquoise-empty.jpg"
        from={{ scale: 1.0, x: 0, y: 0 }} to={{ scale: 1.16, x: 0, y: -1.5 }}
        fadeIn={0.25} fadeOut={0.6} z={4}
        objectPosition="center 45%"
      />
      <Shot
        start={19.4} end={24.8}
        src="assets/photos/tray-turquoise-breakfast.jpg"
        from={{ scale: 1.16, x: -1.5, y: 1.5 }} to={{ scale: 1.0, x: 0, y: 0 }}
        ease={Easing.easeOutSine}
        fadeIn={0.6} fadeOut={0.5} z={5}
        objectPosition="center 60%"
      />
      <ColorCaption start={15.5} end={24.0} num="Color 02" label="Turquesa" />
    </React.Fragment>
  );
}

// ── Scene 4: ritmo — cortes rápidos ─────────────────────────────────────────
function SceneCuts() {
  const cuts = [
    { src: 'assets/photos/tray-aerial-sun.jpg', start: 24.5, end: 25.4, from: { scale: 1.45, x: 2, y: 2 }, to: { scale: 1.55, x: 1, y: 1 } },
    { src: 'assets/photos/tray-turquoise-breakfast-sun.jpg', start: 25.4, end: 26.3, from: { scale: 1.4, x: 0, y: 6 }, to: { scale: 1.5, x: 0, y: 4 } },
    { src: 'assets/photos/tray-float-leaves.jpg', start: 26.3, end: 27.3, from: { scale: 1.06, x: 0, y: 0 }, to: { scale: 1.16, x: 0, y: 0 } },
  ];
  return (
    <React.Fragment>
      {cuts.map((c, i) => (
        <Shot
          key={i} start={c.start} end={c.end} src={c.src}
          from={c.from} to={c.to}
          fadeIn={i === 0 ? 0.35 : 0.06} fadeOut={i === cuts.length - 1 ? 0.6 : 0.06}
          z={7 + i}
        />
      ))}
    </React.Fragment>
  );
}

// ── Scene 5: cierre de marca ────────────────────────────────────────────────
function SceneClose() {
  return (
    <Sprite start={27.1} end={30}>
      {({ localTime }) => {
        const bgIn = animate({ from: 0, to: 1, start: 0, end: 0.7 })(localTime);
        const logoIn = Easing.easeOutCubic(clamp((localTime - 0.4) / 0.9, 0, 1));
        const lineIn = Easing.easeOutCubic(clamp((localTime - 1.1) / 0.8, 0, 1));
        return (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 40, opacity: bgIn,
            background: '#FFFFFF',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 56,
          }}>
            <img
              src="assets/logo-lockup-color.png" alt="Aqua Signature"
              style={{
                width: 460, opacity: logoIn,
                transform: `scale(${0.92 + 0.08 * logoIn})`,
              }}
            />
            <div style={{
              opacity: lineIn, transform: `translateY(${(1 - lineIn) * 18}px)`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 26,
            }}>
              <div style={{ width: 64, height: 1, background: reelColors.aqua }}></div>
              <div style={{ fontFamily: reelFonts.mono, fontSize: 28, letterSpacing: '0.3em', color: reelColors.ocean, textIndent: '0.3em' }}>
                @aquasignaturerd
              </div>
            </div>
          </div>
        );
      }}
    </Sprite>
  );
}

// ── Timestamp label for comments ────────────────────────────────────────────
function ScreenLabeller() {
  const time = useTime();
  React.useEffect(() => {
    const el = document.getElementById('root');
    if (el) el.setAttribute('data-screen-label', 'reel t=' + Math.floor(time) + 's');
  }, [Math.floor(time)]);
  return null;
}

// ── Root ────────────────────────────────────────────────────────────────────
function ReelApp() {
  // Preload every photo before the show starts so no frame is ever empty
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    const srcs = [
      'assets/photos/tray-hero-woman.jpg',
      'assets/photos/tray-aerial-sun.jpg',
      'assets/photos/tray-charcuterie.jpg',
      'assets/photos/tray-hand-pool.jpg',
      'assets/photos/tray-turquoise-empty.jpg',
      'assets/photos/tray-turquoise-breakfast.jpg',
      'assets/photos/tray-turquoise-breakfast-sun.jpg',
      'assets/photos/tray-float-leaves.jpg',
      'assets/logo-lockup-white.png',
      'assets/logo-lockup-color.png',
    ];
    let left = srcs.length;
    const after = () => { left -= 1; if (left <= 0) setReady(true); };
    srcs.forEach((s) => {
      const im = new Image();
      im.onload = after; im.onerror = after;
      im.src = s;
    });
    const fallback = setTimeout(() => setReady(true), 6000);
    return () => clearTimeout(fallback);
  }, []);

  if (!ready) {
    return (
      <div style={{
        position: 'absolute', inset: 0, background: '#06181d',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#DCF2F6', fontFamily: '"JetBrains Mono", monospace',
        fontSize: 15, letterSpacing: '0.3em', textTransform: 'uppercase',
      }}>
        Cargando…
      </div>
    );
  }

  return (
    <Stage width={REEL_W} height={REEL_H} duration={REEL_DUR} background="#06181d" persistKey="reel-bandeja">
      <ScreenLabeller />
      <SceneOpen />
      <SceneNatural />
      <SceneTurquesa />
      <SceneCuts />
      <SceneClose />
    </Stage>
  );
}

Object.assign(window, { ReelApp });
