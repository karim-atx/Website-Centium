import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import type { Exercise, RepMaxUpdateMode, MuscleGroup, ExerciseClassification } from "../../types";
import { ONE_RM_CLASSIFICATIONS } from "../../types";
import { ExerciseLibrarySheet, type ExercisePick } from "./ExerciseLibrarySheet";
import { X, ChevronRight, Trash2 } from "lucide-react";
import clsx from "clsx";

const repMaxModes: { value: RepMaxUpdateMode; label: string; desc: string }[] = [
  { value: "no_update", label: "Does not update", desc: "Rep Max stays unchanged" },
  { value: "prompt", label: "Prompt for update", desc: "Ask when an update looks likely" },
  { value: "prompt_with_estimate", label: "Prompt with estimate", desc: "Pre-fill the new estimated 1RM" },
];

const muscleGroupLabel: Record<MuscleGroup, string> = {
  back: "Back",
  bicep: "Bicep",
  cardio: "Cardio",
  chest: "Chest",
  core: "Core",
  full_body: "Full Body",
  hamstrings: "Hamstrings",
  olympic: "Olympic",
  other: "Other",
  quads: "Quads",
  shoulders: "Shoulders",
  tricep: "Tricep",
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
}> = ({ open, onClose, exercise, routineId, onSave, onDelete }) => {
  const { personalRecords, setPersonalRecord, pausedSessions, savePausedSession } = useApp();
  const [draft, setDraft] = useState<Partial<Exercise>>({});
  const [oneRmDraft, setOneRmDraft] = useState("");
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  React.useEffect(() => {
    if (exercise) {
      setDraft(exercise);
      setOneRmDraft(String(personalRecords[exercise.name] ?? ""));
      setConfirmDelete(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exercise]);

  if (!exercise) return null;

  const isOneRmEligible = draft.classification && ONE_RM_CLASSIFICATIONS.includes(draft.classification);

  const num = (key: keyof Exercise) => (
    <input
      value={draft[key] === undefined || draft[key] === null ? "" : String(draft[key])}
      onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value === "" ? undefined : Number(e.target.value) }))}
      inputMode="decimal"
      className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20"
    />
  );

  const handleReplace = (pick: ExercisePick) => {
    onSave({
      name: pick.name,
      muscleGroups: pick.muscleGroups,
      classification: pick.classification,
      isCustom: pick.isCustom,
    });
    setReplaceOpen(false);
    onClose();
  };

  const save = () => {
    const finalName = exercise.name;
    onSave(draft);
    if (isOneRmEligible && oneRmDraft) setPersonalRecord(finalName, Number(oneRmDraft));

    // V6 (QA 6.0): editing Min/Max sets should change an already-started
    // routine — resize the live/paused session's logged sets for this
    // exercise to match the new max, keeping already-entered values.
    if (routineId && draft.maxSets && pausedSessions[routineId]) {
      const paused = pausedSessions[routineId];
      const exIdx = paused.logged.findIndex((e) => e.exerciseId === exercise.id);
      if (exIdx !== -1) {
        const current = paused.logged[exIdx].sets;
        const target = draft.maxSets;
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
              className="tap flex-1 flex items-center justify-between gap-2 rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-left min-w-0"
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

          {(exercise.muscleGroups?.length || exercise.classification) && (
            <div className="flex flex-wrap gap-1.5">
              {exercise.muscleGroups?.map((mg) => (
                <span
                  key={mg}
                  className="rounded-full bg-primary-pale text-primary-dark text-[11px] font-semibold px-2.5 py-1"
                >
                  {muscleGroupLabel[mg]}
                </span>
              ))}
              {exercise.classification && (
                <span className="rounded-full bg-cream-soft text-charcoal-soft text-[11px] font-semibold px-2.5 py-1">
                  {classificationLabel[exercise.classification]}
                </span>
              )}
            </div>
          )}

          {isOneRmEligible && (
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

          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
              Tempo (ecc-pause-con-pause)
            </span>
            <input
              value={draft.tempo ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, tempo: e.target.value }))}
              placeholder="3-1-1-0"
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

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
                    "tap w-full text-left rounded-xl px-3.5 py-2.5 border transition-colors",
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

          <Button fullWidth size="lg" onClick={save}>
            Save settings
          </Button>
          {onDelete && (
            <Button
              fullWidth
              variant="outline"
              className="!border-teal/30 !text-teal-dark"
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
        alreadyAdded={[]}
      />
    </>
  );
};
