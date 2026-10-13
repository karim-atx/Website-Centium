import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Footprints } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { valueOn } from "../../../services/health-metrics/periods";
import { NoDeviceSheet } from "../NoDeviceSheet";
import { useSourceConnected, useStepsGoalOn } from "./data";
import { FadeValue, HeaderPill, HomeCard, HomeKeyframes, Line, staleLine, useHomeMode, useLoadingTimeout } from "./kit";

// HO1.W1 Steps (small and large) and HO1.W1·e. Literal values: home-handover.md
// HO1.W1 tables; trail geometry measured from png/home/HO1.W1-S.png and
// HO1.W1-L.png (2x, pt = px / 2): prints filled #7FA06A, outlines the same
// green as a stroke, flag #55733F.

/** V6-139: stride 0.76 m (handover), not the repo's 0.762. */
const STRIDE_M = 0.76;

// SMALL trail (151 x 20 at 12, 66): 10 single prints in a straight line,
// alternating left / right with a 4 pt stagger, x = 7 + 13.2 i, y 8.25 / 12.25;
// each print 9.5 x 5 (sole + toe, walking right); flag pole at 139.5 (1 wide,
// y 1-20.5) with its pennant to 147.5, y 1-7.5.
const SMALL_PRINTS = Array.from({ length: 10 }, (_, i) => ({ x: 7 + i * 13.2, y: i % 2 === 0 ? 8.25 : 12.25, a: 0 }));

// LARGE trail (200 x 72 at 142, 51.5): the drawn curve's print centres (12
// prints, 8 filled at 68%; the table says 14, the drawn frame shows 12, the
// markup wins) and the goal ring (dashed, r 5.5) at 195.75, 34.25.
const LARGE_CENTRES: [number, number][] = [
  [7, 52.25], [28, 52.75], [39.75, 35.75], [59.75, 38.25], [72.75, 23], [91.5, 28.75],
  [106.5, 16.75], [122.75, 26], [140, 17.25], [154, 30], [172.75, 24.75], [187.75, 39.5],
];
const LARGE_PRINTS = LARGE_CENTRES.map(([x, y], i, all) => {
  // Heading: along the path, from the print before the previous foot to the
  // one after (same foot both sides, so the zigzag cancels out).
  const a = all[Math.max(0, Math.min(i - 1, all.length - 3))];
  const b = all[Math.min(all.length - 1, Math.max(i + 1, 2))];
  return { x, y, a: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI };
});

/** One print: sole ellipse + toe dot, heading right before rotation. Large = small / 0.62 (board note). */
const Print: React.FC<{ x: number; y: number; a: number; scale: number; filled: boolean; outline: string; animateDelay: number | null }> = ({
  x,
  y,
  a,
  scale,
  filled,
  outline,
  animateDelay,
}) => {
  const s = scale;
  return (
    <g transform={`translate(${x} ${y}) rotate(${a})`}>
      <ellipse
        cx={-1.2 * s}
        cy={0}
        rx={3.4 * s}
        ry={2.45 * s}
        fill="rgb(var(--metric-steps-main))"
        fillOpacity={filled ? 1 : 0}
        stroke={filled ? "none" : outline}
        strokeWidth={0.9}
        style={animateDelay !== null ? { animation: `hw-print-in 300ms cubic-bezier(0.22, 1, 0.36, 1) ${animateDelay}ms both` } : undefined}
      />
      <circle
        cx={3.6 * s}
        cy={0}
        r={1.15 * s}
        fill="rgb(var(--metric-steps-main))"
        fillOpacity={filled ? 1 : 0}
        stroke={filled ? "none" : outline}
        strokeWidth={0.8}
        style={animateDelay !== null ? { animation: `hw-print-in 300ms cubic-bezier(0.22, 1, 0.36, 1) ${animateDelay}ms both` } : undefined}
      />
    </g>
  );
};

/**
 * The trail. OURS-home-widget-motion #5: when the filled count rises, each
 * newly filled print fades from outline to fill, 120 ms apart, 300 ms each;
 * none on first render, none under Reduce motion.
 */
const FootTrail: React.FC<{ size: "small" | "large"; filledCount: number; reached: boolean; dark: boolean; reduce: boolean }> = ({
  size,
  filledCount,
  reached,
  dark,
  reduce,
}) => {
  const prints = size === "small" ? SMALL_PRINTS : LARGE_PRINTS;
  const prev = useRef<number | null>(null);
  const [rise, setRise] = useState<{ from: number; to: number } | null>(null);
  useEffect(() => {
    if (prev.current !== null && filledCount > prev.current && !reduce) setRise({ from: prev.current, to: filledCount });
    prev.current = filledCount;
  }, [filledCount, reduce]);
  // Outline: the fill green as a stroke (light, measured); dark #9CC285@50% (HE1 dark pattern, derived).
  const outline = dark ? "rgba(156,194,133,0.5)" : "rgb(var(--metric-steps-main))";
  const flag = "rgb(var(--metric-steps-ink))";
  const w = size === "small" ? 151 : 200;
  const h = size === "small" ? 20 : 72;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="qa-shape block shrink-0" overflow="visible">
      {prints.map((p, i) => (
        <Print
          key={i}
          {...p}
          scale={size === "small" ? 1 : 1 / 0.62}
          filled={i < filledCount}
          outline={outline}
          animateDelay={rise && i >= rise.from && i < rise.to ? (i - rise.from) * 120 : null}
        />
      ))}
      {size === "small" ? (
        <g fill={flag}>
          <rect x={139.5} y={1} width={1} height={19.5} />
          {/* The drawn frame fills the pennant below the goal too (68%), so it is always filled. */}
          <path d="M140.5 1 L147.5 4.25 L140.5 7.5 Z" />
        </g>
      ) : (
        <circle cx={195.75} cy={34.25} r={5.5} fill={reached ? flag : "none"} stroke={flag} strokeWidth={1} strokeDasharray="1.8 1.6" />
      )}
    </svg>
  );
};

