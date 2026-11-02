import { useId } from "react";
import type React from "react";
import type { ClockModel } from "./clockModel";
import type { AnPalette } from "./palette";
import "./overview.css";

// AN1-001 · the day clock (268 × 268, viewBox 300; AN1-013: fixed size at
// 360). Template literal from BizAnalyticsV45 l.52-101: face (radial +
// morning/evening tint), bezel 3 + highlight + inner ring, ticks, lanes,
// clear zone, live ring + glow (ringBreath 3.5 s), arcs (cycle highlight,
// live glow, track with draw-in, live progress, selected outline, 12 hit
// stroke), "+N" tabs, the leaf hour hand (M) with its line and end marker,
// the minute hand (minSweep, one turn per hour), continuation chevrons, the
// numbers, the Centium mark, the masked readout layers, the c. Arc indicator
// (counter over 8) and the 108 readout button.

const MARK_A =
  "M 890.36 308.7 L 813.4 386.69 C 801.2 374.93 790.43 362.13 777.32 351.26 C 746.72 325.89 709.28 307.73 670.12 300.59 C 590.62 286.08 504.97 318.03 454.03 380.86 C 421.96 420.4 403.64 468.42 398.16 518.81 C 396.29 535.99 397.7 553.69 399.73 570.74 C 408.03 640.66 447.28 705.12 502.1 748.51 C 516.39 759.82 531.54 770.39 547.68 778.92 C 556.04 783.34 564.58 787.57 573.25 791.36 C 576.75 792.89 580.51 793.92 583.89 795.7 C 582.91 799.2 580.49 802.32 578.52 805.32 C 574.07 812.09 569.16 818.58 563.98 824.81 C 547.79 844.27 527.53 863.18 504.4 873.91 C 495.84 871.9 487.25 867.17 479.49 863.11 C 468.68 857.45 458.02 851.52 447.88 844.71 C 398.64 811.63 357.51 767.6 329.33 715.28 C 274.16 612.83 269.77 488.67 320.79 383.61 C 350.07 323.31 395.72 270.92 452.96 235.76 C 531.62 187.45 629.66 173.36 718.61 197.96 C 768.79 211.85 814.51 236.71 853.78 270.8 C 862.68 278.52 871.13 286.81 879.12 295.47 C 882.92 299.59 887.6 303.81 890.36 308.7 Z";
const MARK_B =
  "M 924.4 540.2 C 926.11 544.37 926.54 548.91 927.36 553.32 C 928.8 561.08 929.64 568.79 930.21 576.66 C 932.57 609.13 928.13 641.02 919.55 672.37 C 900.23 742.92 853.48 804.05 791.15 841.94 C 762.82 859.17 731.28 870.42 699.1 877.86 C 671.76 884.17 643.4 886.13 615.4 885.89 C 599.01 885.74 582.63 884.09 566.25 883.7 C 566.74 879.3 573.64 875.44 576.68 872.48 C 585.82 863.59 595.64 855.43 605.29 847.11 C 629.02 826.66 654.39 808.89 681.66 793.45 C 701.82 782.04 723.43 773.62 742.6 760.39 C 763.68 745.83 782.03 727.79 798.39 708.19 C 806.05 699.02 812.91 689.21 819.35 679.16 C 821.27 676.16 827.01 670.04 826.4 666.35 C 798.14 691.54 767.08 713.92 733.26 731.05 C 709.64 743.01 684.5 751.2 660.56 762.34 C 647.16 768.59 634.45 775.89 621.94 783.74 C 616.43 787.2 611.29 791.99 605.4 794.73 C 604.25 787.79 606.72 779.53 607.79 772.64 C 610.87 752.86 616.43 733.37 624.06 714.85 C 633.07 692.95 645.38 671.69 660.94 653.77 C 685.28 625.73 718.1 605.13 753.57 594.39 C 790.66 583.15 829.86 581.2 866.79 569.6 C 880.33 565.35 893.47 559.72 905.7 552.51 C 911.91 548.86 917.8 542.94 924.4 540.2 Z";

export interface ClockHandlers {
  onPick: (key: string) => void;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
}

