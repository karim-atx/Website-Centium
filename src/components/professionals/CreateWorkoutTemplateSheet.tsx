import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import type { Exercise } from "../../types";
import { exerciseLibrary } from "../../data/mockWorkouts";
import { useApp } from "../../context/AppContext";
import { ExerciseLibrarySheet, type ExercisePick } from "../workout/ExerciseLibrarySheet";
import { ExerciseSettingsSheet } from "../workout/ExerciseSettingsSheet";
import { GripVertical, Library, Search, Settings2, X } from "lucide-react";
import clsx from "clsx";

let localId = 0;
const blankExercise = (pick: ExercisePick): Exercise => ({
  id: `tmpl-ex-${Date.now()}-${localId++}`,
  name: pick.name,
  sets: 3,
  reps: 10,
  weightKg: 20,
  category: "full_body",
  muscleGroups: pick.muscleGroups,
  classification: pick.classification,
  isCustom: pick.isCustom,
});

// V6 (QA 6.0): the professional's Workout Template Builder — same
// routine-building UI as the client's Workout tab (CreateRoutineSheet), but
// produces a template assignable to one or more clients instead of a
// personal routine.
export const CreateWorkoutTemplateSheet: React.FC<{ open: boolean; onClose: () => void; defaultFolderId?: string | null }> = ({
  open,
  onClose,
  defaultFolderId = null,
}) => {
  const { addWorkoutTemplate, customExercises, professionalClients, workoutTemplateFolders } = useApp();
  const [name, setName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [settingsIndex, setSettingsIndex] = useState<number | null>(null);
  const [folderId, setFolderId] = useState<string | null>(defaultFolderId);

  const reset = () => {
    setName("");
    setExercises([]);
    setAssignedClientIds([]);
    setSearchQuery("");
    setFolderId(defaultFolderId);
  };

  const addExercise = (pick: ExercisePick) => {
    if (!pick.name.trim() || exercises.some((e) => e.name === pick.name.trim())) return;
    setExercises((prev) => [...prev, blankExercise({ ...pick, name: pick.name.trim() })]);
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

  const toggleClient = (id: string) =>
    setAssignedClientIds((prev) => (prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]));

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const fromCustom = customExercises
      .filter((e) => e.name.toLowerCase().includes(q))
      .map((e) => ({ name: e.name, classification: e.classification, isCustom: true as const }));
    const fromLibrary = exerciseLibrary
      .filter((e) => e.name.toLowerCase().includes(q))
      .map((e) => ({ name: e.name, classification: e.classification, isCustom: false as const }));
    return [...fromCustom, ...fromLibrary].slice(0, 6);
  }, [searchQuery, customExercises]);

  const save = () => {
    if (!name.trim() || exercises.length === 0) return;
    addWorkoutTemplate({ name: name.trim(), exercises, assignedClientIds, folderId });
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
        title="New Workout Template"
      >
        <div className="space-y-5 animate-fade-slide-up">
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Template name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="12-Week Strength Block"
              className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </label>

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
                className="w-full rounded-xl bg-cream-soft border border-charcoal/10 pl-9 pr-3 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="space-y-1 mb-2.5">
                {searchResults.map((r) => (
                  <button
                    key={r.name}
                    onClick={() => addExercise({ name: r.name, classification: r.classification })}
                    className="tap w-full flex items-center justify-between rounded-xl px-3 py-2 bg-primary-pale/60 hover:bg-primary-pale text-left"
                  >
                    <span className="text-sm font-medium text-charcoal">{r.name}</span>
                    <span className="text-xs font-semibold text-primary">+ Add</span>
                  </button>
                ))}
              </div>
            )}

            <button
              onClick={() => setLibraryOpen(true)}
              className="tap w-full flex items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-charcoal/15 py-2.5 text-xs font-semibold text-charcoal-soft"
            >
              <Library size={14} /> Browse exercise database
            </button>
          </div>

          {workoutTemplateFolders.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Folder</span>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFolderId(null)}
                  className={clsx(
                    "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                    folderId === null
                      ? "bg-primary text-white border-primary"
                      : "bg-cream-soft border-transparent text-charcoal-soft"
                  )}
                >
                  Unfiled
                </button>
                {workoutTemplateFolders.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setFolderId(f.id)}
                    className={clsx(
                      "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                      folderId === f.id
                        ? "bg-primary text-white border-primary"
                        : "bg-cream-soft border-transparent text-charcoal-soft"
                    )}
                  >
                    {f.parentId ? "↳ " : ""}
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {professionalClients.length > 0 && (
            <div>
              <span className="text-xs font-semibold text-charcoal-soft mb-2 block">Assign to</span>
              <div className="flex flex-wrap gap-2">
                {professionalClients.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleClient(c.id)}
                    className={clsx(
                      "tap rounded-xl px-3 py-1.5 text-xs font-semibold border transition-colors",
                      assignedClientIds.includes(c.id)
                        ? "bg-primary text-white border-primary"
                        : "bg-cream-soft border-transparent text-charcoal-soft"
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <Button fullWidth size="lg" onClick={save} disabled={!name.trim() || exercises.length === 0}>
            Save template
          </Button>
        </div>
      </BottomSheet>

      <ExerciseLibrarySheet
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onPick={(pick) => addExercise(pick)}
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
