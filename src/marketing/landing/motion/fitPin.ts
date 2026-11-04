// Centium landing: fitting the pinned sections to the screen (handoff-landing-fix,
// rounds 6 and 7: SPEC F2, F4 and F7).
// - Desktop (fitStage, SPEC F2): a pinned stage (03 #platform, the 04 stage,
//   06 #everyone) is exactly 100svh tall (sectionVals pinH). Its content (the
//   union of its visible leaves, less what their own containers clip) must sit
//   between the navbar line (72 + 12px) and 16px from the bottom; when it does
//   not, the stage gets translateY(d) scale(s) from its top centre, s =
//   min(1, avail / height), d centring the scaled block. A transform, so the
//   tracks and every scroll range are unchanged. The stage's children and
//   grandchildren never shrink ([data-fitpin], landing.css), or 06's slide
//   area shrank under its cards' indicator.
// - Phones, 03 (fitPillarsPhone, SPEC F7): every pillar card plus its dots
//   fits in 100svh - 138px: in order, and only while still too tall, hide the
//   panes' fake browser bar, show the 3 most recent records, then zoom the
//   graphic of any pane still too tall (at least 0.80).
// - Phones, 06 (fitEcoPhone, SPEC F4): the toggle, a card and the indicator
//   fit below the navbar together: every slide takes min(natural height,
//   cardMax), the graphic zoomed (at least 0.80) to fit, the text unchanged.
// Each runs again (useFit) on resize, when fonts load, on a language change,
// and when the watched content changes size. Every write is reset first, so a
// run from any state gives the same result.

import { useLayoutEffect, type DependencyList } from "react";

export const NAV_H = 72;

// Writes over an inline value React rendered (a card's height, a row's
// display) remember it, so a later run restores exactly that. If React has
// changed the value since (a new breakpoint), React's value is kept.
const kept = new WeakMap<HTMLElement, Map<string, { orig: string; mine: string }>>();
function put(el: HTMLElement, prop: string, v: string) {
  let m = kept.get(el);
  if (!m) kept.set(el, (m = new Map()));
  const k = m.get(prop),
    cur = el.style.getPropertyValue(prop);
  el.style.setProperty(prop, v);
  // As the browser serialises it ("0.910" reads back as "0.91").
  m.set(prop, { orig: k && k.mine === cur ? k.orig : cur, mine: el.style.getPropertyValue(prop) });
}
function back(el: HTMLElement, prop: string) {
  const k = kept.get(el)?.get(prop);
  if (!k) return;
  if (el.style.getPropertyValue(prop) === k.mine) el.style.setProperty(prop, k.orig);
  kept.get(el)!.delete(prop);
}
const TOP_GAP = 12,
  BOTTOM_GAP = 16;

export interface StageFit {
  /** Scale (1 = untouched). */
  s: number;
  dy: number;
  /** The content's top and bottom in the stage, before the transform. */
  top: number;
  bottom: number;
}

/** Fit a desktop pinned stage (see the header). Call with the stage's own
 *  height already 100svh. */
