import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Recipes } from "../../components/pro/nutrition/Recipes";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useProSubtype } from "../../hooks/useProSubtype";
import { MEAL_PLAN_TABS, PRO_ROUTES, pickTab } from "../../components/pro/subtypeLanes";
import { MealPlansArea } from "../../components/pro/nutrition/MealPlansArea";
import { useIsWeb } from "../../components/web/useWebLayout";
import { MobileFrame } from "../../components/web/WebLayout";
import { ProPageBodyWeb, ProPageHeaderWeb } from "../../components/pro/web/ProPageWeb";
import { ClientTabBodyWeb } from "../../components/pro/web/ClientPageWeb";
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
  // WP-NU-MP.3 Recipes: its own web page with the area tabs (Plans | Journals | Recipes | Targets, 40, equal).
  if (web && area === "recipes")
    return (
      <Recipes
        onBack={() => navigate(`${PRO_ROUTES.mealPlans}/plans`)}
        webTabs={
          <SegmentedTabs
            items={[
              { key: "plans", label: t("Plans") },
              { key: "journals", label: t("Journals") },
              { key: "recipes", label: t("Recipes") },
              { key: "targets", label: t("Targets") },
            ]}
            activeKey="recipes"
            onChange={(k) => navigate(`${PRO_ROUTES.mealPlans}/${k}`)}
            tabHeight={32}
            trackStyle={{ height: 40, boxSizing: "border-box", padding: 4, gap: 4, borderRadius: 14 }}
            tabRadius={10}
            labelSize={15}
          />
        }
      />
    );
  // Website viewport (WP-NU-MP.1): the Plans home gets the page header and its sections across the page; the
  // builder, journals, recipes and targets keep their mobile screen in the centred column until they are built.
  if (web && area === "plans" && !params.get("plan"))
    return (
      <div>
        <ProPageHeaderWeb title={t("Meal plans")} />
        <ProPageBodyWeb>
          <ClientTabBodyWeb columns={2}>
            <MealPlansArea lane={lane} area={area} />
          </ClientTabBodyWeb>
        </ProPageBodyWeb>
      </div>
    );
  if (web)
    return (
      <MobileFrame>
        <MealPlansArea lane={lane} area={area} />
      </MobileFrame>
    );
  return <MealPlansArea lane={lane} area={area} />;
}
