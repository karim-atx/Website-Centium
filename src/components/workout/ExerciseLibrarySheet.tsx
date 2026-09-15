import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Chip } from "../ui/Chip";
import { Search, Plus, Sparkles } from "lucide-react";
import { muscleGroupIcon } from "../../utils/icons";
import { MUSCLE_GROUP_LABEL } from "../../utils/muscleGroups";
import { CreateCustomExerciseSheet, type CustomExerciseData } from "./CreateCustomExerciseSheet";
import { useApp } from "../../context/AppContext";
import { isUuid } from "../../services/food";
import type { MuscleGroup } from "../../types";

export interface ExercisePick {
  name: string;
  muscleGroups?: CustomExerciseData["muscleGroups"];
  secondaryMuscleGroups?: CustomExerciseData["secondaryMuscleGroups"];
  classification?: CustomExerciseData["classification"];
  isCustom?: boolean;
  /**
   * THE PICK CARRIES ITS ROW ID NOW, which Phase 1 deliberately did not do
   * because nothing could store it yet. routine_exercises points at exactly
   * one of two tables and holds no name, so a routine has to record which row
   * a pick meant — and resolving that by name at save time would re-guess
   * something this list already knows for certain.
   *
   * Still absent for a custom exercise that has never reached the server (it
   * has no row id to carry), and the name fallback in services/routines covers
   * that as well as routines built before any of this existed.
   */
  exerciseId?: string;
  customExerciseId?: string;
}

export const ExerciseLibrarySheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onPick: (pick: ExercisePick) => void;
  alreadyAdded: string[];
}> = ({ open, onClose, onPick, alreadyAdded }) => {
  const { exerciseCatalog, exerciseCatalogError, customExercises, addCustomExercise } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<MuscleGroup | null>(null);
  const [customOpen, setCustomOpen] = useState(false);

  // THE CHIPS ARE THE CATALOG'S OWN MUSCLE GROUPS, built from what was
  // actually loaded rather than from a fixed list, so a chip can never offer a
  // filter that matches nothing. The enum holds 14; the 52 seeded movements
  // use 13 of them — `other` is unused — and a fixed list would have shown it.
  const categories = useMemo(() => {
    const present = new Set<MuscleGroup>();
    for (const e of exerciseCatalog) for (const mg of e.muscleGroups) present.add(mg);
    return [...present].sort((a, b) => MUSCLE_GROUP_LABEL[a].localeCompare(MUSCLE_GROUP_LABEL[b]));
  }, [exerciseCatalog]);

  // Primary movers only, never secondary — the same rule the Exercise
  // Database tab follows, per QA: "when filtering by muscle group, only go
  // with the main muscle group selection".
  const filtered = useMemo(() => {
    return exerciseCatalog.filter((e) => {
      const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category ? e.muscleGroups.includes(category) : true;
      return matchesQuery && matchesCategory;
    });
  }, [exerciseCatalog, query, category]);

  // V4 (QA 4.0): a custom exercise is saved to this searchable library on
  // creation — it's only added to the routine/session if explicitly tapped
  // below, same as any built-in exercise.
  const filteredCustom = useMemo(() => {
    return customExercises.filter((e) => {
      const matchesQuery = e.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category ? (e.muscleGroups ?? []).includes(category) : true;
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
            {categories.map((c) => {
              const Icon = muscleGroupIcon[c];
              return (
                <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
                  <Icon size={12} className="inline mr-1 -mt-0.5" /> {MUSCLE_GROUP_LABEL[c]}
                </Chip>
              );
            })}
          </div>

          <div className="space-y-1.5 max-h-[340px] overflow-y-auto no-scrollbar mb-4">
            {filteredCustom.map((e) => {
              const added = alreadyAdded.includes(e.name);
              return (
                <button
                  key={e.id ?? e.name}
                  onClick={() =>
                    !added &&
                    onPick({
                      // Named rather than spread: a hydrated custom exercise
                      // now carries a row id, and a pick is not where that
                      // belongs — routines still reference exercises by name.
                      name: e.name,
                      classification: e.classification,
                      muscleGroups: e.muscleGroups,
                      secondaryMuscleGroups: e.secondaryMuscleGroups,
                      isCustom: true,
                      // Undefined while this one is still queued for upload.
                      customExerciseId: isUuid(e.id ?? "") ? e.id : undefined,
                    })
                  }
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
                  key={e.id}
                  onClick={() => !added && onPick({ name: e.name, classification: e.classification, muscleGroups: e.muscleGroups, secondaryMuscleGroups: e.secondaryMuscleGroups, exerciseId: e.id })}
                  disabled={added}
                  className="tap w-full flex items-center justify-between rounded-2xl px-3.5 py-3 hover:bg-cream-soft text-left disabled:opacity-40"
                >
                  <span className="text-sm font-medium text-charcoal">{e.name}</span>
                  <span className="text-xs font-semibold text-primary">{added ? "Added" : "+ Add"}</span>
                </button>
              );
            })}
            {/* A FAILED LOAD IS NOT AN EMPTY LIBRARY, and it is worth saying
                even when the user's own movements are still listed: "no
                matches" would blame the search for a dropped connection, and
                a short list would quietly look like the whole catalog. */}
            {exerciseCatalogError && (
              <p className="text-center text-sm text-status-high py-4">{exerciseCatalogError}</p>
            )}
            {!exerciseCatalogError && filtered.length === 0 && filteredCustom.length === 0 && (
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
        onSave={(data) => void addCustomExercise(data)}
      />
    </>
  );
};
