import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { MuscleGroup, ExerciseClassification } from "../../types";
import clsx from "clsx";

const muscleGroupOptions: { value: MuscleGroup; label: string }[] = [
  { value: "back", label: "Back" },
  { value: "bicep", label: "Bicep" },
  { value: "cardio", label: "Cardio" },
  { value: "chest", label: "Chest" },
  { value: "core", label: "Core" },
  { value: "full_body", label: "Full Body" },
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
}> = ({ open, onClose, onSave, initial }) => {
  const [name, setName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [classification, setClassification] = useState<ExerciseClassification>("machine_other");
  const [classificationOpen, setClassificationOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMuscleGroups(initial?.muscleGroups ?? []);
      setClassification(initial?.classification ?? "machine_other");
      setClassificationOpen(false);
    }
  }, [open, initial]);

  const toggleMuscleGroup = (mg: MuscleGroup) =>
    setMuscleGroups((prev) => (prev.includes(mg) ? prev.filter((m) => m !== mg) : [...prev, mg]));

  const save = () => {
    if (!name.trim()) return;
    onSave({ name: name.trim(), muscleGroups, classification });
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={initial?.name ? "Edit Custom Exercise" : "Create New Exercise"}>
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Name</span>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Abdallah's Bungees"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-2 block">
            Muscle Group <span className="text-charcoal-faint font-normal">(select any that apply)</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {muscleGroupOptions.map((mg) => (
              <button
                key={mg.value}
                onClick={() => toggleMuscleGroup(mg.value)}
                className={clsx(
                  "tap rounded-xl px-3 py-2 text-xs font-semibold border transition-colors",
                  muscleGroups.includes(mg.value)
                    ? "bg-sohati text-white border-sohati"
                    : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                )}
              >
                {mg.label}
              </button>
            ))}
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
                    classification === c.value ? "text-sohati font-semibold" : "text-cream/90"
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
