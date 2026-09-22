import React, { useEffect, useRef, useState } from "react";
import { Reveal } from "./Reveal";

export interface PillarData {
  eyebrowNum: string;
  ink: string;
  accent: string;
  wash: string;
  titleGradient: string;
  titleWord: string;
  h3: string;
  paragraph: string;
  bullets: { color: string; text: string }[];
  graphic: React.ReactNode;
  mockup: React.ReactNode;
}

const PIN_TOP = 72;
const GUTTER = 28;
const TAIL = 0.22;
const HOLD = 0.28;
// The first pillar's hold is a larger *share* of its step than the others,
// not the same 0.28 — the handoff's own comment: the pin is already ~12%
// into the sequence when the section lands (the PIN_TOP offset eats into
// the very first step), so a hold as small as 0.18 only produced 33px of
// actual on-screen hold. Literal from initPlatformPin(): 0.45, not 0.28 and
// not 0 — do not average these into a single value for both cases.
const HOLD_FIRST = 0.45;
// Responsive-fit ladder floor (v6 handoff, initPillarRail()). Reached via a
// 7-iteration binary search over the widen-then-scale simulation (hAt), not
// a direct ratio — see the measure() effect below. There is no viewport-
// height "unpin" veto any more: "Always pinned at every viewport — it never
// unpins/stacks (an older 'unpin below scale 0.9' veto broke the sweep at
// e.g. 1536×695; removed)." Below this floor the rail sheds detail instead
// (fitShed) rather than falling back to a stacked/unpinned layout.
const K_MIN = 0.9;
// Shed mode adds at most this many detail tiers (data-mfit="1 2 3…") to a
// pane before giving up and just clamping its height.
const MFIT_MAX = 8;

// The leaf badge's blade and its inner "slit" are two separate paths in the
// handoff, composited via an SVG <mask> — not one path rendered with
// fill-rule="evenodd". Per the handoff's own Gotchas: "SVG evenodd fills
// geometry outside the outline. A leaf slit whose end fell outside the
// blade rendered as a stray sliver; use a mask so the cut can only apply
// where the shape is."
const LEAF_BLADE_PATH =
  "M 924.1 543.4 L 915.6 549.5 L 905.6 555.7 L 894 561.9 L 878.6 568.1 L 859.3 574.2 L 830 580.4 L 796.8 586.6 L 768.2 592.8 L 748.1 598.9 L 731.9 605.1 L 718.8 611.3 L 708 617.5 L 698.7 623.6 L 690.2 629.8 L 682.5 636 L 675.5 642.2 L 669.4 648.3 L 664 654.5 L 658.6 660.7 L 653.9 666.9 L 650.1 673.1 L 645.4 679.2 L 641.6 685.4 L 637.7 691.6 L 634.6 697.8 L 631.5 703.9 L 628.5 710.1 L 626.1 716.3 L 623.8 722.5 L 621.5 728.6 L 619.2 734.8 L 617.6 741 L 615.3 747.2 L 613.8 753.3 L 612.2 759.5 L 611.5 765.7 L 609.9 771.9 L 609.2 778 L 608.4 784.2 L 607.6 790.4 L 681.7 796.6 L 671.7 802.8 L 661.7 808.9 L 651.6 815.1 L 643.1 821.3 L 634.6 827.5 L 626.1 833.6 L 618.4 839.8 L 611.5 846 L 603.8 852.2 L 596.8 858.3 L 589.9 864.5 L 582.9 870.7 L 576.7 876.9 L 569.8 883 L 607.6 887.7 L 637.7 887.7 L 684.8 883 L 713.4 876.9 L 734.2 870.7 L 751.2 864.5 L 765.1 858.3 L 778.2 852.2 L 789 846 L 799.1 839.8 L 808.3 833.6 L 816.8 827.5 L 824.5 821.3 L 832.3 815.1 L 839.2 808.9 L 845.4 802.8 L 851.6 796.6 L 857.7 790.4 L 863.2 784.2 L 867.8 778 L 872.4 771.9 L 877 765.7 L 881.7 759.5 L 885.5 753.3 L 889.4 747.2 L 893.3 741 L 896.3 734.8 L 899.4 728.6 L 902.5 722.5 L 905.6 716.3 L 907.9 710.1 L 911 703.9 L 913.3 697.8 L 915.6 691.6 L 917.2 685.4 L 919.5 679.2 L 921.1 673.1 L 922.6 666.9 L 924.1 660.7 L 925.7 654.5 L 927.2 648.3 L 928 642.2 L 929.5 636 L 930.3 629.8 L 931.1 623.6 L 931.9 617.5 L 931.9 611.3 L 932.6 605.1 L 932.6 598.9 L 932.6 592.8 L 931.9 586.6 L 931.9 580.4 L 931.1 574.2 L 930.3 568.1 L 930.3 561.9 L 928.8 555.7 L 928 549.5 L 926.5 543.4 Z";
