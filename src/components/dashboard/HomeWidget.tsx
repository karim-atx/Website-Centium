import React from "react";
import { useNavigate } from "react-router-dom";
import type { WidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import { LotusGlyph } from "./LotusGlyph";
import { HeartRateEKG } from "../health/HeartRateEKG";
import { QrPattern, DAY_MS, isOneTimePlan } from "../marketplace/GymDetailSheet";
import {
  averageOf,
  emptyHint,
  NO_READINGS,
  trendLabel,
  withinDays,
} from "../../services/health-metrics/series";
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

// The small Weight tile's value is always 0.176 × the icon size, per the
// reference markup (CentiumFrame.dc.html `wValueSize`); there is no
// step-down branch.

const capsLabel = "font-bold text-[9px] tracking-[.16em] uppercase";
const numeralSmall = "text-[16px] font-extrabold leading-none tracking-[-0.03em] text-charcoal tabular-nums";
const badge = "text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap shrink-0";

// Master handover item 7: one wave layer's path, 716px wide (two periods of
// the 358px widget). For each crest i of n across 716px, s = 716 / n and the
// segment from x0 = i*s is `C (x0+0.28s) (y-amp) (x0+0.72s) (y+amp) (x0+s) y`,
// starting at `M0 y`. `floor` closes the fill down past the container floor;
// the crest line is the same path left open.
function buildWavePath(y: number, amp: number, crests: number, floor: number) {
  const s = 716 / crests;
  let edge = `M0 ${y}`;
  for (let i = 0; i < crests; i++) {
    const x0 = i * s;
    edge += ` C${(x0 + 0.28 * s).toFixed(2)} ${y - amp} ${(x0 + 0.72 * s).toFixed(2)} ${y + amp} ${(x0 + s).toFixed(2)} ${y}`;
  }
  return { fill: `${edge} L716 ${floor} L0 ${floor} Z`, edge };
}

// Item 7's table, in the reference markup's paint order: the front (y14)
// layer is 4th, and the faint y74 layer paints last, over it.
// `swell` names one of the three swell keyframes below: A = 6px/-5px
// (layers 1 and 4), B = -4px/5px (layer 3 and the front), C = -3px/4px
// (layer 2). `delay` offsets the swell only.
const WATER_WAVE_LAYERS: Array<{
  y: number;
  amp: number;
  crests: number;
  fill: string;
  swellCycle: string;
  driftCycle: string;
  rightward: boolean;
  swell: "A" | "B" | "C";
  delay: string;
  front?: boolean;
}> = [
  { y: 30, amp: 9, crests: 2, fill: "rgba(23,69,127,0.17)", swellCycle: "8.5s", driftCycle: "9s", rightward: false, swell: "A", delay: "-1.2s" },
  { y: 22, amp: 6, crests: 3, fill: "rgba(23,69,127,0.11)", swellCycle: "6.5s", driftCycle: "7s", rightward: true, swell: "C", delay: "-3.4s" },
  { y: 46, amp: 7, crests: 5, fill: "rgba(255,255,255,0.13)", swellCycle: "7.5s", driftCycle: "11s", rightward: false, swell: "B", delay: "-0.6s" },
  { y: 14, amp: 8, crests: 2, fill: "rgba(255,255,255,0.30)", swellCycle: "5.5s", driftCycle: "5s", rightward: true, swell: "B", delay: "-2.1s", front: true },
  { y: 74, amp: 6, crests: 4, fill: "rgba(255,255,255,0.10)", swellCycle: "9s", driftCycle: "13s", rightward: false, swell: "A", delay: "-4.7s" },
];

// Seamless drift. A layer's loop only closes if its travel is a whole number
// of its own wave periods (716 / crests). 358px is that for 2 and 4 crests;
// for 3 and 5 crests it is 1.5 and 2.5 periods, which flips crest and trough
// once per cycle. Those layers travel the largest whole number of periods
// that fits in 358px instead, over a proportionally shorter cycle, so every
// layer keeps item 7's speed (358px per listed cycle).
function driftFor(crests: number, cycle: string) {
  const period = 716 / crests;
  const distance = Math.floor(358 / period + 1e-9) * period;
  const seconds = (parseFloat(cycle) * distance) / 358;
  return { distance: `${distance.toFixed(2)}px`, duration: `${Number(seconds.toFixed(3))}s` };
}

// Star shape for the over-goal sparkles (the handoff reference's four-point star).
const SPARKLE_PATH = "M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z";

// Master handover item 7: the large Water widget — 358x131, five layered
// translucent waves that drift and swell independently, filling to 126px at
// the daily goal (5px short of the top), sloshing when the amount changes,
// white type at the goal, and a gold pill with sparkles above it. Values are
// item 7's; element positions and type sizes follow the handover's own
// reference (CentiumWaterWidget.dc.html), which item 7 describes as the
// current layout. The small (bottle) tile is a separate branch and is not
// touched here.
const LargeWaterWidget: React.FC<{ water: number; waterGoalMl: number; pct: number }> = ({ water, waterGoalMl, pct }) => {
  const pctPercent = pct * 100;
  const fillHeightPx = (Math.min(100, pctPercent) / 100) * 126;
  const atOrAboveGoal = pctPercent >= 100;
  const overGoal = pctPercent > 100;

  const bodyGradient = atOrAboveGoal
    ? "linear-gradient(180deg, #6FA6EC 0%, #4A85DC 46%, #2C5FAF 100%)"
    : "linear-gradient(180deg, #E4F0FE 0%, #B9D7F8 42%, #7FB0EE 100%)";
  const labelColor = atOrAboveGoal ? "rgba(255,255,255,0.92)" : "#3A4351";
  const valueColor = atOrAboveGoal ? "#FFFFFF" : "#000000";
  const subColor = atOrAboveGoal ? "rgba(255,255,255,0.95)" : "#46505F";
  const goalColor = atOrAboveGoal ? "rgba(255,255,255,0.92)" : "#26303D";
  const textShadow = atOrAboveGoal ? "0 1px 3px rgba(12,40,82,0.45)" : "none";
  // Pill: solid blue below the goal (#D7E8FA, #004376 type), a deeper blue
  // at it (#D1E5FD, #003874), gold above it.
  const pillBg = overGoal ? "#F4D789" : atOrAboveGoal ? "#D1E5FD" : "#D7E8FA";
  const pillFg = overGoal ? "#8B5900" : atOrAboveGoal ? "#003874" : "#004376";
  const subLabel = atOrAboveGoal ? "Goal reached!" : `${((waterGoalMl - water) / 1000).toFixed(1)} L to go`;

  return (
    <div
      className="relative w-full max-w-[358px] h-[131px] rounded-[15px] overflow-hidden box-border"
      style={{ background: "linear-gradient(180deg, #F4F8FE, #ECF4FE)" }}
    >
      <style>{`
        @keyframes cent-water-drift { from { transform: translateX(0); } to { transform: translateX(calc(-1 * var(--cent-drift, 358px))); } }
        @keyframes cent-water-swell-a { 0%, 100% { transform: translateY(6px); } 50% { transform: translateY(-5px); } }
        @keyframes cent-water-swell-b { 0%, 100% { transform: translateY(-4px); } 50% { transform: translateY(5px); } }
        @keyframes cent-water-swell-c { 0%, 100% { transform: translateY(-3px); } 50% { transform: translateY(4px); } }
        @keyframes cent-water-slosh { 0% { transform: translateY(6px); } 45% { transform: translateY(-3px); } 75% { transform: translateY(1.5px); } 100% { transform: translateY(0); } }
        @keyframes cent-water-sparkle { 0%, 100% { opacity: 0.35; transform: scale(0.72); } 50% { opacity: 1; transform: scale(1); } }
        .cent-water-drift { animation-name: cent-water-drift; animation-timing-function: linear; animation-iteration-count: infinite; }
        .cent-water-swell { animation-timing-function: ease-in-out; animation-iteration-count: infinite; }
        .cent-water-slosh { animation: cent-water-slosh 1.4s cubic-bezier(0.22,1,0.36,1) 1; }
        .cent-water-sparkle { animation: cent-water-sparkle 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cent-water-drift, .cent-water-swell { animation-duration: 40s !important; }
          .cent-water-slosh, .cent-water-sparkle { animation: none !important; }
        }
      `}</style>

      {/* Fill container: 126px at the goal, never higher. */}
      <div
        className="absolute left-0 right-0 bottom-0"
        style={{ height: fillHeightPx, transition: "height 1.1s cubic-bezier(.34,1.32,.5,1)" }}
      >
        {/* Body, from 10px below the container's top edge. */}
        <div className="absolute left-0 right-0 bottom-0" style={{ top: 10, background: bodyGradient }} />

        {/* Waves, band and depth shadow. Keyed on the millilitre value so the
            slosh restarts on every change; the container above is not keyed,
            so its height transition still runs. */}
        <div key={water} className="absolute left-0 right-0 bottom-0 overflow-hidden cent-water-slosh" style={{ top: 10, willChange: "transform" }}>
          {WATER_WAVE_LAYERS.map((w, i) => {
            const { fill, edge } = buildWavePath(w.y, w.amp, w.crests, 160);
            const drift = driftFor(w.crests, w.driftCycle);
            return (
              <span
                key={i}
                className="absolute inset-0 block cent-water-swell"
                style={{
                  animationName: `cent-water-swell-${w.swell.toLowerCase()}`,
                  animationDuration: w.swellCycle,
                  animationDelay: w.delay,
                  willChange: "transform",
                }}
              >
                <svg
                  width={716}
                  height={190}
                  viewBox="0 -30 716 190"
                  className="cent-water-drift"
                  style={{
                    position: "absolute",
                    left: 0,
                    top: -30,
                    display: "block",
                    animationDuration: drift.duration,
                    animationDirection: w.rightward ? "reverse" : "normal",
                    willChange: "transform",
                    ["--cent-drift" as string]: drift.distance,
                  } as React.CSSProperties}
                >
                  <path d={fill} fill={w.fill} />
                  {w.front && (
                    <path d={edge} fill="none" stroke="rgba(255,255,255,0.95)" strokeWidth={1.7} strokeLinecap="round" />
                  )}
                </svg>
              </span>
            );
          })}
          <span
            aria-hidden="true"
            className="absolute left-0 right-0 top-0 pointer-events-none"
            style={{ height: 22, background: "linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0))" }}
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              boxShadow:
                "inset 13px 0 20px -13px rgba(11,40,80,0.42), inset -13px 0 20px -13px rgba(11,40,80,0.42), inset 0 -18px 26px -12px rgba(11,40,80,0.5)",
            }}
          />
        </div>
      </div>

      <p
        className="absolute uppercase"
        style={{ left: 25, top: 19, margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: ".16em", lineHeight: 1, color: labelColor, textShadow }}
      >
        Water
      </p>
      <p
        className="absolute tabular-nums"
        style={{ left: 25, top: 37, margin: 0, fontSize: 29, fontWeight: 800, lineHeight: 1, letterSpacing: "-0.035em", color: valueColor, textShadow }}
      >
        {(water / 1000).toFixed(1)} L
      </p>
      <p
        className="absolute"
        style={{ left: 25, top: 70, margin: 0, fontSize: 13.5, fontWeight: 500, lineHeight: 1.2, whiteSpace: "nowrap", color: subColor, textShadow }}
      >
        {subLabel}
      </p>

      <span
        className="absolute flex items-center rounded-full tabular-nums"
        style={{
          right: 21,
          top: 15,
          height: 28,
          padding: "0 14px",
          fontSize: 13.5,
          fontWeight: 700,
          lineHeight: 1,
          whiteSpace: "nowrap",
          background: pillBg,
          color: pillFg,
          transition: "background-color .5s ease, color .5s ease",
        }}
      >
        {Math.min(100, Math.round(pctPercent))}%
      </span>

      {/* Above the goal only: two twinkling stars beside the pill, clear of
          the rounded corner. */}
      {overGoal && (
        <>
          <svg
            width={9}
            height={9}
            viewBox="0 0 24 24"
            className="absolute cent-water-sparkle"
            style={{ right: 11, top: 12, display: "block" }}
          >
            <path d={SPARKLE_PATH} fill="#FFE9B0" />
          </svg>
          <svg
            width={6}
            height={6}
            viewBox="0 0 24 24"
            className="absolute cent-water-sparkle"
            style={{ right: 9, top: 30, display: "block", animationDelay: "0.6s" }}
          >
            <path d={SPARKLE_PATH} fill="#FFF3D4" />
          </svg>
        </>
      )}

      {/* Goal marker: a hairline beside the goal figure. */}
      <span className="absolute flex items-stretch" style={{ right: 21, top: 82, gap: 8 }}>
        <span style={{ width: 1, background: "#FFFFFF", flex: "none" }} />
        <span className="flex flex-col justify-center" style={{ fontSize: 11, fontWeight: 500, lineHeight: 1.16, color: goalColor }}>
          <span>{(waterGoalMl / 1000).toFixed(1)} L</span>
          <span>Goal</span>
        </span>
      </span>
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
  const { metricValues, healthSeries, sleepDetail, water, waterGoalMl, stepsGoal, foodLog, nutritionGoal, workoutLog, habits, journalEntries, gymPurchases, today, selectedDate } =
    useApp();
  const isLarge = widget.size === "large";
  // Per-instance clip id for the small water bottle, so two water tiles on
  // one board never resolve url(#…) to the other tile's clip path. useId's
  // colons are stripped: they are not safe inside a url() fragment.
  const bottleClipId = `w-bottle-clip-${React.useId().replace(/:/g, "")}`;

  // A WEEK OF REAL READINGS. These three used to come from mockHealthData's
  // seven-value literals, so every widget on every Home screen drew the same
  // week — 7,200 to 8,421 steps, 107.6 down to 106.4 kg.
  const stepsMeta = withinDays(healthSeries.steps, 7, today);
  const weeklyStepsAvg = averageOf(stepsMeta);
  const stepsMax = Math.max(...stepsMeta.history.map((h) => h.value), stepsGoal);
  // No stride-length preference exists in this app; 0.762m is the generic
  // average-adult-stride figure fitness trackers default to absent one.
  const stepsKm =
    metricValues.steps === null ? null : ((metricValues.steps * 0.762) / 1000).toFixed(1);

  const weightMeta = withinDays(healthSeries.weight, 7, today);
  const weightValues = weightMeta.history.map((h) => h.value);
  const weightMin = Math.min(...weightValues);
  const weightMax = Math.max(...weightValues);

  const sleepMeta = withinDays(healthSeries.sleep, 7, today);
  // The stage bar, drawn only when a real night carries all four stages.
  // This read mockHealthData's sleepDetail — 18/96/210/78 minutes, the same
  // night for every account that had never worn anything to bed.
  const sleepStages = sleepDetail?.stages
    ? [
        { label: "Awake", min: sleepDetail.stages.awakeMin, color: "rgb(var(--c-teal-dark))" },
        { label: "REM", min: sleepDetail.stages.remMin, color: "rgb(var(--c-berry))" },
        { label: "Light", min: sleepDetail.stages.lightMin, color: "rgb(var(--c-sky))" },
        { label: "Deep", min: sleepDetail.stages.deepMin, color: "rgb(var(--c-team-lavender-deep))" },
      ]
    : null;
  const sleepTotalMin = sleepStages ? sleepStages.reduce((s, x) => s + x.min, 0) || 1 : 1;
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

  /**
   * A widget with nothing behind it yet.
   *
   * SAME FRAME, NO FIGURE. Each of these cards is built around a number, a
   * trend and a small chart; with no readings they used to render the same
   * seeded ones for everybody — 8,421 steps, 106.4 kg, 68 bpm, 7h42. The card
   * keeps its place on the board and says it is empty, which is also what
   * makes it obvious where to start.
   */
  const emptyCard = (bg: string, label: string, hint: string | null) =>
    shell(
      bg,
      <>
        <p className={`${capsLabel} text-charcoal/[0.42]`}>{label}</p>
        <div className="flex-1 flex flex-col justify-center min-h-0">
          <p className="text-[12px] font-semibold text-charcoal-tertiary leading-snug">{NO_READINGS}</p>
          {hint && isLarge && (
            <p className="mt-1 text-[10.5px] text-charcoal-faint leading-snug">{hint}</p>
          )}
        </div>
      </>
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
      if (metricValues.steps === null) {
        return wrap(onClick, emptyCard("rgba(162,200,194,.2)", "Steps", emptyHint("steps")));
      }
      const steps = metricValues.steps;
      const pct = Math.round((steps / stepsGoal) * 100);
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
                  <span>
                    {weeklyStepsAvg === null ? "No weekly average yet" : `Weekly avg ${weeklyStepsAvg.toLocaleString()}`}
                  </span>
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
      const onClick = onWaterClick ?? (() => navigate("/app/health"));
      if (!isLarge) {
        // CentiumWaterWidget.dc.html, variant "bottle": the fill is clipped
        // to the body path, so it never enters the collar or cap. Its top
        // edge runs from the body floor (y96) at 0% to the body top (y34) at
        // the goal, and rises no further above it. Static, as in the markup.
        const BOTTLE_BODY = "M14 34 h36 a3 3 0 0 1 3 3 v54 a5 5 0 0 1 -5 5 h-32 a5 5 0 0 1 -5 -5 v-54 a3 3 0 0 1 3 -3 z";
        const bottleFillTop = 96 - Math.max(0, Math.min(1, pct)) * (96 - 34);
        return wrap(
          onClick,
          shell(
            "rgba(143,192,232,.17)",
            <>
              <p className={capsLabel} style={{ color: "#5B86AD" }}>Water</p>
              <div className="flex-1 flex items-center justify-between gap-1 min-h-0">
                <span className="flex flex-col min-w-0">
                  <span className="text-[17px] font-extrabold leading-none tracking-[-0.03em] text-charcoal tabular-nums whitespace-nowrap">
                    {(water / 1000).toFixed(1)} L
                  </span>
                  <span className="text-[9px] font-semibold mt-[5px] whitespace-nowrap" style={{ color: "#5B86AD" }}>
                    of {(waterGoalMl / 1000).toFixed(1)} L
                  </span>
                </span>
                <svg width={41} height={64} viewBox="0 0 64 100" style={{ display: "block", flex: "none", overflow: "visible" }}>
                  <defs>
                    <clipPath id={bottleClipId}>
                      <path d={BOTTLE_BODY} />
                    </clipPath>
                  </defs>
                  <g clipPath={`url(#${bottleClipId})`}>
                    <rect x={10} y={bottleFillTop.toFixed(2)} width={44} height={100} fill="#A8D5F2" />
                  </g>
                  <path d={BOTTLE_BODY} fill="none" stroke="#4A85C4" strokeWidth={3.4} strokeLinejoin="round" />
                  <path d="M21 26 h22 v8 h-22 z" fill="#A8D5F2" stroke="#4A85C4" strokeWidth={3.4} strokeLinejoin="round" />
                  <rect x={19} y={13} width={26} height={13} rx={3.5} fill="#A8D5F2" stroke="#4A85C4" strokeWidth={3.4} strokeLinejoin="round" />
                  <circle cx={53} cy={15} r={7.5} fill="none" stroke="#4A85C4" strokeWidth={3.4} />
                  <g stroke="#4A85C4" strokeWidth={3} strokeLinecap="round">
                    <path d="M46 46 h4" />
                    <path d="M46 58 h4" />
                    <path d="M46 70 h4" />
                    <path d="M46 82 h4" />
                  </g>
                </svg>
              </div>
            </>
          )
        );
      }
      // Master handover item 7: the large tile is LargeWaterWidget above.
      return wrap(onClick, <LargeWaterWidget water={water} waterGoalMl={waterGoalMl} pct={pct} />);
    }

    // ---------------------------------------------------------------- Sleep
    case "sleep": {
      if (metricValues.sleepHours === null) {
        return wrap(
          () => navigate("/app/health", { state: { openMetric: "sleep" } }),
          emptyCard("rgba(174,161,220,.13)", "Sleep", emptyHint("sleep"))
        );
      }
      const onClick = () => navigate("/app/health", { state: { openMetric: "sleep" } });
      const hours = metricValues.sleepHours;
      const h = Math.floor(hours);
      const m = Math.round((hours % 1) * 60);
      const sleepTrend = trendLabel(sleepMeta, "vs last wk");
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
              {/* The fixed hypnogram `d` is gone: one zigzag, identical on
                  every account and every night, drawn whether or not anything
                  had been slept through. */}
              <div className="flex-1 min-h-0" />
              {sleepTrend && (
                <p className="mt-[6px] text-[9px] text-primary-deep-text">{sleepTrend}</p>
              )}
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
              {sleepDetail?.score != null && (
                <span className={`${badge} text-primary-deep-text bg-team-lavender/30`}>Score {sleepDetail.score}</span>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between min-h-0 mt-1">
              <div className="flex items-baseline gap-2.5">
                <span className="text-[24px] font-extrabold leading-none tracking-[-0.035em] text-charcoal tabular-nums">
                  {h}h {m.toString().padStart(2, "0")}m
                </span>
                {sleepTrend && (
                  <span className="text-[10px] whitespace-nowrap text-primary-deep-text/[0.68]">{sleepTrend}</span>
                )}
              </div>
              {/* A NIGHT'S LENGTH AND A NIGHT'S STAGES ARE DIFFERENT
                  FACTS. The hours can be recorded without a wearable; the
                  four-stage split cannot, so it is drawn only when a real
                  sleep_details row carries all four. */}
              {sleepStages && (
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
              )}
              {sleepStages && (
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
              )}
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
      if (metricValues.weight === null) {
        return wrap(
          () => navigate("/app/health", { state: { openMetric: "weight" } }),
          emptyCard("rgba(174,161,220,.11)", "Weight", emptyHint("weight"))
        );
      }
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
                    {/* The three dial "feet" pins, all 4.0 units on their
                        existing bearings (CentiumFrame.dc.html, iteration
                        tickA/tickB/tickC). */}
                    <path d="M22.2 10.2 L23.59 13.95" strokeWidth={2.2} />
                    <path d="M31.8 9.6 V13.6" strokeWidth={2.2} />
                    <path d="M41.7 10.2 L40.58 14.04" strokeWidth={2.2} />
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
                      fontSize: iconSize * 0.176,
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
              {trendLabel(weightMeta) && (
                <span className={`${badge} text-primary-deep-text bg-team-lavender/30`}>
                  {trendLabel(weightMeta)}
                </span>
              )}
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
      if (metricValues.heartRate === null) {
        // The heart glyph animates at `60 / bpm` seconds a beat, so an empty
        // card used to pulse at a steady seeded 68.
        return wrap(onClick, emptyCard("rgba(156,79,124,.1)", "Heart rate", emptyHint("heartRate")));
      }
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
              {/* Real min and max across the week's readings. This printed
                  "Range 58 – 142 bpm today" from a literal, to everybody. */}
              {healthSeries.heartRate.history.length > 1 && (
                <p className="text-[9.5px] font-semibold text-team-rose-ink/80">
                  Range {Math.round(Math.min(...healthSeries.heartRate.history.map((h) => h.value)))} –{" "}
                  {Math.round(Math.max(...healthSeries.heartRate.history.map((h) => h.value)))} bpm
                </p>
              )}
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
