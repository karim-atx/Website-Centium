import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { Exercise, RepMaxUpdateMode, MuscleGroup, ExerciseClassification } from "../../types";
import { ONE_RM_CLASSIFICATIONS } from "../../types";
import { ExerciseLibrarySheet, type ExercisePick } from "./ExerciseLibrarySheet";
import { EndurancePlanBuilder } from "./EndurancePlanBuilder";
import { checkPlan, emptyPlan, serializePlan } from "../../services/workout/endurance";
import { X, ChevronRight, Trash2, Briefcase, Info, MessageSquareText } from "lucide-react";
import clsx from "clsx";
import { rpeOptions } from "../../services/workout";
import { SetOptionsSheet } from "./SetOptionsSheet";
import { typeStyles } from "./setTypeStyle";
import { useIsDark } from "../../hooks/useIsDark";
import type { LoggedSet, PrescribedSetType } from "../../types";
import { setTargetText, setTargetsColumn, withSetTarget } from "../../services/workout/setTargets";

/**
 * Release 3 · W5 (TR4 v3, HANDOVER g): the professional's mode. Present (even
 * as {}) = pro mode; absent = the client sheet exactly as before. Pro mode:
 * - hides Estimated 1RM (it writes the signed-in user's own personal record,
 *   the professional's, not a client's) and Rep Max / Rep Max update mode
 *   (FINAL_PLAN W5 two-phase removal; the stored values pass through a save
 *   untouched because the draft keeps them);
 * - labels Intensity "(% of 1RM)" with the template hint, Target RPE from
 *   rpeOptions (6 to 10 in 0.5 steps, the column's own check);
 * - adds Set types (SetOptionsSheet coach mode, set_types per set) and the
 *   "For your clients" block: Coach note (coach_note, at most 500) and the
 *   Targets per client row;
 * - Delete with tap again to confirm in status.high.
 */
export interface ExerciseSettingsPro {
  targets?: { summary: string | null; onOpen: () => void };
}

const COACH_NOTE_MAX = 500;
const RPE_CHOICES = [...rpeOptions].sort((a, b) => a - b);

const repMaxModes: { value: RepMaxUpdateMode; label: string; desc: string }[] = [
  { value: "no_update", label: "Does not update", desc: "Rep Max stays unchanged" },
  { value: "prompt", label: "Prompt for update", desc: "Ask when an update looks likely" },
  { value: "prompt_with_estimate", label: "Prompt with estimate", desc: "Pre-fill the new estimated 1RM" },
];

const muscleGroupLabel: Record<MuscleGroup, string> = {
  back: "Back",
  bicep: "Biceps",
  calves: "Calves",
  cardio: "Cardio",
  chest: "Chest",
  core: "Core",
  forearms: "Forearms",
  glutes: "Glutes",
  hamstrings: "Hamstrings",
  olympic: "Olympic",
  other: "Other",
  quads: "Quads",
  shoulders: "Shoulders",
  tricep: "Triceps",
};

const classificationLabel: Record<ExerciseClassification, string> = {
  barbell: "Barbell",
  dumbbell: "Dumbbell",
  machine_other: "Machine / Other",
  weighted_bodyweight: "Weighted Bodyweight",
  assisted_bodyweight: "Assisted Bodyweight",
  reps_only: "Reps Only",
  cardio: "Cardio",
  duration: "Duration",
};

const field = (label: string, unit?: string) => `${label}${unit ? ` (${unit})` : ""}`;