export function fitStage(S: HTMLElement): StageFit {
  S.style.transform = "";
  S.style.transformOrigin = "";
  delete S.dataset.fit;
  if (window.innerWidth < 1024) return { s: 1, dy: 0, top: 0, bottom: 0 };
  const ih = window.innerHeight,
    vw = window.innerWidth,
    sr = S.getBoundingClientRect();
  const cs = new Map<Element, CSSStyleDeclaration>(),
    style = (e: Element) => {
      let c = cs.get(e);
      if (!c) cs.set(e, (c = getComputedStyle(e)));
      return c;
    };
  let cT = Infinity,
    cB = -Infinity;
  S.querySelectorAll("*").forEach((c) => {
    // The leaves, and every box that clips its content (a pane, a card), so
    // the block does not depend on which widgets have built in yet.
    const own = style(c),
      box = /hidden|clip/.test(own.overflowY + own.overflowX);
    if (c.childElementCount && !box && !/^(BUTTON|IMG|SVG|CANVAS)$/i.test(c.tagName)) return;
    let r = c.getBoundingClientRect(),
      top = r.top,
      bottom = r.bottom;
    if (r.height < 1 || r.width < 1 || r.right <= 0 || r.left >= vw) return;
    // Visible content only: not under display none, nor in a hidden
    // (opacity 0) layer such as 03's other panes, which the cross-fade also
    // drifts up to 81px down.
    if (own.display === "none" || own.opacity === "0") return;
    for (let a = c.parentElement; a && a !== S; a = a.parentElement) {
      const ac = style(a);
      if (ac.display === "none" || ac.opacity === "0") return;
      if (/hidden|clip/.test(ac.overflowY + ac.overflowX)) {
        r = a.getBoundingClientRect();
        top = Math.max(top, r.top);
        bottom = Math.min(bottom, r.bottom);
        if (bottom - top < 1) return;
      }
    }
    cT = Math.min(cT, top - sr.top);
    cB = Math.max(cB, bottom - sr.top);
  });
  if (!isFinite(cT)) return { s: 1, dy: 0, top: 0, bottom: 0 };
  const T = NAV_H + TOP_GAP,
    avail = ih - T - BOTTOM_GAP,
    Hc = cB - cT;
  if (cT >= T - 0.5 && cB <= ih - BOTTOM_GAP + 0.5) {
    S.dataset.fit = "1";
    return { s: 1, dy: 0, top: cT, bottom: cB };
  }
  const s = Math.min(1, avail / Hc),
    d = T + (avail - s * Hc) / 2 - s * cT;
  S.style.transformOrigin = "50% 0";
  S.style.transform = "translateY(" + d.toFixed(1) + "px) scale(" + s.toFixed(4) + ")";
  S.dataset.fit = s.toFixed(3);
  return { s, dy: d, top: cT, bottom: cB };
}

/** 03 desktop (SPEC F2 rule 5): the pane box is as tall as its tallest pane's
 *  content, and never under its designed height. */
export function fitPaneBox(box: HTMLElement): number {
  back(box, "height");
  const baseH = box.offsetHeight;
  if (window.innerWidth < 1024) return baseH;
  let need = 0;
  box.querySelectorAll<HTMLElement>(":scope > [data-pls]").forEach((p) => {
    need = Math.max(need, p.scrollHeight + (p.offsetHeight - p.clientHeight));
  });
  if (need > baseH + 1) put(box, "height", Math.ceil(need) + "px");
  return Math.max(baseH, Math.ceil(need));
}

/** 03 phones (SPEC F7, see the header). */
export function fitPillarsPhone(car: HTMLElement): string[] {
  const panes = Array.from(car.querySelectorAll<HTMLElement>(":scope > [data-pls]")),
    steps: string[] = [];
  panes.forEach((p) => {
    const bar = p.children[0] as HTMLElement | undefined,
      body = p.children[1] as HTMLElement | undefined;
    if (bar) back(bar, "display");
    if (body) back(body, "zoom");
  });
  car.querySelectorAll<HTMLElement>("[data-rec]").forEach((e) => back(e, "display"));
  if (!panes.length || window.innerWidth >= 1024) return steps;
  const T = window.innerHeight - 138;
  const tallest = () => {
    const a = car.style.alignItems;
    car.style.alignItems = "flex-start";
    let m = 0;
    panes.forEach((p) => (m = Math.max(m, p.getBoundingClientRect().height)));
    car.style.alignItems = a;
    return m;
  };
  if (tallest() > T) {
    panes.forEach((p) => {
      const bar = p.children[0] as HTMLElement | undefined;
      if (bar) put(bar, "display", "none");
    });
    steps.push("bar");
  }
  if (tallest() > T) {
    const recs = Array.from(car.querySelectorAll<HTMLElement>("[data-rec]"));
    recs.slice(0, Math.max(0, recs.length - 3)).forEach((e) => put(e, "display", "none"));
    steps.push("records3");
  }
  if (tallest() > T) {
    const a = car.style.alignItems;
    car.style.alignItems = "flex-start";
    panes.forEach((p, i) => {
      // Rendered heights: offsetHeight rounds a 526.3px card down to the limit.
      const h = p.getBoundingClientRect().height,
        body = p.children[1] as HTMLElement | undefined;
      if (h > T && body) {
        // Aimed 1px under the limit and rounded down: zoomed layout snaps to
        // sub-pixel steps and could otherwise land a fraction over.
        const z = Math.max(0.8, Math.floor((1 - (h - T + 1) / body.getBoundingClientRect().height) * 1000) / 1000);
        put(body, "zoom", z.toFixed(3));
        steps.push("pane" + (i + 1) + " x" + z.toFixed(3));
      }
    });
    car.style.alignItems = a;
  }
  return steps;
}

