import React, { useEffect, useRef, useState } from "react";
import { Play, Square, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { PinnedCta } from "../ui/PinnedCta";
import { Toast } from "../ui/Toast";
import { useApp } from "../../context/AppContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { logMeditationSession } from "../../services/meditation";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import { breathingSaveRule, formatMeditationTime, meditationKind, sessionSeconds } from "../../services/meditation/logic";
import type { BreathingPattern } from "../../data/mockMindContent";

// The breathing runner, v6 MO1.1.4 (layout table #11-#22) on the v5.1
// MO1.1.4.3 motion board.
//
// PETALS, NOT AN ORB. Eight petals bloom to 1.18× on an inhale ("lavender
// leads"), rest there on a hold (the glow settles in 0.4 s), fold to 0.82× on
// an exhale ("colour drifts to teal"), and rest folded. The outer arc runs
// over the WHOLE cycle and closes before it loops. Built in SVG (the table's
// #11 "inline SVG"). Under Reduce motion (the in-app switch or the device
// setting, S7) the petals do not scale and the glow is static; the phase
// text, countdown, arc and rail still update (they are progress).

// Design refinement §6.9c: the scale reached at the end of an inhale or
// exhale. A hold sustains whichever came last instead of snapping back to 1.
const holdTargetScale = (pattern: BreathingPattern, phaseIdx: number) => {
  for (let i = phaseIdx; i >= 0; i--) {
    if (pattern.phases[i].label === "Breathe in") return 1.18;
    if (pattern.phases[i].label === "Breathe out") return 0.82;
  }
  return 1;
};

// Rail and arc colours per phase. Breathe in is primary-dark: #7D6BB5, dark
// #C3B3FB (MO1.1.4 #16); Hold #C8BFE9 and Breathe out #A2C8C2 are kept from
// the MO1.1.4.3 board (K3).
const PHASE_COLOUR = (label: string) =>
  label === "Breathe in" ? "rgb(var(--c-primary-dark))" : label === "Breathe out" ? "rgb(var(--th-a2c8c2))" : "rgb(var(--th-c8bfe9))";
const SIZE = 270;
const ARC_R = 128;
const ARC_C = 2 * Math.PI * ARC_R;
const PETALS = 8;

/** MO1.1.4 S4 / O10 (ours): why a stopped run was not saved. */
const NOTE_NEED_CYCLE = "Finish one full cycle to save a session.";
const NOTE_TOO_SHORT = "Keep going a little longer to save a session.";
const SAVE_FAILED = "Couldn't save. Try again.";

export const BreathingRunner: React.FC<{ pattern: BreathingPattern }> = ({ pattern }) => {
  const { authUserId, refreshMeditationSummary, refreshAchievements } = useApp();
  const reduced = useReducedMotion();
  const [running, setRunning] = useState(false);
  /** What happened to the last session, shown under "Cycle" (K4). */
  const [note, setNote] = useState<string | null>(null);
  /** A failed save (O3, O4, K7): the shared error toast. */
  const [toast, setToast] = useState<string | null>(null);

  // --- the session log -------------------------------------------------------
  //
  // ONE SESSION IS ONE START-TO-STOP RUN, timed by the wall clock rather than
  // by counting ticks (K5: a backgrounded tab throttles the interval, and the
  // person is still breathing). It is written ONCE, when the run ends (the
  // table has no UPDATE), with the time actually spent.
  //
  // WHAT IS SAVED (v6 MO1.1.4 S2-S5, V6-144): a run is saved only once it has
  // at least one full cycle AND the table's 10 s floor, always as completed.
  // Stop, switching pattern or tab, and leaving the page (K6) all follow that
  // rule; Reset discards the run and never saves. Anything shorter is not
  // written at all.
  const sessionRef = useRef<{ startedAtMs: number; kind: string } | null>(null);
  const cyclesRef = useRef(0);
  const live = useRef({ authUserId, refreshMeditationSummary, refreshAchievements });

  /** Ends the open run. `report`: show the note (the runner is still on screen). */
  const endSession = (report: boolean) => {
    const session = sessionRef.current;
    sessionRef.current = null;
    if (!session) return;
    const seconds = sessionSeconds(session.startedAtMs, Date.now());
    const rule = breathingSaveRule(cyclesRef.current, seconds);
    if (rule !== "save" || seconds === null) {
      if (report) setNote(rule === "short" ? NOTE_TOO_SHORT : NOTE_NEED_CYCLE);
      return;
    }
    const { authUserId: userId } = live.current;
    if (!userId) return;
    void logMeditationSession({
      userId,
      startedAt: new Date(session.startedAtMs),
      durationSeconds: seconds,
      kind: session.kind,
      completed: true,
    }).then((r) => {
      if (!r.ok) {
        // O3 / K7 keep their own text; anything else is the shared one.
        setToast(r.message === OFFLINE_MESSAGE || r.message.startsWith("That's a lot") ? r.message : SAVE_FAILED);
        return;
      }
      if (report) setNote(`Saved · ${formatMeditationTime(seconds)}`);
      void live.current.refreshMeditationSummary();
      // A completed session can earn a meditation badge (K8).
      live.current.refreshAchievements();
    });
  };
  const endRef = useRef(endSession);
  // Kept current after every render, for the unmount and pattern-change
  // effects, which must call the latest one rather than the first.
  useEffect(() => {
    live.current = { authUserId, refreshMeditationSummary, refreshAchievements };
    endRef.current = endSession;
  });
  // Leaving the page (or switching its tab) unmounts the runner mid-run (K6).
  useEffect(() => () => endRef.current(false), []);
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

  const rewind = () => {
    setRunning(false);
    setPhaseIdx(0);
    setElapsedMs(0);
    setCycles(0);
    cyclesRef.current = 0;
    phaseIdxRef.current = 0;
    elapsedRef.current = 0;
  };

  useEffect(() => {
    // S3: switching pattern ends the run (saved under the same rule as Stop)
    // and resets the cycle count.
    endRef.current(true);
    rewind();
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
      if (nextIdx === 0) {
        cyclesRef.current += 1;
        setCycles(cyclesRef.current);
      }
    }, 100);
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
    };
  }, [running, pattern]);

  // S5: back to Breathe in, Cycle 0, WITHOUT saving (the run is discarded).
  const reset = () => {
    sessionRef.current = null;
    setNote(null);
    rewind();
  };

  const toggle = () => {
    if (running) {
      setRunning(false);
      endSession(true);
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
  const scale = !running || reduced ? 1 : isInhale ? 1.18 : isExhale ? 0.82 : holdTargetScale(pattern, phaseIdx);
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
      {/* #11: the 270 graphic, 12 under the description. */}
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
            0.4 s"): lavender, drifting to teal with the petals. Static
            (lavender, no fade) under Reduce motion. */}
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
            style={{ opacity: running && (reduced || !teal) ? 1 : 0, transition: reduced ? "none" : "opacity 0.4s ease" }}
          />
          {!reduced && (
            <circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={ARC_R - 4}
              fill="url(#breath-glow-teal)"
              style={{ opacity: running && teal ? 1 : 0, transition: "opacity 0.4s ease" }}
            />
          )}
          <g
            style={{
              transformOrigin: "50% 50%",
              transform: `scale(${scale})`,
              transition: reduced ? "none" : `transform ${transition} cubic-bezier(.42,0,.58,1)`,
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
                  transition: reduced ? "none" : `fill ${transition} ease`,
                }}
              />
            ))}
          </g>
        </svg>

        {/* The centre disc: the phase and its countdown. */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-cream-card flex flex-col items-center justify-center shadow-soft">
          {/* #12 13.5/16.2 700 #7D6BB5 / #C3B3FB; the secondary (teal) on the
              exhale and while resting folded (K3). #13 35.3/37.1 800 ls -1.1
              (Larger text 34, O6). #14 10.4/12.5 600. */}
          <p
            className={clsx(
              "text-[13.5px] leading-[16.2px] font-bold",
              teal ? "text-team-teal-deep dark:text-team-teal-ink" : "text-primary-dark"
            )}
          >
            {phase.label}
          </p>
          <p
            className="font-extrabold text-charcoal tabular-nums"
            style={{
              fontSize: "calc(35.3px - 0.65 * var(--text-boost, 0px))",
              lineHeight: "calc(37.1px + var(--text-boost, 0px))",
              letterSpacing: "-1.1px",
            }}
          >
            {secondsLeft}
          </p>
          <p className="text-[10.4px] leading-[12.5px] font-semibold text-charcoal-muted">seconds</p>
        </div>
      </div>

      {/* #15-#17: the phase rail, 4 under the flower, each segment as long as
          its phase (82.5 per 4 s at 390), padding 0 8, gap 4. */}
      <div className="mt-1 flex w-full gap-1 px-2">
        {pattern.phases.map((p, i) => (
          <div key={i} className="min-w-0" style={{ flex: p.seconds }}>
            <div className="h-1 rounded-full bg-charcoal/[0.07] [.high-contrast_&]:bg-charcoal/30 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: i < phaseIdx && running ? "100%" : i === phaseIdx && running ? `${progress * 100}%` : "0%",
                  background: PHASE_COLOUR(p.label),
                  transition: reduced ? "none" : "width 0.1s linear, background 0.3s ease",
                }}
              />
            </div>
            {/* Active 9.5/12 800 primary-dark (#17); idle 9.5/12 600 #8C8378 (K9). */}
            <p
              className={clsx(
                "mt-[5px] text-center text-[9.5px] leading-[12px] truncate",
                running && i === phaseIdx ? "font-extrabold text-primary-dark" : "font-semibold text-charcoal-muted"
              )}
            >
              {p.label}
            </p>
          </div>
        ))}
      </div>
      {/* #18: 10.5/15.8 500, 10 below the rail. */}
      <p className="mt-2.5 text-[10.5px] leading-[15.8px] font-medium text-charcoal-muted">Cycle {cycles}</p>
      {note && (
        <p className="mt-2 text-[11px] font-semibold text-charcoal-soft text-center" role="status">
          {note}
        </p>
      )}

      {/* #19-#22: Start / Stop filled, Reset to its right. */}
      <PinnedCta
        // #19: the row is 44 tall, radius 12; 48 under Larger text (O6,
        // derived: the same +4 step as the handover's 48 → 52).
        size="base"
        primary={{
          label: running ? "Stop" : "Start",
          // #20: the icon is #FFFFFF in light AND dark (V6-144, literal).
          icon: running ? <Square size={14} style={{ color: "#FFFFFF" }} /> : <Play size={14} style={{ color: "#FFFFFF" }} />,
          onClick: toggle,
          // #19: filled #A198DF (--c-fill-cta) / dark #A991FE, 13.5/20.3 700,
          // icon gap 8. High contrast: the primary fill #5B48B8 (O7).
          className:
            "!text-[13.5px] !leading-[20.3px] !gap-2 !bg-[rgb(var(--c-fill-cta))] [.high-contrast_&]:!bg-primary-fill !h-[calc(44px+2*var(--text-boost,0px))]",
        }}
        trailing={{
          icon: <RotateCcw size={15} />,
          label: "Reset",
          onClick: reset,
          width: 44,
          // #21-#22: #AEA1DC@18% with #7D67D9; dark #A991FE@18% with #9A8CD6
          // (primary at 18%, primary-accent). High contrast: #5B48B8 with
          // white (O7).
          className:
            "!bg-th-aea1dc/[0.18] !text-primary-accent dark:!bg-primary/[0.18] [.high-contrast_&]:!bg-primary-fill [.high-contrast_&]:!text-on-primary-fill !h-[calc(44px+2*var(--text-boost,0px))]",
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} tone="error" bottom={148} onExpire={() => setToast(null)} />
    </div>
  );
};
