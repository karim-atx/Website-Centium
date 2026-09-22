import React from "react";
import { useNavigate } from "react-router-dom";
import type { WidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { LotusGlyph } from "./LotusGlyph";
import { HeartRateEKG } from "../health/HeartRateEKG";
import { QrPattern, DAY_MS, isOneTimePlan } from "../marketplace/GymDetailSheet";
import { healthMetrics, sleepDetail, heartRateDetail } from "../../data/mockHealthData";
import { todaysWorkout } from "../../data/mockWorkouts";
import { sumNutrition, targetsFromGoal } from "../../services/nutrition";
import { BookOpen, KeyRound, Play, AlertCircle, Check } from "lucide-react";
import { mockGyms } from "../../data/mockProfessionals";
import { mondayFirstWeek, DAY_LETTERS, dayLetter } from "../../utils/week";

// Iteration 6.2 "Team" canonical widget library — 11 metrics, small (fixed
// 114×114) and large (fixed 358×150), one flat tinted ground and accent
// colour per metric. This is the single source every widget placement
// draws from; there is no other widget treatment left in the app. See
// CHANGE_MANIFEST.md §4 in scratchpad/design-handoff-main-app for the
// literal per-widget spec this was built from.
//
// A few design values have no real counterpart in this app's data model
// (an hourly step-activity trace, HRV, a weekly *target* workout count, an
// expiry date on a recurring — not one-time — gym membership). Rather than
// invent numbers, those lines are simplified or omitted; each is called
// out at its call site below.

// Handoff §9's "5 glyphs" step-down rule is flagged there as unconfirmed,
// and its own worked examples are inconsistent: "106.4" is given as fitting
// at normal size and "188.8" as overrunning the plate, but both are 5
// characters, so a length check can't actually tell them apart. Measuring
// real rendered width doesn't resolve it either — checked directly against
// this app's Manrope 800 in a canvas: "106.4" (34.9px) and "188.8" (34.4px)
// come out effectively the same width, because this typeface's digits are
// tabular (equal advance width), so no digit-shape difference exists to
// detect. Falling back to the plain length check named in the rule's own
// title ("5 glyphs"), since it's the one reading that still makes the
// step-down fire for the large values it exists for — width-based detection
// would silently never trigger it at all. Flagged for a human decision.

const capsLabel = "font-bold text-[9px] tracking-[.16em] uppercase";
const numeralSmall = "text-[16px] font-extrabold leading-none tracking-[-0.03em] text-charcoal tabular-nums";
const badge = "text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap shrink-0";

// Item 5 (large water widget): builds a smooth, tileable sine-like wave as
// one cubic Bezier per half-period, control points offset by the
// circle/Bezier "kappa" constant (0.5522847) — a close, cheap stand-in for
// a true sine that is exactly periodic, so two copies placed side by side
// tile with no seam for the horizontal drift loop. `y`/`amp` are percents
// of the fill's own height (the SVG's 0..100 viewBox, stretched to the
// fill's actual box via preserveAspectRatio="none"). Returns both the full
// filled-down-to-the-bottom path and just the wavy top edge (used for the
// frontmost layer's specular crest line).
function buildWavePaths(yPercent: number, ampPercent: number, crests: number) {
  const halfPeriods = crests * 2;
  const halfW = 100 / halfPeriods;
  const k = 0.5522847 * halfW;
  let fill = `M0,100 L0,${yPercent.toFixed(2)} `;
  let top = `M0,${yPercent.toFixed(2)} `;
  let x = 0;
  for (let s = 0; s < halfPeriods; s++) {
    const extreme = s % 2 === 0 ? yPercent - ampPercent : yPercent + ampPercent;
    const xEnd = x + halfW;
    const c1x = x + k;
    const c2x = xEnd - k;
    const seg = `C${c1x.toFixed(2)},${extreme.toFixed(2)} ${c2x.toFixed(2)},${extreme.toFixed(2)} ${xEnd.toFixed(2)},${yPercent.toFixed(2)} `;
    fill += seg;
    top += seg;
    x = xEnd;
  }
  fill += "L100,100 Z";
  return { fill, top };
}

// Item 5 literal table, back to front in render order. The table as given
// lists (30,22,46,14,74) and separately calls out the (14/8/2) row as "the
// frontmost layer" — inconsistent with reading the table's own listed order
// as strict back-to-front. Resolved here by trusting the explicit
// "frontmost" callout over positional ordering: (14/8/2) is rendered last
// (front), the rest kept in the table's given order. Flagged in the report.
const WATER_WAVE_LAYERS: Array<{
  y: number;
  amp: number;
  crests: number;
  fillColor: string;
  swell: string;
  drift: string;
  reverse: boolean;
  delay: string;
  front?: boolean;
}> = [
  { y: 30, amp: 9, crests: 2, fillColor: "rgba(23,69,127,0.17)", swell: "8.5s", drift: "9s", reverse: false, delay: "-0.6s" },
  { y: 22, amp: 6, crests: 3, fillColor: "rgba(23,69,127,0.11)", swell: "6.5s", drift: "7s", reverse: true, delay: "-1.63s" },
  { y: 46, amp: 7, crests: 5, fillColor: "rgba(255,255,255,0.13)", swell: "7.5s", drift: "11s", reverse: false, delay: "-2.65s" },
  { y: 74, amp: 6, crests: 4, fillColor: "rgba(255,255,255,0.10)", swell: "9s", drift: "13s", reverse: false, delay: "-3.68s" },
  { y: 14, amp: 8, crests: 2, fillColor: "rgba(255,255,255,0.30)", swell: "5.5s", drift: "5s", reverse: true, delay: "-4.7s", front: true },
];

// Item 5's full replacement for the large water widget: a 5-layer wave
// fill tank (see WATER_WAVE_LAYERS) replacing the old flat horizontal
// progress bar. Split out of the switch's JSX for readability given its
// size. `pct` is the existing fraction (water / waterGoalMl); `glasses` is
// the existing 0–8 rounded count used in the below-goal pill sub-label.
const LargeWaterWidget: React.FC<{ water: number; waterGoalMl: number; pct: number; glasses: number }> = ({
  water,
  waterGoalMl,
  pct,
  glasses,
}) => {
  const pctPercent = pct * 100;
  // Item 5 literal formula: 100% stops 5px short of the 131px-tall fill
  // frame's own top edge; above 100% the fill never rises further.
  const fillHeightPx = (Math.min(100, pctPercent) / 100) * 126;
  const atOrAboveGoal = pctPercent >= 100;
  const overGoal = pctPercent > 100;

  const bodyGradient = atOrAboveGoal
    ? "linear-gradient(180deg, #6FA6EC 0%, #4A85DC 46%, #2C5FAF 100%)"
    : "linear-gradient(180deg, #E4F0FE 0%, #B9D7F8 42%, #7FB0EE 100%)";
  const captionColor = atOrAboveGoal ? "#FFFFFF" : "#3A4351";
  const valueColor = atOrAboveGoal ? "#FFFFFF" : "#000000";
  const toGoColor = atOrAboveGoal ? "#FFFFFF" : "#46505F";
  const pillBg = overGoal ? "#F4D789" : "rgba(143,192,232,.34)";
  const pillTextColor = overGoal ? "#8B5900" : atOrAboveGoal ? "#FFFFFF" : "#26303D";
  const whiteShadow = "0 1px 3px rgba(12,40,82,.45)";
  const textShadow = atOrAboveGoal ? whiteShadow : "none";
  const subLabel = atOrAboveGoal ? "Goal reached!" : `${glasses} of 8 glasses`;

  return (
    <div
      className="relative w-full max-w-[358px] h-[150px] rounded-[15px] overflow-hidden box-border"
      style={{ background: "rgba(143,192,232,.17)" }}
    >
      <style>{`
        @keyframes cent-water-drift { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes cent-water-swell { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
        @keyframes cent-water-slosh { 0% { transform: translateY(6px); } 40% { transform: translateY(-3px); } 70% { transform: translateY(1.5px); } 100% { transform: translateY(0); } }
        @keyframes cent-water-sparkle { 0%, 100% { transform: scale(0.55) rotate(0deg); opacity: 0.45; } 50% { transform: scale(1.15) rotate(45deg); opacity: 1; } }
        .cent-water-anim { animation-timing-function: linear; animation-iteration-count: infinite; }
        .cent-water-slosh-el { animation: cent-water-slosh 1.4s cubic-bezier(.22,1,.36,1); }
        @media (prefers-reduced-motion: reduce) {
          .cent-water-anim { animation-duration: 40s !important; }
          .cent-water-slosh-el { animation: none !important; }
        }
      `}</style>

      {/* Tank: the 131px-tall fill frame the literal fill formula is
          relative to, bottom-anchored and edge-to-edge inside the card. */}
      <div className="absolute left-0 right-0 bottom-0 overflow-hidden" style={{ height: 131 }}>
        <div
          key={water}
          className="absolute left-0 right-0 bottom-0 cent-water-slosh-el"
          style={{
            height: fillHeightPx,
            transition: "height 1.1s cubic-bezier(.22,1,.36,1)",
            background: bodyGradient,
            willChange: "transform",
          }}
        >
          {/* waterline highlight */}
          <div
            className="absolute left-0 right-0 top-0"
            style={{ height: 22, background: "linear-gradient(to bottom, rgba(255,255,255,.42), transparent)" }}
          />

          {WATER_WAVE_LAYERS.map((w, i) => {
            const { fill, top } = buildWavePaths(w.y, w.amp, w.crests);
            return (
              <div key={i} className="absolute inset-0 overflow-hidden">
                <div
                  className="absolute left-0 top-0 cent-water-anim"
                  style={{
                    width: "200%",
                    height: "100%",
                    animationName: "cent-water-drift",
                    animationDuration: w.drift,
                    animationDirection: w.reverse ? "reverse" : "normal",
                    willChange: "transform",
                  }}
                >
                  {[0, 1].map((tile) => (
                    <div
                      key={tile}
                      className="absolute top-0 cent-water-anim"
                      style={{
                        left: `${tile * 50}%`,
                        width: "50%",
                        height: "100%",
                        animationName: "cent-water-swell",
                        animationDuration: w.swell,
                        animationDelay: w.delay,
                        animationTimingFunction: "ease-in-out",
                        willChange: "transform",
                      }}
                    >
                      <svg viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%" style={{ display: "block" }}>
                        <path d={fill} fill={w.fillColor} />
                        {w.front && (
                          <path d={top} fill="none" stroke="rgba(255,255,255,.95)" strokeWidth={1.7} vectorEffect="non-scaling-stroke" />
                        )}
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* depth cues: inset shadow left/right/bottom */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow:
                "inset 13px 0 20px -13px rgba(11,40,80,.42), inset -13px 0 20px -13px rgba(11,40,80,.42), inset 0 -18px 26px -12px rgba(11,40,80,.5)",
            }}
          />
        </div>
      </div>

      {/* content overlay */}
      <div className="relative z-10 flex flex-col h-full p-3.5 box-border">
        <div className="flex items-center justify-between gap-3">
          <p className={capsLabel} style={{ color: captionColor, textShadow }}>
            Water
          </p>
          <span className={badge} style={{ background: pillBg, color: pillTextColor, textShadow: overGoal ? "none" : textShadow }}>
            {subLabel}
          </span>
        </div>
        <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
          <div className="flex items-baseline justify-between gap-2.5">
            <span className="text-[26px] font-extrabold leading-none tracking-[-0.035em] tabular-nums" style={{ color: valueColor, textShadow }}>
              {(water / 1000).toFixed(1)} L
            </span>
            <span className="text-[10px]" style={{ color: toGoColor, textShadow }}>
              {Math.max(0, (waterGoalMl - water) / 1000).toFixed(1)} L to go
            </span>
          </div>
        </div>
      </div>

      {/* sparkles — over-goal only, positioned inside the widget frame */}
      {overGoal && (
        <>
          <span
            className="absolute cent-water-sparkle-el"
            style={{
              right: 96,
              top: 16,
              width: 13,
              height: 13,
              animation: "cent-water-sparkle 1.7s ease-in-out infinite",
              animationDelay: "0s",
              filter: "drop-shadow(0 1px 1.5px rgba(120,76,0,.45))",
              willChange: "transform",
            }}
          >
            <svg viewBox="0 0 24 24" width={13} height={13}>
              <path d="M12 0C12 6 14 10 24 12C14 14 12 18 12 24C12 18 10 14 0 12C10 10 12 6 12 0Z" fill="#E8A21B" />
            </svg>
          </span>
          <span
            className="absolute cent-water-sparkle-el"
            style={{
              right: 88,
              top: 34,
              width: 9,
              height: 9,
              animation: "cent-water-sparkle 1.7s ease-in-out infinite",
              animationDelay: "0.55s",
              filter: "drop-shadow(0 1px 1.5px rgba(120,76,0,.45))",
              willChange: "transform",
            }}
          >
            <svg viewBox="0 0 24 24" width={9} height={9}>
              <path d="M12 0C12 6 14 10 24 12C14 14 12 18 12 24C12 18 10 14 0 12C10 10 12 6 12 0Z" fill="#F0B63C" />
            </svg>
          </span>
        </>
      )}
    </div>
  );
};

export const HomeWidget: React.FC<{
  widget: WidgetConfig;
  onWaterClick?: () => void;
  onGymPassesClick?: () => void;
  // Handoff §9: the small Weight icon renders at 66px normally, 62px when
  // this same tile is shown inside an edit-mode widget board — this is the
  // WidgetBoard's own `editMode` boolean (the only existing signal that
  // already distinguishes "normal dashboard" from "edit-mode board" for a
  // tile), threaded through here since HomeWidget previously had no notion
  // of edit mode at all.
  editMode?: boolean;
}> = ({ widget, onWaterClick, onGymPassesClick, editMode = false }) => {
  const navigate = useNavigate();
  const { metricValues, water, waterGoalMl, stepsGoal, foodLog, nutritionGoal, workoutLog, habits, journalEntries, gymPurchases, today, selectedDate } =
    useApp();
  const isLarge = widget.size === "large";

  const stepsMeta = healthMetrics.find((m) => m.type === "steps")!;
  const weeklyStepsAvg = Math.round(stepsMeta.history.reduce((s, h) => s + h.value, 0) / stepsMeta.history.length);
  const stepsMax = Math.max(...stepsMeta.history.map((h) => h.value), stepsGoal);
  // No stride-length preference exists in this app; 0.762m is the generic
  // average-adult-stride figure fitness trackers default to absent one.
  const stepsKm = ((metricValues.steps * 0.762) / 1000).toFixed(1);

  const weightMeta = healthMetrics.find((m) => m.type === "weight")!;
  const weightValues = weightMeta.history.map((h) => h.value);
  const weightMin = Math.min(...weightValues);
  const weightMax = Math.max(...weightValues);

  const sleepMeta = healthMetrics.find((m) => m.type === "sleep")!;
  const sleepStages = [
    { label: "Awake", min: sleepDetail.awakeMin, color: "rgb(var(--c-teal-dark))" },
    { label: "REM", min: sleepDetail.remMin, color: "rgb(var(--c-berry))" },
    { label: "Light", min: sleepDetail.lightMin, color: "rgb(var(--c-sky))" },
    { label: "Deep", min: sleepDetail.deepMin, color: "rgb(var(--c-team-lavender-deep))" },
  ];
  const sleepTotalMin = sleepStages.reduce((s, x) => s + x.min, 0) || 1;
  const fmtMin = (m: number) => `${Math.floor(m / 60)}h${(m % 60).toString().padStart(2, "0")}m`;

  const totals = sumNutrition(foodLog.filter((e) => e.date === selectedDate));
  const targets = targetsFromGoal(nutritionGoal);
  const todaysWorkoutLog = workoutLog[workoutLog.length - 1];

  const week = mondayFirstWeek(today);
  const workoutDaysThisWeek = week.filter((d) => d <= today && workoutLog.some((w) => w.date === d && w.completed));

  const journalDoneToday = journalEntries.some((e) => e.date === today);
  const journalWeek = week.map((d) => journalEntries.some((e) => e.date === d));
  // No dedicated "journal streak" metric exists — derived here the same way
  // the app's own auto-streaks are, by counting consecutive days with an
  // entry, walking back from today.
  let journalStreak = 0;
  {
    const cursor = new Date(`${today}T00:00:00`);
    while (journalEntries.some((e) => e.date === cursor.toISOString().slice(0, 10))) {
      journalStreak++;
      cursor.setDate(cursor.getDate() - 1);
    }
  }
  const journalWordTotal = journalEntries.reduce((s, e) => s + e.text.trim().split(/\s+/).filter(Boolean).length, 0);
  const latestEntry = journalEntries[journalEntries.length - 1];

  const wrap = (onClick: () => void, content: React.ReactNode) => (
    <div onClick={onClick} role="button" tabIndex={0} className="tap cursor-pointer h-full">
      {content}
    </div>
  );

  // Small: 114×114, padding 11px 12px. Large: 358×150, padding 14px 16px.
  const shell = (bg: string, content: React.ReactNode) =>
    isLarge ? (
      <div className="w-full max-w-[358px] h-[150px] box-border rounded-[15px] flex flex-col p-3.5" style={{ background: bg }}>
        {content}
      </div>
    ) : (
      <div className="w-[114px] h-[114px] box-border rounded-[15px] flex flex-col px-3 py-[11px]" style={{ background: bg }}>
        {content}
      </div>
    );

  switch (widget.type) {
    // ---------------------------------------------------------------- Steps
    case "steps": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "steps" } });
      const pct = Math.round((metricValues.steps / stepsGoal) * 100);
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(162,200,194,.2)",
            <>
              <p className={`${capsLabel} text-team-teal-ink/[0.72]`}>Steps</p>
              <p className={`${numeralSmall} mt-[5px]`}>{metricValues.steps.toLocaleString()}</p>
              <div className="flex items-end gap-[2px] h-[26px] mt-[9px]">
                {stepsMeta.history.map((h, i) => {
                  const isToday = i === stepsMeta.history.length - 1;
                  return (
                    <div
                      key={i}
                      className="flex-1 rounded-[1px]"
                      style={{
                        height: `${Math.max(8, (h.value / stepsMax) * 100)}%`,
                        background: isToday ? "rgb(var(--c-team-teal-deep))" : "rgba(111,153,147,.34)",
                      }}
                    />
                  );
                })}
              </div>
              <div className="flex gap-[2px] mt-1">
                {stepsMeta.history.map((h, i) => {
                  const isToday = i === stepsMeta.history.length - 1;
                  return (
                    <span
                      key={i}
                      className={`flex-1 text-center text-[7.5px] ${isToday ? "font-extrabold text-team-teal-ink" : "font-semibold text-team-teal-ink/50"}`}
                    >
                      {dayLetter(h.date)}
                    </span>
                  );
                })}
              </div>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgba(162,200,194,.2)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-team-teal-ink/[0.72]`}>Steps</p>
              <span className={`${badge} text-team-teal-ink bg-teal/[0.42]`}>{Math.min(999, pct)}% of goal</span>
            </div>
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[26px] font-extrabold leading-none tracking-[-0.035em] text-charcoal tabular-nums">
                  {metricValues.steps.toLocaleString()}
                </span>
                <span className="text-[10px] text-team-teal-ink/[0.72]">
                  of {stepsGoal.toLocaleString()} · {stepsKm} km
                </span>
              </div>
              <div>
                <div className="relative h-[9px] rounded-[5px] bg-teal-dark/20 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-[5px]"
                    style={{ width: `${Math.min(100, pct)}%`, background: "linear-gradient(90deg,#A9CFC9,#6F9993)" }}
                  />
                </div>
                <div className="flex justify-between mt-[5px] text-[8px] font-semibold text-team-teal-ink/[0.72]">
                  <span>0</span>
                  <span>Weekly avg {weeklyStepsAvg.toLocaleString()}</span>
                  <span>{stepsGoal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </>
        )
      );
    }

    // ---------------------------------------------------------------- Water
    case "water": {
      const pct = water / waterGoalMl;
      const glasses = Math.round(Math.max(0, Math.min(1, pct)) * 8);
      const onClick = onWaterClick ?? (() => navigate("/app/health"));
      if (!isLarge) {
        // Handoff §8: traced reference bottle replaces the old cup glyph
        // and its `w-cup-clip` clip path (removed below, not left dead).
        // pct is clamped 0–100 and mapped to the fill rect's top edge via
        // the handoff's literal formula: y = 78.5 − 56 × (pct/100), so 0%
        // → y78.5, 50% → y50.5, 100% → y22.5.
        const bottlePct = Math.max(0, Math.min(100, pct * 100));
        const bottleFillY = 78.5 - 56 * (bottlePct / 100);
        return wrap(
          onClick,
          shell(
            "rgba(143,192,232,.17)",
            <>
              <p className={`${capsLabel} text-team-blue-ink/[0.72]`}>Water</p>
              <div className="flex-1 flex items-center justify-center gap-2.5 min-h-0">
                <div className="min-w-0 text-right">
                  <p className="text-[16px] font-extrabold tracking-[-0.03em] text-charcoal">{(water / 1000).toFixed(1)} L</p>
                  <p className="mt-[5px] text-[9px] text-team-blue-ink">of {(waterGoalMl / 1000).toFixed(1)} L</p>
                </div>
                <svg viewBox="0 0 40 80" width={38} height={76} style={{ display: "block", flex: "none", overflow: "visible" }}>
                  <defs>
                    <clipPath id="w-bottle-clip">
                      <path d="M13.2 21.2 A9.0 9.0 0 0 0 0.75 27.1 V75.3 A4.0 4.0 0 0 0 4.75 79.3 H31.4 A4.0 4.0 0 0 0 35.4 75.3 V27.1 A9.0 9.0 0 0 0 22.9 21.2 Z" />
                    </clipPath>
                  </defs>
                  {/* Fill is clipped to the body path only (never the collar
                      or cap) and animates on `y`/`height`, matching
                      WaterFillContainer's 700ms timing (that component uses
                      Tailwind's `duration-700 ease-out`; the handoff's own
                      literal value for this bottle is the slightly
                      different cubic-bezier(0.16,1,0.3,1) below — used here
                      verbatim since it's given as an explicit literal). */}
                  <g clipPath="url(#w-bottle-clip)">
                    <rect
                      x={0}
                      width={40}
                      fill="#A2D6FA"
                      style={{
                        y: bottleFillY,
                        height: 80 - bottleFillY,
                        transition: "y 700ms cubic-bezier(0.16, 1, 0.3, 1), height 700ms cubic-bezier(0.16, 1, 0.3, 1)",
                      }}
                    />
                  </g>
                  <path
                    d="M13.2 21.2 A9.0 9.0 0 0 0 0.75 27.1 V75.3 A4.0 4.0 0 0 0 4.75 79.3 H31.4 A4.0 4.0 0 0 0 35.4 75.3 V27.1 A9.0 9.0 0 0 0 22.9 21.2 Z"
                    fill="none"
                    stroke="#4E85B6"
                    strokeWidth={1.5}
                    strokeLinejoin="round"
                  />
                  <circle cx={32.6} cy={8.4} r={6.5} fill="none" stroke="#4E85B6" strokeWidth={1.5} />
                  <rect x={6.1} y={14.6} width={23.4} height={5.4} rx={1.6} fill="#A2D5FA" stroke="#4E85B6" strokeWidth={1.5} />
                  <rect x={9.2} y={4.2} width={14.6} height={10.6} rx={1.6} fill="#A2D5FA" stroke="#4E85B6" strokeWidth={1.5} />
                  {/* Ticks paint over the fill (declared after it). */}
                  {[33.6, 43.0, 51.2, 60.0, 68.9].map((ty) => (
                    <path key={ty} d={`M33.9 ${ty} H35.35`} stroke="#4E85B6" strokeWidth={2.2} strokeLinecap="round" />
                  ))}
                </svg>
              </div>
            </>
          )
        );
      }
      // Item 5: the old flat two-stop-gradient horizontal progress bar (and
      // its past-midday nudge banner, not called for anywhere in the item 5
      // final-state spec and with no room left for it in the new tank
      // layout) is fully replaced by LargeWaterWidget's 5-layer wave fill —
      // see the component above for the literal per-layer geometry.
      return wrap(onClick, <LargeWaterWidget water={water} waterGoalMl={waterGoalMl} pct={pct} glasses={glasses} />);
    }

    // ---------------------------------------------------------------- Sleep
    case "sleep": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "sleep" } });
      const h = Math.floor(sleepMeta.current);
      const m = Math.round((sleepMeta.current % 1) * 60);
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(174,161,220,.13)",
            <>
              <p className={`${capsLabel} text-primary-deep-text/[0.65]`}>Sleep</p>
              <p className="mt-[5px] text-[16px] font-extrabold tracking-[-0.03em] text-charcoal">
                {h}h{m.toString().padStart(2, "0")}
              </p>
              <div className="flex-1 flex items-center min-h-0 mt-2">
                <svg viewBox="0 0 100 26" width="100%" height={26} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
                  <path
                    d="M0 22 H14 V13 H26 V4 H34 V13 H48 V22 H60 V13 H72 V4 H80 V13 H92 V20 H100"
                    fill="none"
                    stroke="rgb(var(--c-team-lavender-deep))"
                    strokeWidth={1.7}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="mt-[6px] text-[9px] text-primary-deep-text">
                {sleepMeta.trend >= 0 ? "+" : ""}
                {sleepMeta.trend}h avg
              </p>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgba(174,161,220,.16)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-primary-deep-text/[0.68]`}>Sleep</p>
              <span className={`${badge} text-primary-deep-text bg-team-lavender/30`}>Score {sleepDetail.score}</span>
            </div>
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[24px] font-extrabold leading-none tracking-[-0.035em] text-charcoal tabular-nums">
                  {h}h {m.toString().padStart(2, "0")}m
                </span>
                <span className="text-[10px] whitespace-nowrap text-primary-deep-text/[0.68]">
                  {sleepMeta.trend >= 0 ? "↑" : "↓"} {Math.abs(sleepMeta.trend)} h vs last wk
                </span>
              </div>
              <div className="flex gap-[7px] mt-0.5">
                {sleepStages.map((s) => (
                  <span key={s.label} className="flex-1 rounded-[9px] bg-white/55 py-[5px] text-center">
                    <span className="block text-[11px] font-extrabold text-charcoal tabular-nums">{fmtMin(s.min)}</span>
                    <span className="block mt-[2px] text-[7.5px] font-semibold" style={{ color: s.color }}>
                      {s.label}
                    </span>
                  </span>
                ))}
              </div>
              <div>
                <span className="flex h-[7px] rounded-[3px] overflow-hidden mt-[3px]">
                  {sleepStages.map((s) => (
                    <span key={s.label} style={{ width: `${(s.min / sleepTotalMin) * 100}%`, background: s.color }} />
                  ))}
                </span>
                <div className="flex items-center gap-[11px] mt-2">
                  {sleepStages.map((s) => (
                    <span key={s.label} className="flex items-center gap-1">
                      <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: s.color }} />
                      <span className="text-[7.5px] font-semibold text-primary-deep-text/[0.68]">{s.label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </>
        )
      );
    }

    // -------------------------------------------------------------- Workout
    case "workout": {
      const done = !!todaysWorkoutLog?.completed;
      const onClick = () => navigate("/app/workout");
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(162,200,194,.16)",
            <>
              <p className={`${capsLabel} text-team-teal-ink/[0.72]`}>Workout</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="flex flex-col items-center text-center leading-[1.25]">
                  <span className={`${badge} text-team-teal-ink bg-teal/[0.42]`}>{done ? "Completed" : "Up next"}</span>
                  <span className="mt-1.5 text-[15px] font-extrabold tracking-[-0.02em] text-charcoal">{todaysWorkout.name}</span>
                  <span className="mt-[5px] text-[8.5px] font-semibold text-team-teal-ink/[0.72]">
                    {todaysWorkout.exercises.length} exercises
                  </span>
                </span>
              </div>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgba(162,200,194,.16)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-team-teal-ink/[0.72]`}>Workout</p>
              <span className={`${badge} text-team-teal-ink bg-teal/[0.42]`}>{done ? "Completed" : "Up next"}</span>
            </div>
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[20px] font-extrabold tracking-[-0.03em] text-charcoal truncate">{todaysWorkout.name}</p>
                  <p className="mt-1 text-[10px] text-team-teal-ink/[0.72]">
                    {todaysWorkout.exercises.length} exercises · ~{todaysWorkout.durationMin} min
                  </p>
                </div>
                <span className="w-[38px] h-[38px] rounded-full bg-teal-dark flex items-center justify-center shrink-0">
                  <Play size={15} className="text-white" fill="currentColor" />
                </span>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-bold tracking-[.12em] uppercase text-team-teal-ink/[0.72]">This week</span>
                  <span className="text-[9.5px] font-extrabold text-team-teal-ink">{workoutDaysThisWeek.length} of 7</span>
                </div>
                <span className="flex gap-1 w-full">
                  {week.map((d) => (
                    <span
                      key={d}
                      className="flex-1 h-1.5 rounded-[3px]"
                      style={{ background: workoutDaysThisWeek.includes(d) ? "rgb(var(--c-teal-dark))" : "rgba(111,153,147,.24)" }}
                    />
                  ))}
                </span>
              </div>
            </div>
          </>
        )
      );
    }

    // ----------------------------------------------------------- Nutrition
    case "nutrition": {
      const onClick = () => navigate("/app/food");
      const totalGoal = targets.protein + targets.carbs + targets.fat || 1;
      const circumference = 2 * Math.PI * 34;
      const macros = [
        { label: "Protein", color: "rgb(var(--c-team-lavender-deep))", consumed: totals.protein, target: targets.protein },
        { label: "Carbs", color: "rgb(var(--c-team-lavender))", consumed: totals.carbs, target: targets.carbs },
        { label: "Fat", color: "rgb(var(--c-teal))", consumed: totals.fat, target: targets.fat },
      ];
      let rotAcc = -90;
      const arcs = macros.map((m) => {
        const arc = (m.consumed / totalGoal) * circumference;
        const rotate = rotAcc;
        rotAcc += (arc / circumference) * 360;
        return { ...m, arc, rotate };
      });
      const kcalLeft = Math.max(0, Math.round(targets.calories - totals.calories));
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(174,161,220,.16)",
            <>
              <p className={`${capsLabel} text-primary-deep-text/[0.68]`}>Food</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="relative w-[76px] h-[76px] block shrink-0">
                  <svg width={76} height={76}>
                    <circle cx="38" cy="38" r="34" fill="none" stroke="rgba(36,31,27,.07)" strokeWidth={8} />
                    {arcs.map((a) => (
                      <circle
                        key={a.label}
                        cx="38"
                        cy="38"
                        r="34"
                        fill="none"
                        stroke={a.color}
                        strokeWidth={8}
                        strokeDasharray={`${a.arc} ${circumference - a.arc}`}
                        transform={`rotate(${a.rotate} 38 38)`}
                      />
                    ))}
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
                    <span className="text-[15px] font-extrabold tracking-[-0.03em] text-charcoal tabular-nums">
                      {Math.round(totals.calories)}
                    </span>
                    <span className="mt-[2px] text-[8px] font-semibold text-charcoal-tertiary">kcal</span>
                  </span>
                </span>
              </div>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgba(174,161,220,.16)",
          <>
            <div className="flex items-center justify-between gap-2.5">
              <p className={`${capsLabel} text-primary-deep-text/[0.68]`}>Food</p>
              <span className="flex-1 flex items-baseline justify-end gap-1.5 min-w-0">
                <span className="text-[22px] font-extrabold leading-none tracking-[-0.035em] text-charcoal tabular-nums">
                  {Math.round(totals.calories)}
                </span>
                <span className="text-[9.5px] whitespace-nowrap text-primary-deep-text/[0.68]">of {targets.calories} kcal</span>
              </span>
              <span className={`${badge} text-primary-deep-text bg-team-lavender/30`}>{kcalLeft} kcal left</span>
            </div>
            <div className="flex-1 flex flex-col justify-evenly min-h-0 mt-2">
              {macros.map((m) => (
                <div key={m.label} className="flex items-center gap-[9px]">
                  <span className="flex items-center gap-[5px] w-[62px] shrink-0 text-[10px] font-bold text-charcoal">
                    <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: m.color }} />
                    {m.label}
                  </span>
                  <span className="flex-1 min-w-0 block h-[13px] rounded-[5px] bg-charcoal/[0.07] overflow-hidden">
                    <span
                      className="block h-full rounded-[5px]"
                      style={{ width: `${Math.min(100, (m.consumed / (m.target || 1)) * 100)}%`, background: m.color }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-right text-[9px] text-primary-deep-text/[0.68] tabular-nums">
                    {Math.round(m.consumed)} / {Math.round(m.target)}g
                  </span>
                </div>
              ))}
            </div>
          </>
        )
      );
    }

    // --------------------------------------------------------------- Weight
    case "weight": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "weight" } });
      if (!isLarge) {
        // Handoff §9: the scale glyph is replaced, and the value/unit that
        // used to render BENEATH it now render inside it instead — no
        // separate text block below the icon anymore. Icon is 66px
        // normally, 62px inside an edit-mode widget board (the `editMode`
        // prop threaded in from WidgetBoard), bottom-aligned in the
        // content area.
        const iconSize = editMode ? 62 : 66;
        const weightStr = String(metricValues.weight);
        const weightOverflows = weightStr.length === 5;
        return wrap(
          onClick,
          shell(
            "rgba(174,161,220,.11)",
            <>
              <p className={`${capsLabel} text-primary-deep-text/[0.68]`}>Weight</p>
              <div className="flex-1 flex items-end justify-center min-h-0">
                <div style={{ position: "relative", width: iconSize, height: iconSize, flex: "none" }}>
                  <svg
                    viewBox="0 0 64 64"
                    width={iconSize}
                    height={iconSize}
                    fill="none"
                    stroke="#7567B7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ display: "block" }}
                  >
                    <rect x={1.2} y={1.2} width={61.6} height={61.6} rx={7.2} strokeWidth={2.4} />
                    <path
                      d="M13.4 14.6 A27.3 27.3 0 0 1 50.4 14.6 L43.2 26.3 A27.8 27.8 0 0 0 20.6 26.3 Z"
                      strokeWidth={2.7}
                    />
                    {/* Item 4: the three dial "feet" pins normalized to
                        literal lengths — outer pins 4.0 units, centre pin
                        2.8 units (trimmed so it doesn't overshoot the
                        dial's crest it sits on). Previously uneven
                        (~4.9 / ~3.7 / ~6.0) from an approximate
                        reproduction; start points kept fixed on the arc,
                        only the length (endpoint) changed. */}
                    <path d="M22.2 10.2 L23.59 13.95" strokeWidth={2.2} />
                    <path d="M31.8 9.6 V12.4" strokeWidth={2.2} />
                    <path d="M41.7 10.2 L40.57 14.04" strokeWidth={2.2} />
                    <path d="M35.6 14.6 L29.8 22.9" strokeWidth={2.7} />
                  </svg>
                  {/* Item 4: the numeric value must be charcoal, not
                      accent-colored — the unit text and glyph/icon below
                      keep the existing #7567B7 accent. */}
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "53.1%",
                      textAlign: "center",
                      color: "#241F1B",
                      fontWeight: 800,
                      lineHeight: 1,
                      fontSize: iconSize * (weightOverflows ? 0.176 : 0.197),
                    }}
                  >
                    {weightStr}
                  </span>
                  <span
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "73%",
                      textAlign: "center",
                      color: "#7567B7",
                      fontWeight: 800,
                      lineHeight: 1,
                      fontSize: iconSize * 0.119,
                    }}
                  >
                    kg
                  </span>
                </div>
              </div>
            </>
          )
        );
      }
      const vbW = 230,
        vbH = 78,
        padX = 14,
        topY = 19,
        botY = 66;
      const pts = weightValues.map((v, i) => {
        const x = padX + (i * (vbW - 2 * padX)) / (weightValues.length - 1);
        const y = weightMax === weightMin ? (topY + botY) / 2 : botY - ((v - weightMin) / (weightMax - weightMin)) * (botY - topY);
        return { x, y, v, date: weightMeta.history[i].date };
      });
      return wrap(
        onClick,
        shell(
          "rgba(174,161,220,.11)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-primary-deep-text/[0.68]`}>Weight</p>
              <span className={`${badge} text-primary-deep-text bg-team-lavender/30`}>
                {weightMeta.trend <= 0 ? "↓" : "↑"} {Math.abs(weightMeta.trend)} kg this week
              </span>
            </div>
            <div className="flex-1 flex min-h-0 mt-[9px]">
              <div className="flex-1 flex items-center gap-3.5 min-w-0">
                <div className="shrink-0">
                  <p className="flex items-baseline gap-[3px]">
                    <span className="text-[26px] font-extrabold leading-none tracking-[-0.035em] text-charcoal tabular-nums">
                      {metricValues.weight}
                    </span>
                    <span className="text-[11px] font-bold text-primary-deep-text/[0.68]">kg</span>
                  </p>
                  {nutritionGoal.weightGoal !== "maintain" && nutritionGoal.desiredWeightConfirmed && nutritionGoal.desiredWeightKg && (
                    <p className="mt-[5px] text-[9.5px] text-primary-deep-text/[0.68]">Goal {nutritionGoal.desiredWeightKg} kg</p>
                  )}
                </div>
                <svg viewBox={`0 0 ${vbW} ${vbH}`} width={vbW} height={vbH} style={{ display: "block", flex: "none" }}>
                  <polyline
                    points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
                    fill="none"
                    stroke="rgb(var(--c-team-lavender-deep))"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {pts.map((p, i) => (
                    <React.Fragment key={i}>
                      <circle cx={p.x} cy={p.y} r={2.6} fill="rgb(var(--c-team-lavender-deep))" />
                      <text
                        x={p.x}
                        y={p.y - 7}
                        textAnchor="middle"
                        fontFamily="Manrope"
                        fontSize={8}
                        fontWeight={700}
                        fill={i === pts.length - 1 ? "rgb(var(--c-primary-deep-text))" : "rgba(95,80,147,.6)"}
                      >
                        {p.v.toFixed(1)}
                      </text>
                      <text x={p.x} y={76} textAnchor="middle" fontFamily="Manrope" fontSize={7.5} fontWeight={600} fill="rgba(95,80,147,.5)">
                        {dayLetter(p.date)}
                      </text>
                    </React.Fragment>
                  ))}
                </svg>
              </div>
            </div>
          </>
        )
      );
    }

    // --------------------------------------------------------------- Habits
    case "habits": {
      const done = habits.filter((h) => h.done).length;
      const onClick = () => navigate("/app/mind");
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(174,161,220,.16)",
            <>
              <p className={`${capsLabel} text-primary-deep-text/[0.68]`}>Habits</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="flex flex-col items-center gap-2">
                  <svg viewBox="0 0 24 24" width={40} height={40} style={{ display: "block", flex: "none" }}>
                    <defs>
                      <linearGradient id="team-habit-check" x1="0" y1="0" x2="1" y2="0">
                        <stop offset={`${habits.length ? (done / habits.length) * 100 : 0}%`} stopColor="rgb(var(--c-team-lavender-deep))" />
                        <stop offset={`${habits.length ? (done / habits.length) * 100 : 0}%`} stopColor="rgba(125,107,181,.22)" />
                      </linearGradient>
                    </defs>
                    <path d="M3.6 12.9 9.1 18.4 20.4 6.2" fill="none" stroke="url(#team-habit-check)" strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[15px] font-extrabold tracking-[-0.02em] text-charcoal tabular-nums">
                    {done}/{habits.length}
                  </span>
                </span>
              </div>
            </>
          )
        );
      }
      const shown = habits.slice(0, 6);
      const more = habits.length > 6;
      return wrap(
        onClick,
        shell(
          "rgba(174,161,220,.16)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-primary-deep-text/[0.68]`}>Habits</p>
              <span className={`${badge} text-primary-deep-text bg-team-lavender/30`}>
                {done} of {habits.length} today
              </span>
            </div>
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
              <div className="grid grid-cols-2 gap-x-2.5 gap-y-[5px]">
                {shown.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-[5px]"
                    style={{ background: h.done ? "rgba(125,107,181,.14)" : "rgba(255,255,255,.45)" }}
                  >
                    <span className={`flex-1 min-w-0 text-[9.5px] truncate ${h.done ? "font-bold text-charcoal" : "font-medium text-charcoal-faint"}`}>
                      {h.label}
                    </span>
                    <span
                      className="w-3.5 h-3.5 rounded shrink-0 flex items-center justify-center"
                      style={
                        h.done
                          ? { background: "rgb(var(--c-team-lavender-deep))", border: "1.5px solid rgb(var(--c-team-lavender-deep))" }
                          : { background: "transparent", border: "1.5px solid rgba(125,107,181,.3)" }
                      }
                    >
                      {h.done && <Check size={9} className="text-white" strokeWidth={3} />}
                    </span>
                  </div>
                ))}
              </div>
              {more && (
                <div className="flex items-center justify-between gap-2.5 pt-1 pb-px">
                  <span className="text-[8.5px] font-semibold whitespace-nowrap text-primary-deep-text/[0.68]">For more habits, swipe.</span>
                  <span className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-team-lavender-deep shrink-0" />
                    <span className="w-1.5 h-1.5 rounded-full bg-team-lavender-deep/[0.28] shrink-0" />
                  </span>
                </div>
              )}
            </div>
          </>
        )
      );
    }

    // ----------------------------------------------------------- Heart rate
    case "heartRate": {
      const onClick = () => navigate("/app/health", { state: { openMetric: "heartRate" } });
      const bpm = metricValues.heartRate;
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(156,79,124,.1)",
            <>
              <p className={`${capsLabel} text-team-rose-ink/80`}>Heart rate</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="relative flex items-center justify-center">
                  <svg viewBox="0 0 24 24" width={70} height={70} style={{ display: "block", flex: "none" }}>
                    <path
                      d="M12 20.4S3.6 15 3.6 9.3A4.6 4.6 0 0 1 12 6.6a4.6 4.6 0 0 1 8.4 2.7c0 5.7-8.4 11.1-8.4 11.1Z"
                      fill="none"
                      stroke="rgb(var(--c-berry))"
                      strokeWidth={0.72}
                      strokeLinejoin="round"
                      className="animate-cent-heartbeat"
                      style={{ transformBox: "fill-box", transformOrigin: "center", animationDuration: `${(60 / Math.max(1, bpm)).toFixed(2)}s` }}
                    />
                  </svg>
                  <span className="absolute inset-0 flex flex-col items-center justify-center leading-none pt-1">
                    <span className="text-[19px] font-extrabold tracking-[-0.04em] text-charcoal tabular-nums">{bpm}</span>
                    <span className="mt-px text-[7.5px] font-bold text-team-rose-ink/80">bpm</span>
                  </span>
                </span>
              </div>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgba(156,79,124,.1)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-team-rose-ink/80`}>Heart rate</p>
              <span className={`${badge} text-team-rose-ink bg-berry/[0.16]`}>Resting</span>
            </div>
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
              <div className="flex items-baseline gap-2">
                <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">{bpm}</span>
                <span className="text-[11px] font-bold text-team-rose-ink/80">bpm resting</span>
              </div>
              {/* Reuses the Health page's own EKG trace component (waveform
                  AND its real rhythm label) so the two stay in sync by
                  construction, rather than a second hand-built waveform —
                  the manifest requires them to mirror exactly. Its rhythm
                  colour (green/amber/red for brady-/normal/tachycardia) is
                  real, functional signal, so it's kept rather than
                  recoloured to the design's flat decorative rose. */}
              <HeartRateEKG bpm={bpm} />
              <p className="text-[9.5px] font-semibold text-team-rose-ink/80">
                Range {heartRateDetail.low} – {heartRateDetail.high} bpm today
              </p>
            </div>
          </>
        )
      );
    }

    // -------------------------------------------------------------- Journal
    case "journal": {
      const onClick = () => navigate("/app/mind");
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(217,164,65,.14)",
            <>
              <p className={`${capsLabel} text-team-gold-ink/[0.82]`}>Journal</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="flex flex-col items-center gap-[7px]">
                  <BookOpen size={30} className="text-team-gold-deep" />
                  <span className="flex flex-col items-center leading-none">
                    <span className="text-[20px] font-extrabold tracking-[-0.04em] text-charcoal tabular-nums">{journalStreak}</span>
                    <span className="mt-1 text-[8.5px] font-bold text-team-gold-ink/[0.82]">day streak</span>
                  </span>
                </span>
              </div>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgba(217,164,65,.14)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-team-gold-ink/[0.82]`}>Journal</p>
              <span className={`${badge} text-team-gold-ink bg-gold/[0.22]`}>{journalDoneToday ? "Written today" : "Not written today"}</span>
            </div>
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-2.5">
              <div className="flex items-center gap-[13px]">
                <BookOpen size={30} className="text-team-gold-deep shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="flex items-baseline gap-1.5">
                    <span className="text-[22px] font-extrabold leading-none tracking-[-0.035em] text-charcoal">{journalStreak}</span>
                    <span className="text-[10px] font-bold text-team-gold-ink/[0.82]">day streak</span>
                  </p>
                  {latestEntry && (
                    <p className="mt-[5px] text-[10px] leading-[1.45] text-team-gold-ink/[0.82] overflow-hidden text-ellipsis whitespace-nowrap">
                      &ldquo;{latestEntry.text}&rdquo;
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-right">
                  <span className="block text-[14px] font-extrabold text-charcoal tabular-nums">{journalWordTotal}</span>
                  <span className="block mt-[2px] text-[7.5px] font-semibold text-team-gold-ink/[0.82]">words</span>
                </span>
              </div>
              <div className="flex gap-[5px]">
                {journalWeek.map((has, i) => (
                  <span
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1 rounded-lg py-[5px]"
                    style={{ background: has ? "rgba(217,164,65,.22)" : "rgba(255,255,255,.45)" }}
                  >
                    <span className={`text-[7.5px] font-extrabold ${has ? "text-team-gold-ink" : "text-team-gold-ink/50"}`}>{DAY_LETTERS[i]}</span>
                    {has ? (
                      <Check size={10} className="text-team-gold-deep" />
                    ) : (
                      <span className="w-2.5 h-2.5 rounded-full border-[1.3px] border-team-gold-ink/[0.28]" />
                    )}
                  </span>
                ))}
              </div>
            </div>
          </>
        )
      );
    }

    // ---------------------------------------------------------- Meditation
    case "meditation": {
      const onClick = () => navigate("/app/mind");
      const weeklyGoalMin = 20;
      const todayMin = 12; // No real per-day meditation duration is tracked yet.
      const weekPct = Math.min(1, todayMin / weeklyGoalMin);
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(162,200,194,.18)",
            <>
              <p className={`${capsLabel} text-team-teal-ink/[0.72]`}>Meditation</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="flex flex-col items-center gap-2">
                  <LotusGlyph size={40} stroke="rgb(var(--c-teal-dark))" />
                  <span className="flex items-baseline gap-[3px]">
                    <span className="text-[20px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">{todayMin}</span>
                    <span className="text-[9px] font-bold text-team-teal-ink/[0.72]">min</span>
                  </span>
                </span>
              </div>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgba(162,200,194,.18)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-team-teal-ink/[0.72]`}>Meditation</p>
              <span className={`${badge} text-team-teal-ink bg-teal/[0.42]`}>3 sessions this week</span>
            </div>
            <div className="flex-1 flex items-center gap-4 min-h-0 mt-[9px]">
              <LotusGlyph size={66} progress={weekPct} stroke="rgb(var(--c-teal-dark))" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-[24px] font-extrabold leading-none tracking-[-0.035em] text-charcoal tabular-nums">{todayMin} min</span>
                  <span className="text-[10px] font-bold text-team-teal-ink/[0.72]">today</span>
                </div>
                <p className="mt-[7px] mb-2.5 text-[10px] text-team-teal-ink/[0.72]">Box breathing · 4-4-4-4</p>
                <div className="h-[7px] rounded-full bg-teal-dark/20 overflow-hidden">
                  <div className="h-full rounded-full bg-teal-dark" style={{ width: `${weekPct * 100}%` }} />
                </div>
                <p className="mt-1.5 text-[8.5px] font-bold text-team-teal-ink/[0.72]">{Math.round(weekPct * 100)}% of your weekly goal</p>
              </div>
            </div>
          </>
        )
      );
    }

    // ------------------------------------------------------------ Gym passes
    case "gymPasses": {
      type Pass = { gymId: string; gymName: string; plan: string; purchasedAt: number; oneTime: boolean };
      const now = Date.now();
      const passes: Pass[] = Object.entries(gymPurchases).flatMap(([gymId, arr]) =>
        arr
          .filter((p) => !p.oneTime || now - p.purchasedAt < DAY_MS)
          .map((p) => ({ gymId, gymName: mockGyms.find((g) => g.id === gymId)?.name ?? "Gym", plan: p.plan, purchasedAt: p.purchasedAt, oneTime: p.oneTime }))
      );
      const onClick = onGymPassesClick ?? (() => {});
      if (!isLarge) {
        return wrap(
          onClick,
          shell(
            "rgba(36,31,27,.05)",
            <>
              <p className={`${capsLabel} text-charcoal/50`}>Gym passes</p>
              <div className="flex-1 flex items-center justify-center min-h-0">
                <span className="flex flex-col items-center gap-[7px]">
                  <KeyRound size={38} className="text-charcoal/55" />
                  <span className="text-[24px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">{passes.length}</span>
                </span>
              </div>
            </>
          )
        );
      }
      const current = passes[0];
      // A one-time pass has a real 24h expiry; a monthly/annual membership
      // doesn't expire in this app's data model at all, so there is no real
      // date to show for it — the design's "Ends <date>" row only renders
      // for the former.
      const remainingMs = current && current.oneTime ? current.purchasedAt + DAY_MS - now : null;
      const soon = remainingMs !== null && remainingMs < 6 * 60 * 60 * 1000;
      return wrap(
        onClick,
        shell(
          "rgba(36,31,27,.05)",
          <>
            <div className="flex items-center justify-between gap-3">
              <p className={`${capsLabel} text-charcoal/50`}>Gym passes</p>
              <span className={`${badge} text-charcoal/[0.62] bg-charcoal/[0.09]`}>{passes.length} active</span>
            </div>
            {current ? (
              <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
                <div className="flex items-center gap-[13px]">
                  <QrPattern seed={`${current.gymId}-${current.plan}`} className="w-[52px] h-[52px] shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-extrabold tracking-[-0.02em] text-charcoal truncate">{current.gymName}</p>
                    <p className="mt-[3px] text-[10px] text-charcoal-tertiary">{current.plan}</p>
                    {remainingMs !== null && (
                      <p className={`mt-[5px] flex items-center gap-[5px] text-[10px] font-extrabold ${soon ? "text-status-high" : "text-charcoal-soft"}`}>
                        <AlertCircle size={11} />
                        {isOneTimePlan(current.plan) ? "Day pass" : current.plan} · expires{" "}
                        {new Date(current.purchasedAt + DAY_MS).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </p>
                    )}
                  </div>
                </div>
                {passes.length > 1 && (
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="text-[8.5px] font-semibold whitespace-nowrap text-charcoal-tertiary">
                      Swipe for {passes[1].gymName}
                    </span>
                    <span className="flex gap-1">
                      {passes.map((_, i) => (
                        <span key={i} className={`w-1.5 h-1.5 rounded-full shrink-0 ${i === 0 ? "bg-charcoal/55" : "bg-charcoal/20"}`} />
                      ))}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center min-h-0">
                <p className="text-[11px] font-semibold text-charcoal-tertiary">No active passes</p>
              </div>
            )}
          </>
        )
      );
    }

    default:
      return null;
  }
};
