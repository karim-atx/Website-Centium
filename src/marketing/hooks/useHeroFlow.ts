import { useEffect, useRef } from "react";

/** The Home hero's animated "river currents" background — supersedes
 *  useMembraneCanvas per the v2 Claude Design handoff ("Atraxia landing
 *  page (atraxia.org root) — imported changes" is the Atraxia file; this
 *  one is scratchpad/design-handoff-centium-landing-v2/design_handoff_centium_landing/README.md).
 *  Soft blurred gradient streaks flow inward from both edges, converging on
 *  the headline ("all health data flows into Centium"). Ported near-verbatim
 *  from the handoff's own hero-flow.js per its explicit instruction that the
 *  file is framework-agnostic and should be ported as-is — variable names
 *  and structure match the original so the two stay easy to diff against
 *  each other.
 *
 *  Rendered at half resolution into an offscreen canvas, then upscaled with
 *  a ~1px CSS blur on the visible canvas. A single continuous eased
 *  displacement field follows the cursor (smoothed chase + hover-energy
 *  easing) rather than discrete per-mousemove ripples, which the handoff
 *  calls out as having read jittery in an earlier version. Pauses via
 *  IntersectionObserver when scrolled out of view, and renders one static
 *  frame under prefers-reduced-motion instead of animating. */
