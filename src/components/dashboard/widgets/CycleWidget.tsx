import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, EyeOff, Pill } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { MetricWidget, type MetricWidgetState } from "../../health/MetricWidget";
import { CycleCalendarIcon } from "../../icons/PartBIcons";
import { LogDaySheet } from "../../cycle/LogDaySheet";
import { PHASE_LABEL } from "../../../services/cycle/guidance";
import { daysBetween, shiftDay } from "../../../services/cycle/insights";
import type { CyclePhase } from "../../../services/cycle/types";
import { gestationOn } from "../../../services/pregnancy/weeks";
import { heroPatternUrl } from "../../../utils/assetUrls";
import { DAY_LETTERS, DAY_SHORT, mondayFirstWeek, weekdayColumn } from "../../../utils/week";
import { textPx, linePx } from "../../../theme/textSize";
import { useOnline } from "../../../hooks/useOnline";
import { useReducedMotion } from "../../../hooks/useReducedMotion";

// HO1.W11-S / HO1.W11-L (home-handover.md), the Home Cycle widget.
//
// LITERAL PER STATE AS DRAWN (V6-119 / D9). Small: the light Default frame is
// drawn on its own grid (tile 20 r6 @85%, ring 56, "Day" 8.5 / value 18 /
// lines 12 + 10, no chevron drawn); Period today, Recovery-sensitive and the
// Dark frame on another (tile 22 r7 @80%, gap 6, label 9/13.5, ring 48, 8 / 15
// / 11, chevron 16 at 150.5, 49). Large: every state on one grid (ring 74,
// strip, bottom row). Ring geometry and colours not in the tables were
// measured from the 2x PNGs (pt = px / 2): stroke 5 on every ring; ring
// radius 23.25 (56), 21.25 (48), 32.5 (74); tracks #FFFDFE (56, 74),
// #F4D6E0 (48), #E7E4EC (large Not set up), dark #E8A9BF@22% (small) and
// #FFFFFF@12% (large); the white end dot (r 2.75, #B8607F 1.5 ring) is drawn
// only on the 48 rings; large Period today's segment is #B8607F. Strip pitch
// measured 21 (dot 14 + 7), not the table's "gap 4".
//
// SAFETY (V6-18): every predicted date or countdown carries "Estimate"; no
// fertile window, no "safe days", no contraception clause, no flags (C6).
// Recovery-sensitive mode hides the day count and the countdown (D7).

type Kind = "nsu" | "default" | "period" | "recovery" | "unavailable" | "hormonal" | "pregnant";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_LONG = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS_LONG = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/** "Wed, Oct 21" (Monday-first weekday table). */
const shortDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${DAY_SHORT[weekdayColumn(d)]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
};
const longDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return `${DAYS_LONG[weekdayColumn(d)]}, ${MONTHS_LONG[d.getMonth()]} ${d.getDate()}`;
};

// The header glyph: the calendar-flower icon at the table's own size (12 on
// the Default grids, 13 on the small 22-tile states), coloured by MetricWidget.
type GlyphProps = { size?: number; strokeWidth?: number; style?: React.CSSProperties };
const Glyph12: React.FC<GlyphProps> = ({ style }) => <CycleCalendarIcon size={12} style={style} />;
const Glyph13: React.FC<GlyphProps> = ({ style }) => <CycleCalendarIcon size={13} style={style} />;

const ink = {
  charcoal: "rgb(var(--c-charcoal))", // #241F1B / #F5F3FA, #111111 under High contrast
  soft: "rgb(var(--c-charcoal-soft))", // #5B5349 / #B8B3C7
  faint: "rgb(var(--c-charcoal-faint))", // #8C8378 / #B8B3C7
  widget: "rgb(var(--metric-cycle-widget-ink))", // #9C4A68 / #F0B9CB (Default tables)
  text: "rgb(var(--metric-cycle-ink))", // #9A4566 / #F0B9CB (other states)
  main: "rgb(var(--metric-cycle-main))", // #E29AB2 / #E8A9BF
};

