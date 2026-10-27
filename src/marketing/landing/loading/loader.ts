// Centium landing v29: the loading sequences LO1 and LO2, ported literally
// from the prototype's initLoading / lo1Apply / lo1Target / loApply /
// loTarget / lo1Pose / loPose (handover 03_motion/01-loading-LO1-LO2.md).
//
// Part of the eager shell on purpose: the loader has to run while the
// code-split chunks (motion engine, line engine) are still arriving, and it
// follows their real progress together with the fonts and the eager images.
// It never blocks first paint: the page underneath is already rendered (the
// intro title is visible from the first frame), the loader only animates on
// top and ends on its own (forced landing by 2.4 s for LO1).

import { clamp, sm, swing } from "../engine/math";
import { LG } from "../engine/env";
import { LETTER_BASE, LETTER_H, LOCKUP_RATIO, lo1Target, loTarget, type LoaderEntry, type LoaderMode } from "./loaderChoice";
import { placeDot, titleIn, titleLift, type DotPlace } from "./title";

const byId = <T extends Element = HTMLElement>(id: string) => document.getElementById(id) as T | null;

// ---------------------------------------------------------------------------
// LO1: the leaf falls in three swings and lands as the dot of "lives".

interface Lo1Pose {
  leaf: HTMLElement;
  LS: number;
  sheen: SVGRectElement | null;
  sh: HTMLElement | null;
  wrap: HTMLElement | null;
  dot: HTMLElement | null;
  vw: number;
}

function lo1Pose(): Lo1Pose | null {
  const leaf = byId("lo1-leaf");
  if (!leaf) return null;
  return {
    leaf,
    LS: leaf.offsetWidth,
    sheen: byId<SVGRectElement>("lo1-sheen"),
    sh: byId("lo1-sh"),
    wrap: byId("i-wrap"),
    dot: byId("i-dot"),
    vw: window.innerWidth,
  };
}

function lo1Apply(G: Lo1Pose, u: number, f: number, t: number, mode: LoaderMode): DotPlace | null {
  const D = placeDot(G.wrap, G.dot);
  if (!D) return null;
  const rm = mode === "rm",
    LS = G.LS,
    lg = G.vw >= LG,
    ts = D.d / LS;
  if (rm) {
    G.leaf.style.opacity = "0";
    if (G.dot) G.dot.style.opacity = sm(0, 0.4, t).toFixed(3);
    titleLift(1, true);
    return D;
  }
  const SW = swing(u, mode === "repeat" ? 1 : 3, G.vw * (lg ? 0.125 : 0.175)),
    sy = -LS * 1.6,
    y = sy + (D.y - sy) * SW.desc - SW.lift;
  const sway = SW.x,
    rot = SW.rot,
    fl = SW.fl,
    sx = SW.sx;
  const k = 1 + (ts - 1) * sm(0.5, 1, u);
  const bt = 0.26,
    bounce = f > 0 && f < bt ? Math.sin((Math.PI * f) / bt) * D.d * 0.55 : 0,
    sq = f > 0 && f < bt * 0.4 ? 1 - 0.12 * Math.sin((Math.PI * f) / (bt * 0.4)) : 1;
  const landed = f >= bt;
  G.leaf.style.opacity = landed ? "0" : "1";
  if (G.dot) G.dot.style.opacity = landed ? "1" : "0";
  G.leaf.style.transform =
    "translate(" +
    (D.x - LS / 2 + sway).toFixed(2) +
    "px," +
    (y - LS / 2 - bounce).toFixed(2) +
    "px) rotate(" +
    rot.toFixed(2) +
    "deg) scale(" +
    (k * sx).toFixed(4) +
    "," +
    (k * sq).toFixed(4) +
    ")";
  if (G.sheen) {
    G.sheen.style.opacity = Math.min(1, (1 - Math.abs(sx)) * 1.6).toFixed(3);
    G.sheen.setAttribute("x", (520 + 300 * (fl % 1)).toFixed(1));
  }
  const near = u * u,
    out = 1 - sm(0, 0.2, f);
  if (G.sh) {
    G.sh.style.opacity = (0.8 * near * out).toFixed(3);
    G.sh.style.transform =
      "translate(" +
      (D.x - 30 + sway * 0.5).toFixed(1) +
      "px," +
      (D.y + D.d * 0.9).toFixed(1) +
      "px) scale(" +
      (2.4 - 2 * near + 0.0).toFixed(3) +
      "," +
      (2 - 1.6 * near).toFixed(3) +
      ")";
  }
  titleLift(sm(0.08, 0.68, f), false);
  return D;
}

