/**
 * usePillarRail — reference React port of the approved pillar rail
 * (Centium Landing.dc.html → initPillarRail + _sizeMockBodies + rail-box
 * width + initModCaptions' mockup reflow). Drop-in for components/PillarRail.tsx.
 *
 * Everything that runs per scroll frame or per resize writes to the DOM through
 * refs. Do NOT move any of it into React state: the fit loop measures
 * offsetHeight after every attribute change and must see the result
 * synchronously; a state round-trip would measure stale layout.
 *
 * Requires pillar-rail.css loaded globally, and the pane markup contract in
 * the pillar-section handoff's README §3 (data-pane, data-pane-figure,
 * data-mock-body, data-mock-rail, data-mod-grid, data-mod-ui,
 * data-mod-caption, data-pillar-*).
 */
import { useLayoutEffect, useRef } from "react";

const PIN_TOP = 72;      // nav height; the section pins here
const GUTTER = 28;       // gap between panes (must match gallery CSS gap)
const TAIL = 0.22;       // last 22% of travel = hold on the final pane
const HOLD = 0.28;       // per-step hold before sliding (panes 2..n)
const HOLD_FIRST = 0.45; // first pane holds longer (pin lands ~12% in)
const K_MIN = 0.9;       // desktop scale floor — never shrink below this
const MFIT_MAX = 8;      // shed tiers defined in pillar-rail.css
const MAXW = 1180;       // rail box max width
const MOBILE_MQ = "(max-width:1023px)";

