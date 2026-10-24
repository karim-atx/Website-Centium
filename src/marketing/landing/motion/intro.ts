// Centium landing v29: the intro (IN1 Acts 1 to 3) and hero (HE1), ported
// literally from the prototype's measure() intro block, onScroll() intro
// block, introProgress, phonePose, introPhone and introOff (handover
// 03_motion/02-scroll-architecture.md, 03-intro-acts.md,
// 05-hero-dashboard-section01.md). Desktop: Act 1 p 0..0.32 lines lead and
// the five app boxes appear at their tips; Act 2 p 0.37..0.56 the second
// title; Act 3 the boxes dock into the phone, which appears at 0.56..0.61.
// Mobile: partial arcs; the boxes gather into one cluster (0.57..0.66) and
// the phone grows out of it (0.66..0.72). The navbar slides in at 0.79..0.83
// and the hero fills screen 01 into 02 over 0.82..0.97.

import { clamp, easeInOut3, sm } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import { landingState } from "../state";
import { placeDot } from "../loading/title";
import type { LoaderEntry } from "../loading/pickLoader";
import type { PhoneMotion } from "./phone";
import type { Strands, StrandRect, Swirl } from "../lines/strands";

interface Frag {
  el: HTMLElement;
  w: number;
  h: number;
  side: number;
  ch?: HTMLElement | null;
  sk?: HTMLElement | null;
}
interface Slot {
  x: number;
  y: number;
  w: number;
  h: number;
}
interface IntroM {
  top: number;
  span: number;
  vw: number;
  vh: number;
  lg: boolean;
  s: number;
  sI: number;
  frags: Frag[];
  anchors: [number, number][];
  slots: Slot[];
  dyHero: number;
  phone: HTMLElement | null;
  words: HTMLElement[];
  stm0: HTMLElement | null;
  stm1: HTMLElement | null;
  copy: HTMLElement | null;
  tRect: StrandRect | null;
  pf: (HTMLElement | null)[];
}

export interface IntroDebug {
  ip: number;
  act: number;
  nav: { v: number; p: number } | null;
  side: { v: number; scale: number; offset: number } | null;
  phone: Record<string, unknown>;
}

export class IntroMotion implements EngineSection {
  private M: IntroM | null = null;
  private field: Strands | null = null;
  private navVis: number | null = null;
  private mEll: Swirl | null = null;
  private mStage: [number, number][] | null = null;
  private mSettle: [number, number][] | null = null;
  debug: IntroDebug = { ip: 0, act: 1, nav: null, side: null, phone: {} };

  private phone: PhoneMotion;
  private entry: LoaderEntry;
  private rm: boolean;

  constructor(phone: PhoneMotion, entry: LoaderEntry, rm: boolean) {
    this.phone = phone;
    this.entry = entry;
    this.rm = rm;
  }

  /** The intro line field, once the code-split line engine has arrived. */
  attachField(s: Strands, lg: boolean) {
    const nb = lg ? 10 : 4,
      nt = lg ? 9 : 3;
    s.groups(
      [0, 1, 2, 3, 4]
        .map((i) => ({ side: i % 2 ? 1 : -1, n: nb, hue: (i % 2 ? "teal" : "lav") as "teal" | "lav" }))
        .concat([
          { side: -1, n: nt, hue: "lav" },
          { side: 1, n: nt, hue: "teal" },
        ]),
    );
    this.field = s;
  }

  /** Where Skip intro scrolls to: the end of the intro track. */
  get end(): number | null {
    return this.M ? this.M.top + this.M.span : null;
  }

