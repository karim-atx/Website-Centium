import { useNavigate, useParams, Navigate } from "react-router-dom";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { LIBRARY_TABS, PRO_ROUTES, pickTab } from "../../components/pro/subtypeLanes";
import WorkoutTemplateBuilderTab from "../professionals/WorkoutTemplateBuilderTab";
import MealPlanBuilderTab from "../professionals/MealPlanBuilderTab";

/**
 * Release 3 · Library (/app/pro/library/:tab, Full coaching only; TR1 / NU1).
 * Owned by W5, which replaces this file and deletes the two builder pages.
 * Until then the existing template library and meal-plan page are mounted on
 * their tabs, so neither is out of reach inside the PR.
 */
const LABEL: Record<(typeof LIBRARY_TABS)[number], string> = { programmes: "Programmes", "meal-plans": "Meal plans" };

export default function Library() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const current = pickTab(LIBRARY_TABS, tab);
  if (tab !== undefined && tab !== current) return <Navigate to={`${PRO_ROUTES.library}/${current}`} replace />;
  return (
    <div>
      <SegmentedTabs
        className="mb-4"
        items={LIBRARY_TABS.map((k) => ({ key: k, label: LABEL[k] }))}
        activeKey={current}
        onChange={(k) => navigate(`${PRO_ROUTES.library}/${k}`, { replace: true })}
      />
      {current === "programmes" ? <WorkoutTemplateBuilderTab /> : <MealPlanBuilderTab />}
    </div>
  );
}
