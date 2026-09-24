import React, { useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import type { EndurancePlan, EnduranceResult } from "../../types";
import { formatClock } from "../../services/workout/prescription";
import { averagePace, formatDistance } from "../../services/workout/results";
import { plannedIntervals, planRows, parseClock } from "../../services/workout/endurance";
import {
  elapsedSeconds,
  isRunning,
  pause,
  resume,
  startedStopwatch,
  stoppedStopwatch,
  type Stopwatch,
} from "../../services/workout/clock";
import clsx from "clsx";

// Running an endurance effort, and recording what it produced.
//
// THE PLAN IS A LIST, NOT A PRESCRIPTION LINE. "6 × 800 m @ 4:20 /km, 2 min
// jog" is the right summary in a routine, and the wrong thing to hand somebody
// who is out of breath on the track — on the run itself the steps have to be
// separate, in order, with the current one obvious.
//
// NO GPS. Nothing here asks for a location permission or pretends to measure
// anything: the watch, the treadmill or the track already did, and the athlete
// types what it said. An app that guessed the distance would be inventing the
// one number the whole screen exists to record.
//
// THE STOPWATCH IS OPTIONAL, and says so. Somebody following a plan on a
// running watch does not need a second clock, and somebody on a treadmill
// does. Either way the result is typed at the end, not read off this timer,
// so a forgotten start does not cost them the log.

export const EnduranceRunner: React.FC<{
  plan: EndurancePlan;
  result: EnduranceResult | undefined;
  onResult: (result: EnduranceResult) => void;
  onStarted: () => void;
}> = ({ plan, result, onResult, onStarted }) => {
  const rows = planRows(plan);
  const [current, setCurrent] = useState(0);
  const [watch, setWatch] = useState<Stopwatch>(stoppedStopwatch);
  const [now, setNow] = useState(() => Date.now());
  const planned = plannedIntervals(plan);

  React.useEffect(() => {
    if (!isRunning(watch)) return;
    const tick = () => setNow(Date.now());
    const id = window.setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [watch]);

  const elapsed = elapsedSeconds(watch, now);
  const patch = (next: Partial<EnduranceResult>) => {
    const merged = { ...result, ...next };
    // Pace is DERIVED, never typed: somebody has a time and a distance, and
    // the pace follows from them. Recomputed on every edit so it cannot go
    // stale against the two numbers it comes from.
    const pace = averagePace(merged.duration_seconds, merged.distance_meters);
    onResult(pace ? { ...merged, avg_pace_sec_per_km: pace } : { ...merged, avg_pace_sec_per_km: undefined });
  };

  return (
    <div style={{ marginBottom: 10 }}>
      <div
        style={{
          background: "#F6F4FB",
          borderRadius: 12,
          padding: "8px 10px",
          marginBottom: 10,
        }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
          <span className="text-[10px] font-semibold uppercase tracking-[0.08em] text-charcoal-faint">
            The plan
          </span>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span className="tabular-nums text-[13px] font-bold text-charcoal">{formatClock(elapsed)}</span>
            <button
              onClick={() => {
                setWatch((w) =>
                  isRunning(w) ? pause(w, Date.now()) : w.pausedMs > 0 ? resume(w, Date.now()) : startedStopwatch(Date.now())
                );
                setNow(Date.now());
                onStarted();
              }}
              aria-label={isRunning(watch) ? "Pause the stopwatch" : "Start the stopwatch"}
              className="tap w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center"
            >
              {isRunning(watch) ? <Pause size={12} fill="white" /> : <Play size={12} fill="white" />}
            </button>
            <button
              onClick={() => setWatch(stoppedStopwatch())}
              aria-label="Reset the stopwatch"
              className="tap w-7 h-7 rounded-full bg-cream-soft text-charcoal-soft flex items-center justify-center"
            >
              <RotateCcw size={12} />
            </button>
          </span>
        </div>
        <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {rows.map((row, i) => (
            <li key={row.key}>
              <button
                onClick={() => setCurrent(i)}
                aria-current={i === current ? "step" : undefined}
                className={clsx(
                  "tap w-full flex items-center justify-between text-left",
                  i === current ? "font-bold" : "font-medium"
                )}
                style={{
                  gap: 8,
                  padding: "5px 8px",
                  borderRadius: 8,
                  background: i === current ? "#FFFFFF" : "transparent",
                  // The current step is named as well as highlighted, so the
                  // position survives greyscale and a screen reader — which
                  // reads aria-current and never the background.
                  boxShadow: i === current ? "inset 2px 0 0 #7D6BB5" : "none",
                  opacity: i < current ? 0.5 : 1,
                }}
              >
                <span className="text-[11.5px] text-charcoal">{row.label}</span>
                <span className="text-[11px] text-charcoal-faint tabular-nums">{row.detail}</span>
              </button>
            </li>
          ))}
        </ol>
        <button
          onClick={() => setCurrent((i) => Math.min(rows.length - 1, i + 1))}
          disabled={current >= rows.length - 1}
          className="tap text-[11px] font-semibold text-primary disabled:opacity-40"
          style={{ marginTop: 4, padding: "2px 8px" }}
        >
          Next step
        </button>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-charcoal-faint mb-1.5">
        What you actually did
      </p>
      <div className="flex flex-wrap" style={{ gap: 8 }}>
        <Field
          label="Time"
          placeholder="mm:ss"
          value={result?.duration_seconds ? formatClock(result.duration_seconds) : ""}
          onChange={(raw) => patch({ duration_seconds: parseClock(raw) })}
          hint={elapsed > 0 ? formatClock(elapsed) : undefined}
          onHint={() => patch({ duration_seconds: elapsed })}
        />
        <Field
          label="Distance (m)"
          placeholder="5000"
          value={result?.distance_meters ? String(result.distance_meters) : ""}
          onChange={(raw) => patch({ distance_meters: digits(raw) })}
        />
        <Field
          label="Avg HR"
          placeholder="optional"
          value={result?.avg_hr ? String(result.avg_hr) : ""}
          onChange={(raw) => patch({ avg_hr: digits(raw) })}
        />
        {planned > 0 && (
          <Field
            label={`Intervals (of ${planned})`}
            placeholder={String(planned)}
            value={result?.intervals_completed != null ? String(result.intervals_completed) : ""}
            onChange={(raw) => patch({ intervals_completed: digits(raw) })}
          />
        )}
      </div>
      {result?.avg_pace_sec_per_km ? (
        <p className="text-[11px] text-charcoal-soft" style={{ marginTop: 6 }}>
          {formatDistance(result.distance_meters ?? 0)} at{" "}
          <strong>{formatClock(result.avg_pace_sec_per_km)} /km</strong> average.
        </p>
      ) : (
        <p className="text-[10.5px] text-charcoal-faint" style={{ marginTop: 6 }}>
          Pace is worked out from the time and distance.
        </p>
      )}
    </div>
  );
};

const digits = (raw: string): number | undefined => {
  const cleaned = raw.replace(/[^\d]/g, "");
  return cleaned === "" ? undefined : Number(cleaned);
};


const Field: React.FC<{
  label: string;
  placeholder: string;
  value: string;
  onChange: (raw: string) => void;
  /** Offered from the stopwatch, tapped rather than copied automatically. */
  hint?: string;
  onHint?: () => void;
}> = ({ label, placeholder, value, onChange, hint, onHint }) => (
  <label className="block" style={{ width: 104 }}>
    <span className="flex items-baseline justify-between" style={{ marginBottom: 3 }}>
      <span style={{ fontSize: 9.5, color: "#8C8378" }}>{label}</span>
      {hint && (
        <button onClick={onHint} className="tap text-[9.5px] font-bold text-primary">
          {hint}
        </button>
      )}
    </span>
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      inputMode="numeric"
      aria-label={label}
      className="w-full placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
      style={{
        borderRadius: 9,
        background: "#FFFFFF",
        border: "1px solid rgba(36,31,27,0.1)",
        padding: "7px 9px",
        fontSize: 14,
        textAlign: "center",
        color: "#241F1B",
      }}
    />
  </label>
);