  measure(ctx: EngineCtx) {
    const top = (el: Element | null) => (el ? el.getBoundingClientRect().top + window.scrollY : 0);
    const lg = ctx.lg;
    const stg = document.getElementById("intro-stage"),
      track = document.getElementById("intro-track");
    if (!stg || !track) {
      this.M = null;
      return;
    }
    const svw = stg.clientWidth,
      svh = stg.clientHeight;
    const s = lg ? Math.min(1, (svw - 120) / (290 * 2.7 + 52), (svh - 230) / 662) : (0.9 * svw) / 290;
    const sI = lg ? s : (0.6 * svw) / 290;
    const h2 = document.querySelector<HTMLElement>("#stm0 h2"),
      th = h2 ? h2.offsetHeight : 160;
    const tTop = svh * 0.46 - th / 2,
      tBot = svh * 0.46 + th / 2;
    const frags: Frag[] = Array.from(document.querySelectorAll<HTMLElement>("[data-frag]")).map((el, i) => ({
      el,
      w: el.offsetWidth,
      h: el.offsetHeight,
      side: i % 2 ? 1 : -1,
    }));
    const cue = lg ? 96 : 68,
      anchors: [number, number][] = [];
    if (frags.length === 5) {
      if (lg) {
        const yTop = Math.max(84, (72 + tTop) / 2 - Math.max(frags[0].h, frags[1].h) / 2);
        const band0 = tBot + 16,
          band1 = svh - cue,
          hb = Math.max(frags[2].h, frags[3].h, frags[4].h);
        const yBot = Math.max(band0, (band0 + band1) / 2 - hb / 2);
        anchors.push(
          [svw * 0.2 - frags[0].w / 2, Math.min(yTop, tTop - 16 - frags[0].h)],
          [svw * 0.8 - frags[1].w / 2, Math.min(yTop, tTop - 16 - frags[1].h)],
          [svw * 0.2 - frags[2].w / 2, yBot],
          [svw * 0.8 - frags[3].w / 2, yBot],
          [svw * 0.5 - frags[4].w / 2, yBot + 18],
        );
      } else {
        const g = 10,
          Lx = (i: number) => svw / 2 - g / 2 - frags[i].w,
          rr = svw / 2 + g / 2;
        const htop = Math.max(frags[0].h, frags[1].h),
          yTop = Math.max(80, (72 + tTop) / 2 - htop / 2);
        const b0 = tBot + 12,
          b1 = svh - 16,
          h1 = frags[2].h,
          h2b = frags[4].h;
        let y1 = b0,
          y2 = y1 + h1 + 10;
        const over = y2 + h2b - b1;
        if (over < 0) {
          const extra = Math.min(-over / 3, 40);
          y1 += extra;
          y2 += extra * 1.6;
        }
        const h2e = document.querySelector<HTMLElement>("#stm1 h2"),
          czT = (tTop + tBot) / 2,
          hzT = Math.max(tBot - tTop, h2e ? h2e.offsetHeight : 0) / 2;
        const tTopZ = czT - hzT,
          tBotZ = czT + hzT;
        this.mEll = { cx: svw / 2, cy: czT, rx: svw * 0.5 - 6, ry: (hzT + 24) * 1.25 };
        const sc2 = 0.5,
          up = (i: number) => i % 2 === 0,
          Z = 24;
        this.mStage = frags.map((f, i) => [svw / 2 - f.w / 2, up(i) ? Math.max(8, tTopZ - Z - f.h) : Math.min(svh - 8 - f.h, tBotZ + Z)]);
        this.mSettle = frags.map((f, i) => {
          const left = Math.floor(i / 2) === 0;
          return [left ? 8 : svw - 8 - f.w * sc2, up(i) ? Math.max(8, tTopZ - Z - f.h - 10 - f.h * sc2) : Math.min(svh - 8 - f.h * sc2, tBotZ + Z + f.h + 10)];
        });
        anchors.push([Lx(0), Math.min(yTop, tTop - 10 - frags[0].h)], [rr, Math.min(yTop, tTop - 10 - frags[1].h)], [Lx(2), y1], [rr, y1 + 18], [Lx(4), y2]);
      }
    }
    const phone = document.getElementById("phone");
    const din = document.getElementById("dash-in"),
      dprev = din ? din.style.transform : "";
    if (din) din.style.transform = "none";
    const pr = phone ? phone.getBoundingClientRect() : { left: 0, top: 0, width: 290 },
      pk = pr.width / 290 || 1;
    const slots: Slot[] = Array.from(document.querySelectorAll<HTMLElement>("[data-slot]"))
      .map((el) => {
        const r = el.getBoundingClientRect();
        return { i: +el.getAttribute("data-slot")!, x: (r.left - pr.left) / pk, y: (r.top - pr.top) / pk, w: r.width / pk, h: r.height / pk };
      })
      .sort((a, b) => a.i - b.i);
    if (din) din.style.transform = dprev;
    const copy = document.getElementById("hero-copy");
    const copyBot = copy ? copy.offsetTop + copy.offsetHeight : svh * 0.55;
    const heroCy = copyBot + (lg ? 44 : 28) + 331 * s,
      dyHero = heroCy - svh / 2;
    const tail = document.getElementById("hero-tail");
    if (tail) tail.style.height = Math.max(0, Math.round(heroCy + 331 * s - svh + (lg ? 48 : 32))) + "px";
    this.phone.build();
    const M: IntroM = {
      top: top(track),
      span: Math.max(1, track.offsetHeight - svh),
      vw: svw,
      vh: svh,
      lg,
      s,
      sI,
      frags,
      anchors,
      slots,
      dyHero,
      phone,
      words: Array.from(document.querySelectorAll<HTMLElement>("[data-wd]")),
      stm0: document.getElementById("stm0"),
      stm1: document.getElementById("stm1"),
      copy,
      tRect: null,
      pf: [document.getElementById("phone-food"), document.getElementById("phone-work")],
    };
    const h1 = document.querySelector("#stm1 h2"),
      sr = stg.getBoundingClientRect();
    if (h1) {
      const rg = document.createRange();
      rg.selectNodeContents(h1);
      const rs = Array.from(rg.getClientRects()).filter((x) => x.width > 2);
      if (rs.length) {
        const x0 = Math.min(...rs.map((x) => x.left)),
          x1 = Math.max(...rs.map((x) => x.right)),
          y0 = Math.min(...rs.map((x) => x.top)),
          y1 = Math.max(...rs.map((x) => x.bottom));
        const ty = /translateY\(([-\d.]+)px\)/.exec(M.stm1?.style.transform || "");
        const dy = ty ? +ty[1] : 0;
        M.tRect = { x: x0 - sr.left - 8, y: y0 - sr.top - dy, w: x1 - x0 + 16, h: y1 - y0 };
      }
    }
    this.M = M;
    if (this.field) this.field.resize();
    // The leaf dot over the dotless i follows the title's layout. The
    // prototype only placed it during LO1, so without LO1 (or after a
    // resize) it sat at the i-wrap's corner; placed on every measure here.
    if (landingState.get().lo1Done) placeDot(document.getElementById("i-wrap"), document.getElementById("i-dot"));
  }

