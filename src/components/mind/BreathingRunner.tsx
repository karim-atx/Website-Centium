import React, { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { PinnedCta } from "../ui/PinnedCta";
import { useApp } from "../../context/AppContext";
import { logMeditationSession } from "../../services/meditation";
import { formatMeditationTime, meditationKind, sessionSeconds } from "../../services/meditation/logic";
import type { BreathingPattern } from "../../data/mockMindContent";

// The breathing runner, mobile v5.1 MO1.1.4 / MO1.1.4.3.
//
// PETALS, NOT AN ORB. Eight petals bloom to 1.18× on an inhale ("lavender
// leads"), rest there on a hold (the glow settles in 0.4 s), fold to 0.82× on
// an exhale ("colour drifts to teal"), and rest folded. The outer arc runs
// over the WHOLE cycle and closes before it loops (it used to restart each
// phase). Built in SVG from the motion spec; the reference GIF is not shipped
// (A14). The app-wide reduced-motion rule zeroes the transitions.

// Design refinement §6.9c: the scale reached at the end of an inhale or
// exhale. A hold sustains whichever came last instead of snapping back to 1.
const holdTargetScale = (pattern: BreathingPattern, phaseIdx: number) => {
  for (let i = phaseIdx; i >= 0; i--) {
    if (pattern.phases[i].label === "Breathe in") return 1.18;
    if (pattern.phases[i].label === "Breathe out") return 0.82;
  }
  return 1;
};

const PHASE_COLOUR = (label: string) => (label === "Breathe in" ? "#7D6BB5" : label === "Breathe out" ? "#A2C8C2" : "#C8BFE9");
const SIZE = 270;
const ARC_R = 128;
const ARC_C = 2 * Math.PI * ARC_R;
const PETALS = 8;

export const BreathingRunner: React.FC<{ pattern: BreathingPattern }> = ({ pattern }) => {
  const { authUserId, refreshMeditationSummary, refreshAchievements } = useApp();
  const [running, setRunning] = useState(false);
  /** What happened to the last session, shown under the rail. */
  const [note, setNote] = useState<string | null>(null);

  // --- the session log -------------------------------------------------------
  //
  // ONE SESSION IS ONE START-TO-STOP RUN, timed by the wall clock rather than
  // by counting ticks (a backgrounded tab throttles the interval, and the
  // person is still breathing). It is written ONCE, when the run ends (the
  // table has no UPDATE), with the time actually spent.
  //
  // HOW IT ENDS DECIDES `completed`. The runner has no set length, so Stop is
  // the only way to finish one: Stop is completed. Anything else that ends a
  // run part-way (Reset, switching pattern or tab, leaving the page) is an
  // interruption: saved, because the minutes were real, but not completed,
  // so it earns no badge credit. Under 10 seconds nothing is saved.
  const sessionRef = useRef<{ startedAtMs: number; kind: string } | null>(null);
  const live = useRef({ authUserId, refreshMeditationSummary, refreshAchievements });

  const endSession = (completed: boolean, report: boolean) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    const seconds = sessionSeconds(session.startedAtMs, Date.now());
    if (seconds === null) {
      if (report) setNote("Under 10 seconds, so this one wasn't saved.");
      return;
    }
    const { authUserId: userId } = live.current;
    if (!userId) return;
    void logMeditationSession({
      userId,
      startedAt: new Date(session.startedAtMs),
      durationSeconds: seconds,
      kind: session.kind,
      completed,
    }).then((r) => {
      if (report) setNote(r.ok ? `Saved · ${formatMeditationTime(seconds)}` : r.message);
      if (!r.ok) return;
      void live.current.refreshMeditationSummary();
      // A completed session can earn a meditation badge.
      if (completed) live.current.refreshAchievements();
    });
  };
  const endRef = useRef(endSession);
  // Kept current after every render, for the unmount and pattern-change
  // effects, which must call the latest one rather than the first.
  useEffect(() => {
    live.current = { authUserId, refreshMeditationSummary, refreshAchievements };
    endRef.current = endSession;
  });
  // Leaving the page (or switching its tab) unmounts the runner mid-run.
  useEffect(() => () => endRef.current(false, false), []);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<number | null>(null);
  // Source of truth for the ticking interval — kept in refs so the interval
  // is created exactly once per `running` toggle. Deriving it off `phaseIdx`
  // state instead raced the still-firing old interval against the new one and
  // skipped phases.
  const phaseIdxRef = useRef(0);
  const elapsedRef = useRef(0);

  useEffect(() => {
    // Switching pattern mid-run ends that run, interrupted.
    endRef.current(false, true);
    setRunning(false);
    setPhaseIdx(0);
    setElapsedMs(0);
    setCycles(0);
    phaseIdxRef.current = 0;
    elapsedRef.current = 0;
  }, [pattern]);

  // §6.9c: tick on a 100ms interval accumulating elapsed ms within the
  // current phase, so the arcs move smoothly rather than in steps.
  useEffect(() => {
    if (!running) {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(() => {
      const next = elapsedRef.current + 100;
      const phaseMs = pattern.phases[phaseIdxRef.current].seconds * 1000;
      if (next < phaseMs) {
        elapsedRef.current = next;
        setElapsedMs(next);
        return;
      }
      const nextIdx = (phaseIdxRef.current + 1) % pattern.phases.length;
      phaseIdxRef.current = nextIdx;
      elapsedRef.current = 0;
      setPhaseIdx(nextIdx);
      setElapsedMs(0);
      if (nextIdx === 0) setCycles((c) => c + 1);
    }, 100);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, pattern]);

  const reset = () => {
    endSession(false, true);
    setRunning(false);
    setPhaseIdx(0);
    setElapsedMs(0);
    setCycles(0);
    phaseIdxRef.current = 0;
    elapsedRef.current = 0;
  };

  const toggle = () => {
    if (running) {
      setRunning(false);
      endSession(true, true);
    } else {
      sessionRef.current = { startedAtMs: Date.now(), kind: meditationKind(pattern.id) };
      setNote(null);
      setRunning(true);
    }
  };

  const phase = pattern.phases[phaseIdx];
  const isInhale = phase.label === "Breathe in";
  const isExhale = phase.label === "Breathe out";
  const isHold = phase.label === "Hold";
  const scale = !running ? 1 : isInhale ? 1.18 : isExhale ? 0.82 : holdTargetScale(pattern, phaseIdx);
  const progress = Math.min(1, elapsedMs / (phase.seconds * 1000));
  const secondsLeft = running ? Math.max(1, Math.ceil(phase.seconds - elapsedMs / 1000)) : phase.seconds;
  const cycleMs = pattern.phases.reduce((s, p) => s + p.seconds * 1000, 0);
  const doneMs = pattern.phases.slice(0, phaseIdx).reduce((s, p) => s + p.seconds * 1000, 0) + elapsedMs;
  const cycleProgress = running ? Math.min(1, doneMs / cycleMs) : 0;
  // "Colour drifts to teal" on the exhale and while resting folded.
  const teal = running && (isExhale || (isHold && holdTargetScale(pattern, phaseIdx) < 1));
  const transition = isHold ? "0.4s" : `${phase.seconds}s`;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={ARC_R} fill="none" strokeWidth={3} className="stroke-charcoal/[0.07]" />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={ARC_R}
            fill="none"
            strokeWidth={3}
            strokeLinecap="round"
            className="stroke-primary-dark"
            strokeDasharray={ARC_C}
            strokeDashoffset={ARC_C * (1 - cycleProgress)}
            style={{ transition: "stroke-dashoffset 0.12s linear", opacity: running ? 1 : 0 }}
          />
        </svg>

        {/* The petals. */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0" aria-hidden>
          <g
            style={{
              transformOrigin: "50% 50%",
              transform: `scale(${scale})`,
              transition: `transform ${transition} cubic-bezier(.42,0,.58,1)`,
            }}
          >
            {Array.from({ length: PETALS }, (_, i) => (
              <ellipse
                key={i}
                cx={SIZE / 2}
                // Tips 74 from the centre at rest, about 87 in full bloom:
                // two thirds of the arc, as on the frame.
                cy={SIZE / 2 - 38}
                rx={27}
                ry={36}
                transform={`rotate(${(360 / PETALS) * i} ${SIZE / 2} ${SIZE / 2})`}
                style={{
                  fill: teal ? "rgba(162,200,194,0.30)" : "rgba(174,161,220,0.24)",
                  transition: `fill ${transition} ease`,
                }}
              />
            ))}
          </g>
        </svg>

        {/* The centre disc: the phase and its countdown. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-cream-card flex flex-col items-center justify-center shadow-soft">
          <p className="text-[14px] font-bold text-primary-dark leading-tight">{phase.label}</p>
          <p className="text-[34px] font-extrabold leading-none text-charcoal tabular-nums">{secondsLeft}</p>
          <p className="text-[10.5px] text-charcoal-muted">seconds</p>
        </div>
      </div>

      {/* The phase rail, each segment as long as its phase, labelled. */}
      <div className="flex w-full gap-1 mt-3">
        {pattern.phases.map((p, i) => (
          <div key={i} className="min-w-0" style={{ flex: p.seconds }}>
            <div className="h-[5px] rounded-full bg-charcoal/[0.08] overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: i < phaseIdx && running ? "100%" : i === phaseIdx && running ? `${progress * 100}%` : "0%",
                  background: PHASE_COLOUR(p.label),
                  transition: "width 0.1s linear, background 0.3s ease",
                }}
              />
            </div>
            <p
              className={clsx(
                "mt-1.5 text-center text-[11px] truncate",
                running && i === phaseIdx ? "font-bold text-primary-dark" : "text-charcoal-muted"
              )}
            >
              {p.label}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] font-medium text-charcoal-muted">Cycle {cycles}</p>
      {note && (
        <p className="mt-2 text-[11px] font-semibold text-charcoal-soft text-center" role="status">
          {note}
        </p>
      )}

      {/* MO1.1.4: Start / Stop filled, Reset to its right. */}
      <PinnedCta
        primary={{
          label: running ? "Stop" : "Start",
          icon: running ? <Square size={14} /> : <Play size={14} />,
          onClick: toggle,
        }}
        trailing={{
          icon: <RotateCcw size={16} />,
          label: "Reset",
          onClick: reset,
          width: 44,
          // The Reset button this replaces was cream-soft with soft ink.
          className: "!bg-cream-soft !text-charcoal-soft",
        }}
      />
    </div>
  );
};
