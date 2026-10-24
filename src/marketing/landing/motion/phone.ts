// Centium landing v29: the dashboard phone's state machine, ported literally
// from the prototype (03_motion/05-hero-dashboard-section01.md: buildPhone,
// patchSet, setBase, runT, setOff, phonePhase, daySegs). Phases: 'intro'
// (screen 01), 'hero' (01 to 02), 'day' (02, 03, 05, 06, 04; section 01,
// driven by motion/day.ts). At rest every state shows its own screenshot.

import { clamp, easeInOut3, sm } from "../engine/math";
import { BASE_SCREENS, screenBackground } from "../assets/dashboard";
import { PHONE, type PatchDef, type Rect } from "../phone/phonePatches";

interface Patch {
  d: PatchDef;
  w: HTMLDivElement;
  kind: PatchDef["k"];
  last: number;
  cover?: HTMLDivElement;
  old?: HTMLDivElement;
  nw?: HTMLDivElement;
}

interface Morph {
  w: HTMLDivElement;
  A: HTMLDivElement;
  B: HTMLDivElement;
  r3: Rect;
  r4: Rect;
}

type TrackKey = keyof typeof PHONE.T;

const pct = (n: number) => n + "%";

/** Section 01's step lengths (prototype `daySegs`): desktop 90/90/120/90/90/90 + 40 hold, mobile 45/45/55/45/45/45 + 25. */
export function daySegs(lg: boolean): [number, number][] {
  const L = lg ? [90, 90, 120, 90, 90, 90, 40] : [45, 45, 55, 45, 45, 45, 25],
    tot = L.reduce((a, b) => a + b, 0);
  let acc = 0;
  return L.map((l) => {
    const a = acc / tot;
    acc += l;
    return [a, acc / tot];
  });
}

export class PhoneMotion {
  private T: Record<TrackKey, Patch[]> | null = null;
  private M: Morph[] = [];
  private mh: HTMLElement | null = null;
  private bases: HTMLElement[] = [];
  private dims: (HTMLElement | null)[] = [];
  private cards: (HTMLElement | null)[] = [];
  private key = "";
  /** Screen scale: dash-view width / 473 (prototype P.k), and / 488 for screen 04 (P.k4). */
  k = 1;
  private k4 = 1;
  private off = 0;
  /** Debug mirror of the prototype's window.__phone. */
  state: Record<string, unknown> = {};

  private rm: boolean;
  private lgRef: () => boolean;

  constructor(rm: boolean, lgRef: () => boolean) {
    this.rm = rm;
    this.lgRef = lgRef;
  }

