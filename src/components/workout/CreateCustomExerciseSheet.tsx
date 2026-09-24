import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { MuscleGroup, ExerciseClassification, ExerciseTag } from "../../types";
import { Trash2 } from "lucide-react";
import { MUSCLE_GROUP_LABEL, SELECTABLE_MUSCLE_GROUPS } from "../../utils/muscleGroups";
import { EXERCISE_TAGS, EXERCISE_TAG_LABEL } from "../../utils/exerciseTags";
import clsx from "clsx";

// Derived from SELECTABLE_MUSCLE_GROUPS rather than listed again here. The
// two copies had already drifted apart once, and this one carried `olympic`
// — a value with no rows behind it since Database 20260924330000.
const muscleGroupOptions: { value: MuscleGroup; label: string }[] =
  SELECTABLE_MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_GROUP_LABEL[value] }));

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
  /** The disciplines it belongs to. Orthogonal to muscle groups. */
  tags: ExerciseTag[];
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
  /**
   * Supplied only when editing one of the user's OWN movements, which is the
   * only kind that can be deleted: a catalog row is shared reference data and
   * no client role can write to public.exercises at all. Omitted, no delete
   * control renders — the same gate ExerciseSettingsSheet's onDelete uses.
   */
  onDelete?: () => void;
  /**
   * What deleting would take with it, counted by the caller from the user's
   * own routines and records. The sheet cannot see them, and a confirm that
   * says "some routines" is not a confirm.
   */
  impact?: { routines: number; templates: number; hasPersonalRecord: boolean };
}> = ({ open, onClose, onSave, initial, duplicateFromStock, onDelete, impact }) => {
  const [name, setName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState<MuscleGroup[]>([]);
  const [classification, setClassification] = useState<ExerciseClassification>("machine_other");
  const [tags, setTags] = useState<ExerciseTag[]>([]);
  const [classificationOpen, setClassificationOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMuscleGroups(initial?.muscleGroups ?? []);
      setSecondaryMuscleGroups(initial?.secondaryMuscleGroups ?? []);
      setClassification(initial?.classification ?? "machine_other");
      setTags(initial?.tags ?? []);
      setClassificationOpen(false);
      // Armed state never survives the sheet closing, so reopening on a
      // different exercise cannot inherit a tap meant for the previous one.
      setConfirmDelete(false);
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
    onSave({ name: name.trim(), muscleGroups, secondaryMuscleGroups, classification, tags });
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

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Discipline
          </span>
          {/* A TAG IS NOT A MUSCLE, which is why this is a separate control
              rather than more chips in the list above. "Is this an Olympic
              lift" has no anatomical answer — a Snatch trains shoulders and
              so does a lateral raise — and a movement can belong to more than
              one discipline at once. */}
          <div className="flex flex-wrap" style={{ gap: 6 }}>
            {EXERCISE_TAGS.map((tag) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  onClick={() =>
                    setTags((prev) => (on ? prev.filter((t) => t !== tag) : [...prev, tag]))
                  }
                  aria-pressed={on}
                  className="tap transition-colors"
                  style={{
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${on ? "#A299DE" : "#E7E7EC"}`,
                    background: on ? "#A299DE" : "#FFFFFF",
                    color: on ? "#FFFFFF" : "#241F1B",
                  }}
                >
                  {EXERCISE_TAG_LABEL[tag]}
                </button>
              );
            })}
          </div>
        </div>


        <Button fullWidth size="lg" onClick={save} disabled={!name.trim()}>
          Save exercise
        </Button>

        {/* WHAT DELETING ACTUALLY DOES, said before it happens rather than a
            bare "tap again to confirm" that names no consequence. The
            behaviour is the foreign keys', measured off pg_constraint:
            routine_exercises, workout_template_exercises and personal_records
            all CASCADE, while logged_exercises is SET NULL and keeps the name
            the sets were logged under. The counts come from the caller, which
            can see the user's routines; the history promise is the schema's
            and is true regardless. */}
        {onDelete && (
          <div>
            {confirmDelete ? (
              <div
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(176,64,47,0.28)",
                  background: "#FBEDEB",
                  padding: "12px 14px",
                }}
              >
                <p className="text-[13px] font-bold text-charcoal mb-1.5">
                  Delete “{name.trim() || initial?.name}”?
                </p>
                <ul className="text-[11.5px] text-charcoal-soft" style={{ margin: 0, paddingLeft: 16 }}>
                  {impact && impact.routines > 0 && (
                    <li>
                      It is removed from {impact.routines} {impact.routines === 1 ? "routine" : "routines"}.
                    </li>
                  )}
                  {impact && impact.templates > 0 && (
                    <li>
                      It is removed from {impact.templates}{" "}
                      {impact.templates === 1 ? "template" : "templates"}.
                    </li>
                  )}
                  {impact && impact.routines === 0 && impact.templates === 0 && (
                    <li>No routine or template uses it.</li>
                  )}
                  {impact?.hasPersonalRecord && <li>Its personal record is deleted with it.</li>}
                  <li>Past workouts keep it — logged sets are not touched.</li>
                </ul>
                <div className="flex" style={{ gap: 8, marginTop: 10 }}>
                  <Button variant="outline" fullWidth onClick={() => setConfirmDelete(false)}>
                    Keep it
                  </Button>
                  <Button
                    fullWidth
                    variant="teal"
                    onClick={() => {
                      onDelete();
                      onClose();
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                fullWidth
                variant="outline"
                className="!border-teal/30 !text-teal-dark"
                onClick={() => setConfirmDelete(true)}
              >
                {/* "custom" is in the label on purpose: the neighbouring
                    sheet's "Delete exercise" takes a movement out of one
                    routine, while this removes the movement itself from the
                    user's library. */}
                <Trash2 size={14} /> Delete custom exercise
              </Button>
            )}
          </div>
        )}

      </div>
    </BottomSheet>
  );
};
