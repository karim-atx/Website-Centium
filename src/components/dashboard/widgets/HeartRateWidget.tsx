import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HeartPulse } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { valueOn } from "../../../services/health-metrics/periods";
import { HeartRateEKG } from "../../health/HeartRateEKG";
import { NoDeviceSheet } from "../NoDeviceSheet";
import { useHeartRateDay, useRestingBpm, useSourceConnected } from "./data";
import { FadeValue, HeaderPill, HomeCard, HomeKeyframes, Line, linePx, staleLine, textPx, useHomeMode, useLoadingTimeout } from "./kit";

// HO1.W7 Heart rate (small, large), HO1.W7·e and the HO1.W7 ECG v1 motion.
// V6-21: there is no resting-heart-rate source yet (Database B1
// activity_daily.resting_bpm, not on the local stack), so the reading is the
// day's latest sample labelled "Latest" where the frame says "Resting".
// The trace is a drawing timed to the bpm, not a medical ECG (backend §7).
// V6-07: no rhythm words anywhere (a single bpm is not a rhythm): the large
// line reads "Resting" (or "Latest") only; the trace colour still follows the bpm band.

/** HO1.W7-L #9-#11: the range track spans 40-180 bpm (proposal; the table leaves the scale UNSPECIFIED). */
const AXIS = { min: 40, max: 180 } as const;
const at = (bpm: number) => (Math.max(AXIS.min, Math.min(AXIS.max, bpm)) - AXIS.min) / (AXIS.max - AXIS.min);

export const HeartRateWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { healthSeries, selectedDate, today, metricsLoadedAt, metricsError, reloadMetrics } = useApp();
  const { dark, online } = useHomeMode();
  const connected = useSourceConnected();
  const [sheet, setSheet] = useState(false);
  const isLarge = size === "large";
  const isToday = selectedDate === today;
  const day = useHeartRateDay(selectedDate, metricsLoadedAt);
  // B1: activity_daily.resting_bpm when a source reported it ("Resting"); else the latest sample, "Latest" (V6-21).
  const resting = useRestingBpm(selectedDate);
  const word = resting !== null ? "Resting" : "Latest";
  const latest = resting ?? (day.samples.length ? day.samples[day.samples.length - 1] : valueOn(healthSeries.heartRate, selectedDate));
  const loading = latest === null && ((metricsLoadedAt === null && !metricsError) || day.loading);
  const timedOut = useLoadingTimeout(loading);
  const open = () => navigate("/app/health/heart-rate");

  if (latest === null) {
    let state: "empty" | "loading" | "error" | "offline" = "empty";
    if (loading && !timedOut) state = online ? "loading" : "offline";
    else if (metricsError || day.error || timedOut) state = online ? "error" : "offline";
    const hint = connected ? "Nothing synced today" : isLarge ? "Connect a source to see your heart rate" : "Connect a source";
    return (
      <>
        <HomeCard
          size={size}
          editMode={editMode}
          metric="heart-rate"
          icon={HeartPulse}
          label="Heart rate"
          state={state}
          emptyTitle="No readings yet"
          emptyHint={hint}
          onRetry={reloadMetrics}
          onOpen={state === "empty" && !connected ? () => setSheet(true) : open}
          ariaLabel={state === "empty" ? `Heart rate, no readings yet. ${hint}` : undefined}
        />
        <NoDeviceSheet open={sheet} metric="heart-rate" onClose={() => setSheet(false)} />
      </>
    );
  }

  const bpm = Math.round(latest);
  const low = day.samples.length > 1 ? Math.round(Math.min(...day.samples)) : null;
  const high = day.samples.length > 1 ? Math.round(Math.max(...day.samples)) : null;
  const stale = metricsError || !online ? staleLine(metricsLoadedAt, online) : null;
  const when = isToday ? " today" : "";
  const smallContext = stale ?? (low !== null && high !== null ? `${word} · ${low} to ${high}${when}` : word);
  // Card red #962F2F (dark: the HE1 table's #E2827E, V6-56).
  const ink = "rgb(var(--metric-heart-rate-ink))";
  const traceState = metricsError ? "error" : "ready";
  const ariaLabel = `Heart rate ${bpm} bpm, ${word.toLowerCase()}${low !== null ? `, ${low} to ${high}${when}` : ""}`;

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        metric="heart-rate"
        icon={HeartPulse}
        label="Heart rate"
        onOpen={open}
        ariaLabel={ariaLabel}
        value={<FadeValue k={bpm} value={bpm} />}
        unit="bpm"
        // Small: value 38 (gap 7), ECG 151 x 16 at 68, context 90.
        // Large: value 43.5 (gap 10.5), context 83.5; ECG 170 x 40 at 172, 49.5; range 107.5; labels 119.5.
        bodyGap={isLarge ? 10.5 : 7}
        headerRight={isLarge ? <HeaderPill ink={dark ? "#B8B3C7" : ink} dark={dark}>{word}</HeaderPill> : undefined}
        graphic={isLarge ? undefined : <HeartRateEKG bpm={bpm} height={16} width={151} strokeWidth={2} showLabel={false} state={traceState} />}
        graphicHeight={16}
        aside={
          isLarge ? (
            <span className="block" style={{ marginTop: 6 }}>
              <HeartRateEKG bpm={bpm} height={40} width={170} strokeWidth={1.5} showLabel={false} state={traceState} />
            </span>
          ) : undefined
        }
        context={<Line>{isLarge ? stale ?? `${word}` : smallContext}</Line>}
        children={
          isLarge && low !== null && high !== null ? (
            <span className="absolute" style={{ left: 16, right: 16, top: 107.5, zIndex: 1 }} aria-hidden>
              <span className="relative block rounded-full" style={{ height: 8, background: dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.9)" }}>
                <span
                  className="absolute inset-y-0 rounded-full"
                  style={{
                    left: `${at(low) * 100}%`,
                    width: `${Math.max(0, at(high) - at(low)) * 100}%`,
                    background: "rgb(var(--metric-heart-rate-main))",
                    opacity: 0.6,
                    transition: "left 300ms cubic-bezier(0.22, 1, 0.36, 1), width 300ms cubic-bezier(0.22, 1, 0.36, 1)",
                  }}
                />
                <span
                  className="absolute rounded-full"
                  style={{
                    left: `${at(bpm) * 100}%`,
                    top: -2,
                    width: 12,
                    height: 12,
                    marginLeft: -6,
                    boxSizing: "border-box",
                    background: ink,
                    border: `1.64317px solid ${dark ? "#1C1F28" : "#FFFFFF"}`,
                  }}
                />
              </span>
              <span
                className="flex justify-between"
                style={{ marginTop: 4, fontSize: textPx(10), lineHeight: linePx(12), fontWeight: 600, color: "rgb(var(--c-charcoal-faint))" }}
              >
                <span>Low {low}</span>
                <span>{isToday ? "Range today" : "Range"}</span>
                <span>High {high}</span>
              </span>
            </span>
          ) : undefined
        }
      />
    </>
  );
};