  /** Prototype `introProgress`: desktop 235vh for Acts 1-2 (to p 0.56), 50vh to 0.8, 84vh to 1; mobile 105 / 40 / 40. */
  private progress(y: number): number {
    const M = this.M;
    if (!M) return 0;
    const v = ((y - M.top) / M.vh) * 100;
    if (v <= 0) return 0;
    const A = M.lg ? 235 : 105,
      B = M.lg ? 50 : 40,
      H = M.lg ? 84 : 40;
    if (v < A) return (v / A) * 0.56;
    if (v < A + B) return 0.56 + ((v - A) / B) * 0.24;
    return Math.min(1, 0.8 + ((v - A - B) / H) * 0.2);
  }

  /** Prototype `introOff`: the screen inside the phone sits 250px down while the boxes dock, then returns. */
  private introOff(p: number): number {
    return this.rm ? 0 : 250 * (1 - sm(0.7, 0.745, p)) * sm(0.5, 0.56, p);
  }

  /** Prototype `phonePose` (section 01 is not on the page yet: after the intro the phone scrolls away with it). */
  private phonePose(y: number, p: number) {
    const M = this.M!,
      rm = this.rm;
    const pIn = M.lg ? (rm ? (p > 0.57 ? 1 : 0) : sm(0.56, 0.61, p)) : rm ? (p > 0.7 ? 1 : 0) : sm(0.66, 0.72, p),
      heroK = sm(0.8, 0.93, p);
    let dy = M.dyHero * heroK;
    const sc = (M.sI || M.s) + (M.s - (M.sI || M.s)) * heroK,
      op = pIn;
    const end = M.top + M.span,
      after = y - end;
    if (after > 0) dy = M.dyHero - after;
    return { dy, sc, op };
  }

  /** Prototype `introPhone`. */
  private introPhone(p: number) {
    const din = document.getElementById("dash-in");
    if (!din) return;
    const o = this.rm ? (p > 0.58 ? 1 : 0) : this.M && !this.M.lg ? sm(0.66, 0.72, p) : sm(0.56, 0.62, p);
    din.style.opacity = o.toFixed(3);
    this.phone.setOff(this.introOff(p));
    if (p < 0.82) this.phone.phase("intro");
    else this.phone.phase("hero", clamp((p - 0.82) / 0.15));
  }

