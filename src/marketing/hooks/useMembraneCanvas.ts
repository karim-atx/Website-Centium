import { useEffect, useRef } from "react";

/** The Home hero's animated glass-membrane background: seven translucent
 *  "ribbon" loops (radius driven by slow sine modes, so they morph rather
 *  than loop) plus 40 gas-fume sprites drifting clockwise, lavender fading
 *  to teal left-to-right. Ported near-verbatim from the Claude Design
 *  handoff's `startMembrane()` (its own README calls this out as "plain
 *  canvas/DOM code, ports to React largely unchanged inside a useEffect
 *  with the same cleanup") — variable names and structure match the
 *  original so the two stay easy to diff against each other.
 *
 *  Rendered at half resolution into an offscreen canvas, then upscaled with
 *  a ~1px CSS blur on the visible canvas — cheaper than drawing every path
 *  at full res, and the blur hides the resampling. Pauses via
 *  IntersectionObserver when scrolled out of view, and renders one static
 *  frame under prefers-reduced-motion instead of animating. */
export function useMembraneCanvas(auraMotion = true) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;

    const still = auraMotion === false || (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    const TAU = Math.PI * 2;
    const RB = 7;
    const M = 96;
    const band: {
      r: number; th: number; ox: number; oy: number; tilt: number; ph: number;
      k1: number; s1: number; a1: number; k2: number; s2: number; a2: number;
      drift: number; alpha: number;
    }[] = [];
    let seed = 424242;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < RB; i++) {
      const u = i / (RB - 1);
      band.push({
        r: 0.3 + u * 0.72,
        th: 0.06 + rnd() * 0.14,
        ox: (rnd() - 0.5) * 0.3,
        oy: (rnd() - 0.5) * 0.22,
        tilt: (rnd() - 0.5) * 0.9,
        ph: rnd() * TAU,
        k1: 2 + Math.floor(rnd() * 2),
        s1: 0.02 + rnd() * 0.02,
        a1: 0.1 + rnd() * 0.12,
        k2: 3 + Math.floor(rnd() * 3),
        s2: 0.013 + rnd() * 0.017,
        a2: 0.05 + rnd() * 0.08,
        drift: 0.006 + rnd() * 0.012,
        alpha: 0.3 + rnd() * 0.4,
      });
    }

    const NF = 40;
    const fR = new Float32Array(NF), fA = new Float32Array(NF), fS = new Float32Array(NF);
    const fZ = new Float32Array(NF), fO = new Float32Array(NF), fP = new Float32Array(NF);
    for (let i = 0; i < NF; i++) {
      fR[i] = 0.22 + Math.pow(rnd(), 0.7) * 0.95;
      fA[i] = rnd() * TAU;
      fS[i] = 0.016 + rnd() * 0.02;
      fZ[i] = 0.16 + rnd() * 0.4;
      fO[i] = 0.12 + rnd() * 0.3;
      fP[i] = rnd() * TAU;
    }
    let puffL: HTMLCanvasElement | null = null;
    let puffT: HTMLCanvasElement | null = null;
    const bakePuffs = () => {
      const S = 256;
      const mk = (col: string) => {
        const cv = document.createElement("canvas");
        cv.width = S;
        cv.height = S;
        const g2 = cv.getContext("2d")!;
        const rg = g2.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
        rg.addColorStop(0, col + "0.85)");
        rg.addColorStop(0.4, col + "0.4)");
        rg.addColorStop(0.75, col + "0.12)");
        rg.addColorStop(1, col + "0)");
        g2.fillStyle = rg;
        g2.fillRect(0, 0, S, S);
        return cv;
      };
      puffL = mk("rgba(126,100,208,");
      puffT = mk("rgba(88,162,150,");
    };

    const d = new Float32Array(RB * M), v = new Float32Array(RB * M);
    const sm = new Float32Array(M);
    const ix = new Float32Array(M), iy = new Float32Array(M);
    const ox2 = new Float32Array(M), oy2 = new Float32Array(M);

    let w = 0, h = 0, bw = 0, bh = 0;
    let off: HTMLCanvasElement | null = null;
    let octx: CanvasRenderingContext2D | null = null;
    let cx = 0, cy = 0, RX = 0, RY = 0;
    const P = { x: 0, y: 0, has: false, s: 0 };

    const size = () => {
      const r = c.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      w = Math.round(r.width);
      h = Math.round(r.height);
      c.width = w;
      c.height = h;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.imageSmoothingEnabled = true;
      c.style.filter = "blur(" + Math.max(1, Math.round(w * 0.0012)) + "px)";
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
      if (!puffL) bakePuffs();
      cx = bw * 0.5;
      cy = bh * 0.42;
      RX = bw * 0.46;
      RY = Math.min(bh * 0.44, bw * 0.3);
      return true;
    };

    const radius = (b: (typeof band)[number], a: number, t: number) =>
      b.r *
      (1 +
        b.a1 * Math.sin(a * b.k1 + b.ph - t * b.s1 * TAU) +
        b.a2 * Math.sin(a * b.k2 - b.ph * 0.7 + t * b.s2 * TAU) +
        0.03 * Math.sin(a * 6 + b.ph * 1.4 + t * 0.03 * TAU));

    const physics = (t: number) => {
      const mx = P.x * 0.5, my = P.y * 0.5;
      P.s += ((P.has ? 1 : 0) - P.s) * 0.06;
      const Rr = Math.max(44, bw * 0.13), R2 = Rr * Rr;
      for (let i = 0; i < RB; i++) {
        const b = band[i], base = i * M, spin = t * b.drift * TAU;
        for (let k = 0; k < M; k++) {
          const l = d[base + (k > 0 ? k - 1 : M - 1)], rt = d[base + (k < M - 1 ? k + 1 : 0)];
          let acc = (l + rt - 2 * d[base + k]) * 0.09 - d[base + k] * 0.05;
          if (P.s > 0.01) {
            const a = (k / M) * TAU + spin;
            const q = radius(b, a, t);
            const gx = cx + b.ox * RX + Math.cos(a) * RX * q - mx;
            const gy = cy + b.oy * RY + Math.sin(a) * RY * q - my;
            const dd2 = gx * gx + gy * gy;
            if (dd2 < R2 * 5) acc += Math.exp(-dd2 / R2) * P.s * 2.2;
          }
          let nv = (v[base + k] + acc) * 0.9;
          if (nv > 1.8) nv = 1.8;
          else if (nv < -1.8) nv = -1.8;
          v[base + k] = nv;
          let nd = d[base + k] + nv;
          if (nd > 26) nd = 26;
          else if (nd < -26) nd = -26;
          d[base + k] = nd;
        }
        for (let k = 0; k < M; k++) {
          sm[k] =
            0.3 * d[base + (k > 0 ? k - 1 : M - 1)] + 0.4 * d[base + k] + 0.3 * d[base + (k < M - 1 ? k + 1 : 0)];
        }
        for (let k = 0; k < M; k++) d[base + k] = sm[k];
      }
    };

    const edges = (i: number, t: number) => {
      const b = band[i], base = i * M, spin = t * b.drift * TAU;
      const ccx = cx + b.ox * RX, ccy = cy + b.oy * RY;
      const co = Math.cos(b.tilt), si = Math.sin(b.tilt);
      for (let k = 0; k < M; k++) {
        const a = (k / M) * TAU + spin;
        const q = radius(b, a, t);
        const th = b.th * (0.6 + 0.4 * Math.sin(a * 2 + b.ph + t * 0.05));
        const ca = Math.cos(a), sa = Math.sin(a);
        const rIn = q - th * 0.5, rOut = q + th * 0.5;
        const dd = d[base + k];
        const xi = ca * RX * rIn, yi = sa * RY * rIn;
        const xo = ca * RX * rOut, yo = sa * RY * rOut;
        ix[k] = ccx + xi * co - yi * si + ca * dd;
        iy[k] = ccy + xi * si + yi * co + sa * dd;
        ox2[k] = ccx + xo * co - yo * si + ca * dd;
        oy2[k] = ccy + xo * si + yo * co + sa * dd;
      }
    };
    const loop = (xa: Float32Array, ya: Float32Array, forward: boolean) => {
      if (!octx) return;
      if (forward) {
        octx.moveTo((xa[M - 1] + xa[0]) / 2, (ya[M - 1] + ya[0]) / 2);
        for (let k = 0; k < M; k++) {
          const j = (k + 1) % M;
          octx.quadraticCurveTo(xa[k], ya[k], (xa[k] + xa[j]) / 2, (ya[k] + ya[j]) / 2);
        }
      } else {
        octx.moveTo((xa[0] + xa[M - 1]) / 2, (ya[0] + ya[M - 1]) / 2);
        for (let k = M - 1; k >= 0; k--) {
          const j = (k + M - 1) % M;
          octx.quadraticCurveTo(xa[k], ya[k], (xa[k] + xa[j]) / 2, (ya[k] + ya[j]) / 2);
        }
      }
    };

    let bodyG: CanvasGradient | null = null, violetG: CanvasGradient | null = null;
    let tealG: CanvasGradient | null = null, sheenG: CanvasGradient | null = null, gw = -1;
    const grads = () => {
      if (!octx || gw === bw) return;
      gw = bw;
      bodyG = octx.createLinearGradient(0, 0, bw, bh);
      bodyG.addColorStop(0, "rgba(174,161,220,0.5)");
      bodyG.addColorStop(0.42, "rgba(214,208,240,0.26)");
      bodyG.addColorStop(0.62, "rgba(206,226,222,0.26)");
      bodyG.addColorStop(1, "rgba(162,200,194,0.5)");
      violetG = octx.createLinearGradient(0, 0, bw, 0);
      violetG.addColorStop(0, "rgba(138,110,222,0.62)");
      violetG.addColorStop(0.5, "rgba(174,161,220,0.4)");
      violetG.addColorStop(1, "rgba(150,140,214,0.5)");
      tealG = octx.createLinearGradient(0, 0, bw, 0);
      tealG.addColorStop(0, "rgba(140,190,192,0.42)");
      tealG.addColorStop(0.5, "rgba(162,200,194,0.4)");
      tealG.addColorStop(1, "rgba(96,176,166,0.62)");
      sheenG = octx.createLinearGradient(0, 0, bw, bh);
      sheenG.addColorStop(0, "rgba(255,255,255,0.72)");
      sheenG.addColorStop(0.5, "rgba(255,255,255,0.3)");
      sheenG.addColorStop(1, "rgba(255,255,255,0.6)");
    };

    const draw = (t: number) => {
      if (!octx || !off) return;
      grads();
      octx.setTransform(1, 0, 0, 1, 0, 0);
      octx.globalCompositeOperation = "source-over";
      octx.clearRect(0, 0, bw, bh);

      let g = octx.createRadialGradient(bw * 0.2, cy, 0, bw * 0.2, cy, bw * 0.62);
      g.addColorStop(0, "rgba(174,161,220,0.3)");
      g.addColorStop(1, "rgba(174,161,220,0)");
      octx.fillStyle = g;
      octx.fillRect(0, 0, bw, bh);
      g = octx.createRadialGradient(bw * 0.82, cy * 1.1, 0, bw * 0.82, cy * 1.1, bw * 0.6);
      g.addColorStop(0, "rgba(162,200,194,0.28)");
      g.addColorStop(1, "rgba(162,200,194,0)");
      octx.fillStyle = g;
      octx.fillRect(0, 0, bw, bh);

      const FRX = bw * 0.62, FRY = Math.min(bh * 0.6, bw * 0.4);
      for (let i = 0; i < NF; i++) {
        const a = fA[i] + t * fS[i];
        const rq = fR[i] * (1 + 0.06 * Math.sin(t * 0.05 + fP[i]));
        const x = cx + Math.cos(a) * FRX * rq;
        const y = cy + Math.sin(a) * FRY * rq;
        const sz = fZ[i] * RX * (1 + 0.12 * Math.sin(t * 0.07 + fP[i] * 1.7));
        let mix = x / bw;
        if (mix < 0) mix = 0;
        else if (mix > 1) mix = 1;
        mix = mix * mix * (3 - 2 * mix);
        const al = fO[i];
        if (puffL) {
          octx.globalAlpha = al * (1 - mix);
          octx.drawImage(puffL, x - sz, y - sz, sz * 2, sz * 2);
        }
        if (puffT) {
          octx.globalAlpha = al * mix;
          octx.drawImage(puffT, x - sz, y - sz, sz * 2, sz * 2);
        }
      }
      octx.globalAlpha = 1;

      const fringe = Math.max(1.2, bw * 0.0035);
      for (let i = 0; i < RB; i++) {
        edges(i, t);
        const b = band[i];

        octx.filter = "blur(" + Math.max(2, Math.round(bw * 0.014)) + "px)";
        octx.globalAlpha = b.alpha * 0.55;
        octx.beginPath();
        loop(ox2, oy2, true);
        loop(ix, iy, false);
        octx.closePath();
        if (bodyG) octx.fillStyle = bodyG;
        octx.fill("evenodd");

        octx.filter = "blur(" + Math.max(1, Math.round(bw * 0.0022)) + "px)";
        octx.lineWidth = fringe;
        octx.globalAlpha = b.alpha * 0.85;
        octx.save();
        octx.translate(-fringe * 0.9, -fringe * 0.5);
        if (violetG) octx.strokeStyle = violetG;
        octx.beginPath();
        loop(ox2, oy2, true);
        octx.closePath();
        octx.stroke();
        octx.beginPath();
        loop(ix, iy, true);
        octx.closePath();
        octx.stroke();
        octx.restore();
        octx.save();
        octx.translate(fringe * 0.9, fringe * 0.5);
        if (tealG) octx.strokeStyle = tealG;
        octx.beginPath();
        loop(ox2, oy2, true);
        octx.closePath();
        octx.stroke();
        octx.beginPath();
        loop(ix, iy, true);
        octx.closePath();
        octx.stroke();
        octx.restore();

        octx.filter = "blur(" + Math.max(1, Math.round(bw * 0.0012)) + "px)";
        octx.lineWidth = Math.max(0.8, fringe * 0.5);
        octx.globalAlpha = b.alpha * 0.6;
        if (sheenG) octx.strokeStyle = sheenG;
        octx.beginPath();
        loop(ox2, oy2, true);
        octx.closePath();
        octx.stroke();
      }
      octx.globalAlpha = 1;
      octx.filter = "none";

      octx.globalCompositeOperation = "destination-out";
      const gm = octx.createRadialGradient(cx, cy * 0.98, 0, cx, cy * 0.98, Math.min(bw * 0.36, RY * 1.25));
      gm.addColorStop(0, "rgba(0,0,0,0.9)");
      gm.addColorStop(0.5, "rgba(0,0,0,0.55)");
      gm.addColorStop(1, "rgba(0,0,0,0)");
      octx.fillStyle = gm;
      octx.fillRect(0, 0, bw, bh);
      octx.globalCompositeOperation = "source-over";

      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(off, 0, 0, w, h);
    };

    let memRaf = 0;
    let memRetry: ReturnType<typeof setTimeout> | undefined;
    let visible = true;

    const start = () => {
      if (!size()) {
        memRetry = setTimeout(start, 140);
        return;
      }
      const t0 = performance.now();
      const frame = (now: number) => {
        if (!c.isConnected) return;
        const t = (now - t0) / 1000;
        if (visible && !document.hidden) {
          if (!still) physics(t);
          draw(still ? 0 : t);
          if (still) return;
        }
        memRaf = requestAnimationFrame(frame);
      };
      memRaf = requestAnimationFrame(frame);
    };
    start();

    const onMove = (e: MouseEvent | TouchEvent) => {
      const pt = "touches" in e ? e.touches[0] : e;
      if (!pt) return;
      const r = c.getBoundingClientRect();
      const x = pt.clientX - r.left, y = pt.clientY - r.top;
      P.x = x;
      P.y = y;
      P.has = x >= -60 && y >= -60 && x <= r.width + 60 && y <= r.height + 60;
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
      if (memRaf) cancelAnimationFrame(memRaf);
      if (memRetry) clearTimeout(memRetry);
      ro?.disconnect();
      io?.disconnect();
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseout", onLeave);
    };
  }, [auraMotion]);

  return canvasRef;
}