// Back-fill candidates, in restore priority (graphics before chrome).
const BACKFILL = [
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

export interface PillarRailRefs {
  track: React.RefObject<HTMLDivElement | null>;    // #platform-track (tall scroll track)
  section: React.RefObject<HTMLDivElement | null>;  // #platform (sticky element)
  railBox: React.RefObject<HTMLDivElement | null>;  // #rail-box
  fit: React.RefObject<HTMLDivElement | null>;      // #rail-fit (scaled on desktop)
  viewport: React.RefObject<HTMLDivElement | null>; // #rail-viewport (overflow:hidden)
  gallery: React.RefObject<HTMLDivElement | null>;  // #rail-gallery (translated row)
}

export function usePillarRail(): PillarRailRefs {
  const refs: PillarRailRefs = {
    track: useRef<HTMLDivElement>(null),
    section: useRef<HTMLDivElement>(null),
    railBox: useRef<HTMLDivElement>(null),
    fit: useRef<HTMLDivElement>(null),
    viewport: useRef<HTMLDivElement>(null),
    gallery: useRef<HTMLDivElement>(null),
  };

  // useLayoutEffect: first measure must happen before paint or the rail
  // flashes at the wrong size / unpinned.
  useLayoutEffect(() => {
    const track = refs.track.current!, sec = refs.section.current!, railBox = refs.railBox.current!;
    const fit = refs.fit.current!, viewport = refs.viewport.current, gallery = refs.gallery.current!;
    if (!track || !sec || !railBox || !fit || !gallery) return;
    const panes = Array.from(gallery.querySelectorAll<HTMLElement>("[data-pane]"));
    const count = panes.length;
    if (!count) return;
    const bodies = Array.from(railBox.querySelectorAll<HTMLElement>("[data-mock-body]"));

    let raf = 0;
    let pinTop = PIN_TOP;
    let awayMode = false; // true = shed mode (header scrolled away, negative sticky top)
    let fitScale = 1;
    let activeIdx = -1;

    sec.style.position = "sticky"; // ALWAYS pinned — never fall back to stacking
    sec.style.top = PIN_TOP + "px";

    // ---- width + mock body base height (design: responsive pass + _sizeMockBodies)
    const sizeBox = () => {
      const parent = railBox.parentElement!;
      const pcs = getComputedStyle(parent);
      const parentW = parent.clientWidth - (parseFloat(pcs.paddingLeft) || 0) - (parseFloat(pcs.paddingRight) || 0);
      const w = document.documentElement.clientWidth;
      if (window.innerHeight < 620) {
        railBox.style.width = ""; railBox.style.marginLeft = "";
      } else {
        const pad = Math.min(40, Math.max(20, w * 0.04));
        const width = Math.round(Math.min(Math.max(0, w - pad * 2), MAXW));
        railBox.style.width = width + "px";
        railBox.style.marginLeft = Math.min(0, Math.round((parentW - width) / 2)) + "px";
      }
      const boxW = railBox.getBoundingClientRect().width > 100
        ? railBox.getBoundingClientRect().width
        : Math.min(MAXW, w - 80);
      const mockH = Math.round(Math.min(430, Math.max(250, boxW * 0.3424)));
      bodies.forEach((b) => { b.dataset.baseMin = mockH + "px"; b.style.minHeight = mockH + "px"; });
    };
    const resetMockups = () => bodies.forEach((b) => { b.style.minHeight = b.dataset.baseMin || ""; });
    const releaseMockups = () => bodies.forEach((b) => { b.style.minHeight = "0px"; });

    const clearShed = () => {
      panes.forEach((p) => { p.removeAttribute("data-mfit"); p.style.height = ""; });
      railBox.querySelectorAll("[data-mkeep]").forEach((e) => e.removeAttribute("data-mkeep"));
      railBox.querySelectorAll("[data-mgrow]").forEach((e) => e.removeAttribute("data-mgrow"));
    };

    const setTrack = (vh: number) => {
      const want = sec.offsetHeight + Math.round((Math.round(vh * 1.05) * (count - 1)) / (1 - TAIL));
      if (track.style.height !== want + "px") track.style.height = want + "px";
    };

    // ---- SHED MODE: mobile always; desktop when even k=0.9 won't fit ----------
    const fitShed = (vh: number) => {
      awayMode = true;
      gallery.style.alignItems = "flex-start"; // each pane measures its OWN height
      fit.style.transform = "none"; fit.style.width = ""; fit.style.marginLeft = "";
      fitScale = 1;
      railBox.style.height = "";
      clearShed();
      const room = Math.max(200, vh - PIN_TOP - 24);

      // 1) per pane: add tiers until it fits (tiers are cumulative: "1 2 3")
      for (const p of panes) {
        const levels: number[] = [];
        p.setAttribute("data-mfit", "");
        while (levels.length < MFIT_MAX && p.offsetHeight > room) {
          levels.push(levels.length + 1);
          p.setAttribute("data-mfit", levels.join(" "));
        }
      }
      // 2) back-fill: restore single items, graphics first, while it still fits
      const hidden = (el: Element) =>
        (el as HTMLElement).offsetParent === null && getComputedStyle(el).display === "none";
      for (const p of panes) {
        if (!p.getAttribute("data-mfit")) continue;
        for (let pass = 0; pass < 3; pass++) {
          let changed = false;
          for (const sel of BACKFILL) {
            p.querySelectorAll(sel).forEach((el) => {
              if (el.hasAttribute("data-mkeep") || !hidden(el)) return;
              el.setAttribute("data-mkeep", "");
              if (hidden(el) || p.offsetHeight > room) el.removeAttribute("data-mkeep");
              else changed = true;
            });
          }
          if (!changed) break;
        }
      }
      // 3) equal fixed height; spare height flows into visible graphics via CSS
      let tallest = 0;
      panes.forEach((p) => { tallest = Math.max(tallest, p.offsetHeight); });
      const h = Math.min(room, tallest);
      panes.forEach((p) => { p.style.height = h + "px"; });
      railBox.querySelectorAll<HTMLElement>("[data-mod-grid] > div").forEach((m) => {
        const ui = m.querySelector<HTMLElement>(":scope > [data-mod-ui]");
        if (ui && ui.offsetParent) m.setAttribute("data-mgrow", ""); else m.removeAttribute("data-mgrow");
      });
      // 4) header scrolls away: negative sticky top so the card sits under the nav
      pinTop = Math.round(PIN_TOP + 12 - railBox.offsetTop);
      sec.style.top = pinTop + "px";
      setTrack(vh);
    };

    // ---- measure: the fit ladder. Deterministic: always starts from clean state.
    const measure = () => {
      const vh = window.innerHeight;
      sizeBox();
      if (window.matchMedia(MOBILE_MQ).matches) { fitShed(vh); return; }

      awayMode = false;
      gallery.style.alignItems = "";
      clearShed();
      resetMockups();
      const boxW = railBox.getBoundingClientRect().width;
      railBox.style.height = "";
      fit.style.transform = "none"; fitScale = 1;
      fit.style.marginLeft = "0px"; fit.style.width = "";

      // natural height when laid out at width W (scaled width = W*k = boxW)
      const natAt = (W: number) => { fit.style.width = W + "px"; return fit.offsetHeight; };
      const hAt = (k: number) => natAt(Math.min(2400, Math.floor(boxW / k))) * k;
      const search = (room: number) => {
        if (hAt(1) <= room) return 1;
        if (hAt(K_MIN) > room) return 0;
        let lo = K_MIN, hi = 1;
        for (let it = 0; it < 7; it++) { const mid = (lo + hi) / 2; if (hAt(mid) <= room) lo = mid; else hi = mid; }
        return lo;
      };
      let chrome = sec.offsetHeight - railBox.offsetHeight; // header + paddings
      let k = boxW > 0 ? search(vh - PIN_TOP - 12 - chrome) : 1;      // steps 1+2
      if (!k) {                                                         // step 3
        releaseMockups();
        chrome = sec.offsetHeight - railBox.offsetHeight;
        k = search(vh - PIN_TOP - 12 - chrome);
      }
      if (!k) { resetMockups(); fitShed(vh); return; }                  // step 4

      const wFit = k >= 1 ? boxW : Math.min(2400, Math.floor(boxW / k));
      fit.style.width = wFit === boxW ? "" : wFit + "px";
      fit.style.marginLeft = Math.round(-(wFit - boxW) / 2) + "px";
      const natural = fit.offsetHeight;
      if (k !== fitScale) { fitScale = k; fit.style.transform = k === 1 ? "none" : `scale(${k.toFixed(4)})`; }
      railBox.style.height = Math.round(natural * k) + "px"; // transform doesn't affect layout
      pinTop = PIN_TOP; sec.style.top = PIN_TOP + "px";
      setTrack(vh);
    };

    const setActive = (idx: number) => {
      if (activeIdx === idx) return;
      activeIdx = idx;
      panes.forEach((pane, i) => {
        const d = Math.abs(i - idx);
        pane.style.pointerEvents = i === idx ? "auto" : "none";
        pane.style.opacity = d === 0 ? "1" : d === 1 ? "0.5" : "0.28";
        pane.style.filter = d === 0 ? "none" : `blur(${Math.min(4, d * 2.5)}px)`;
        if (i === idx) pane.removeAttribute("aria-hidden"); else pane.setAttribute("aria-hidden", "true");
      });
    };

    // ---- apply: scroll → horizontal offset (hold + smoothstep, reserved tail)
    const apply = () => {
      raf = 0;
      // shed mode: sticky top is negative → pinned range is exactly track − section
      const span = awayMode
        ? Math.max(1, track.offsetHeight - sec.offsetHeight)
        : Math.max(1, track.offsetHeight - sec.offsetHeight + pinTop);
      let p = (-track.getBoundingClientRect().top + pinTop) / span;
      p = Math.max(0, Math.min(1, p));
      // slot from real pane positions (unscaled offsets), not a scaled rect
      const slot = panes.length > 1 && panes[1].offsetLeft > panes[0].offsetLeft
        ? panes[1].offsetLeft - panes[0].offsetLeft
        : (panes[0]?.offsetWidth ?? (viewport || gallery).offsetWidth) + GUTTER;
      const steps = count - 1;
      const pt = Math.min(1, p / (1 - TAIL));
      const raw = pt * steps;
      let i = Math.floor(raw);
      if (i > steps - 1) i = Math.max(0, steps - 1);
      const f = raw - i;
      const hold = i === 0 ? HOLD_FIRST : HOLD;
      let g = Math.max(0, Math.min(1, (f - hold) / (1 - hold)));
      g = g * g * (3 - 2 * g);
      const eased = pt >= 1 ? steps : i + g;
      gallery.style.transform = `translate3d(${-(eased * slot)}px,0,0)`;
      setActive(Math.min(count - 1, Math.round(eased)));
    };

    const tick = () => { if (!raf) raf = requestAnimationFrame(apply); };
    let busy = false;
    const onResize = () => {
      if (busy) return; // our own writes trigger the ResizeObserver
      busy = true;
      try { measure(); apply(); } finally { busy = false; }
    };

    onResize();
    document.fonts?.ready.then(onResize).catch(() => {}); // webfont changes heights ~20px

    let lastH = 0, lastW = sec.clientWidth, rq = 0;
    const roFit = new ResizeObserver(() => {
      const h = fit.offsetHeight;
      if (Math.abs(h - lastH) < 1) return;
      lastH = h; onResize();
    });
    roFit.observe(fit);
    const roSec = new ResizeObserver(() => {
      const w = sec.clientWidth;
      if (Math.abs(w - lastW) < 1) return;
      lastW = w;
      if (!rq) rq = requestAnimationFrame(() => { rq = 0; onResize(); });
    });
    roSec.observe(sec);
    window.addEventListener("scroll", tick, { passive: true });
    // Mobile browsers fire `resize` when the address bar shows/hides during
    // scroll -- height-only, never width -- but measure() keys its whole
    // fit ladder off innerHeight (line ~168). Reacting to every resize meant
    // that completely normal address-bar collapse/expand, which happens on
    // any scroll, could re-run the fit mid-pin and shift this section's
    // sticky `top`/height while it's actively pinned under the user's
    // finger -- reported as the section "rubber banding" during scroll, the
    // content fighting the gesture instead of tracking it. Same root cause,
    // same fix already applied to useEcoSlider's and usePersonaArc's resize
    // handlers earlier this same investigation. Only the plain window
    // listener needs this gate -- the ResizeObservers above already key off
    // actual element size changes (content height, section width), not raw
    // window resize, so they're unaffected by the toolbar and stay ungated.
    let lastWidth = window.innerWidth;
    const onWindowResize = () => {
      if (window.innerWidth === lastWidth) return;
      lastWidth = window.innerWidth;
      onResize();
    };
    window.addEventListener("resize", onWindowResize);
    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (rq) cancelAnimationFrame(rq);
      roFit.disconnect(); roSec.disconnect();
      window.removeEventListener("scroll", tick);
      window.removeEventListener("resize", onWindowResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return refs;
}