  /** Prototype `buildPhone`: creates the patch layers once, re-sizes the morph on every call. */
  build(): boolean {
    const host = document.getElementById("ph-patches"),
      mh = document.getElementById("ph-morph"),
      dv = document.getElementById("dash-view");
    if (!host || !dv || !mh) return false;
    const W = PHONE.W,
      H = PHONE.H,
      k = dv.offsetWidth / W;
    const crop = (el: HTMLElement, src: number, r: Rect) => {
      el.style.backgroundImage = screenBackground(BASE_SCREENS[src]);
      el.style.backgroundRepeat = "no-repeat";
      el.style.backgroundSize = ((W / r[2]) * 100).toFixed(3) + "% " + ((H / r[3]) * 100).toFixed(3) + "%";
      el.style.backgroundPosition = ((r[0] / (W - r[2])) * 100).toFixed(3) + "% " + ((r[1] / (H - r[3])) * 100).toFixed(3) + "%";
    };
    if (!this.T) {
      host.innerHTML = "";
      const T = {} as Record<TrackKey, Patch[]>;
      (Object.keys(PHONE.T) as TrackKey[]).forEach((tk) => {
        const tr = PHONE.T[tk];
        T[tk] = tr.list.map((d) => {
          const r = d.r,
            w = document.createElement("div"),
            kind = d.k,
            covered = kind === "roll" || kind === "pop";
          w.style.cssText =
            "position:absolute;left:" +
            pct((r[0] / W) * 100) +
            ";top:" +
            pct((r[1] / H) * 100) +
            ";width:" +
            pct((r[2] / W) * 100) +
            ";height:" +
            pct((r[3] / H) * 100) +
            ";overflow:" +
            (kind === "pop" || kind === "bloom" ? "visible" : "hidden") +
            ";display:none";
          const mk = (css: string) => {
            const e = document.createElement("div");
            e.style.cssText = "position:absolute;inset:0;" + css;
            w.appendChild(e);
            return e;
          };
          const P: Patch = { d, w, kind, last: -1 };
          if (covered) {
            P.cover = mk("background:linear-gradient(90deg," + d.cv[0] + "," + d.cv[1] + ")");
            P.old = mk("");
            crop(P.old, tr.src, r);
          }
          P.nw = mk("opacity:0" + (kind === "pop" ? ";transform-origin:50% 60%" : kind === "bloom" ? ";transform-origin:50% 100%" : ""));
          crop(P.nw, tr.dst, r);
          host.appendChild(w);
          return P;
        });
      });
      mh.innerHTML = "";
      this.M = PHONE.morph.map(([r3, r4]) => {
        const w = document.createElement("div");
        w.style.cssText = "position:absolute;overflow:hidden";
        const A = document.createElement("div"),
          B = document.createElement("div");
        A.style.cssText = "position:absolute;background-size:100% 100%;background-repeat:no-repeat;background-position:0 0";
        A.style.backgroundImage = screenBackground(BASE_SCREENS[2]);
        B.style.cssText = "position:absolute;background-size:100% 100%;background-repeat:no-repeat;background-position:0 0;opacity:0";
        B.style.backgroundImage = screenBackground(BASE_SCREENS[3]);
        w.appendChild(A);
        w.appendChild(B);
        mh.appendChild(w);
        return { w, A, B, r3, r4 };
      });
      this.T = T;
      this.mh = mh;
      this.bases = Array.from(document.querySelectorAll<HTMLElement>("[data-base]")).sort((a, b) => +a.getAttribute("data-base")! - +b.getAttribute("data-base")!);
      this.dims = [0, 1].map((i) => document.querySelector<HTMLElement>('[data-dim="' + i + '"]'));
      this.cards = [0, 1].map((i) => document.querySelector<HTMLElement>('[data-card="' + i + '"]'));
    }
    this.k = k;
    this.k4 = dv.offsetWidth / 488;
    this.M.forEach((m) => {
      m.A.style.width = W * k + "px";
      m.A.style.height = H * k + "px";
      m.A.style.left = -m.r3[0] * k + "px";
      m.A.style.top = -m.r3[1] * k + "px";
      m.B.style.width = 488 * this.k4 + "px";
      m.B.style.height = 1600 * this.k4 + "px";
      m.B.style.left = -m.r4[0] * this.k4 + "px";
      m.B.style.top = -m.r4[1] * this.k4 + "px";
    });
    this.key = "";
    return true;
  }

  get built(): boolean {
    return !!this.T;
  }