export interface EcoFit {
  cardMax: number;
  natural: number;
  card: number;
  s: number;
}

/** 06 phones (SPEC F4, see the header). The slide sets are [data-eset], the
 *  slides [data-sl], each card [data-slc] with its graphic as second child;
 *  the hidden audience's set is measured too, so both share one height. */
export function fitEcoPhone(track: HTMLElement): EcoFit | null {
  const sets = Array.from(track.querySelectorAll<HTMLElement>("[data-eset]")),
    slides = Array.from(track.querySelectorAll<HTMLElement>("[data-sl]")),
    graphic = (sl: HTMLElement) => sl.querySelector<HTMLElement>("[data-slc]")?.children[1] as HTMLElement | undefined;
  sets.forEach((st) => back(st, "padding-bottom"));
  slides.forEach((sl) => {
    back(sl, "height");
    const g = graphic(sl);
    if (g) back(g, "zoom");
  });
  if (!slides.length || window.innerWidth >= 1024) return null;
  const tab = track.querySelector<HTMLElement>('[role="tablist"]'),
    tabH = tab ? tab.offsetHeight : 53;
  const T = window.innerHeight - NAV_H - 8 - tabH - 28 - 4 - 8 - 22 - 44 - 16;
  sets.forEach((st) => put(st, "padding-bottom", "8px"));
  // Natural size: each slide at its content's height, its graphic at least
  // its designed height (MobileGraphic min-height). The hidden audience's set
  // is shown for the measure, out of the flow.
  const hidden = sets.filter((st) => st.style.display === "none");
  hidden.forEach((st) => {
    put(st, "display", "flex");
    put(st, "position", "absolute");
    put(st, "visibility", "hidden");
  });
  // Unstretched, so each slide measures its own content.
  sets.forEach((st) => put(st, "align-items", "flex-start"));
  let H0 = 0,
    G = 0;
  slides.forEach((sl) => {
    const g = graphic(sl);
    put(sl, "height", "auto");
    H0 = Math.max(H0, sl.offsetHeight);
    G = Math.max(G, g ? g.offsetHeight : 0);
  });
  hidden.forEach((st) => ["display", "position", "visibility"].forEach((k) => back(st, k)));
  sets.forEach((st) => back(st, "align-items"));
  let s = 1,
    H = H0;
  if (H0 > T && G) {
    s = Math.max(0.8, 1 - (H0 - T) / G);
    H = Math.ceil(H0 - G * (1 - s));
  }
  slides.forEach((sl) => {
    put(sl, "height", H + "px");
    const g = graphic(sl);
    if (g && s < 1) put(g, "zoom", s.toFixed(4));
  });
  return { cardMax: T, natural: H0, card: H, s };
}

/** Run fit now and again whenever the layout may have changed: viewport
 *  resize, fonts loading, the language (<html lang / dir>) changing, or a
 *  watched element changing size. At most once per frame. */
export function useFit(fit: () => void, watch: () => (Element | null)[], deps: DependencyList) {
  useLayoutEffect(() => {
    fit();
    let raf = 0;
    const run = () => {
      if (!raf) raf = requestAnimationFrame(() => ((raf = 0), fit()));
    };
    window.addEventListener("resize", run);
    const fonts = document.fonts;
    fonts?.ready.then(run);
    fonts?.addEventListener?.("loadingdone", run);
    const mo = new MutationObserver(run);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(run) : null;
    watch().forEach((e) => e && ro?.observe(e));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", run);
      fonts?.removeEventListener?.("loadingdone", run);
      mo.disconnect();
      ro?.disconnect();
    };
    // The caller's deps decide when the watched elements change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
