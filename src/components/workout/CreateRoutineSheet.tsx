import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { Exercise, Routine } from "../../types";
import { exerciseLibrary } from "../../data/mockWorkouts";
import { useApp } from "../../context/AppContext";
import { ExerciseLibrarySheet } from "./ExerciseLibrarySheet";
import { ExerciseSettingsSheet } from "./ExerciseSettingsSheet";
import { GripVertical, Library, Search, Settings2, X } from "lucide-react";

const colorOptions = ["#1B6B52", "#E97452", "#4C8FD1", "#9C4F7C", "#D9A441", "#241F1B"];

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
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);

  const reset = () => {
    setName("");
    setDuration("45");
    setColor(colorOptions[0]);
    setExercises([]);
    setSearchQuery("");
  };

  const addExercise = (exName: string) => {
    if (!exName.trim() || exercises.some((e) => e.name === exName.trim())) return;
    setExercises((prev) => [...prev, blankExercise(exName.trim())]);
    setSearchQuery("");
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

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return exerciseLibrary
      .filter((e) => e.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .slice(0, 6);
  }, [searchQuery]);

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
    <>
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
              Exercises {exercises.length > 0 && `(drag to reorder, tap for settings)`}
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
                  <GripVertical size={14} className="text-charcoal-faint shrink-0" />
                  <button
                    onClick={() => setSettingsIndex(i)}
                    className="flex-1 flex items-center justify-between text-left min-w-0"
                  >
                    <span className="text-sm font-medium text-charcoal truncate">{ex.name}</span>
                    <Settings2 size={13} className="text-charcoal-faint shrink-0 ml-2" />
                  </button>
                  <button onClick={() => removeExercise(ex.id)} className="tap text-charcoal-faint shrink-0">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>

            <div className="relative mb-2.5">
              <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for exercise…"
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1 mb-2.5">
                {searchResults.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => addExercise(r.name)}
                    className="tap w-full flex items-center justify-between rounded-xl px-3 py-2 bg-sohati-pale/60 hover:bg-sohati-pale text-left"
                  >
                    <span className="text-sm font-medium text-charcoal">{r.name}</span>
                    <span className="text-xs font-semibold text-sohati">+ Add</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setLibraryOpen(true)}
              className="tap w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-charcoal/15 py-2.5 text-xs font-semibold text-charcoal-soft"
            >
              <Library size={14} /> Browse exercise library
            </button>
          </div>

          <Button fullWidth size="lg" onClick={save} disabled={!name.trim() || exercises.length === 0}>
            Save routine
          </Button>
        </div>
      </BottomSheet>

      <ExerciseLibrarySheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPick={(exName) => addExercise(exName)}
        alreadyAdded={exercises.map((e) => e.name)}
      />

      <ExerciseSettingsSheet
        open={settingsIndex !== null}
        onClose={() => setSettingsIndex(null)}
        exercise={settingsIndex !== null ? exercises[settingsIndex] : null}
        onSave={(patch) => {
          if (settingsIndex === null) return;
          setExercises((prev) => prev.map((e, i) => (i === settingsIndex ? { ...e, ...patch } : e)));
        }}
      />
    </>
  );
};
