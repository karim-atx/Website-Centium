import { useEffect, useRef, useState } from "react";
import { Pin } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import type { GrowthWeek } from "../../../services/business-analytics";
import { canHide, growthChart, type SeriesKey } from "./membersModel";
import { isRtl } from "../../../i18n/core";

// AN4-005 rows 18-33 and S2-S7 (AnMembersV6 "growth chart v2", l.99-135 markup,
// l.339-376 logic): active members as a line, joins above and ends below the
// baseline, the previous period dashed, scrub / tap-to-pin / keyboard, legend
// toggles. The weeks are business_member_growth's (B15, Monday weeks in the
// business's calendar): the weeks of the range, at least 8 (AN4-005 O10), so
// the source's fixed 8 becomes `n` everywhere (step 286 / n, slider max n).
// Colours are the source's literal L / D tokens (l.240-241).
//
// Beyond the source (OURS rows): the slider's aria-valuetext reads the week
// (AN4-017 O2); the tag is at least 164 wide and grows (O3) with a #8C8378
// border in High contrast (O4); a range change clears the pin (AN4-019 O4);
// the pinned tag fades out over 150 ms on unpin and appears with no fade
// (AN4-019 row 3); a hidden series fades out over 200 ms (AN4-021 row 3);
// the last of Active / Joined / Ended cannot be hidden (row 5, aria-disabled);
// legend items keep their 32 px look with a 44 px hit box (O3). Early
// (AN4-024): no previous line, y from 0, "No members yet" for the weeks
// before the first member.

type TipSnap = { tip: NonNullable<ReturnType<typeof growthChart>["tip"]>; mi: number; pinned: boolean };

const L = { card: "#FFFFFF", border: "rgba(36,31,27,0.11)", ink: "#241F1B", inkSoft: "#5B5349", faint: "#8C8378", tert: "#A79E93", pDark: "#7D6BB5", good: "#3F9165", high: "#C0392B", line: "#7D6BB5", lineFill: "rgba(125,107,181,0.12)", grid: "rgba(36,31,27,0.07)", axis: "#A79E93" };
const D = { card: "#1C1F28", border: "rgba(245,243,250,0.08)", ink: "#F5F3FA", inkSoft: "#B8B3C7", faint: "#B8B3C7", tert: "#9F9CAC", pDark: "#C3B3FB", good: "#7FC79C", high: "#F09A8E", line: "#A393E0", lineFill: "rgba(163,147,224,0.14)", grid: "rgba(238,239,242,0.08)", axis: "#B8B3C7" };

