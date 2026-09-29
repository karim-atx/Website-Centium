import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { PopupMenu } from "../ui/PopupMenu";
import type { MuscleGroup, ExerciseClassification, ExerciseTag } from "../../types";
import { BookOpen, ChevronDown, Eye, Trash2 } from "lucide-react";
import { MUSCLE_GROUP_LABEL, SELECTABLE_MUSCLE_GROUPS } from "../../utils/muscleGroups";
import { EXERCISE_TAGS, EXERCISE_TAG_LABEL } from "../../utils/exerciseTags";
import clsx from "clsx";

// Derived from SELECTABLE_MUSCLE_GROUPS rather than listed again here. The
// two copies had already drifted apart once, and this one carried `olympic`
// — a value with no rows behind it since Database 20260924330000.
const muscleGroupOptions: { value: MuscleGroup; label: string }[] =
  SELECTABLE_MUSCLE_GROUPS.map((value) => ({ value, label: MUSCLE_GROUP_LABEL[value] }));

export const classificationOptions: { value: ExerciseClassification; label: string }[] = [
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

/** WO11 dropdown button: 40px, white, 1px rgba(36,31,27,0.11), placeholder in #8C8378. */
const dropdownStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  border: "1px solid rgba(36,31,27,0.11)",
  background: "#FFFFFF",
  padding: "0 14px 0 14px",
  gap: 8,
  fontSize: 14,
};

/** WO11 square button beside the Name field (eye) and the Save button (book). */
const squareStyle = (size: number, tinted: boolean): React.CSSProperties => ({
  width: size,
  height: size,
  borderRadius: 14,
  border: `1px solid ${tinted ? "#D6CFED" : "#E4E4E9"}`,
  background: tinted ? "#F0EDF9" : "#FFFFFF",
  color: "#5F5093",
});

/**
 * WO11 · the custom exercise popup, for creating one and editing one of the
 * user's own (prefilled). The title follows the Name field live ("New Custom
 * Exercise" while it is empty). A square eye button beside Name opens
 * Exercise information (WO13); Classification (single) and Discipline
 * (multi) are dropdown buttons opening the shared filter popup; the footer's
 * square book button opens Exercise history (WO14). Built-in exercises open
 * the view-only popup (WO12), never this one.
 */
export const CreateCustomExerciseSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSave: (data: CustomExerciseData) => void;
  initial?: Partial<CustomExerciseData>;
  /** Opens Exercise information (WO13). */
  onInfo?: () => void;
  /** Opens Exercise history (WO14). */
  onHistory?: () => void;
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
}> = ({ open, onClose, onSave, initial, onInfo, onHistory, onDelete, impact }) => {
  const [name, setName] = useState("");
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [secondaryMuscleGroups, setSecondaryMuscleGroups] = useState<MuscleGroup[]>([]);
  const [classification, setClassification] = useState<ExerciseClassification>("machine_other");
  const [tags, setTags] = useState<ExerciseTag[]>([]);
  const [classAnchor, setClassAnchor] = useState<HTMLElement | null>(null);
  const [tagAnchor, setTagAnchor] = useState<HTMLElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setMuscleGroups(initial?.muscleGroups ?? []);
      setSecondaryMuscleGroups(initial?.secondaryMuscleGroups ?? []);
      setClassification(initial?.classification ?? "machine_other");
      setTags(initial?.tags ?? []);
      setClassAnchor(null);
      setTagAnchor(null);
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
      title={name.trim() || "New Custom Exercise"}
    >
      <div className="space-y-5 animate-fade-slide-up">
        <div>
          <label htmlFor="custom-exercise-name" className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Name
          </label>
          <div className="flex" style={{ gap: 9 }}>
            <input
              id="custom-exercise-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Abdallah's Bungees"
              className="flex-1 min-w-0 text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              style={{ height: 46, borderRadius: 16, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.1)", padding: "0 16px", fontSize: 14 }}
            />
            <button
              onClick={onInfo}
              disabled={!onInfo}
              aria-label="Exercise information"
              className="tap flex-none flex items-center justify-center disabled:opacity-40"
              style={squareStyle(46, true)}
            >
              <Eye size={18} />
            </button>
          </div>
        </div>

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

        {/* A TAG IS NOT A MUSCLE, which is why Discipline is its own control
            rather than more chips above: "is this an Olympic lift" has no
            anatomical answer, and a movement can belong to several. */}
        <div className="grid grid-cols-2" style={{ gap: 11 }}>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Classification</span>
            <button
              onClick={(e) => setClassAnchor(e.currentTarget)}
              aria-haspopup="menu"
              className="tap w-full flex items-center justify-between text-left"
              style={{ ...dropdownStyle, color: "#241F1B" }}
            >
              <span className="truncate">{classificationOptions.find((c) => c.value === classification)?.label}</span>
              <ChevronDown size={14} className="flex-none" style={{ color: "#A9A29A" }} />
            </button>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Discipline</span>
            <button
              onClick={(e) => setTagAnchor(e.currentTarget)}
              aria-haspopup="menu"
              className="tap w-full flex items-center justify-between text-left"
              style={{ ...dropdownStyle, color: tags.length ? "#241F1B" : "#8C8378" }}
            >
              <span className="truncate">
                {tags.length === 0
                  ? "Select"
                  : `${EXERCISE_TAG_LABEL[EXERCISE_TAGS.find((t) => tags.includes(t))!]}${tags.length > 1 ? ` +${tags.length - 1}` : ""}`}
              </span>
              <ChevronDown size={14} className="flex-none" style={{ color: "#A9A29A" }} />
            </button>
          </div>
        </div>

        <PopupMenu<ExerciseClassification>
          open={!!classAnchor}
          anchor={classAnchor}
          align="left"
          onClose={() => setClassAnchor(null)}
          options={classificationOptions}
          selected={classification}
          variant="filled"
          onSelect={setClassification}
        />
        <PopupMenu<ExerciseTag>
          open={!!tagAnchor}
          anchor={tagAnchor}
          align="left"
          onClose={() => setTagAnchor(null)}
          options={EXERCISE_TAGS.map((t) => ({ value: t, label: EXERCISE_TAG_LABEL[t] }))}
          selected={tags}
          multiSelect
          variant="filled"
          onSelect={(t) => setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))}
        />

        <div className="flex" style={{ gap: 9 }}>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="tap flex-1 flex items-center justify-center disabled:opacity-60"
            style={{ height: 52, borderRadius: 16, background: "#AEA1DC", color: "#FFFFFF", fontSize: 14, fontWeight: 700 }}
          >
            Save exercise
          </button>
          <button
            onClick={onHistory}
            disabled={!onHistory}
            aria-label="Exercise history"
            className="tap flex-none flex items-center justify-center disabled:opacity-40"
            style={squareStyle(52, false)}
          >
            <BookOpen size={18} />
          </button>
        </div>

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
