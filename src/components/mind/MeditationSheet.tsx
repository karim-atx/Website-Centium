import React, { useEffect, useRef, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Chip } from "../ui/Chip";
import { Button } from "../ui/Button";
import { breathingPatterns, stretchList, yogaPoses, type BreathingPattern } from "../../data/mockMindContent";
import { Play, Square, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { useApp } from "../../context/AppContext";
import { logMeditationSession } from "../../services/meditation";
import { formatMeditationTime, meditationKind, sessionSeconds } from "../../services/meditation/logic";

type SubTab = "breathing" | "stretching" | "yoga";

const difficultyColor: Record<string, string> = {
  beginner: "text-[#3F9165] bg-[#E3F3E9]",
  intermediate: "text-[#B08A2E] bg-[#FBF1DD]",
  advanced: "text-[#C0392B] bg-[#FBE7E4]",
};

// Design refinement §6.9c: target scale reached at the end of an inhale /
// exhale — a Hold phase must sustain whichever of these came last, not
// snap back to 1. Walk backwards from the current phase to find it.
const holdTargetScale = (pattern: BreathingPattern, phaseIdx: number) => {
  for (let i = phaseIdx; i >= 0; i--) {
    if (pattern.phases[i].label === "Breathe in") return 1.18;
    if (pattern.phases[i].label === "Breathe out") return 0.82;
  }
  return 1;
};

const ORB_R = 64;
const ORB_CIRC = 402.1;

const BreathingRunner: React.FC<{ pattern: BreathingPattern }> = ({ pattern }) => {
  const { authUserId, refreshMeditationSummary, refreshAchievements } = useApp();
  const [running, setRunning] = useState(false);
  /** What happened to the last session, shown under the buttons. */
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
  // run part-way (Reset, switching pattern or tab, closing the sheet) is an
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
  // Closing the sheet (or switching its tab) unmounts the runner mid-run.
  useEffect(() => () => endRef.current(false, false), []);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [cycles, setCycles] = useState(0);
  const intervalRef = useRef<number | null>(null);
  // Source of truth for the ticking interval — kept in refs so the interval
  // is created exactly once per `running` toggle. Deriving it off `phaseIdx`
  // state instead (recreating the interval every phase change) raced the
  // still-firing old interval against the newly-created one and skipped
  // phases (observed: "Breathe in" jumping straight to "Breathe out",
  // silently skipping "Hold").
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
  // current phase, rather than a 1s countdown — the progress arc needs
  // sub-second resolution to read as smooth rather than stepped.
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

  const phase = pattern.phases[phaseIdx];
  const isInhale = phase.label === "Breathe in";
  const isExhale = phase.label === "Breathe out";
  const isHold = phase.label === "Hold";
  const targetScale = isInhale ? 1.18 : isExhale ? 0.82 : holdTargetScale(pattern, phaseIdx);
  const ringColor = isInhale ? "#7D6BB5" : isExhale ? "#A2C8C2" : "#C8BFE9";
  const progress = Math.min(1, elapsedMs / (phase.seconds * 1000));
  const secondsLeft = Math.max(1, Math.ceil(phase.seconds - elapsedMs / 1000));

  return (
    <div className="flex flex-col items-center py-4">
      <div className="relative w-[204px] h-[204px] flex items-center justify-center mb-5">
        {/* two concentric soft rings behind the orb */}
        <div className="absolute w-[204px] h-[204px] rounded-full border border-primary/[0.08]" />
        <div className="absolute w-[180px] h-[180px] rounded-full border border-primary/[0.14]" />

        <svg
          className="absolute w-[156px] h-[156px] -rotate-90"
          viewBox="0 0 156 156"
        >
          <circle cx="78" cy="78" r={ORB_R} fill="none" stroke="rgba(125,107,181,0.12)" strokeWidth={3} />
          {running && (
            <circle
              cx="78"
              cy="78"
              r={ORB_R}
              fill="none"
              stroke={ringColor}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={ORB_CIRC}
              strokeDashoffset={ORB_CIRC * (1 - progress)}
              // §7.4: "Breathing phase arc: transition: stroke-dasharray .12s linear."
              style={{ transition: "stroke-dashoffset 0.12s linear" }}
            />
          )}
        </svg>

        <div
          // `primary-pale`'s light value is #F0EDF9 — identical to the doc's
          // literal spec — but unlike a hardcoded hex it re-tints for dark
          // mode instead of sitting as a stark white-ish disc on a dark
          // ground.
          className="w-[156px] h-[156px] rounded-full flex items-center justify-center bg-primary-pale border border-primary/[0.16]"
          style={{
            transform: `scale(${targetScale})`,
            transition: isHold
              ? "transform 0.4s cubic-bezier(.42,0,.58,1)"
              : `transform ${phase.seconds}s cubic-bezier(.42,0,.58,1)`,
          }}
        >
          <div className="text-center">
            <p className="text-sm font-semibold text-primary-dark">{running ? phase.label : "Ready?"}</p>
            {running && <p className="text-3xl font-bold text-primary-dark tabular-nums">{secondsLeft}</p>}
          </div>
        </div>
      </div>

      {/* phase rail — segment width proportional to that phase's seconds */}
      <div className="flex w-full gap-1 mb-1">
        {pattern.phases.map((p, i) => (
          <div key={i} className="h-[5px] rounded-full bg-charcoal/[0.08] overflow-hidden" style={{ flex: p.seconds }}>
            <div
              className="h-full rounded-full"
              style={{
                width: i < phaseIdx ? "100%" : i === phaseIdx && running ? `${progress * 100}%` : "0%",
                background: p.label === "Breathe in" ? "#7D6BB5" : p.label === "Breathe out" ? "#A2C8C2" : "#C8BFE9",
                // §7.4: "Phase rail: transition: background .3s ease" —
                // the width-fill itself stays near-instant (0.1s linear) so
                // it tracks the tick accurately; the colour settle is what
                // gets the slower, eased transition.
                transition: "width 0.1s linear, background 0.3s ease",
              }}
            />
          </div>
        ))}
      </div>
      <p className="text-[10.5px] font-medium text-charcoal-faint mb-4">Cycle {cycles}</p>

      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          aria-label="Reset"
          className="tap w-11 h-11 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
        >
          <RotateCcw size={15} />
        </button>
        <Button
          onClick={() => {
            if (running) {
              setRunning(false);
              endSession(true, true);
            } else {
              sessionRef.current = { startedAtMs: Date.now(), kind: meditationKind(pattern.id) };
              setNote(null);
              setRunning(true);
            }
          }}
          variant={running ? "outline" : "primary"}
        >
          {running ? (
            <>
              <Square size={14} /> Stop
            </>
          ) : (
            <>
              <Play size={14} /> Start
            </>
          )}
        </Button>
      </div>
      {note && (
        <p className="mt-3 text-[11px] font-semibold text-charcoal-soft text-center" role="status">
          {note}
        </p>
      )}
    </div>
  );
};

export const MeditationSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const [subTab, setSubTab] = useState<SubTab>("breathing");
  const [patternId, setPatternId] = useState(breathingPatterns[0].id);
  const [expandedStretch, setExpandedStretch] = useState<string | null>(null);
  const [expandedPose, setExpandedPose] = useState<string | null>(null);

  const pattern = breathingPatterns.find((p) => p.id === patternId)!;

  return (
    <BottomSheet open={open} onClose={onClose} title="Meditation">
      <div className="animate-fade-slide-up">
        <div className="flex gap-2 mb-5">
          <Chip active={subTab === "breathing"} onClick={() => setSubTab("breathing")}>
            Breathing
          </Chip>
          <Chip active={subTab === "stretching"} onClick={() => setSubTab("stretching")}>
            Stretching
          </Chip>
          <Chip active={subTab === "yoga"} onClick={() => setSubTab("yoga")}>
            Yoga
          </Chip>
        </div>

        {subTab === "breathing" && (
          <div>
            <div className="flex gap-2 scroll-row no-scrollbar pb-1 mb-2">
              {breathingPatterns.map((p) => (
                <Chip key={p.id} active={patternId === p.id} onClick={() => setPatternId(p.id)}>
                  {p.name}
                </Chip>
              ))}
            </div>
            <p className="text-xs text-charcoal-faint mb-3">{pattern.desc}</p>
            <BreathingRunner pattern={pattern} />
          </div>
        )}

        {subTab === "stretching" && (
          <div className="space-y-2">
            {stretchList.map((s) => {
              const expanded = expandedStretch === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setExpandedStretch(expanded ? null : s.id)}
                  className="tap w-full text-left rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{s.name}</p>
                      <p className="text-xs text-charcoal-faint">
                        {s.target} · {s.type} · {s.seconds}s
                      </p>
                    </div>
                    {expanded ? (
                      <ChevronUp size={15} className="text-charcoal-faint shrink-0" />
                    ) : (
                      <ChevronDown size={15} className="text-charcoal-faint shrink-0" />
                    )}
                  </div>
                  {expanded && (
                    <p className="text-xs text-charcoal-soft leading-relaxed mt-2.5 animate-fade-slide-up">
                      {s.instructions}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {subTab === "yoga" && (
          <div className="space-y-2">
            {yogaPoses.map((p) => {
              const expanded = expandedPose === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setExpandedPose(expanded ? null : p.id)}
                  className="tap w-full text-left rounded-2xl bg-cream-soft px-4 py-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-charcoal">{p.name}</p>
                    <span
                      className={clsx(
                        "text-[10px] font-bold uppercase rounded-full px-2 py-0.5 shrink-0",
                        difficultyColor[p.difficulty]
                      )}
                    >
                      {p.difficulty}
                    </span>
                  </div>
                  {expanded && (
                    <p className="text-xs text-charcoal-soft leading-relaxed mt-2.5 animate-fade-slide-up">
                      {p.instructions}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BottomSheet>
  );
};