const LEAF_SLIT_PATH =
  "M 829.2 668.4 L 826.1 674.6 L 822.2 680.8 L 817.6 686.9 L 813.7 693.1 L 809.1 699.3 L 804.5 705.5 L 799.8 711.7 L 794.4 717.8 L 789 724 L 782.9 730.2 L 776.7 736.4 L 769.7 742.5 L 762.8 748.7 L 755.1 754.9 L 746.6 761.1 L 737.3 767.2 L 727.3 773.4 L 715.7 779.6 L 703.3 785.8 L 691 791.9 L 683.3 795.8 L 656.2 809.3 L 589.5 809.3 L 608.4 795.8 L 613.8 791.9 L 622.3 785.8 L 632.3 779.6 L 643.1 773.4 L 655.5 767.2 L 668.6 761.1 L 684 754.9 L 699.5 748.7 L 714.2 742.5 L 727.3 736.4 L 739.6 730.2 L 751.2 724 L 761.2 717.8 L 771.3 711.7 L 779.8 705.5 L 789 699.3 L 797.5 693.1 L 805.2 686.9 L 813 680.8 L 819.9 674.6 L 826.9 668.4 Z";

/** The Platform section's pinned horizontal rail — ported from the v6
 *  landing handoff's own `initPillarRail()`:
 *
 *  1. The *whole* section (heading + rail) pins together as one sticky unit
 *     at `top: 72px` — the heading isn't a separate scrolling block above
 *     it, it's inside the same sticky element as the rail, per the handoff's
 *     "the header is always pinned at the nav — never vertically centred."
 *  2. **Always pinned, at every viewport — it never unpins or stacks.** When
 *     the composition is taller than the room under the nav, the `#rail-fit`
 *     block (heading + gallery) scales down via a deterministic binary
 *     search for the largest `scale(k)` in `[0.9, 1]` that fits (measured
 *     fresh from the viewport on every resize, never from the previous
 *     result — see `measure()` below). Below that floor the rail re-lays
 *     the active card out instead ("shed mode", `fitShed()`): the header
 *     scrolls away, the card gets the whole screen, and detail is shed tier
 *     by tier (`data-mfit`) until it fits, then individual items are
 *     restored where room allows (`data-mkeep`). Mobile (<1024px) always
 *     uses shed mode. An older "unpin below scale 0.9" veto that fell back
 *     to a stacked/unpinned layout broke the sweep at e.g. 1536×695 and has
 *     been removed — do not reintroduce any viewport-height unpin gate.
 *  3. The scroll→offset mapping isn't linear: each pane holds briefly
 *     (`HOLD`) before easing to the next, and a reserved tail segment
 *     (`TAIL`) makes the last pane hold too instead of snapping to the
 *     track's end.
 *
 *  Writes `gallery.style.transform` (and the fit scale) directly via refs on
 *  every scroll frame rather than through React state — re-rendering on
 *  every scroll tick would fight the rAF throttle this needs to stay smooth.
 *  `active` is still state, but only changes (and re-renders) once per pane,
 *  driving `aria-hidden`/`pointer-events` on the inactive panes.
 *
 *  Known gaps (out of this file's scope — see report): the handoff's
 *  `_applyTypeScale`/`_clearTypeScale` type counter-scale and
 *  `_reflowMockups`/`_resetMockups` mockup min-height override have no
 *  equivalent anywhere in this codebase yet, so they are not invented here.
 *  The shed-mode tier CSS and CAND back-fill list target `data-mock-rail`,
 *  `data-mock-body`, `data-mod-grid`, `data-mod-ui`, `data-mod-caption` and
 *  `data-cap-min` — these live inside each pillar's mockup content, which is
 *  built in `Home.tsx`/`BrowserMockup.tsx` (out of this file's scope) and
 *  does not yet carry those attributes. */
