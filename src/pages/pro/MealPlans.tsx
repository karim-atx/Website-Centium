import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Recipes } from "../../components/pro/nutrition/Recipes";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useProSubtype } from "../../hooks/useProSubtype";
import { MEAL_PLAN_TABS, PRO_ROUTES, pickTab } from "../../components/pro/subtypeLanes";
import { MealPlansArea } from "../../components/pro/nutrition/MealPlansArea";
import { useIsWeb } from "../../components/web/useWebLayout";
import { MobileFrame } from "../../components/web/WebLayout";
import { t } from "../../i18n/core";

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
  const web = useIsWeb();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  if (tab !== undefined && tab !== area) return <Navigate to={`${PRO_ROUTES.mealPlans}/${area}`} replace />;
  if (lane !== "nutrition") return null;
  // The web area tabs (Plans | Journals | Recipes | Targets, 40, equal; WP-NU Meal Plans Web v3).
  const areaTabs = (
    <SegmentedTabs
      items={[
        { key: "plans", label: t("Plans") },
        { key: "journals", label: t("Journals") },
        { key: "recipes", label: t("Recipes") },
        { key: "targets", label: t("Targets") },
      ]}
      activeKey={area}
      onChange={(k) => navigate(`${PRO_ROUTES.mealPlans}/${k}`)}
      tabHeight={32}
      trackStyle={{ height: 40, boxSizing: "border-box", padding: 4, gap: 4, borderRadius: 14 }}
      tabRadius={10}
      labelSize={15}
    />
  );
  // WP-NU-MP.3 Recipes: its own web page with the area tabs.
  if (web && area === "recipes") return <Recipes onBack={() => navigate(`${PRO_ROUTES.mealPlans}/plans`)} webTabs={areaTabs} />;
  // Website viewport (WP-NU-MP.1): the Plans home is its own page (LibraryHome's web branch: the header with the
  // search, Filter and New meal plan, the area tabs, the boxes, Templates | Assigned).
  if (web && area === "plans" && !params.get("plan")) return <MealPlansArea lane={lane} area={area} webTabs={<div style={{ marginBottom: 16 }}>{areaTabs}</div>} />;
  // WP-NU-MP.7: the plan builder spans the page (its own web header; Week view by default); WP-NU-MP.2 / .4:
  // Journals and Targets are list-detail pages.
  if (web && ((area === "plans" && params.get("plan")) || area === "journals" || area === "targets")) return <MealPlansArea lane={lane} area={area} />;
  if (web)
    return (
      <MobileFrame>
        <MealPlansArea lane={lane} area={area} />
      </MobileFrame>
    );
  return <MealPlansArea lane={lane} area={area} />;
}