  scroll(y: number) {
    const M = this.M;
    if (!M) return;
    const rm = this.rm,
      F = this.field;
    const p = this.progress(y);
    const st = landingState.get();
    this.debug.ip = p;
    this.debug.act = p < 0.32 ? 1 : p < 0.56 ? 2 : p < 0.8 ? 3 : 4;
    const ready = st.loaded ? 1 : 0;
    const cue = document.getElementById("scroll-cue");
    if (cue) cue.style.opacity = ((1 - sm(0.01, 0.05, p)) * ready).toFixed(3);
    {
      const hd = document.getElementById("site-nav");
      if (hd) {
        const lo2 = this.entry.kind === "lo2" && !st.loaded,
          v = lo2 ? 1 : rm ? (p >= 0.8 ? 1 : 0) : sm(0.79, 0.83, p);
        if (v !== this.navVis) {
          this.navVis = v;
          const e = 1 - Math.pow(1 - v, 3);
          hd.style.transform = "translateY(" + ((e - 1) * 100).toFixed(2) + "%)";
          hd.style.opacity = v.toFixed(3);
          hd.style.pointerEvents = v > 0.5 ? "auto" : "none";
          if (v < 0.5 && st.menuOpen) landingState.set({ menuOpen: false });
        }
        this.debug.nav = { v: +v.toFixed(3), p: +p.toFixed(3) };
      }
    }
    const o0 = 1 - sm(0.27, 0.32, p);
    const idt = document.getElementById("i-dot");
    if (idt && st.lo1Done) {
      const lf = rm ? 0 : sm(0.25, 0.31, p);
      idt.style.transform = lf ? "translateY(" + (-lf * 18).toFixed(2) + "px) rotate(" + (-lf * 28).toFixed(2) + "deg)" : "";
    }
    if (M.stm0) {
      M.stm0.style.opacity = o0.toFixed(3);
      M.stm0.style.transform = "translate(-50%,-50%)" + (rm ? "" : " translateY(" + (-(1 - o0) * 14).toFixed(1) + "px)");
    }
    const o1 = rm ? (p > 0.36 && p < 0.56 ? 1 : 0) : sm(0.37, 0.41, p) * (1 - sm(0.54, 0.58, p));
    if (M.stm1) {
      M.stm1.style.opacity = o1.toFixed(3);
      M.stm1.style.transform = "translate(-50%,-50%)" + (rm ? "" : " scale(" + (0.97 + 0.03 * o1).toFixed(4) + ")");
    }
    const wp = clamp((p - 0.4) / 0.13);
    M.words.forEach((w, j, a) => {
      w.style.opacity = (0.14 + 0.86 * clamp(wp * a.length - j)).toFixed(3);
    });
    const cx = M.vw / 2,
      cy = M.vh / 2,
      s = M.sI || M.s;
    const pose = this.phonePose(y, p);
    if (M.phone) {
      M.phone.style.opacity = pose.op.toFixed(3);
      M.phone.style.transform = "translateY(" + pose.dy.toFixed(1) + "px) scale(" + pose.sc.toFixed(4) + ")";
    }
    if (M.lg) {
      const endT = M.top + M.span,
        exitLen = M.vh * 0.22,
        out = clamp((y - endT) / exitLen),
        v = (rm ? (p >= 0.86 ? 1 : 0) : sm(0.82, 0.92, p)) * (rm ? (out > 0.5 ? 0 : 1) : 1 - sm(0, 1, out)),
        e = 1 - Math.pow(1 - v, 3),
        k = 0.85 * pose.sc * (0.82 + 0.18 * e),
        X = e * ((290 * pose.sc) / 2 + (290 * k) / 2 + 22),
        Y = pose.dy + 14 * e;
      M.pf.forEach((el, j) => {
        if (!el) return;
        el.style.opacity = v.toFixed(3);
        el.style.zIndex = "0";
        el.style.transform = "translateX(" + ((j ? 1 : -1) * X).toFixed(1) + "px) translateY(" + Y.toFixed(1) + "px) scale(" + k.toFixed(4) + ")";
      });
      if (M.phone) M.phone.style.zIndex = "1";
      this.debug.side = { v: +v.toFixed(3), scale: +k.toFixed(3), offset: Math.round(X) };
    }
    const SS = F;
    M.frags.forEach((f, i) => {
      const a = M.anchors[i];
      if (!a) return;
      const sl = M.slots[i];
      const s0 = 0.02 + i * 0.055,
        lr = rm ? (p > 0.02 ? 1 : 0) : sm(s0, s0 + 0.07, p),
        appear = rm ? (p > 0.02 ? 1 : 0) : M.lg ? sm(s0 + 0.055, s0 + 0.095, p) : sm(s0 + 0.058, s0 + 0.1, p);
      const dk = M.lg ? (rm ? (p > 0.7 ? 1 : 0) : clamp((p - (0.595 + i * 0.028)) / 0.085)) : 0,
        e = easeInOut3(dk);
      const gth = M.lg ? 0 : rm ? (p > 0.6 ? 1 : 0) : sm(0.57 + i * 0.008, 0.66, p),
        gone = M.lg ? 0 : rm ? (p > 0.7 ? 1 : 0) : sm(0.66, 0.72, p);
      const drift = sm(0.32, 0.56, p) * 0.05;
      let x = a[0] + (cx - f.w / 2 - a[0]) * drift,
        yy = a[1] + (cy - f.h / 2 - a[1]) * drift,
        msc = 1;
      if (!M.lg && this.mStage && this.mSettle && !rm) {
        const s0n = 0.02 + (i + 2) * 0.055,
          nx = i < 3 ? sm(s0n + 0.05, s0n + 0.1, p) : 0,
          stg = this.mStage[i],
          se = this.mSettle[i];
        x = stg[0] + (se[0] - stg[0]) * nx;
        yy = stg[1] + (se[1] - stg[1]) * nx;
        msc = 1 - 0.5 * nx;
      }
      const offP = (this.phone.built ? this.phone.k : 0.575) * this.introOff(p),
        tx = sl ? cx + (sl.x - 145) * s : cx,
        ty = sl ? cy + (sl.y - offP - 331) * s : cy;
      x += (tx - x) * e;
      yy += (ty - yy) * e;
      let scx = msc + ((sl ? (sl.w * s) / f.w : 0.6) - msc) * e,
        scy = msc + ((sl ? (sl.h * s) / f.h : 0.6) - msc) * e;
      if (!M.lg && gth > 0) {
        const gs = 0.62,
          g2 = gth * gth * (3 - 2 * gth),
          tx2 = cx - (f.w * gs) / 2 + (i - 2) * 6,
          ty2 = cy - (f.h * gs) / 2 + (i - 2) * 5;
        x += (tx2 - x) * g2;
        yy += (ty2 - yy) * g2;
        scx = scx + (gs - scx) * g2;
        scy = scy + (gs - scy) * g2;
      }
      const k0 = rm ? 1 : M.lg ? 0.7 + 0.3 * appear : 0.04 + 0.96 * appear,
        ox = f.side < 0 ? 0 : f.w,
        oy = f.h / 2;
      const X = x + ox * (1 - k0) * scx,
        Y = yy + oy * (1 - k0) * scy;
      scx *= k0;
      scy *= k0;
      const fade = M.lg ? 1 - sm(0.9, 1, dk) : 1 - gone;
      if (f.ch === undefined) {
        f.ch = f.el.querySelector<HTMLElement>("[data-chrome]");
        f.sk = f.el.querySelector<HTMLElement>("[data-skin]");
      }
      if (f.ch) f.ch.style.opacity = (rm ? 1 : 1 - sm(0.1, 0.62, dk)).toFixed(3);
      if (f.sk) f.sk.style.opacity = (rm ? 0 : sm(0.12, 0.66, dk)).toFixed(3);
      f.el.style.opacity = (rm ? (p > 0.02 && p < 0.7 ? 1 : 0) : appear * fade).toFixed(3);
      f.el.style.transform = "translate(" + X.toFixed(1) + "px," + Y.toFixed(1) + "px) scale(" + scx.toFixed(4) + "," + scy.toFixed(4) + ")";
      if (SS) {
        SS.o.swirl = !M.lg && this.mEll && window.innerHeight > window.innerWidth ? this.mEll : null;
        SS.o.arc = !!SS.o.swirl;
        SS.set(i, {
          rect: { x: X, y: Y, w: f.w * scx, h: f.h * scy },
          reach: rm ? (p > 0.02 && p < 0.6 ? 1 : 0) : lr * (1 - sm(0, 0.65, dk)) * (M.lg ? 1 : 1 - gth),
          alpha: 1,
        });
      }
    });
    if (SS && M.tRect) {
      const tr = rm ? (p > 0.36 && p < 0.56 ? 1 : 0) : sm(0.3, 0.38, p) * (1 - sm(0.53, 0.6, p));
      [5, 6].forEach((g) => SS.set(g, { rect: M.tRect, reach: tr, alpha: 1 }));
    }
    this.introPhone(p);
    this.debug.phone = this.phone.state;
    if (M.copy) {
      const u = sm(0.8, 0.88, p);
      M.copy.style.opacity = u.toFixed(3);
      M.copy.style.transform = rm ? "none" : "translateY(" + ((1 - u) * 16).toFixed(1) + "px)";
      M.copy.style.pointerEvents = u > 0.5 ? "auto" : "none";
    }
    const sk = document.getElementById("skip-intro");
    if (sk) {
      const o = (1 - sm(0.88, 0.95, p)) * ready;
      sk.style.opacity = o.toFixed(3);
      sk.style.pointerEvents = o > 0.1 ? "auto" : "none";
    }
  }

  tick(t: number) {
    if (this.field) this.field.render(t);
  }

  destroy() {
    this.field = null;
    this.M = null;
  }
}
