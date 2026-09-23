/**
 * useEcoSlider — reference React port of the "Beyond the individual" slider
 * (Centium Landing.dc.html: ecoPos state, _ecoPaint, _ecoCommitPaint,
 * ecoPointer*, ecoKeyDown, _ecoFit, _equaliseEcoPanes, initEcoReveal).
 *
 * Split of responsibility:
 *  - React state `pos` (-1 | 1) drives every COMMITTED style (bar colours,
 *    title inks, caps, knob colour, pane chrome) — see README §5 table.
 *  - Everything that moves per pointer frame (knob left, both clip-paths, the
 *    seam) and everything the fit loop measures is written straight to the DOM
 *    through refs. Never route those through state: the fit loop sets an
 *    attribute and reads offsetHeight synchronously.
 *
 * Needs eco-slider.css loaded globally and the markup contract in README §3.
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type EcoPos = -1 | 1; // -1 = Professionals (default), 1 = Businesses

const MOBILE_MQ = "(max-width:1023px)";
const NAV = 72;
const MARGIN = 24;          // room = vh − NAV − MARGIN
const TIERS = 8;            // data-eco-shed tiers defined in eco-slider.css
const BACKFILL = ["4", "3", "6", "2", "1", "5", "7"]; // graphic-first restore order
const EASE = "cubic-bezier(.22,1,.36,1)";

export function useEcoSlider(initial: EcoPos = -1) {
  const [pos, setPos] = useState<EcoPos>(initial);
  const posRef = useRef<EcoPos>(initial);
  posRef.current = pos;

  const stage = useRef<HTMLDivElement>(null); // #eco-stage
  const deck = useRef<HTMLDivElement>(null);  // #eco-deck
  const track = useRef<HTMLDivElement>(null); // #eco-track
  const knob = useRef<HTMLDivElement>(null);  // #eco-slider
  const seam = useRef<HTMLDivElement>(null);  // [data-eco-seam]

  const drag = useRef({ active: false, startX: 0, startPos: initial as number, span: 150, moved: 0, live: null as number | null });
  const seamAt = useRef(0);
  const seamTimer = useRef<number | null>(null);

  // ---- paint: knob, wipes, seam. p ∈ [-1, 1]. Idempotent. ------------------
  const paint = useCallback((p: number, dragging: boolean) => {
    const t = (p + 1) / 2;
    const k = knob.current;
    if (k) {
      k.style.left = (50 + p * 50).toFixed(3) + "%";
      k.style.transform = "translate(-50%,-50%)";
      k.style.transition = dragging ? "none" : `left .42s ${EASE},box-shadow .3s`;
    }
    const d = deck.current;
    if (d) {
      const pro = d.querySelector<HTMLElement>('[data-eco-wipe="pro"]');
      const biz = d.querySelector<HTMLElement>('[data-eco-wipe="biz"]');
      if (pro) { pro.style.clipPath = `inset(0px 0px 0px ${(t * 100).toFixed(2)}%)`; pro.style.transition = dragging ? "none" : ""; }
      if (biz) { biz.style.clipPath = `inset(0px ${((1 - t) * 100).toFixed(2)}% 0px 0px)`; biz.style.transition = dragging ? "none" : ""; }
    }
    const s = seam.current;
    if (s) {
      const bizSide = posRef.current >= 0;
      s.style.left = (t * 100).toFixed(2) + "%";
      s.style.top = "0px";
      s.style.color = bizSide ? "#2F5F58" : "#4E3894";
      s.style.boxShadow = "0 0 14px " + (bizSide ? "rgba(47,95,88,.32)" : "rgba(78,56,148,.32)");
      const commitLive = seamAt.current && Date.now() - seamAt.current < 560;
      s.style.transition = dragging ? "opacity .12s linear" : `left .52s ${EASE},opacity .26s linear`;
      s.style.opacity = dragging || commitLive ? "1" : "0";
      if (commitLive && !dragging) {
        if (seamTimer.current) clearTimeout(seamTimer.current);
        seamTimer.current = window.setTimeout(() => { seamTimer.current = null; paint(posRef.current, false); }, 580);
      }
    }
  }, []);

  const commit = useCallback((v: EcoPos, armSeam = true) => {
    if (armSeam) seamAt.current = Date.now();
    posRef.current = v;
    setPos(v);
    paint(v, false); // same frame — don't wait for the render
  }, [paint]);

  // ---- pointer + keyboard ---------------------------------------------------
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    d.active = true; d.moved = 0; d.startX = e.clientX; d.startPos = posRef.current; d.live = null;
    d.span = Math.max(60, (track.current?.getBoundingClientRect().width ?? 172) / 2);
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
    e.preventDefault();
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    d.moved = Math.abs(dx);
    d.live = Math.max(-1, Math.min(1, d.startPos + dx / d.span));
    paint(d.live, true); // no setState per frame
  }, [paint]);
  const onPointerUp = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const p = d.live ?? posRef.current;
    d.live = null;
    // tap flips; a drag lands on the side it ended nearest (two stops only)
    if (d.moved < 4) commit(d.startPos < 0 ? 1 : -1);
    else commit(p < 0 ? -1 : 1);
  }, [commit]);
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowLeft" || e.key === "Home") { e.preventDefault(); commit(-1); }
    else if (e.key === "ArrowRight" || e.key === "End") { e.preventDefault(); commit(1); }
    else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(posRef.current < 0 ? 1 : -1); }
  }, [commit]);
  const titleProps = (side: EcoPos) => ({
    role: "button" as const,
    tabIndex: 0,
    onClick: () => commit(side),
    onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); commit(side); } },
  });

  // ---- fit (mobile only) ----------------------------------------------------
  const fit = useCallback(() => {
    const st = stage.current, dk = deck.current;
    if (!st || !dk) return;
    // reset everything the previous pass wrote
    st.querySelectorAll<HTMLElement>("[data-eco-bars],[data-eco-plot]").forEach((c) => c.style.removeProperty("--eco-grow"));
    st.querySelectorAll("[data-ekeep]").forEach((e) => e.removeAttribute("data-ekeep"));
    if (!window.matchMedia(MOBILE_MQ).matches) { st.removeAttribute("data-efit"); return; }

    const room = Math.max(240, window.innerHeight - NAV - MARGIN);
    const wipes = Array.from(dk.querySelectorAll<HTMLElement>("[data-eco-wipe]"));
    const chrome = () => st.offsetHeight - dk.offsetHeight;
    // content height, not the clip's: identical whichever side is showing
    const needOf = (wp: HTMLElement) => {
      const clip = wp.querySelector<HTMLElement>("[data-eco-clip]");
      const inner = clip?.firstElementChild as HTMLElement | null;
      return inner ? chrome() + wp.offsetHeight - clip!.offsetHeight + inner.offsetHeight : 0;
    };
    const need = () => Math.max(...wipes.map(needOf));

    // 1) shared tiers until the taller panel fits
    const levels: number[] = [];
    st.setAttribute("data-efit", "");
    while (levels.length < TIERS && need() > room) {
      levels.push(levels.length + 1);
      st.setAttribute("data-efit", levels.join(" "));
    }
    // 2) per-panel back-fill, graphics first
    const hidden = (el: Element) => (el as HTMLElement).offsetParent === null && getComputedStyle(el).display === "none";
    if (levels.length) for (const wp of wipes) {
      for (let pass = 0; pass < 2; pass++) {
        let changed = false;
        for (const tier of BACKFILL) {
          wp.querySelectorAll(`[data-eco-shed="${tier}"]`).forEach((el) => {
            if (el.hasAttribute("data-ekeep") || !hidden(el)) return;
            el.setAttribute("data-ekeep", "");
            if (hidden(el) || needOf(wp) > room) el.removeAttribute("data-ekeep");
            else changed = true;
          });
        }
        if (!changed) break;
      }
    }
    // 3) leftover height → the visible chart (bars: +px, cap 110; plot: +px, cap 150)
    for (const wp of wipes) {
      const scr = wp.querySelector<HTMLElement>("[data-eco-screen]");
      if (!scr) continue;
      const cs = getComputedStyle(scr);
      const gap = parseFloat(cs.rowGap) || 8;
      let used = 0, n = 0;
      for (let c = scr.firstElementChild as HTMLElement | null; c; c = c.nextElementSibling as HTMLElement | null) {
        if (!c.offsetParent) continue;
        used += c.getBoundingClientRect().height; n++;
      }
      const spare = Math.floor(scr.clientHeight - (parseFloat(cs.paddingTop) || 0) - (parseFloat(cs.paddingBottom) || 0) - used - gap * Math.max(0, n - 1));
      if (spare < 12) continue;
      const bars = wp.querySelector<HTMLElement>("[data-eco-bars]");
      const plot = wp.querySelector<HTMLElement>("[data-eco-plot]");
      if (bars && bars.offsetParent) bars.style.setProperty("--eco-grow", Math.min(spare, 110) + "px");
      else if (plot && plot.offsetParent) plot.style.setProperty("--eco-grow", Math.min(spare, 150) + "px");
    }
  }, []);

  // ---- both panels share one cell: equal min-height (desktop + mobile) ------
  const equalise = useCallback(() => {
    const dk = deck.current;
    if (!dk) return;
    const cards = Array.from(dk.querySelectorAll<HTMLElement>("[data-eco-wipe] > div"));
    cards.forEach((c) => (c.style.minHeight = ""));
    const max = Math.max(0, ...cards.map((c) => Math.ceil(c.getBoundingClientRect().height)));
    if (max) cards.forEach((c) => (c.style.minHeight = max + "px"));
  }, []);

  // after every commit render: re-assert the committed paint, then measure
  useLayoutEffect(() => { paint(pos, false); fit(); equalise(); }, [pos, paint, fit, equalise]);

  useEffect(() => {
    let rq = 0;
    const recompute = () => { rq = 0; fit(); equalise(); paint(posRef.current, false); };
    // Mobile browsers fire `resize` when the address bar/toolbar shows or
    // hides during scroll -- that changes innerHeight only, never width, but
    // fit()'s `room` (line ~129) is keyed on innerHeight. Treating every
    // resize as a real layout change meant scrolling alone could re-run the
    // shed/backfill pass with a different `room` and visibly reshape the
    // card -- "changes shape" without the user resizing anything. A real
    // resize or orientation change always changes innerWidth; a bare
    // toolbar show/hide never does, so width is what actually gates a refit.
    let lastWidth = window.innerWidth;
    const onResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      if (!rq) rq = requestAnimationFrame(recompute);
    };
    window.addEventListener("resize", onResize);
    document.fonts?.ready.then(() => { if (!rq) rq = requestAnimationFrame(recompute); }).catch(() => {});
    return () => { window.removeEventListener("resize", onResize); if (rq) cancelAnimationFrame(rq); if (seamTimer.current) clearTimeout(seamTimer.current); };
  }, [fit, equalise, paint]);

  // ---- caption reveal: each [data-eco-mod]'s captions fade up, 120ms stagger
  useEffect(() => {
    const st = stage.current;
    if (!st || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const mods = Array.from(st.querySelectorAll<HTMLElement>("[data-eco-mod]"));
    mods.forEach((m) => m.querySelectorAll<HTMLElement>("[data-eco-caption]").forEach((el) => {
      el.style.opacity = "0"; el.style.transform = "translateY(7px)";
    }));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.querySelectorAll<HTMLElement>("[data-eco-caption]").forEach((el, n) => {
        const d = n * 120 + "ms";
        el.style.transition = `opacity .5s ${EASE} ${d},transform .5s ${EASE} ${d}`;
        el.style.opacity = "1"; el.style.transform = "none";
      });
      io.unobserve(en.target);
    }), { rootMargin: "-70px 0px -70px 0px" });
    mods.forEach((m) => io.observe(m));
    return () => io.disconnect();
  }, []);

  return {
    pos,
    refs: { stage, deck, track, knob, seam },
    knobProps: {
      role: "slider" as const, tabIndex: 0,
      "aria-label": "Slide toward professionals or businesses",
      "aria-valuemin": -1, "aria-valuemax": 1, "aria-valuenow": pos,
      "aria-valuetext": pos < 0 ? "Professionals detail shown" : "Businesses detail shown",
      onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp, onLostPointerCapture: onPointerUp, onKeyDown,
    },
    titleProps,
  };
}
