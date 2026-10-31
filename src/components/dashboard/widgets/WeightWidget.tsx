import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { WeightScaleIcon } from "../../icons/PartBIcons";
import { trendLabel, withinDays } from "../../../services/health-metrics/series";
import { isRtl } from "../../../i18n/core";
import { FadeValue, HeaderPill, HomeCard, HomeKeyframes, Line, staleLine, textPx, useHomeMode, useLoadingTimeout } from "./kit";

// HO1.W2 Weight (small, large) and HO1.W2·e. Colours: the metric table
// (--metric-weight-*, which follows the theme primary; V6-56 dark values).
// Recovery-sensitive mode hides the widget from the board (WidgetBoard, KEEP-SAFETY);
// while the setting is unknown the shared skeleton stands in (no number).

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};
const kg = (v: number) => (Math.round(v * 10) / 10).toFixed(1);

/** HO1.W2 #6 small sparkline, 52 x 20: line #9A8CD6, end point #5F5093 (measured). */
const Sparkline: React.FC<{ values: number[]; dark: boolean }> = ({ values, dark }) => {
  const w = 52;
  const h = 20;
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Round F (F10): in right to left, time runs from right to left (every x mirrored).
  const rtl = isRtl();
  const pts = values.map((v, i) => ({
    x: rtl ? w - (2 + (i * (w - 5)) / Math.max(1, values.length - 1)) : 2 + (i * (w - 5)) / Math.max(1, values.length - 1),
    y: max === min ? h / 2 : 2 + ((max - v) / (max - min)) * (h - 5),
  }));
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="qa-shape block" overflow="visible">
      <polyline
        points={pts.map((p) => `${p.x},${p.y}`).join(" ")}
        fill="none"
        stroke={dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-9a8cd6))"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r={2.6} fill={dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-5f5093))"} />
    </svg>
  );
};

/**
 * HO1.W2-L #8 trend, 200 x 90 at 142, 42.5: the last 5 weigh-ins (one per
 * day, last of the day), line + points, values on the first and last points,
 * the dashed goal line labelled "Goal 74", dates under the first, middle and
 * last point. Positions measured from png/home/HO1.W2-L.png: points x 14 +
 * 43.75 i, values 12.5 (top) to the goal line at 66.5; dates on y 82.5.
 * Text sizes in the SVG are UNSPECIFIED by the table (extraction 16/20.8 on
 * a scaled SVG): measured 9/700 values, 8/700 goal, 7.5/500 dates.
 */
const TrendChart: React.FC<{ points: { date: string; value: number }[]; goal: number | null; dark: boolean }> = ({ points, goal, dark }) => {
  // Round F (F10): in right to left, time runs from right to left. Every x is
  // mirrored and the nudges (dx) flip; SVG text anchors are logical, so the
  // labels follow.
  const rtl = isRtl();
  const mx = (x: number) => (rtl ? 200 - x : x);
  const nudge = (d: number) => (rtl ? -d : d);
  const xs = (i: number) => mx(14 + (i * 175) / Math.max(1, points.length - 1));
  const values = points.map((p) => p.value);
  const top = Math.max(...values, goal ?? -Infinity);
  const bottom = Math.min(...values, goal ?? Infinity);
  const yTop = 12.5;
  const yBottom = goal !== null ? 66.5 : 60;
  const y = (v: number) => (top === bottom ? (yTop + yBottom) / 2 : yTop + ((top - v) / (top - bottom)) * (yBottom - yTop));
  const line = dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-9a8cd6))";
  const deep = dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-5f5093))";
  const card = dark ? "#303141" : "#FFFFFF";
  const mid = Math.floor((points.length - 1) / 2);
  const label = (v: number, i: number) => (
    <text
      x={xs(i)}
      y={y(v) - 7}
      textAnchor={i === points.length - 1 ? "end" : "middle"}
      dx={i === points.length - 1 ? nudge(4.5) : 0}
      style={{ fontSize: textPx(9), fontWeight: 700 }}
      fill="rgb(var(--c-charcoal))"
    >
      {kg(v)}
    </text>
  );
  return (
    <svg width={200} height={90} viewBox="0 0 200 90" aria-hidden className="qa-shape block" overflow="visible">
      {goal !== null && (
        <>
          <line x1={0} x2={200} y1={66.5} y2={66.5} stroke={dark ? "rgba(195,179,251,0.35)" : "#CCC6E0"} strokeWidth={1} strokeDasharray="4 4" />
          <text x={mx(200)} y={62} textAnchor="end" style={{ fontSize: textPx(8), fontWeight: 700 }} fill={deep}>
            Goal {kg(goal).replace(/\.0$/, "")}
          </text>
        </>
      )}
      <polyline points={points.map((p, i) => `${xs(i)},${y(p.value)}`).join(" ")} fill="none" stroke={line} strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) =>
        i === points.length - 1 ? (
          <circle key={p.date} cx={xs(i)} cy={y(p.value)} r={4.4} fill={deep} />
        ) : (
          <circle key={p.date} cx={xs(i)} cy={y(p.value)} r={3.2} fill={card} stroke={line} strokeWidth={1.3} />
        )
      )}
      {label(points[0].value, 0)}
      {points.length > 1 && label(points[points.length - 1].value, points.length - 1)}
      {[0, mid, points.length - 1]
        .filter((v, i, a) => a.indexOf(v) === i)
        .map((i) => (
          <text
            key={`d${i}`}
            x={xs(i)}
            y={86}
            textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
            dx={i === 0 ? nudge(-7) : i === points.length - 1 ? nudge(9) : 0}
            style={{ fontSize: textPx(7.5), fontWeight: 500 }}
            fill="rgb(var(--c-charcoal-faint))"
          >
            {shortDate(points[i].date)}
          </text>
        ))}
    </svg>
  );
};

