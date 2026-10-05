import React from "react";
import { BottomSheet } from "../ui/BottomSheet";
import type { ExerciseClassification, ExerciseTag, MuscleGroup } from "../../types";
import { BookOpen, Eye } from "lucide-react";
import { MUSCLE_GROUP_LABEL, SELECTABLE_MUSCLE_GROUPS } from "../../utils/muscleGroups";
import { disciplineSummary } from "../../utils/exerciseTags";
import { classificationLabel } from "../../utils/exerciseClassification";

export interface BuiltInExercise {
  name: string;
  muscleGroups: MuscleGroup[];
  secondaryMuscleGroups: MuscleGroup[];
  classification: ExerciseClassification;
  tags: ExerciseTag[];
}

/** A read-only value field (WO12): #F7F7FA, 10% border, 40px. */
const fieldStyle: React.CSSProperties = {
  height: 40,
  borderRadius: 12,
  background: "#F7F7FA",
  border: "1px solid rgba(36,31,27,0.1)",
  padding: "0 14px",
  fontSize: 14,
  color: "#241F1B",
};

/**
 * WO12 · Built-in exercise popup, view only. The title is the exercise's
 * name; no explanatory text. A full-width Information button (eye) opens
 * Exercise information (WO13) where the Name field would be; Muscle Group,
 * Classification and Discipline show the exercise's values read-only; no
 * Save — a full-width History button (book) opens Exercise history (WO14).
 * Catalog exercises can no longer be edited or duplicated from the Library.
 */
export const BuiltInExerciseSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  exercise: BuiltInExercise | null;
  onInfo?: () => void;
  onHistory?: () => void;
}> = ({ open, onClose, exercise, onInfo, onHistory }) => (
  <BottomSheet light open={open && !!exercise} onClose={onClose} title={exercise?.name ?? ""}>
    {exercise && (
      <div className="space-y-5 animate-fade-slide-up">
        <button
          onClick={onInfo}
          disabled={!onInfo}
          className="tap w-full flex items-center justify-center disabled:opacity-60"
          style={{ height: 48, borderRadius: 14, background: "#F0EDF9", border: "1px solid #D6CFED", color: "#5F5093", gap: 8, fontSize: 14, fontWeight: 700 }}
        >
          <Eye size={18} /> Information
        </button>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Muscle Group</span>
          <div className="flex flex-wrap gap-2" aria-readonly>
            {SELECTABLE_MUSCLE_GROUPS.map((mg) => {
              const primary = exercise.muscleGroups.includes(mg);
              const secondary = !primary && exercise.secondaryMuscleGroups.includes(mg);
              return (
                <span
                  key={mg}
                  className="rounded-xl px-3 py-2 text-xs font-semibold border"
                  style={
                    primary
                      ? { background: "rgb(var(--c-primary-fill))", borderColor: "#AEA1DC", color: "rgb(var(--c-on-primary-fill))" }
                      : secondary
                        ? { background: "#EEEBF8", borderColor: "#D4CDED", color: "#5F5093" }
                        : { background: "#FFFFFF", borderColor: "rgba(36,31,27,0.07)", color: "#A5A09B" }
                  }
                >
                  {MUSCLE_GROUP_LABEL[mg]}
                  {secondary && <span className="ml-1 text-[9px] align-super">2°</span>}
                </span>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2" style={{ gap: 11 }}>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Classification</span>
            <p className="flex items-center truncate" style={{ ...fieldStyle, margin: 0 }}>
              {classificationLabel(exercise.classification)}
            </p>
          </div>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Discipline</span>
            <p className="flex items-center truncate" style={{ ...fieldStyle, margin: 0 }}>
              {disciplineSummary(exercise.tags) ?? "None"}
            </p>
          </div>
        </div>

        <button
          onClick={onHistory}
          disabled={!onHistory}
          className="tap w-full flex items-center justify-center disabled:opacity-60"
          style={{ height: 52, borderRadius: 16, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", gap: 8, fontSize: 14, fontWeight: 700 }}
        >
          <BookOpen size={18} /> History
        </button>
      </div>
    )}
  </BottomSheet>
);
