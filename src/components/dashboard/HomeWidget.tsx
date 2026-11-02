import React from "react";
import { useNavigate } from "react-router-dom";
import type { WidgetConfig } from "../../types";
import { useApp } from "../../context/AppContext";
import {
  isReferenceOnlyTarget,
  REFERENCE_INTAKE_NOTE,
  sumNutrition,
  targetsFromGoal,
} from "../../services/nutrition";
import { textPx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";
import { browserOffline, enqueueLog, isOfflineFailure, newQueueId, SAVED_ON_DEVICE } from "../../services/health-log/offlineQueue";
import { Toast } from "../ui/Toast";
import { t, tk, tn } from "../../i18n/core";
import { CycleWidget } from "./widgets/CycleWidget";
import { StepsWidget } from "./widgets/StepsWidget";
import { WeightWidget } from "./widgets/WeightWidget";
import { SleepWidget } from "./widgets/SleepWidget";
import { WorkoutWidget } from "./widgets/WorkoutWidget";
import { HeartRateWidget } from "./widgets/HeartRateWidget";
import { HabitsWidget } from "./widgets/HabitsWidget";
import { JournalWidget } from "./widgets/JournalWidget";
import { MeditationWidget } from "./widgets/MeditationWidget";

// v6 Batch 2 · Home (home-handover.md HO1.W1-W11): every widget except Water
// and Food is drawn by its own file in ./widgets on the shared MetricWidget
// (preset "home", V6-56). Water (HO1.W3, small and large) and Food (HO1.W5
// small; large kept as the repo draws it, V6-138 / D13) are "Reverted to
// repo": their branches below are unchanged, including the recovery-pending
// card and the recovery-sensitive Food summary.

const capsLabel = "font-bold text-[9px] tracking-[.16em] uppercase";
/** The small water tile's one-tap amount: the middle of Add Metric's quick amounts. */
const WATER_QUICK_ADD_ML = 250;
const badge = "text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap shrink-0";

// Master handover item 7: one wave layer's path. For each crest i of n
// across 716px (two periods of the 358px reference widget), s = 716 / n and
// the segment from x0 = i*s is `C (x0+0.28s) (y-amp) (x0+0.72s) (y+amp) (x0+s) y`,
// starting at `M0 y`. HO1.1 made the widget fluid (full row, up to ~398px),
// so the same waves repeat once more to 1432px: a layer drifts at most 358px,
// which leaves over 1000px of strip in view at any width. `floor` closes the
// fill down past the container floor; the crest line is the same path left open.
const WAVE_STRIP = 1432;
function buildWavePath(y: number, amp: number, crests: number, floor: number) {
  const s = 716 / crests;
  let edge = `M0 ${y}`;
  for (let i = 0; i < crests * 2; i++) {
    const x0 = i * s;
    edge += ` C${(x0 + 0.28 * s).toFixed(2)} ${y - amp} ${(x0 + 0.72 * s).toFixed(2)} ${y + amp} ${(x0 + s).toFixed(2)} ${y}`;
  }
  return { fill: `${edge} L${WAVE_STRIP} ${floor} L0 ${floor} Z`, edge };
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
  /** Dark mode below the goal: the white layers at half strength. */
  fillDark?: string;
}> = [
  { y: 30, amp: 9, crests: 2, fill: "rgba(23,69,127,0.17)", swellCycle: "8.5s", driftCycle: "9s", rightward: false, swell: "A", delay: "-1.2s" },
  { y: 22, amp: 6, crests: 3, fill: "rgba(23,69,127,0.11)", swellCycle: "6.5s", driftCycle: "7s", rightward: true, swell: "C", delay: "-3.4s" },
  { y: 46, amp: 7, crests: 5, fill: "rgba(255,255,255,0.13)", swellCycle: "7.5s", driftCycle: "11s", rightward: false, swell: "B", delay: "-0.6s", fillDark: "rgba(255,255,255,0.065)" },
  { y: 14, amp: 8, crests: 2, fill: "rgba(255,255,255,0.30)", swellCycle: "5.5s", driftCycle: "5s", rightward: true, swell: "B", delay: "-2.1s", front: true, fillDark: "rgba(255,255,255,0.15)" },
  { y: 74, amp: 6, crests: 4, fill: "rgba(255,255,255,0.10)", swellCycle: "9s", driftCycle: "13s", rightward: false, swell: "A", delay: "-4.7s", fillDark: "rgba(255,255,255,0.05)" },
];

/**
 * Mobile v5.1 R3, dark mode (no light islands): the large Water widget below
 * its goal. The handover draws it light only; these are DERIVED: the ground
 * is the water blue #4A85DC at 10% to 16% on the dark card (the light ground
 * runs lighter to bluer the same way), the body a deep version of the light
 * body's three blues, the type the dark text ramp (value #F5F3FA, label
 * #C3CCDB 9:1, sub-line and goal #D5DCE8 7.5:1 on the mid body). The pill is
 * #4A85C4 at 30% on the card with its ink lifted to 6:1 (#A8C4E3); above the
 * goal it is gold.tint #3A342C with gold.text #CAB082 (5.9:1).
 */
const WATER_DARK = {
  ground: "linear-gradient(180deg, #21293A, #232F45)",
  body: "linear-gradient(180deg, #1E2E47 0%, #23416B 42%, #2A5088 100%)",
  label: "#C3CCDB",
  value: "#F5F3FA",
  sub: "#D5DCE8",
  pillBg: "#2A3E57",
  pillFg: "#A8C4E3",
  goldPillBg: "#3A342C",
  goldPillFg: "#CAB082",
} as const;


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
  const dark = useIsDark();
  // In dark mode, below the goal: the light waves' white layers at half
  // strength, so the light type above them keeps its contrast.
  const dimWaves = dark && !atOrAboveGoal;

  // Mobile v5.1 R3, dark mode (no light islands): below the goal the card is
  // dark (WATER_DARK); at and above it the bright blue body with white type is
  // a coloured fill and stays as it is. The pill is dark in every state.
  const bodyGradient = atOrAboveGoal
    ? "linear-gradient(180deg, #6FA6EC 0%, #4A85DC 46%, #2C5FAF 100%)"
    : dark
    ? WATER_DARK.body
    : "linear-gradient(180deg, #E4F0FE 0%, #B9D7F8 42%, #7FB0EE 100%)";
  const labelColor = atOrAboveGoal ? "rgba(255,255,255,0.92)" : dark ? WATER_DARK.label : "#3A4351";
  const valueColor = atOrAboveGoal ? "#FFFFFF" : dark ? WATER_DARK.value : "#000000";
  const subColor = atOrAboveGoal ? "rgba(255,255,255,0.95)" : dark ? WATER_DARK.sub : "#46505F";
  const goalColor = atOrAboveGoal ? "rgba(255,255,255,0.92)" : dark ? WATER_DARK.sub : "#26303D";
  const textShadow = atOrAboveGoal ? "0 1px 3px rgba(12,40,82,0.45)" : "none";
  // Pill: solid blue below the goal (#D7E8FA, #004376 type), a deeper blue
  // at it (#D1E5FD, #003874), gold above it.
  const pillBg = dark
    ? overGoal ? WATER_DARK.goldPillBg : WATER_DARK.pillBg
    : overGoal ? "#F4D789" : atOrAboveGoal ? "#D1E5FD" : "#D7E8FA";
  const pillFg = dark
    ? overGoal ? WATER_DARK.goldPillFg : WATER_DARK.pillFg
    : overGoal ? "#8B5900" : atOrAboveGoal ? "#003874" : "#004376";
  const subLabel = atOrAboveGoal ? t("Goal reached!") : t("{n} L to go", { n: ((waterGoalMl - water) / 1000).toFixed(1) });

  return (
    <div
      className="relative w-full h-[131px] rounded-[15px] overflow-hidden box-border"
      style={{ background: dark ? WATER_DARK.ground : "linear-gradient(180deg, #F4F8FE, #ECF4FE)" }}
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
        .reduce-motion .cent-water-drift, .reduce-motion .cent-water-swell { animation: none !important; }
        .reduce-motion .cent-water-slosh, .reduce-motion .cent-water-sparkle { animation: none !important; }
      `}</style>

      {/* Fill container: 126px at the goal, never higher. */}
      <div
        className="absolute start-0 end-0 bottom-0"
        style={{ height: fillHeightPx, transition: "height 1.1s cubic-bezier(.34,1.32,.5,1)" }}
      >
        {/* Body, from 10px below the container's top edge. */}
        <div className="absolute start-0 end-0 bottom-0" style={{ top: 10, background: bodyGradient }} />

        {/* Waves, band and depth shadow. Keyed on the millilitre value so the
            slosh restarts on every change; the container above is not keyed,
            so its height transition still runs. */}
        <div key={water} className="absolute start-0 end-0 bottom-0 overflow-hidden cent-water-slosh" style={{ top: 10, willChange: "transform" }}>
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
                  width={WAVE_STRIP}
                  height={190}
                  viewBox={`0 -30 ${WAVE_STRIP} 190`}
                  className="cent-water-drift"
                  style={{
                    position: "absolute",
                    insetInlineStart: 0,
                    top: -30,
                    display: "block",
                    animationDuration: drift.duration,
                    animationDirection: w.rightward ? "reverse" : "normal",
                    willChange: "transform",
                    ["--cent-drift" as string]: drift.distance,
                  } as React.CSSProperties}
                >
                  <path d={fill} fill={dimWaves ? w.fillDark ?? w.fill : w.fill} />
                  {w.front && (
                    <path d={edge} fill="none" stroke={dimWaves ? "rgba(255,255,255,0.48)" : "rgba(255,255,255,0.95)"} strokeWidth={1.7} strokeLinecap="round" />
                  )}
                </svg>
              </span>
            );
          })}
          <span
            aria-hidden="true"
            className="absolute start-0 end-0 top-0 pointer-events-none"
            style={{ height: 22, background: `linear-gradient(180deg, rgba(255,255,255,${dimWaves ? 0.21 : 0.42}), rgba(255,255,255,0))` }}
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
        style={{ insetInlineStart: 25, top: 19, margin: 0, fontSize: textPx(11), fontWeight: 700, letterSpacing: ".16em", lineHeight: 1, color: labelColor, textShadow }}
      >
        {t("Water")}
      </p>
      <p
        className="absolute tabular-nums"
        style={{ insetInlineStart: 25, top: 37, margin: 0, fontSize: textPx(29), fontWeight: 800, lineHeight: 1, letterSpacing: "-0.035em", color: valueColor, textShadow }}
      >
        {t("{n} L", { n: (water / 1000).toFixed(1) })}
      </p>
      <p
        className="absolute"
        style={{ insetInlineStart: 25, top: 70, margin: 0, fontSize: textPx(13.5), fontWeight: 500, lineHeight: 1.2, whiteSpace: "nowrap", color: subColor, textShadow }}
      >
        {subLabel}
      </p>

      <span
        className="absolute flex items-center rounded-full tabular-nums"
        style={{
          insetInlineEnd: 21,
          top: 15,
          height: 28,
          padding: "0 14px",
          fontSize: textPx(13.5),
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
            style={{ insetInlineEnd: 11, top: 12, display: "block" }}
          >
            <path d={SPARKLE_PATH} fill="#FFE9B0" />
          </svg>
          <svg
            width={6}
            height={6}
            viewBox="0 0 24 24"
            className="absolute cent-water-sparkle"
            style={{ insetInlineEnd: 9, top: 30, display: "block", animationDelay: "0.6s" }}
          >
            <path d={SPARKLE_PATH} fill="#FFF3D4" />
          </svg>
        </>
      )}

      {/* Goal marker: a hairline beside the goal figure. */}
      <span className="absolute flex items-stretch" style={{ insetInlineEnd: 21, top: 82, gap: 8 }}>
        <span style={{ width: 1, background: "#FFFFFF", flex: "none" }} />
        <span className="flex flex-col justify-center" style={{ fontSize: textPx(11), fontWeight: 500, lineHeight: 1.16, color: goalColor }}>
          <span>{t("{n} L", { n: (waterGoalMl / 1000).toFixed(1) })}</span>
          <span>{t("Goal")}</span>
        </span>
      </span>
    </div>
  );
};

export const HomeWidget: React.FC<{
  widget: WidgetConfig;
  onWaterClick?: () => void;
  onGymPassesClick?: () => void;
  /** While the board is being edited the tile does nothing of its own (WidgetShell). */
  editMode?: boolean;
}> = ({ widget, onWaterClick, editMode = false }) => {
  const navigate = useNavigate();
  const { user, water, waterGoalMl, foodLog, nutritionGoal, selectedDate, recoverySensitive, recoveryModePending, logWaterDrink, today, authUserId } = useApp();
  const isLarge = widget.size === "large";
  const size = widget.size;
  // Water quick-add on the small tile: one tap adds a glass, and a tap in
  // flight cannot add a second one.
  const [addingWater, setAddingWater] = React.useState(false);
  // Round D O4: the quick-add's outcome (it used to fail silently).
  const [waterToast, setWaterToast] = React.useState<{ message: string; error: boolean } | null>(null);

  const totals = sumNutrition(foodLog.filter((e) => e.date === selectedDate));
  const targets = targetsFromGoal(nutritionGoal);

  // While the board is being edited the tile does nothing of its own (a tap,
  // a click or Enter): only the edit controls act. See WidgetShell.
  const wrap = (onClick: () => void, content: React.ReactNode) =>
    editMode ? (
      <div className="h-full">{content}</div>
    ) : (
      <div onClick={onClick} role="button" tabIndex={0} className="tap cursor-pointer h-full">
        {content}
      </div>
    );

  // Small: 114 tall, padding 11px 12px. Large: 150 tall, padding 14px 16px.
  // HO1.1: both fill the width their grid span gives them.
  const shell = (bg: string, content: React.ReactNode) =>
    isLarge ? (
      <div className="w-full h-[150px] box-border rounded-[15px] flex flex-col p-3.5" style={{ background: bg }}>
        {content}
      </div>
    ) : (
      <div className="w-full h-[114px] box-border rounded-[15px] flex flex-col px-3 py-[11px]" style={{ background: bg }}>
        {content}
      </div>
    );

  /**
   * Task X follow-up: a tile whose figure must not show until the account's
   * recovery setting is known on this browser. Same frame, two soft bars,
   * no number; nothing to open yet.
   */
  const pendingCard = (bg: string, label: string) =>
    wrap(
      () => undefined,
      shell(
        bg,
        <>
          <p className={`${capsLabel} text-charcoal/[0.42] dark:text-charcoal/[0.55]`}>{label}</p>
          <div className="flex-1 flex flex-col justify-center gap-2" aria-busy="true">
            <span className="h-4 w-16 rounded-full bg-charcoal/[0.07] animate-skeleton-pulse" />
            <span className="h-3 w-24 max-w-full rounded-full bg-charcoal/[0.05] animate-skeleton-pulse" />
          </div>
        </>
      )
    );

  switch (widget.type) {
    case "steps":
      return <StepsWidget size={size} editMode={editMode} />;
    case "weight":
      return <WeightWidget size={size} editMode={editMode} />;
    case "sleep":
      return <SleepWidget size={size} editMode={editMode} />;
    case "workout":
      return <WorkoutWidget size={size} editMode={editMode} />;
    case "heartRate":
      return <HeartRateWidget size={size} editMode={editMode} />;
    case "habits":
      return <HabitsWidget size={size} editMode={editMode} />;
    case "journal":
      return <JournalWidget size={size} editMode={editMode} />;
    case "meditation":
      return <MeditationWidget size={size} editMode={editMode} />;
    case "cycle":
      return <CycleWidget size={size} editMode={editMode} />;

    // ---------------------------------------------------------------- Water
    case "water": {
      const pct = water / waterGoalMl;
      const onClick = onWaterClick ?? (() => navigate("/app/health"));
      if (!isLarge) {
        // SMALL WATER (2026-10-02, replacing decision 7's "always large"):
        // today's amount against the goal, a slim progress bar, and one
        // quick-add tap (+250 ml, the middle of the Add Metric sheet's quick
        // amounts). The button's tap never reaches the tile's own (which
        // opens the water sheet). Inert in edit mode with the rest of the tile.
        const quickAdd = async (e: React.MouseEvent) => {
          e.stopPropagation();
          if (addingWater) return;
          // Round D O4: offline, the glass goes into the device queue the
          // water sheet uses, and is sent when the connection is back. Online
          // it is one log_water call. The glass is filed under the selected
          // day (now for today, midday for an earlier day) and keeps one id,
          // so a lost answer replays as already_saved.
          const loggedAt = selectedDate === today ? new Date() : new Date(`${selectedDate}T12:00:00`);
          const requestId = newQueueId();
          const queue = () => {
            if (!authUserId) return;
            enqueueLog(authUserId, { kind: "water", ml: WATER_QUICK_ADD_ML, day: selectedDate, loggedAt: loggedAt.toISOString() }, requestId);
            setWaterToast({ message: SAVED_ON_DEVICE, error: false });
          };
          if (browserOffline()) return queue();
          setAddingWater(true);
          const result = await logWaterDrink(WATER_QUICK_ADD_ML, loggedAt, requestId);
          setAddingWater(false);
          if (result.ok) return;
          if (isOfflineFailure(result)) return queue();
          setWaterToast({ message: result.message, error: true });
        };
        // The toast sits outside the tile's tap target: a portal still
        // bubbles React clicks to its parents, which would open the sheet.
        const toast = (
          <Toast
            open={waterToast !== null}
            message={waterToast?.message ?? ""}
            tone={waterToast?.error ? "error" : "default"}
            onExpire={() => setWaterToast(null)}
          />
        );
        return <>{wrap(
          onClick,
          shell(
            "rgba(143,192,232,.17)",
            <>
              <p className={`${capsLabel} text-[#3F6F98] dark:text-[#9CC8EE]`}>{t("Water")}</p>
              <div className="flex-1 flex flex-col justify-center min-h-0">
                <span className="text-[17px] font-extrabold leading-none tracking-[-0.03em] text-charcoal tabular-nums whitespace-nowrap">
                  {t("{n} L", { n: (water / 1000).toFixed(1) })}
                </span>
                <span className="text-[9.5px] font-semibold mt-[4px] whitespace-nowrap text-[#3F6F98] dark:text-[#9CC8EE]">
                  {t("of {n} L", { n: (waterGoalMl / 1000).toFixed(1) })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex-1 min-w-0 h-[5px] rounded-full bg-charcoal/[0.08] overflow-hidden">
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(100, pct * 100)}%`, background: "#4A85C4" }} />
                </span>
                <button
                  type="button"
                  onClick={quickAdd}
                  disabled={addingWater}
                  aria-label={t("Add {n} ml of water", { n: WATER_QUICK_ADD_ML })}
                  className="relative shrink-0 h-[26px] px-2 rounded-full text-[10px] font-bold text-white whitespace-nowrap disabled:opacity-60"
                  style={{ background: "#3F6F98", touchAction: "manipulation" }}
                >
                  {/* a 44px hit area around the visible pill */}
                  <span aria-hidden className="absolute -inset-[9px]" />
                  {t("+{n} ml", { n: WATER_QUICK_ADD_ML })}
                </button>
              </div>
            </>
          )
        )}{toast}</>;
      }
      // Master handover item 7: the large tile is LargeWaterWidget above.
      return wrap(onClick, <LargeWaterWidget water={water} waterGoalMl={waterGoalMl} pct={pct} />);
    }


    // ----------------------------------------------------------- Nutrition
    case "nutrition": {
      const onClick = () => navigate("/app/food");
      if (recoveryModePending) return pendingCard("rgb(var(--th-aea1dc) / .16)", t("Food"));
      if (recoverySensitive) {
        // Recovery-sensitive mode: the same neutral summary the Food tab
        // shows — what was logged, never calories or macros.
        const logged = foodLog.filter((e) => e.date === selectedDate).length;
        return wrap(
          onClick,
          shell(
            "rgb(var(--th-aea1dc) / .16)",
            <>
              <p className={`${capsLabel} text-primary-deep-text/[0.68] dark:text-primary-deep-text`}>{t("Food")}</p>
              <div className="flex-1 flex flex-col justify-center min-h-0">
                <p className="text-[12px] font-semibold text-charcoal leading-snug">
                  {logged === 0 ? t("Nothing logged yet today") : tn(logged, "{n} item logged today", "{n} items logged today")}
                </p>
                {isLarge && (
                  <p className="mt-1 text-[10.5px] text-charcoal-faint leading-snug">
                    {t("Meals, notes, and how you're feeling, no calorie counting required.")}
                  </p>
                )}
              </div>
            </>
          )
        );
      }
      const macros = [
        { label: tk("Protein"), color: "rgb(var(--c-team-lavender-deep))", consumed: totals.protein, target: targets.protein },
        { label: tk("Carbs"), color: "rgb(var(--c-team-lavender))", consumed: totals.carbs, target: targets.carbs },
        { label: tk("Fat"), color: "rgb(var(--c-teal))", consumed: totals.fat, target: targets.fat },
      ];
      const kcalLeft = Math.max(0, Math.round(targets.calories - totals.calories));
      if (!isLarge) {
        // SMALL FOOD (2026-10-02, replacing decision 7's "always large"):
        // today's calories against the target, with a slim progress bar,
        // matching the small water tile.
        const kcalPct = targets.calories > 0 ? Math.min(100, (totals.calories / targets.calories) * 100) : 0;
        return wrap(
          onClick,
          shell(
            "rgb(var(--th-aea1dc) / .16)",
            <>
              <p className={`${capsLabel} text-primary-deep-text/[0.68] dark:text-primary-deep-text`}>{t("Food")}</p>
              <div className="flex-1 flex flex-col justify-center min-h-0">
                <span className="text-[17px] font-extrabold leading-none tracking-[-0.03em] text-charcoal tabular-nums whitespace-nowrap">
                  {Math.round(totals.calories)}
                </span>
                <span className="text-[9.5px] font-semibold mt-[4px] whitespace-nowrap text-primary-deep-text/[0.78] dark:text-primary-deep-text">
                  {t("of {n} kcal", { n: targets.calories })}
                </span>
              </div>
              <span className="block h-[5px] rounded-full bg-charcoal/[0.08] overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${kcalPct}%`, background: "rgb(var(--c-team-lavender-deep))" }} />
              </span>
            </>
          )
        );
      }
      return wrap(
        onClick,
        shell(
          "rgb(var(--th-aea1dc) / .16)",
          <>
            <div className="flex items-center justify-between gap-2.5">
              <p className={`${capsLabel} text-primary-deep-text/[0.68] dark:text-primary-deep-text`}>{t("Food")}</p>
              <span className="flex-1 flex items-baseline justify-end gap-1.5 min-w-0">
                <span className="text-[22px] font-extrabold leading-none tracking-[-0.035em] text-charcoal tabular-nums">
                  {Math.round(totals.calories)}
                </span>
                <span className="text-[9.5px] whitespace-nowrap text-primary-deep-text/[0.68] dark:text-primary-deep-text">
                  {t("of {n} kcal", { n: targets.calories })}
                  {/* The large widget has the room to say whose number this
                      is; the small one shows the figure alone, and the Food
                      tab it opens onto carries the same note. */}
                  {isReferenceOnlyTarget(user) && (
                    <span className="block text-[8.5px] leading-[1.3] text-primary-deep-text/[0.55] dark:text-primary-deep-text">
                      {REFERENCE_INTAKE_NOTE}
                    </span>
                  )}
                </span>
              </span>
              <span className={`${badge} text-primary-deep-text bg-team-lavender/30 dark:text-charcoal`}>{t("{n} kcal left", { n: kcalLeft })}</span>
            </div>
            <div className="flex-1 flex flex-col justify-evenly min-h-0 mt-2">
              {macros.map((m) => (
                <div key={m.label} className="flex items-center gap-[9px]">
                  <span className="flex items-center gap-[5px] w-[62px] shrink-0 text-[10px] font-bold text-charcoal">
                    <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ background: m.color }} />
                    {t(m.label)}
                  </span>
                  <span className="flex-1 min-w-0 block h-[13px] rounded-[5px] bg-charcoal/[0.07] overflow-hidden">
                    <span
                      className="block h-full rounded-[5px]"
                      style={{ width: `${Math.min(100, (m.consumed / (m.target || 1)) * 100)}%`, background: m.color }}
                    />
                  </span>
                  <span className="w-14 shrink-0 text-end text-[9px] text-primary-deep-text/[0.68] dark:text-primary-deep-text tabular-nums">
                    {t("{consumed} / {target}g", { consumed: Math.round(m.consumed), target: Math.round(m.target) })}
                  </span>
                </div>
              ))}
            </div>
          </>
        )
      );
    }


    // GYM PASSES USED TO BE A WIDGET HERE, and it drew a QR square, a plan
    // name and a countdown for a pass bought from an invented gym with a
    // prototype payment. It comes back reading a server-issued pass once
    // payments exist (see git history).

    default:
      return null;
  }
};
