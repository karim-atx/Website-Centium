/**
 * usePersonaArc — reference React port of the approved persona arc
 * (Centium Landing.dc.html: responsive persona block + initPersonaArc +
 * _personaPhase). Drop-in replacement for the old effect in
 * components/PersonaArc.tsx.
 *
 * All geometry is written straight to the DOM through refs, in the same
 * callback that computed it. Never route transforms, sizes or the active
 * index through React state: the fit pass writes a transform and reads the
 * rendered rect synchronously, and a render in between measures stale
 * layout.
 *
 * Markup contract: handoff README §3 (#traits-track, #traits-section,
 * [data-persona-stage], #persona-wrap, [data-persona-card] ×4 with
 * [data-persona-art] > [data-persona-artbox], [data-persona-title] (starts
 * with the svg[data-persona-rule]) and [data-persona-body]).
 *
 * Ported verbatim from the handoff's usePersonaArc.ts reference hook — no
 * behavior changes, per this repo's standing rule for adopting a handoff's
 * reference hook as-is (same as the pillar-rail/eco-slider rounds).
 */
import { useLayoutEffect, useRef } from "react";

const PIN_TOP = 72;
const EASE = "cubic-bezier(.22,1,.36,1)";
const TINT = (i: number) => (i % 2 === 0 ? "125,103,217" : "94,158,149"); // purple / teal

