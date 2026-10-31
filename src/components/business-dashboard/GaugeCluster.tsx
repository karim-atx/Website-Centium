import { useEffect, useId, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import type { DashPalette } from "./palette";
import {
  SD as SD_SCALE,
  STARTUP_MS,
  VH,
  VW,
  clusterChrome,
  controlGeometry,
  gaugeCentrePct,
  gaugeShapes,
  gaugeTransform,
  labelEdge,
  numberBase,
  progAt,
  type GaugeSpec,
} from "./clusterGeometry";
import { linePx, textPx } from "../../theme/textSize";

// DA1-015 #9-#20 · the At a glance gauge cluster (BizSummaryV27), with the
// DA2 unlit state, the DA1-023 start-up and the press / long-press tooltip.

export interface ClusterGauge {
  spec: GaugeSpec;
  /** Unlit (DA2-001): "–", no start-up, no data shapes. */
  empty: boolean;
  label: string;
  sub: string;
  subColor: string;
  /** The number the start-up counts up to; null shows `display` as is. */
  target: number | null;
  format: (n: number) => string;
  /** Shown when `target` is null (e.g. "–"). */
  display?: string;
  unit?: string;
}

export interface ClusterControl {
  key: string;
  Icon: LucideIcon;
  name: string;
  onActivate: () => void;
}

export function GaugeCluster({
  c,
  gauges,
  controls,
  onGaugeTap,
  ready,
  reducedMotion,
}: {
  c: DashPalette;
  gauges: ClusterGauge[];
  /** Lead first, then 2 or 4 secondaries. */
  controls: ClusterControl[];
  onGaugeTap: (label: string) => void;
  /** Data has resolved (the start-up plays once, the first time this turns true with data). */
  ready: boolean;
  reducedMotion: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const glowId = `clg-${uid}`;
  const anyData = gauges.some((g) => !g.empty);

  // Start-up (DA1-023, V6-106: 800 ms + 80 ms stagger, ease-out cubic). Plays
  // once per page visit when data first resolves, never on later updates
  // (DA1-023 O2); Reduce motion shows the final values (source `play()`).
  const [t, setT] = useState<number | null>(null);
  const [done, setDone] = useState(false);
  // Before the first frame runs, the values hold at 0 (no flash of the final numbers).
  const pending = ready && anyData && !done && !reducedMotion;
  useEffect(() => {
    if (!ready || done || !anyData || reducedMotion) return;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const el = now - t0;
      if (el < STARTUP_MS) {
        setT(el);
        raf = requestAnimationFrame(step);
      } else {
        setT(null);
        setDone(true);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ready, anyData, reducedMotion, done]);
  const prog = (i: number) => (t !== null ? progAt(t, i) : pending ? 0 : 1);

  // Press, tooltip and focus state (source handlers: down / up / leave / focus / blur / kd).
  const [press, setPress] = useState<string | null>(null);
  const [tip, setTip] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const longRef = useRef<{ key: string | null; lp?: number; tipT?: number }>({ key: null });
  useEffect(() => {
    const r = longRef.current;
    return () => {
      window.clearTimeout(r.lp);
      window.clearTimeout(r.tipT);
    };
  }, []);

  const { decor, bezels } = clusterChrome(c);
  const geo = controlGeometry(controls.length - 1, `url(#${glowId})`);
  const tipFor = tip ?? focus;

  return (
    <div role="group" aria-label="At a glance" style={{ position: "relative", width: "100%", aspectRatio: `${VW} / ${VH}`, containerType: "inline-size", marginBottom: 28 }}>
      <svg width="100%" height="100%" viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="xMidYMid meet" className="qa-shape" style={{ position: "absolute", inset: 0, display: "block", overflow: "visible" }} aria-hidden>
        <defs>
          <radialGradient id={glowId} cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" style={{ stopColor: c.glowCol, stopOpacity: 0.26 }} />
            <stop offset="100%" style={{ stopColor: c.glowCol, stopOpacity: 0 }} />
          </radialGradient>
        </defs>
        {decor.map((d, i) => (
          <path key={`dc${i}`} d={d.d} style={{ fill: d.fill, stroke: d.stroke }} strokeWidth={d.sw} strokeDasharray={d.dash} />
        ))}
        <g>
          {bezels.map((b, i) => (
            <path key={`bz${i}`} d={b.d} fill="none" style={{ stroke: b.stroke }} strokeWidth={b.sw} opacity={b.op} />
          ))}
        </g>
        {gauges.map((g, i) => {
          const gid = `pg-${uid}-${i}`;
          const rid = `${gid}r`;
          const shapes = gaugeShapes(g.spec, prog(i), g.empty, c, { gid, rid });
          return (
            <g key={`g${i}`} transform={gaugeTransform(i)}>
              <defs>
                <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" style={{ stopColor: c.g0 }} />
                  <stop offset="100%" style={{ stopColor: c.g1 }} />
                </linearGradient>
                <radialGradient id={rid} cx="0.5" cy="0.5" r="0.5">
                  <stop offset="0%" style={{ stopColor: c.g1, stopOpacity: 0.16 }} />
                  <stop offset="100%" style={{ stopColor: c.g1, stopOpacity: 0 }} />
                </radialGradient>
              </defs>
              {shapes.map((s, k) => (
                <path
                  key={k}
                  d={s.d}
                  style={{ fill: s.fill, stroke: s.stroke }}
                  strokeWidth={s.sw}
                  strokeLinecap={s.cap}
                  strokeLinejoin="round"
                  strokeDasharray={s.dash}
                  opacity={s.op}
                />
              ))}
            </g>
          );
        })}
        {geo.map((g, i) => {
          const ctl = controls[i];
          const pr = press === ctl.key;
          const acc = g.lead ? c.leadAcc : c.secAcc;
          const fill = pr ? (g.lead ? c.leadPressed : c.pale) : c.knobFace;
          const edge = g.lead || pr ? acc : c.knobEdge;
          const esw = g.lead ? 2 : pr ? 1.6 : 1;
          const glowOp = pr ? 0.35 : g.lead ? 0.18 : 0;
          const focusCol = focus === ctl.key || tip === ctl.key ? c.deep : "none";
          return (
            <g key={`ct${i}`} style={{ transition: "transform 0.15s cubic-bezier(0.22,1,0.36,1)" }}>
              <path d={g.d} fill="none" style={{ stroke: acc }} strokeWidth={3} strokeLinejoin="round" opacity={glowOp} />
              <path d={g.d} style={{ fill, stroke: fill }} strokeWidth={g.round} strokeLinejoin="round" />
              <path d={g.d} style={{ fill, stroke: edge }} strokeWidth={esw} strokeLinejoin="round" />
              <path d={g.d} fill="none" style={{ stroke: c.knobShade }} strokeWidth={2} strokeLinejoin="round" opacity={0.6} />
              <path d={g.d} fill="none" style={{ stroke: focusCol }} strokeWidth={2} strokeLinejoin="round" />
            </g>
          );
        })}
        {geo.flatMap((g, i) =>
          g.details.map((d, k) => (
            <path
              key={`dt${i}-${k}`}
              d={d.d}
              style={{ fill: d.fill, stroke: d.stroke === "acc" ? (g.lead ? c.leadAcc : c.secAcc) : d.stroke, pointerEvents: "none" }}
              strokeWidth={d.sw}
              strokeLinecap="round"
              opacity={d.op}
            />
          ))
        )}
      </svg>

      {gauges.map((g, i) => {
        const pos = gaugeCentrePct(i);
        const v = g.target === null ? g.display ?? "–" : g.format(Math.round(g.target * prog(i)));
        const base = numberBase(String(v).length);
        const fs = (base * (SD_SCALE / 1.25)) / 3.58;
        const ufs = (15 * (SD_SCALE / 1.25)) / 3.58;
        return (
          <p
            key={`n${i}`}
            aria-hidden
            data-gauge-number={i}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              transform: "translate(-50%,-50%)",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 1,
              whiteSpace: "nowrap",
              fontSize: `${fs.toFixed(2)}cqw`,
              fontWeight: 800,
              letterSpacing: "-0.035em",
              lineHeight: 1,
              fontVariantNumeric: "tabular-nums",
              color: g.empty ? c.tert : c.ink,
              margin: 0,
            }}
          >
            <span>{v}</span>
            {g.unit && !g.empty && <span style={{ fontSize: `${ufs.toFixed(2)}cqw`, fontWeight: 700, letterSpacing: 0, color: c.faint }}>{g.unit}</span>}
          </p>
        );
      })}

      {gauges.map((g, i) => {
        const pos = gaugeCentrePct(i);
        const edge = labelEdge(i);
        const common = { position: "absolute" as const, left: pos.x, top: edge.y, width: 120, textAlign: "center" as const, textWrap: "balance" as const, margin: 0 };
        return (
          <div key={`t${i}`} aria-hidden>
            <p
              data-gauge-label={i}
              style={{
                ...common,
                transform: edge.top ? `translate(-50%,-100%) translateY(calc(-17px - var(--text-boost, 0px)))` : "translate(-50%,0)",
                fontSize: textPx(11),
                fontWeight: 700,
                lineHeight: linePx(15),
                color: c.inkSoft,
              }}
            >
              {g.label}
            </p>
            <p
              data-gauge-sub={i}
              style={{
                ...common,
                transform: edge.top ? "translate(-50%,-100%)" : `translate(-50%, calc(18px + var(--text-boost, 0px)))`,
                fontSize: textPx(10.5),
                fontWeight: 700,
                lineHeight: linePx(14),
                color: g.subColor,
              }}
            >
              {g.sub}
            </p>
          </div>
        );
      })}

      {gauges.map((g, i) => {
        const pos = gaugeCentrePct(i);
        const summary = `Open Analytics: ${g.label}`;
        return (
          <button
            key={`gt${i}`}
            type="button"
            aria-label={`${summary}. ${g.target === null ? g.display ?? "" : g.format(g.target)}${g.unit && !g.empty ? g.unit : ""}, ${g.sub}`}
            onClick={() => onGaugeTap(g.label)}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: `${(110 / 3.58).toFixed(2)}cqw`,
              height: `${(110 / 3.58).toFixed(2)}cqw`,
              borderRadius: "50%",
              transform: "translate(-50%,-50%)",
              cursor: "pointer",
              background: "transparent",
              border: 0,
              padding: 0,
            }}
          />
        );
      })}

      {geo.map((g, i) => {
        const ctl = controls[i];
        const pr = press === ctl.key;
        const Icon = ctl.Icon;
        return (
          <button
            key={`ic${i}`}
            type="button"
            aria-label={ctl.name}
            data-control={ctl.key}
            onPointerDown={() => {
              window.clearTimeout(longRef.current.lp);
              longRef.current.key = null;
              setPress(ctl.key);
              longRef.current.lp = window.setTimeout(() => {
                longRef.current.key = ctl.key;
                setTip(ctl.key);
              }, 500);
            }}
            onPointerUp={() => {
              window.clearTimeout(longRef.current.lp);
              const wasLong = longRef.current.key === ctl.key;
              longRef.current.key = null;
              setPress(null);
              if (wasLong) {
                window.clearTimeout(longRef.current.tipT);
                longRef.current.tipT = window.setTimeout(() => setTip(null), 1200);
              }
            }}
            onPointerLeave={() => {
              window.clearTimeout(longRef.current.lp);
              if (press === ctl.key) setPress(null);
            }}
            onClick={(e) => {
              // A long press shows the name and does not navigate (V6-108).
              if (tip === ctl.key && e.detail !== 0) return;
              ctl.onActivate();
            }}
            onFocus={(e) => {
              if (e.currentTarget.matches(":focus-visible")) setFocus(ctl.key);
            }}
            onBlur={() => setFocus(null)}
            onContextMenu={(e) => e.preventDefault()}
            style={{
              position: "absolute",
              left: g.x,
              top: g.y,
              width: g.hit,
              height: g.hit,
              borderRadius: "50%",
              transform: `translate(-50%,-50%)${pr ? " scale(0.92)" : ""}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: g.lead ? c.leadAcc : c.secAcc,
              cursor: "pointer",
              outline: "none",
              WebkitTapHighlightColor: "transparent",
              touchAction: "manipulation",
              userSelect: "none",
              transition: "transform 0.15s cubic-bezier(0.22,1,0.36,1)",
              background: "transparent",
              border: 0,
              padding: 0,
            }}
          >
            <Icon size={g.size} strokeWidth={2} aria-hidden className="qa-shape" />
          </button>
        );
      })}

      {tipFor &&
        (() => {
          const i = controls.findIndex((x) => x.key === tipFor);
          if (i < 0) return null;
          const g = geo[i];
          return (
            <span
              role="tooltip"
              style={{
                position: "absolute",
                left: g.x,
                top: g.y,
                transform: "translate(-50%,calc(-100% - 22px))",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                pointerEvents: "none",
                zIndex: 2,
              }}
            >
              <span
                style={{
                  background: c.tipBg,
                  color: c.tipInk,
                  fontSize: textPx(11.5),
                  fontWeight: 700,
                  lineHeight: linePx(15),
                  padding: "6px 10px",
                  borderRadius: 9,
                  whiteSpace: "nowrap",
                  boxShadow: "0 6px 16px rgba(36,31,27,0.22)",
                }}
              >
                {controls[i].name}
              </span>
              <span style={{ width: 0, height: 0, borderInlineStart: "6px solid transparent", borderInlineEnd: "6px solid transparent", borderTop: `6px solid ${c.tipBg}` }} />
            </span>
          );
        })()}
    </div>
  );
}
