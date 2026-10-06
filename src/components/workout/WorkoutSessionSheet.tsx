import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Plus,
  Check,
  Calculator,
  Square,
  EllipsisVertical,
  Play,
  Pause,
  MessageSquareText,
  ChevronDown,
  Pin,
  Timer,
  Link2,
  Unlink,
} from "lucide-react";
import type { BlockResult, BlockKind, Exercise, LoggedExercise, LoggedSet, SessionTimers, WorkoutBlock } from "../../types";
import { ONE_RM_CLASSIFICATIONS } from "../../types";
import { useApp } from "../../context/AppContext";
import { CyclePhaseChip } from "../cycle/CyclePhaseStrip";
import { Metronome } from "./Metronome";
import { RPECalculator } from "./RPECalculator";
import { PlateCalculatorSheet } from "./PlateCalculatorSheet";
import { SetOptionsSheet } from "./SetOptionsSheet";
import { PrBurst } from "./Confetti";
import { CoachNotePopup } from "./CoachNotePopup";
import { Button } from "../ui/Button";
import { BottomSheet } from "../ui/BottomSheet";
import { PopupMenu, type PopupMenuOption } from "../ui/PopupMenu";
import { formatDuration, estimate1RM, loadKg, formatSetWeight } from "../../services/workout";
import { WeightField } from "./WeightField";
import { localDayOf } from "../../utils/date";
import { countsTowardVolume, finalizeExercises, initLoggedExercises, isTouched, reconcileLogged, resolveLoggedValues, setRowCount, upgradeLegacyBlankWeights } from "../../services/workout/session";
import { formatClock, isRoundBased, prescriptionLine } from "../../services/workout/prescription";
import { blockProblems, blockScore, checkBlockResult } from "../../services/workout/results";
import { groupIntoRuns } from "../../services/workout/blocks";
import { exerciseKey, kindFields, lastSessionPrefill, setKind, HANDOVER_SET_TYPES, type HandoverSetType } from "../../services/workout/stats";
import { loggerShades, placeholderOpacity, playInk, playText, routineFamily, type FolderFamily, type LoggerShades } from "../../data/folderColors";
import { useIsDark } from "../../hooks/useIsDark";
import { PR_BAR, typeStyles } from "./setTypeStyle";
import { BlockRunner } from "./BlockRunner";
import { EnduranceRunner } from "./EnduranceRunner";
import clsx from "clsx";

// Set-type colours (one definition, shared with WO10): see setTypeStyle.ts.
// Super set (exercise level only) = soft coral: bracket #DB885D, badge
// #FBE7DC / #B4602F, from the frame.
const SS_BRACKET = "#DB885D";

/**
 * Mobile v5.1 R3, dark mode (no light islands). The handover draws this view
 * in light only; dark takes the v5.1 dark tokens (Foundations 2.1). Colours
 * whose light value is already a token are written as the token; these are
 * the rest, as [light, dark]: danger (#FF6B5E is danger dark), the Add set
 * link (primary.deep dark), the super-set badge (its bracket hue as a dark
 * tint, ink lifted to 4.5:1), the set-type divider, the un-ticked check (3:1
 * on surface.soft), the skipped strike line and the note field's border
 * (border.option dark).
 */
const SESSION_COLORS = {
  danger: ["#B4372C", "#FF6B5E"],
  addSet: ["rgb(var(--th-aea1dc))", "rgb(var(--th-b7abde))"],
  ssBadgeBg: ["#FBE7DC", "#4A3A37"],
  ssBadgeInk: ["#B4602F", "#E6A27F"],
  divider: ["#E0DFDF", "rgba(238,239,242,0.12)"],
  uncheck: ["#C9C2B8", "#8A8698"],
  strike: ["#8A8887", "#8A8698"],
  fieldBorder: ["#E7E7EC", "rgba(238,239,242,0.10)"],
} as const;
const sessionColor = (key: keyof typeof SESSION_COLORS, dark: boolean): string => SESSION_COLORS[key][dark ? 1 : 0];

// Rest timer: 0:30–5:00 in 15 s steps, or Off (WO8 exercise ⋮ menu).
const REST_OPTIONS: PopupMenuOption[] = [
  { value: "0", label: "Off" },
  ...Array.from({ length: 19 }, (_, i) => 30 + i * 15).map((s) => ({ value: String(s), label: formatClock(s) })),
];

/** The prescription as a placeholder, never pre-filled: "8–12" is guidance. */
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

/**
 * A fresh session's rows: the template's shape with EMPTY fields, because
 * the values now live in greyed placeholders (last session's, else the
 * template's) until the athlete types or checks the set (WO8 prefill).
 */
function freshLogged(exercises: Exercise[]): LoggedExercise[] {
  return initLoggedExercises(exercises).map((ex) => ({
    ...ex,
    sets: ex.sets.map((s) => ({ ...s, weightKg: null, reps: 0 })),
  }));
}

/** Working-set numbers: only Normal, PR and Drop set count (02 Set types). */
function workingNumbers(sets: LoggedSet[]): (number | null)[] {
  let n = 0;
  return sets.map((s) => {
    const k = setKind(s);
    return k === "normal" || k === "pr" || k === "drop" ? ++n : null;
  });
}

let localBlockSeq = 0;

