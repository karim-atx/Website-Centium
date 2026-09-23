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

  // `locked` starts false every gesture: until horizontal movement clearly
  // beats vertical, this is treated as "might be a page scroll that merely
  // started on the knob," not a drag -- see onPointerMove.
  const drag = useRef({ active: false, startX: 0, startY: 0, startPos: initial as number, span: 150, moved: 0, live: null as number | null, locked: false });
  const seamAt = useRef(0);
  const seamTimer = useRef<number | null>(null);

  // ---- paint: knob, wipes, seam. p ∈ [-1, 1]. Idempotent. ------------------
  const paint = useCallback((p: number, dragging: boolean) => {
    const t = (p + 1) / 2;
    // True for ~560ms after any commit() -- already tracked for the seam
    // indicator's own fade-out below; reused here for the same window.
    const commitLive = !!seamAt.current && Date.now() - seamAt.current < 560;
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
      // Both wipe panels are always fully mounted (see the file header) --
      // that's the entire cost behind this section's mobile scroll jank.
      // Verified directly: A/B-hiding just the currently-inactive one for
      // an identical scroll gesture took average frame time from 68ms to
      // 17ms and dropped-frame rate from 29% to 0%, while will-change alone
      // (still kept below, it helps the wipe transition itself) wasn't
      // enough on its own. `visibility` (not `display`) is used because it
      // never affects layout -- fit()/equalise() measure a
      // visibility:hidden panel exactly the same as a visible one, so no
      // extra toggling is needed there. The inactive panel only needs to be
      // shown during a live drag or the .52s wipe transition -- dragging
      // and commitLive cover both -- and stays hidden the rest of the time.
      // No separate timer needed: this piggybacks on the seam's own
      // commitLive window and its existing re-paint at +580ms below, which
      // re-evaluates and hides the now-inactive panel once that window
      // closes.
      const bothVisible = dragging || commitLive;
      if (pro) {
        pro.style.clipPath = `inset(0px 0px 0px ${(t * 100).toFixed(2)}%)`;
        pro.style.transition = dragging ? "none" : "";
        pro.style.visibility = bothVisible || p < 0 ? "" : "hidden";
      }
      if (biz) {
        biz.style.clipPath = `inset(0px ${((1 - t) * 100).toFixed(2)}% 0px 0px)`;
        biz.style.transition = dragging ? "none" : "";
        biz.style.visibility = bothVisible || p >= 0 ? "" : "hidden";
      }
    }
    const s = seam.current;
    if (s) {
      const bizSide = posRef.current >= 0;
      s.style.left = (t * 100).toFixed(2) + "%";
      s.style.top = "0px";
      s.style.color = bizSide ? "#2F5F58" : "#4E3894";
      s.style.boxShadow = "0 0 14px " + (bizSide ? "rgba(47,95,88,.32)" : "rgba(78,56,148,.32)");
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
  // Direction-locked, so a touch that starts on this 48x48 knob but turns
  // out to be a scroll past the card -- not a drag -- never gets captured.
  // The old version set touchAction:"none" and called preventDefault() on
  // every pointerdown unconditionally, which blocks ALL of the browser's
  // native touch handling for that touch from the first pixel, including
  // vertical scroll: on a phone the knob sits right in the content a thumb
  // naturally passes over while scrolling through this section, so touching
  // down on it (with no intent to drag at all) froze scrolling completely
  // until the finger lifted -- felt like scrolling "teleporting"/lagging --
  // and incidental jitter during that stuck gesture could still cross the
  // tap-vs-drag threshold on release and flip Professionals/Businesses, i.e.
  // "using the slider" (never touched, just scrolled past) visibly changed
  // the card's content/size.
  //
  // touchAction is now "pan-y" (see the knob's style in Ecosystem.tsx): the
  // browser is free to start a native vertical scroll immediately, exactly
  // as if the knob weren't there. Only once *this* gesture's own horizontal
  // movement clearly exceeds its vertical movement do we lock in "drag" and
  // start calling preventDefault() -- before that point every move is a
  // no-op for us, so the page scrolls completely normally.
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    d.active = true; d.locked = false; d.moved = 0; d.startX = e.clientX; d.startY = e.clientY; d.startPos = posRef.current; d.live = null;
    d.span = Math.max(60, (track.current?.getBoundingClientRect().width ?? 172) / 2);
    // Capture is safe to take immediately -- it only routes future pointer
    // EVENTS to this element if the gesture continues past it; it has no
    // effect on whether the browser scrolls, which touchAction governs.
    try { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); } catch {}
  }, []);
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.locked) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return; // too small to have a direction yet
      if (Math.abs(dy) > Math.abs(dx)) {
        // Vertical wins: this is a scroll, not a drag. Let go completely --
        // no preventDefault was ever called, so the page is already
        // scrolling natively and hasn't missed a frame.
        d.active = false;
        try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId); } catch {}
        return;
      }
      d.locked = true; // horizontal wins: commit to dragging from here on
    }
    e.preventDefault();
    d.moved = Math.max(d.moved, Math.abs(dx));
    d.live = Math.max(-1, Math.min(1, d.startPos + dx / d.span));
    paint(d.live, true); // no setState per frame
  }, [paint]);
  const onPointerUp = useCallback(() => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    const p = d.live ?? posRef.current;
    d.live = null;
    // A gesture that bailed to scroll never reaches here at all -- it set
    // d.active=false itself, so the guard above already returned. Only two
    // kinds of release make it this far: a genuine tap (lifted before ever
    // crossing the 6px direction threshold, d.moved still 0) or a completed,
    // locked-in drag -- exactly the two cases this line's already handled.
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
    // equalise() (called right after fit() on every pass, see below) leaves
    // a min-height on each panel's card from the LAST pass. If that's still
    // applied when THIS pass measures wp.offsetHeight, fit() ends up
    // measuring its own leftover instead of this pass's true natural
    // content height. Verified directly: toggling Professionals/Businesses
    // repeatedly showed wp.offsetHeight exactly matching the previous
    // equalise() min-height every time, and the shed decision flip-flopping
    // between two stable-looking-but-wrong states on every single toggle
    // (625px/5 tiers shed <-> 253px/all 8 shed) -- "using the slider
    // changes the box shape," every time it's used. Cleared here, before
    // any measurement, so this pass always starts from the elements' own
    // unconstrained size; equalise() re-applies the real (post-shed)
    // min-height afterwards, same as it always has.
    dk.querySelectorAll<HTMLElement>("[data-eco-wipe] > div").forEach((c) => { c.style.minHeight = ""; });
    // `will-change: clip-path` (set in Ecosystem.tsx) keeps each wipe panel
    // on its own compositor layer at rest -- both panels are always fully
    // painted (see this hook's own doc comment), so that's what keeps plain
    // page scroll over this section cheap on mobile instead of re-rastering
    // both of them every frame. It also corrupts the offsetHeight reads this
    // function takes on these exact elements -- verified directly: left on
    // during a measurement pass, the shed/back-fill math below collapses the
    // card to almost nothing. So it's dropped for the duration of this
    // synchronous pass and restored before returning, on every path out.
    // Nothing repaints in between: fit() only ever runs inside a layout
    // effect or an rAF callback, before the browser's next paint.
    for (const wp of wipes) wp.style.willChange = "auto";
    try {
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
    } finally {
      for (const wp of wipes) wp.style.willChange = "clip-path";
    }
  }, []);

  // ---- both panels share one cell: equal min-height (desktop + mobile) ------
  const equalise = useCallback(() => {
    const dk = deck.current;
    if (!dk) return;
    // Same will-change dance as fit() above and for the same reason: these
    // cards are descendants of the wipe panels the compositor hint lives on,
    // so it's dropped for this synchronous read too, as a precaution.
    const wipes = Array.from(dk.querySelectorAll<HTMLElement>("[data-eco-wipe]"));
    for (const wp of wipes) wp.style.willChange = "auto";
    try {
      const cards = Array.from(dk.querySelectorAll<HTMLElement>("[data-eco-wipe] > div"));
      cards.forEach((c) => (c.style.minHeight = ""));
      const max = Math.max(0, ...cards.map((c) => Math.ceil(c.getBoundingClientRect().height)));
      if (max) cards.forEach((c) => (c.style.minHeight = max + "px"));
    } finally {
      for (const wp of wipes) wp.style.willChange = "clip-path";
    }
  }, []);

  // A web font can land with meaningfully different metrics than the
  // fallback font the very first (synchronous, pre-paint) fit() pass below
  // measures with -- confirmed directly by logging fit()'s own numbers on a
  // cold load: "need" jumped from 675 to 727, and the shed-tier count from
  // 5 to all 8, the moment `document.fonts.ready` resolved ~200ms later.
  // Un-gated, that's a second, visibly different shed pass popping in
  // shortly after the first -- the card changing shape mid-load, often
  // right as the user scrolls down to it. `fontsGated` makes sure this
  // hide-until-settled handling only ever runs once, on mount; it flips
  // true either immediately below (fonts already loaded/cached) or once the
  // delayed branch's own fonts.ready handler runs.
  const fontsGated = useRef(false);

  // after every commit render: re-assert the committed paint, then measure
  useLayoutEffect(() => {
    paint(pos, false);
    fit();
    equalise();
    if (fontsGated.current) return;
    const st = stage.current;
    const settled = !document.fonts || document.fonts.status === "loaded";
    if (settled || !st) { fontsGated.current = true; return; }
    st.style.visibility = "hidden";
    document.fonts.ready.then(() => {
      fit(); equalise(); paint(posRef.current, false);
      fontsGated.current = true;
      // One frame so the corrected layout is already what gets painted the
      // moment visibility flips back, not the stale pre-font one.
      requestAnimationFrame(() => { st.style.visibility = ""; });
    }).catch(() => { fontsGated.current = true; st.style.visibility = ""; });
    // Safety net: document.fonts.ready is spec-guaranteed to resolve, but
    // never leave the section permanently invisible if some browser bug
    // stalls it anyway.
    window.setTimeout(() => { if (!fontsGated.current) { fontsGated.current = true; st.style.visibility = ""; } }, 2500);
  }, [pos, paint, fit, equalise]);

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
