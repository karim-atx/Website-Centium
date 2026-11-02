import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Moon } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { valueOn } from "../../../services/health-metrics/periods";
import { shiftDate as shiftDay } from "../../../utils/date";
import { NoDeviceSheet } from "../NoDeviceSheet";
import { t, tk } from "../../../i18n/core";
import { useSourceConnected } from "./data";
import { FadeValue, HeaderPill, HomeCard, HomeKeyframes, Line, linePx, staleLine, textPx, useHomeMode, useLoadingTimeout } from "./kit";

// HO1.W4 Sleep (small, large) and HO1.W4·e. Stage colours from HE1.3
// (measured): Awake #E4E1EE, REM #C8DFDB (#A2C8C2@45%), Light #A2C8C2, Deep
// #4F8F8A; dark Awake #3A3D48*, REM #A2C8C2@45%, Light #A2C8C2, Deep #4F8F8A
// (dark for REM / Light / Deep UNSPECIFIED: HE1 dark main, derived).

const fmt = (hours: number) => {
  const total = Math.round(hours * 60);
  return t("{h}h {m}m", { h: Math.floor(total / 60), m: String(total % 60).padStart(2, "0") });
};
const fmtMin = (m: number) => t("{h}h {m}m", { h: Math.floor(m / 60), m: String(m % 60).padStart(2, "0") });

function stageColours(dark: boolean) {
  return {
    Awake: dark ? "#3A3D48" : "rgb(var(--metric-sleep-stage-awake))",
    REM: dark ? "rgba(162,200,194,0.45)" : "#C8DFDB",
    Light: "#A2C8C2",
    Deep: "#4F8F8A",
  } as const;
}

/** Average hours of the nights on record in [from, to], or null under 3 nights (backend §5 assumption). */
function weekAverage(history: { date: string; value: number }[], from: string, to: string): number | null {
  const nights = history.filter((p) => p.date >= from && p.date <= to);
  if (nights.length < 3) return null;
  return nights.reduce((s, p) => s + p.value, 0) / nights.length;
}