// ---------------------------------------------------------------------------
// LO2: two swings, the C grows from the leaf, ENTIUM reveals, the lockup
// glides into the navbar logo.

interface LoPose {
  lock: HTMLElement;
  vw: number;
  vh: number;
  lw: number;
  lh: number;
  mw: number;
  top: number;
  xMark: number;
  xFull: number;
  nav: { x: number; y: number; s: number } | null;
  leaf: HTMLElement | null;
  leafP: SVGPathElement | null;
  sheen: SVGRectElement | null;
  vein: SVGPathElement | null;
  letters: SVGRectElement[];
  shs: HTMLElement | null;
  sht: HTMLElement | null;
  shW: number;
  shH: number;
  veil: HTMLElement | null;
  navLogo: HTMLElement | null;
  carc: SVGPathElement | null;
}

function loPose(): LoPose | null {
  const lock = byId("lf-lock"),
    mark = byId("lf-mark");
  if (!lock || !mark) return null;
  const vw = window.innerWidth,
    vh = window.innerHeight,
    mw = mark.offsetWidth,
    lw = mw * LOCKUP_RATIO,
    lh = lock.offsetHeight,
    nm = byId("nav-mark");
  let nav: LoPose["nav"] = null;
  if (nm) {
    const r = nm.getBoundingClientRect();
    if (r.width) nav = { x: r.left, y: r.top, s: r.width / mw };
  }
  const shs = byId("lf-shs"),
    sht = byId("lf-sht");
  return {
    lock,
    vw,
    vh,
    lw,
    lh,
    mw,
    top: vh * 0.46 - lh / 2,
    xMark: vw / 2 - mw / 2,
    xFull: vw / 2 - lw / 2,
    nav,
    leaf: byId("lf-leafsvg"),
    leafP: byId<SVGPathElement>("lf-leaf"),
    sheen: byId<SVGRectElement>("lf-sheen"),
    vein: byId<SVGPathElement>("lf-vein"),
    letters: Array.from(document.querySelectorAll<SVGRectElement>("[data-lfl]")),
    shs,
    sht,
    shW: shs ? shs.offsetWidth : 0,
    shH: shs ? shs.offsetHeight : 0,
    veil: byId("lo-veil"),
    navLogo: byId("nav-logo"),
    carc: byId<SVGPathElement>("lf-carc"),
  };
}