export const WorkoutSessionSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  routineId: string | null;
  routineName: string;
  exercises: Exercise[];
  /** The groups these exercises are gathered into, if any. */
  blocks?: WorkoutBlock[];
  // V10 (QA 10.0): a read-only note from the hired professional.
  coachNote?: string;
}> = ({ open, onClose, routineId, routineName, exercises, blocks = [], coachNote }) => {
  const {
    saveWorkoutSession,
    logWorkout,
    pausedSessions,
    savePausedSession,
    clearPausedSession,
    personalRecords,
    setPersonalRecord,
    exerciseCatalog,
    customExercises,
    workoutSessions,
    routines,
    routineFolders,
    updateRoutine,
    markCoachNoteRead,
    activeSession,
    setActiveSession,
  } = useApp();

  const routineRow = routineId ? routines.find((r) => r.id === routineId) ?? null : null;
  // 02 Folder colour tokens: parent folder → routine's own colour → lavender.
  const dark = useIsDark();
  const family: FolderFamily = routineFamily(routineRow, routineFolders);
  const shades: LoggerShades = loggerShades(family, dark);

  // THE TEMPLATE THE LOGGER EDITS (pinned notes, rest timers, super sets are
  // stored per exercise in the routine template — WO8 data). A local mirror,
  // because a routine save replaces its exercise rows; logged exercises are
  // matched to it BY POSITION, which a save never changes.
  const [template, setTemplate] = useState<{ exercises: Exercise[]; blocks: WorkoutBlock[] }>({ exercises, blocks });
  const [logged, setLogged] = useState<LoggedExercise[]>(() => freshLogged(exercises));
  const [blockResults, setBlockResults] = useState<Record<string, BlockResult>>({});
  const [startedAt, setStartedAt] = useState(() => new Date());
  // THE CLOCK IS TIMESTAMP-BASED so it keeps running while the logger is
  // minimised (WO17): elapsed = base + (now − runSince) while running.
  const [baseElapsed, setBaseElapsed] = useState(0);
  const [runSince, setRunSince] = useState<number | null>(null);
  const [, setNow] = useState(Date.now());
  const started = runSince !== null;
  const elapsed = Math.floor(baseElapsed + (runSince !== null ? (Date.now() - runSince) / 1000 : 0));

  const [rpeOpen, setRpeOpen] = useState(false);
  const [plateCalcOpen, setPlateCalcOpen] = useState(false);
  const [finished, setFinished] = useState(false);
  const [setOptionsTarget, setSetOptionsTarget] = useState<{ exIdx: number; setIdx: number } | null>(null);
  const [quitConfirmOpen, setQuitConfirmOpen] = useState(false);
  const [emptyFinishOpen, setEmptyFinishOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [coachNoteOpen, setCoachNoteOpen] = useState(false);
  // WO25: unread = a note exists and (never read, or read before it last changed).
  const noteText = routineRow?.coachNote ?? coachNote;
  const noteUnread =
    !!noteText &&
    (!routineRow?.coachNoteReadAt ||
      (!!routineRow.coachNoteUpdatedAt && routineRow.coachNoteReadAt < routineRow.coachNoteUpdatedAt));
  const [tickKey, setTickKey] = useState<string | null>(null);
  const tickNonce = useRef(0);
  const [burst, setBurst] = useState<{ key: number; rect: { left: number; top: number; width: number; height: number } } | null>(null);
  // Set-type dropdown, anchored to the set-number slot.
  const [typeMenu, setTypeMenu] = useState<{ exIdx: number; setIdx: number; anchor: HTMLElement } | null>(null);
  // Exercise ⋮ menu and its two follow-ups (rest times, super-set partner).
  const [exMenu, setExMenu] = useState<{ exIdx: number; anchor: HTMLElement; view: "main" | "rest" | "superset" } | null>(null);
  // The follow-up a main-menu pick asked for. PopupMenu calls onSelect and
  // then onClose, so onClose reads this to switch views instead of closing.
  const exMenuNext = useRef<"rest" | "superset" | null>(null);
  const [pinEditor, setPinEditor] = useState<{ exIdx: number; text: string } | null>(null);
  // Block, endurance and rest timers, held here (not in the runners) and saved
  // with the session, so minimising or quitting never restarts them.
  const [timers, setTimers] = useState<SessionTimers>({});
  // The rest divider under the last checked set counts down.
  const rest = timers.rest ?? null;
  type Rest = NonNullable<SessionTimers["rest"]>;
  const setRest = (next: Rest | null | ((r: Rest | null) => Rest | null)) =>
    setTimers((t) => ({ ...t, rest: typeof next === "function" ? next(t.rest ?? null) : next }));
  const [needReps, setNeedReps] = useState<string | null>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());
  const scrollRef = useRef<HTMLDivElement>(null);
  // The restored list, until the logger has scrolled to its current exercise.
  const scrollToCurrent = useRef<LoggedExercise[] | null>(null);

  const prefill = useMemo(
    () => (routineId ? lastSessionPrefill(workoutSessions, routineId) : new Map<string, { weight: number | null; reps: number | null }[]>()),
    // Read once per opening: finishing this session must not re-seed its own placeholders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, routineId]
  );

  useEffect(() => {
    if (!open || finished || (runSince === null && !rest)) return;
    const id = window.setInterval(() => {
      setNow(Date.now());
      // A finished countdown goes back to showing the rest time.
      setRest((r) => (r && Date.now() >= r.endsAt ? null : r));
    }, 1000);
    return () => window.clearInterval(id);
  }, [open, finished, runSince, rest]);

  useEffect(() => {
    if (!open) return;
    const now = Date.now();
    const act = activeSession && activeSession.routineId === routineId ? activeSession : null;
    const paused = routineId ? pausedSessions[routineId] : undefined;
    setTemplate({ exercises, blocks });
    if (paused) {
      // The routine may have been edited while this was paused: progress
      // follows each exercise by its id, never its position.
      const restored = reconcileLogged(upgradeLegacyBlankWeights(paused.logged), freshLogged(exercises));
      scrollToCurrent.current = restored;
      setLogged(restored);
      setBlockResults(Object.fromEntries((paused.blockResults ?? []).map((r) => [r.id, r])));
      // A rest that ran out while the logger was closed is simply over.
      const held = paused.timers ?? {};
      const r = held.rest;
      // The rest divider points at a position; keep it only if the same
      // exercise is still there.
      const sameSpot = r && paused.logged[r.exIdx]?.exerciseId === restored[r.exIdx]?.exerciseId;
      setTimers({ ...held, rest: r && sameSpot && r.endsAt > now ? r : null });
      const start = new Date(paused.startedAt);
      setStartedAt(start);
      if (act && act.status === "running") {
        setBaseElapsed(Math.max(0, (now - Date.parse(act.startedAt) - act.pausedMs) / 1000));
        setRunSince(now);
      } else if (act && act.status === "paused" && act.pausedAt) {
        setBaseElapsed(Math.max(0, (Date.parse(act.pausedAt) - Date.parse(act.startedAt) - act.pausedMs) / 1000));
        setRunSince(null);
      } else {
        setBaseElapsed(paused.elapsedSec);
        setRunSince(paused.started ? now : null);
      }
    } else {
      setLogged(freshLogged(exercises));
      setBlockResults({});
      setTimers({});
      setBaseElapsed(0);
      setRunSince(null);
      setStartedAt(new Date());
    }
    setFinished(false);
    setQuitConfirmOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, routineId]);

  const totalVolume = useMemo(
    () => logged.reduce((sum, ex) => sum + ex.sets.filter(countsTowardVolume).reduce((v, s) => v + s.reps * loadKg(s), 0), 0),
    [logged]
  );
  const hasProgress = started || elapsed > 0 || logged.some((ex) => ex.sets.some((s) => s.outcome != null || s.completed));
  // The first exercise with a set still to log, for "Exercise X of Y" (WO17);
  // once every set is logged, the last exercise.
  const firstOpen = logged.findIndex((ex) => ex.sets.some((s) => !s.completed && s.outcome == null));
  const currentExercise = firstOpen === -1 ? Math.max(0, logged.length - 1) : firstOpen;

  // A resumed session (the WO17 bar, a Routines row) reopens at the current exercise.
  useEffect(() => {
    // Only once the restored list has rendered (the first pass still shows a fresh one).
    if (!open || !scrollToCurrent.current || logged !== scrollToCurrent.current) return;
    scrollToCurrent.current = null;
    if (currentExercise === 0) return;
    scrollRef.current?.querySelector(`[data-ex="${currentExercise}"]`)?.scrollIntoView({ block: "start" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, logged]);

  // THE ACTIVE SESSION (03, WO17): mirrored whenever the clock or progress
  // changes, so the bar and the Routines row read the same state.
  const pushActive = (status: "running" | "paused", minimised = false, at = Date.now(), el = elapsed) => {
    if (!routineId) return;
    const startMs = startedAt.getTime();
    setActiveSession({
      routineId,
      currentExercise,
      startedAt: startedAt.toISOString(),
      pausedAt: status === "paused" ? new Date(at).toISOString() : null,
      pausedMs: Math.max(0, at - startMs - el * 1000),
      status,
      minimised,
    });
  };
  useEffect(() => {
    if (!open || finished || !routineId || !hasProgress) return;
    pushActive(started ? "running" : "paused");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, started, currentExercise, hasProgress]);

  if (!open) return null;

  const clearActive = () => {
    setActiveSession((prev) => (prev?.routineId === routineId ? null : prev));
  };

  const startClock = () => {
    if (runSince !== null) return;
    if (elapsed === 0) setStartedAt(new Date());
    setRunSince(Date.now());
  };
  const toggleClock = () => {
    if (runSince !== null) {
      setBaseElapsed(elapsed);
      setRunSince(null);
    } else startClock();
  };

  const snapshot = () => {
    if (!routineId) return;
    savePausedSession(routineId, {
      blockResults: Object.values(blockResults),
      logged,
      elapsedSec: elapsed,
      startedAt: startedAt.toISOString(),
      started,
      timers,
    });
  };

  const requestClose = () => {
    if (finished) {
      onClose();
      return;
    }
    if (hasProgress) setQuitConfirmOpen(true);
    else {
      if (routineId) clearPausedSession(routineId);
      clearActive();
      onClose();
    }
  };

  // Quit saves progress and removes the active-workout bar; the session stays
  // resumable from its Routines row (WO8 quit dialog, WO17 g).
  const confirmQuit = () => {
    snapshot();
    clearActive();
    setQuitConfirmOpen(false);
    onClose();
  };

  // ⌄ minimise (approved decision 17): the session keeps going behind the
  // WO17 bar. Progress is saved so nothing is lost if the app is closed.
  const minimise = () => {
    if (!hasProgress) {
      requestClose();
      return;
    }
    snapshot();
    pushActive(started ? "running" : "paused", true);
    onClose();
  };

  // --- template edits (pinned note, rest timer, super set) ---------------

  const saveTemplate = (next: { exercises: Exercise[]; blocks: WorkoutBlock[] }) => {
    setTemplate(next);
    if (!routineRow) return;
    void updateRoutine(routineRow.id, { exercises: next.exercises, blocks: next.blocks }).then((msg) => {
      if (msg) setSaveError(msg);
    });
  };
  const patchExercise = (exIdx: number, patch: Partial<Exercise>) =>
    saveTemplate({
      ...template,
      exercises: template.exercises.map((e, i) => (i === exIdx ? { ...e, ...patch } : e)),
    });
  const pairSuperset = (a: number, b: number) => {
    const id = `blk${Date.now()}${localBlockSeq++}`;
    const [lo, hi] = a < b ? [a, b] : [b, a];
    saveTemplate({
      blocks: [...template.blocks, { id, kind: "superset" }],
      exercises: template.exercises.map((e, i) => (i === lo || i === hi ? { ...e, blockId: id } : e)),
    });
  };
  const removeSuperset = (exIdx: number) => {
    const id = template.exercises[exIdx]?.blockId;
    if (!id) return;
    saveTemplate({
      blocks: template.blocks.filter((b) => b.id !== id),
      exercises: template.exercises.map((e) => (e.blockId === id ? { ...e, blockId: null } : e)),
    });
  };
  const blockOf = (ex: Exercise | undefined) => (ex?.blockId ? template.blocks.find((b) => b.id === ex.blockId) ?? null : null);
  // Super sets pair ADJACENT exercises only, as a two-member block (approved
  // decision 16): the partners on offer are the neighbours not already grouped.
  const partnersFor = (exIdx: number) =>
    [exIdx - 1, exIdx + 1].filter((i) => {
      const e = template.exercises[i];
      return e && !e.blockId && !e.endurancePlan && i !== exIdx;
    });

  // --- sets ----------------------------------------------------------------

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
      // A row the athlete asked for is never optional (never dropped at the
      // end); it starts empty, with the template's values as placeholders.
      next[exIdx] = { ...next[exIdx], sets: [...sets, { setNumber: sets.length + 1, reps: 0, weightKg: null, completed: false }] };
      return next;
    });
  };

  /** The greyed values a set shows: last session's, else the template's. */
  const placeholdersFor = (exIdx: number, setIdx: number) => {
    const meta = template.exercises[exIdx];
    const ex = logged[exIdx];
    const last = ex ? prefill.get(exerciseKey(ex))?.[setIdx] : undefined;
    return {
      // No last value and no prescribed load: an empty field, not a greyed
      // "0" (a blank weight still logs as 0, i.e. bodyweight).
      weight: last?.weight != null ? String(last.weight) : meta?.weightKg != null ? String(meta.weightKg) : "",
      reps: last?.reps != null ? String(last.reps) : meta ? repsPlaceholder(meta) : "reps",
    };
  };

  const recordPr = (exIdx: number, s: LoggedSet) => {
    const ex = logged[exIdx];
    // QA 12.0: a PR on a barbell, dumbbell or weighted-bodyweight movement
    // updates the one-rep max immediately.
    const libEntry = exerciseCatalog.find((l) => l.name === ex.name) ?? customExercises.find((l) => l.name === ex.name);
    if (libEntry && ONE_RM_CLASSIFICATIONS.includes(libEntry.classification) && loadKg(s) > 0) {
      // No 1RM from a bodyweight set (0 kg of external load).
      const est = estimate1RM(loadKg(s), s.reps);
      if (est > (personalRecords[ex.name] ?? 0)) {
        setPersonalRecord(ex.name, est, { catalogExerciseId: ex.catalogExerciseId, customExerciseId: ex.customExerciseId });
      }
    }
  };

  // The set whose reps must be typed before it can be logged (range/AMRAP hint).
  const askForReps = (exIdx: number, setIdx: number) => {
    setNeedReps(`${exIdx}-${setIdx}`);
    // After the popup (if any) has closed, so focus is not stolen back.
    window.setTimeout(() => {
      rowRefs.current.get(`${exIdx}-${setIdx}`)?.querySelector<HTMLInputElement>("input[data-field='reps']")?.focus();
    }, 50);
  };

  // WO10: "Title follows the set label (here 'Set 2 options')". A working set
  // shows its number; a set with no number is named by its type.
  const setOptionsTitle = (exIdx: number, setIdx: number): string => {
    const sets = logged[exIdx]?.sets ?? [];
    const n = workingNumbers(sets)[setIdx];
    if (n != null) return `Set ${n} options`;
    const label = HANDOVER_SET_TYPES.find((t) => t.value === setKind(sets[setIdx]))?.label ?? "Set";
    return `${label} set options`;
  };

  /** Applies a set type; false when it could not be (reps must be typed first). */
  const setType = (exIdx: number, setIdx: number, kind: HandoverSetType): boolean => {
    const current = logged[exIdx].sets[setIdx];
    const fields = kindFields(kind, current);
    const logs = fields.outcome != null && fields.outcome !== "skipped";
    // A type that LOGS the set (Failed, or PR on a set) resolves blank fields
    // exactly as the check does: an exact hint fills in, a range or AMRAP hint
    // means the athlete has to say how many reps, so the type is not applied
    // and the reps field asks instead of saving 0.
    const values = logs ? resolveLoggedValues(current, placeholdersFor(exIdx, setIdx)) : undefined;
    if (values === null) {
      askForReps(exIdx, setIdx);
      return false;
    }
    const next: LoggedSet = { ...current, ...fields, completed: logs, ...(values ?? {}) };
    updateSet(exIdx, setIdx, next);
    if (fields.outcome && !started) startClock();
    if (kind === "pr" && setKind(current) !== "pr") {
      const row = rowRefs.current.get(`${exIdx}-${setIdx}`);
      if (row) {
        const r = row.getBoundingClientRect();
        setBurst({ key: Date.now(), rect: { left: r.left, top: r.top, width: r.width, height: r.height } });
      }
      recordPr(exIdx, next);
    }
    return true;
  };

  const toggleCheck = (exIdx: number, setIdx: number) => {
    const s = logged[exIdx].sets[setIdx];
    const kind = setKind(s);
    if (kind === "skipped") return;
    if (s.completed) {
      // Unchecking a set that failed keeps it failed; anything else goes back to not logged.
      updateSet(exIdx, setIdx, kind === "failed" ? { completed: false } : { completed: false, outcome: undefined });
      if (rest?.exIdx === exIdx && rest.setIdx === setIdx) setRest(null);
      return;
    }
    // CHECKING WITHOUT TYPING LOGS AN EXACT HINT AS-IS (WO8 prefill); a range
    // or AMRAP hint is never guessed, so the reps field asks instead.
    const values = resolveLoggedValues(s, placeholdersFor(exIdx, setIdx));
    if (!values) {
      askForReps(exIdx, setIdx);
      return;
    }
    updateSet(exIdx, setIdx, {
      completed: true,
      outcome: kind === "failed" ? "failed" : "completed",
      ...values,
    });
    tickNonce.current += 1;
    setTickKey(`${exIdx}-${setIdx}-t${tickNonce.current}`);
    if (!started) startClock();
    const restSec = template.exercises[exIdx]?.restSeconds ?? 0;
    if (restSec > 0 && setIdx < logged[exIdx].sets.length - 1) {
      setRest({ exIdx, setIdx, endsAt: Date.now() + restSec * 1000 });
    }
  };

  const blockKindOf = (ex: Exercise): BlockKind => template.blocks.find((b) => b.id === ex.blockId)?.kind ?? "superset";

  // --- rendering -----------------------------------------------------------

  const renderExercise = (exIdx: number, inRoundBlock: boolean, superset: boolean) => {
    const meta = template.exercises[exIdx];
    const ex = logged[exIdx];
    if (!meta || !ex) return null;
    const line = prescriptionLine(meta, { perRound: inRoundBlock && isRoundBased(blockKindOf(meta)), noRest: true });
    const { asked } = setRowCount(meta);
    const numbers = workingNumbers(ex.sets);
    const restSec = meta.restSeconds ?? 0;

    return (
      <div
        key={exIdx}
        data-ex={exIdx}
        className="bg-cream-card"
        style={{ border: "1px solid rgb(var(--c-charcoal) / 0.08)", borderRadius: 16, overflow: "hidden", paddingBottom: 12, scrollMarginTop: 12 }}
      >
        <div className="flex items-center" style={{ gap: 6, padding: "13px 14px 8px" }}>
          <p className="whitespace-nowrap" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "rgb(var(--c-charcoal))", letterSpacing: "-0.01em" }}>
            {ex.name}
          </p>
          {superset && (
            <span
              className="flex-none"
              style={{ fontSize: 9, fontWeight: 800, color: sessionColor("ssBadgeInk", dark), background: sessionColor("ssBadgeBg", dark), borderRadius: 4, padding: "1px 5px", lineHeight: "13px" }}
            >
              SS
            </span>
          )}
          <span className="flex-1 min-w-0 truncate" style={{ fontSize: 11, fontWeight: 500, color: "rgb(var(--c-charcoal-faint))" }}>
            {line}
          </span>
          <button
            onClick={(e) => setExMenu({ exIdx, anchor: e.currentTarget, view: "main" })}
            aria-label={`${ex.name} options`}
            className="tap relative flex-none flex items-center justify-center before:absolute before:-inset-[9px] before:content-['']"
            style={{ width: 26, height: 26, color: "rgb(var(--c-charcoal-faint))" }}
          >
            <EllipsisVertical size={16} />
          </button>
          <span className="flex-none tabular-nums" style={{ fontSize: 10.5, fontWeight: 500, color: (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93") }}>
            {exIdx + 1} of {logged.length}
          </span>
        </div>
        {/* The divider in the folder's dark shade (WO8). */}
        <div style={{ height: 2, margin: "0 14px", background: playInk(family, dark), borderRadius: 1 }} />
        {meta.pinnedNote && (
          <div className="flex items-start" style={{ gap: 8, padding: "8px 14px", background: shades.banner, color: shades.ink }}>
            <Pin size={13} className="flex-none" style={{ marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 13, fontWeight: 500, lineHeight: "17px" }}>{meta.pinnedNote}</p>
          </div>
        )}
        {meta.endurancePlan ? (
          <div style={{ padding: "10px 14px 0" }}>
            <EnduranceRunner
              plan={meta.endurancePlan}
              result={ex.enduranceResult}
              onResult={(enduranceResult) => setLogged((prev) => prev.map((l, n) => (n === exIdx ? { ...l, enduranceResult } : l)))}
              onStarted={startClock}
              timer={timers.endurance?.[ex.exerciseId]}
              onTimer={(t) => setTimers((prev) => ({ ...prev, endurance: { ...prev.endurance, [ex.exerciseId]: t } }))}
            />
          </div>
        ) : (
          <>
            <div
              className="flex items-center uppercase"
              style={{ padding: "9px 15px 1px", fontSize: 9.5, fontWeight: 600, letterSpacing: "0.08em", color: (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93") }}
            >
              <span style={{ width: 58 }}>Set</span>
              <span className="flex-1">Weight (kg)</span>
              <span className="flex-1" style={{ marginLeft: 8 }}>Reps</span>
              <span style={{ width: 75 }} />
            </div>
            {ex.sets.map((s, setIdx) => {
              const ph = placeholdersFor(exIdx, setIdx);
              const showRest = restSec > 0 && setIdx < ex.sets.length - 1;
              const counting = rest && rest.exIdx === exIdx && rest.setIdx === setIdx ? Math.max(0, Math.ceil((rest.endsAt - Date.now()) / 1000)) : null;
              return (
                <React.Fragment key={setIdx}>
                  <SetRow
                    rowRef={(el) => {
                      if (el) rowRefs.current.set(`${exIdx}-${setIdx}`, el);
                      else rowRefs.current.delete(`${exIdx}-${setIdx}`);
                    }}
                    set={s}
                    number={numbers[setIdx]}
                    separator={setIdx > 0 && !(restSec > 0)}
                    family={family}
                    shades={shades}
                    weightPlaceholder={ph.weight}
                    repsPlaceholder={ph.reps}
                    justTicked={!!tickKey?.startsWith(`${exIdx}-${setIdx}-t`)}
                    tickKey={tickKey}
                    needsReps={needReps === `${exIdx}-${setIdx}`}
                    onChange={(patch) => {
                      updateSet(exIdx, setIdx, patch);
                      if (patch.reps && needReps === `${exIdx}-${setIdx}`) setNeedReps(null);
                    }}
                    onType={(anchor) => setTypeMenu({ exIdx, setIdx, anchor })}
                    onCheck={() => toggleCheck(exIdx, setIdx)}
                    onOptions={() => setSetOptionsTarget({ exIdx, setIdx })}
                  />
                  {showRest && (
                    <div className="flex items-center" style={{ gap: 10, padding: "0 15px", height: 19 }}>
                      <span className="flex-1" style={{ height: 1, background: shades.restLine }} />
                      <span className="tabular-nums" style={{ fontSize: 10.5, fontWeight: 600, color: playInk(family, dark) }}>
                        {formatClock(counting !== null && counting > 0 ? counting : restSec)}
                      </span>
                      <span className="flex-1" style={{ height: 1, background: shades.restLine }} />
                    </div>
                  )}
                </React.Fragment>
              );
            })}
            {asked > 0 && ex.sets.some((s) => s.optional) && (
              <p style={{ margin: "6px 15px 0", fontSize: 10.5, color: (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93") }}>{asked} asked for · the rest are yours if you want them.</p>
            )}
            <button
              onClick={() => addSet(exIdx)}
              className="tap flex items-center"
              style={{ gap: 6, margin: "8px 15px 0", fontSize: 12, fontWeight: 600, color: sessionColor("addSet", dark) }}
            >
              <Plus size={12} /> Add set
            </button>
          </>
        )}
      </div>
    );
  };

  const hasCompletedSet =
    logged.some((ex) => ex.sets.some((s) => s.completed) || ex.enduranceResult) ||
    Object.values(blockResults).some((r) => checkBlockResult(r) === null && blockScore(r) !== "");

  const finishWorkout = async () => {
    // V10 (QA 10.0): nothing checked → prompt and exit without logging.
    if (!hasCompletedSet) {
      setEmptyFinishOpen(true);
      return;
    }
    const problems = blockProblems(template.blocks, blockResults);
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
      // The day the session STARTED, which is what started_at says too.
      date: localDayOf(startedAt),
      startedAt: startedAt.toISOString(),
      endedAt: endedAt.toISOString(),
      durationSec: elapsed,
      totalVolumeKg: totalVolume,
      // Untouched optional rows dropped; every surviving row gets an outcome.
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
      exercises: template.exercises,
    });
    if (routineId) clearPausedSession(routineId);
    clearActive();
    setFinished(true);
    setRunSince(null);
    setTimeout(onClose, 900);
  };

  const circle = "tap relative flex-none flex items-center justify-center rounded-full";
  const exMenuEx = exMenu ? template.exercises[exMenu.exIdx] : undefined;
  const exMenuBlock = blockOf(exMenuEx);

  return createPortal(
    // GLOBAL: the on-screen keyboard covers the bottom of a fixed full-screen
    // view, so the logger ends above it (--kb-inset, published by Layout from
    // visualViewport) — the Finish footer and the list both stay in reach.
    <div className="fixed inset-0 z-50 bg-cream flex flex-col animate-fade-in" style={{ paddingBottom: "var(--kb-inset, 0px)" }}>
      <div className="mx-auto w-full max-w-[430px] flex flex-col flex-1 min-h-0">
        {/* Header: × and ⌄ | routine name + status | play, metronome, note. */}
        <div
          className="grid items-center flex-none"
          style={{
            gridTemplateColumns: "auto 1fr auto",
            gap: 8,
            padding: "max(21px, calc(env(safe-area-inset-top) + 8px)) 20px 14px",
            borderBottom: "1px solid rgb(var(--c-charcoal) / 0.05)",
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <button onClick={requestClose} aria-label="Close workout" className={circle} style={{ width: 34, height: 34, background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal-soft))" }}>
              <X size={16} />
            </button>
            <button onClick={minimise} aria-label="Minimise workout" className={circle} style={{ width: 34, height: 34, background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal-soft))" }}>
              <ChevronDown size={17} />
            </button>
          </div>
          <div className="text-center min-w-0">
            {/* Wraps to two lines rather than cutting the name to "Regres…" when the
                cycle chip takes room (as the WO8 frame wraps "Push Pull / Legs"). */}
            <p className="line-clamp-2 break-words" style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "rgb(var(--c-charcoal))", lineHeight: "19px" }}>
              {routineName}
            </p>
            <p className="tabular-nums" style={{ margin: 0, fontSize: 10.5, fontWeight: 500, color: (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93"), lineHeight: "14px" }}>
              {started
                ? `Started ${startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} · ${formatDuration(elapsed)} elapsed`
                : elapsed > 0
                ? `Paused · ${formatDuration(elapsed)} elapsed`
                : "Not started"}
            </p>
            {/* The cycle phase sits under the status line, not in the button row,
                where it squeezed the routine name to "Regres…" at 393px. */}
            <div className="flex justify-center empty:hidden" style={{ marginTop: 3 }}>
              <CyclePhaseChip />
            </div>
          </div>
          <div className="flex items-center justify-end" style={{ gap: 8 }}>
            <button
              onClick={toggleClock}
              aria-label={started ? "Pause elapsed time" : "Start elapsed time"}
              className={circle}
              style={{ width: 34, height: 34, background: family.play, color: "#FFFFFF" }}
            >
              {started ? <Pause size={14} fill="white" /> : <Play size={14} fill="white" />}
            </button>
            <Metronome />
            <button
              onClick={() => {
                setCoachNoteOpen(true);
                // Opening the note clears its unread dot (WO25).
                if (noteUnread && routineRow) markCoachNoteRead(routineRow.id);
              }}
              aria-label={noteUnread ? "Coach's note, unread" : "Coach's note"}
              className={circle}
              style={{ width: 34, height: 34, background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal-faint))" }}
            >
              <MessageSquareText size={15} />
              {noteUnread && (
                <span
                  aria-hidden
                  className="absolute rounded-full"
                  style={{ top: 3, right: 3, width: 8, height: 8, background: "rgb(var(--th-8f68f6))", boxShadow: "0 0 0 1.5px rgb(var(--c-cream-card))" }}
                />
              )}
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto" style={{ padding: 12 }}>
          <div className="flex flex-col" style={{ gap: 12 }}>
            {groupIntoRuns(template.exercises, template.blocks).map((run) => {
              const indices = run.members.map((m) => template.exercises.indexOf(m));
              if (run.block?.kind === "superset") {
                // Paired exercises: an SS badge and a coral bracket along their left edges.
                return (
                  <div key={run.block.id} className="relative flex flex-col" style={{ gap: 12 }}>
                    <span
                      aria-hidden
                      className="absolute pointer-events-none"
                      style={{
                        left: -8,
                        top: 4,
                        bottom: 30,
                        width: 5,
                        borderLeft: `1.5px solid ${SS_BRACKET}`,
                        borderTop: `1.5px solid ${SS_BRACKET}`,
                        borderBottom: `1.5px solid ${SS_BRACKET}`,
                        borderRadius: "5px 0 0 5px",
                      }}
                    />
                    {indices.map((i) => renderExercise(i, false, true))}
                  </div>
                );
              }
              if (run.block) {
                return (
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
                    onStarted={startClock}
                    watch={timers.blocks?.[run.block.id]}
                    onWatch={(w) => setTimers((prev) => ({ ...prev, blocks: { ...prev.blocks, [run.block!.id]: w } }))}
                  >
                    <div className="flex flex-col" style={{ gap: 12, padding: "0 8px 8px" }}>
                      {indices.map((i) => renderExercise(i, true, false))}
                    </div>
                  </BlockRunner>
                );
              }
              return indices.map((i) => renderExercise(i, false, false));
            })}
            {/* Logged while paused, then removed from the routine: kept and
                saved under their own name, shown read-only. */}
            {logged.slice(template.exercises.length).map((ex) => (
              <div
                key={`removed-${ex.exerciseId}`}
                className="bg-cream-card"
                style={{ border: "1px dashed rgb(var(--c-charcoal) / 0.18)", borderRadius: 16, padding: "12px 14px" }}
              >
                <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{ex.name}</p>
                <p style={{ margin: "2px 0 8px", fontSize: 11, color: "rgb(var(--c-charcoal-faint))" }}>
                  Removed from this routine · logged sets are kept
                </p>
                <p className="tabular-nums" style={{ margin: 0, fontSize: 12.5, color: "rgb(var(--c-charcoal-soft))" }}>
                  {ex.sets
                    .filter(isTouched)
                    .map((s) => `${formatSetWeight(s.weightKg ?? 0, true)} × ${s.reps}`)
                    .join(" · ")}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div
          className="flex-none bg-cream"
          style={{ borderTop: "1px solid rgb(var(--c-charcoal) / 0.05)", padding: "14px 20px max(28px, calc(env(safe-area-inset-bottom) + 12px))" }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 14 }}>
            <div>
              <p className="uppercase" style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgb(var(--c-charcoal-faint))" }}>
                Total volume
              </p>
              <p className="tabular-nums" style={{ margin: 0, fontSize: 24, fontWeight: 800, color: "rgb(var(--c-charcoal))", letterSpacing: "-0.03em", lineHeight: "30px" }}>
                {totalVolume.toLocaleString()} kg
              </p>
            </div>
            <div className="flex items-center" style={{ gap: 8 }}>
              <button
                onClick={() => setRpeOpen(true)}
                className="tap flex items-center justify-center"
                style={{ gap: 6, height: 32, padding: "0 12px", borderRadius: 16, background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal-soft))", fontSize: 12, fontWeight: 600 }}
              >
                <Calculator size={13} /> RPE
              </button>
              <button
                onClick={() => setPlateCalcOpen(true)}
                aria-label="Plate calculator"
                className="tap flex items-center justify-center rounded-full"
                style={{ width: 32, height: 32, background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal-soft))" }}
              >
                <PlateIcon size={15} />
              </button>
            </div>
          </div>
          {saveError && (
            <p className="text-center" style={{ margin: "0 0 8px", fontSize: 11.5, fontWeight: 600, color: sessionColor("danger", dark) }}>
              {saveError}
            </p>
          )}
          <button
            onClick={() => void finishWorkout()}
            disabled={finished || saving}
            className="tap w-full flex items-center justify-center disabled:opacity-70"
            style={{ gap: 8, height: 52, borderRadius: 14, background: dark ? playText(family) : family.play, color: "#FFFFFF", fontSize: 15, fontWeight: 700 }}
          >
            {finished ? (
              "Workout Saved ✓"
            ) : saving ? (
              "Saving…"
            ) : (
              <>
                <Square size={14} /> {saveError ? "Try again" : "Finish Workout"}
              </>
            )}
          </button>
        </div>
      </div>

      <RPECalculator open={rpeOpen} onClose={() => setRpeOpen(false)} />
      <PlateCalculatorSheet open={plateCalcOpen} onClose={() => setPlateCalcOpen(false)} />
      {burst && <PrBurst key={burst.key} rect={burst.rect} onDone={() => setBurst(null)} />}

      {/* Set-type dropdown: tap the set number (approved decision 15). */}
      <PopupMenu
        open={!!typeMenu}
        onClose={() => setTypeMenu(null)}
        anchor={typeMenu?.anchor ?? null}
        align="left"
        width={176}
        variant="filled"
        selected={typeMenu ? setKind(logged[typeMenu.exIdx].sets[typeMenu.setIdx]) : null}
        onSelect={(v) => typeMenu && setType(typeMenu.exIdx, typeMenu.setIdx, v as HandoverSetType)}
        options={HANDOVER_SET_TYPES.map((t) => ({
          value: t.value,
          label: t.label,
          icon: (
            <span
              style={{
                display: "block",
                width: 8,
                height: 8,
                borderRadius: 4,
                background: t.value === "normal" ? family.play : typeStyles(dark)[t.value].dot,
                boxShadow: "0 0 0 1.5px rgb(var(--c-cream-card))",
              }}
            />
          ),
        }))}
      />

      {/* Exercise ⋮: Pinned note · Rest timer · Super set. */}
      <PopupMenu
        open={!!exMenu && exMenu.view === "main"}
        onClose={() => {
          const next = exMenuNext.current;
          exMenuNext.current = null;
          setExMenu((m) => (m && next ? { ...m, view: next } : null));
        }}
        anchor={exMenu?.anchor ?? null}
        width={176}
        onSelect={(v) => {
          if (!exMenu) return;
          if (v === "note") setPinEditor({ exIdx: exMenu.exIdx, text: exMenuEx?.pinnedNote ?? "" });
          if (v === "rest" || v === "superset") exMenuNext.current = v;
          if (v === "unpair") removeSuperset(exMenu.exIdx);
        }}
        options={[
          { value: "note", label: "Pinned note", icon: <Pin size={15} style={{ color: "rgb(var(--c-charcoal-soft))" }} /> },
          {
            value: "rest",
            label: "Rest timer",
            icon: <Timer size={15} style={{ color: "rgb(var(--c-charcoal-soft))" }} />,
            trailing: (
              <span className="tabular-nums" style={{ fontSize: 12, fontWeight: 600, color: playInk(family, dark) }}>
                {exMenuEx?.restSeconds ? formatClock(exMenuEx.restSeconds) : "Off"}
              </span>
            ),
          },
          exMenuBlock?.kind === "superset"
            ? { value: "unpair", label: "Remove super set", icon: <Unlink size={15} style={{ color: "rgb(var(--c-charcoal-soft))" }} /> }
            : {
                value: "superset",
                label: "Super set",
                icon: <Link2 size={15} style={{ color: "rgb(var(--c-charcoal-soft))" }} />,
                disabled: !exMenu || !!exMenuBlock || partnersFor(exMenu.exIdx).length === 0,
              },
        ]}
      />
      <PopupMenu
        open={!!exMenu && exMenu.view === "rest"}
        onClose={() => setExMenu(null)}
        anchor={exMenu?.anchor ?? null}
        width={176}
        heading="Rest timer"
        selected={String(exMenuEx?.restSeconds ?? 0)}
        onSelect={(v) => exMenu && patchExercise(exMenu.exIdx, { restSeconds: Number(v) || undefined })}
        options={REST_OPTIONS}
      />
      <PopupMenu
        open={!!exMenu && exMenu.view === "superset"}
        onClose={() => setExMenu(null)}
        anchor={exMenu?.anchor ?? null}
        width={176}
        heading="Super set with"
        onSelect={(v) => exMenu && pairSuperset(exMenu.exIdx, Number(v))}
        options={exMenu ? partnersFor(exMenu.exIdx).map((i) => ({ value: String(i), label: template.exercises[i].name })) : []}
      />

      <BottomSheet
        open={!!pinEditor}
        onClose={() => setPinEditor(null)}
        title="Pinned note"
        footer={
          <Button
            fullWidth
            size="lg"
            onClick={() => {
              if (!pinEditor) return;
              patchExercise(pinEditor.exIdx, { pinnedNote: pinEditor.text.trim() || undefined });
              setPinEditor(null);
            }}
          >
            Save
          </Button>
        }
      >
        <textarea
          value={pinEditor?.text ?? ""}
          onChange={(e) => setPinEditor((p) => (p ? { ...p, text: e.target.value.slice(0, 500) } : p))}
          placeholder="e.g. Pin safety rack at level 3"
          rows={3}
          className="w-full bg-transparent focus:outline-none"
          style={{ border: `1px solid ${sessionColor("fieldBorder", dark)}`, borderRadius: 12, padding: "10px 12px", fontSize: 14, color: "rgb(var(--c-charcoal))", resize: "none" }}
        />
      </BottomSheet>

      <SetOptionsSheet
        open={!!setOptionsTarget}
        onClose={() => setSetOptionsTarget(null)}
        set={setOptionsTarget ? logged[setOptionsTarget.exIdx].sets[setOptionsTarget.setIdx] : null}
        title={setOptionsTarget ? setOptionsTitle(setOptionsTarget.exIdx, setOptionsTarget.setIdx) : ""}
        routineName={routineName}
        pinnedNote={setOptionsTarget ? template.exercises[setOptionsTarget.exIdx]?.pinnedNote : undefined}
        onSave={(result) => {
          if (!setOptionsTarget) return;
          const { exIdx, setIdx } = setOptionsTarget;
          // The type first, through the logger's own rules (reps prompt, PR
          // burst and 1RM); it may decline until reps are typed.
          if (result.kind !== setKind(logged[exIdx].sets[setIdx])) setType(exIdx, setIdx, result.kind);
          updateSet(exIdx, setIdx, { rpe: result.rpe, mood: result.mood, pain: result.pain, notes: result.notes });
          // Pin on: this note becomes the exercise's pinned note in the routine
          // template. Pin off only clears the pinned note if it was this one.
          const pinned = template.exercises[exIdx]?.pinnedNote?.trim();
          if (result.pinned && result.notes && result.notes !== pinned) patchExercise(exIdx, { pinnedNote: result.notes });
          else if (!result.pinned && pinned && pinned === logged[exIdx].sets[setIdx].notes?.trim()) patchExercise(exIdx, { pinnedNote: undefined });
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
                clearActive();
                onClose();
              }}
            >
              Exit routine
            </Button>
          </div>
        </div>
      )}

      {coachNoteOpen && (
        <CoachNotePopup
          note={noteText}
          updatedAt={routineRow?.coachNoteUpdatedAt}
          professionalId={routineRow?.assignedByProfessionalId}
          onClose={() => setCoachNoteOpen(false)}
        />
      )}

      {quitConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-6">
          <div className="absolute inset-0 bg-charcoal/40" onClick={() => setQuitConfirmOpen(false)} />
          <div className="relative w-full max-w-xs bg-cream rounded-3xl shadow-lift p-5 animate-pop">
            <p className="font-display font-semibold text-lg text-charcoal mb-1.5">Quit workout?</p>
            <p className="text-sm text-charcoal-soft mb-5">Your progress will be saved. You can resume this workout anytime.</p>
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

/** WO8: the plate calculator icon is a weight plate (assets/icons/plate-calculator.svg). */
const PlateIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5.2" style={{ strokeWidth: 1.4, opacity: 0.55 }} />
    <circle cx="12" cy="12" r="1.8" />
  </svg>
);

/**
 * One compact set row (WO8): the set-number slot (tap for the type dropdown),
 * weight and reps, vertical ⋮ for set options, and the check.
 *
 * Normal rows take the folder's shades; every other type overrides them with
 * its own row, field and ink colours. Skipped reads as one continuous
 * strike-through across the row; PR carries a gold accent bar.
 */
const SetRow: React.FC<{
  rowRef: (el: HTMLDivElement | null) => void;
  set: LoggedSet;
  number: number | null;
  separator: boolean;
  family: FolderFamily;
  shades: LoggerShades;
  weightPlaceholder: string;
  repsPlaceholder: string;
  justTicked: boolean;
  tickKey: string | null;
  /** The tick needs typed reps (the hint is a range or AMRAP). */
  needsReps: boolean;
  onChange: (patch: Partial<LoggedSet>) => void;
  onType: (anchor: HTMLElement) => void;
  onCheck: () => void;
  onOptions: () => void;
}> = ({ rowRef, set: s, number, separator, family, shades, weightPlaceholder, repsPlaceholder, justTicked, tickKey, needsReps, onChange, onType, onCheck, onOptions }) => {
  const dark = useIsDark();
  const kind = setKind(s);
  const t = kind === "normal" ? null : typeStyles(dark)[kind];
  const field = t?.field ?? shades.field;
  const border = t?.border ?? shades.fieldBorder;
  const ink = t?.ink ?? shades.ink;
  const muted = !!s.optional && !s.completed && s.outcome == null;
  const done = s.completed || s.outcome === "failed";
  const inputStyle: React.CSSProperties = {
    height: 31,
    minWidth: 0,
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: field,
    color: ink,
    padding: "0 10px",
    fontSize: 14,
    fontWeight: 600,
    ["--ph" as string]: ink,
    // The board's 46% in light mode (the CSS default); dark mode clears 4.5:1.
    ...(dark ? { ["--ph-opacity" as string]: placeholderOpacity(ink, field) } : {}),
  };
  const label = s.setNumber;

  return (
    <div
      ref={rowRef}
      className={clsx("relative flex flex-wrap items-center", justTicked && "animate-set-row-settle")}
      style={{
        padding: "5px 15px",
        background: t?.row ?? "transparent",
        borderTop: separator ? "1px solid rgb(var(--c-charcoal) / 0.05)" : undefined,
        opacity: muted ? 0.62 : 1,
        ["--settle-from" as string]: t?.row && t.row !== "transparent" ? t.row : shades.banner,
        ["--settle-to" as string]: t?.row ?? "transparent",
      }}
    >
      {kind === "pr" && <span aria-hidden className="absolute left-0 top-0 bottom-0" style={{ width: 3, background: PR_BAR }} />}
      <button
        onClick={(e) => onType(e.currentTarget)}
        aria-label={`Set ${label} type: ${HANDOVER_SET_TYPES.find((x) => x.value === kind)?.label}`}
        className="tap relative flex-none flex items-center before:absolute before:-inset-y-[7px] before:inset-x-0 before:content-['']"
        style={{ width: 40, height: 31, borderRight: "none" }}
      >
        <span className="flex items-center" style={{ gap: 2 }}>
          {number !== null ? (
            <span className="flex flex-col items-center" style={{ lineHeight: 1 }}>
              <span className="tabular-nums" style={{ fontSize: 14, fontWeight: 700, color: t?.label ?? "rgb(var(--c-charcoal-faint))" }}>
                {number}
              </span>
              {t && (
                <span style={{ fontSize: 7.5, fontWeight: 800, color: t.label, marginTop: 1 }}>{t.short}</span>
              )}
            </span>
          ) : (
            <span style={{ fontSize: 10.5, fontWeight: 600, color: t?.label }}>{t?.short}</span>
          )}
          <ChevronDown size={10} style={{ color: t?.label ?? (dark ? "rgb(var(--c-charcoal-faint))" : "#A79E93") }} />
        </span>
        <span aria-hidden className="absolute right-0" style={{ top: 7, bottom: 7, width: 1, background: sessionColor("divider", dark) }} />
      </button>
      <div className="flex-1 flex min-w-0" style={{ gap: 8, marginLeft: 18 }}>
        <WeightField
          value={s.weightKg}
          onChange={(weightKg) => onChange({ weightKg })}
          placeholder={weightPlaceholder}
          ariaLabel={`Set ${label} weight`}
          style={inputStyle}
        />
        <input
          value={s.reps || ""}
          onChange={(e) => onChange({ reps: Number(e.target.value) || 0 })}
          placeholder={repsPlaceholder}
          inputMode="numeric"
          aria-label={`Set ${label} reps`}
          aria-invalid={needsReps || undefined}
          aria-describedby={needsReps ? `need-reps-${label}` : undefined}
          data-field="reps"
          className="logger-field flex-1 focus:outline-none"
          style={needsReps ? { ...inputStyle, borderColor: sessionColor("danger", dark) } : inputStyle}
        />
      </div>
      <button
        onClick={onOptions}
        aria-label={`Set ${label} options`}
        className="tap relative flex-none flex items-center justify-center before:absolute before:-inset-[8px] before:content-['']"
        style={{ width: 28, height: 28, marginLeft: 8, color: s.notes || s.rpe ? playInk(family, dark) : "rgb(var(--c-charcoal-faint))" }}
      >
        <EllipsisVertical size={15} />
      </button>
      <div className="relative flex-none" style={{ width: 28, height: 28, marginLeft: 11 }}>
        {justTicked && (
          <span
            key={tickKey}
            className="absolute inset-0 rounded-full border-2 pointer-events-none animate-set-tick-ring"
            style={{ borderColor: family.play }}
          />
        )}
        <button
          key={justTicked ? `${tickKey}-btn` : "btn"}
          onClick={onCheck}
          aria-pressed={done}
          aria-disabled={kind === "skipped"}
          aria-label={`Mark set ${label} complete`}
          className={clsx(
            "tap relative w-7 h-7 rounded-full flex items-center justify-center before:absolute before:-inset-[8px] before:content-['']",
            justTicked && "animate-set-tick"
          )}
          style={{ background: done ? family.play : "rgb(var(--c-cream-soft))", color: done ? "#FFFFFF" : sessionColor("uncheck", dark) }}
        >
          <Check key={justTicked ? tickKey : "check"} size={13} strokeWidth={3} className={justTicked ? "animate-set-tick-check" : undefined} />
        </button>
      </div>
      {kind === "skipped" && (
        <span aria-hidden className="absolute pointer-events-none" style={{ left: 15, right: 15, top: "50%", height: 1, background: sessionColor("strike", dark) }} />
      )}
      {needsReps && (
        <p id={`need-reps-${label}`} role="alert" className="basis-full" style={{ margin: "4px 0 0 58px", fontSize: 10.5, fontWeight: 600, color: sessionColor("danger", dark) }}>
          Enter the reps you did to log this set.
        </p>
      )}
    </div>
  );
};
