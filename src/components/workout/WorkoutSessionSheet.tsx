import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { X, Plus, Check, Calculator, Square, MoreHorizontal, Play, Pause, Weight, MessageSquareText } from "lucide-react";
import type {
  BlockResult,
  BlockKind,
  Exercise,
  LoggedExercise,
  LoggedSet,
  SetOutcome,
  WorkoutBlock,
} from "../../types";
import { ONE_RM_CLASSIFICATIONS } from "../../types";
import { useApp } from "../../context/AppContext";
import { Metronome } from "./Metronome";
import { RPECalculator } from "./RPECalculator";
import { PlateCalculatorSheet } from "./PlateCalculatorSheet";
import { SetOptionsSheet } from "./SetOptionsSheet";
import { Confetti } from "./Confetti";
import { Button } from "../ui/Button";
import { formatDuration, estimate1RM } from "../../services/workout";
import { localDayOf } from "../../utils/date";
import {
  countsTowardVolume,
  finalizeExercises,
  initLoggedExercises,
  outcomeOf,
  setRowCount,
} from "../../services/workout/session";
import { formatSeconds, isRoundBased, prescriptionLine, supersetLetter } from "../../services/workout/prescription";
import { blockProblems, blockScore, checkBlockResult } from "../../services/workout/results";
import { groupIntoRuns } from "../../services/workout/blocks";
import { BlockRunner } from "./BlockRunner";
import { EnduranceRunner } from "./EnduranceRunner";
import clsx from "clsx";

const setTypeBadge: Record<string, string> = {
  warmup: "W",
  dropset: "D",
  // LEGACY, still rendered because sessions logged before 20260924280000
  // carry them. Nothing writes these any more: a failure is an outcome, a PR
  // is its own flag, and a superset is a block.
  failure: "F",
  superset: "S",
  pr: "PR",
};

// HOW A SET WENT, as three toggles rather than a classification.
//
// Skipped, failed and PR answer different questions and combine freely — the
// most interesting set anybody logs is a rep-max attempt that ended in a
// grind, which is a PR AND a failure. The old enum could hold only one of
// them at a time, which is exactly why the column was split.
//
// NOT COLOUR ALONE. Each state has a letter or word on the row as well as its
// treatment, so a failed set is still legible in greyscale, to a colour-blind
// reader, and to a screen reader — which reads the row's label and never its
// background.
const OUTCOME_STYLE: Record<SetOutcome, { row: string; ink: string; label: string }> = {
  completed: { row: "#EFECF8", ink: "#4B3F7A", label: "" },
  skipped: { row: "transparent", ink: "#8C8378", label: "Skipped" },
  failed: { row: "#FBEDEB", ink: "#B0402F", label: "F" },
};

/** The gold a PR row wears. Fixed, not --c-primary, which the accent picker swaps. */
const PR_GOLD = "#C8912B";
const PR_GOLD_PALE = "rgba(200,145,43,0.13)";



/**
 * The prescription, as a placeholder rather than a pre-filled answer.
 *
 * "8–12" in a grey placeholder is guidance; 8 typed into the box is a logged
 * set of eight that nobody did. The difference matters most for exactly the
 * prescriptions a coach writes as a range.
 */
function repsPlaceholder(ex: Exercise): string {
  if (ex.minReps != null && ex.maxReps != null) return `${ex.minReps}–${ex.maxReps}`;
  if (ex.minReps != null) return `${ex.minReps}+`;
  if (ex.maxReps != null) return `up to ${ex.maxReps}`;
  return ex.reps != null ? String(ex.reps) : "reps";
}

/** A block result seeded from the block's own shape — the snapshot the row keeps. */
function blockFrom(block: WorkoutBlock): BlockResult {
  return {
    id: block.id,
    kind: block.kind,
    ...(block.label ? { label: block.label } : {}),
    ...(block.timeCapSeconds ? { timeCapSeconds: block.timeCapSeconds } : {}),
    ...(block.intervalSeconds ? { intervalSeconds: block.intervalSeconds } : {}),
    ...(block.rounds ? { rounds: block.rounds } : {}),
  };
}


