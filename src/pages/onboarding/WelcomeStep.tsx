import React, { useEffect, useRef, useState } from "react";
import { MARK_C_PATH, MARK_LEAF_PATH } from "../../components/icons/CentiumMark";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ObPage } from "./shell/ObShell";
import { Composed, MarkSvg, OB, WORDMARK_FULL, Wordmark, type Composition } from "./shell/visuals";
import { t, tk } from "../../i18n/core";

// v6 (OB-001…006 Welcome, OB-033…050 logo animation): SharedOnboardingV4
// screen "welcome" and screen "anim". Replaces the old launch (rings, bloom,
// conic sweep, 750 ms) and the "CENTIUM · a product prototype" line (V6-71).

const PANELS: { eb: string; h: string; s: string; comp: Composition }[] = [
  { eb: tk("For you"), h: tk("Look after your health, all in one place."), s: tk("Food, training, sleep and health metrics, shaped around you."), comp: "personal" },
  { eb: tk("For professionals"), h: tk("Coach and care for every client."), s: tk("Plans, check-ins, messages and progress, without the spreadsheets."), comp: "professional" },
  { eb: tk("For businesses"), h: tk("Run your classes, gym or store."), s: tk("Bookings, members, payments and your listing, in one app."), comp: "business" },
];

/**
 * Key frames of the logo animation (SharedOnboardingV4 `K`), K1 0 ms … K6
 * 1750 ms; K7 (2200 ms) is the sign-up screen with the lockup in its header.
 * a/ty: welcome layer; btn: button scale; leaf/c: stroke-dasharray (pathLength 1);
 * fill: fill opacity; gl/gs: glow opacity/scale; let: wordmark letters shown.
 */
const K = [
  { a: 0.55, ty: -6, btn: 0.97, leaf: "0 1", c: "0 1", fill: 0, gl: 0, gs: 0.6, let: 0 },
  { a: 0, ty: -12, btn: 1, leaf: "0.42 1", c: "0 1", fill: 0, gl: 0, gs: 0.6, let: 0 },
  { a: 0, ty: -12, btn: 1, leaf: "1 0", c: "0.55 1", fill: 0, gl: 0, gs: 0.6, let: 0 },
  { a: 0, ty: -12, btn: 1, leaf: "1 0", c: "1 0", fill: 0.5, gl: 0.25, gs: 0.8, let: 3 },
  { a: 0, ty: -12, btn: 1, leaf: "1 0", c: "1 0", fill: 1, gl: 0.9, gs: 1.15, let: 7 },
  { a: 0, ty: -12, btn: 1, leaf: "1 0", c: "1 0", fill: 1, gl: 0, gs: 1.6, let: 7 },
];
/** When each key frame is reached (ms) and the easing of the stretch that reaches it. */
const AT = [0, 300, 650, 1000, 1350, 1750];
const DRAW = "cubic-bezier(0.65,0,0.35,1)";
const MOVE = "cubic-bezier(0.22,1,0.36,1)";
const TOTAL = 2200;