// V6 (QA 6.0): full rewrite per QA —
// - name + close button are the first SCROLLABLE element (BottomSheet's
//   sticky title bar is suppressed via hideHeader) instead of a separate
//   sticky title duplicating the exercise name below it.
// - tapping the name opens the exercise database to REPLACE the exercise
//   (new exercises are created from the database alone, not by renaming
//   here).
// - classification/muscle group are read-only info chips showing only this
//   exercise's own values, not the full editable option grid.
export const ExerciseSettingsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  exercise: Exercise | null;
  routineId?: string | null;
  onSave: (patch: Partial<Exercise>) => void;
  // V8 (QA 8.0): "I want a delete exercise under the save settings button."
  onDelete?: () => void;
  pro?: ExerciseSettingsPro;
}> = ({ open, onClose, exercise, routineId, onSave, onDelete, pro }) => {
  const { personalRecords, setPersonalRecord, pausedSessions, savePausedSession } = useApp();
  const dark = useIsDark();
  const [setOptionsIndex, setSetOptionsIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<Exercise>>({});
  const [oneRmDraft, setOneRmDraft] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  /** Whatever stopped the last save — ours or the server's. */
  const [planProblem, setPlanProblem] = useState<string | null>(null);

  React.useEffect(() => {
    if (exercise) {
      setDraft(exercise);
      setOneRmDraft(String(personalRecords[exercise.name] ?? ""));
      setConfirmDelete(false);
      setPlanProblem(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise]);

  if (!exercise) return null;

  // Pro: how many sets the prescription asks for, which is how many set types there are.
  const proSetCount = Math.min(50, draft.maxSets ?? draft.sets ?? draft.minSets ?? 0);
  const coachSet = (i: number): LoggedSet => {
    const t = draft.setTypes?.[i] ?? null;
    return { setNumber: i + 1, reps: 0, weightKg: null, completed: false, ...(t && t !== "normal" ? { setType: t } : {}) };
  };

  const isOneRmEligible = draft.classification && ONE_RM_CLASSIFICATIONS.includes(draft.classification);

  const num = (key: keyof Exercise) => (
    <input
      value={draft[key] === undefined || draft[key] === null ? "" : String(draft[key])}
      // V10 (QA 10.0): "Min/max sets, Min/max reps/ Intensity %, rep max, rest,
      // rpe should only allow numerical values to avoid NaN error" — filter
      // non-numeric characters before they ever reach state, same as the 1RM
      // input just below.
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^\d.]/g, "");
        setDraft((d) => ({ ...d, [key]: cleaned === "" ? undefined : Number(cleaned) }));
      }}
      inputMode="decimal"
      className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );

  const handleReplace = (pick: ExercisePick) => {
    onSave({
      name: pick.name,
      muscleGroups: pick.muscleGroups,
      secondaryMuscleGroups: pick.secondaryMuscleGroups,
      classification: pick.classification,
      isCustom: pick.isCustom,
      // THE REFERENCE MOVES WITH THE NAME. Leaving these behind would save a
      // prescription pointing at the movement that was replaced, which reads
      // back under the old name and silently undoes the swap.
      exerciseId: pick.exerciseId,
      customExerciseId: pick.customExerciseId,
    });
    setReplaceOpen(false);
    onClose();
  };

  const save = () => {
    const finalName = exercise.name;

    // THE PLAN IS CHECKED AND CLEANED BEFORE IT LEAVES. checkPlan mirrors the
    // database validator so a mistake is named beside the field rather than
    // arriving as a constraint violation; serializePlan strips the keys the
    // editor keeps in state but the validator counts — a zone left behind
    // when the target went back to None, a `meters` left behind when the
    // measure switched to time.
    let next = draft;
    if (draft.classification === "cardio" && draft.endurancePlan) {
      const problem = checkPlan(draft.endurancePlan);
      if (problem) {
        setPlanProblem(problem);
        return;
      }
      next = { ...draft, endurancePlan: serializePlan(draft.endurancePlan) };
    }
    // Round D (TR11): the per-set targets keep in step with the sets, so a
    // shorter prescription drops the targets of the sets it no longer has.
    if (pro) next = { ...next, setTargets: setTargetsColumn(next.setTargets, proSetCount) ?? undefined };
    setPlanProblem(null);

    onSave(next);
    if (!pro && isOneRmEligible && oneRmDraft) setPersonalRecord(finalName, Number(oneRmDraft));

    // V6 (QA 6.0): editing Min/Max sets should change an already-started
    // routine — resize the live/paused session's logged sets for this
    // exercise to match the new max, keeping already-entered values.
    if (routineId && next.maxSets && pausedSessions[routineId]) {
      const paused = pausedSessions[routineId];
      const exIdx = paused.logged.findIndex((e) => e.exerciseId === exercise.id);
      if (exIdx !== -1) {
        const current = paused.logged[exIdx].sets;
        const target = next.maxSets;
        let nextSets = current;
        if (target > current.length) {
          const last = current[current.length - 1];
          nextSets = [
            ...current,
            ...Array.from({ length: target - current.length }, (_, i) => ({
              setNumber: current.length + i + 1,
              reps: last?.reps ?? exercise.reps,
              weightKg: last?.weightKg ?? exercise.weightKg,
              completed: false,
            })),
          ];
        } else if (target < current.length) {
          nextSets = current.slice(0, target);
        }
        if (nextSets !== current) {
          const nextLogged = [...paused.logged];
          nextLogged[exIdx] = { ...nextLogged[exIdx], sets: nextSets };
          savePausedSession(routineId, { ...paused, logged: nextLogged });
        }
      }
    }

    onClose();
  };

  return (
    <>
      <BottomSheet open={open} onClose={onClose} hideHeader>
        <div className="space-y-5 animate-fade-slide-up">
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setReplaceOpen(true)}
              className="tap flex-1 flex items-center justify-between gap-2 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-start min-w-0"
            >
              <span className="font-display font-semibold text-charcoal truncate">{exercise.name}</span>
              <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="tap w-9 h-9 rounded-full bg-charcoal/5 flex items-center justify-center text-charcoal-soft hover:bg-charcoal/10 shrink-0"
            >
              <X size={16} />
            </button>
          </div>
          <p className="text-[11px] text-charcoal-faint -mt-3">
            Tap the exercise name to replace it from the exercise database.
          </p>

          {(exercise.muscleGroups?.length || exercise.secondaryMuscleGroups?.length || exercise.classification) && (
            <div className="flex flex-wrap gap-1.5">
              {/* QA 11.0: "The primary muscle group should have a 1 degree
                  above it similar to how it looks like in the secondary
                  muscle group" — matches the "N°" superscript convention
                  already used when picking muscle groups (see
                  CreateCustomExerciseSheet), and gives primary the more
                  prominent solid fill instead of the same pale tint as
                  secondary. */}
              {exercise.muscleGroups?.map((mg) => (
                <span
                  key={mg}
                  className="rounded-full bg-primary-fill text-on-primary-fill text-[11px] font-semibold px-2.5 py-1"
                >
                  {muscleGroupLabel[mg]}
                  <span className="ms-0.5 text-[9px] align-super">1°</span>
                </span>
              ))}
              {exercise.secondaryMuscleGroups?.map((mg) => (
                <span
                  key={mg}
                  className="rounded-full bg-primary-pale text-primary-dark text-[11px] font-semibold px-2.5 py-1"
                >
                  {muscleGroupLabel[mg]}
                  <span className="ms-0.5 text-[9px] align-super">2°</span>
                </span>
              ))}
              {exercise.classification && (
                <span className="rounded-full bg-cream-soft text-charcoal-soft text-[11px] font-semibold px-2.5 py-1">
                  {classificationLabel[exercise.classification]}
                </span>
              )}
            </div>
          )}

          {!pro && isOneRmEligible && (
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Estimated 1RM (kg)</span>
              <input
                value={oneRmDraft}
                onChange={(e) => setOneRmDraft(e.target.value.replace(/[^\d.]/g, ""))}
                inputMode="decimal"
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
          )}

          {/* QA 11.0 asked for cardio fields "more relevant to cardio
              training", and the first answer was five loose numbers: duration,
              distance, incline, pace and average heart rate. Between them they
              could not express "6 × 800 m at 4:20–4:30 with 2 minutes' jog",
              which is the most ordinary session a running coach writes — there
              was nowhere to put the repeats. Average heart rate was the
              clearest sign the shape was wrong: it is a RESULT.

              This writes endurance_plan instead, and the legacy cardio_*
              columns are no longer written by anything. Rows that predate the
              plan still read through the formatter's fallback. */}
          {draft.classification === "cardio" ? (
            <div className="flex flex-col" style={{ gap: 12 }}>
              <EndurancePlanBuilder
                plan={draft.endurancePlan ?? emptyPlan()}
                onChange={(endurancePlan) => setDraft((d) => ({ ...d, endurancePlan }))}
              />
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Rest", "sec")}</span>
                {num("restSeconds")}
              </label>
              {/* THE SERVER'S REFUSAL, VERBATIM. checkPlan mirrors
                  valid_endurance_plan(), but the database is the authority and
                  the two could drift; showing what it actually said is what
                  makes a drift visible instead of silent. */}
              {planProblem && (
                <p className="text-xs font-semibold text-status-high">{planProblem}</p>
              )}
            </div>
          ) : (
            <>
              {/* THE PRESCRIBED LOAD (2026-09-30). One weight per exercise, as
                  routine_exercises stores it: blank = no weight (null), a number
                  = kg, Bodyweight = 0. Typing 0 is bodyweight too. */}
              <div className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Weight", "kg")}</span>
                <div className="flex items-center gap-2">
                  <input
                    value={draft.weightKg === undefined || draft.weightKg === null || draft.weightKg === 0 ? "" : String(draft.weightKg)}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^\d.]/g, "");
                      const n = Number(cleaned);
                      setDraft((d) => ({ ...d, weightKg: cleaned === "" ? null : Number.isFinite(n) ? n : d.weightKg }));
                    }}
                    placeholder={draft.weightKg === 0 ? "Bodyweight" : "No weight"}
                    inputMode="decimal"
                    aria-label="Weight in kg"
                    className="flex-1 min-w-0 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <button
                    type="button"
                    aria-pressed={draft.weightKg === 0}
                    onClick={() => setDraft((d) => ({ ...d, weightKg: d.weightKg === 0 ? null : 0 }))}
                    className="tap shrink-0 rounded-xl px-3 py-2.5 text-xs font-bold"
                    style={
                      draft.weightKg === 0
                        ? { background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))" }
                        : { background: "rgb(var(--th-aea1dc) / 0.14)", color: "rgb(var(--thi-5f5093))" }
                    }
                  >
                    Bodyweight
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Min sets")}</span>
                  {num("minSets")}
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Max sets")}</span>
                  {num("maxSets")}
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Min reps")}</span>
                  {num("minReps")}
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Max reps")}</span>
                  {num("maxReps")}
                </label>
              </div>
              {/* SAID WHERE IT IS DECIDED. An empty max used to mean nothing at
                  all — the field saved and no screen rendered it — so there was
                  no way to learn that leaving it blank was how you ask for as
                  many as possible. The formatter now reads it as "8+ reps
                  (AMRAP)", and this is the only place anyone would look to find
                  that out. */}
              <p className="text-[11px] text-charcoal-faint -mt-1">
                Leave max reps empty for AMRAP.
              </p>
              {pro ? (
                <>
                  <p className="flex items-start text-[12px] text-charcoal-soft" style={{ gap: 8 }}>
                    <Info size={14} className="shrink-0 mt-0.5 text-charcoal-faint" aria-hidden />
                    Templates store intensity only. Weights fill in from each client's 1RM when you assign it.
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Intensity (% of 1RM)</span>
                      {num("intensityPct")}
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Rest", "sec")}</span>
                      {num("restSeconds")}
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Target RPE</span>
                      <select
                        value={draft.rpe == null ? "" : String(draft.rpe)}
                        onChange={(e) => setDraft((d) => ({ ...d, rpe: e.target.value === "" ? undefined : Number(e.target.value) }))}
                        className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
                      >
                        <option value="">–</option>
                        {RPE_CHOICES.map((r) => (
                          <option key={r} value={String(r)}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </>
              ) : (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Intensity", "%")}</span>
                  {num("intensityPct")}
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Rep Max", "kg")}</span>
                  {num("repMaxKg")}
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{field("Rest", "sec")}</span>
                  {num("restSeconds")}
                </label>
                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">RPE</span>
                  {num("rpe")}
                </label>
              </div>
              )}

              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
                  Tempo (ecc-pause-con-pause)
                </span>
                <input
                  value={draft.tempo ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, tempo: e.target.value.replace(/[^\d-]/g, "") }))}
                  placeholder="3-1-1-0"
                  inputMode="numeric"
                  className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </label>

              {!pro && (
              <div>
                <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                  Rep Max update mode
                </p>
                <div className="space-y-2">
                  {repMaxModes.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setDraft((d) => ({ ...d, repMaxUpdateMode: m.value }))}
                      className={clsx(
                        "tap w-full text-start rounded-xl px-3.5 py-2.5 border transition-colors",
                        draft.repMaxUpdateMode === m.value
                          ? "bg-primary-pale border-primary"
                          : "bg-cream-soft border-transparent"
                      )}
                    >
                      <p className="text-sm font-semibold text-charcoal">{m.label}</p>
                      <p className="text-xs text-charcoal-faint">{m.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              )}
            </>
          )}

          {pro && proSetCount > 0 && (
            <div>
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Type</p>
              <div className="flex flex-wrap" style={{ gap: 6 }}>
                {Array.from({ length: proSetCount }, (_, i) => {
                  const t = draft.setTypes?.[i] ?? null;
                  const style = t && t !== "normal" ? typeStyles(dark)[t === "dropset" ? "drop" : t] : null;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSetOptionsIndex(i)}
                      className="tap inline-flex items-center rounded-xl text-[12px] font-semibold"
                      style={{ gap: 6, minHeight: 36, padding: "0 12px", background: style ? style.field : "rgb(var(--c-cream-soft))", color: style ? style.ink : "rgb(var(--c-charcoal))", border: `1px solid ${style ? style.border : "rgb(var(--c-charcoal) / 0.1)"}` }}
                    >
                      {style && <span aria-hidden style={{ width: 7, height: 7, borderRadius: 9999, background: style.dot }} />}
                      {`Set ${i + 1}`}
                      {style && <span className="sr-only">{`, ${style.short}`}</span>}
                      {setTargetText(draft.setTargets?.[i]) && <span className="sr-only">{`, ${setTargetText(draft.setTargets?.[i])}`}</span>}
                    </button>
                  );
                })}
              </div>
              {/* Round D (TR11): each set's target RPE and note, as the client reads them. */}
              {Array.from({ length: proSetCount }, (_, i) => {
                const text = setTargetText(draft.setTargets?.[i]);
                return text ? (
                  <p key={i} className="text-[12px] text-charcoal-faint" style={{ marginTop: i === 0 ? 8 : 2 }}>
                    <span className="font-semibold text-charcoal-soft">{`Set ${i + 1}`}</span>
                    {` · ${text}`}
                  </p>
                ) : null;
              })}
              <p className="text-[11px] text-charcoal-faint mt-2">Tap a set for its type, target RPE and note.</p>
            </div>
          )}

          {pro && (
            <div className="border-t border-charcoal/[0.08] pt-4 space-y-3">
              <p className="flex items-center text-[11px] font-semibold uppercase text-charcoal-faint" style={{ gap: 8, letterSpacing: "0.14em" }}>
                <Briefcase size={13} aria-hidden /> For your clients
              </p>
              <label className="block">
                <span className="flex items-center text-[13px] font-medium text-charcoal mb-1.5" style={{ gap: 8 }}>
                  <MessageSquareText size={15} aria-hidden style={{ color: "rgb(var(--th-7d6bb5))" }} /> Coach note
                </span>
                <textarea
                  value={draft.coachNote ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, coachNote: e.target.value.slice(0, COACH_NOTE_MAX) }))}
                  maxLength={COACH_NOTE_MAX}
                  rows={3}
                  className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
                />
              </label>
              {pro.targets && (
                <button
                  type="button"
                  onClick={pro.targets.onOpen}
                  className="tap w-full flex items-center justify-between rounded-2xl bg-cream-soft px-4 py-3 text-start"
                  style={{ minHeight: 44 }}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-charcoal">Targets per client</span>
                    {pro.targets.summary && <span className="block text-[12px] text-charcoal-faint truncate">{pro.targets.summary}</span>}
                  </span>
                  <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
                </button>
              )}
            </div>
          )}

          <Button fullWidth size="lg" onClick={save}>
            Save settings
          </Button>
          {onDelete && (
            <Button
              fullWidth
              variant="outline"
              className={pro ? "!border-status-high/30 !bg-status-high/10 !text-status-high" : "!border-teal/30 !text-teal-dark"}
              onClick={() => {
                if (!confirmDelete) {
                  setConfirmDelete(true);
                  setTimeout(() => setConfirmDelete(false), 3000);
                  return;
                }
                onDelete();
                onClose();
              }}
            >
              <Trash2 size={14} />
              {confirmDelete ? "Tap again to confirm" : "Delete exercise"}
            </Button>
          )}
        </div>
      </BottomSheet>

      <ExerciseLibrarySheet
        open={replaceOpen}
        onClose={() => setReplaceOpen(false)}
        onPick={handleReplace}
        mode="replace"
        alreadyAdded={[]}
      />

      {pro && (
        <SetOptionsSheet
          open={setOptionsIndex !== null}
          onClose={() => setSetOptionsIndex(null)}
          set={setOptionsIndex !== null ? coachSet(setOptionsIndex) : null}
          title={`Set ${(setOptionsIndex ?? 0) + 1} options`}
          routineName=""
          pinnedNote={undefined}
          coach={{ coachRpe: draft.rpe, target: setOptionsIndex !== null ? draft.setTargets?.[setOptionsIndex] ?? null : null }}
          onSave={(result) => {
            if (setOptionsIndex === null) return;
            const kind: PrescribedSetType | null = result.kind === "warmup" ? "warmup" : result.kind === "pr" ? "pr" : result.kind === "drop" ? "dropset" : null;
            setDraft((d) => {
              const types = Array.from({ length: Math.max(proSetCount, d.setTypes?.length ?? 0) }, (_, i) => d.setTypes?.[i] ?? null);
              types[setOptionsIndex] = kind;
              // Round D (TR11): the set's own target RPE and note.
              const setTargets = withSetTarget(d.setTargets, setOptionsIndex, { rpe: result.rpe, note: result.notes }, proSetCount);
              return { ...d, setTypes: types, setTargets };
            });
          }}
        />
      )}
    </>
  );
};
