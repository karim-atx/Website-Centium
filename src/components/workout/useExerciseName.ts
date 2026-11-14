import { useCallback, useMemo } from "react";
import { useApp } from "../../context/AppContext";
import { libraryNameSet, shownExerciseName } from "../../services/workout/exerciseNames";

/**
 * Batch D GH: `(name, isCustom) => shown name`, with "(custom)" after a custom
 * movement whose name a library movement also has (services/workout/exerciseNames).
 */
export function useExerciseName(): (name: string, isCustom: boolean | undefined) => string {
  const { exerciseCatalog } = useApp();
  const names = useMemo(() => libraryNameSet(exerciseCatalog), [exerciseCatalog]);
  return useCallback((name, isCustom) => shownExerciseName(name, !!isCustom, names), [names]);
}