export const WelcomeStep: React.FC<{
  /** Get started: after the logo animation, Create your account. */
  onGetStarted: () => void;
  /** I already have an account: Sign in. */
  onSignIn: () => void;
}> = ({ onGetStarted, onSignIn }) => {
  const reduced = useReducedMotion();
  const [panel, setPanel] = useState(0);
  /** -1 = idle; 0…5 = K1…K6 reached / being reached; 6 = moving into the header (K7). */
  const [k, setK] = useState(-1);
  const [fadeOut, setFadeOut] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const start = () => {
    if (k >= 0 || fadeOut) return;
    if (reduced) {
      // Reduced motion: a 200 ms crossfade from Welcome to sign-up, no draw or glow.
      setFadeOut(true);
      timers.current.push(window.setTimeout(onGetStarted, 200));
      return;
    }
    setK(0);
    for (let i = 1; i < K.length; i++) timers.current.push(window.setTimeout(() => setK(i), AT[i - 1] + (i === 1 ? 60 : 0)));
    timers.current.push(window.setTimeout(() => setK(6), AT[5]));
    timers.current.push(window.setTimeout(onGetStarted, TOTAL));
  };

  // Swipe between panels (S3: swipe + tap on the dots; no auto-advance).
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t || k >= 0) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) < 40 || Math.abs(dx) < Math.abs(dy)) return;
    setPanel((p) => Math.min(2, Math.max(0, p + (dx < 0 ? 1 : -1))));
  };

  const p = PANELS[panel];
  const kf = k >= 0 ? K[Math.min(k, 5)] : null;
  const dur = k >= 1 && k <= 5 ? AT[k] - AT[k - 1] - (k === 1 ? 60 : 0) : 60;
  const aStyle: React.CSSProperties = fadeOut
    ? { opacity: 0, transition: "opacity 200ms linear" }
    : kf
      ? { opacity: kf.a, transform: `translateY(${kf.ty}px)`, transition: `opacity ${dur}ms ease, transform ${dur}ms ease` }
      : {};

  return (
    <ObPage>
      <div className="ob-welcome" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} style={{ position: "relative", minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
        <div style={{ ...aStyle, flex: 1, display: "flex", flexDirection: "column", visibility: kf && kf.a === 0 && k >= 2 ? "hidden" : undefined }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 9, marginTop: 56 }}>
            <MarkSvg size={26} />
            <Wordmark width={91} height={10} style={{ color: "var(--ob-ink)" }} />
          </div>
          <div style={{ position: "relative", height: 344, marginTop: 112 - 56 - 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {[300, 236, 172].map((s, i) => (
              <span
                key={s}
                aria-hidden
                style={{
                  position: "absolute",
                  insetInlineStart: "50%",
                  top: "50%",
                  width: s,
                  height: s,
                  marginInlineStart: -s / 2,
                  marginTop: -s / 2,
                  borderRadius: 999,
                  border: `1px solid ${i === 0 ? "var(--ob-ring-outer)" : "var(--ob-ring)"}`,
                }}
              />
            ))}
            <span aria-hidden style={{ position: "absolute", insetInlineStart: "50%", top: "50%", width: 220, height: 220, marginBlock: "-110px 0", marginInline: "-110px 0", borderRadius: 999, background: "var(--ob-halo)" }} />
            <Composed key={p.comp} comp={p.comp} w={p.comp === "personal" ? 150 : 230} h={150} style={{ position: "relative" }} />
          </div>
          <div style={{ margin: "22px 28px 0" }} aria-live="polite">
            <p className="ob-eb">{t(p.eb)}</p>
            <h1 style={{ fontSize: 30, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.025em", marginTop: 10, textWrap: "pretty" }} className="ob-welcome-h">
              {t(p.h)}
            </h1>
            <p style={{ fontSize: 15, lineHeight: "23px", fontWeight: 500, color: "var(--ob-ink-soft)", marginTop: 10, maxWidth: 310, textWrap: "pretty" }} className="ob-welcome-s">
              {t(p.s)}
            </p>
          </div>
          <div style={{ flex: 1, minHeight: 24 }} />
          <div style={{ margin: "0 28px 36px" }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 22 }} role="tablist" aria-label={t("Welcome")}>
              {PANELS.map((pp, i) => (
                <button
                  key={pp.eb}
                  type="button"
                  role="tab"
                  aria-selected={i === panel}
                  aria-label={t(pp.eb)}
                  className="hit"
                  onClick={() => setPanel(i)}
                  style={{ height: 6, width: i === panel ? 22 : 6, borderRadius: 999, background: i === panel ? "var(--ob-brand)" : "var(--ob-ring)", transition: "width 240ms cubic-bezier(0.22,1,0.36,1)" }}
                />
              ))}
            </div>
            <button
              type="button"
              className="ob-btn ob-btn-primary"
              onClick={start}
              style={{ height: 56, fontSize: 15.5, letterSpacing: "-0.01em", transform: `scale(${kf ? kf.btn : 1})`, transition: "transform 120ms ease" }}
            >
              {t("Get started")}
            </button>
            <button type="button" onClick={onSignIn} className="hit" style={{ display: "block", width: "100%", textAlign: "center", fontSize: 14, lineHeight: "24px", fontWeight: 700, color: "var(--ob-ink-soft)", marginTop: 16, height: 24 }}>
              {t("I already have an account")}
            </button>
          </div>
        </div>
        {k >= 0 && <LogoAnimation k={k} />}
      </div>
    </ObPage>
  );
};

/** The drawing overlay of the logo animation (SharedOnboardingV4 showLogo). */
const LogoAnimation: React.FC<{ k: number }> = ({ k }) => {
  const kf = K[Math.min(k, 5)];
  const prev = AT[Math.min(k, 5)] - (k >= 1 ? AT[Math.min(k, 5) - 1] : 0);
  const moving = k >= 6;
  const t = `${Math.max(prev, 60)}ms`;
  // K7: the mark moves into the sign-up header: centre (152, 63), 22 px
  // (the lockup of OB-045 sits at 141,52 · 22×22 in the 390 frame).
  const cx = moving ? 152 - 195 : 0;
  const cy = moving ? 63 : 372;
  const size = moving ? 22 : 132;
  return (
    <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      <span
        style={{
          position: "absolute",
          insetInlineStart: "50%",
          top: 372,
          width: 300,
          height: 300,
          marginBlock: "-150px 0", marginInline: "-150px 0",
          borderRadius: 999,
          background: "radial-gradient(circle, var(--ob-glow) 0%, rgba(143,104,246,0) 68%)",
          opacity: moving ? 0 : kf.gl,
          transform: `scale(${kf.gs})`,
          transition: `opacity ${k === 4 ? "450ms ease-out" : `${t} ease`}, transform ${k === 4 ? "450ms ease-out" : `${t} ease`}`,
        }}
      />
      <svg
        viewBox="270 180 690 730"
        style={{
          position: "absolute",
          insetInlineStart: "50%",
          top: cy,
          width: size,
          height: size,
          marginInlineStart: -size / 2 + cx,
          marginTop: -size / 2,
          overflow: "visible",
          transition: moving ? `all 450ms ${MOVE}` : undefined,
        }}
      >
        <path
          d={MARK_LEAF_PATH}
          pathLength={1}
          fill={OB.leaf}
          fillOpacity={kf.fill}
          stroke={OB.brand}
          strokeWidth={7}
          style={{ strokeDasharray: kf.leaf, strokeOpacity: kf.fill >= 1 ? 0 : 1, transition: `stroke-dasharray ${t} ${DRAW}, fill-opacity ${t} ease, stroke-opacity ${t} ease` }}
        />
        <path
          d={MARK_C_PATH}
          pathLength={1}
          fill={OB.brand}
          fillOpacity={kf.fill}
          stroke={OB.brand}
          strokeWidth={7}
          style={{ strokeDasharray: kf.c, strokeOpacity: kf.fill >= 1 ? 0 : 1, transition: `stroke-dasharray ${t} ${DRAW}, fill-opacity ${t} ease, stroke-opacity ${t} ease` }}
        />
      </svg>
      <svg
        viewBox="48 44 1005 93"
        role="img"
        aria-label="Centium"
        style={{ position: "absolute", insetInlineStart: "50%", top: 462, height: 13, width: 140, marginInlineStart: -70, overflow: "visible", color: "var(--ob-ink)" }}
      >
        <g stroke="currentColor" strokeWidth={17} fill="none">
          {WORDMARK_FULL.map((d, i) => (
            <path key={d} d={d} style={{ opacity: !moving && i < kf.let ? 1 : 0, transition: `opacity 200ms ease ${moving ? 0 : Math.max(0, i - (kf.let === 7 ? 3 : 0)) * 40}ms` }} />
          ))}
        </g>
      </svg>
    </div>
  );
};
