import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Chip } from "../ui/Chip";
import { exerciseLibrary, workoutCategories } from "../../data/mockWorkouts";
import { Search, Plus, Sparkles } from "lucide-react";
import { exerciseCategoryIcon } from "../../utils/icons";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "./CreateCustomExerciseSheet";
import { useApp } from "../../context/AppContext";
import type { MuscleGroup } from "../../types";

export interface ExercisePick {
  name: string;
  muscleGroups?: CustomExerciseData["muscleGroups"];
  secondaryMuscleGroups?: CustomExerciseData["secondaryMuscleGroups"];
  classification?: CustomExerciseData["classification"];
  isCustom?: boolean;
}

export const ExerciseLibrarySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (pick: ExercisePick) => void;
  alreadyAdded: string[];
}> = ({ open, onClose, onPick, alreadyAdded }) => {
  const { customExercises, addCustomExercise } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  const filtered = useMemo(() => {
    return exerciseLibrary.filter((e) => {
      const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category ? e.category === category : true;
      return matchesQuery && matchesCategory;
    });
  }, [query, category]);

  // V4 (QA 4.0): a custom exercise is saved to this searchable library on
  // creation — it's only added to the routine/session if explicitly tapped
  // below, same as any built-in exercise.
  const filteredCustom = useMemo(() => {
    return customExercises.filter((e) => {
      const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category ? (e.muscleGroups ?? []).includes(category as MuscleGroup) : true;
      return matchesQuery && matchesCategory;
    });
  }, [customExercises, query, category]);

  return (
    <>
      <BottomSheet
        open={open}
        onClose={() => {
          setQuery("");
          setCategory(null);
          onClose();
        }}
        title="Exercise Library"
      >
        <div className="animate-fade-slide-up">
          <div className="flex items-center gap-2 mb-4">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search exercises…"
                className="w-full rounded-2xl bg-cream-soft pl-9 pr-4 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <button
              onClick={() => setCustomOpen(true)}
              className="tap w-10 h-10 rounded-2xl bg-charcoal text-cream flex items-center justify-center shrink-0"
              aria-label="Add custom exercise"
              title="Add a custom exercise"
            >
              <Plus size={17} />
            </button>
          </div>

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
            <Chip active={category === null} onClick={() => setCategory(null)}>
              All
            </Chip>
            {workoutCategories.map((c) => {
              const Icon = exerciseCategoryIcon[c.id];
              return (
                <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                  <Icon size={12} className="inline mr-1 -mt-0.5" /> {c.label}
                </Chip>
              );
            })}
          </div>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar mb-4">
            {filteredCustom.map((e) => {
              const added = alreadyAdded.includes(e.name);
              return (
                <button
                  key={e.name}
                  onClick={() => !added && onPick({ ...e, isCustom: true })}
                  disabled={added}
                  className="tap w-full flex items-center justify-between rounded-2xl px-3.5 py-3 hover:bg-cream-soft text-left disabled:opacity-40"
                >
                  <span className="text-sm font-medium text-charcoal flex items-center gap-1.5">
                    <Sparkles size={12} className="text-gold shrink-0" /> {e.name}
                  </span>
                  <span className="text-xs font-semibold text-primary">{added ? "Added" : "+ Add"}</span>
                </button>
              );
            })}
            {filtered.map((e) => {
              const added = alreadyAdded.includes(e.name);
              return (
                <button
                  key={e.name}
                  onClick={() => !added && onPick({ name: e.name, classification: e.classification, muscleGroups: e.muscleGroups, secondaryMuscleGroups: e.secondaryMuscleGroups })}
                  disabled={added}
                  className="tap w-full flex items-center justify-between rounded-2xl px-3.5 py-3 hover:bg-cream-soft text-left disabled:opacity-40"
                >
                  <span className="text-sm font-medium text-charcoal">{e.name}</span>
                  <span className="text-xs font-semibold text-primary">{added ? "Added" : "+ Add"}</span>
                </button>
              );
            })}
            {filtered.length === 0 && filteredCustom.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-8">
                No matches — use the + button above to add a custom exercise.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      <CreateCustomExerciseSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        onSave={(data) => addCustomExercise(data)}
      />
    </>
  );
};
