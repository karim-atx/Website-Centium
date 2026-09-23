/**
 * useHeroFlow — the hero "river currents" canvas, ported from the dedicated
 * hero handoff's own `useHeroFlow.ts` (design_handoff_hero/), which is
 * itself taken directly from the approved design's `initHeroFlow()`.
 *
 * Replaces the previous version of this file, which grew this exact logic
 * independently (see git history) but had drifted from the dedicated
 * handoff's more detailed §6 in several ways: occlusion/degrade were the
 * hook's own responsibility (querying `.cent-loader-lockup` and listening
 * for Nav's NAV_JUMP_EVENT itself) instead of being supplied by the caller.
 * The dedicated handoff's own version takes `isOccluded`/`onDegrade` as
 * options instead — the caller (HeroSection.tsx) decides what "occluded"
 * and "degrade" mean, and this hook only owns the canvas render loop and
 * its own adaptive-quality grading. Plain canvas code: kept byte-for-byte
 * in behaviour against the handoff's own file. Nothing here goes through
 * React state; the hook only owns the effect lifecycle.
 */
import { useEffect, useRef } from "react";

export interface HeroFlowOptions {
  /** true while something opaque covers the hero: the brand loader, the
   *  contact / legal overlay screens, or a long nav scroll in progress.
   *  Read every frame — pass a stable function that reads refs/state. */
  isOccluded?: () => boolean;
  /** called ONCE if the device is graded too slow (tier 1). The nav glass
   *  must then drop backdrop-filter on [data-glassy] elements (README §7). */
  onDegrade?: () => void;
}

