// Centium landing v29: section 01 "Your day, in rhythm" (DY1 v15), the
// prototype's measure() day block and `dayScroll` (03_motion/05-hero-
// dashboard-section01.md). The track (#day-track, 710vh desktop / 405svh
// mobile) pins the stage while the shared phone (the same fixed phone as the
// hero) stays put at its section-01 pose (Dy: scale min(1,(vh-150)/662), 24px
// down on desktop; scale .46-.6 in the mobile phone slot) and runs the day:
// steps 02 to 03 (nutrition, training, health), 05 class pop-up, 06 coach
// pop-up, 04 (daySegs). Beside it the clock rolls from 09:30 to 21:30, the
// rail fills, the moment dots light and one step text at a time shows.
// IntroMotion reads `track` and `pose` for the move from the hero pose into
// this one (prototype phonePose C.day branch) and stops driving the phone
// once the track is a screen away (introPhone early return).

import { clamp, prog, sm, type Track } from "../engine/math";
import type { EngineCtx, EngineSection } from "../engine/scrollEngine";
import { daySegs, type PhoneMotion } from "./phone";

interface DayEls {
  dstep: HTMLElement[];
  rl: HTMLElement[];
  rd: HTMLElement[];
  rdm: HTMLElement[];
  rolls: HTMLElement[];
  railFill: HTMLElement | null;
  railFillM: HTMLElement | null;
  clockM: HTMLElement | null;
}

export class DayMotion implements EngineSection {
  /** The pinned track (prototype C.day), null while section 01 is not on the page. */
  track: Track | null = null;
  /** The phone's section-01 pose (prototype this.Dy). */
  pose: { s: number; dy: number } | null = null;
  private els: DayEls | null = null;
  private vh = 0;
  private lg = true;
  debug: Record<string, unknown> = {};

  private phone: PhoneMotion;
  private rm: boolean;

  constructor(phone: PhoneMotion, rm: boolean) {
    this.phone = phone;
    this.rm = rm;
  }

  measure(ctx: EngineCtx) {
    const vh = ctx.vh,
      lg = ctx.lg;
    this.vh = vh;
    this.lg = lg;
    const el = document.getElementById("day-track");
    if (!el) {
      this.track = null;
      this.pose = null;
      this.els = null;
      return;
    }
    this.track = { el, t: el.getBoundingClientRect().top + window.scrollY, span: Math.max(1, el.offsetHeight - vh) };
    if (document.getElementById("phone")) {
      this.phone.build();
      const sD = lg ? Math.min(1, (vh - 150) / 662) : Math.max(0.46, Math.min(0.6, (vh - 360) / 662));
      this.pose = { s: sD, dy: lg ? 24 : 80 + 331 * sD - vh / 2 };
    } else this.pose = null;
    const all = (sel: string) => Array.from(document.querySelectorAll<HTMLElement>(sel));
    this.els = {
      dstep: all("[data-dstep]"),
      rl: all("[data-rl]"),
      rd: all("[data-rd]"),
      rdm: all("[data-rdm]"),
      rolls: all("[data-roll]"),
      railFill: document.getElementById("rail-fill"),
      railFillM: document.getElementById("rail-fill-m"),
      clockM: document.getElementById("day-clock-m"),
    };
  }

  /** Prototype introPhone's early return: the day drives the phone from a screen before the track. */
  ownsPhone(y: number): boolean {
    return !!this.track && y >= this.track.t - this.vh;
  }

  scroll(y: number) {
    const C = this.els,
      tr = this.track;
    if (!C || !tr) return;
    const rm = this.rm;
    const SG = daySegs(this.lg);
    const st = prog(tr, y);
    const U = SG.map(([a, b]) => clamp((st - a) / (b - a)));
    if (y >= tr.t - this.vh) {
      const din = document.getElementById("dash-in");
      if (din && din.style.opacity !== "1") din.style.opacity = "1";
      const O = [0, 250, 250, 0, 0, 0, 0];
      let off = O[0];
      for (let k = 0; k < 6; k++) off += (O[k + 1] - O[k]) * sm(0, 0.15, U[k]);
      const lastOn = [0, 1, 2, 3, 4, 5].filter((k) => U[k] > 0).pop();
      this.phone.setOff(rm ? (lastOn != null ? O[lastOn + 1] : 0) : off);
      this.phone.phase("day", null, st);
    }
    const bump = (i: number) => {
      const u = U[i];
      return rm ? (u > 0 && (u < 1 || i === 5) ? 1 : 0) : sm(0, 0.08, u) * (i === 5 ? 1 : 1 - sm(0.92, 1, u));
    };
    C.dstep.forEach((el, i) => {
      const b = bump(i);
      el.style.opacity = b.toFixed(3);
      el.style.transform = "translateY(calc(-50% + " + ((1 - b) * 14).toFixed(1) + "px))";
    });
    const T = [9.5, 12.5, 13.5, 14.5, 17.5, 17.5, 21.5];
    let h = T[0];
    for (let k = 0; k < 6; k++) h += (T[k + 1] - T[k]) * sm(0, 0.2, U[k]);
    let f = 0;
    for (let k = 0; k < 6; k++) f += sm(0, 0.75, U[k]) / 6;
    if (C.railFill) C.railFill.style.transform = "scaleY(" + f.toFixed(4) + ")";
    if (C.railFillM) C.railFillM.style.transform = "scaleX(" + f.toFixed(4) + ")";
    C.rd.forEach((d, k) => {
      d.style.opacity = sm(0, 0.1, U[k]).toFixed(3);
    });
    C.rdm.forEach((d, k) => {
      d.style.opacity = sm(0, 0.1, U[k]).toFixed(3);
    });
    C.rl.forEach((d, k) => {
      d.style.opacity = (0.81 + 0.19 * bump(k)).toFixed(3);
    });
    const mins = Math.round(h * 60 * 1000) / 1000,
      hh = Math.floor(mins / 60),
      mm = Math.floor(mins) % 60,
      mf = mins - Math.floor(mins);
    const vals = [Math.floor(hh / 10), hh % 10, Math.floor(mm / 10), (mm % 10) + sm(0.5, 1, mf)];
    C.rolls.forEach((el) => {
      const kk = +el.getAttribute("data-roll")!;
      el.style.transform = "translateY(" + (-vals[kk]).toFixed(3) + "em)";
    });
    if (C.clockM) C.clockM.textContent = String(hh).padStart(2, "0") + ":" + String(mm).padStart(2, "0");
    this.debug = { st: +st.toFixed(4), ...this.phone.state };
  }

  destroy() {
    this.track = null;
    this.els = null;
  }
}
