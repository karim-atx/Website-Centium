import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { Eye, EyeOff } from "lucide-react";
import { textPx, linePx } from "../../../theme/textSize";
import { buildClock, type ClockItem } from "./clockModel";
import { DayClock } from "./DayClock";
import type { AnPalette } from "./palette";
import "./overview.css";

// AN1-034 #10-#17 · the Live now card: header (live dot, "Live now",
// "Updated n min ago", Listed / Hidden · Change chip), half-day note + AM/PM
// switch (AN1-139: back to the current half after 8 s), the day clock
// (DayClock), legend + 12/24 pill (AN1-101: thumb 0 / 32 px in 0.2 s, face
// blend 600 ms cubic in-out, long-press 500 ms names the option), the
// selected-items panel (2 rows, then "Show n more" in a 0.35 s collapsible)
// and the summary line. Behaviour ported from the source's handlers:
// auto-cycle every 5 s while 2+ are live (paused while touching and for 8 s
// after a swipe; off under Reduce motion), finger-follow swipe clamped ±113
// that commits past 28 px (0.32 s slide; instant under Reduce motion),
// arrow keys / Enter on the readout, tap = select.

const CLOCK24_KEY = "centium:an1:clock24";
const read24 = () => {
  try {
    return localStorage.getItem(CLOCK24_KEY) === "1";
  } catch {
    return false;
  }
};
const write24 = (v: boolean) => {
  try {
    localStorage.setItem(CLOCK24_KEY, v ? "1" : "0");
  } catch {
    /* per-viewer convenience only */
  }
};

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(t: string, px: number, wt: number): number {
  if (typeof document === "undefined") return t.length * px * (wt === 800 ? 0.62 : 0.56);
  if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
  if (!measureCtx) return t.length * px * (wt === 800 ? 0.62 : 0.56);
  const fam = getComputedStyle(document.body).fontFamily || "Manrope, ui-sans-serif, system-ui, sans-serif";
  measureCtx.font = `${wt} ${px}px ${fam}`;
  return measureCtx.measureText(t).width;
}

const FMT = [
  { num: "12", v: false, name: "12-hour time", arc: "M4 12 A8 8 0 0 1 20 12", arrow: "M17.8 9 L20 12 L22.2 9", ny: "13.0px", ox: "5.1px", oy: "0.6px" },
  { num: "24", v: true, name: "24-hour time", arc: "M12 4 A8 8 0 1 1 8 5.07", arrow: "M6.5 8.5 L8 5.1 L4.3 4.7", ny: "10.3px", ox: "-6px", oy: "0px" },
] as const;

export interface LiveNowProps {
  c: AnPalette;
  items: ClockItem[];
  now: Date;
  loading: boolean;
  isStore: boolean;
  isEmpty: boolean;
  emptyNext: (is24: boolean) => string;
  updated: string;
  offline: boolean;
  listed: boolean;
  onListing: () => void;
  reducedMotion: boolean;
  textScale: number;
}

