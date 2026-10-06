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

const PHASE_COLOUR = (label: string) => (label === "Breathe in" ? "rgb(var(--th-7d6bb5))" : label === "Breathe out" ? "rgb(var(--th-a2c8c2))" : "rgb(var(--th-c8bfe9))");
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

  // MO1.1.4: the arc's track is one segment per phase, as long as its phase,
  // with a small gap between them (about 3 pt, measured on the 2x frame), each
  // tinted by its phase: PHASE_COLOUR at 30% (the frame's pale lavender,
  // paler lavender and pale teal quarters).
  const segments = pattern.phases.reduce<{ start: number; len: number; label: string }[]>((acc, p) => {
    const start = acc.length ? acc[acc.length - 1].start + acc[acc.length - 1].len : 0;
    acc.push({ start, len: (p.seconds * 1000 * ARC_C) / cycleMs, label: p.label });
    return acc;
  }, []);
  const SEG_GAP = 3 + 3; // the visible gap plus the round caps' 1.5 pt each side

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90" aria-hidden>
          {segments.map((s, i) => (
            <circle
              key={i}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={ARC_R}
              fill="none"
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${Math.max(0, s.len - SEG_GAP)} ${ARC_C}`}
              strokeDashoffset={-(s.start + SEG_GAP / 2)}
              style={{ stroke: PHASE_COLOUR(s.label), strokeOpacity: 0.3 }}
            />
          ))}
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

        {/* The petals, on a soft radial glow (MO1.1.4.3: "glow settles in
            0.4 s"): lavender, drifting to teal with the petals. */}
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0" aria-hidden>
          <defs>
            <radialGradient id="breath-glow-lav">
              <stop offset="0%" style={{ stopColor: "rgb(var(--th-aea1dc))", stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: "rgb(var(--th-aea1dc))", stopOpacity: 0 }} />
            </radialGradient>
            <radialGradient id="breath-glow-teal">
              <stop offset="0%" style={{ stopColor: "rgb(var(--th-a2c8c2))", stopOpacity: 0.32 }} />
              <stop offset="100%" style={{ stopColor: "rgb(var(--th-a2c8c2))", stopOpacity: 0 }} />
            </radialGradient>
          </defs>
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={ARC_R - 4}
            fill="url(#breath-glow-lav)"
            style={{ opacity: running && !teal ? 1 : 0, transition: "opacity 0.4s ease" }}
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={ARC_R - 4}
            fill="url(#breath-glow-teal)"
            style={{ opacity: running && teal ? 1 : 0, transition: "opacity 0.4s ease" }}
          />
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
                // Measured on the 2x MO1.1.4 frame mid-inhale (scale 1): the
                // upright petal's tip 98 pt from the centre, 68 pt wide. Its
                // inner end passes the centre, so the petals overlap.
                cy={SIZE / 2 - 48}
                rx={34}
                ry={50}
                transform={`rotate(${(360 / PETALS) * i} ${SIZE / 2} ${SIZE / 2})`}
                style={{
                  fill: teal ? "rgb(var(--th-a2c8c2) / 0.30)" : "rgb(var(--th-aea1dc) / 0.24)",
                  transition: `fill ${transition} ease`,
                }}
              />
            ))}
          </g>
        </svg>

        {/* The centre disc: the phase and its countdown. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-cream-card flex flex-col items-center justify-center shadow-soft">
          {/* MO1.1.4 #5: 13.5/700 #7D6BB5, 35.3/800, 10.4/600 #8C8378. The
              label is the theme's secondary (teal) on the exhale and while
              resting folded (MO1.1.4.3). */}
          <p
            className={clsx(
              "text-[13.5px] font-bold leading-tight",
              teal ? "text-team-teal-deep dark:text-team-teal-ink" : "text-primary-dark"
            )}
          >
            {phase.label}
          </p>
          <p className="text-[35.3px] font-extrabold leading-none text-charcoal tabular-nums">{secondsLeft}</p>
          <p className="text-[10.4px] font-semibold text-charcoal-muted">seconds</p>
        </div>
      </div>

      {/* The phase rail, each segment as long as its phase, labelled.
          MO1.1.4 #6: directly under the flower, padding 0 8px. */}
      <div className="flex w-full gap-1 px-2">
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
                "mt-1.5 text-center text-[9.5px] truncate",
                running && i === phaseIdx ? "font-extrabold text-primary-dark" : "font-semibold text-charcoal-muted"
              )}
            >
              {p.label}
            </p>
          </div>
        ))}
      </div>
      {/* MO1.1.4 #7: 10.5/500, 10 pt below the rail. */}
      <p className="mt-2.5 text-[10.5px] font-medium text-charcoal-muted">Cycle {cycles}</p>
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
          // MO1.1.4 #8: the pinned row is new since the redesign (decision
          // 22): filled #A198DF, 13.5/700 white; 48/r14 per C-01.
          className: "!text-[13.5px] !bg-[rgb(var(--c-fill-cta))]",
        }}
        trailing={{
          icon: <RotateCcw size={15} />,
          label: "Reset",
          onClick: reset,
          width: 44,
          // 2x frame: #F0EEF9 (#AEA1DC at 18%) with a #7D67D9 icon.
          className: "!bg-th-aea1dc/[0.18] !text-primary-accent dark:!bg-primary-pale dark:!text-primary-deep-text",
        }}
      />
    </div>
  );
};
