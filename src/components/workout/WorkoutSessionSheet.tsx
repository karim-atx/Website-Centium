import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Check, Calculator, Square, MoreHorizontal, Play, Pause, Weight, MessageSquareText } from "lucide-react";
import type { Exercise, LoggedExercise, LoggedSet } from "../../types";
import { ONE_RM_CLASSIFICATIONS } from "../../types";
import { useApp } from "../../context/AppContext";
import { Metronome } from "./Metronome";
import { RPECalculator } from "./RPECalculator";
import { PlateCalculatorSheet } from "./PlateCalculatorSheet";
import { SetOptionsSheet } from "./SetOptionsSheet";
import { Confetti } from "./Confetti";
import { Button } from "../ui/Button";
import { formatDuration, volumeForSession, estimate1RM } from "../../services/workout";
import { exerciseLibrary } from "../../data/mockWorkouts";
import clsx from "clsx";

const setTypeBadge: Record<string, string> = {
  warmup: "W",
  failure: "F",
  dropset: "D",
  superset: "S",
  pr: "PR",
};

function initLoggedExercises(exercises: Exercise[]): LoggedExercise[] {
  return exercises.map((ex) => ({
    exerciseId: ex.id,
    name: ex.name,
    sets: Array.from({ length: ex.sets }).map((_, i) => ({
      setNumber: i + 1,
      reps: ex.reps,
      weightKg: ex.weightKg,
      completed: false,
    })),
  }));
}

