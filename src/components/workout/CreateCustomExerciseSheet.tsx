import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { MuscleGroup, ExerciseClassification } from "../../types";
import clsx from "clsx";

const muscleGroupOptions: { value: MuscleGroup; label: string }[] = [
  { value: "back", label: "Back" },
  { value: "bicep", label: "Bicep" },
  { value: "calves", label: "Calves" },
  { value: "cardio", label: "Cardio" },
  { value: "chest", label: "Chest" },
  { value: "core", label: "Core" },
  { value: "forearms", label: "Forearms" },
  { value: "glutes", label: "Glutes" },
  { value: "hamstrings", label: "Hamstrings" },
  { value: "olympic", label: "Olympic" },
  { value: "other", label: "Other" },
  { value: "quads", label: "Quads" },
  { value: "shoulders", label: "Shoulders" },
  { value: "tricep", label: "Tricep" },
];

const classificationOptions: { value: ExerciseClassification; label: string }[] = [
  { value: "barbell", label: "Barbell" },
  { value: "dumbbell", label: "Dumbbell" },
  { value: "machine_other", label: "Machine / Other" },
  { value: "weighted_bodyweight", label: "Weighted Bodyweight" },
  { value: "assisted_bodyweight", label: "Assisted Bodyweight" },
  { value: "reps_only", label: "Reps Only" },
  { value: "cardio", label: "Cardio" },
  { value: "duration", label: "Duration" },
];

export interface CustomExerciseData {
  name: string;
  muscleGroups: MuscleGroup[];
  // V10 (QA 10.0): a muscle group chip now cycles unselected → main →
  // secondary → unselected, so an exercise can record e.g. "chest" as the
  // primary mover and "shoulders"/"tricep" as secondary, like a bench press.
  secondaryMuscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
}

// V4: Custom Exercise creation overhaul, Strong-app inspired (not copied) —
// Name, "Muscle Group" (renamed from Body Part, multi-select), and
// "Classification" (renamed from Category). Reused for both creating a new
// custom exercise and editing an existing one's parameters (always
// available, per QA).
export const CreateCustomExerciseSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (data: CustomExerciseData) => void;
  initial?: Partial<CustomExerciseData>;
  // V8 (QA 8.0): editing a stock library exercise can't mutate the shared
  // built-in data, so it saves as a new custom exercise instead — this
  // makes that distinction clear instead of implying an in-place edit.
  duplicateFromStock?: boolean;
}> = ({ open, onClose, onSave, initial, duplicateFromStock }) => {
  const [name, setName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState<MuscleGroup[]>([]);
  const [classification, setClassification] = useState<ExerciseClassification>("machine_other");
  const [classificationOpen, setClassificationOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMuscleGroups(initial?.muscleGroups ?? []);
      setSecondaryMuscleGroups(initial?.secondaryMuscleGroups ?? []);
      setClassification(initial?.classification ?? "machine_other");
      setClassificationOpen(false);
    }
  }, [open, initial]);

  // V10 (QA 10.0): "it can be organized as main muscle group by clicking
  // once, secondary muscle group by another click or reset selection for a
  // third click" — a 3-state cycle per chip instead of a plain toggle.
  const cycleMuscleGroup = (mg: MuscleGroup) => {
    const isPrimary = muscleGroups.includes(mg);
    const isSecondary = secondaryMuscleGroups.includes(mg);
    if (!isPrimary && !isSecondary) {
      setMuscleGroups((prev) => [...prev, mg]);
    } else if (isPrimary) {
      setMuscleGroups((prev) => prev.filter((m) => m !== mg));
      setSecondaryMuscleGroups((prev) => [...prev, mg]);
    } else {
      setSecondaryMuscleGroups((prev) => prev.filter((m) => m !== mg));
    }
  };

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), muscleGroups, secondaryMuscleGroups, classification });
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={duplicateFromStock ? "Save as Custom Exercise" : initial?.name ? "Edit Custom Exercise" : "Create New Exercise"}
    >
      <div className="space-y-5 animate-fade-slide-up">
        {duplicateFromStock && (
          <p className="text-[11px] text-charcoal-faint -mt-2">
            This is a built-in exercise — saving will add your changes as a new custom exercise instead of
            changing the original.
          </p>
        )}
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Abdallah's Bungees"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1 block">Muscle Group</span>
          <p className="text-[11px] text-charcoal-faint mb-2">
            Click once for main, twice for secondary, three times to clear.
          </p>
          <div className="flex flex-wrap gap-2">
            {muscleGroupOptions.map((mg) => {
              const isPrimary = muscleGroups.includes(mg.value);
              const isSecondary = secondaryMuscleGroups.includes(mg.value);
              return (
                <button
                  key={mg.value}
                  onClick={() => cycleMuscleGroup(mg.value)}
                  className={clsx(
                    "tap rounded-xl px-3 py-2 text-xs font-semibold border transition-colors",
                    isPrimary
                      ? "bg-primary text-white border-primary"
                      : isSecondary
                      ? "bg-primary-pale text-primary-dark border-primary/40"
                      : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                  )}
                >
                  {mg.label}
                  {isSecondary && <span className="ml-1 text-[9px] align-super">2°</span>}
                </button>
              );
            })}
          </div>
        </div>

        <div className="relative">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Classification</span>
          <button
            onClick={() => setClassificationOpen((v) => !v)}
            className="tap w-full flex items-center justify-between rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-left text-sm text-charcoal"
          >
            {classificationOptions.find((c) => c.value === classification)?.label}
            <span className="text-charcoal-faint">{classificationOpen ? "▲" : "▼"}</span>
          </button>
          {classificationOpen && (
            <div className="mt-1.5 rounded-2xl bg-charcoal shadow-lift overflow-hidden animate-fade-slide-up">
              {classificationOptions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => {
                    setClassification(c.value);
                    setClassificationOpen(false);
                  }}
                  className={clsx(
                    "tap w-full text-left px-4 py-2.5 text-sm border-b border-white/5 last:border-0",
                    classification === c.value ? "text-primary font-semibold" : "text-cream/90"
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <Button fullWidth size="lg" onClick={save} disabled={!name.trim()}>
          Save exercise
        </Button>
      </div>
    </BottomSheet>
  );
};