function loApply(G: LoPose, u: number, f: number, g: number, t: number, mode: LoaderMode) {
  const rm = mode === "rm",
    lg = G.vw >= LG;
  const slide = sm(0.88, 1.28, f),
    lx = G.xMark + (G.xFull - G.xMark) * slide,
    ly = G.top;
  const e = g < 0.5 ? 4 * g * g * g : 1 - Math.pow(-2 * g + 2, 3) / 2;
  let X = lx,
    Y = ly,
    K = 1;
  if (G.nav && !rm) {
    X = lx + (G.nav.x - lx) * e;
    Y = ly + (G.nav.y - ly) * e;
    K = 1 + (G.nav.s - 1) * e;
  }
  G.lock.style.opacity = rm ? (clamp(t / 0.25) * (1 - sm(0.5, 0.8, t))).toFixed(3) : (1 - sm(0.86, 1, g)).toFixed(3);
  G.lock.style.transform = "translate(" + X.toFixed(2) + "px," + Y.toFixed(2) + "px) scale(" + K.toFixed(5) + ")";
  const fallH = G.top + G.mw * 1.15 + 40,
    SW = swing(rm ? 1 : u, 2, G.vw * (lg ? 0.125 : 0.175));
  const sway = SW.x,
    yy = -fallH * (1 - SW.desc) - SW.lift,
    rot = SW.rot,
    fl = SW.fl,
    sx = SW.sx;
  const settle = f > 0 && f < 0.2 ? 1 - 0.04 * Math.sin((Math.PI * f) / 0.2) : 1;
  if (G.leaf)
    G.leaf.style.transform =
      "translate(" + sway.toFixed(2) + "px," + yy.toFixed(2) + "px) rotate(" + rot.toFixed(2) + "deg) scale(" + sx.toFixed(4) + "," + settle.toFixed(4) + ")";
  const fo = sx < 0 ? 0.5 : 0.72;
  if (G.leafP) {
    G.leafP.setAttribute("fill-opacity", (fo + (1 - fo) * sm(0.06, 0.36, f)).toFixed(3));
    G.leafP.setAttribute("stroke-opacity", (1 - sm(0.1, 0.34, f)).toFixed(3));
  }
  if (G.sheen) {
    G.sheen.style.opacity = (f > 0 ? 0 : Math.min(1, (1 - Math.abs(sx)) * 1.5)).toFixed(3);
    G.sheen.setAttribute("x", (520 + 300 * (fl % 1)).toFixed(1));
  }
  if (G.vein) {
    G.vein.setAttribute("stroke-dashoffset", (1 - sm(0.04, 0.4, f)).toFixed(4));
    G.vein.style.opacity = (1 - sm(0.45, 0.65, f)).toFixed(3);
  }
  if (G.carc) G.carc.setAttribute("stroke-dashoffset", (1 - sm(0.3, 1.02, f)).toFixed(4));
  G.letters.forEach((el, i) => {
    const a = sm(0.9 + i * 0.065, 1.08 + i * 0.065, f),
      h = LETTER_H * (1 - Math.pow(1 - a, 3));
    el.setAttribute("y", (LETTER_BASE - h).toFixed(2));
    el.setAttribute("height", h.toFixed(2));
  });
  const c = u * u,
    out = 1 - sm(0.05, 0.4, f),
    gx = G.xMark + G.mw * 0.69 + sway * 0.55,
    gy = G.top + G.mw * 0.99;
  if (G.shs) {
    G.shs.style.opacity = (0.75 * c * out).toFixed(3);
    G.shs.style.transform =
      "translate(" + (gx - G.shW / 2).toFixed(1) + "px," + (gy - G.shH / 2).toFixed(1) + "px) scale(" + (2.1 - 1.1 * c).toFixed(3) + ")";
  }
  if (G.sht) {
    G.sht.style.opacity = (c * c * c * out).toFixed(3);
    G.sht.style.transform =
      "translate(" +
      (gx - G.shW / 2).toFixed(1) +
      "px," +
      (gy - G.shH / 2).toFixed(1) +
      "px) scale(" +
      (1.25 - 0.3 * c).toFixed(3) +
      "," +
      (1.1 - 0.25 * c).toFixed(3) +
      ")";
  }
  const vOut = rm ? sm(0.5, 0.8, t) : sm(0.08, 0.7, g);
  if (G.veil) G.veil.style.opacity = (1 - vOut).toFixed(3);
  if (G.navLogo) G.navLogo.style.opacity = (rm ? sm(0.5, 0.8, t) : sm(0.85, 1, g)).toFixed(3);
  titleIn(rm ? sm(0.5, 0.8, t) : sm(0.1, 1, g), rm);
}

// ---------------------------------------------------------------------------

export interface LoaderRun {
  cancel(): void;
}

/** One loading sequence (prototype `initLoading` for a page whose entry has a
 *  kind). `tasks` are the real progress: fonts, the eager images and the
 *  code-split chunks. `onEnd` runs once (prototype `end`). */