export const WorkoutSessionSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  routineId: string | null;
  routineName: string;
  exercises: Exercise[];
  // V10 (QA 10.0): "a notepad that the client cannot edit, that the hired
  // professional can write his notes to the client" — read-only here.
  coachNote?: string;
}> = ({ open, onClose, routineId, routineName, exercises, coachNote }) => {
  const { saveWorkoutSession, logWorkout, pausedSessions, savePausedSession, clearPausedSession, personalRecords, setPersonalRecord } =
    useApp();
  const [startedAt, setStartedAt] = useState(() => new Date());
  const [elapsed, setElapsed] = useState(0);
  const [logged, setLogged] = useState<LoggedExercise[]>(() => initLoggedExercises(exercises));
  const [rpeOpen, setRpeOpen] = useState(false);
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [setOptionsTarget, setSetOptionsTarget] = useState<{ exIdx: number; setIdx: number } | null>(null);
  // V6 (QA 6.0): the elapsed-time clock no longer starts the instant the
  // sheet opens — a separate Start button (next to the metronome) begins it.
  const [started, setStarted] = useState(false);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  const [emptyFinishOpen, setEmptyFinishOpen] = useState(false);
  const [coachNoteOpen, setCoachNoteOpen] = useState(false);
  // §7.1: which set just animated a completion tick — a per-tap nonce so
  // re-checking the same set re-fires the (CSS-animation, remount-only)
  // sequence instead of doing nothing on a second tap.
  const [tickKey, setTickKey] = useState<string | null>(null);
  const tickNonce = React.useRef(0);
  // QA 11.0: "If a set was selected as a PR and the checkmark was
  // selected confetti flies through the page as a celebration."
  const [confettiActive, setConfettiActive] = useState(false);

  useEffect(() => {
    if (!open || finished || !started) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [open, finished, started]);

  useEffect(() => {
    if (open) {
      // V6 (QA 6.0): a routine that was quit mid-session (not finished)
      // resumes exactly where it was left off — logged sets, elapsed time,
      // and whether the clock had been started.
      const paused = routineId ? pausedSessions[routineId] : undefined;
      if (paused) {
        setLogged(paused.logged);
        setElapsed(paused.elapsedSec);
        setStarted(paused.started);
        setStartedAt(new Date(paused.startedAt));
      } else {
        setLogged(initLoggedExercises(exercises));
        setElapsed(0);
        setStarted(false);
        setStartedAt(new Date());
      }
      setFinished(false);
      setQuitConfirmOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routineId]);

  const totalVolume = useMemo(() => volumeForSession(logged), [logged]);
  const hasProgress = started || logged.some((ex) => ex.sets.some((s) => s.completed));

  if (!open) return null;

  const requestClose = () => {
    if (finished) {
      onClose();
      return;
    }
    if (hasProgress) {
      setQuitConfirmOpen(true);
    } else {
      if (routineId) clearPausedSession(routineId);
      onClose();
    }
  };

  const confirmQuit = () => {
    if (routineId) {
      savePausedSession(routineId, {
        logged,
        elapsedSec: elapsed,
        startedAt: startedAt.toISOString(),
        started,
      });
    }
    setQuitConfirmOpen(false);
    onClose();
  };

  // Portaled to <body> — this can be opened from RoutinesTab, whose wrapper
  // carries `animate-fade-slide-up` (a transform), which would otherwise
  // clip this full-screen `fixed inset-0` sheet to that container instead
  // of the viewport. See BottomSheet.tsx for the same fix + full rationale.

  const updateSet = (exIdx: number, setIdx: number, patch: Partial<LoggedSet>) => {
    setLogged((prev) => {
      const next = [...prev];
      const sets = [...next[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...patch };
      next[exIdx] = { ...next[exIdx], sets };
      return next;
    });
  };

  const addSet = (exIdx: number) => {
    setLogged((prev) => {
      const next = [...prev];
      const sets = next[exIdx].sets;
      const last = sets[sets.length - 1];
      next[exIdx] = {
        ...next[exIdx],
        sets: [
          ...sets,
          { setNumber: sets.length + 1, reps: last?.reps ?? 8, weightKg: last?.weightKg ?? 0, completed: false },
        ],
      };
      return next;
    });
  };

  const hasCompletedSet = logged.some((ex) => ex.sets.some((s) => s.completed));

  const finishWorkout = () => {
    // V10 (QA 10.0): "If you press finish workout and no set is checked,
    // it prompts you that nothing has been added and will instead exit
    // out of the routine without logging it."
    if (!hasCompletedSet) {
      setEmptyFinishOpen(true);
      return;
    }
    const endedAt = new Date();
    saveWorkoutSession({
      routineId,
      routineName,
      date: "2026-08-20",
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSec: elapsed,
      totalVolumeKg: totalVolume,
      exercises: logged,
    });
    logWorkout({
      workoutId: routineId ?? "custom",
      workoutName: routineName,
      durationMin: Math.max(1, Math.round(elapsed / 60)),
      completed: true,
      exercises,
    });
    if (routineId) clearPausedSession(routineId);
    setFinished(true);
    setTimeout(onClose, 900);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 bg-cream flex flex-col animate-fade-in">
      <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-charcoal/5 shrink-0">
        <button
          onClick={requestClose}
          className="tap w-[34px] h-[34px] rounded-full bg-cream-soft flex items-center justify-center text-charcoal-soft"
        >
          <X size={16} />
        </button>
        <div className="text-center">
          <p className="font-display text-[15px] font-bold text-charcoal">{routineName}</p>
          <p className="text-[10.5px] font-medium text-charcoal-faint tabular-nums">
            {started
              ? `Started ${startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${formatDuration(elapsed)} elapsed`
              : elapsed > 0
              ? `Paused · ${formatDuration(elapsed)} elapsed`
              : "Not started"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (!started && elapsed === 0) setStartedAt(new Date());
              setStarted((v) => !v);
            }}
            aria-label={started ? "Pause elapsed time" : "Start elapsed time"}
            className="tap w-[34px] h-[34px] rounded-full bg-primary text-white flex items-center justify-center"
          >
            {started ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
          </button>
          <Metronome />
          {/* V10 (QA 10.0): "a small button with a minimalistic logo of a
              coach, that changes color depending if the coach wrote a
              message for that routine." */}
          <button
            onClick={() => setCoachNoteOpen(true)}
            aria-label="Coach's note"
            className={clsx(
              "tap w-[34px] h-[34px] rounded-full flex items-center justify-center",
              coachNote ? "bg-primary text-white" : "bg-cream-soft text-charcoal-faint"
            )}
          >
            <MessageSquareText size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {logged.map((ex, exIdx) => {
          const meta = exercises.find((e) => e.id === ex.exerciseId);
          return (
          <div key={ex.exerciseId} className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-[15px] text-charcoal">{ex.name}</p>
              <span className="text-[10.5px] font-medium text-charcoal-tertiary tabular-nums">
                {exIdx + 1} of {logged.length}
              </span>
            </div>
            {started && meta && (meta.restSeconds || meta.rpe || meta.tempo) && (
              <p className="text-[11px] text-charcoal-faint mb-1">
                {[
                  meta.restSeconds ? `Rest ${meta.restSeconds}s` : null,
                  meta.rpe ? `RPE ${meta.rpe}` : null,
                  meta.tempo ? `Tempo ${meta.tempo}` : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            )}
            <div
              className="grid gap-2 items-center text-[9.5px] font-semibold text-charcoal-tertiary uppercase tracking-[0.09em] mb-1.5 px-1 mt-2"
              style={{ gridTemplateColumns: "26px 1fr 1fr 30px 30px" }}
            >
              <span>Set</span>
              <span>Weight (kg)</span>
              <span>Reps</span>
              <span></span>
              <span></span>
            </div>
            {/* Design refinement §6.6: "one hairline card with dividers" —
                remove the per-row shadow-soft. Completed sets get a
                distinct row/field treatment, not just the tick. */}
            <div className="rounded-2xl border border-charcoal/[0.11] divide-y divide-charcoal/[0.06] overflow-hidden">
              {ex.sets.map((s, setIdx) => {
                const rowKey = `${exIdx}-${setIdx}`;
                const justTicked = tickKey === rowKey;
                return (
                <div
                  key={setIdx}
                  className={clsx("grid gap-2 items-center px-3 py-2", justTicked && "animate-set-row-settle")}
                  style={{
                    gridTemplateColumns: "26px 1fr 1fr 30px 30px",
                    background: s.completed ? "#EFECF8" : "transparent",
                  }}
                >
                  <span className="text-sm font-bold text-charcoal-faint w-5 flex items-center gap-1">
                    {s.setNumber}
                    {s.setType && s.setType !== "normal" && (
                      <span className="text-[9px] font-bold text-teal-dark bg-teal-pale rounded-full w-4 h-4 flex items-center justify-center">
                        {setTypeBadge[s.setType]}
                      </span>
                    )}
                  </span>
                  <input
                    value={s.weightKg}
                    onChange={(e) => updateSet(exIdx, setIdx, { weightKg: Number(e.target.value) || 0 })}
                    inputMode="decimal"
                    className={clsx(
                      "w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border",
                      s.completed ? "bg-[#E4DFF3] border-primary/[0.16] text-primary-deep-text" : "bg-cream-soft border-charcoal/[0.07] text-charcoal"
                    )}
                  />
                  <input
                    value={s.reps}
                    onChange={(e) => updateSet(exIdx, setIdx, { reps: Number(e.target.value) || 0 })}
                    inputMode="numeric"
                    className={clsx(
                      "w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border",
                      s.completed ? "bg-[#E4DFF3] border-primary/[0.16] text-primary-deep-text" : "bg-cream-soft border-charcoal/[0.07] text-charcoal"
                    )}
                  />
                  <button
                    onClick={() => setSetOptionsTarget({ exIdx, setIdx })}
                    className={clsx(
                      "tap w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-charcoal-faint",
                      (s.notes || s.rpe) && "bg-primary-pale text-primary-dark"
                    )}
                    aria-label={`Set ${s.setNumber} options`}
                  >
                    <MoreHorizontal size={15} />
                  </button>
                  {/* §7.1: a bare colour swap becomes a 420ms three-part
                      confirmation — tick squash/overshoot, an expanding
                      ring, and a delayed check-glyph draw-in. Keyed on a
                      per-tap nonce so CSS animations (which only replay on
                      remount) re-fire on every completion, not just the
                      first. */}
                  <div className="relative w-7 h-7 shrink-0">
                    {justTicked && (
                      <span
                        key={tickKey}
                        className="absolute inset-0 rounded-full border-2 pointer-events-none animate-set-tick-ring"
                        style={{ borderColor: "#AEA1DC" }}
                      />
                    )}
                    <button
                      key={justTicked ? `${tickKey}-btn` : "btn"}
                      onClick={() => {
                        const nowCompleted = !s.completed;
                        updateSet(exIdx, setIdx, { completed: nowCompleted });
                        if (nowCompleted) {
                          tickNonce.current += 1;
                          setTickKey(`${rowKey}-t${tickNonce.current}`);
                          if (s.setType === "pr") {
                            setConfettiActive(true);
                            // QA 12.0: "When choosing PR for a set it
                            // automatically gets added to the one rep max
                            // if it fits the criteria of barbell, dumbbell
                            // or weighted bodyweight" — immediate, rather
                            // than waiting for saveWorkoutSession at the
                            // end of the whole workout.
                            const libEntry = exerciseLibrary.find((l) => l.name === ex.name);
                            if (libEntry && ONE_RM_CLASSIFICATIONS.includes(libEntry.classification) && s.weightKg > 0) {
                              const est = estimate1RM(s.weightKg, s.reps);
                              if (est > (personalRecords[ex.name] ?? 0)) setPersonalRecord(ex.name, est);
                            }
                          }
                        }
                        // V10 (QA 10.0): "If you check off a set, while the
                        // timer is not playing, it automatically plays the
                        // timer as it assumes you have started the routine."
                        if (nowCompleted && !started) {
                          if (elapsed === 0) setStartedAt(new Date());
                          setStarted(true);
                        }
                      }}
                      className={clsx(
                        "tap relative w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                        s.completed ? "bg-primary text-white" : "bg-cream-soft text-charcoal-disabled",
                        justTicked && "animate-set-tick"
                      )}
                    >
                      <Check key={justTicked ? tickKey : "check"} size={13} strokeWidth={3} className={justTicked ? "animate-set-tick-check" : undefined} />
                    </button>
                  </div>
                </div>
                );
              })}
            </div>
            <button
              onClick={() => addSet(exIdx)}
              className="tap flex items-center gap-1.5 text-xs font-semibold text-primary mt-2"
            >
              <Plus size={12} /> Add set
            </button>
          </div>
          );
        })}
      </div>

      <div className="border-t border-charcoal/5 px-5 py-4 shrink-0 bg-cream-card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="section-label text-charcoal-faint">Total volume</p>
            <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">{totalVolume.toLocaleString()} kg</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRpeOpen(true)}
              className="tap flex items-center justify-center gap-1.5 text-xs font-semibold text-charcoal-soft bg-cream-soft rounded-full h-8 px-3.5"
            >
              <Calculator size={13} /> RPE
            </button>
            <button
              onClick={() => setPlateCalcOpen(true)}
              aria-label="Plate calculator"
              className="tap flex items-center justify-center w-8 h-8 text-charcoal-soft bg-cream-soft rounded-full"
            >
              <Weight size={14} />
            </button>
          </div>
        </div>
        <Button fullWidth size="lg" onClick={finishWorkout} disabled={finished}>
          {finished ? (
            "Workout Saved ✓"
          ) : (
            <>
              <Square size={14} /> Finish Workout
            </>
          )}
        </Button>
      </div>

      <RPECalculator open={rpeOpen} onClose={() => setRpeOpen(false)} />
      <PlateCalculatorSheet open={plateCalcOpen} onClose={() => setPlateCalcOpen(false)} />
      {confettiActive && <Confetti onDone={() => setConfettiActive(false)} />}

      <SetOptionsSheet
        open={!!setOptionsTarget}
        onClose={() => setSetOptionsTarget(null)}
        set={setOptionsTarget ? logged[setOptionsTarget.exIdx].sets[setOptionsTarget.setIdx] : null}
        onSave={(patch) => {
          if (!setOptionsTarget) return;
          updateSet(setOptionsTarget.exIdx, setOptionsTarget.setIdx, patch);
        }}
      />

      {emptyFinishOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setEmptyFinishOpen(false)} />
          <div className="relative w-full max-w-xs bg-cream rounded-3xl shadow-lift p-5 animate-pop">
            <p className="font-display font-semibold text-lg text-charcoal mb-1.5">Nothing logged yet</p>
            <p className="text-sm text-charcoal-soft mb-5">
              No sets are checked off, so there's nothing to save. Exiting without logging this workout.
            </p>
            <Button
              fullWidth
              onClick={() => {
                setEmptyFinishOpen(false);
                if (routineId) clearPausedSession(routineId);
                onClose();
              }}
            >
              Exit routine
            </Button>
          </div>
        </div>
      )}

      {coachNoteOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setCoachNoteOpen(false)} />
          <div className="relative w-full max-w-xs bg-cream rounded-3xl shadow-lift p-5 animate-pop">
            <p className="font-display font-semibold text-lg text-charcoal mb-1.5 flex items-center gap-2">
              <MessageSquareText size={16} className="text-primary" /> Coach's note
            </p>
            <p className="text-sm text-charcoal-soft mb-5 whitespace-pre-wrap">
              {coachNote || "Your professional hasn't left a note for this routine yet."}
            </p>
            <Button fullWidth onClick={() => setCoachNoteOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      )}

      {quitConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setQuitConfirmOpen(false)} />
          <div className="relative w-full max-w-xs bg-cream rounded-3xl shadow-lift p-5 animate-pop">
            <p className="font-display font-semibold text-lg text-charcoal mb-1.5">Quit workout?</p>
            <p className="text-sm text-charcoal-soft mb-5">
              Your progress will be saved — you can resume this workout anytime.
            </p>
            <div className="flex gap-2.5">
              <Button variant="outline" fullWidth onClick={() => setQuitConfirmOpen(false)}>
                Keep going
              </Button>
              <Button fullWidth variant="teal" onClick={confirmQuit}>
                Quit
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  );
};
