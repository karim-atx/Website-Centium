import React, { useMemo, useState } from "react";
import { useLoopWhileVisible } from "./useLoopWhileVisible";

// Design refinement §7.3: a real P-QRS-T waveform, not a decorative zigzag.
// One complex per RR interval in 10ms units inside a 300-unit (3s) window.
// QRS holds ~90ms at every rate; ST/T compress as rate climbs and the TP
// baseline absorbs the remainder — which is how rate actually changes on paper.
export function ekgPath(bpm: number) {
  const w = 6000 / bpm; // RR interval in 10ms units
  let st = 8,
    t = 16;
  if (w < 60) {
    const f = Math.max(0.34, (w - 26) / 34);
    st *= f;
    t *= f;
  }
  const block = 26 + st + t;
  const filler = Math.max(4, w - block); // TP baseline
  const step = block + filler;
  const B = 46; // baseline y
  let d = "",
    x = 0;
  while (x < 620) {
    d += `M${x.toFixed(1)},${B}l4,0q4,-8 8,0l6,0l2,5l3,-35l3,39l${st.toFixed(1)},-9q${(t / 2).toFixed(1)},-14 ${t.toFixed(1)},0l${filler.toFixed(1)},0`;
    x += step;
  }
  return d;
}

/** One RR interval in path units: the distance a seamless loop travels per beat. */
function rrUnits(bpm: number) {
  const w = 6000 / bpm;
  let st = 8,
    t = 16;
  if (w < 60) {
    const f = Math.max(0.34, (w - 26) / 34);
    st *= f;
    t *= f;
  }
  return 26 + st + t + Math.max(4, w - (26 + st + t));
}

// V6-07 (2026-10-08): the label is NOT shown anywhere by this component any
// more (rhythm words from one number read as a diagnosis); only its colour
// class tints the trace. Kept exported for backward compatibility.
// All three states are sinus (P wave present, 1:1 with QRS) — that's what a
// resting-HR feed can honestly support. Do not invent arrhythmias the data
// cannot evidence: a resting heart rate tells you rate, not morphology.
export function rhythmFor(bpm: number) {
  if (bpm < 60) return { label: "Sinus bradycardia", colorClass: "text-status-low" };
  if (bpm > 100) return { label: "Sinus tachycardia", colorClass: "text-status-high" };
  return { label: "Normal sinus rhythm", colorClass: "text-status-good" };
}

/**
 * The heart-rate trace.
 *
 * MOTION (motion-specs.md "HO1.W7 ECG v1"): the path group moves left by one
 * RR interval (6000 / bpm of the 300-unit window) over 60 / bpm s, linear,
 * infinite, so it loops seamlessly at the reading's own rate (62 bpm: 0.97 s).
 * A new bpm re-times on the next cycle (no jump). Static under Reduce motion,
 * paused off screen and in a background tab (useLoopWhileVisible).
 *
 * Props added for Home (v6 Batch 2), all optional, defaults unchanged:
 * `height` (28), `width` ("100%"), `strokeWidth` (3.2 screen px),
 * `showLabel` (deprecated, ignored: no rhythm line, V6-07), `state`
 * ("loading": static flat line at 40%; "error": the static last trace).
 */
export const HeartRateEKG: React.FC<{
  bpm: number;
  height?: number;
  width?: number | string;
  strokeWidth?: number;
  /** @deprecated V6-07: the rhythm line is no longer drawn (a single bpm is not a rhythm); accepted and ignored. */
  showLabel?: boolean;
  state?: "ready" | "loading" | "error";
}> = ({ bpm, height = 28, width = "100%", strokeWidth = 3.2, state = "ready" }) => {
  const [ref, visible] = useLoopWhileVisible<HTMLDivElement>();
  // The bpm the running loop is timed to; a change applies at the next iteration.
  const [timed, setTimed] = useState(bpm);
  const [lastSeen, setLastSeen] = useState(bpm);
  if (bpm !== lastSeen) {
    setLastSeen(bpm);
    if (!visible || state !== "ready") setTimed(bpm);
  }
  const shown = state === "ready" && visible ? timed : bpm;
  const path = useMemo(() => ekgPath(shown), [shown]);
  const rhythm = useMemo(() => rhythmFor(bpm), [bpm]);
  const running = visible && state === "ready";

  return (
    <div ref={ref} style={{ width }}>
      <style href="hr-ekg-motion" precedence="default">{`@keyframes hr-ekg-rr { from { transform: translateX(0) } to { transform: translateX(var(--hr-rr)) } }`}</style>
      <div className="overflow-hidden" style={{ height }}>
        <svg viewBox="0 0 300 70" preserveAspectRatio="none" className="qa-shape w-full h-full overflow-visible">
          {state === "loading" ? (
            <path d="M0,46 H300" fill="none" className={rhythm.colorClass} stroke="currentColor" strokeOpacity={0.4} strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
          ) : (
            <g
              onAnimationIteration={() => {
                if (timed !== bpm) setTimed(bpm);
              }}
              style={
                running
                  ? ({
                      animation: `hr-ekg-rr ${(60 / timed).toFixed(3)}s linear infinite`,
                      ["--hr-rr" as string]: `${-rrUnits(timed)}px`,
                    } as React.CSSProperties)
                  : undefined
              }
            >
              <path d={path} fill="none" className={rhythm.colorClass} stroke="currentColor" strokeWidth={strokeWidth} vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </svg>
      </div>
    </div>
  );
};