  private patchSet(P: Patch, v: number) {
    if (Math.abs(v - P.last) < 0.0004) return;
    P.last = v;
    const ss = (t: number) => {
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      return t * t * (3 - 2 * t);
    };
    const d = P.d,
      k = P.kind;
    if (P.old) {
      const o = k === "roll" ? 1 - ss(v / 0.6) : k === "count" ? 1 - ss(v / 0.15) : 1 - ss(v / 0.5);
      P.old.style.opacity = o.toFixed(3);
      if (k === "roll") P.old.style.transform = "translateY(" + (-ss(v / 0.6) * 70).toFixed(2) + "%)";
    }
    const n = P.nw;
    if (!n) return;
    if (k === "roll") {
      const e = ss((v - 0.3) / 0.7);
      n.style.opacity = e.toFixed(3);
      n.style.transform = "translateY(" + ((1 - e) * 70).toFixed(2) + "%)";
    } else if (k === "count") {
      // No patch in the data uses "count" (the prototype's needs a live text node it never builds).
      n.style.opacity = ss((v - 0.84) / 0.16).toFixed(3);
    } else if (k === "fade") n.style.opacity = ss(v).toFixed(3);
    else if (k === "wipeR") {
      n.style.opacity = "1";
      n.style.clipPath = "inset(0 " + ((1 - ss(v)) * 100).toFixed(2) + "% 0 0)";
    } else if (k === "wipeU") {
      n.style.opacity = "1";
      n.style.clipPath = "inset(" + ((1 - ss(v)) * 100).toFixed(2) + "% 0 0 0)";
    } else if (k === "pop") {
      const sp = v >= 1 ? 1 : 1 - Math.exp(-6 * v) * Math.cos(8 * v);
      n.style.opacity = Math.min(1, v * 2.5).toFixed(3);
      n.style.transform = "scale(" + (0.55 + 0.45 * sp).toFixed(4) + ")";
    } else if (k === "ring") {
      const x = d.x as { a0: number; a1: number };
      const A = x.a0 + (x.a1 - x.a0) * ss(v),
        m = "conic-gradient(from 0deg,#000 0deg " + A.toFixed(2) + "deg,transparent " + A.toFixed(2) + "deg 360deg)";
      n.style.opacity = "1";
      n.style.webkitMaskImage = m;
      n.style.maskImage = m;
    } else if (k === "bloom") {
      const e = ss(v),
        top = (1 - e) * 100;
      n.style.opacity = "1";
      n.style.clipPath = "inset(" + top.toFixed(2) + "% 0 0 0)";
      n.style.webkitMaskImage = n.style.maskImage =
        "linear-gradient(to top,#000 0%,#000 " + Math.max(0, 100 - top - 6).toFixed(1) + "%,transparent " + Math.min(100, 100 - top + 2).toFixed(1) + "%)";
      n.style.transform = "scale(" + (0.985 + 0.015 * e).toFixed(4) + ")";
    } else if (k === "slide") {
      const e = ss(v);
      n.style.opacity = e.toFixed(3);
      n.style.transform = "translateX(" + ((1 - e) * 14).toFixed(2) + "%)";
    }
  }

  /** Prototype `setBase`: show base screen k only. */
  setBase(k: number) {
    this.bases.forEach((b, i) => {
      const o = i === k ? "1" : "0";
      if (b.style.opacity !== o) b.style.opacity = o;
    });
  }

  /** Prototype `runT`: drive one patch track at progress a (hold keeps finished patches shown). */
  runT(tk: TrackKey, a: number, hold?: boolean) {
    if (!this.T) return;
    const list = this.T[tk],
      on = a > 0 && (a < 1 || !!hold) && !this.rm;
    list.forEach((p) => {
      if (!on) {
        if (p.w.style.display !== "none") p.w.style.display = "none";
        return;
      }
      if (p.w.style.display === "none") p.w.style.display = "block";
      this.patchSet(p, clamp((a - p.d.a) / Math.max(0.001, p.d.b - p.d.a)));
    });
  }

  /** Prototype `setOff`: scroll the screen inside the phone by off (0..250 screenshot px). */
  setOff(off: number) {
    off = Math.max(0, Math.min(250, off || 0));
    const din = document.getElementById("dash-in");
    if (!din || !this.T) return;
    const v = "translateY(" + (-off * this.k).toFixed(2) + "px)";
    if (din.style.transform !== v) din.style.transform = v;
    this.off = off;
  }

  get offset(): number {
    return this.off;
  }