export function useHeroFlow(opts: HeroFlowOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const reduce = !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const TAU = Math.PI * 2;
    const LOOP = 18; // s, ambient flow period
    const PULSE = 15; // s, base of the per-strand pulse cycle
    const N = 72; // samples per strand

    // Seeded RNG: the field is IDENTICAL on every load. Do not swap for Math.random.
    let seed = 91731;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    type Strand = { side: number; y0: number; y1: number; bend: number; w: number; alpha: number; speed: number; phase: number; wob: number; k: number };
    const streaks: Strand[] = [];
    const rows: number[] = [];
    for (let r = 0; r < 34; r++) rows.push(0.012 + (r / 33) * 0.94);
    for (let s = 0; s < 2; s++) {
      for (let i = 0; i < rows.length; i++) {
        const thin = rnd();
        const w0 = thin < 0.5 ? 1.2 + thin * 5 : thin < 0.84 ? 6 + rnd() * 12 : 16 + rnd() * 18;
        streaks.push({
          side: s === 0 ? -1 : 1,
          y0: rows[i] + (rnd() - 0.5) * 0.03,
          y1: 0.2 + rnd() * 0.46,
          bend: 0.22 + rnd() * 0.5,
          w: w0,
          alpha: 0.4 + rnd() * 0.3,
          speed: 0.7 + rnd() * 0.7,
          phase: rnd() * TAU,
          wob: 0.012 + rnd() * 0.02,
          k: 1.2 + rnd() * 1.8,
        });
      }
    }

    const P = { x: 0, y: 0, sx: 0, sy: 0, e: 0, has: false, init: false };
    let w = 0, h = 0, bw = 0, bh = 0, cx = 0, cy = 0;
    let off: HTMLCanvasElement | null = null;
    let octx: CanvasRenderingContext2D | null = null;

    const size = () => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      w = Math.round(r.width);
      h = Math.round(r.height);
      // Backing store = HALF resolution; CSS stretches it to full size.
      // (The old port set c.width = w and drawImage-upscaled every frame: ~4x the
      // pixels uploaded and composited under the mask each frame.)
      c.width = Math.max(2, Math.round(w / 2));
      c.height = Math.max(2, Math.round(h / 2));
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      c.style.filter = "blur(" + Math.max(1, Math.round(w * 0.0008)) + "px)";
      bw = Math.max(2, Math.round(w / 2));
      bh = Math.max(2, Math.round(h / 2));
      if (!off) off = document.createElement("canvas");
      off.width = bw;
      off.height = bh;
      octx = off.getContext("2d");
      if (octx) { octx.imageSmoothingEnabled = true; octx.lineJoin = "round"; octx.lineCap = "round"; }
      cx = bw * 0.5;
      cy = bh * 0.36;
      return true;
    };

    const pt = (st: Strand, u: number, t: number) => {
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
      const f = Math.sin(u * st.k * Math.PI * 2 - (t / LOOP) * TAU * st.speed + st.phase);
      y += f * bh * st.wob * (0.35 + u * 0.9);
      x += Math.cos(u * st.k * 4 + st.phase) * bw * 0.006;
      return { x, y };
    };

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

    const pulseOf = (st: Strand, t: number) => {
      const cyc = Math.sin((t / (PULSE * 1.9)) * TAU + st.phase * 2.3);
      const burst = Math.pow(Math.max(0, cyc), 5);
      return 0.86 + 0.42 * burst - 0.1 * Math.max(0, -cyc);
    };

    const stroke = (st: Strand, t: number, width: number, alpha: number, dash: boolean) => {
      if (!octx) return;
      const g = octx.createLinearGradient(st.side < 0 ? 0 : bw, st.y0 * bh, st.side < 0 ? bw * 0.62 : bw * 0.38, st.y1 * bh);
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
        if (i === 0) octx.moveTo(p.x, p.y); else octx.lineTo(p.x, p.y);
      }
      octx.stroke();
      octx.setLineDash([]);
    };

    // ---- adaptive quality: graded ONCE (first 40 frames, mostly behind the
    // loader) and then LOCKED, so detail never visibly drops mid-view.
    let tier = 0; // 0 full · 1 no canvas blur (+ glass degraded) · 2 also no fine filaments
    const TS = { warmup: 0, slowRun: 0, graded: 0 };
    let tierLocked = false;
    const GRADE_FRAMES = 40, SLOW_MS = 28, SEVERE_MS = 46, RUN_TO_DEMOTE = 8;
    const gradeFrame = (dtMs: number) => {
      if (reduce || tier >= 2 || tierLocked) return;
      if (++TS.graded >= GRADE_FRAMES) tierLocked = true;
      if (TS.warmup++ < 6) return;
      const over = tier >= 1 ? dtMs > SEVERE_MS : dtMs > SLOW_MS;
      if (over) {
        if (++TS.slowRun >= RUN_TO_DEMOTE) {
          TS.slowRun = 0;
          tier += 1;
          c.setAttribute("data-hero-tier", String(tier));
          if (tier === 1) optsRef.current.onDegrade?.();
        }
      } else TS.slowRun = 0;
    };

    const draw = (t: number) => {
      if (!octx) return;
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalCompositeOperation = "source-over";
      octx.clearRect(0, 0, bw, bh);
      // three soft corner washes
      let g = octx.createRadialGradient(bw * 0.08, bh * 0.28, 0, bw * 0.08, bh * 0.28, bw * 0.78);
      g.addColorStop(0, "rgba(132,104,216,0.3)"); g.addColorStop(1, "rgba(150,127,224,0)");
      octx.fillStyle = g; octx.fillRect(0, 0, bw, bh);
      g = octx.createRadialGradient(bw * 0.94, bh * 0.42, 0, bw * 0.94, bh * 0.42, bw * 0.74);
      g.addColorStop(0, "rgba(96,168,157,0.28)"); g.addColorStop(1, "rgba(112,178,168,0)");
      octx.fillStyle = g; octx.fillRect(0, 0, bw, bh);
      g = octx.createRadialGradient(bw * 0.5, bh * 1.02, 0, bw * 0.5, bh * 1.02, bw * 0.6);
      g.addColorStop(0, "rgba(140,118,220,0.2)"); g.addColorStop(1, "rgba(158,140,226,0)");
      octx.fillStyle = g; octx.fillRect(0, 0, bw, bh);

      const lean = tier === 2;
      if (tier === 0) {
        // passes GROUPED by filter value: 3 filter changes per frame, not ~4 per strand
        octx.filter = "blur(" + Math.max(2, Math.round(bw * 0.005)) + "px)";
        for (const st of streaks) stroke(st, t, st.w * 2.6, st.alpha * pulseOf(st, t) * 0.42, false);
        octx.filter = "blur(" + Math.max(1, Math.round(bw * 0.0016)) + "px)";
        for (const st of streaks) stroke(st, t, st.w, st.alpha * pulseOf(st, t), false);
        octx.filter = "blur(" + Math.max(1, Math.round(bw * 0.0012)) + "px)";
        for (const st of streaks) stroke(st, t, st.w * 0.5, st.alpha * pulseOf(st, t) * 1.15, true);
        octx.filter = "none";
      } else {
        for (const st of streaks) {
          const p = pulseOf(st, t);
          stroke(st, t, st.w * 1.6, st.alpha * p * 0.3, false);
          stroke(st, t, st.w, st.alpha * p, false);
          stroke(st, t, st.w * 0.5, st.alpha * p * 1.15, true);
        }
      }
      if (!lean) for (const st of streaks) {
        const p = pulseOf(st, t);
        stroke(st, t, Math.max(0.6, st.w * 0.16), st.alpha * p * 0.72, false);
        if (st.w > 7) stroke(st, t, Math.max(0.5, st.w * 0.08), st.alpha * p * 0.5, true);
      }
      octx.filter = "none";
      // clear a soft hole behind the headline
      octx.globalCompositeOperation = "destination-out";
      const gm = octx.createRadialGradient(cx, cy, 0, cx, cy, Math.min(bw * 0.24, bh * 0.42));
      gm.addColorStop(0, "rgba(0,0,0,0.34)"); gm.addColorStop(0.55, "rgba(0,0,0,0.14)"); gm.addColorStop(1, "rgba(0,0,0,0)");
      octx.fillStyle = gm; octx.fillRect(0, 0, bw, bh);
      octx.globalCompositeOperation = "source-over";
      ctx.clearRect(0, 0, bw, bh);
      ctx.drawImage(off!, 0, 0); // 1:1 into the half-res backing store
    };

    let raf = 0, retry: ReturnType<typeof setTimeout> | undefined, visible = true, last = 0, stopped = false;
    const start = () => {
      if (stopped) return;
      if (!size()) { retry = setTimeout(start, 140); return; }
      draw(0); // static first frame: never blank, even if rAF never runs
      const t0 = performance.now();
      const frame = (now: number) => {
        if (stopped || !c.isConnected) return;
        const t = (now - t0) / 1000;
        const dt = Math.min(0.05, (now - (last || now)) / 1000);
        last = now;
        const k = 1 - Math.pow(0.0016, dt);
        P.sx += (P.x - P.sx) * k;
        P.sy += (P.y - P.sy) * k;
        const target = P.has && !reduce ? 1 : 0;
        P.e += (target - P.e) * (1 - Math.pow(target > P.e ? 0.02 : 0.12, dt));
        const occluded = !!optsRef.current.isOccluded?.();
        if (visible && !document.hidden && !occluded) {
          if (!tierLocked) gradeFrame(dt * 1000);
          draw(reduce ? 0 : t);
          if (reduce) return;
        } else if (!tierLocked && !reduce && visible && !document.hidden) {
          // behind the loader: keep drawing ONLY until the tier is decided
          gradeFrame(dt * 1000);
          draw(t);
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
      const x = (p.clientX - r.left) / 2, y = (p.clientY - r.top) / 2;
      P.x = x; P.y = y;
      P.has = x >= -30 && y >= -30 && x <= r.width / 2 + 30 && y <= r.height / 2 + 30;
      if (!P.init) { P.init = true; P.sx = x; P.sy = y; }
    };
    const onLeave = () => { P.has = false; };
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("mouseout", onLeave, { passive: true });
    const ro = window.ResizeObserver ? new ResizeObserver(() => size()) : null;
    ro?.observe(c);
    const io = window.IntersectionObserver ? new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { rootMargin: "80px" }) : null;
    io?.observe(c);

    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (retry) clearTimeout(retry);
      ro?.disconnect(); io?.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, []);

  return canvasRef;
}