export function DayClock({
  m,
  c,
  reducedMotion,
  minuteDeg,
  loading,
  anim,
  h,
}: {
  m: ClockModel;
  c: AnPalette;
  reducedMotion: boolean;
  /** The minute hand's base angle: fixed at mount while minSweep turns it; the live value under reduced motion. */
  minuteDeg: number;
  loading: boolean;
  anim: boolean;
  h: ClockHandlers;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const faceId = `an1f${uid}`;
  const tintId = `an1t${uid}`;
  const glowId = `an1g${uid}`;
  const rm = reducedMotion;
  const LT = c.liveTeal;
  const OFF = c.dark ? "rgba(238,239,242,0.28)" : "rgba(36,31,27,0.22)";
  // Auto-cycle and a committed swipe slide 0.32 s (rdTr); a finger drag follows with no transition.
  const rdTr = anim && !rm ? "transform 0.32s cubic-bezier(0.22,1,0.36,1)" : "none";

  return (
    <div className="an1-clock" style={{ position: "relative", width: 268, height: 268, maxWidth: "100%", flexShrink: 0, margin: "8px 0 6px" }}>
      <svg width="268" height="268" viewBox="0 0 300 300" aria-hidden style={{ position: "absolute", inset: 0, display: "block", overflow: "visible" }}>
        <defs>
          <radialGradient id={faceId} cx="0.5" cy="0.42" r="0.6">
            <stop offset="0%" stopColor={c.face0} />
            <stop offset="100%" stopColor={c.face1} />
          </radialGradient>
          <linearGradient id={tintId} x1="1" y1="0.5" x2="0" y2="0.5">
            <stop offset="0%" stopColor={c.morn} />
            <stop offset="100%" stopColor={c.eve} />
          </linearGradient>
          <radialGradient id={glowId} gradientUnits="userSpaceOnUse" cx="150" cy="150" r="104">
            {m.glowStops.map((s, i) => (
              <stop key={i} offset={s.o} stopColor={LT} stopOpacity={s.a} />
            ))}
          </radialGradient>
        </defs>
        <circle cx="150" cy="150" r="140.4" fill={`url(#${faceId})`} />
        <circle cx="150" cy="150" r="140.4" fill={`url(#${tintId})`} />
        <circle data-bezel cx="150" cy="150" r={m.bzR} fill="none" stroke={c.bezelStroke} strokeWidth={m.bzW} />
        <circle cx="150" cy="150" r={m.bzHiR} fill="none" stroke={c.bezelHi} strokeWidth="0.6" />
        <circle cx="150" cy="150" r="137" fill="none" stroke={c.bezel2} strokeWidth="0.8" />
        {m.ticks.map((t, i) => (
          <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.col} strokeWidth={t.w} strokeLinecap="round" />
        ))}
        {!loading && m.lanes.map((r) => <circle key={r} cx="150" cy="150" r={r} fill="none" stroke={c.laneCol} strokeWidth="8" />)}
        <circle data-core cx="150" cy="150" r={m.czU} fill={c.core} stroke={c.coreRing} strokeWidth="1" />
        <g data-live-ring style={{ opacity: m.live && !loading ? 1 : 0, transition: "opacity 0.8s ease", pointerEvents: "none" }}>
          <g data-ring style={{ opacity: 0.78, animation: m.live && !rm ? "an1-ringBreath 3.5s ease-in-out infinite" : "none" }}>
            <circle cx="150" cy="150" r="104" fill={`url(#${glowId})`} />
          </g>
          <circle cx="150" cy="150" r={m.czU} fill="none" stroke={LT} strokeWidth="1.6" />
        </g>
        {!loading &&
          m.arcs.map((a) => (
            <g key={a.key} data-arc={a.key} onClick={() => h.onPick(a.key)} style={{ cursor: "pointer" }}>
              <path d={a.d} fill="none" stroke={a.col} strokeWidth="11.5" strokeLinecap="round" opacity={a.cycOp} style={{ transition: "opacity 0.3s ease" }} />
              <path
                data-glow="1"
                d={a.pd2}
                fill="none"
                stroke={a.col}
                strokeWidth="12"
                strokeLinecap="round"
                opacity={a.glowOp}
                style={{ animation: a.live && !rm ? "an1-arcGlowIn 0.6s cubic-bezier(0.4,0,1,1) both, an1-arcGlow 2.4s ease-in-out 0.6s infinite" : "none" }}
              />
              <path
                data-draw="1"
                d={a.d}
                fill="none"
                stroke={a.col}
                strokeWidth="8"
                strokeLinecap="round"
                opacity={a.trackOp}
                pathLength={100}
                strokeDasharray="100"
                style={{ animation: rm ? "none" : `an1-arcDraw 0.9s cubic-bezier(0.22,1,0.36,1) ${a.delay}s both`, transition: "opacity 0.8s ease-out" }}
              />
              <path d={a.pd} fill="none" stroke={a.col} strokeWidth="8" strokeLinecap="round" opacity={a.progOp} />
              <path d={a.d} fill="none" stroke={c.face0} strokeWidth="2" strokeLinecap="round" opacity={a.selOp} />
              <path d={a.d} fill="none" stroke="transparent" strokeWidth="12" strokeLinecap="round" />
            </g>
          ))}
        {!loading &&
          m.badges.map((b) => (
            <g key={b.key} onClick={() => h.onPick(b.pickKey)} style={{ cursor: "pointer" }}>
              <path d={b.lead} fill="none" stroke={b.col} strokeWidth="1.6" strokeLinecap="round" strokeDasharray="1.5 2.5" />
              <path
                data-glow="1"
                d={b.d}
                fill="none"
                stroke={b.col}
                strokeWidth="4"
                strokeLinejoin="round"
                opacity={b.live ? 0.32 : 0}
                style={{ animation: b.live && !rm ? "an1-arcGlowIn 0.6s cubic-bezier(0.4,0,1,1) both, an1-arcGlow 2.4s ease-in-out 0.6s infinite" : "none" }}
              />
              <path d={b.d} fill={b.col} stroke={b.col} strokeWidth="3" strokeLinejoin="round" />
            </g>
          ))}
        {!loading && m.showHand && (
          <g data-hour-hand style={{ transform: `rotate(${m.handDeg}deg)`, transformBox: "view-box", transformOrigin: "150px 150px", transition: rm ? "none" : "transform 1s linear", pointerEvents: "none" }}>
            <g data-hand="1" style={{ transformBox: "view-box", transformOrigin: "150px 150px", animation: rm ? "none" : "an1-handSweep 1.2s cubic-bezier(0.34,1.18,0.5,1) both", ["--hd" as string]: `-${m.handDeg}deg` }}>
              {m.hp.map((p, i) => (
                <path
                  key={i}
                  shapeRendering="geometricPrecision"
                  d={p.d}
                  fill={p.fill}
                  stroke={p.stroke}
                  strokeWidth={p.sw}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={p.op}
                  style={{
                    transformBox: "view-box",
                    transformOrigin: "150px 150px",
                    transform: p.shadow ? "translate(0.9px,1.3px)" : "none",
                    animation: p.glow && !rm ? "an1-haloBreath 2.4s ease-in-out 0.6s infinite" : "none",
                  }}
                />
              ))}
            </g>
          </g>
        )}
        {!loading && (
          <g data-hand="1" data-minute-run style={{ pointerEvents: "none", transformBox: "view-box", transformOrigin: "150px 150px", animation: rm ? "none" : "an1-minSweep 3600s linear 1.2s infinite" }}>
            <g data-minute-hand style={{ transform: `rotate(${minuteDeg}deg)`, transformBox: "view-box", transformOrigin: "150px 150px" }}>
              <g data-hand="1" style={{ transformBox: "view-box", transformOrigin: "150px 150px", animation: rm ? "none" : "an1-handSweep 1.2s cubic-bezier(0.34,1.18,0.5,1) both", ["--hd" as string]: `-${minuteDeg}deg` }}>
                {m.mp.map((p, i) => (
                  <path key={i} d={p.d} fill={p.fill} stroke={p.stroke} strokeWidth={p.sw} strokeLinecap="round" opacity={p.op} style={{ transform: p.shadow ? "translate(0.9px,1.3px)" : "none" }} />
                ))}
              </g>
            </g>
          </g>
        )}
        {!loading && m.conts.map((ct, i) => <path key={i} d={ct.d} fill="none" stroke={ct.col} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />)}
      </svg>

      {m.nums.map((n) => (
        <span
          key={n.t + n.px}
          aria-hidden
          style={{ position: "absolute", left: n.px, top: n.py, transform: "translate(-50%,-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 1, pointerEvents: "none" }}
        >
          <span data-num style={{ fontSize: n.fs, fontWeight: n.fw, lineHeight: 1, letterSpacing: "-0.02em", color: n.col, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{n.t}</span>
        </span>
      ))}

      {!loading &&
        m.badges.map((b) => (
          <button
            key={b.key}
            type="button"
            aria-label={b.name}
            onClick={() => h.onPick(b.pickKey)}
            style={{ position: "absolute", left: b.px, top: b.py, width: 44, height: 44, transform: "translate(-50%,-50%)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", background: "none", border: 0, padding: 0, WebkitTapHighlightColor: "transparent" }}
          >
            <span style={{ fontSize: 11.5, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.01em", fontVariantNumeric: "tabular-nums", color: b.ink, pointerEvents: "none" }}>{b.t}</span>
          </button>
        ))}

      {!loading && (
        <span
          aria-hidden
          style={{ position: "absolute", left: "50%", top: `calc(50% + ${m.logo.y}px)`, width: m.logo.size, height: m.logo.size, transform: "translate(-50%,-50%)", opacity: m.logo.on ? 1 : 0, transition: "opacity 0.3s ease", pointerEvents: "none" }}
        >
          <span data-logo data-pulse style={{ display: "block", width: "100%", height: "100%", color: c.logoCol, animation: m.live && !rm ? "an1-logoPulse 3.5s ease-in-out infinite" : "none" }}>
            <svg width="100%" height="100%" viewBox="265 175 680 720" style={{ display: "block" }}>
              <path d={MARK_A} fill="currentColor" />
              <path d={MARK_B} fill="currentColor" />
            </svg>
          </span>
        </span>
      )}

      <div
        data-mask
        aria-hidden
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: m.maskW,
          height: m.maskW,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          overflow: "hidden",
          WebkitMaskImage: `radial-gradient(closest-side,#000 ${m.maskStop}%,transparent 100%)`,
          maskImage: `radial-gradient(closest-side,#000 ${m.maskStop}%,transparent 100%)`,
          pointerEvents: "none",
          color: c.ink,
        }}
      >
        {loading ? (
          <span className="animate-skeleton-pulse" style={{ position: "absolute", left: "50%", top: "50%", width: 60, height: 10, borderRadius: 5, transform: "translate(-50%,-50%)", background: c.soft }} />
        ) : (
          m.layers.map((ly, i) => (
            <div key={i} data-layer={i} style={{ position: "absolute", inset: 0, transform: `translateX(${ly.off}px)`, transition: rdTr }}>
              {ly.lines.map((ln, k) => (
                <p
                  key={k}
                  data-readout-line
                  style={{ position: "absolute", left: "50%", top: `calc(50% + ${ln.y}px)`, transform: "translate(-50%,-50%)", textAlign: "center", fontSize: ly.fs, fontWeight: 800, lineHeight: `${ly.lh}px`, letterSpacing: "-0.01em", whiteSpace: "nowrap", margin: 0 }}
                >
                  {ln.t}
                </p>
              ))}
              {ly.sub && (
                <p
                  data-readout-sub
                  style={{ position: "absolute", left: "50%", top: `calc(50% + ${ly.subY}px)`, transform: "translate(-50%,-50%)", textAlign: "center", fontSize: ly.sfs, fontWeight: 600, lineHeight: `${ly.slh}px`, color: c.inkSoft, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", margin: 0 }}
                >
                  {ly.sub}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {!loading && m.indicator.kind === "arc" && (
        <svg data-indicator aria-hidden width="100%" height="100%" viewBox="0 0 300 300" style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "visible" }}>
          {m.indicator.segs.map((s, i) => (
            <path key={i} d={s.d} fill="none" stroke={s.on ? LT : OFF} strokeWidth={s.on ? 2.6 : 2.2} strokeLinecap="round" style={{ transition: rm ? "none" : "all 0.28s cubic-bezier(0.22,1,0.36,1)" }} />
          ))}
        </svg>
      )}
      {!loading && m.indicator.kind === "count" && (
        <span
          data-indicator
          aria-hidden
          style={{ position: "absolute", left: "50%", top: "calc(50% + 36px)", transform: "translate(-50%,-50%)", display: "flex", alignItems: "baseline", gap: 3, fontSize: 9.5, fontWeight: 700, lineHeight: "11px", fontVariantNumeric: "tabular-nums", letterSpacing: "0.02em", color: c.faint, whiteSpace: "nowrap", pointerEvents: "none" }}
        >
          <span style={{ fontWeight: 800, color: LT }}>{m.indicator.now}</span>
          <span>/</span>
          <span>{m.indicator.total}</span>
        </span>
      )}

      {!loading && (
        <span
          role="button"
          tabIndex={0}
          aria-label={m.rdName}
          data-readout
          onPointerDown={h.onPointerDown}
          onPointerMove={h.onPointerMove}
          onPointerUp={h.onPointerUp}
          onPointerCancel={h.onPointerCancel}
          onPointerLeave={h.onPointerCancel}
          onKeyDown={h.onKeyDown}
          className="focus-visible:shadow-focus-ring"
          style={{ position: "absolute", left: "50%", top: "50%", width: 108, height: 108, borderRadius: "50%", transform: "translate(-50%,-50%)", touchAction: "pan-y", cursor: "pointer", WebkitTapHighlightColor: "transparent", outline: "none" }}
        />
      )}
    </div>
  );
}
