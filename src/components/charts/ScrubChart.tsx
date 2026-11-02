import React, { useRef, useState } from "react";
import {
  BadgePercent,
  Pin,
  Reply,
  Tag,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { isRtl, t } from "../../i18n/core";
import "./scrubChart.css";

// ScrubChart (handoff/source/ScrubChart.dc.html, ported literally): a weekly
// line or bar chart with an optional sub-chart of bars, the previous period
// as a dashed ghost, markers, legend toggles (at least one series stays on),
// horizontal drag to scrub (vertical drag scrolls), tap to pin / unpin,
// arrow keys move the pin and Escape clears it. Used by AN11 (product sales),
// AN13 (rating and new reviews) and AN14 (revenue). Data in, never samples.

export interface ScrubTipRow {
  l: string;
  v: string;
  /** Hidden when that series is toggled off. */
  cur?: boolean;
  prev?: boolean;
  sub?: boolean;
  col?: string;
}

export interface ScrubMode {
  t: string;
  unit?: string;
  kind?: "line" | "bars" | "stack";
  cur: (number | null)[];
  /** Stacked areas (kind "stack", AN14 By stream). */
  series?: { t: string; vals: number[]; col: string }[];
  prev?: (number | null)[];
  min?: number;
  max?: number;
  step?: number;
  fmt?: (v: number, axis?: boolean) => string;
  tips?: ScrubTipRow[][];
}

export interface ScrubMarker {
  i: number;
  t: string;
  kind: "discount" | "price" | "reply" | "drop" | "rise";
  /**
   * Optional tag row (CQ): 1 drops the tag one row (20px) below the top, for
   * a second kind on a bucket that already has a tag. Unset keeps the
   * source's single row.
   */
  row?: number;
  /**
   * Optional (CQ): keep the tag inside the plot. Near either edge it sits
   * beside its line instead of centred on it. Unset keeps the source's
   * centred tag.
   */
  fit?: boolean;
}

export interface ScrubChartConfig {
  vh?: number;
  labels?: string[];
  xl?: string[];
  aria?: string;
  caption?: string;
  earlyText?: string;
  emptyText?: string;
  curLabel?: string;
  prevLabel?: string;
  markers?: ScrubMarker[];
  sub?: {
    label: string;
    cur: number[];
    prev?: number[];
    h?: number;
    col: string;
    colOn: string;
  };
  modes: ScrubMode[];
}

/** Same shape as the AN14 copy in components/analytics (one chart, see _PHASE_B.md Batch 5 note). */
export type ScrubCfg = ScrubChartConfig;

const MK: Record<
  ScrubMarker["kind"],
  {
    icon: LucideIcon;
    light: [string, string, string];
    dark: [string, string, string];
  }
> = {
  // [line, tag background, tag ink]
  discount: {
    icon: BadgePercent,
    light: ["#D9A441", "#F6E9C9", "#8A5A00"],
    dark: ["#D9A441", "#332B1A", "#E0B360"],
  },
  price: {
    icon: Tag,
    light: ["#7D6BB5", "#F0EDF9", "#5F5093"],
    dark: ["#C3B3FB", "#303141", "#C3B3FB"],
  },
  reply: {
    icon: Reply,
    light: ["#14A08F", "#E2F4F1", "#0E7A6D"],
    dark: ["#4FD1C0", "#1F3532", "#7FE0D2"],
  },
  drop: {
    icon: TrendingDown,
    light: ["#C0392B", "#FBE7E4", "#A93226"],
    dark: ["#F09A8E", "#3C2A30", "#F09A8E"],
  },
  rise: {
    icon: TrendingUp,
    light: ["#3F9165", "#E3F3E9", "#2F7A50"],
    dark: ["#7FC79C", "#192A20", "#7FC79C"],
  },
};

/**
 * A marker's tag outside the plot (CQ): the same pill, icon and colours as
 * the chart's tags, for a caption that names what the tags mean.
 */
export const ScrubMarkerChip: React.FC<{
  kind: ScrubMarker["kind"];
  children: React.ReactNode;
}> = ({ kind, children }) => {
  const dark = useIsDark();
  const k = MK[kind];
  const [, bg, ink] = dark ? k.dark : k.light;
  const Icon = k.icon;
  return (
    <span
      className="sc-tag"
      style={{
        position: "static",
        transform: "none",
        display: "inline-flex",
        verticalAlign: "middle",
        background: bg,
        color: ink,
      }}
    >
      <Icon size={10} strokeWidth={2.6} aria-hidden />
      {children}
    </span>
  );
};

const finite = (a: (number | null | undefined)[]) =>
  a.filter((v): v is number => typeof v === "number" && Number.isFinite(v));

export const ScrubChart: React.FC<{
  cfg: ScrubChartConfig;
  early?: boolean;
  empty?: boolean;
  className?: string;
}> = ({ cfg, early, empty: emptyProp, className }) => {
  const dark = useIsDark();
  const [mode, setMode] = useState(0);
  const [idx, setIdx] = useState<number | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const [hidePrev, setHidePrev] = useState(false);
  const [hideCur, setHideCur] = useState(false);
  const [hideSub, setHideSub] = useState(false);
  const drag = useRef<{ x: number; y: number; on: boolean } | null>(null);

  const modes = cfg.modes;
  const mi = Math.max(0, Math.min(modes.length - 1, mode));
  const M = modes[mi];
  const n = M ? M.cur.length : 0;
  const SUB = cfg.sub ?? null;
  const VH = cfg.vh ?? 140;
  const base = VH - 6;
  const SH = SUB ? (SUB.h ?? 56) : 0;
  const SG = SUB ? 18 : 0;
  const TOT = VH + SG + SH;
  // Early (under 2 weeks of data) draws the dashed box with the early text (AN13-007 row 4).
  const empty = !!emptyProp || !!early || !n;

  const at = idx ?? pin;
  const pinned = idx === null && pin !== null;
  const has = at !== null && at >= 0 && at < n;

  // Series that are on (HANDOVER 2.3: at least one stays visible).
  const onCount =
    (hideCur ? 0 : 1) +
    (SUB && !hideSub ? 1 : 0) +
    (M?.prev?.length && !hidePrev ? 1 : 0);
  const toggle = (which: "cur" | "sub" | "prev") => {
    const isOn =
      which === "cur" ? !hideCur : which === "sub" ? !hideSub : !hidePrev;
    if (isOn && onCount <= 1) return;
    if (which === "cur") setHideCur(!hideCur);
    else if (which === "sub") setHideSub(!hideSub);
    else setHidePrev(!hidePrev);
  };

  // Round F (F10): mirrored in right to left (scrubChart.css flips the drawing).
  // A box anchored at the inline start shifts back towards it by `pct`.
  const rtl = isRtl();
  const shift = (pct: number) => (pct === 0 ? "0%" : `${rtl ? pct : -pct}%`);
  let svg: React.ReactNode = null;
  let yl: { t: string; top: string }[] = [];
  let tags: React.ReactNode[] = [];
  let tipRows: ScrubTipRow[] = [];
  let frac = 0;
  if (!empty && M) {
    const all = [...finite(M.cur), ...(hidePrev ? [] : finite(M.prev ?? []))];
    const lo = M.min ?? 0;
    const hiRaw = Math.max(lo + 1, ...all);
    const step = M.step || (hiRaw - lo) / 2;
    const hi = M.max ?? lo + Math.ceil((hiRaw - lo) / step) * step;
    const X = (i: number) => (n <= 1 ? 173 : 34 + (i / (n - 1)) * 278);
    const Y = (v: number) => 10 + (1 - (v - lo) / (hi - lo)) * (base - 14);
    const path = (arr: (number | null)[]) =>
      arr
        .map((v, i) =>
          v == null
            ? ""
            : (i && arr[i - 1] != null ? "L" : "M") +
              X(i).toFixed(1) +
              "," +
              Y(v).toFixed(1),
        )
        .join(" ");
    const isBars = M.kind === "bars";
    const isStack = M.kind === "stack";
    const stacks: { d: string; fill: string }[] = [];
    if (isStack) {
      const acc = new Array(n).fill(0);
      (M.series ?? []).forEach((s) => {
        const lo2 = acc.slice();
        s.vals.forEach((v, i) => {
          acc[i] += v;
        });
        const top = acc.map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1));
        const bot = lo2
          .map((v, i) => X(i).toFixed(1) + "," + Y(v).toFixed(1))
          .reverse();
        stacks.push({
          d: "M" + top.join(" L") + " L" + bot.join(" L") + " Z",
          fill: s.col,
        });
      });
    }
    const line = !isBars && !isStack ? path(M.cur) : "";
    const firstI = M.cur.findIndex((v) => v != null);
    let lastI = -1;
    M.cur.forEach((v, i) => {
      if (v != null) lastI = i;
    });
    const area =
      !isBars && !isStack && firstI >= 0
        ? line +
          " L" +
          X(lastI).toFixed(1) +
          "," +
          base +
          " L" +
          X(firstI).toFixed(1) +
          "," +
          base +
          " Z"
        : "";
    const ghost = (M.prev ?? []).length ? path(M.prev ?? []) : "";
    const bw = Math.min(22, (278 / n) * 0.6);
    const sMax = SUB ? Math.max(1, ...SUB.cur, ...(SUB.prev ?? [])) : 1;
    const sTop = VH + SG;
    const sBase = TOT - 2;
    const SY = (v: number) => sTop + (1 - v / sMax) * (sBase - sTop);
    const sbw = SUB ? Math.min(16, (278 / n) * 0.5) : 0;
    const subGhost =
      SUB && (SUB.prev ?? []).length && !hidePrev
        ? (SUB.prev ?? [])
            .map(
              (v, i) =>
                (i ? "L" : "M") + X(i).toFixed(1) + "," + SY(v).toFixed(1),
            )
            .join(" ")
        : "";
    const yTicks = [lo, lo + (hi - lo) / 2, hi];
    const fmt = M.fmt ?? ((v: number) => String(v));
    yl = [
      ...yTicks.map((v) => ({
        t: fmt(v, true),
        top: ((Y(v) / TOT) * 100).toFixed(1) + "%",
      })),
      ...(SUB
        ? [
            { t: String(sMax), top: ((sTop / TOT) * 100).toFixed(1) + "%" },
            { t: "0", top: ((sBase / TOT) * 100).toFixed(1) + "%" },
          ]
        : []),
    ];
    const curV = has ? M.cur[at as number] : null;
    const sx = has ? X(at as number) : -20;
    const sy = has && curV != null && !isStack ? Y(curV) : -20;
    frac = has ? (X(at as number) - 30) / 290 : 0;
    tipRows = has
      ? ((M.tips ?? [])[at as number] ?? []).filter(
          (r) =>
            !(hidePrev && r.prev) && !(hideSub && r.sub) && !(hideCur && r.cur),
        )
      : [];
    const markers = cfg.markers ?? [];
    svg = (
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 320 ${TOT}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        {yTicks.map((v, i) => (
          <line
            key={"g" + i}
            x1="30"
            x2="316"
            y1={Y(v).toFixed(1)}
            y2={Y(v).toFixed(1)}
            stroke="var(--sc-grid)"
            strokeWidth="1"
          />
        ))}
        {markers.map((m, i) => (
          <line
            key={"m" + i}
            x1={X(m.i).toFixed(1)}
            x2={X(m.i).toFixed(1)}
            y1="8"
            y2={base}
            stroke={(dark ? MK[m.kind].dark : MK[m.kind].light)[0]}
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        ))}
        {stacks.map((st, i) => (
          <path
            key={"st" + i}
            d={st.d}
            fill={st.fill}
            opacity={hideCur ? 0 : 0.9}
          />
        ))}
        {SUB && (
          <>
            <line
              x1="30"
              x2="316"
              y1={(VH + SG / 2).toFixed(1)}
              y2={(VH + SG / 2).toFixed(1)}
              stroke="var(--sc-grid)"
              strokeWidth="1"
            />
            {SUB.cur.map((v, i) => (
              <rect
                key={"s" + i}
                x={(X(i) - sbw / 2).toFixed(1)}
                y={SY(v).toFixed(1)}
                width={sbw.toFixed(1)}
                height={Math.max(0, sBase - SY(v)).toFixed(1)}
                rx="2.5"
                fill={i === at ? SUB.colOn : SUB.col}
                opacity={hideSub ? 0 : 1}
              />
            ))}
            {subGhost && (
              <path
                d={subGhost}
                fill="none"
                stroke="var(--sc-ghost)"
                strokeWidth="1.3"
                strokeDasharray="3 3"
                opacity={hidePrev ? 0 : 1}
              />
            )}
          </>
        )}
        {isBars &&
          M.cur.map((v, i) =>
            v == null ? null : (
              <rect
                key={"b" + i}
                x={(X(i) - bw / 2).toFixed(1)}
                y={Y(v).toFixed(1)}
                width={bw.toFixed(1)}
                height={Math.max(0, base - Y(v)).toFixed(1)}
                rx="3"
                fill={i === at ? "var(--sc-line)" : "var(--sc-bar)"}
                opacity={hideCur ? 0 : 1}
              />
            ),
          )}
        {area && (
          <path d={area} fill="var(--sc-area)" opacity={hideCur ? 0 : 1} />
        )}
        {ghost && (
          <path
            d={ghost}
            fill="none"
            stroke="var(--sc-ghost)"
            strokeWidth="1.6"
            strokeDasharray="4 4"
            strokeLinecap="round"
            opacity={hidePrev ? 0 : 1}
          />
        )}
        {line && (
          <path
            d={line}
            fill="none"
            stroke="var(--sc-line)"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={hideCur ? 0 : 1}
          />
        )}
        <line
          x1={sx}
          x2={sx}
          y1="6"
          y2={SUB ? TOT - 2 : base}
          stroke="var(--sc-scrub)"
          strokeWidth="1.2"
          opacity={has ? 0.7 : 0}
        />
        <circle
          cx={sx}
          cy={sy}
          r="4.5"
          fill="var(--sc-card)"
          stroke="var(--sc-line)"
          strokeWidth="2.2"
          opacity={
            has && !isBars && !isStack && curV != null && !hideCur ? 1 : 0
          }
        />
      </svg>
    );
    tags = markers.map((m, i) => {
      const k = MK[m.kind];
      const [, bg, ink] = dark ? k.dark : k.light;
      const Icon = k.icon;
      return (
        <span
          key={i}
          className="sc-tag"
          style={{
            insetInlineStart: `calc(30px + ${(((X(m.i) - 30) / 290) * 100).toFixed(1)}% * 0.96)`,
            ...(m.row ? { top: -2 + m.row * 20 } : {}),
            ...(m.fit
              ? {
                  transform: `translateX(${shift((X(m.i) - 30) / 290 > 0.8 ? 100 : (X(m.i) - 30) / 290 < 0.15 ? 0 : 50)})`,
                }
              : {}),
            background: bg,
            color: ink,
          }}
        >
          <Icon size={10} strokeWidth={2.6} aria-hidden />
          {m.t}
        </span>
      );
    });
  }

  const toIdx = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (rtl ? r.right - e.clientX : e.clientX - r.left) / r.width));
    return Math.round(f * (n - 1));
  };
  const pd = (e: React.PointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, on: false };
  };
  const pm = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    if (!d.on) {
      const dx = Math.abs(e.clientX - d.x);
      const dy = Math.abs(e.clientY - d.y);
      if (dx > 6 && dx > dy) {
        d.on = true;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch {
          /* capture is best effort */
        }
      } else return;
    }
    setIdx(toIdx(e));
  };
  const pu = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.on) {
      const i = toIdx(e);
      setIdx(null);
      setPin((p) => (p === i ? null : i));
    } else setIdx(null);
  };
  const pl = () => {
    if (drag.current?.on) {
      drag.current = null;
      setIdx(null);
    }
  };
  const kd = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const cur = pin ?? n - 1;
      setPin(
        Math.max(0, Math.min(n - 1, cur + ((e.key === "ArrowRight") !== rtl ? 1 : -1))),
      );
    }
    if (e.key === "Escape") setPin(null);
  };

  const label = has ? ((cfg.labels ?? [])[at as number] ?? "") : "";
  const isStackMode = M?.kind === "stack";
  const legend: {
    key: "cur" | "sub" | "prev";
    id?: string;
    t: string;
    stroke: string;
    on: boolean;
  }[] = empty
    ? []
    : [
        ...(isStackMode
          ? (M?.series ?? []).map((s, i) => ({
              key: "cur" as const,
              id: "s" + i,
              t: s.t,
              stroke: "6px solid " + s.col,
              on: !hideCur,
            }))
          : [
              {
                key: "cur" as const,
                t: cfg.curLabel ?? t("This period"),
                stroke: "2.2px solid var(--sc-line)",
                on: !hideCur,
              },
            ]),
        ...(SUB
          ? [
              {
                key: "sub" as const,
                t: SUB.label,
                stroke: "6px solid " + SUB.col,
                on: !hideSub,
              },
            ]
          : []),
        ...(M?.prev?.length
          ? [
              {
                key: "prev" as const,
                t: cfg.prevLabel ?? t("Previous period"),
                stroke: "1.6px dashed var(--sc-ghost)",
                on: !hidePrev,
              },
            ]
          : []),
      ];

  return (
    <div className={"sc " + (className ?? "")}>
      {modes.length > 1 && (
        <div role="tablist" className="sc-modes">
          {modes.map((m, i) => (
            <button
              key={m.t}
              type="button"
              role="tab"
              aria-selected={i === mi}
              className="sc-mode"
              onClick={() => {
                setMode(i);
                setPin(null);
              }}
            >
              {m.t}
            </button>
          ))}
        </div>
      )}
      {!empty && (
        <div className="sc-legend">
          {legend.map((lg) => (
            <button
              key={lg.id ?? lg.key}
              type="button"
              aria-pressed={lg.on}
              className="sc-leg"
              onClick={() => toggle(lg.key)}
            >
              <span
                aria-hidden
                className="sc-swatch"
                style={{ borderTop: lg.stroke }}
              />
              {lg.t}
            </button>
          ))}
          {M?.unit && <span className="sc-unit">{M.unit}</span>}
        </div>
      )}
      {!empty ? (
        <>
          <div className="sc-plot" style={{ height: TOT }}>
            {svg}
            {yl.map((y, i) => (
              <span
                key={i}
                aria-hidden
                className="sc-ylab"
                style={{ top: y.top }}
              >
                {y.t}
              </span>
            ))}
            {tags}
            <div
              role="slider"
              tabIndex={0}
              aria-label={cfg.aria ?? t("Chart")}
              aria-valuemin={0}
              aria-valuemax={Math.max(0, n - 1)}
              aria-valuenow={has ? (at as number) : undefined}
              aria-valuetext={
                has
                  ? label +
                    ": " +
                    tipRows.map((r) => r.l + " " + r.v).join(", ")
                  : t("Drag or use arrow keys to read values")
              }
              className="sc-hit"
              onPointerDown={pd}
              onPointerMove={pm}
              onPointerUp={pu}
              onPointerLeave={pl}
              onPointerCancel={pl}
              onKeyDown={kd}
            />
            {has && (
              <div
                className="sc-tip"
                style={{
                  insetInlineStart: `calc(30px + ${(frac * 100).toFixed(1)}% * 0.96)`,
                  transform: `translateX(${shift(frac > 0.6 ? 100 : frac < 0.25 ? 0 : 50)})`,
                }}
              >
                <p className="sc-tip-head">
                  {label}
                  {pinned && (
                    <span className="sc-tip-pin">
                      <Pin size={10} strokeWidth={2.6} aria-hidden />
                      {t("Pinned")}
                    </span>
                  )}
                </p>
                {tipRows.map((r, i) => (
                  <p key={i} className="sc-tip-row">
                    <span>
                      {r.col && (
                        <span
                          aria-hidden
                          style={{
                            display: "inline-block",
                            width: 7,
                            height: 7,
                            borderRadius: 2,
                            background: r.col,
                          }}
                        />
                      )}
                      {r.l}
                    </span>
                    <span>{r.v}</span>
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="sc-xl" aria-hidden>
            {(cfg.xl ?? []).map((x, i) => (
              <span key={i}>{x}</span>
            ))}
          </div>
        </>
      ) : (
        <div className="sc-empty" style={{ height: TOT }}>
          <p>
            {early
              ? (cfg.earlyText ?? t("The trend starts after 2 weeks of data."))
              : (cfg.emptyText ?? t("Nothing to show yet."))}
          </p>
        </div>
      )}
      {cfg.caption && <p className="sc-caption">{cfg.caption}</p>}
    </div>
  );
};