export const WeightWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { metricValues, healthSeries, nutritionGoal, today, recoveryModePending, metricsLoadedAt, metricsError, reloadMetrics } = useApp();
  const { dark, online } = useHomeMode();
  const isLarge = size === "large";
  const weight = metricValues.weight;
  const loading = recoveryModePending || (weight === null && metricsLoadedAt === null && !metricsError);
  const timedOut = useLoadingTimeout(loading && !recoveryModePending);
  const goal =
    nutritionGoal.weightGoal !== "maintain" && nutritionGoal.desiredWeightConfirmed && nutritionGoal.desiredWeightKg
      ? nutritionGoal.desiredWeightKg
      : null;

  if (recoveryModePending || weight === null) {
    let state: "empty" | "loading" | "error" | "offline" = "empty";
    if (recoveryModePending || (loading && !timedOut)) state = online || recoveryModePending ? "loading" : "offline";
    else if (metricsError || timedOut) state = online ? "error" : "offline";
    return (
      <HomeCard
        size={size}
        editMode={editMode}
        metric="weight"
        icon={WeightScaleIcon}
        label="Weight"
        state={state}
        emptyTitle="No readings yet"
        emptyHint={isLarge ? "Log your weight to start tracking" : "Log your weight"}
        onRetry={reloadMetrics}
        // HE1.7.1 Log weight opens from the Weight page (Health B owns the sheet's entry points).
        onOpen={recoveryModePending ? undefined : () => navigate("/app/health/weight")}
      />
    );
  }

  const week = withinDays(healthSeries.weight, 7, today);
  const weekly = trendLabel(week);
  const last5 = healthSeries.weight.history.slice(-5);
  const stale = metricsError || !online ? staleLine(metricsLoadedAt, online) : null;
  const value = kg(weight);
  const toGoal = goal !== null ? Math.abs(weight - goal) : null;

  const smallContext = [weekly, goal !== null ? `goal ${kg(goal).replace(/\.0$/, "")}` : null].filter(Boolean).join(" · ");
  const change5 = last5.length >= 2 ? last5[last5.length - 1].value - last5[0].value : null;
  const changeLine =
    change5 === null
      ? null
      : change5 === 0
      ? `No change in ${last5.length} weigh-ins`
      : `${change5 < 0 ? "↓" : "↑"} ${kg(Math.abs(change5))} kg in ${last5.length} weigh-ins`;
  const goalLine = toGoal === null ? null : toGoal < 0.05 ? "At your goal" : `${kg(toGoal)} kg to goal`;

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        metric="weight"
        icon={WeightScaleIcon}
        label="Weight"
        onOpen={() => navigate("/app/health/weight")}
        ariaLabel={`Weight, ${value} kilograms${weekly ? `, ${weekly}` : ""}${goal !== null ? `, goal ${kg(goal)} kilograms` : ""}`}
        value={<FadeValue k={value} value={value} />}
        unit="kg"
        // Small: value 49 (header ends 31: gap 18), context 79; sparkline 52 x 20 at 111.5, 51.
        // Large: value 52.5 (gap 19.5), context 92.5; trend 200 x 90 at 142, 42.5.
        bodyGap={isLarge ? 19.5 : 18}
        headerRight={isLarge && weekly ? <HeaderPill ink={dark ? "#B8B3C7" : "rgb(var(--metric-weight-ink))"} dark={dark}>{weekly}</HeaderPill> : undefined}
        aside={
          isLarge ? (
            last5.length >= 2 ? (
              <span className="block" style={{ marginTop: -10 }}>
                <TrendChart points={last5} goal={goal} dark={dark} />
              </span>
            ) : undefined
          ) : undefined
        }
        // Small: the sparkline sits beside the value only (the context line
        // runs the full width under both), so it is placed on its own layer:
        // 111.5, 51 in a 175.5-wide card = 12 from the right edge.
        children={
          !isLarge && last5.length >= 2 ? (
            <span className="absolute" style={{ insetInlineEnd: 12, top: 51, zIndex: 1 }}>
              <Sparkline values={last5.map((p) => p.value)} dark={dark} />
            </span>
          ) : undefined
        }
        context={
          isLarge ? (
            <span className="block">
              {stale ? <Line>{stale}</Line> : changeLine && <Line>{changeLine}</Line>}
              {!stale && goalLine && <Line style={{ marginTop: 6, color: "rgb(var(--c-charcoal-soft))" }}>{goalLine}</Line>}
            </span>
          ) : stale || smallContext ? (
            <Line>{stale ?? (weekly ? smallContext : smallContext.replace(/^goal/, "Goal"))}</Line>
          ) : undefined
        }
      />
    </>
  );
};