export const PillarRail: React.FC<{ pillars: PillarData[]; heading: React.ReactNode }> = ({ pillars, heading }) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const railBoxRef = useRef<HTMLDivElement>(null);
  const railFitRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const count = pillars.length;

  useEffect(() => {
    const track = trackRef.current;
    const sec = sectionRef.current;
    const railBox = railBoxRef.current;
    const fit = railFitRef.current;
    const gallery = galleryRef.current;
    if (!track || !sec || !railBox || !fit || !gallery) return;

    const panes = Array.from(gallery.querySelectorAll<HTMLElement>("[data-pane]"));
    if (!panes.length) return;

    let raf = 0;
    let pinTop: number | null = null;
    // Structural guard only — `on` below is always `true` now (no unpin
    // veto), so this only ever flips once, from `null` to `true`, on the
    // very first measure() call.
    let enabled: boolean | null = null;
    let fitScale = 1;
    // Shed mode's sticky top is negative (the header scrolls away first),
    // so its pinned span is computed differently from the desktop formula
    // — apply() below branches on this.
    let awayMode = false;

    // Mobile: no scale. Each pass sheds one layer of detail (see the
    // data-mfit rules in the <style> block below) until the tallest card
    // fits under the nav. The section header scrolls away first (negative
    // sticky top), so the card gets the whole screen while it is pinned.
    // Desktop falls into this too when the fit ladder (steps 1-3 in
    // measure()) can't find a scale ≥ K_MIN that fits.
    const fitShed = (vh: number) => {
      awayMode = true;
      gallery.style.alignItems = "flex-start";
      fit.style.transform = "none";
      fit.style.width = "";
      fit.style.marginLeft = "";
      fitScale = 1;
      railBox.style.height = "";
      // Type counter-scale reset (_clearTypeScale) — no equivalent exists
      // in this codebase yet; see the component's doc comment.
      for (let i = 0; i < panes.length; i++) panes[i].style.height = "";
      const kept = railBox.querySelectorAll("[data-mkeep]");
      for (let i = 0; i < kept.length; i++) kept[i].removeAttribute("data-mkeep");
      const room = Math.max(200, vh - PIN_TOP - 24);
      const tallest = () => {
        let m = 0;
        for (let i = 0; i < panes.length; i++) m = Math.max(m, panes[i].offsetHeight);
        return m;
      };
      // Per card: each pane accumulates tiers 1..8 one at a time, only as
      // many as ITS OWN content needs.
      for (let i = 0; i < panes.length; i++) {
        const p = panes[i];
        const levels: number[] = [];
        p.setAttribute("data-mfit", "");
        while (levels.length < MFIT_MAX && p.offsetHeight > room) {
          levels.push(levels.length + 1);
          p.setAttribute("data-mfit", levels.join(" "));
        }
      }
      // Back-fill: a whole tier is a coarse step and usually overshoots how
      // much needs to be hidden, so individually restore items (graphics-
      // first order) while the card still fits. data-mkeep on an element
      // overrides its tier's hide rule.
      const hidden = (el: HTMLElement) => el.offsetParent === null && getComputedStyle(el).display === "none";
      const CAND = [
        "h3",
        "[data-mod-grid] > div > [data-mod-ui]",
        "[data-mod-grid] > div",
        "[data-mod-grid] > div > div:not([data-mod-ui]) > div:first-child",
        "[data-mod-grid] > div > div:not([data-mod-ui]) > :nth-child(n+3)",
        "[data-mod-grid] > div > span",
        "[data-mock-body] > div:not([data-mock-rail]) > div:not([data-mod-grid])",
        "[data-mock-rail]",
        "[data-pane-figure] > div > div:first-child",
      ];
      for (let i = 0; i < panes.length; i++) {
        const p = panes[i];
        if (!p.getAttribute("data-mfit")) continue;
        for (let pass = 0; pass < 3; pass++) {
          let changed = false;
          for (let c = 0; c < CAND.length; c++) {
            const els = p.querySelectorAll<HTMLElement>(CAND[c]);
            for (let j = 0; j < els.length; j++) {
              const el = els[j];
              if (el.hasAttribute("data-mkeep") || !hidden(el)) continue;
              el.setAttribute("data-mkeep", "");
              // Still hidden by a DIFFERENT rule, or restoring it overflowed
              // the card — revert.
              if (hidden(el) || p.offsetHeight > room) el.removeAttribute("data-mkeep");
              else changed = true;
            }
          }
          if (!changed) break;
        }
      }
      const h = Math.min(room, tallest());
      for (let i = 0; i < panes.length; i++) panes[i].style.height = h + "px";
      // Spare height goes to the visible graphics, not empty mock space.
      const mods = railBox.querySelectorAll<HTMLElement>("[data-mod-grid] > div");
      for (let i = 0; i < mods.length; i++) {
        const ui = mods[i].querySelector<HTMLElement>(":scope > [data-mod-ui]");
        if (ui && ui.offsetParent) mods[i].setAttribute("data-mgrow", "");
        else mods[i].removeAttribute("data-mgrow");
      }
      // The section header scrolls away first (negative sticky top), so the
      // pinned card gets the WHOLE screen, not screen-minus-header.
      const pt = Math.round(PIN_TOP + 12 - railBox.offsetTop);
      if (pinTop !== pt) {
        pinTop = pt;
        sec.style.top = pt + "px";
      }
      const secH = sec.offsetHeight;
      const want = secH + Math.round((Math.round(vh * 1.05) * (count - 1)) / (1 - TAIL));
      if (track.style.height !== want + "px") track.style.height = want + "px";
    };

    const measure = () => {
      const vh = window.innerHeight;
      let secH = sec.offsetHeight;
      const mobile = window.matchMedia("(max-width:1023px)").matches;
      // ALWAYS ON. There is no veto, no unpin condition, ever — see the
      // component's doc comment for why (an older "unpin below scale 0.9"
      // veto broke the sweep at e.g. 1536×695 and has been removed).
      const on = true;
      if (on !== enabled) {
        enabled = on;
        sec.style.position = "sticky";
        gallery.style.flexDirection = "row";
        gallery.style.gap = `${GUTTER}px`;
        gallery.style.width = `calc(${count * 100}% + ${GUTTER * (count - 1)}px)`;
        // Restore the authored flex-basis explicitly, since clearing it
        // earlier left panes sized to content (unequal), which skewed both
        // the module-column decision and the sweep's fixed-slot arithmetic.
        for (let i = 0; i < panes.length; i++) {
          panes[i].style.flex = `0 0 calc((100% - ${GUTTER * (count - 1)}px) / ${count})`;
        }
      }
      if (mobile) {
        fitShed(vh);
        return;
      }
      // Desktop: clear any shed-mode state from a previous narrower measurement.
      awayMode = false;
      gallery.style.alignItems = "";
      if (panes[0].hasAttribute("data-mfit")) {
        for (let i = 0; i < panes.length; i++) {
          panes[i].removeAttribute("data-mfit");
          panes[i].style.height = "";
        }
        const kept = railBox.querySelectorAll("[data-mkeep]");
        for (let i = 0; i < kept.length; i++) kept[i].removeAttribute("data-mkeep");
      }
      const boxW = railBox.getBoundingClientRect().width;

      // DETERMINISTIC fit — start from a clean state every time (reset
      // transform/width/margin/scale BEFORE measuring), so the result
      // depends only on the current viewport, never on the previous call's
      // output. Starting from wherever the last call left things made the
      // scale alternate between two values on repeated resizes to the same
      // size (e.g. 0.934 <-> 1 at 900px tall) — the content visibly jumped.
      railBox.style.height = "";
      fit.style.transform = "none";
      fitScale = 1;
      fit.style.marginLeft = "0px";
      fit.style.width = "";
      // Type counter-scale reset (_applyTypeScale(1)) — no equivalent
      // exists in this codebase yet; see the component's doc comment. If
      // one is added later it belongs here, before natAt() starts measuring.

      const natAt = (W: number) => {
        fit.style.width = W + "px";
        return fit.offsetHeight;
      };
      const chromeFixed = sec.offsetHeight - railBox.offsetHeight;
      const roomFixed = vh - PIN_TOP - 12 - chromeFixed;

      // hAt(k): the height the card would render at if scaled by k. Widening
      // the box by 1/k before measuring is deliberate — a CSS scale() shrinks
      // the rendered box but the content still WRAPS at the original width
      // unless the measurement box is widened too, so this simulates "scale
      // down after re-wrapping into more horizontal space", not just a
      // visual shrink.
      const hAt = (k: number) => natAt(Math.min(2400, Math.floor(boxW / k))) * k;

      const search = (room: number) => {
        if (hAt(1) <= room) return 1; // step 1: full size already fits
        if (hAt(K_MIN) > room) return 0; // even the floor doesn't fit -> failure
        let lo = K_MIN;
        let hi = 1;
        for (let it = 0; it < 7; it++) {
          const mid = (lo + hi) / 2;
          if (hAt(mid) <= room) lo = mid;
          else hi = mid;
        }
        return lo; // step 2: largest scale in [0.9,1] that fits
      };

      const kFit = boxW > 0 ? search(roomFixed) : 1;
      const chrome = chromeFixed;
      // Step 3 (drop the mockup body's enforced min-height and retry) needs
      // a reflow hook into the mockup content, which is owned by
      // Home.tsx/BrowserMockup.tsx (out of this file's scope) and has no
      // equivalent here — see the component's doc comment. A failed search
      // at the K_MIN floor falls straight through to shed mode (step 4)
      // instead, which is a simplification, not a silent drop.
      if (!kFit) {
        fitShed(vh);
        return;
      }

      const wFit = kFit >= 1 ? boxW : Math.min(2400, Math.floor(boxW / kFit));
      if (boxW > 0) {
        fit.style.width = wFit === boxW ? "" : wFit + "px";
        fit.style.marginLeft = Math.round(-(wFit - boxW) / 2) + "px";
      }
      const natural = fit.offsetHeight;
      const k = kFit;
      if (k !== fitScale) {
        fitScale = k;
        fit.style.transform = k === 1 ? "none" : `scale(${k.toFixed(4)})`;
      }
      // Type counter-scale re-apply (_applyTypeScale(1)) would go here,
      // AFTER the transform is set — see the component's doc comment.
      const boxed = Math.round(natural * k);
      if (railBox.style.height !== boxed + "px") railBox.style.height = boxed + "px";
      secH = chrome + boxed;
      if (pinTop !== PIN_TOP) {
        pinTop = PIN_TOP;
        sec.style.top = PIN_TOP + "px";
      }
      const want = secH + Math.round((Math.round(vh * 1.05) * (count - 1)) / (1 - TAIL));
      if (track.style.height !== want + "px") track.style.height = want + "px";
    };

    const apply = () => {
      raf = 0;
      if (!enabled) return;
      // Mobile/shed mode's sticky top is negative, so its pinned range is
      // exactly track-height minus section-height; the desktop formula
      // (which adds pinTop) would finish the sweep too early.
      const span = awayMode
        ? Math.max(1, track.offsetHeight - sec.offsetHeight)
        : Math.max(1, track.offsetHeight - sec.offsetHeight + (pinTop || 0));
      let p = (-track.getBoundingClientRect().top + (pinTop || 0)) / span;
      if (p < 0) p = 0;
      else if (p > 1) p = 1;
      const box = viewportRef.current || gallery;
      // offsetWidth, not a rect: the rect is scaled by the fit transform
      // while the gallery's own transform is in unscaled coordinates
      const slot = box.offsetWidth + GUTTER;
      const steps = count - 1;
      const pt = Math.min(1, p / (1 - TAIL));
      const raw = pt * steps;
      let i = Math.floor(raw);
      if (i > steps - 1) i = Math.max(0, steps - 1);
      const f = raw - i;
      const hold = i === 0 ? HOLD_FIRST : HOLD;
      let g = (f - hold) / (1 - hold);
      if (g < 0) g = 0;
      else if (g > 1) g = 1;
      g = g * g * (3 - 2 * g);
      const eased = pt >= 1 ? steps : i + g;
      gallery.style.transform = `translate3d(${-(eased * slot)}px,0,0)`;
      const idx = Math.min(count - 1, Math.round(eased));
      if (activeRef.current !== idx) {
        activeRef.current = idx;
        setActive(idx);
      }
    };

    const tick = () => {
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onResize = () => {
      measure();
      apply();
    };

    measure();
    apply();
    window.addEventListener("scroll", tick, { passive: true });
    window.addEventListener("resize", onResize);
    // The pane content is ~20px shorter before the webfont settles, so a
    // single measure at mount under-sizes the box and clips the panes.
    let cancelled = false;
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          if (!cancelled) onResize();
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", onResize);
    };
  }, [count]);

  return (
    <div ref={trackRef} id="platform-track" className="relative bg-white">
      {/* Shed-mode responsive-fit CSS, ported literally (selectors, tiers
          and values) from the v6 handoff's own <style> block. The base
          rules and the [data-mod-grid]/[data-mock-*] tier selectors target
          markup that lives inside each pillar's mockup content
          (Home.tsx/BrowserMockup.tsx, out of this file's scope) and does
          not yet carry those data attributes — see the component's doc
          comment. The data-pane, data-pillar-badge, data-pillar-eyebrow,
          data-pillar-name, data-pane-figure and h3 rules are fully wired
          since those elements are rendered by this file. */}
      <style>{`
[data-pane] [data-mod-grid] > div{flex-wrap:wrap !important;}
[data-pane] [data-mod-grid] > div > [data-mod-ui]{flex-shrink:0 !important;max-width:100% !important;}
[data-pane] [data-mod-grid] > div > :has([data-mod-caption]):not([data-mod-ui]){flex:1 1 180px !important;min-width:min(180px,100%) !important;}
[data-pane] [data-mod-grid] > div > :has([data-cap-min="246"]):not([data-mod-ui]){flex-basis:246px !important;min-width:min(246px,100%) !important;}
[data-pane] [data-mod-grid] > div > :has([data-cap-min="230"]):not([data-mod-ui]){flex-basis:230px !important;min-width:min(230px,100%) !important;}
[data-pane] [data-mod-grid] > div > :has([data-cap-min="236"]):not([data-mod-ui]){flex-basis:236px !important;min-width:min(236px,100%) !important;}
@media (max-width:1023px){
#rail-gallery{align-items:flex-start !important;}
#rail-box [data-pane]{min-height:0 !important;max-width:100%;padding:14px !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;justify-content:flex-start !important;}
#rail-box [data-pane] [data-pillar-badge]{width:40px !important;height:40px !important;top:14px !important;right:14px !important;}
#rail-box [data-pane] [data-pillar-badge] svg{width:19px !important;height:19px !important;}
#rail-box [data-pane] [data-pillar-eyebrow]{font-size:11px !important;letter-spacing:.22em !important;padding-right:50px;}
#rail-box [data-pane] [data-pillar-name]{font-size:clamp(28px,7.4vw,40px) !important;line-height:1.06 !important;margin-right:50px;}
#rail-box [data-pane] h3{font-size:clamp(15px,4vw,18px) !important;line-height:1.3 !important;text-wrap:pretty;}
#rail-box [data-pane-figure]{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;margin-top:10px !important;}
#rail-box [data-pane-figure] > div{flex:1 1 auto;display:flex;flex-direction:column;box-shadow:0 12px 28px rgba(72,58,130,.12) !important;}
#rail-box [data-pane-figure] > div > div:first-child{display:none !important;}
#rail-box [data-pane] [data-mock-body]{min-height:0 !important;flex:1 1 auto;flex-direction:column !important;}
#rail-box [data-pane] [data-mock-rail]{width:auto !important;flex-direction:row !important;flex-wrap:wrap !important;gap:4px !important;padding:8px 10px !important;border-right:0 !important;border-bottom:1px solid rgba(34,30,26,.08) !important;}
#rail-box [data-pane] [data-mock-body] > div:not([data-mock-rail]){padding:10px !important;gap:8px !important;}
#rail-box [data-pane] [data-mod-grid]{grid-template-columns:repeat(auto-fit,minmax(min(300px,100%),1fr)) !important;gap:8px !important;flex:0 0 auto !important;align-content:start !important;}
#rail-box [data-pane] [data-mod-grid] > div{flex-direction:column !important;align-items:stretch !important;gap:8px !important;padding:10px !important;}
#rail-box [data-pane] [data-mod-grid] > div > div:not([data-mod-ui]){flex:0 0 auto !important;}
#rail-box [data-pane] [data-mod-grid] > div > [data-mod-ui]{flex:1 1 auto !important;width:100% !important;max-width:none !important;}
#rail-box [data-pane] [data-mod-grid]{flex:1 1 auto !important;align-content:stretch !important;}
  @media (max-width:639px){
  #rail-box [data-pane] [data-mod-grid]{display:flex !important;flex-direction:column !important;}
  #rail-box [data-pane] [data-mod-grid] > div{flex:0 0 auto;}
  #rail-box [data-pane] [data-mod-grid] > div[data-mgrow]{flex:1 1 auto !important;}
  }
#rail-box [data-pane] [data-mod-caption]{max-width:none !important;font-size:13.5px !important;}
#rail-box [data-pane] [style*="font-size:10px"],#rail-box [data-pane] [style*="font-size: 10px"],#rail-box [data-pane] [style*="font-size:10.5px"],#rail-box [data-pane] [style*="font-size: 10.5px"],#rail-box [data-pane] [style*="font-size:9"],#rail-box [data-pane] [style*="font-size: 9"]{font-size:11px !important;}
#rail-box [data-pane][data-mfit~="1"] [data-mock-rail]:not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mock-body] > div:not([data-mock-rail]) > div:not([data-mod-grid]):not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mod-grid] > div > div:not([data-mod-ui]) > :nth-child(n+3):not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mod-grid] > div > span:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="2"] [data-mod-grid] > div:nth-child(n+4):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="3"] [data-mod-grid] > div:nth-child(n+2) > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="4"] [data-mod-grid] > div:nth-child(n+3):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="5"] [data-mod-grid] > div:nth-child(n+2):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="6"] [data-mod-grid] > div > div:not([data-mod-ui]) > div:first-child:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="7"] [data-mod-grid] > div > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="8"] h3:not([data-mkeep]){display:none !important;}
}
@media (min-width:1024px){
#rail-box [data-pane][data-mfit]{display:flex !important;flex-direction:column !important;min-height:0 !important;overflow:hidden !important;}
#rail-box [data-pane][data-mfit] [data-pane-figure]{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;}
#rail-box [data-pane][data-mfit] [data-pane-figure] > div{flex:1 1 auto;display:flex;flex-direction:column;min-height:0;}
#rail-box [data-pane][data-mfit] [data-mock-body]{min-height:0 !important;flex:1 1 auto;}
#rail-box [data-pane][data-mfit] [data-mock-body] > div:not([data-mock-rail]){min-height:0;}
#rail-box [data-pane][data-mfit] [data-mod-grid]{flex:1 1 auto !important;align-content:stretch !important;}
#rail-box [data-pane][data-mfit] [data-mod-grid] > div{align-items:stretch !important;}
#rail-box [data-pane][data-mfit] [data-mod-grid] > div > [data-mod-ui]{height:auto !important;min-height:114px;align-self:stretch !important;}
#rail-box [data-pane][data-mfit~="1"] [data-pane-figure] > div > div:first-child:not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mock-rail]:not([data-mkeep]),#rail-box [data-pane][data-mfit~="1"] [data-mock-body] > div:not([data-mock-rail]) > div:not([data-mod-grid]):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="2"] [data-mod-grid] > div > div:not([data-mod-ui]) > :nth-child(n+3):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="3"] [data-mod-grid] > div:nth-child(n+5):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="4"] [data-mod-grid] > div:nth-child(n+3) > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="5"] [data-mod-grid] > div:nth-child(n+4):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="6"] [data-mod-grid] > div:nth-child(n+3):not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="7"] [data-mod-grid] > div:nth-child(n+2) > [data-mod-ui]:not([data-mkeep]){display:none !important;}
#rail-box [data-pane][data-mfit~="8"] h3:not([data-mkeep]),#rail-box [data-pane][data-mfit~="8"] [data-mod-grid] > div:nth-child(n+2):not([data-mkeep]){display:none !important;}
}
      `}</style>
      {/* Shared once — the leaf badge's blade is masked by its own slit
          shape rather than carved out with a single evenodd path (see the
          LEAF_BLADE_PATH/LEAF_SLIT_PATH comment above). */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: "absolute" }}>
        <mask id="cent-leaf-slit" maskUnits="userSpaceOnUse" x={270} y={180} width={690} height={730}>
          <rect x={270} y={180} width={690} height={730} fill="#FFFFFF" />
          <path d={LEAF_SLIT_PATH} fill="#000000" />
        </mask>
      </svg>
      <div
        ref={sectionRef}
        id="platform"
        className="relative flex flex-col justify-start overflow-hidden bg-white scroll-mt-[88px]"
        style={{ padding: "clamp(20px,2.2vw,30px) 0 clamp(22px,2.4vw,32px)" }}
      >
        <div className="max-w-[1180px] mx-auto px-5 sm:px-10 w-full">
          {heading}
          <div ref={railBoxRef} id="rail-box" className="mt-[46px]">
            <div ref={railFitRef} className="origin-top" style={{ transformOrigin: "top center" }}>
              <Reveal delay={0.08}>
              <div ref={viewportRef} className="rounded-[26px] overflow-hidden">
                <div
                  ref={galleryRef}
                  id="rail-gallery"
                  className="flex will-change-transform"
                  style={{ flexDirection: "row", gap: GUTTER, width: `calc(${count * 100}% + ${GUTTER * (count - 1)}px)` }}
                >
                  {pillars.map((p, i) => {
                    // Regression fix: the handoff's own setTab() softens
                    // off-centre panes with opacity + a distance-scaled blur
                    // (never the fully sharp edge cut the port previously
                    // had) — only pointerEvents/aria-hidden were ported.
                    const d = Math.abs(i - active);
                    const crossAccent = p.accent === "#7D67D9" ? "#5E9E95" : "#7D67D9";
                    // Cross-toned callout ink: purple pillars (accent
                    // #7D67D9) get Teal 700 ink on a Teal 50 plate with a
                    // Teal 400 border; teal pillars get the Purple
                    // equivalents. Deep ramp ends only — never the base
                    // brand colour — per the handoff's contrast note
                    // (6.50–8.12:1 vs. white-on-brand's 3.09/4.36:1).
                    const calloutInk = p.accent === "#7D67D9" ? "#2F5F58" : "#4E3894";
                    const calloutPlate = p.accent === "#7D67D9" ? "#EDF4F3" : "#F4F1FB";
                    return (
                    <div
                      key={p.eyebrowNum}
                      data-pane
                      className="relative rounded-[26px]"
                      style={{
                        flex: `0 0 calc((100% - ${GUTTER * (count - 1)}px) / ${count})`,
                        background: p.wash,
                        border: `3px solid ${p.ink}`,
                        padding: "clamp(12px,1.2vw,16px)",
                        pointerEvents: i === active ? "auto" : "none",
                        opacity: d === 0 ? 1 : d === 1 ? 0.5 : 0.28,
                        filter: d === 0 ? "none" : `blur(${Math.min(4, d * 2.5)}px)`,
                        transition: "opacity .45s ease,filter .45s ease",
                      }}
                      aria-hidden={i === active ? undefined : "true"}
                    >
                      <span
                        aria-hidden="true"
                        data-pillar-badge
                        className="absolute flex items-center justify-center rounded-full"
                        style={{
                          top: "clamp(16px,1.6vw,20px)",
                          right: "clamp(16px,1.6vw,20px)",
                          width: 52,
                          height: 52,
                          border: `2px solid ${crossAccent}`,
                        }}
                      >
                        <svg viewBox="560 520 400 400" fill="none" style={{ width: 24, height: 24, overflow: "visible" }}>
                          <path fillRule="nonzero" mask="url(#cent-leaf-slit)" fill={crossAccent} d={LEAF_BLADE_PATH} />
                        </svg>
                      </span>

                      <div style={{ marginBottom: 3 }}>
                        <span data-pillar-eyebrow className="block font-bold text-[10px] tracking-[.26em]" style={{ color: p.accent }}>
                          PILLAR {p.eyebrowNum}
                        </span>
                        <div className="mt-1.5">
                          <div
                            data-pillar-name
                            className="font-display font-extrabold"
                            style={{
                              fontSize: "clamp(34px,3.6vw,48px)",
                              lineHeight: 1.1,
                              letterSpacing: "-.034em",
                              padding: "0 .04em .05em 0",
                              background: p.titleGradient,
                              WebkitBackgroundClip: "text",
                              backgroundClip: "text",
                              color: "transparent",
                            }}
                          >
                            {p.titleWord}
                          </div>
                        </div>
                      </div>

                      <div className="grid items-center gap-5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(min(320px,100%),1fr))" }}>
                        <div className="min-w-0">
                          <h3 className="font-display font-extrabold text-[19px] leading-[1.25] tracking-[-.02em] text-mkt-ink mt-1">{p.h3}</h3>
                          <p className="text-[14px] leading-[1.55] text-mkt-soft mt-2 max-w-[420px]" style={{ textWrap: "pretty" }}>
                            {p.paragraph}
                          </p>
                          {/* Cross-toned callouts — the handoff's
                              data-mod-caption treatment: each bullet is a
                              labelled interface element (a tinted plate with
                              a coloured left border and bold deep-ink text),
                              not a plain dot + line of body copy. */}
                          <ul className="flex flex-col gap-1.5 mt-[11px]">
                            {p.bullets.map((b) => (
                              <li
                                key={b.text}
                                style={{
                                  color: calloutInk,
                                  background: calloutPlate,
                                  borderLeft: `3px solid ${b.color}`,
                                  borderRadius: "0 7px 7px 0",
                                  padding: "7px 9px 7px 10px",
                                  fontSize: 14,
                                  fontWeight: 700,
                                  lineHeight: 1.35,
                                  textWrap: "pretty",
                                }}
                              >
                                {b.text}
                              </li>
                            ))}
                          </ul>
                          <div
                            className="flex items-center gap-3.5 mt-3.5 pt-3"
                            style={{ borderTop: `1px solid ${p.accent === "#7D67D9" ? "#E4DCF8" : "#D8EAE6"}` }}
                          >
                            {p.graphic}
                          </div>
                        </div>
                        {/* Grid items default to min-width:auto, which lets
                            hidden/overflowing mockup content force this
                            track wider than its share — one of the
                            handoff's own named Gotchas. */}
                        <div data-pane-figure className="min-w-0">{p.mockup}</div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