export function GrowthChart({ cur, prev, endsThisWeek, early = false, resetKey = "" }: { cur: GrowthWeek[]; prev: GrowthWeek[] | null; endsThisWeek: boolean; early?: boolean; resetKey?: string }) {
  const c = useIsDark() ? D : L;
  const { accessibility } = useApp();
  const hc = !!accessibility.highContrast;
  const reduce = useReducedMotion();
  const [hide, setHide] = useState<Set<SeriesKey>>(new Set());
  const [scrub, setScrub] = useState<number | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const [fading, setFading] = useState<TipSnap | null>(null);
  const drag = useRef<{ x0: number; y0: number; sc: boolean } | null>(null);
  const fadeTimer = useRef<number | undefined>(undefined);
  // AN4-019 O4: a new range clears the pin (no fade: the chart redraws).
  const [rk, setRk] = useState(resetKey);
  if (rk !== resetKey) {
    setRk(resetKey);
    setPin(null);
    setScrub(null);
    setFading(null);
  }
  useEffect(() => () => window.clearTimeout(fadeTimer.current), []);
  const g = growthChart(cur, prev, hide, scrub ?? pin, endsThisWeek, early);
  const n = cur.length;
  const last = n - 1;
  const mi = scrub ?? pin;
  const tr = reduce ? "none" : "y 0.45s cubic-bezier(0.22,1,0.36,1), height 0.45s cubic-bezier(0.22,1,0.36,1)";
  const fade = reduce ? "none" : "opacity 0.2s";
  const live: TipSnap | null = g.tip && mi !== null ? { tip: g.tip, mi, pinned: scrub === null && pin !== null } : null;
  // AN4-019 row 3: unpinning fades the pinned tag out over 150 ms.
  const unpin = () => {
    if (pin === null) return;
    if (!reduce && scrub === null && live) {
      setFading(live);
      window.clearTimeout(fadeTimer.current);
      fadeTimer.current = window.setTimeout(() => setFading(null), 150);
    }
    setPin(null);
  };
  const pinAt = (i: number) => {
    window.clearTimeout(fadeTimer.current);
    setFading(null);
    setPin(i);
  };
  const shown = live ?? fading;
  // Round F (F10): in right to left, time runs from right to left. The drawing
  // (paths from growthChart) is mirrored in place by a flipping group around
  // each run of shapes, so the paint order holds; the text is drawn upright at
  // a mirrored x (SVG text anchors are logical, so the labels follow; the signed
  // net counts keep "+3" reading left to right, centred as before). The tag
  // is placed from the inline start, the pointer read from it, the arrows swap.
  const rtl = isRtl();
  const mx = (x: number) => (rtl ? 318 - x : x);
  const flip = (node: React.ReactNode) => (rtl ? <g transform="matrix(-1 0 0 1 318 0)">{node}</g> : node);
  const shift = (pct: number) => `translateX(${rtl ? pct : -pct}%)`;

  const idxAt = (ev: React.PointerEvent<HTMLElement>) => {
    const r0 = ev.currentTarget.getBoundingClientRect();
    const fx = ((rtl ? r0.right - ev.clientX : ev.clientX - r0.left) / r0.width) * 318;
    return Math.max(0, Math.min(last, Math.floor((fx - 28) / g.step)));
  };
  const toggle = (k: SeriesKey) =>
    setHide((h) => {
      // AN4-021 row 5: the last visible of Active / Joined / Ended stays on.
      if (!canHide(h, k)) return h;
      const next = new Set(h);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });

  return (
    <div
      className="border-t border-charcoal/[0.06]"
      style={{ padding: "12px 16px 12px" }}
      onClick={(ev) => {
        // S5: a tap inside the block but outside the chart unpins.
        if ((ev.target as HTMLElement).closest?.("[data-chart]")) return;
        unpin();
      }}
    >
      <p style={{ fontSize: 11, lineHeight: "15px", color: c.faint, textWrap: "pretty" }}>{g.cap}</p>
      <div style={{ display: "flex", flexWrap: "wrap", columnGap: 4, margin: "6px 0 2px" }}>
        {g.legend.map((lg) => (
          <button
            key={lg.k}
            type="button"
            data-chart="1"
            aria-pressed={lg.on}
            aria-disabled={lg.locked || undefined}
            onClick={() => toggle(lg.k)}
            className="focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
            style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 6px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: lg.on ? c.inkSoft : c.faint, textDecoration: lg.on ? "none" : "line-through", cursor: lg.locked ? "default" : "pointer", background: "none", border: 0 }}
          >
            {/* AN4-021 O3: 44 px hit box around the 32 px item. */}
            <span aria-hidden style={{ position: "absolute", left: 0, right: 0, top: -6, bottom: -6 }} />
            <span
              style={{
                width: lg.w,
                height: lg.h,
                borderRadius: lg.r,
                background: lg.k === "active" ? c.line : lg.k === "joined" ? c.good : lg.k === "ended" ? c.high : "transparent",
                borderTop: lg.k === "prev" ? `1.5px dashed ${c.tert}` : "none",
                opacity: lg.on ? 1 : 0.35,
                boxSizing: "border-box",
              }}
            />
            {lg.t}
          </button>
        ))}
      </div>
      <div style={{ position: "relative" }}>
        <svg width="100%" height="178" viewBox="0 0 318 178" preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }} aria-hidden>
          {g.ticks.map((tk) => (
            <g key={tk.t + tk.y}>
              {flip(<line x1="28" x2="314" y1={tk.y} y2={tk.y} stroke={c.grid} strokeWidth="1" />)}
              <text x={rtl ? 318 : "0"} y={tk.ty} fontSize="8.5" fill={c.axis} style={{ fontVariantNumeric: "tabular-nums" }}>
                {tk.t}
              </text>
            </g>
          ))}
          <text x={rtl ? 318 : "0"} y="114" fontSize="7.5" fontWeight="700" fill={c.good} opacity={g.jOp} style={{ transition: fade }}>
            Joined
          </text>
          <text x={rtl ? 318 : "0"} y="149" fontSize="7.5" fontWeight="700" fill={c.high} opacity={g.eOp} style={{ transition: fade }}>
            Ended
          </text>
          {flip(
            <>
              <line x1="28" x2="314" y1="128" y2="128" stroke={c.axis} strokeWidth="1" />
              {/* Each series is one group, so hiding fades the whole series (AN4-021 row 3). */}
              <g data-series="joined" opacity={g.jG} style={{ transition: fade }}>
                {g.bars.map((bb, i) => (
                  <rect key={i} x={bb.jx} width="8" rx="2" fill={c.good} opacity={bb.jo} style={{ y: `${bb.jy}px`, height: `${bb.jh}px`, transition: tr }} />
                ))}
              </g>
              <g data-series="ended" opacity={g.eG} style={{ transition: fade }}>
                {g.bars.map((bb, i) => (
                  <rect key={i} x={bb.ex} width="8" rx="2" fill={c.high} opacity={bb.eo} style={{ y: "129px", height: `${bb.eh}px`, transition: tr }} />
                ))}
              </g>
            </>,
          )}
          {g.bars.map((bb, i) => (
            <text key={i} x={mx(bb.cx)} y="96" direction={rtl ? "ltr" : undefined} fontSize="8.5" fontWeight="800" textAnchor="middle" fill={bb.n > 0 ? c.good : bb.n < 0 ? c.high : c.faint} opacity={bb.no} style={{ fontVariantNumeric: "tabular-nums", transition: fade }}>
              {bb.net}
            </text>
          ))}
          {flip(
            <>
              {g.ghost && <path data-series="prev" d={g.ghost} fill="none" stroke={c.tert} strokeWidth="1.3" strokeDasharray="3 3" opacity={g.gOp} style={{ transition: fade }} />}
              <g data-series="active" opacity={g.aOp} style={{ transition: fade }}>
                <path d={g.area} fill={c.lineFill} />
                <path d={g.line} fill="none" stroke={c.line} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {g.dots.map((dt, i) => (
                  <circle key={i} cx={dt.x} cy={dt.y} r={dt.r} fill={dt.last ? c.line : c.card} stroke={c.line} strokeWidth="1.5" />
                ))}
              </g>
              {g.mk && (
                <>
                  <line x1={g.mk.x} x2={g.mk.x} y1="8" y2="158" stroke={c.ink} strokeWidth="1" strokeDasharray="2 2" opacity="0.55" />
                  <circle cx={g.mk.x} cy={g.mk.y} r="5" fill={c.line} stroke={c.card} strokeWidth="2" opacity={g.aOp} />
                </>
              )}
            </>,
          )}
          {g.xl.map((xl) => (
            <text key={xl.a} x={mx(xl.x)} y="174" fontSize="8.5" fill={c.axis} textAnchor={xl.a}>
              {xl.t}
            </text>
          ))}
        </svg>
        <span
          data-chart="1"
          role="slider"
          aria-label="Scrub the growth chart"
          aria-valuemin={1}
          aria-valuemax={n}
          aria-valuenow={(mi ?? last) + 1}
          aria-valuetext={g.valueText}
          tabIndex={0}
          onPointerDown={(ev) => {
            drag.current = { x0: ev.clientX, y0: ev.clientY, sc: false };
          }}
          onPointerMove={(ev) => {
            const g0 = drag.current;
            if (!g0) return;
            const dx = ev.clientX - g0.x0;
            const dy = ev.clientY - g0.y0;
            if (!g0.sc && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
              g0.sc = true;
              try {
                ev.currentTarget.setPointerCapture(ev.pointerId);
              } catch {
                /* capture is best effort */
              }
            }
            if (!g0.sc && Math.abs(dy) > 8) {
              drag.current = null;
              return;
            }
            if (g0.sc) {
              const i0 = idxAt(ev);
              if (i0 !== scrub) setScrub(i0);
            }
          }}
          onPointerUp={(ev) => {
            const g0 = drag.current;
            drag.current = null;
            if (!g0) return;
            if (g0.sc) {
              setScrub(null);
              return;
            }
            const i0 = idxAt(ev);
            setScrub(null);
            if (pin === i0) unpin();
            else pinAt(i0);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setScrub(null);
          }}
          onKeyDown={(ev) => {
            if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
              ev.preventDefault();
              pinAt(Math.max(0, Math.min(last, (pin ?? last) + ((ev.key === "ArrowRight") !== rtl ? 1 : -1))));
            }
            if (ev.key === "Escape") unpin();
          }}
          className="focus-visible:ring-[3px] focus-visible:ring-primary-dark rounded-[8px]"
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, touchAction: "pan-y", cursor: "crosshair", outline: "none" }}
        />
        {shown && (
          <div
            role="status"
            data-growth-tag
            style={{
              position: "absolute",
              top: -4,
              insetInlineStart: shown.tip.x,
              transform: shift(shown.mi <= 1 ? 12 : shown.mi >= last - 1 ? 88 : 50),
              minWidth: 164,
              width: "max-content",
              maxWidth: "100%",
              opacity: live ? 1 : 0,
              transition: live ? "none" : "opacity 150ms",
              background: c.card,
              border: `1px solid ${hc ? "#8C8378" : c.border}`,
              borderRadius: 12,
              boxShadow: "0 8px 22px rgba(36,31,27,0.16)",
              padding: "9px 11px",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <p style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 10.5, fontWeight: 800, lineHeight: "14px", color: c.faint }}>
              <span style={{ whiteSpace: "nowrap" }}>{shown.tip.wk}</span>
              {shown.pinned && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: c.pDark }}>
                  <Pin size={11} strokeWidth={2.4} aria-hidden />
                  Pinned
                </span>
              )}
            </p>
            {/* AN4-024 O2: the weeks before the first member. */}
            {shown.tip.none ? (
              <p style={{ marginTop: 5, fontSize: 11.5, lineHeight: "16px", color: c.inkSoft, whiteSpace: "nowrap" }}>No members yet</p>
            ) : (
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", rowGap: 2, marginTop: 5, fontSize: 11.5, lineHeight: "16px" }}>
              {shown.tip.rows.map((r) => (
                <span key={r.k} style={{ display: "contents" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: c.inkSoft, whiteSpace: "nowrap" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: r.k === "active" ? c.line : r.k === "joined" ? c.good : r.k === "ended" ? c.high : "transparent" }} />
                    {r.l}
                  </span>
                  <span style={{ fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.k !== "net" ? c.ink : r.n > 0 ? c.good : r.n < 0 ? c.high : c.faint }}>{r.v}</span>
                </span>
              ))}
            </div>
            )}
          </div>
        )}
      </div>
      <p style={{ fontSize: 10.5, lineHeight: "14px", color: c.faint, marginTop: 6 }}>Drag across the chart to read each week. Tap to pin.</p>
      {/* AN4-005 O9: the weeks as a table for screen readers. */}
      <table className="sr-only">
        <tbody>
          {g.srRows.map((r) => (
            <tr key={r}>
              <td>{r}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