export const StepsWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { healthSeries, stepsGoal: localGoal, selectedDate, today, metricsLoadedAt, metricsError, reloadMetrics } = useApp();
  // B1 metric_goal_on: the goal as it stood on the selected day; never set: the app's own goal.
  const goalOn = useStepsGoalOn(selectedDate);
  const stepsGoal = goalOn ?? localGoal;
  const { dark, reduce, online } = useHomeMode();
  const connected = useSourceConnected();
  const [sheet, setSheet] = useState(false);
  // K1: the board reads the day picked in the Home date selector.
  const steps = valueOn(healthSeries.steps, selectedDate);
  const loading = steps === null && metricsLoadedAt === null && !metricsError;
  const timedOut = useLoadingTimeout(loading);
  const isLarge = size === "large";
  const isToday = selectedDate === today;

  const open = () => navigate("/app/health/steps");

  let state: "ready" | "empty" | "loading" | "error" | "offline" = "ready";
  if (steps === null) {
    if (loading && !timedOut) state = online ? "loading" : "offline";
    else if (metricsError || timedOut) state = online ? "error" : "offline";
    else state = "empty";
  }

  if (state !== "ready" || steps === null) {
    // HO1.W1·e: "Connect a source" (S) / "Connect Apple Health or Health
    // Connect" (L); a phone that synced before: "Nothing synced today" (OURS).
    const hint = connected ? "Nothing synced today" : isLarge ? "Connect Apple Health or Health Connect" : "Connect a source";
    return (
      <>
        <HomeKeyframes />
        <HomeCard
          size={size}
          editMode={editMode}
          metric="steps"
          icon={Footprints}
          label="Steps"
          state={state}
          emptyTitle="No readings yet"
          emptyHint={hint}
          onRetry={reloadMetrics}
          onOpen={state === "empty" ? (connected ? open : () => setSheet(true)) : open}
          ariaLabel={state === "empty" ? `Steps, no readings yet. ${hint}` : undefined}
        />
        <NoDeviceSheet open={sheet} metric="steps" onClose={() => setSheet(false)} />
      </>
    );
  }

  const pct = stepsGoal > 0 ? steps / stepsGoal : 0;
  const pctLabel = Math.round(pct * 100);
  const reached = steps >= stepsGoal;
  const filled = Math.min(size === "small" ? 10 : LARGE_PRINTS.length, Math.round(pct * (size === "small" ? 10 : LARGE_PRINTS.length)));
  const km = ((steps * STRIDE_M) / 1000).toFixed(1);
  const stale = metricsError || !online ? staleLine(metricsLoadedAt, online) : null;

  const graphic = <FootTrail size={size} filledCount={filled} reached={reached} dark={dark} reduce={reduce} />;
  const ariaLabel = `Steps, ${steps.toLocaleString()} ${isToday ? "today" : "that day"}, ${pctLabel}% of ${stepsGoal.toLocaleString()}`;

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        metric="steps"
        icon={Footprints}
        label="Steps"
        onOpen={open}
        ariaLabel={ariaLabel}
        value={<FadeValue k={steps} value={steps.toLocaleString()} />}
        // Small: value 36, trail 66, context 92 (header ends 31: gap 5).
        // Large: value 52.5 (header ends 33: gap 19.5), context 92.5, trail at 142, 51.5.
        bodyGap={isLarge ? 19.5 : 5}
        headerRight={isLarge ? <HeaderPill ink={dark ? "#B8B3C7" : "rgb(var(--metric-steps-ink))"} dark={dark}>{`${pctLabel}% of goal`}</HeaderPill> : undefined}
        graphic={isLarge ? undefined : graphic}
        graphicHeight={20}
        aside={isLarge ? <span style={{ marginTop: -1, display: "block" }}>{graphic}</span> : undefined}
        context={
          isLarge ? (
            <span className="block">
              <Line>{stale ?? `of ${stepsGoal.toLocaleString()} · ${km} km`}</Line>
              {/* Second line #5B5349 as drawn (PNG measured; the table lists both lines in the metric ink). */}
              {!stale && (
                <Line style={{ marginTop: 6, color: "rgb(var(--c-charcoal-soft))" }}>
                  {reached ? "Goal reached" : `${(stepsGoal - steps).toLocaleString()} to go`}
                </Line>
              )}
            </span>
          ) : (
            <Line>{stale ?? `${pctLabel}% of ${stepsGoal.toLocaleString()}`}</Line>
          )
        }
      />
    </>
  );
};