  /** Prototype `phonePhase`. */
  phase(ph: "intro" | "hero" | "day", a?: number | null, st?: number | null) {
    if (!this.T || !this.mh) return;
    const rm = this.rm;
    const key = ph + "|" + (a != null ? a.toFixed(4) : "") + "|" + (st != null ? st.toFixed(4) : "");
    if (key === this.key) return;
    this.key = key;
    const mh = this.mh;
    const off = () => {
      mh.style.display = "none";
      this.dims.forEach((d) => d && (d.style.opacity = "0"));
      this.cards.forEach((c) => c && (c.style.opacity = "0"));
    };
    if (ph !== "day") {
      off();
      (["nut", "train", "health"] as const).forEach((t) => this.runT(t, 0));
      if (ph === "intro") {
        this.setBase(0);
        this.runT("hero", 0);
        this.state = { state: "01" };
      } else {
        const av = a ?? 0;
        const h = rm ? (av >= 0.5 ? 1 : 0) : av;
        this.setBase(h >= 1 ? 1 : 0);
        this.runT("hero", h);
        this.state = { state: h >= 1 ? "02" : h <= 0 ? "01" : "01>02", hero: +h.toFixed(3) };
      }
      return;
    }
    this.runT("hero", 0);
    const stv = st ?? 0;
    const SG = daySegs(this.lgRef()),
      U = SG.map(([x, y]) => clamp((stv - x) / (y - x))),
      A = U.map((u) => (rm ? (u >= 0.5 ? 1 : 0) : clamp(u / 0.75)));
    const [aN, aT, aH, aC, aK, aD] = A;
    const healthDone = aH >= 1,
      done = aD >= 1;
    this.setBase(done ? 3 : healthDone ? 2 : 1);
    (["nut", "train", "health"] as const).forEach((t, i) => this.runT(t, healthDone ? 0 : [aN, aT, aH][i], true));
    const swap = rm ? aK : sm(0, 0.5, aK),
      close = rm ? (U[4] >= 0.9 ? 1 : 0) : sm(0.7, 0.95, aK),
      dimA = aC * (1 - close),
      sp = aC >= 1 ? 1 : 1 - Math.exp(-6 * aC) * Math.cos(8 * aC);
    if (this.dims[0]) this.dims[0].style.opacity = (dimA * (1 - swap)).toFixed(3);
    if (this.dims[1]) this.dims[1].style.opacity = (dimA * swap).toFixed(3);
    const c0 = this.cards[0],
      c1 = this.cards[1];
    if (c0) {
      c0.style.opacity = (swap >= 1 ? 0 : Math.min(1, aC * 2.5) * (1 - close)).toFixed(3);
      c0.style.transform = rm
        ? "none"
        : "translateX(" + (-swap * 120).toFixed(2) + "%) translateY(" + ((1 - sp) * 40).toFixed(2) + "%) scale(" + (0.92 + 0.08 * sp).toFixed(4) + ")";
    }
    if (c1) {
      c1.style.opacity = (swap <= 0 ? 0 : 1 - close).toFixed(3);
      c1.style.transform = rm
        ? "none"
        : "translateX(" + ((1 - swap) * 120).toFixed(2) + "%) translateY(" + (close * 6).toFixed(2) + "%) scale(" + (1 - 0.06 * close).toFixed(4) + ")";
    }
    const mo = aD > 0 && !done;
    mh.style.display = mo ? "block" : "none";
    if (mo) {
      const k3 = this.k,
        k4 = this.k4;
      this.M.forEach((m, i) => {
        const e0 = clamp((aD - i * 0.035) / 0.6),
          e = easeInOut3(e0),
          L = (j: number) => m.r3[j] * k3 + (m.r4[j] * k4 - m.r3[j] * k3) * e;
        m.w.style.left = L(0) + "px";
        m.w.style.top = L(1) + "px";
        m.w.style.width = L(2) + "px";
        m.w.style.height = L(3) + "px";
        const c = sm(0.15, 0.85, e0);
        m.A.style.opacity = (1 - c).toFixed(3);
        m.B.style.opacity = c.toFixed(3);
        m.B.style.transform = "translateY(" + ((1 - c) * 6).toFixed(2) + "px)";
      });
    }
    const pop = dimA > 0.001 ? (swap < 0.5 ? "05" : "06") : null;
    this.state = { state: done ? "04" : pop || (mo ? "03>04" : healthDone ? "03" : aN > 0 ? "02>03" : "02"), A: A.map((v) => +v.toFixed(3)) };
  }
}