export function LiveNowCard(p: LiveNowProps) {
  const { c, reducedMotion: rm } = p;
  const hours = p.now.getHours() + p.now.getMinutes() / 60 + p.now.getSeconds() / 3600;

  const [is24, setIs24] = useState(read24);
  const [blend, setBlend] = useState<number | null>(null);
  const [halfPM, setHalfPM] = useState<boolean | null>(null);
  const [cyc, setCyc] = useState(0);
  const [anim, setAnim] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);
  const [swX, setSwX] = useState(0);
  const [selKey, setSelKey] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [tip, setTip] = useState<string | null>(null);
  const [, setFontsTick] = useState(0);

  // The fit measures with the real font: measure again once the web font is in.
  useEffect(() => {
    let alive = true;
    void document.fonts?.ready.then(() => alive && setFontsTick((t) => t + 1));
    return () => {
      alive = false;
    };
  }, []);

  const B = blend ?? (is24 ? 1 : 0);
  const m = useMemo(
    () =>
      buildClock({
        items: p.loading ? [] : p.items,
        now: hours,
        c: c.clock,
        is24,
        blend: B,
        halfPM,
        cyc,
        selKey,
        swX,
        anim,
        dir,
        panelOpen,
        ts: p.textScale,
        isStore: p.isStore,
        isEmpty: p.isEmpty,
        emptyNext: p.emptyNext(is24),
        reducedMotion: rm,
        measure,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- p.emptyNext is a pure formatter
    [p.items, p.loading, hours, c.clock, is24, B, halfPM, cyc, selKey, swX, anim, dir, panelOpen, p.textScale, p.isStore, p.isEmpty, rm],
  );

  // The minute hand turns by CSS (minSweep, one turn an hour from mount); its base angle stays the mount minute.
  const [mountMinDeg] = useState(() => +(((p.now.getMinutes() + p.now.getSeconds() / 60) / 60) * 360).toFixed(2));
  const minuteDeg = rm ? m.minDeg : mountMinDeg;

  // ---- auto-cycle (source componentDidMount) ----------------------------------------
  const nLive = useRef(0);
  nLive.current = m.nLive;
  const holding = useRef(false);
  const pauseUntil = useRef(0);
  const tick = useRef(0);
  const fadeT = useRef<number | undefined>(undefined);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (rm) return;
      const n = nLive.current;
      if (n < 2) return;
      if (holding.current || Date.now() < pauseUntil.current) {
        tick.current = 0;
        return;
      }
      tick.current += 1;
      if (tick.current >= 5) {
        tick.current = 0;
        setAnim(true);
        setDir(1);
        window.clearTimeout(fadeT.current);
        fadeT.current = window.setTimeout(() => {
          setCyc((s) => (s + 1) % (nLive.current || 1));
          setAnim(false);
        }, 320);
      }
    }, 1000);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeT.current);
    };
  }, [rm]);

  // ---- half-day switch (flipTo: back to the current half after 8 s) -------------------
  const halfT = useRef<number | undefined>(undefined);
  const flipTo = useCallback(
    (pm: boolean) => {
      window.clearTimeout(halfT.current);
      setHalfPM(pm);
      if (pm !== hours >= 12) halfT.current = window.setTimeout(() => setHalfPM(null), 8000);
    },
    [hours],
  );
  useEffect(() => () => window.clearTimeout(halfT.current), []);

  // ---- 12 / 24 (blend24 over 600 ms, cubic in-out; instant under Reduce motion) ---------
  const blendRaf = useRef<number | undefined>(undefined);
  const pick24 = (to: boolean) => {
    if (to === is24) return;
    const b0 = B;
    const b1 = to ? 1 : 0;
    setIs24(to);
    write24(to);
    if (rm) {
      setBlend(null);
      return;
    }
    if (blendRaf.current) cancelAnimationFrame(blendRaf.current);
    const t0 = performance.now();
    const step = (n: number) => {
      const u = Math.min(1, (n - t0) / 600);
      const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
      setBlend(u >= 1 ? null : b0 + (b1 - b0) * e);
      if (u < 1) blendRaf.current = requestAnimationFrame(step);
    };
    blendRaf.current = requestAnimationFrame(step);
  };
  useEffect(
    () => () => {
      if (blendRaf.current) cancelAnimationFrame(blendRaf.current);
    },
    [],
  );
  const longT = useRef<number | undefined>(undefined);
  const wasLong = useRef(false);

  // ---- readout gestures (rdDown / rdMove / rdUp / rdCancel / rdKey) -----------------------
  const sx = useRef<number | null>(null);
  const sy = useRef(0);
  const moved = useRef(false);
  const handlers = {
    onPick: (key: string) => setSelKey(key),
    onPointerDown: (e: React.PointerEvent) => {
      sx.current = e.clientX;
      sy.current = e.clientY;
      holding.current = true;
      moved.current = false;
    },
    onPointerMove: (e: React.PointerEvent) => {
      if (sx.current == null) return;
      const dx = e.clientX - sx.current;
      const dy = e.clientY - sy.current;
      if (!moved.current && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) moved.current = true;
      if (moved.current && m.nLive > 1) setSwX(Math.max(-113, Math.min(113, dx)));
    },
    onPointerUp: (e: React.PointerEvent) => {
      const dx = sx.current == null ? 0 : e.clientX - sx.current;
      const mv = moved.current;
      holding.current = false;
      sx.current = null;
      moved.current = false;
      pauseUntil.current = Date.now() + 8000;
      tick.current = 0;
      const n = m.nLive;
      if (mv && n > 1 && Math.abs(dx) > 28) {
        const dr: 1 | -1 = dx < 0 ? 1 : -1;
        if (rm) {
          setCyc((s) => (((s + dr) % n) + n) % n);
          setSwX(0);
        } else {
          setAnim(true);
          setDir(dr);
          setSwX(0);
          window.clearTimeout(fadeT.current);
          fadeT.current = window.setTimeout(() => {
            setCyc((s) => (((s + dr) % n) + n) % n);
            setAnim(false);
          }, 320);
        }
      } else if (!mv) {
        setSwX(0);
        setSelKey(m.tapKey);
      } else setSwX(0);
    },
    onPointerCancel: () => {
      if (sx.current != null && !anim) {
        sx.current = null;
        holding.current = false;
        moved.current = false;
        pauseUntil.current = Date.now() + 8000;
        setSwX(0);
      }
    },
    onKeyDown: (e: React.KeyboardEvent) => {
      const n = m.nLive;
      if (n > 1 && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
        e.preventDefault();
        pauseUntil.current = Date.now() + 8000;
        setCyc((s) => (((s + (e.key === "ArrowRight" ? 1 : -1)) % n) + n) % n);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelKey(m.tapKey);
      }
    },
  };

  const rowsA = m.rows.slice(0, 2);
  const rowsB = m.rows.slice(2);
  const pulseCol = p.offline ? "#A79E93" : c.good;
  const half = m.half;

  const row = (it: (typeof m.rows)[number], first: boolean) => (
    <div key={it.key} data-panel-row style={{ display: "flex", flexDirection: "column", gap: 5, padding: "9px 0", borderTop: first ? "none" : `1px solid ${c.divider}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: it.col, flexShrink: 0, ["--dg" as string]: it.dg, animation: it.live && !rm ? "an1-dotGlow 2.4s ease-in-out infinite" : "none" }} />
        <span style={{ flex: 1, minWidth: 0, fontSize: textPx(13), fontWeight: 800, lineHeight: linePx(17), whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.ink }}>{it.t}</span>
        <span data-status style={{ fontSize: textPx(9.5), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", padding: "2px 8px", borderRadius: 999, background: it.stBg, color: it.stInk, whiteSpace: "nowrap", lineHeight: 1.5 }}>
          {it.st}
        </span>
      </div>
      <p style={{ fontSize: textPx(11.5), lineHeight: linePx(15), color: c.inkSoft, fontVariantNumeric: "tabular-nums", paddingInlineStart: 16, margin: 0 }}>{it.when}</p>
      {it.bar && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingInlineStart: 16 }}>
          <div style={{ flex: 1, height: 5, borderRadius: 999, background: c.track, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${it.pct}%`, borderRadius: 999, background: it.col }} />
          </div>
          <span style={{ fontSize: textPx(11), fontWeight: 800, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: c.ink }}>{it.bk}</span>
        </div>
      )}
    </div>
  );

  return (
    <section
      data-live-card
      aria-label="Live now"
      style={{ background: c.card, borderRadius: 24, border: `1px solid ${c.cardBorder}`, overflow: "hidden", marginBottom: 24, boxShadow: c.entryShadow }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 12px" }}>
        <span aria-hidden style={{ position: "relative", width: 12, height: 12, flexShrink: 0 }}>
          <span data-pulse style={{ position: "absolute", inset: 0, borderRadius: 999, background: pulseCol, opacity: 0.35, animation: p.offline || rm ? "none" : "an1-livePulse 1.8s ease-out infinite" }} />
          <span style={{ position: "absolute", inset: 2, borderRadius: 999, background: pulseCol }} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: textPx(13), fontWeight: 800, lineHeight: linePx(17), whiteSpace: "nowrap", color: c.ink, margin: 0 }}>Live now</h2>
          <p data-updated style={{ fontSize: textPx(10.5), lineHeight: linePx(14), color: c.faint, margin: 0 }}>
            {p.offline ? `Offline · ${p.updated}` : p.updated}
          </p>
        </div>
        <button
          type="button"
          data-listed-chip
          onClick={p.onListing}
          aria-label={p.listed ? "Listed on Explore. Change" : "Hidden from Explore. Change"}
          className="tap"
          style={{
            position: "relative",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            height: 30,
            paddingBlock: "0", paddingInline: "9px 10px",
            borderRadius: 999,
            background: p.listed ? c.goodBg : c.soft,
            color: p.listed ? c.good : c.faint,
            fontSize: textPx(11),
            fontWeight: 800,
            whiteSpace: "nowrap",
            flexShrink: 0,
            border: 0,
          }}
        >
          <span aria-hidden style={{ position: "absolute", insetInlineStart: 0, insetInlineEnd: 0, top: -7, bottom: -7 }} />
          {p.listed ? <Eye size={13} strokeWidth={2.4} aria-hidden /> : <EyeOff size={13} strokeWidth={2.4} aria-hidden />}
          {p.listed ? "Listed" : "Hidden"}
          <span style={{ fontWeight: 700, opacity: 0.8 }}>· Change</span>
        </button>
      </div>

      <div style={{ padding: "2px 16px 14px", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div data-half-row style={{ width: 268, maxWidth: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, margin: "0 0 8px", minHeight: 14 }}>
          <span data-half-note style={{ minWidth: 0, fontSize: textPx(10.5), fontWeight: 700, lineHeight: linePx(14), color: c.faint, whiteSpace: "nowrap" }}>
            {m.halfNote}
          </span>
          {half && (
            <span role="group" aria-label="Half of the day" style={{ display: "flex", alignItems: "center", gap: 2, padding: 2, borderRadius: 9, border: `1px solid ${c.divider}`, flexShrink: 0 }}>
              {[false, true].map((pm) => {
                const on = m.showPM === pm;
                const dot = !on && m.otherHalf > 0;
                return (
                  <button
                    key={String(pm)}
                    type="button"
                    data-half={pm ? "pm" : "am"}
                    aria-pressed={on}
                    aria-label={pm ? "Show PM" : "Show AM"}
                    onClick={() => flipTo(pm)}
                    style={{
                      position: "relative",
                      height: 22,
                      minWidth: 34,
                      padding: "0 7px",
                      borderRadius: 7,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      background: on ? c.half : "transparent",
                      color: on ? c.halfInk : c.faint,
                      fontSize: textPx(10.5),
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      whiteSpace: "nowrap",
                      cursor: "pointer",
                      transition: rm ? "none" : "background 0.2s ease",
                      border: 0,
                    }}
                  >
                    <span aria-hidden style={{ position: "absolute", insetInlineStart: "50%", top: "50%", width: 44, height: 44, transform: "translate(-50%,-50%)" }} />
                    {pm ? m.pmLabel : m.amLabel}
                    {dot && (
                      <span data-count-dot style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 12, height: 12, padding: "0 3px", borderRadius: 999, background: c.liveTeal, color: "#FFFFFF", fontSize: 8, fontWeight: 800 }}>
                        {m.otherHalf}
                      </span>
                    )}
                  </button>
                );
              })}
            </span>
          )}
        </div>

        <DayClock m={m} c={c} reducedMotion={rm} minuteDeg={minuteDeg} loading={p.loading} anim={anim} h={handlers} />

        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 6 }}>
          <div data-legend style={{ display: "flex", alignItems: "center", gap: 12, fontSize: textPx(10), fontWeight: 600, color: c.faint, flexWrap: "wrap", minWidth: 0 }}>
            {m.legend.map((lg) => (
              <span key={lg.t} style={{ display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap" }}>
                <span style={{ width: 12, height: 4, borderRadius: 2, background: lg.col, opacity: lg.op }} />
                {lg.t}
              </span>
            ))}
          </div>
          <div data-pill role="radiogroup" aria-label="Time format" style={{ position: "relative", width: 88, height: 44, flexShrink: 0, marginInlineEnd: -10, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span aria-hidden data-pill-track style={{ position: "absolute", insetInlineStart: 10, top: 7, width: 68, height: 30, borderRadius: 999, background: c.pillTrack, boxShadow: `inset 0 0 0 1px ${c.pillBorder}`, pointerEvents: "none" }} />
            <span
              aria-hidden
              data-pill-thumb
              style={{ position: "absolute", insetInlineStart: 12, top: 9, width: 32, height: 26, borderRadius: 999, background: c.half, boxShadow: c.pillThumbSh, transform: `translateX(${is24 ? 32 : 0}px)`, transition: rm ? "none" : "transform 0.2s cubic-bezier(0.22,1,0.36,1)", pointerEvents: "none" }}
            />
            {FMT.map((f) => {
              const on = is24 === f.v;
              return (
                <span
                  key={f.num}
                  role="radio"
                  tabIndex={on ? 0 : -1}
                  aria-checked={on}
                  aria-label={f.name}
                  data-fmt={f.num}
                  onClick={() => {
                    if (wasLong.current) {
                      wasLong.current = false;
                      return;
                    }
                    pick24(f.v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      pick24(f.v);
                    } else if (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault();
                      pick24(!is24);
                    }
                  }}
                  onPointerDown={() => {
                    window.clearTimeout(longT.current);
                    longT.current = window.setTimeout(() => {
                      wasLong.current = true;
                      setTip(f.num);
                    }, 500);
                  }}
                  onPointerUp={() => {
                    window.clearTimeout(longT.current);
                    if (tip) window.setTimeout(() => setTip(null), 1200);
                  }}
                  onPointerLeave={() => {
                    window.clearTimeout(longT.current);
                    if (tip) window.setTimeout(() => setTip(null), 1200);
                  }}
                  onContextMenu={(e) => e.preventDefault()}
                  className="focus-visible:shadow-focus-ring"
                  style={{ position: "relative", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", WebkitTapHighlightColor: "transparent", userSelect: "none", outline: "none", borderRadius: 999 }}
                >
                  <span
                    data-glyph
                    style={{ position: "relative", width: 20, height: 20, transform: `translate(${f.ox},${f.oy})`, color: on ? (c.dark ? "#121317" : "#FFFFFF") : c.faint, opacity: on ? 1 : 0.7, transition: rm ? "none" : "color 0.2s ease, opacity 0.2s ease" }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ display: "block" }} aria-hidden>
                      <path d={f.arc} />
                      <path d={f.arrow} />
                    </svg>
                    <span aria-hidden style={{ position: "absolute", insetInlineStart: "50%", top: f.ny, transform: "translate(-50%,-50%)", fontSize: 7, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", pointerEvents: "none" }}>
                      {f.num}
                    </span>
                  </span>
                  {tip === f.num && (
                    <span
                      role="tooltip"
                      style={{ position: "absolute", bottom: "calc(100% + 2px)", insetInlineEnd: 4, background: c.dark ? "#F5F3FA" : "#241F1B", color: c.dark ? "#121317" : "#FFFFFF", fontSize: textPx(11), fontWeight: 700, lineHeight: linePx(14), padding: "6px 9px", borderRadius: 9, whiteSpace: "nowrap", boxShadow: "0 6px 16px rgba(36,31,27,0.22)", pointerEvents: "none", zIndex: 2 }}
                    >
                      {f.name}
                    </span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {p.loading ? (
        <div data-panel style={{ margin: "0 12px 12px", borderRadius: 16, background: c.panelBg, border: `1px solid ${c.divider}`, padding: "4px 14px" }}>
          {[0, 1].map((i) => (
            <div key={i} style={{ padding: "12px 0", borderTop: i ? `1px solid ${c.divider}` : "none" }}>
              <span className="animate-skeleton-pulse" style={{ display: "block", width: "60%", height: 12, borderRadius: 6, background: c.soft }} />
              <span className="animate-skeleton-pulse" style={{ display: "block", width: "40%", height: 10, borderRadius: 5, background: c.soft, marginTop: 8 }} />
            </div>
          ))}
        </div>
      ) : (
        m.rows.length > 0 && (
          <div data-panel style={{ margin: "0 12px 12px", borderRadius: 16, background: c.panelBg, border: `1px solid ${c.divider}`, padding: "4px 14px", display: "flex", flexDirection: "column" }}>
            {m.panelHead && (
              <p data-panel-head style={{ fontSize: textPx(10), fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: linePx(13), color: c.faint, padding: "9px 0 2px", margin: 0 }}>
                {m.panelHead}
              </p>
            )}
            {rowsA.map((it, i) => row(it, i === 0))}
            {rowsB.length > 0 && (
              <>
                <div data-more style={{ maxHeight: panelOpen ? rowsB.length * 84 * (p.textScale > 1 ? 1.3 : 1) : 0, overflow: "hidden", transition: rm ? "none" : "max-height 0.35s cubic-bezier(0.22,1,0.36,1)" }} aria-hidden={!panelOpen}>
                  {rowsB.map((it) => row(it, false))}
                </div>
                <button
                  type="button"
                  aria-expanded={panelOpen}
                  onClick={() => setPanelOpen((v) => !v)}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, borderTop: `1px solid ${c.divider}`, fontSize: textPx(12), fontWeight: 800, color: c.pDark, cursor: "pointer", WebkitTapHighlightColor: "transparent", background: "none", borderInlineStart: 0, borderInlineEnd: 0, borderBottom: 0 }}
                >
                  {panelOpen ? "Show less" : `Show ${rowsB.length} more`}
                  <span style={{ display: "flex", transform: panelOpen ? "rotate(180deg)" : "none", transition: rm ? "none" : "transform 0.3s ease" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </span>
                </button>
              </>
            )}
          </div>
        )
      )}

      {!p.loading && m.summary && (
        <p data-summary style={{ padding: "10px 16px 12px", borderTop: `1px solid ${c.divider}`, fontSize: textPx(11), lineHeight: linePx(15), color: c.faint, textAlign: "center", margin: 0 }}>
          {m.summary}
        </p>
      )}
    </section>
  );
}