/** The progress ring: track, an arc from 12 o'clock, an optional end dot. Draws in over 600 ms. */
const Ring: React.FC<{
  box: number;
  r: number;
  track: string;
  /** 0..1 arc from the top, or null for the track only. */
  arc: number | null;
  arcColor?: string;
  /** 0..1 position of the white end dot, or null. */
  dot?: number | null;
  reduce: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}> = ({ box, r, track, arc, arcColor, dot = null, reduce, children, style }) => {
  const [drawn, setDrawn] = useState(reduce);
  useEffect(() => {
    if (drawn) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)));
    return () => cancelAnimationFrame(id);
  }, [drawn]);
  const c = box / 2;
  const circ = 2 * Math.PI * r;
  const shown = drawn || reduce ? 1 : 0;
  const transition = reduce ? "none" : `stroke-dashoffset 600ms ${EASE}, transform 600ms ${EASE}`;
  return (
    <div className="absolute" style={{ width: box, height: box, ...style }} data-cycle-ring={box}>
      <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} aria-hidden className="absolute inset-0">
        <circle cx={c} cy={c} r={r} fill="none" stroke={track} strokeWidth={5} />
        {arc !== null && arc > 0 && (
          <circle
            cx={c}
            cy={c}
            r={r}
            fill="none"
            stroke={arcColor}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${circ} ${circ}`}
            strokeDashoffset={circ * (1 - Math.min(1, arc) * shown)}
            transform={`rotate(-90 ${c} ${c})`}
            style={{ transition }}
            data-cycle-arc=""
          />
        )}
        {dot !== null && (
          <g style={{ transform: `rotate(${360 * Math.min(1, dot) * shown}deg)`, transformOrigin: `${c}px ${c}px`, transition }}>
            <circle cx={c} cy={c - r} r={2.75} fill="#FFFFFF" stroke="#B8607F" strokeWidth={1.5} data-cycle-dot="" />
          </g>
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
};

/** Ring centre: a small label over a value (sizes fixed: text drawn to fit a shape keeps its size). */
const RingText: React.FC<{ label: string; value: React.ReactNode; labelPx: number; valuePx: number; weight: number; ls: number; gap?: number; labelInk: string }> = ({
  label,
  value,
  labelPx,
  valuePx,
  weight,
  ls,
  gap = 0,
  labelInk,
}) => (
  <>
    <span data-cycle-ring-label="" style={{ fontSize: labelPx, lineHeight: `${labelPx}px`, fontWeight: 700, color: labelInk, whiteSpace: "nowrap" }}>
      {label}
    </span>
    <span
      data-cycle-ring-value=""
      style={{ marginTop: gap, fontSize: valuePx, lineHeight: `${valuePx}px`, fontWeight: weight, letterSpacing: ls, color: ink.charcoal, fontVariantNumeric: "tabular-nums" }}
    >
      {value}
    </span>
  </>
);

const oneLine: React.CSSProperties = { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };
const clamp = (n: number): React.CSSProperties => ({ display: "-webkit-box", WebkitLineClamp: n, WebkitBoxOrient: "vertical", overflow: "hidden" });

export const CycleWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const {
    cycleSettings,
    cycleSettingsLoaded,
    cycleLogs,
    cyclePrediction,
    reloadCycle,
    pregnancy,
    recoverySensitive,
    recoveryModePending,
    today,
    theme,
    accessibility,
  } = useApp();
  const navigate = useNavigate();
  const online = useOnline();
  const reduce = useReducedMotion();
  const dark = theme === "dark";
  const hc = !!accessibility.highContrast;
  const large = size === "large";
  const [logOpen, setLogOpen] = useState(false);

  // C5 loading: settings unknown, or recovery mode unknown (nothing flashes).
  // my_cycle_prediction answers with NO ROW until a period is logged (that is
  // Not set up, as on the Cycle page). With a logged period it always answers
  // with a row, so none yet is still loading; after 8 s with no data it is an
  // error (HO1 States), and a tap retries.
  const tracker = !!cycleSettings?.trackerEnabled;
  const hasPeriodLog = cycleLogs.some((l) => l.isPeriod);
  const waiting = cycleSettingsLoaded && !recoveryModePending && tracker && !cyclePrediction && hasPeriodLog;
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    if (!waiting || timedOut) return;
    const t = setTimeout(() => setTimedOut(true), 8000);
    return () => clearTimeout(t);
  }, [waiting, timedOut]);

  let widgetState: MetricWidgetState = "ready";
  if (!cycleSettingsLoaded || recoveryModePending) widgetState = "loading";
  // Offline with nothing read yet: the reads may have failed, so "not set up"
  // cannot be told apart; the shared offline state says so instead.
  else if (!online && !cyclePrediction) widgetState = "offline";
  else if (waiting) widgetState = timedOut ? "error" : "loading";

  // ---- which drawn state -----------------------------------------------------
  const p = cyclePrediction;
  const recovery = recoverySensitive || recoveryModePending;
  const gestation = pregnancy ? gestationOn(today, pregnancy) : null;
  let kind: Kind = "nsu";
  if (tracker && p) {
    if (p.phase === "pregnant") kind = "pregnant";
    else if (p.phase === "hormonal_contraception") kind = "hormonal";
    else if (p.phase === "unavailable") kind = hasPeriodLog ? "unavailable" : "nsu";
    else if (p.cycleDay === null) kind = "unavailable";
    else if (recovery) kind = "recovery";
    else if (p.phase === "menstrual") kind = "period";
    else if (!(p.nextPeriodFrom ?? p.nextPeriodStart)) kind = "unavailable";
    else kind = "default";
    if (kind === "unavailable" && recovery) kind = "recovery";
  }

  const cycleLength = cycleSettings?.typicalCycleLength ?? 28;
  const periodLength = cycleSettings?.typicalPeriodLength ?? 5;
  const day = p?.cycleDay ?? null;
  const phase: CyclePhase = p?.phase ?? "unavailable";
  const nextFrom = p?.nextPeriodFrom ?? p?.nextPeriodStart ?? null;
  const daysToNext = nextFrom ? daysBetween(today, nextFrom) : null;
  const countdown = daysToNext === null ? null : daysToNext <= 0 ? "Period due" : `Period in ${daysToNext} day${daysToNext === 1 ? "" : "s"}`;
  const periodStart = day !== null ? shiftDay(today, -(day - 1)) : null;
  const periodEnd = periodStart ? shiftDay(periodStart, periodLength - 1) : null;
  const pregWeek = p?.pregnancyWeek ?? gestation?.week ?? null;
  const trimester = p?.trimester ?? gestation?.trimester ?? null;

  // ---- colours ---------------------------------------------------------------
  const smallDrawn48 = !large && (kind === "period" || kind === "recovery" || (kind === "default" && dark));
  const smallNsu = !large && kind === "nsu";
  const tint = kind === "nsu" ? (dark ? "#242730" : "#F5F5F6") : "rgb(var(--metric-cycle-tint))";
  const tile = smallNsu ? (dark ? "#1C1F28" : "#FFFFFF") : dark ? "rgba(255,255,255,0.08)" : smallDrawn48 ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.85)";
  const label = dark
    ? smallNsu
      ? "rgb(245 243 250 / 0.5)"
      : "#F0B9CB"
    : smallNsu
      ? "rgb(var(--c-charcoal) / 0.5)"
      : smallDrawn48
        ? ink.text
        : ink.widget;
  const glyph = smallNsu ? ink.soft : dark ? ink.main : "rgb(var(--metric-cycle-accent))";
  // Light Default tables use #9C4A68; the other states #9A4566 (D8).
  const pinkInk = smallDrawn48 ? ink.text : ink.widget;
  const actionInk = dark ? (kind === "nsu" ? "#EDA9C0" : "#E8A9BF") : hc ? "#9A4566" : "#B8607F";

  // ---- interactions ----------------------------------------------------------
  const open = () => navigate("/app/cycle");
  const retry = () => {
    setTimedOut(false);
    reloadCycle();
  };
  const activate = widgetState === "error" ? retry : widgetState === "offline" || widgetState === "loading" ? undefined : open;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  // ---- one sentence for screen readers ---------------------------------------
  let aria = "Cycle";
  if (widgetState === "loading") aria = "Cycle, loading";
  else if (widgetState === "error") aria = "Cycle, couldn't update, tap to retry";
  else if (widgetState === "offline") aria = "Cycle, you're offline";
  else if (kind === "nsu") aria = "Cycle, set up cycle tracking";
  else if (kind === "recovery") aria = `Cycle, ${PHASE_LABEL[phase].toLowerCase()}${phase === "menstrual" || phase === "unavailable" ? "" : " phase"}, countdown hidden`;
  else if (kind === "period")
    aria = `Cycle, period, day ${day}${large && periodEnd && periodEnd >= today ? `, period likely ends ${longDate(periodEnd)}, estimate` : ""}`;
  else if (kind === "default") aria = `Cycle, day ${day}, ${PHASE_LABEL[phase].toLowerCase()} phase, ${countdown?.toLowerCase()}, estimate`;
  else if (kind === "unavailable") aria = `Cycle, ${day !== null ? `day ${day}, ` : ""}not enough data yet`;
  else if (kind === "hormonal") aria = "Cycle, on hormonal contraception";
  else if (kind === "pregnant") aria = `Cycle, pregnant${pregWeek !== null ? `, week ${pregWeek}` : ""}${trimester ? `, trimester ${trimester}` : ""}`;

  // ---- the ring --------------------------------------------------------------
  const ringCentreGlyph = (px: number) => <CycleCalendarIcon size={px} style={{ color: ink.text }} />;
  let ring: React.ReactNode = null;
  if (widgetState === "ready") {
    if (large) {
      const track = dark ? "rgba(255,255,255,0.12)" : kind === "nsu" ? "#E7E4EC" : "#FFFDFE";
      let arc: number | null = null;
      let arcColor = ink.main;
      let centre: React.ReactNode = null;
      const rt = (l: string, v: React.ReactNode) => <RingText label={l} value={v} labelPx={8.5} valuePx={22} weight={600} ls={-0.7} labelInk={ink.widget} />;
      if (kind === "default") {
        arc = day! / cycleLength;
        centre = rt("Day", day);
      } else if (kind === "period") {
        arc = day! / cycleLength;
        arcColor = dark ? ink.main : "#B8607F";
        centre = rt("Period", day);
      } else if (kind === "recovery") centre = <EyeOff size={22} style={{ color: ink.widget }} aria-hidden />;
      else if (kind === "unavailable") centre = day !== null ? rt("Day", day) : ringCentreGlyph(22);
      else if (kind === "hormonal") centre = <Pill size={22} style={{ color: ink.text }} aria-hidden />;
      else if (kind === "pregnant" && pregWeek !== null) {
        arc = pregWeek / 40;
        centre = rt("Week", pregWeek);
      }
      ring = (
        <Ring box={74} r={32.5} track={track} arc={arc} arcColor={arcColor} reduce={reduce} style={{ left: 16, top: 41 }}>
          {centre}
        </Ring>
      );
    } else if (smallDrawn48) {
      const track = dark ? "rgba(232,169,191,0.22)" : "#F4D6E0";
      let arc: number | null = null;
      let dot: number | null = null;
      let centre: React.ReactNode = null;
      if (kind === "default") {
        arc = day! / cycleLength;
        dot = arc;
        centre = <RingText label="Day" value={day} labelPx={7.5} valuePx={15} weight={800} ls={-0.4} gap={1} labelInk="#F0B9CB" />;
      } else if (kind === "period") {
        arc = Math.max(day!, periodLength) / cycleLength;
        dot = day! / cycleLength;
        centre = <RingText label="Period" value={day} labelPx={8} valuePx={15} weight={800} ls={-0.4} gap={1} labelInk={dark ? "#F0B9CB" : ink.text} />;
      } else centre = <EyeOff size={16} style={{ color: dark ? "#F0B9CB" : ink.text }} aria-hidden />;
      ring = (
        <Ring box={48} r={21.25} track={track} arc={arc} arcColor={ink.main} dot={dot} reduce={reduce} style={{ left: 12, top: 55 }}>
          {centre}
        </Ring>
      );
    } else if (kind !== "nsu") {
      const track = dark ? "rgba(232,169,191,0.22)" : "#FFFDFE";
      let arc: number | null = null;
      let centre: React.ReactNode = null;
      const rt = (l: string, v: React.ReactNode) => <RingText label={l} value={v} labelPx={8.5} valuePx={18} weight={600} ls={-0.5} labelInk={ink.widget} />;
      if (kind === "default") {
        arc = day! / cycleLength;
        centre = rt("Day", day);
      } else if (kind === "unavailable") centre = day !== null ? rt("Day", day) : ringCentreGlyph(16);
      else if (kind === "hormonal") centre = <Pill size={16} style={{ color: ink.text }} aria-hidden />;
      else if (kind === "pregnant" && pregWeek !== null) {
        arc = pregWeek / 40;
        centre = rt("Week", pregWeek);
      }
      ring = (
        <Ring box={56} r={23.25} track={track} arc={arc} arcColor={ink.main} reduce={reduce} style={{ left: 12, top: 42 }}>
          {centre}
        </Ring>
      );
    }
  }

  // ---- the text --------------------------------------------------------------
  const t = (px: number, line: number, weight: number, color: string, extra?: React.CSSProperties): React.CSSProperties => ({
    fontSize: textPx(px),
    lineHeight: linePx(line),
    fontWeight: weight,
    color,
    ...extra,
  });
  const chevron = (
    <ChevronRight size={16} aria-hidden className="absolute" data-cycle-chevron="" style={{ left: 150.5, top: 49, color: ink.faint }} />
  );
  let text: React.ReactNode = null;
  let showChevron = false;
  if (widgetState === "ready" && !large) {
    showChevron = true;
    if (kind === "nsu") {
      text = (
        <p className="absolute" style={{ left: 12, top: 59.9, width: 138.5, ...t(12, 16.2, 700, ink.charcoal), ...oneLine }}>
          Set up cycle tracking
        </p>
      );
    } else if (smallDrawn48) {
      // Lines 11/13.8: first 800 ink, second the pink ink (drawn), 600.
      const lines: [string, string] =
        kind === "period" ? ["Period", `Day ${day}`] : kind === "recovery" ? [PHASE_LABEL[phase], "Phase only"] : [PHASE_LABEL[phase], countdown ?? ""];
      const withEstimate = kind === "default";
      text = (
        <div
          className="absolute flex flex-col justify-center"
          // Text column centred on the ring (48 at 55: centre 79); the drawn
          // two lines sit at 65. Dark Default adds the "Estimate" line the
          // frame leaves out (safety), so the column is centred instead.
          style={{ left: 70, right: 9, top: withEstimate ? 45 : 65, height: withEstimate ? 68 : undefined }}
          data-cycle-text=""
        >
          <span style={t(11, 13.8, 800, ink.charcoal, oneLine)}>{lines[0]}</span>
          <span style={t(11, 13.8, 600, dark ? "#F0B9CB" : ink.text, oneLine)}>{lines[1]}</span>
          {withEstimate && <span style={t(10, 13, 600, ink.faint, oneLine)}>Estimate</span>}
        </div>
      );
    } else {
      // Default grid (56 ring): title 12/15.6 700, gap 3, lines 10/13 600.
      let title = PHASE_LABEL[phase];
      let lines: React.ReactNode[] = [];
      if (kind === "default") lines = [<span key="c" style={{ color: pinkInk }}>{countdown}</span>, <span key="e" style={{ color: ink.faint }}>Estimate</span>];
      else if (kind === "unavailable") {
        title = PHASE_LABEL.unavailable;
        lines = [<span key="h" style={{ color: ink.widget, ...clamp(3) }}>Log your period to see an estimate</span>];
      } else if (kind === "pregnant" && trimester) lines = [<span key="t" style={{ color: ink.widget }}>Trimester {trimester}</span>];
      const centred = kind !== "default";
      text = (
        <div
          className="absolute flex flex-col"
          style={
            centred
              ? { left: 78, right: 9, top: 31, height: 78, justifyContent: "center" }
              : // 78.4 wide in the table; the lines below the chevron
                // (150.5, 49-65) may run to its right inset (9) before they
                // ellipsis, as "Period in 16 days" sets wider in Inter.
                { left: 78, right: 9, top: 46.9 }
          }
          data-cycle-text=""
        >
          {/* Default: kept clear of the chevron (150.5). The OURS states wrap
              to 2 lines ("On hormonal / contraception"), the first line
              short enough to end before it. */}
          <span style={t(12, 15.6, 700, ink.charcoal, kind === "default" ? { maxWidth: 72.5, ...oneLine } : clamp(2))}>{title}</span>
          {lines.length > 0 && (
            <span className="flex flex-col" style={{ marginTop: 3, ...t(10, 13, 600, ink.widget) }}>
              {lines.map((l, i) => (
                <span key={i} style={kind === "unavailable" ? undefined : oneLine}>
                  {l}
                </span>
              ))}
            </span>
          )}
        </div>
      );
    }
  }

  // ---- large: title, strip, bottom row ---------------------------------------
  let largeBody: React.ReactNode = null;
  if (widgetState === "ready" && large) {
    const phaseTitle = phase === "menstrual" ? PHASE_LABEL.menstrual : `${PHASE_LABEL[phase]} phase`;
    let title = "";
    if (kind === "nsu") title = "Set up cycle tracking";
    else if (kind === "default") title = phaseTitle;
    else if (kind === "period") title = `Period · Day ${day}`;
    else if (kind === "recovery") title = phase === "unavailable" ? PHASE_LABEL.unavailable : phaseTitle;
    else if (kind === "unavailable") title = "Not enough data yet";
    else if (kind === "hormonal") title = PHASE_LABEL.hormonal_contraception;
    else if (kind === "pregnant") title = pregWeek !== null ? `Pregnant · week ${pregWeek}` : PHASE_LABEL.pregnant;

    // The Monday-first strip (cycleLogs + nextPeriodFrom/To).
    const showStrip = kind !== "nsu" && kind !== "pregnant";
    const lightDefault = kind === "default" && !dark;
    const letterLine = lightDefault ? 11.1 : 8.5;
    const dotTop = lightDefault ? 90.9 : 88.4;
    const week = mondayFirstWeek(today);
    const predictedTo = p?.nextPeriodTo ?? p?.nextPeriodFrom ?? null;
    const strip = showStrip && (
      <div aria-hidden data-cycle-strip="">
        {week.map((d, i) => {
          const log = cycleLogs.find((l) => l.date === d);
          const bled = !!log && (log.isPeriod || (kind === "hormonal" && !!log.flow && log.flow !== "none"));
          const logged = kind !== "recovery" && bled;
          const predicted =
            !logged &&
            d > today &&
            (kind === "default" || kind === "period") &&
            ((nextFrom !== null && predictedTo !== null && d >= nextFrom && d <= predictedTo) ||
              (kind === "period" && periodEnd !== null && d <= periodEnd));
          const isToday = d === today;
          const x = 104 + 21 * i;
          return (
            <React.Fragment key={d}>
              <span
                className="absolute text-center"
                data-cycle-letter={isToday ? "today" : ""}
                style={{ left: x, top: 75.9, width: 14, ...t(8.5, letterLine, isToday ? 700 : 600, isToday ? ink.charcoal : ink.faint) }}
              >
                {DAY_LETTERS[i]}
              </span>
              <span
                className="absolute rounded-full"
                data-cycle-dot={logged ? "logged" : predicted ? "predicted" : "day"}
                style={{
                  left: x,
                  top: dotTop,
                  width: 14,
                  height: 14,
                  boxSizing: "border-box",
                  background: logged ? ink.main : predicted ? "transparent" : isToday && !dark ? "#FFFFFF" : isToday ? "transparent" : dark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.9)",
                  border: isToday ? `1px solid ${ink.charcoal}` : undefined,
                }}
              >
                {predicted && !isToday && (
                  <svg width={14} height={14} viewBox="0 0 14 14" className="absolute inset-0">
                    <circle cx={7} cy={7} r={6.5} fill="none" stroke={dark ? "#E8A9BF" : "#B8607F"} strokeWidth={1} strokeDasharray="2 1.9" />
                  </svg>
                )}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    );

    // Bottom row (16, 118.3, h 17.5): context + Estimate tag + "+ Log".
    let bottom: string | null = null;
    let estimate = false;
    if (kind === "default" && nextFrom) {
      bottom = `Next period · ${shortDate(nextFrom)}`;
      estimate = true;
    } else if (kind === "period") {
      if (periodEnd && periodEnd >= today) bottom = `Period likely ends · ${shortDate(periodEnd)}`;
      else if (nextFrom) bottom = `Next period · ${shortDate(nextFrom)}`;
      estimate = bottom !== null;
    } else if (kind === "recovery") bottom = "Countdown hidden";
    else if (kind === "unavailable") bottom = "Log 2 periods for an estimate";
    else if (kind === "hormonal") bottom = "No period estimate while on hormonal contraception";
    else if (kind === "pregnant" && trimester) bottom = `Trimester ${trimester}`;
    const canLog = kind !== "nsu" && kind !== "pregnant";

    largeBody = (
      <>
        <p className="absolute" data-cycle-title="" style={{ left: 104, top: 51, width: 238, ...t(13, 16.9, 700, ink.charcoal), ...oneLine }}>
          {title}
        </p>
        {kind === "nsu" && (
          <p className="absolute" style={{ left: 104, top: 75.9, width: 220, ...t(11, 15.4, 500, ink.soft), ...clamp(2) }}>
            Add your last period and usual cycle length.
          </p>
        )}
        {strip}
        <div className="absolute flex items-center" data-cycle-bottom="" style={{ left: 16, right: 16, top: 118.3, height: 17.5, gap: 6 }}>
          {bottom && (
            <span className="min-w-0" style={{ ...t(10.5, 13.7, 600, ink.soft), ...oneLine }}>
              {bottom}
            </span>
          )}
          {estimate && (
            <span
              className="shrink-0 rounded-full"
              data-cycle-estimate=""
              style={{ padding: "4px 8px", background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.85)", ...t(9.5, 9.5, 700, ink.soft), whiteSpace: "nowrap" }}
            >
              Estimate
            </span>
          )}
        </div>
        {kind === "nsu" && (
          <span className="absolute" style={{ right: 16, top: 119.9, ...t(11, 14.3, 700, actionInk), whiteSpace: "nowrap" }}>
            Set up ›
          </span>
        )}
        {canLog && (
          // "+ Log" (314.1, 119.9, 11/14.3 700) inside a 44 x 44 hit area
          // centred on the text; right-aligned at 342.
          <button
            type="button"
            data-cycle-log=""
            tabIndex={editMode ? -1 : 0}
            onClick={(e) => {
              e.stopPropagation();
              if (!editMode) setLogOpen(true);
            }}
            onKeyDown={stop}
            className="tap absolute flex items-center justify-end"
            style={{ left: 306.05, top: 105.05, width: 44, height: 44, paddingRight: 8.05, pointerEvents: "auto", ...t(11, 14.3, 700, actionInk), whiteSpace: "nowrap" }}
          >
            + Log
          </button>
        )}
      </>
    );
  }

  // ---- the card --------------------------------------------------------------
  const pattern =
    widgetState !== "ready" ? (large ? heroPatternUrl("cyL", dark) : heroPatternUrl("cyS", dark)) : large ? heroPatternUrl("cyL", dark) : kind === "default" && !dark ? heroPatternUrl("cyS", false) : null;
  const twentyTwo = smallDrawn48 || smallNsu;

  const card = (
    <MetricWidget
      preset="home"
      size={size}
      metric="cycle"
      icon={twentyTwo ? Glyph13 : Glyph12}
      label="Cycle"
      colors={{ tint: widgetState === "ready" ? tint : "rgb(var(--metric-cycle-tint))", tile, label: widgetState === "ready" ? label : dark ? "#F0B9CB" : ink.widget, icon: glyph, ink: ink.widget }}
      headerGeometry={twentyTwo && widgetState === "ready" ? { tile: 22, tileRadius: 7, gap: 6, labelLine: 13.5 } : undefined}
      headerRight={
        large && widgetState === "ready" && kind !== "nsu" && kind !== "pregnant" ? (
          <span className="shrink-0" data-cycle-legend="" style={{ ...t(9.5, 12.4, 700, ink.faint), whiteSpace: "nowrap" }}>
            Logged · predicted
          </span>
        ) : undefined
      }
      pattern={pattern}
      chevron={false}
      state={widgetState}
      style={{
        height: large ? 150 : 114,
        minHeight: large ? 150 : 114,
        padding: large ? "13px 16px 14px" : "11px 28px 11px 12px",
        overflow: "hidden",
      }}
    >
      {widgetState === "ready" && (
        <div className="absolute inset-0" style={{ zIndex: 1, pointerEvents: "none" }} data-cycle-body={kind}>
          {ring}
          {text}
          {largeBody}
          {showChevron && chevron}
        </div>
      )}
    </MetricWidget>
  );

  const interactive = !editMode && !!activate;
  return (
    <>
      <div
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        aria-label={aria}
        aria-busy={widgetState === "loading" ? true : undefined}
        data-cycle-widget={size}
        data-cycle-state={widgetState === "ready" ? kind : widgetState}
        className={interactive ? "tap rounded-[15px] cursor-pointer" : "rounded-[15px]"}
        onClick={interactive ? activate : undefined}
        onKeyDown={
          interactive
            ? (e) => {
                if (e.target !== e.currentTarget) return;
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activate!();
                }
              }
            : undefined
        }
      >
        {card}
      </div>
      {large && (
        <LogDaySheet
          open={logOpen}
          onClose={() => setLogOpen(false)}
          date={today}
          onSaved={reloadCycle}
          onStartPregnancy={
            pregnancy
              ? undefined
              : () => {
                  setLogOpen(false);
                  navigate("/app/cycle?page=start-pregnancy");
                }
          }
        />
      )}
    </>
  );
};
