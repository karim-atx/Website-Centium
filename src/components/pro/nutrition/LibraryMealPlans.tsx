import React from "react";
import { useSearchParams } from "react-router-dom";
import { useProSubtype } from "../../../hooks/useProSubtype";
import { MealPlansArea } from "./MealPlansArea";
import { isNuArea } from "./nav";

/**
 * Release 3 · NU1 v6 Full coaching "Library › Meal plans": everything below
 * the Library title and the Programmes / Meal plans tabs (Library.tsx renders
 * those and mounts this). The inner screens (builder, journals, recipes,
 * targets) are chosen by the query (?area=, ?plan=, ?client=, ?day=; see
 * nav.ts). Full coaching only: another lane never reaches the Library route.
 */
export const LibraryMealPlans: React.FC = () => {
  const { lane } = useProSubtype();
  const [params] = useSearchParams();
  const a = params.get("area");
  if (lane !== "full_coaching") return null;
  return <MealPlansArea lane={lane} area={isNuArea(a) ? a : "plans"} />;
};
