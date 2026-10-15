import { useRef, useState } from "react";
import { Pin } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import type { GrowthWeek } from "../../../services/business-analytics";
import { growthChart, type SeriesKey } from "./membersModel";

// AN4-005 rows 18-33 and S2-S7 (AnMembersV6 "growth chart v2", l.99-135 markup,
// l.339-376 logic): active members as a line, joins above and ends below the
// baseline, the previous period dashed, scrub / tap-to-pin / keyboard, legend
// toggles. The weeks are business_member_growth's (B15, Monday weeks in the
// business's calendar): the weeks of the range, at least 8 (AN4-005 O10), so
// the source's fixed 8 becomes `n` everywhere (step 286 / n, slider max n).
// Colours are the source's literal L / D tokens (l.240-241).

const L = { card: "#FFFFFF", border: "rgba(36,31,27,0.11)", ink: "#241F1B", inkSoft: "#5B5349", faint: "#8C8378", tert: "#A79E93", pDark: "#7D6BB5", good: "#3F9165", high: "#C0392B", line: "#7D6BB5", lineFill: "rgba(125,107,181,0.12)", grid: "rgba(36,31,27,0.07)", axis: "#A79E93" };
const D = { card: "#1C1F28", border: "rgba(245,243,250,0.08)", ink: "#F5F3FA", inkSoft: "#B8B3C7", faint: "#B8B3C7", tert: "#9F9CAC", pDark: "#C3B3FB", good: "#7FC79C", high: "#F09A8E", line: "#A393E0", lineFill: "rgba(163,147,224,0.14)", grid: "rgba(238,239,242,0.08)", axis: "#B8B3C7" };