export function usePersonaArc() {
  const track = useRef<HTMLDivElement>(null); // #traits-track
  const section = useRef<HTMLDivElement>(null); // #traits-section
  const stage = useRef<HTMLDivElement>(null); // [data-persona-stage]
  const wrap = useRef<HTMLDivElement>(null); // #persona-wrap

  useLayoutEffect(() => {
    const tr = track.current, sec = section.current, stg = stage.current, wr = wrap.current;
    if (!tr || !sec || !stg || !wr) return;
    const cards = Array.from(wr.querySelectorAll<HTMLElement>("[data-persona-card]"));
    const arts = cards.map((c) => c.querySelector<HTMLElement>("[data-persona-art]"));
    const count = cards.length;
    if (!count) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ---- (A) size cards, art boxes, stage, type (every resize) -------------
    const size = () => {
      const vh = window.innerHeight;
      const cardW = Math.round(Math.max(320, Math.min(stg.clientWidth * 0.42, 540)));
      cards.forEach((c) => { c.style.width = cardW + "px"; c.style.marginLeft = Math.round(-cardW / 2) + "px"; });
      // art box: target cardW*0.34, but never shorter than its tallest content
      const boxes = Array.from(wr.querySelectorAll<HTMLElement>("[data-persona-artbox]"));
      let artH = Math.round(cardW * 0.34);
      boxes.forEach((b) => { b.style.height = "auto"; artH = Math.max(artH, b.scrollHeight); });
      boxes.forEach((b) => { b.style.height = artH + "px"; });
      const stageH = Math.round(Math.min(Math.max(artH + 510, 600), vh * 0.95));
      const titlePx = Math.round(Math.max(20, Math.min(cardW * 0.088, 44)));
      const bodyPx = Math.round(Math.max(13, Math.min(cardW * 0.031, 16)));
      cards.forEach((c) => {
        const t = c.querySelector<HTMLElement>("[data-persona-title]");
        const bd = c.querySelector<HTMLElement>("[data-persona-body]");
        const pad = parseFloat(getComputedStyle(c).paddingLeft) || 12;
        if (t) {
          Object.assign(t.style, {
            fontSize: titlePx + "px", lineHeight: "1.06", letterSpacing: "-.03em",
            marginTop: "0px", marginLeft: -pad + "px", marginRight: -pad + "px",
            paddingLeft: pad + "px", paddingRight: pad + "px", borderTop: "0",
            paddingTop: Math.max(8, Math.round(titlePx * 0.22)) + "px",
            transition: `opacity .6s ${EASE},color .6s ${EASE}`,
          });
        }
        if (bd) { bd.style.fontSize = bodyPx + "px"; bd.style.marginTop = Math.round(bodyPx * 0.5) + "px"; }
      });
      Object.assign(stg.style, { height: stageH + "px", paddingTop: "0px", paddingBottom: "0px", boxSizing: "content-box" });
      stg.dataset.prefH = String(stageH);
    };

    if (reduce) {
      size();
      sec.style.position = "static";
      cards.forEach((c, i) => {
        c.style.transform = `translate3d(${(i - Math.floor(count / 2)) * 328}px,0,0)`;
        c.style.opacity = "1"; c.style.filter = "none";
      });
      return;
    }

    let active = 0, painted = -1, pinTop: number | null = null;

    // ---- (C1) fan geometry, fitted to the RENDERED boxes --------------------
    const paintArc = (act: number) => {
      const cardW = cards[0].offsetWidth || 338;
      const wrapH = wr.clientHeight || 452;
      const stageW = wr.clientWidth || cardW * 3;
      const stepX = Math.round(Math.min(cardW + 34, Math.max(cardW * 0.52, stageW * 0.3)));
      const geom = (i: number) => {
        const slot = i - act, d = Math.abs(slot);
        return { slot, d, scale: Math.max(0.68, 1 - d * 0.11), tilt: slot * (7 + d * 3.5),
          originX: slot === 0 ? "50%" : slot < 0 ? "88%" : "12%" };
      };
      const rawY = (slot: number) => {
        const d = Math.abs(slot), t = count > 1 ? slot / (count - 1) : 0;
        return Math.round(wrapH * 0.2) * (1 - Math.cos((t * Math.PI) / 2)) + d * d * 6;
      };
      const layOut = (ys: number[]) => cards.forEach((c, i) => {
        const g = geom(i);
        c.style.transformOrigin = g.originX + " 42%";
        c.style.transform = `translate3d(${Math.round(g.slot * stepX)}px,${ys[i] || 0}px,0) rotate(${g.tilt}deg) scale(${g.scale})`;
      });
      const ys = cards.map((_, i) => Math.round(rawY(i - act)));
      // measure pass with transitions OFF (a live transition returns the in-flight rect)
      const saved = cards.map((c) => c.style.transition);
      const prev = cards.map((c) => c.style.transform);
      cards.forEach((c) => (c.style.transition = "none"));
      layOut(ys);
      void wr.offsetHeight;
      const limit = stg.getBoundingClientRect().bottom;
      cards.forEach((c, i) => {
        const over = c.getBoundingClientRect().bottom - limit;
        if (over > 0.5) ys[i] = Math.max(-46, ys[i] - Math.ceil(over)); // lift into the top slack
      });
      // rewind so the real write below still eases
      cards.forEach((c, i) => (c.style.transform = prev[i]));
      void wr.offsetHeight;
      cards.forEach((c, i) => (c.style.transition = saved[i]));
      layOut(ys);
      cards.forEach((c, i) => {
        const { d } = geom(i), tint = TINT(i);
        c.style.filter = d === 0 ? "none" : `grayscale(1) contrast(.9) brightness(1.03) blur(${(d * 0.9).toFixed(1)}px)`;
        c.style.opacity = d === 0 ? "1" : d === 1 ? ".72" : d === 2 ? ".44" : ".26";
        c.style.zIndex = String(20 - d);
        const ring = "inset 0 0 0 1px " + (d === 0 ? `rgba(${tint},.30)` : "rgba(34,30,26,.09)");
        c.style.boxShadow = d === 0
          ? `${ring},0 0 0 1px rgba(${tint},.34),0 0 28px rgba(${tint},.5),0 18px 44px rgba(${tint},.42),0 30px 76px rgba(${tint},.28)`
          : `${ring},0 8px 20px rgba(72,58,130,.07)`;
      });
    };

    // ---- (C2) focus paint: art, title, body, card surface -------------------
    const paintFocus = (act: number) => {
      cards.forEach((c, i) => {
        const on = i === act, art = arts[i];
        if (art) {
          art.style.transform = on ? "scale(1.04)" : "scale(.975)";
          art.style.filter = on ? "saturate(2.1) contrast(1.14) brightness(1.03)" : "grayscale(1) contrast(.82) brightness(1.16) opacity(.3)";
          art.style.boxShadow = on ? "0 18px 40px rgba(72,58,130,.22)" : "none";
          art.style.cursor = "default";
        }
        const t = c.querySelector<HTMLElement>("[data-persona-title]");
        const b = c.querySelector<HTMLElement>("[data-persona-body]");
        if (t) t.style.opacity = on ? "1" : ".42";
        if (b) { b.style.opacity = on ? "1" : ".42"; b.style.color = on ? "#3B352D" : "#5B5349"; }
        c.style.background = on ? "#FFFFFF" : "#FDFCFB";
        c.style.borderColor = on ? `rgba(${TINT(i)},.42)` : "#EDEAE4";
      });
    };

    // ---- (C3) fit + pin + track (README §5) --------------------------------
    const EDGE = 16, WRAP_TOP = 96, WRAP_MIN = 56;
    let fitKey = "";
    const measurePin = () => {
      const vh = window.innerHeight, vw = window.innerWidth;
      let cardH = 0;
      cards.forEach((c) => (cardH = Math.max(cardH, c.offsetHeight)));
      cardH += 24; // focused card paints ~23px taller than its layout box
      const pref = parseFloat(stg.dataset.prefH || "") || stg.offsetHeight;
      const key = vh + "x" + vw + "x" + cardH + "x" + pref;
      if (key !== fitKey) {
        fitKey = key;
        sec.style.paddingTop = "30px";
        let stageOff = 0;
        for (let el: HTMLElement | null = stg; el && el !== sec; el = el.offsetParent as HTMLElement | null) stageOff += el.offsetTop;
        let wrapTop = WRAP_TOP, top = PIN_TOP;
        const bottomAt = (t: number, wt: number) => t + stageOff + wt + cardH;
        if (bottomAt(PIN_TOP, wrapTop) > vh - EDGE) wrapTop = Math.max(WRAP_MIN, vh - EDGE - PIN_TOP - stageOff - cardH);
        if (bottomAt(PIN_TOP, wrapTop) > vh - EDGE) {
          wrapTop = WRAP_MIN;
          const cardTop = PIN_TOP + Math.max(EDGE, Math.round((vh - PIN_TOP - cardH) / 2));
          top = Math.round(cardTop - stageOff - wrapTop);
        }
        wr.style.top = wrapTop + "px";
        const fitted = wrapTop !== WRAP_TOP || top !== PIN_TOP;
        stg.style.height = (fitted ? Math.round(Math.max(wrapTop + cardH + EDGE, Math.min(pref, vh - 8 - (top + stageOff)))) : pref) + "px";
        pinTop = top; sec.style.position = "sticky"; sec.style.top = top + "px";
      }
      const want = sec.offsetHeight + Math.round(vh * 0.62) * (count - 1);
      if (tr.style.height !== want + "px") tr.style.height = want + "px";
      // Cached here, not recomputed per scroll event (see activeNow) --
      // offsetHeight on tr/sec forces a synchronous layout, same as every
      // other read in this function. span only actually changes when
      // measurePin's own inputs (vh/vw/cardH/pref) do, i.e. on resize.
      cachedSpan = Math.max(1, tr.offsetHeight - sec.offsetHeight + (pinTop || 0));
    };
    // Reported as a continuous stutter through scroll on iPhone -- both
    // Safari and Chrome, which share the same WebKit engine on iOS, so a
    // Safari-specific quirk was ruled out. Traced to here: activeNow() used
    // to call measurePin() -- ~8 forced-synchronous-layout reads (4 cards'
    // offsetHeight, stage/section/track offsetHeight, a
    // getBoundingClientRect) -- on every single 'scroll' event, unthrottled,
    // for as long as this component is mounted. On a single-page site that's
    // effectively the whole session, so it ran on every scroll anywhere on
    // the page, not just while this section was in view -- matching "the
    // whole time," not something localized to one section. Forced
    // synchronous layout is comparatively cheap on Chromium/Blink (never
    // reproduced there in testing) but WebKit's layout engine is documented
    // to handle it worse, especially on real phone hardware rather than a
    // desktop testing machine.
    //
    // The span/cardH/pref geometry this depends on only actually changes on
    // resize, mount, or a font-load reflow (README §5's own "recompute the
    // fit only when vh×vw×cardH×prefH changes") -- never merely from
    // scrolling. measurePin() (and its reads) now only runs from repaint(),
    // itself only called on mount/resize/fonts-ready below. The scroll path
    // reuses the cached span and does only the one read that must be
    // current every frame: the track's live position.
    let cachedSpan = 1;
    const activeNow = () => {
      let p = (-tr.getBoundingClientRect().top + (pinTop || 0)) / cachedSpan;
      p = p <= 0 ? 0 : p >= 1 ? 0.999 : p;
      return Math.min(count - 1, Math.max(0, Math.floor(p * count)));
    };

    // synchronous, no rAF latch (a stuck latch froze the arc on card 1 in the design)
    const sync = () => {
      const want = activeNow();
      if (want === painted) return;
      active = painted = want;
      paintArc(active); paintFocus(active);
    };
    const repaint = () => { size(); fitKey = ""; measurePin(); painted = -1; sync(); };

    // ---- (B) keep looping art animations in phase across remounts -----------
    const t0 = performance.now();
    const phase = () => {
      const elapsed = (performance.now() - t0) / 1000;
      cards.forEach((c) => c.querySelectorAll<HTMLElement>("*").forEach((el) => {
        if (el.hasAttribute("data-anim-phased")) return;
        const cs = getComputedStyle(el);
        const dur = parseFloat(cs.animationDuration) || 0;
        if (cs.animationName === "none" || !dur) return;
        el.style.animationDelay = ((parseFloat(cs.animationDelay) || 0) - (elapsed % dur)).toFixed(3) + "s";
        el.setAttribute("data-anim-phased", "1");
      }));
    };

    repaint(); phase();
    document.fonts?.ready.then(repaint).catch(() => {});
    let rq = 0;
    const onResize = () => { if (!rq) rq = requestAnimationFrame(() => { rq = 0; repaint(); phase(); }); };
    window.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", onResize);
    const poll = window.setInterval(sync, 200); // safety net, same as the design
    return () => {
      window.removeEventListener("scroll", sync);
      window.removeEventListener("resize", onResize);
      clearInterval(poll);
      if (rq) cancelAnimationFrame(rq);
    };
  }, []);

  return { track, section, stage, wrap };
}
