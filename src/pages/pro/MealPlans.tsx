import { Navigate, useParams } from "react-router-dom";
import { useProSubtype } from "../../hooks/useProSubtype";
import { MEAL_PLAN_TABS, PRO_ROUTES, pickTab } from "../../components/pro/subtypeLanes";
import { MealPlansArea } from "../../components/pro/nutrition/MealPlansArea";

/**
 * Release 3 · Meal plans, Nutrition's navbar tab (/app/pro/meal-plans/:tab;
 * NU1 v6 "Meal plans library" and the screens it opens). The :tab is the
 * area (MEAL_PLAN_TABS): plans (the library), journals (NU5 / NU6), recipes
 * (NU9), targets (NU8); the NU1 boxes open the last three. Inner screens
 * take the query (?plan=, ?client=, ?day=). Full coaching reaches the same
 * area inside Library (LibraryMealPlans); ProRoutes' LaneSlot sends other
 * lanes away before this renders.
 */
export default function MealPlans() {
  const { tab } = useParams();
  const { lane } = useProSubtype();
  const area = pickTab(MEAL_PLAN_TABS, tab);
  if (tab !== undefined && tab !== area) return <Navigate to={`${PRO_ROUTES.mealPlans}/${area}`} replace />;
  if (lane !== "nutrition") return null;
  return <MealPlansArea lane={lane} area={area} />;
}