export function GrowthChart({ cur, prev, endsThisWeek }: { cur: GrowthWeek[]; prev: GrowthWeek[] | null; endsThisWeek: boolean }) {
  const c = useIsDark() ? D : L;
  const reduce = useReducedMotion();
  const [hide, setHide] = useState<Set<SeriesKey>>(new Set());
  const [scrub, setScrub] = useState<number | null>(null);
  const [pin, setPin] = useState<number | null>(null);
  const drag = useRef<{ x0: number; y0: number; sc: boolean } | null>(null);
  const g = growthChart(cur, prev, hide, scrub ?? pin, endsThisWeek);
  const n = cur.length;
  const last = n - 1;
  const mi = scrub ?? pin;
  const tr = reduce ? "none" : "y 0.45s cubic-bezier(0.22,1,0.36,1), height 0.45s cubic-bezier(0.22,1,0.36,1)";

  const idxAt = (ev: React.PointerEvent<HTMLElement>) => {
    const r0 = ev.currentTarget.getBoundingClientRect();
    const fx = ((ev.clientX - r0.left) / r0.width) * 318;
    return Math.max(0, Math.min(last, Math.floor((fx - 28) / g.step)));
  };
  const toggle = (k: SeriesKey) =>
    setHide((h) => {
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
        if (pin !== null) setPin(null);
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
            onClick={() => toggle(lg.k)}
            className="focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
            style={{ display: "flex", alignItems: "center", gap: 6, minHeight: 32, padding: "0 6px", borderRadius: 8, fontSize: 11, fontWeight: 700, color: lg.on ? c.inkSoft : c.faint, textDecoration: lg.on ? "none" : "line-through", cursor: "pointer", background: "none", border: 0 }}
          >
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
              <line x1="28" x2="314" y1={tk.y} y2={tk.y} stroke={c.grid} strokeWidth="1" />
              <text x="0" y={tk.ty} fontSize="8.5" fill={c.axis} style={{ fontVariantNumeric: "tabular-nums" }}>
                {tk.t}
              </text>
            </g>
          ))}
          <text x="0" y="114" fontSize="7.5" fontWeight="700" fill={c.good} opacity={g.jOp}>
            Joined
          </text>
          <text x="0" y="149" fontSize="7.5" fontWeight="700" fill={c.high} opacity={g.eOp}>
            Ended
          </text>
          <line x1="28" x2="314" y1="128" y2="128" stroke={c.axis} strokeWidth="1" />
          {g.bars.map((bb, i) => (
            <g key={i}>
              <rect x={bb.jx} width="8" rx="2" fill={c.good} opacity={bb.jo} style={{ y: `${bb.jy}px`, height: `${bb.jh}px`, transition: tr }} />
              <rect x={bb.ex} width="8" rx="2" fill={c.high} opacity={bb.eo} style={{ y: "129px", height: `${bb.eh}px`, transition: tr }} />
              <text x={bb.cx} y="96" fontSize="8.5" fontWeight="800" textAnchor="middle" fill={bb.n > 0 ? c.good : bb.n < 0 ? c.high : c.faint} opacity={bb.no} style={{ fontVariantNumeric: "tabular-nums" }}>
                {bb.net}
              </text>
            </g>
          ))}
          {g.ghost && <path d={g.ghost} fill="none" stroke={c.tert} strokeWidth="1.3" strokeDasharray="3 3" opacity={g.gOp} />}
          <path d={g.area} fill={c.lineFill} opacity={g.aOp} />
          <path d={g.line} fill="none" stroke={c.line} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" opacity={g.aOp} />
          {g.dots.map((dt, i) => (
            <circle key={i} cx={dt.x} cy={dt.y} r={dt.r} fill={dt.last ? c.line : c.card} stroke={c.line} strokeWidth="1.5" opacity={g.aOp} />
          ))}
          {g.mk && (
            <>
              <line x1={g.mk.x} x2={g.mk.x} y1="8" y2="158" stroke={c.ink} strokeWidth="1" strokeDasharray="2 2" opacity="0.55" />
              <circle cx={g.mk.x} cy={g.mk.y} r="5" fill={c.line} stroke={c.card} strokeWidth="2" opacity={g.aOp} />
            </>
          )}
          {g.xl.map((xl) => (
            <text key={xl.a} x={xl.x} y="174" fontSize="8.5" fill={c.axis} textAnchor={xl.a}>
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
          aria-valuetext={g.tip ? g.tip.wk : undefined}
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
            setPin((p) => (p === i0 ? null : i0));
            setScrub(null);
          }}
          onPointerCancel={() => {
            drag.current = null;
            setScrub(null);
          }}
          onKeyDown={(ev) => {
            if (ev.key === "ArrowLeft" || ev.key === "ArrowRight") {
              ev.preventDefault();
              setPin((p) => Math.max(0, Math.min(last, (p ?? last) + (ev.key === "ArrowRight" ? 1 : -1))));
            }
            if (ev.key === "Escape") setPin(null);
          }}
          className="focus-visible:ring-[3px] focus-visible:ring-primary-dark rounded-[8px]"
          style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, touchAction: "pan-y", cursor: "crosshair", outline: "none" }}
        />
        {g.tip && mi !== null && (
          <div
            role="status"
            style={{
              position: "absolute",
              top: -4,
              left: g.tip.x,
              transform: mi <= 1 ? "translateX(-12%)" : mi >= last - 1 ? "translateX(-88%)" : "translateX(-50%)",
              width: 164,
              background: c.card,
              border: `1px solid ${c.border}`,
              borderRadius: 12,
              boxShadow: "0 8px 22px rgba(36,31,27,0.16)",
              padding: "9px 11px",
              pointerEvents: "none",
              zIndex: 2,
            }}
          >
            <p style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 10.5, fontWeight: 800, lineHeight: "14px", color: c.faint }}>
              <span style={{ whiteSpace: "nowrap" }}>{g.tip.wk}</span>
              {scrub === null && pin !== null && (
                <span style={{ display: "flex", alignItems: "center", gap: 3, color: c.pDark }}>
                  <Pin size={11} strokeWidth={2.4} aria-hidden />
                  Pinned
                </span>
              )}
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", rowGap: 2, marginTop: 5, fontSize: 11.5, lineHeight: "16px" }}>
              {g.tip.rows.map((r) => (
                <span key={r.k} style={{ display: "contents" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, color: c.inkSoft, whiteSpace: "nowrap" }}>
                    <span style={{ width: 7, height: 7, borderRadius: 2, flexShrink: 0, background: r.k === "active" ? c.line : r.k === "joined" ? c.good : r.k === "ended" ? c.high : "transparent" }} />
                    {r.l}
                  </span>
                  <span style={{ fontWeight: 800, textAlign: "right", fontVariantNumeric: "tabular-nums", color: r.k !== "net" ? c.ink : r.n > 0 ? c.good : r.n < 0 ? c.high : c.faint }}>{r.v}</span>
                </span>
              ))}
            </div>
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
