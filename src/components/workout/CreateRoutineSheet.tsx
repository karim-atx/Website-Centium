import React, { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { Exercise, Routine } from "../../types";
import { workoutPrograms } from "../../data/mockWorkouts";
import { useApp } from "../../context/AppContext";
import { GripVertical, Plus, X } from "lucide-react";

const colorOptions = ["#1B6B52", "#E97452", "#4C8FD1", "#9C4F7C", "#D9A441", "#241F1B"];

const exercisePool: string[] = Array.from(
  new Set(workoutPrograms.flatMap((p) => p.exercises.map((e) => e.name)))
);

let localId = 0;
const blankExercise = (name: string): Exercise => ({
  id: `custom-ex-${Date.now()}-${localId++}`,
  name,
  sets: 3,
  reps: 10,
  weightKg: 20,
  category: "full_body",
});

export const CreateRoutineSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  folderId: string | null;
}> = ({ open, onClose, folderId }) => {
  const { addRoutine } = useApp();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("45");
  const [color, setColor] = useState(colorOptions[0]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [customName, setCustomName] = useState("");
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const reset = () => {
    setName("");
    setDuration("45");
    setColor(colorOptions[0]);
    setExercises([]);
    setCustomName("");
  };

  const addExercise = (exName: string) => {
    if (!exName.trim()) return;
    setExercises((prev) => [...prev, blankExercise(exName.trim())]);
    setCustomName("");
  };

  const removeExercise = (id: string) => setExercises((prev) => prev.filter((e) => e.id !== id));

  const handleDrop = (targetIdx: number) => {
    if (dragIndex === null || dragIndex === targetIdx) return;
    setExercises((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(targetIdx, 0, moved);
      return next;
    });
    setDragIndex(null);
  };

  const save = () => {
    if (!name.trim() || exercises.length === 0) return;
    const routine: Omit<Routine, "id"> = {
      folderId,
      name: name.trim(),
      color,
      estimatedDurationMin: Number(duration) || 30,
      exercises,
    };
    addRoutine(routine);
    reset();
    onClose();
  };

  return (
    <BottomSheet
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Create Routine"
    >
      <div className="space-y-5 animate-fade-slide-up">
        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Routine name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Push Day"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
            Estimated duration (min)
          </span>
          <input
            value={duration}
            onChange={(e) => setDuration(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            className="w-28 rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20"
          />
        </label>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Color</span>
          <div className="flex gap-2">
            {colorOptions.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className="tap w-8 h-8 rounded-full flex items-center justify-center"
                style={{ background: c, outline: color === c ? "2px solid rgb(var(--c-charcoal))" : "none", outlineOffset: 2 }}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="text-xs font-semibold text-charcoal-soft mb-2 block">
            Exercises {exercises.length > 0 && `(drag to reorder)`}
          </span>
          <div className="space-y-1.5 mb-3">
            {exercises.map((ex, i) => (
              <div
                key={ex.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                className="tap flex items-center gap-2 bg-cream-soft rounded-xl px-3 py-2.5 cursor-grab active:cursor-grabbing"
              >
                <GripVertical size={14} className="text-charcoal-faint" />
                <span className="flex-1 text-sm font-medium text-charcoal">{ex.name}</span>
                <button onClick={() => removeExercise(ex.id)} className="tap text-charcoal-faint">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {exercisePool
              .filter((n) => !exercises.some((e) => e.name === n))
              .slice(0, 8)
              .map((n) => (
                <button
                  key={n}
                  onClick={() => addExercise(n)}
                  className="tap text-xs font-semibold bg-sohati-pale text-sohati-dark rounded-full px-3 py-1.5"
                >
                  + {n}
                </button>
              ))}
          </div>

          <div className="flex gap-2">
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addExercise(customName)}
              placeholder="Custom exercise name…"
              className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
            <button
              onClick={() => addExercise(customName)}
              className="tap w-9 h-9 rounded-xl bg-charcoal text-cream flex items-center justify-center shrink-0"
            >
              <Plus size={15} />
            </button>
          </div>
        </div>

        <Button fullWidth size="lg" onClick={save} disabled={!name.trim() || exercises.length === 0}>
          Save routine
        </Button>
      </div>
    </BottomSheet>
  );
};