export function useHeroFlow() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const TAU = Math.PI * 2;
    const LOOP = 18; // seconds, ambient flow period
    const PULSE = 15; // seconds, opacity pulse period
    const N = 72; // samples per streak

    let seed = 91731;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    interface Streak {
      side: number;
      y0: number;
      y1: number;
      bend: number;
      w: number;
      alpha: number;
      speed: number;
      phase: number;
      wob: number;
      k: number;
    }

    // side: -1 = enters from the left and sweeps right/inward, 1 = mirror.
    const streaks: Streak[] = [];
    const rows = [0.02, 0.09, 0.15, 0.21, 0.27, 0.34, 0.4, 0.47, 0.54, 0.61, 0.68, 0.76, 0.84, 0.93];
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < rows.length; i++) {
        const side = s === 0 ? -1 : 1;
        streaks.push({
          side,
          y0: rows[i] + (rnd() - 0.5) * 0.03,
          y1: 0.2 + rnd() * 0.46,
          bend: 0.22 + rnd() * 0.5,
          w: 7 + rnd() * 11,
          alpha: 0.4 + rnd() * 0.3,
          speed: 0.7 + rnd() * 0.7,
          phase: rnd() * TAU,
          wob: 0.012 + rnd() * 0.02,
          k: 1.2 + rnd() * 1.8,
        });
      }
    }

    // Pointer state is smoothed every frame (sx,sy chase x,y; e is hover
    // energy easing 0..1), so the displacement field moves continuously
    // instead of being re-seeded by discrete mousemove events.
    const P = { x: 0, y: 0, sx: 0, sy: 0, e: 0, has: false, init: false };

    let w = 0, h = 0, bw = 0, bh = 0, cx = 0, cy = 0;
    let off: HTMLCanvasElement | null = null;
    let octx: CanvasRenderingContext2D | null = null;

    const size = () => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      w = Math.round(r.width);
      h = Math.round(r.height);
      c.width = w;
      c.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      c.style.filter = "blur(" + Math.max(1, Math.round(w * 0.0008)) + "px)";
      bw = Math.max(2, Math.round(w / 2));
      bh = Math.max(2, Math.round(h / 2));
      if (!off) off = document.createElement("canvas");
      off.width = bw;
      off.height = bh;
      octx = off.getContext("2d");
      if (octx) {
        octx.imageSmoothingEnabled = true;
        octx.lineJoin = "round";
        octx.lineCap = "round";
      }
      cx = bw * 0.5;
      cy = bh * 0.36;
      return true;
    };

    // Cubic bezier from off-canvas edge toward a point just short of centre.
    const pt = (st: Streak, u: number, t: number) => {
      const x0 = st.side < 0 ? -0.16 * bw : 1.16 * bw;
      const y0 = st.y0 * bh;
      const x3 = st.side < 0 ? bw * 0.485 : bw * 0.515;
      const y3 = st.y1 * bh;
      const x1 = x0 + (x3 - x0) * 0.34;
      const y1 = y0 + (y3 - y0) * (0.02 + st.bend * 0.1) - st.bend * bh * 0.16;
      const x2 = x0 + (x3 - x0) * 0.72;
      const y2 = y0 + (y3 - y0) * 0.86 + st.bend * bh * 0.1;
      const m = 1 - u;
      let x = m * m * m * x0 + 3 * m * m * u * x1 + 3 * m * u * u * x2 + u * u * u * x3;
      let y = m * m * m * y0 + 3 * m * m * u * y1 + 3 * m * u * u * y2 + u * u * u * y3;
      // ambient undulation — the "current" moving through the streak
      const f = Math.sin(u * st.k * Math.PI * 2 - (t / LOOP) * TAU * st.speed + st.phase);
      y += f * bh * st.wob * (0.35 + u * 0.9);
      x += Math.cos(u * st.k * 4 + st.phase) * bw * 0.006;
      return { x, y };
    };

    // Soft radial displacement around the smoothed cursor: amplitude falls
    // off as a gaussian and the wave phase advances with the clock, so the
    // water keeps moving under the cursor rather than pulsing per event.
    const applyRipple = (p: { x: number; y: number }, t: number) => {
      if (P.e < 0.004) return p;
      const dx = p.x - P.sx, dy = p.y - P.sy;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const R = Math.max(60, bw * 0.15);
      const fall = Math.exp(-(d * d) / (R * R * 1.5));
      const amp = 30 * P.e * fall * Math.sin(d / (R * 0.34) - t * 2.6);
      const swirl = 9 * P.e * fall * Math.sin(d / (R * 0.5) - t * 1.7);
      p.x += (dx / d) * amp - (dy / d) * swirl;
      p.y += (dy / d) * amp + (dx / d) * swirl;
      return p;
    };

    const stroke = (st: Streak, t: number, width: number, alpha: number, dash: boolean) => {
      if (!octx) return;
      const g = octx.createLinearGradient(
        st.side < 0 ? 0 : bw,
        st.y0 * bh,
        st.side < 0 ? bw * 0.62 : bw * 0.38,
        st.y1 * bh
      );
      if (st.side < 0) {
        g.addColorStop(0, "rgba(109,80,198,0)");
        g.addColorStop(0.16, "rgba(109,80,198," + alpha + ")");
        g.addColorStop(0.62, "rgba(140,116,222," + alpha * 0.9 + ")");
        g.addColorStop(0.9, "rgba(174,161,220," + alpha * 0.45 + ")");
        g.addColorStop(1, "rgba(174,161,220,0)");
      } else {
        g.addColorStop(0, "rgba(66,146,134,0)");
        g.addColorStop(0.16, "rgba(66,146,134," + alpha + ")");
        g.addColorStop(0.62, "rgba(110,172,162," + alpha * 0.9 + ")");
        g.addColorStop(0.9, "rgba(162,200,194," + alpha * 0.45 + ")");
        g.addColorStop(1, "rgba(162,200,194,0)");
      }
      octx.strokeStyle = g;
      octx.lineWidth = width;
      if (dash) {
        octx.setLineDash([bw * 0.1, bw * 0.14]);
        octx.lineDashOffset = -((t / LOOP) * bw * 3.4 * st.speed) % (bw * 0.24);
      } else {
        octx.setLineDash([]);
      }
      octx.beginPath();
      for (let i = 0; i <= N; i++) {
        const p = applyRipple(pt(st, i / N, t), t);
        if (i === 0) octx.moveTo(p.x, p.y);
        else octx.lineTo(p.x, p.y);
      }
      octx.stroke();
      octx.setLineDash([]);
    };

    const draw = (t: number) => {
      if (!octx) return;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalCompositeOperation = "source-over";
      octx.clearRect(0, 0, bw, bh);

      // deep corner washes so there is no flat white negative space
      let g = octx.createRadialGradient(bw * 0.08, bh * 0.28, 0, bw * 0.08, bh * 0.28, bw * 0.78);
      g.addColorStop(0, "rgba(132,104,216,0.3)");
      g.addColorStop(1, "rgba(150,127,224,0)");
      octx.fillStyle = g;
      octx.fillRect(0, 0, bw, bh);
      g = octx.createRadialGradient(bw * 0.94, bh * 0.42, 0, bw * 0.94, bh * 0.42, bw * 0.74);
      g.addColorStop(0, "rgba(96,168,157,0.28)");
      g.addColorStop(1, "rgba(112,178,168,0)");
      octx.fillStyle = g;
      octx.fillRect(0, 0, bw, bh);
      g = octx.createRadialGradient(bw * 0.5, bh * 1.02, 0, bw * 0.5, bh * 1.02, bw * 0.6);
      g.addColorStop(0, "rgba(140,118,220,0.2)");
      g.addColorStop(1, "rgba(158,140,226,0)");
      octx.fillStyle = g;
      octx.fillRect(0, 0, bw, bh);

      for (let i = 0; i < streaks.length; i++) {
        const st = streaks[i];
        const pulse = 0.66 + 0.34 * Math.sin((t / PULSE) * TAU + st.phase * 1.7);
        octx.filter = "blur(" + Math.max(2, Math.round(bw * 0.005)) + "px)";
        stroke(st, t, st.w * 2.6, st.alpha * pulse * 0.42, false);
        octx.filter = "blur(" + Math.max(1, Math.round(bw * 0.0016)) + "px)";
        stroke(st, t, st.w, st.alpha * pulse, false);
        octx.filter = "blur(" + Math.max(1, Math.round(bw * 0.0012)) + "px)";
        stroke(st, t, st.w * 0.5, st.alpha * pulse * 1.15, true);
      }
      octx.filter = "none";

      // keep the headline area legible
      octx.globalCompositeOperation = "destination-out";
      const gm = octx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(bw * 0.24, bh * 0.42));
      gm.addColorStop(0, "rgba(0,0,0,0.34)");
      gm.addColorStop(0.55, "rgba(0,0,0,0.14)");
      gm.addColorStop(1, "rgba(0,0,0,0)");
      octx.fillStyle = gm;
      octx.fillRect(0, 0, bw, bh);
      octx.globalCompositeOperation = "source-over";

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off as HTMLCanvasElement, 0, 0, w, h);
    };

    let raf = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let visible = true;
    let last = 0;

    const start = () => {
      if (!size()) {
        retry = setTimeout(start, 140);
        return;
      }
      const t0 = performance.now();
      const frame = (now: number) => {
        if (!c.isConnected) return;
        const t = (now - t0) / 1000;
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        // critically-damped chase toward the raw pointer + eased hover energy
        const k = 1 - Math.pow(0.0016, dt);
        P.sx += (P.x - P.sx) * k;
        P.sy += (P.y - P.sy) * k;
        const target = P.has && !reduce ? 1 : 0;
        P.e += (target - P.e) * (1 - Math.pow(target > P.e ? 0.02 : 0.12, dt));
        if (visible && !document.hidden) {
          draw(reduce ? 0 : t);
          if (reduce) return;
        }
        raf = requestAnimationFrame(frame);
      };
      raf = requestAnimationFrame(frame);
    };
    start();

    const onMove = (e: MouseEvent | TouchEvent) => {
      const p = "touches" in e ? e.touches[0] : e;
      if (!p) return;
      const r = c.getBoundingClientRect();
      const x = (p.clientX - r.left) / 2;
      const y = (p.clientY - r.top) / 2;
      P.x = x;
      P.y = y;
      P.has = x >= -30 && y >= -30 && x <= r.width / 2 + 30 && y <= r.height / 2 + 30;
      if (!P.init) {
        P.init = true;
        P.sx = x;
        P.sy = y;
      }
    };
    const onLeave = () => {
      P.has = false;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });

    let ro: ResizeObserver | null = null;
    if (window.ResizeObserver) {
      ro = new ResizeObserver(() => size());
      ro.observe(c);
    }
    let io: IntersectionObserver | null = null;
    if (window.IntersectionObserver) {
      io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { rootMargin: "80px" });
      io.observe(c);
    }

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (retry) clearTimeout(retry);
      if (ro) ro.disconnect();
      if (io) io.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return canvasRef;
}