export const WorkoutSessionSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  routineId: string | null;
  routineName: string;
  exercises: Exercise[];
  /** The groups these exercises are gathered into, if any. */
  blocks?: WorkoutBlock[];
  // V10 (QA 10.0): "a notepad that the client cannot edit, that the hired
  // professional can write his notes to the client" — read-only here.
  coachNote?: string;
}> = ({ open, onClose, routineId, routineName, exercises, blocks = [], coachNote }) => {
  const { saveWorkoutSession, logWorkout, pausedSessions, savePausedSession, clearPausedSession, personalRecords, setPersonalRecord, exerciseCatalog, customExercises, workoutSessions } =
    useApp();
  const [startedAt, setStartedAt] = useState(() => new Date());
  const [elapsed, setElapsed] = useState(0);
  const [logged, setLogged] = useState<LoggedExercise[]>(() => initLoggedExercises(exercises));
  // WHAT EACH BLOCK SCORED, keyed by the block id the exercises point at.
  // Separate from `logged` because a block result is one row per block, not
  // per exercise — the same split the schema makes.
  const [blockResults, setBlockResults] = useState<Record<string, BlockResult>>({});
  const [rpeOpen, setRpeOpen] = useState(false);
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [setOptionsTarget, setSetOptionsTarget] = useState<{ exIdx: number; setIdx: number } | null>(null);
  // V6 (QA 6.0): the elapsed-time clock no longer starts the instant the
  // sheet opens — a separate Start button (next to the metronome) begins it.
  const [started, setStarted] = useState(false);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  const [emptyFinishOpen, setEmptyFinishOpen] = useState(false);
  // The workout is not saved anywhere until the write lands: there is no local
  // fallback for training data, so a failure has to be shown and retryable
  // rather than absorbed. Losing a finished session silently is the one
  // outcome worth designing against here.
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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
        setBlockResults(Object.fromEntries((paused.blockResults ?? []).map((r) => [r.id, r])));
        setElapsed(paused.elapsedSec);
        setStarted(paused.started);
        setStartedAt(new Date(paused.startedAt));
      } else {
        setLogged(initLoggedExercises(exercises));
        setBlockResults({});
        setElapsed(0);
        setStarted(false);
        setStartedAt(new Date());
      }
      setFinished(false);
      setQuitConfirmOpen(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routineId]);

  const totalVolume = useMemo(
    () => logged.reduce((sum, ex) => sum + ex.sets.filter(countsTowardVolume).reduce((v, s) => v + s.reps * s.weightKg, 0), 0),
    [logged]
  );
  // ANY OUTCOME IS PROGRESS, including a skip: deciding not to do a set is a
  // decision worth not losing when the sheet is closed by accident.
  const hasProgress = started || logged.some((ex) => ex.sets.some((s) => s.outcome != null || s.completed));

  /**
   * What this movement was loaded with last time, for the weight placeholder.
   *
   * A HINT, NOT A PRE-FILL. Putting last session's 60 kg in the box logs 60 kg
   * for anyone who taps the tick without reading it, which is how a
   * deload week quietly becomes a record of a normal one. Matched by name
   * because that is what logged_exercises always carries; the library
   * reference can be absent on a movement created offline.
   */
  const lastWeightByName = useMemo(() => {
    const byName = new Map<string, number>();
    // Newest first, so the first sighting of a name is the most recent.
    for (const session of [...workoutSessions].sort((a, b) => b.startedAt.localeCompare(a.startedAt))) {
      for (const ex of session.exercises) {
        if (byName.has(ex.name)) continue;
        const heaviest = Math.max(0, ...ex.sets.filter(countsTowardVolume).map((s) => s.weightKg));
        if (heaviest > 0) byName.set(ex.name, heaviest);
      }
    }
    return byName;
  }, [workoutSessions]);
  const lastWeightFor = (name: string): number => lastWeightByName.get(name) ?? 0;

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
        blockResults: Object.values(blockResults),
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
          // A ROW THE ATHLETE ASKED FOR IS NEVER OPTIONAL, so it is never
          // dropped at the end: leaving it blank is a real skip, whereas an
          // untouched row that was only ever offered is not.
          { setNumber: sets.length + 1, reps: last?.reps ?? 0, weightKg: last?.weightKg ?? 0, completed: false },
        ],
      };
      return next;
    });
  };

  /**
   * Toggles one of the three outcomes on a set.
   *
   * TOGGLEABLE, because every one of these is a thing somebody taps by
   * mistake: pressing the same action again clears it and the row goes back
   * to not-yet-logged. PR is deliberately NOT one of the three — it is a
   * separate flag that combines with any of them, which is the whole reason
   * the column was split out of set_type.
   */
  const setOutcome = (exIdx: number, setIdx: number, outcome: SetOutcome) => {
    const current = logged[exIdx].sets[setIdx];
    const next = current.outcome === outcome ? undefined : outcome;
    updateSet(exIdx, setIdx, {
      outcome: next,
      // Kept in step with what the database's trigger will derive, so the row
      // on screen and the row that comes back agree.
      completed: next != null && next !== "skipped",
    });
    if (next === "completed" || next === "failed") {
      tickNonce.current += 1;
      setTickKey(`${exIdx}-${setIdx}-t${tickNonce.current}`);
    }
    // V10 (QA 10.0): logging anything starts the clock, on the assumption
    // that the routine is under way.
    if (next && !started) {
      if (elapsed === 0) setStartedAt(new Date());
      setStarted(true);
    }
  };

  const togglePr = (exIdx: number, setIdx: number) => {
    const ex = logged[exIdx];
    const s = ex.sets[setIdx];
    const nowPr = !s.isPr;
    updateSet(exIdx, setIdx, { isPr: nowPr });
    if (!nowPr) return;
    // QA 11.0: the confetti, kept.
    setConfettiActive(true);
    // QA 12.0: "When choosing PR for a set it automatically gets added to the
    // one rep max if it fits the criteria of barbell, dumbbell or weighted
    // bodyweight" — immediate, rather than at the end of the whole workout.
    // The catalog OR the user's own movements: both carry a classification,
    // and personal_records can reference either since 20260916210000.
    const libEntry =
      exerciseCatalog.find((l) => l.name === ex.name) ??
      customExercises.find((l) => l.name === ex.name);
    if (libEntry && ONE_RM_CLASSIFICATIONS.includes(libEntry.classification) && s.weightKg > 0) {
      const est = estimate1RM(s.weightKg, s.reps);
      if (est > (personalRecords[ex.name] ?? 0)) {
        setPersonalRecord(ex.name, est, {
          catalogExerciseId: ex.catalogExerciseId,
          customExerciseId: ex.customExerciseId,
        });
      }
    }
  };

  /**
   * One exercise: its heading, the prescription it was given, and its rows.
   *
   * `inBlock` is passed down to the prescription formatter so a member of an
   * AMRAP reads "8 reps per round" and drops the set count the block already
   * governs — the same rule part 1 applies in the routine views.
   */
  /** The kind of block an exercise sits in, for the per-round prescription rule. */
  const blockKindOf = (ex: Exercise): BlockKind =>
    blocks.find((b) => b.id === ex.blockId)?.kind ?? "superset";


  /**
   * A superset, run the way a superset is actually performed.
   *
   * ROUND BY ROUND, NOT EXERCISE BY EXERCISE. A1, B1, rest, A2, B2, rest —
   * which is the entire point of grouping them. Listing each movement with
   * its own block of sets, as every other exercise is listed, tells somebody
   * to do three sets of bench and then three sets of rows, which is the thing
   * a superset is not.
   *
   * THE ROUND COUNT IS THE LONGEST MEMBER'S. A pairing where one movement is
   * prescribed four sets and the other three is a real prescription, and the
   * fourth round simply has one row in it rather than two.
   *
   * REST BELONGS TO THE ROUND, so it is shown once after the pair rather than
   * under each member — resting between A and B would make it two exercises
   * again. The value is the longest rest any member asks for: whoever wrote
   * 90 seconds on the heavier lift meant 90 seconds before going again.
   */
  const renderSupersetRounds = (members: Exercise[]) => {
    const rows = members
      .map((meta) => ({ meta, exIdx: logged.findIndex((l) => l.exerciseId === meta.id) }))
      .filter((m) => m.exIdx >= 0);
    if (rows.length === 0) return null;

    const roundCount = Math.max(...rows.map((m) => logged[m.exIdx].sets.length));
    const restSeconds = Math.max(0, ...members.map((m) => m.restSeconds ?? 0));

    return (
      <div>
        {Array.from({ length: roundCount }).map((_, round) => (
          <div key={round} style={{ marginBottom: 10 }}>
            <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-charcoal-faint mb-1">
              Round {round + 1}
            </p>
            <div className="rounded-2xl border border-charcoal/[0.11] divide-y divide-charcoal/[0.06] overflow-hidden">
              {rows.map(({ meta, exIdx }, memberIndex) => {
                const ex = logged[exIdx];
                const s = ex.sets[round];
                if (!s) return null;
                return (
                  <div key={ex.exerciseId}>
                    <div className="flex items-center justify-between px-3 pt-2">
                      <span className="text-[11.5px] font-semibold text-charcoal">
                        {/* The letter is what a coach writes on the sheet —
                            "A1", "B1" — and is what makes the order readable
                            without counting rows. */}
                        {supersetLetter(memberIndex)}
                        {round + 1} · {ex.name}
                      </span>
                      <span className="text-[10px] text-charcoal-faint">
                        {prescriptionLine(meta, { perRound: false }) || ""}
                      </span>
                    </div>
                    <SetRow
                      set={s}
                      justTicked={!!tickKey?.startsWith(`${exIdx}-${round}-t`)}
                      tickKey={tickKey}
                      repsPlaceholder={repsPlaceholder(meta)}
                      weightPlaceholder={String(meta.weightKg || lastWeightFor(ex.name) || 0)}
                      onChange={(patch) => updateSet(exIdx, round, patch)}
                      onOutcome={(outcome) => setOutcome(exIdx, round, outcome)}
                      onTogglePr={() => togglePr(exIdx, round)}
                      onOptions={() => setSetOptionsTarget({ exIdx, setIdx: round })}
                    />
                  </div>
                );
              })}
            </div>
            {restSeconds > 0 && round < roundCount - 1 && (
              <p className="text-[10.5px] text-charcoal-faint" style={{ marginTop: 4, paddingLeft: 2 }}>
                Rest {formatSeconds(restSeconds)} before the next round.
              </p>
            )}
          </div>
        ))}
        <button
          onClick={() => rows.forEach(({ exIdx }) => addSet(exIdx))}
          className="tap flex items-center gap-1.5 text-xs font-semibold text-primary"
        >
          {/* One more round, not one more set of one movement — adding a set
              to half a superset is the same mistake as rendering it as two
              separate exercises. */}
          <Plus size={12} /> Add a round
        </button>
      </div>
    );
  };


  const renderExercise = (meta: Exercise, inBlock: boolean) => {
    const exIdx = logged.findIndex((l) => l.exerciseId === meta.id);
    if (exIdx < 0) return null;
    const ex = logged[exIdx];
    const line = prescriptionLine(meta, { perRound: inBlock && isRoundBased(blockKindOf(meta)) });
    const { asked } = setRowCount(meta);
    const repsHint = repsPlaceholder(meta);
    const weightHint = meta.weightKg || lastWeightFor(ex.name);

    return (
      <div key={ex.exerciseId} className="mb-6">
        <div className="flex items-center justify-between mb-1">
          <p className="font-semibold text-[15px] text-charcoal">{ex.name}</p>
          <span className="text-[10.5px] font-medium text-charcoal-tertiary tabular-nums">
            {exIdx + 1} of {logged.length}
          </span>
        </div>
        {/* THE PRESCRIPTION, from part 1's formatter rather than a second
            hand-rolled list of the same fields. It used to appear only once
            the clock was running and only for rest/RPE/tempo, so an athlete
            reading the screen before starting could not see what they had
            been asked to do. */}
        {line && <p className="text-[11px] text-charcoal-faint mb-1">{line}</p>}
        {meta.endurancePlan ? (
          <EnduranceRunner
            plan={meta.endurancePlan}
            result={ex.enduranceResult}
            onResult={(enduranceResult) =>
              setLogged((prev) => prev.map((l, n) => (n === exIdx ? { ...l, enduranceResult } : l)))
            }
            onStarted={() => {
              if (started) return;
              if (elapsed === 0) setStartedAt(new Date());
              setStarted(true);
            }}
          />
        ) : (
        <>
        <div
          className="grid gap-2 items-center text-[9.5px] font-semibold text-charcoal-tertiary uppercase tracking-[0.09em] mb-1.5 px-1 mt-2"
          style={{ gridTemplateColumns: "34px 1fr 1fr 30px 30px" }}
        >
          <span>Set</span>
          <span>Weight (kg)</span>
          <span>Reps</span>
          <span></span>
          <span></span>
        </div>
        {/* Design refinement §6.6: "one hairline card with dividers" — no
            per-row shadow. The outcome gives the row its treatment. */}
        <div className="rounded-2xl border border-charcoal/[0.11] divide-y divide-charcoal/[0.06] overflow-hidden">
          {ex.sets.map((s, setIdx) => (
            <SetRow
              key={setIdx}
              set={s}
              justTicked={!!tickKey?.startsWith(`${exIdx}-${setIdx}-t`)}
              tickKey={tickKey}
              repsPlaceholder={repsHint}
              weightPlaceholder={weightHint ? String(weightHint) : "0"}
              onChange={(patch) => updateSet(exIdx, setIdx, patch)}
              onOutcome={(outcome) => setOutcome(exIdx, setIdx, outcome)}
              onTogglePr={() => togglePr(exIdx, setIdx)}
              onOptions={() => setSetOptionsTarget({ exIdx, setIdx })}
            />
          ))}
        </div>
        {asked > 0 && ex.sets.some((s) => s.optional) && (
          <p className="text-[10.5px] text-charcoal-faint mt-1.5">
            {asked} asked for · the rest are yours if you want them.
          </p>
        )}
        <button
          onClick={() => addSet(exIdx)}
          className="tap flex items-center gap-1.5 text-xs font-semibold text-primary mt-2"
        >
          <Plus size={12} /> Add set
        </button>
        </>
        )}
      </div>
    );
  };


  // SOMETHING HAPPENED, which is not the same as "a set was ticked". A block
  // scored and an endurance effort recorded are both real sessions with no
  // completed set in them — an AMRAP of three movements can be a whole
  // workout, and refusing to save it would throw the session away.
  const hasCompletedSet =
    logged.some((ex) => ex.sets.some((s) => s.completed) || ex.enduranceResult) ||
    Object.values(blockResults).some((r) => checkBlockResult(r) === null && blockScore(r) !== "");


  const finishWorkout = async () => {
    // V10 (QA 10.0): "If you press finish workout and no set is checked,
    // it prompts you that nothing has been added and will instead exit
    // out of the routine without logging it."
    if (!hasCompletedSet) {
      setEmptyFinishOpen(true);
      return;
    }
    // Caught here rather than at the insert: a CHECK violation at the end of
    // a workout costs the whole session, and the message it raises names a
    // constraint rather than telling anybody what to do about it.
    const problems = blockProblems(blocks, blockResults);
    if (problems.length > 0) {
      setSaveError(`${problems[0].heading}: ${problems[0].message}`);
      return;
    }
    const endedAt = new Date();
    setSaving(true);
    setSaveError(null);
    const result = await saveWorkoutSession({
      routineId,
      routineName,
      // DERIVED FROM startedAt, not from "what day is it now". A session begun
      // at 23:40 and finished at 00:10 belongs to the day it started, which is
      // also the day the professional dashboard will read off started_at —
      // the column this same object writes. Taking today's date here instead
      // would make the two disagree for exactly the sessions that straddle
      // midnight.
      date: localDayOf(startedAt),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSec: elapsed,
      totalVolumeKg: totalVolume,
      // FINALIZED, not as they sit on screen: rows that were only ever
      // offered and never touched are dropped rather than filed as skipped,
      // and every row that survives gets the outcome it earned. A complete
      // 3-of-3-5 session must not read as two fifths abandoned.
      exercises: finalizeExercises(logged),
      blockResults: Object.values(blockResults),
    });
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.message ?? "Couldn't save this workout.");
      return;
    }
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
        {/* GROUPED THE WAY THE ROUTINE IS. An exercise inside a superset or an
            AMRAP is not a free-standing thing with its own set count, and
            showing it as one loses the instruction the coach actually gave. */}
        {groupIntoRuns(exercises, blocks).map((run) =>
          run.block ? (
            <BlockRunner
              key={run.block.id}
              block={run.block}
              ordinal={run.ordinal}
              result={blockResults[run.block.id]}
              onResult={(patch) =>
                setBlockResults((prev) => ({
                  ...prev,
                  [run.block!.id]: { ...blockFrom(run.block!), ...prev[run.block!.id], ...patch },
                }))
              }
              onStarted={() => {
                if (started) return;
                if (elapsed === 0) setStartedAt(new Date());
                setStarted(true);
              }}
            >
              {run.block.kind === "superset"
                ? renderSupersetRounds(run.members)
                : run.members.map((meta) => renderExercise(meta, true))}
            </BlockRunner>
          ) : (
            run.members.map((meta) => renderExercise(meta, false))
          )
        )}
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
        {saveError && (
          <p className="text-[11.5px] font-semibold text-status-high text-center mb-2">{saveError}</p>
        )}
        <Button fullWidth size="lg" onClick={() => void finishWorkout()} disabled={finished || saving}>
          {finished ? (
            "Workout Saved ✓"
          ) : saving ? (
            "Saving…"
          ) : saveError ? (
            <>
              <Square size={14} /> Try again
            </>
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


/**
 * One set row: its numbers, how it went, and whether it was a record.
 *
 * FOUR ACTIONS, NOT ONE CHECKBOX. ✓, skip, fail and PR are separate answers —
 * the first three are the outcome (one at a time, each toggleable because
 * each is a thing somebody taps by mistake) and PR is a flag that combines
 * with any of them. A rep-max attempt that ended in a grind is a PR AND a
 * failure, and it is the most interesting set anybody logs.
 *
 * EVERY STATE IS LEGIBLE WITHOUT COLOUR. A skipped row is struck through, a
 * failed one carries "Failed", a record carries "PR" — so the row survives
 * greyscale, colour blindness and a screen reader, which reads the labels and
 * never the background.
 *
 * REDUCED MOTION IS HANDLED IN CSS, not by a branch here: `animate-pr-glow`
 * resolves to a static gold inside the stylesheet's prefers-reduced-motion
 * block, so this component has one appearance and the setting decides whether
 * it moves.
 */
const SetRow: React.FC<{
  set: LoggedSet;
  justTicked: boolean;
  tickKey: string | null;
  repsPlaceholder: string;
  weightPlaceholder: string;
  onChange: (patch: Partial<LoggedSet>) => void;
  onOutcome: (outcome: SetOutcome) => void;
  onTogglePr: () => void;
  onOptions: () => void;
}> = ({
  set: s,
  justTicked,
  tickKey,
  repsPlaceholder,
  weightPlaceholder,
  onChange,
  onOutcome,
  onTogglePr,
  onOptions,
}) => {
  const outcome = outcomeOf(s);
  const style = outcome ? OUTCOME_STYLE[outcome] : null;
  const skipped = outcome === "skipped";
  // An offered row nobody has touched is quieter than a prescribed one, so
  // "you were asked for this" and "this is here if you want it" are told
  // apart before either is filled in.
  const muted = (!!s.optional && !outcome) || skipped;

  // The row's colour, and the deeper tint the completion animation starts
  // from. BOTH ARE HANDED TO THE KEYFRAMES, because the animation's fill mode
  // is `both` — whatever it ends on wins over this inline background for as
  // long as the class is applied, so a hard-coded end frame repainted a
  // failed set and a personal record as completed.
  const rowBackground = s.isPr ? PR_GOLD_PALE : outcome ? OUTCOME_STYLE[outcome].row : "transparent";
  const settleFrom = s.isPr
    ? "rgba(200,145,43,0.30)"
    : outcome === "failed"
    ? "#F3D9D4"
    : "#DED7F1";

  const field = clsx(
    "w-full rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 border",
    skipped && "line-through",
    outcome === "failed"
      ? "bg-[#F6E2DF] border-[#B0402F]/20 text-[#8E3325]"
      : outcome === "completed"
      ? "bg-[#E4DFF3] border-primary/[0.16] text-primary-deep-text"
      : "bg-cream-soft border-charcoal/[0.07] text-charcoal"
  );

  return (
    <div
      className={clsx("grid gap-2 items-center px-3 py-2", justTicked && "animate-set-row-settle")}
      style={{
        gridTemplateColumns: "34px 1fr 1fr 30px 30px",
        background: rowBackground,
        ["--settle-from" as string]: settleFrom,
        ["--settle-to" as string]: rowBackground,
        opacity: muted ? 0.62 : 1,
        ...(s.isPr ? { boxShadow: `inset 3px 0 0 ${PR_GOLD}` } : {}),
      }}
    >
      <span className="text-sm font-bold text-charcoal-faint flex items-center gap-1">
        <span className={clsx("tabular-nums", skipped && "line-through")}>{s.setNumber}</span>
        {s.setType && s.setType !== "normal" && (
          <span className="text-[9px] font-bold text-charcoal-soft dark:text-teal-deep-text bg-teal-pale rounded-full w-4 h-4 flex items-center justify-center">
            {setTypeBadge[s.setType]}
          </span>
        )}
      </span>
      <input
        value={s.weightKg || ""}
        onChange={(e) => onChange({ weightKg: Number(e.target.value) || 0 })}
        placeholder={weightPlaceholder}
        inputMode="decimal"
        aria-label={`Set ${s.setNumber} weight`}
        className={field}
      />
      <input
        value={s.reps || ""}
        onChange={(e) => onChange({ reps: Number(e.target.value) || 0 })}
        placeholder={repsPlaceholder}
        inputMode="numeric"
        aria-label={`Set ${s.setNumber} reps`}
        className={field}
      />
      <button
        onClick={onOptions}
        className={clsx(
          "tap w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-charcoal-faint",
          (s.notes || s.rpe) && "bg-primary-pale text-primary-dark"
        )}
        aria-label={`Set ${s.setNumber} options`}
      >
        <MoreHorizontal size={15} />
      </button>
      {/* §7.1: a bare colour swap becomes a 420ms three-part confirmation —
          tick squash/overshoot, an expanding ring, and a delayed check-glyph
          draw-in. Keyed on a per-tap nonce so CSS animations (which only
          replay on remount) re-fire on every completion, not just the
          first. */}
      <div className="relative w-7 h-7 shrink-0">
        {justTicked && (
          <span
            key={tickKey}
            className="absolute inset-0 rounded-full border-2 pointer-events-none animate-set-tick-ring"
            style={{ borderColor: outcome === "failed" ? "#D49A8E" : "#AEA1DC" }}
          />
        )}
        <button
          key={justTicked ? `${tickKey}-btn` : "btn"}
          onClick={() => onOutcome("completed")}
          aria-pressed={outcome === "completed"}
          aria-label={`Mark set ${s.setNumber} complete`}
          className={clsx(
            "tap relative w-7 h-7 rounded-full flex items-center justify-center shrink-0",
            outcome === "completed" ? "bg-primary text-white" : "bg-cream-soft text-charcoal-disabled",
            justTicked && "animate-set-tick"
          )}
        >
          <Check
            key={justTicked ? tickKey : "check"}
            size={13}
            strokeWidth={3}
            className={justTicked ? "animate-set-tick-check" : undefined}
          />
        </button>
      </div>
      {/* The three that do not fit the grid's five columns sit under it, where
          they are reachable without a long-press or a hidden menu. */}
      <div className="col-span-5 flex items-center" style={{ gap: 6, paddingTop: 2 }}>
        <OutcomeChip
          active={outcome === "skipped"}
          onClick={() => onOutcome("skipped")}
          label="Skip"
          aria={`Mark set ${s.setNumber} skipped`}
          activeStyle={{ background: "#EDEAE5", color: "#5B5349" }}
        />
        <OutcomeChip
          active={outcome === "failed"}
          onClick={() => onOutcome("failed")}
          label="Fail"
          aria={`Mark set ${s.setNumber} failed`}
          activeStyle={{ background: "#F3D9D4", color: "#8E3325" }}
        />
        <OutcomeChip
          active={!!s.isPr}
          onClick={onTogglePr}
          label="PR"
          aria={`Mark set ${s.setNumber} a personal record`}
          activeStyle={{ background: PR_GOLD_PALE, color: "#8A6318" }}
          className={s.isPr ? "animate-pr-glow" : undefined}
        />
        <span className="ml-auto flex items-center" style={{ gap: 6 }}>
          {style?.label && outcome !== "completed" && (
            <span className="text-[10px] font-bold" style={{ color: style.ink }}>
              {outcome === "failed" ? "Failed" : style.label}
            </span>
          )}
          {s.isPr && (
            <span className="text-[10px] font-bold" style={{ color: "#8A6318" }}>
              PR
            </span>
          )}
        </span>
      </div>
    </div>
  );
};

const OutcomeChip: React.FC<{
  active: boolean;
  onClick: () => void;
  label: string;
  aria: string;
  activeStyle: React.CSSProperties;
  className?: string;
}> = ({ active, onClick, label, aria, activeStyle, className }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    aria-label={aria}
    className={clsx("tap text-[10px] font-bold transition-colors", className)}
    style={{
      borderRadius: 999,
      padding: "3px 9px",
      border: "1px solid rgba(36,31,27,0.12)",
      ...(active ? activeStyle : { background: "transparent", color: "#8C8378" }),
    }}
  >
    {label}
  </button>
);