export const SleepWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { healthSeries, sleepNights, selectedDate, metricsLoadedAt, metricsError, reloadMetrics } = useApp();
  const { dark, online } = useHomeMode();
  const connected = useSourceConnected();
  const [sheet, setSheet] = useState(false);
  const isLarge = size === "large";
  // K1: the night that ended on the selected day.
  const hours = valueOn(healthSeries.sleep, selectedDate);
  const detail = sleepNights.find((n) => n.date === selectedDate) ?? null;
  const loading = hours === null && metricsLoadedAt === null && !metricsError;
  const timedOut = useLoadingTimeout(loading);
  const open = () => navigate("/app/health/sleep");

  if (hours === null) {
    let state: "empty" | "loading" | "error" | "offline" = "empty";
    if (loading && !timedOut) state = online ? "loading" : "offline";
    else if (metricsError || timedOut) state = online ? "error" : "offline";
    // HO1.W4·e: "Connect a source" (S) / "Connect a source to see your sleep"
    // (L); #7a: a source is connected but recorded nothing that night.
    const hint = connected ? t("No sleep recorded last night") : isLarge ? t("Connect a source to see your sleep") : t("Connect a source");
    return (
      <>
        <HomeCard
          size={size}
          editMode={editMode}
          metric="sleep"
          icon={Moon}
          label={t("Sleep")}
          state={state}
          emptyTitle={t("No readings yet")}
          emptyHint={hint}
          onRetry={reloadMetrics}
          onOpen={state === "empty" && !connected ? () => setSheet(true) : open}
          ariaLabel={state === "empty" ? t("Sleep, no readings yet. {hint}", { hint }) : undefined}
        />
        <NoDeviceSheet open={sheet} metric="sleep" onClose={() => setSheet(false)} />
      </>
    );
  }

  const colours = stageColours(dark);
  const stages = detail?.stages
    ? ([
        [tk("Awake"), detail.stages.awakeMin],
        [tk("REM"), detail.stages.remMin],
        [tk("Light"), detail.stages.lightMin],
        [tk("Deep"), detail.stages.deepMin],
      ] as const)
    : null;
  const total = stages ? stages.reduce((s, [, m]) => s + m, 0) || 1 : 1;
  const score = detail?.score ?? null;

  // "↑ 0.3 h vs last wk": this Monday-to-selected-day window against the 7
  // days before it; hidden when either has under 3 nights.
  const thisWeek = weekAverage(healthSeries.sleep.history, shiftDay(selectedDate, -6), selectedDate);
  const lastWeek = weekAverage(healthSeries.sleep.history, shiftDay(selectedDate, -13), shiftDay(selectedDate, -7));
  const delta = thisWeek !== null && lastWeek !== null ? Math.round((thisWeek - lastWeek) * 10) / 10 : null;
  const trend = delta === null ? null : delta === 0 ? t("Same as last wk") : t("{arrow} {h} h vs last wk", { arrow: delta > 0 ? "↑" : "↓", h: Math.abs(delta).toFixed(1) });
  const trendAria = delta === null ? null : delta === 0 ? trend : delta > 0 ? t("up {h} h vs last wk", { h: Math.abs(delta).toFixed(1) }) : t("down {h} h vs last wk", { h: Math.abs(delta).toFixed(1) });
  const stale = metricsError || !online ? staleLine(metricsLoadedAt, online) : null;
  const smallContext = stale ?? [score !== null ? t("Score {score}", { score }) : null, trend].filter(Boolean).join(" · ");
  const value = fmt(hours);

  const bar = (height: number) =>
    stages ? (
      <span className="flex w-full" style={{ gap: 2, height }} aria-hidden>
        {stages.map(([k, m]) =>
          m > 0 ? <span key={k} className="block rounded-full" style={{ flex: `${m / total} 1 0`, minWidth: height, background: colours[k] }} /> : null
        )}
      </span>
    ) : (
      <span className="block" style={{ height }} />
    );

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        metric="sleep"
        icon={Moon}
        label={t("Sleep")}
        onOpen={open}
        ariaLabel={[t("Sleep, {value}", { value }), score !== null ? t("score {score}", { score }) : null, trendAria].filter(Boolean).join(t(", "))}
        value={<FadeValue k={value} value={value} />}
        // Small: value 43 (gap 12), bar 73 (h 6), context 85. Large: value 43.4 (gap 10.4), bar 86.4 (h 7), values 102.3, labels 119.9.
        bodyGap={isLarge ? 10.4 : 12}
        headerRight={isLarge && score !== null ? <HeaderPill ink={dark ? "#B8B3C7" : "rgb(var(--metric-sleep-ink))"} dark={dark}>{t("Score {score}", { score })}</HeaderPill> : undefined}
        // Large: the stage block is the full-width graphic row (value ends
        // 77.4 + gap 6 = 83.4; the bar sits at 86.4, so 3 inside the row).
        graphic={
          isLarge ? (
            stages ? (
              <span className="block self-start" style={{ width: "100%", marginTop: 3 }}>
                {bar(7)}
                <span className="grid" style={{ gridTemplateColumns: "repeat(4, 1fr)", marginTop: 8.9 }}>
                  {stages.map(([k, m]) => (
                    <span key={k} className="flex flex-col items-center min-w-0">
                      <span className="flex items-center" style={{ gap: 5 }}>
                        <span className="block rounded-full shrink-0" style={{ width: 6, height: 6, background: colours[k] }} aria-hidden />
                        <span style={{ fontSize: textPx(12), lineHeight: linePx(15.6), fontWeight: 700, color: "rgb(var(--c-charcoal))", whiteSpace: "nowrap" }}>
                          {fmtMin(m)}
                        </span>
                      </span>
                      <span
                        style={{
                          marginTop: 2,
                          fontSize: textPx(9),
                          lineHeight: linePx(11.7),
                          fontWeight: 600,
                          color: dark ? "#B8B3C7" : "rgb(var(--metric-sleep-ink))",
                        }}
                      >
                        {t(k)}
                      </span>
                    </span>
                  ))}
                </span>
              </span>
            ) : undefined
          ) : (
            bar(6)
          )
        }
        graphicHeight={isLarge ? 48.2 : 6}
        context={isLarge ? (stale ? <Line>{stale}</Line> : undefined) : smallContext ? <Line>{smallContext}</Line> : undefined}
      />
    </>
  );
};