export function runLoader(entry: LoaderEntry, tasks: Promise<unknown>[], onEnd: () => void): LoaderRun {
  const mode = entry.mode;
  let dead = false,
    ended = false;
  const end = () => {
    if (ended || dead) return;
    ended = true;
    onEnd();
  };
  let done = 0;
  tasks.forEach((tk) =>
    Promise.resolve(tk)
      .catch(() => {})
      .then(() => {
        done++;
      }),
  );
  const total = Math.max(1, tasks.length);
  const t0 = performance.now();
  let ff: number | null = null;
  const onEarly = () => {
    if (ff == null) ff = (performance.now() - t0) / 1000;
  };
  const early = ["wheel", "touchmove", "keydown"] as const;
  early.forEach((ev) => window.addEventListener(ev, onEarly, { passive: true, once: true }));
  const cleanup = () => early.forEach((ev) => window.removeEventListener(ev, onEarly));

  if (entry.kind === "lo1") {
    const G = lo1Pose();
    if (!G) {
      end();
      return { cancel: cleanup };
    }
    let u = 0,
      tL: number | null = null,
      lastT = 0,
      fT = 0;
    const lo = byId("lo1");
    const tick = () => {
      if (dead) return;
      const t = (performance.now() - t0) / 1000;
      if (mode === "rm") {
        lo1Apply(G, 1, 1, t, "rm");
        if (t >= 0.55) {
          end();
          return;
        }
        requestAnimationFrame(tick);
        return;
      }
      const real = done / total,
        target = ff != null ? 1 : lo1Target(t, real, mode),
        dt = Math.max(0, t - lastT);
      lastT = t;
      u += (target - u) * (1 - Math.exp(-dt * (ff != null ? 30 : 22)));
      if (target - u < 0.002 || (target >= 1 && t >= 2.35)) u = target;
      if (lo) lo.setAttribute("aria-valuenow", String(Math.round(real * 100)));
      if (u >= 0.999 && tL == null) {
        u = 1;
        tL = t;
      }
      const rate = ff != null ? 3 : 1;
      if (tL != null) fT += dt * rate;
      const fEnd = mode === "repeat" ? 0.26 : 0.8;
      lo1Apply(G, u, tL == null ? 0 : mode === "repeat" ? Math.min(fT, 0.26) : fT, t, mode);
      if (tL != null && fT >= fEnd) {
        end();
        return;
      }
      requestAnimationFrame(tick);
    };
    tick();
    return {
      cancel() {
        dead = true;
        cleanup();
      },
    };
  }

  const G = loPose();
  if (!G) {
    end();
    return { cancel: cleanup };
  }
  let u = 0,
    tL: number | null = null,
    ffT: number | null = null,
    lastT = 0;
  const lo = byId("loader");
  const tick = () => {
    if (dead) return;
    const t = (performance.now() - t0) / 1000;
    if (mode === "rm") {
      loApply(G, 1, 1.45, 0, t, "rm");
      if (t >= 0.8) {
        end();
        return;
      }
      requestAnimationFrame(tick);
      return;
    }
    if (mode === "repeat") {
      const g = clamp((ff != null ? t * 1.6 : t) / 0.5);
      loApply(G, 1, 1.45, g, t, mode);
      if (g >= 1) {
        end();
        return;
      }
      requestAnimationFrame(tick);
      return;
    }
    const real = done / total;
    let target = loTarget(t, real);
    if (ff != null) target = 1;
    const dt = Math.max(0, t - lastT);
    lastT = t;
    u += (target - u) * (1 - Math.exp(-dt * (ff != null ? 26 : 22)));
    if (target - u < 0.002 || (target >= 1 && t >= 1.6)) u = target;
    if (u >= 0.999 && tL == null) {
      u = 1;
      tL = t;
    }
    if (lo) lo.setAttribute("aria-valuenow", String(Math.round(real * 100)));
    let f = tL == null ? 0 : t - tL,
      g = 0;
    if (ff != null && tL != null) {
      if (ffT == null) ffT = t;
      f = 1.45;
      g = clamp((t - ffT) / 0.3);
    } else if (f > 1.45) g = clamp((f - 1.45) / 0.55);
    loApply(G, u, Math.min(f, 1.45), g, t, mode);
    if (g >= 1) {
      end();
      return;
    }
    requestAnimationFrame(tick);
  };
  tick();
  return {
    cancel() {
      dead = true;
      cleanup();
    },
  };
}

/** The real-progress task for a font (prototype `fl`): resolves when loaded, or after 3 s. */
export function fontTask(spec: string): Promise<unknown> {
  if (!document.fonts) return Promise.resolve();
  try {
    if (document.fonts.check(spec)) return Promise.resolve();
  } catch {
    return Promise.resolve();
  }
  return Promise.race([document.fonts.load(spec), new Promise((r) => setTimeout(r, 3000))]);
}

/** The real-progress task for an image already in the page: resolves once it
 *  is loaded and decoded, or failed (prototype `img`, which loaded a copy). */
export function imageTask(img: HTMLImageElement): Promise<unknown> {
  if (img.complete && img.naturalWidth) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const done = () => resolve();
    img.addEventListener("load", done, { once: true });
    img.addEventListener("error", done, { once: true });
  });
}
