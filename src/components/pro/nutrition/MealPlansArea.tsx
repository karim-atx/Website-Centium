import React, { useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { fetchAssignments, type Assignment, type MealPlan } from "../../../services/pro/nutrition";
import type { ProLane } from "../subtypeLanes";
import { mealPlansHref, type NuArea, type NuParams } from "./nav";
import { LibraryHome } from "./LibraryHome";
import { PlanBuilder } from "./PlanBuilder";
import { AssignSheet } from "./AssignSheet";
import { JournalEntryView, JournalQueue } from "./Journals";
import { Recipes } from "./Recipes";
import { TargetsEditor, TargetsList } from "./Targets";

/**
 * Release 3 · W5 the Meal plans area, the same for Nutrition's navbar tab
 * (pages/pro/MealPlans.tsx) and Full coaching's Library › Meal plans
 * (LibraryMealPlans): which NU screen shows is the area and the query (see
 * nav.ts). Hidden by lane is the routes' job (Clinical overview never
 * reaches here: ProRoutes / LaneSlot); this renders only for Full coaching
 * and Nutrition.
 */
export const MealPlansArea: React.FC<{ lane: ProLane; area: NuArea }> = ({ lane, area }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { authUserId } = useApp();
  const plan = params.get("plan");
  const client = params.get("client");
  const day = params.get("day");
  const [assign, setAssign] = useState<{ template: MealPlan; assignments: Assignment[] } | null>(null);

  const go = (a: NuArea, p: NuParams = {}, replace = false) => navigate(mealPlansHref(lane, a, p), { replace });
  // Back: the previous screen when there is one in this tab, else the area's list.
  const back = (fallback: () => void) => () => (location.key !== "default" ? navigate(-1) : fallback());

  const openAssign = async (template: MealPlan) => {
    const r = authUserId ? await fetchAssignments(authUserId) : null;
    setAssign({ template, assignments: r && r.ok ? r.data : [] });
  };

  let screen: React.ReactNode;
  if (plan) {
    screen = <PlanBuilder key={plan} planId={plan} lane={lane} onBack={back(() => go("plans", {}, true))} onAssign={(p) => void openAssign(p)} onDeleted={() => go("plans", {}, true)} />;
  } else if (area === "journals") {
    screen = client ? (
      <JournalEntryView lane={lane} clientId={client} day={day} onBack={back(() => go("journals", {}, true))} onDay={(d) => go("journals", { client, day: d }, true)} />
    ) : (
      <JournalQueue lane={lane} onBack={back(() => go("plans", {}, true))} onOpen={(c, d) => go("journals", { client: c, day: d })} />
    );
  } else if (area === "recipes") {
    screen = <Recipes onBack={back(() => go("plans", {}, true))} />;
  } else if (area === "targets") {
    screen = client ? (
      <TargetsEditor key={client} lane={lane} clientId={client} onBack={back(() => go("targets", {}, true))} />
    ) : (
      <TargetsList lane={lane} onBack={back(() => go("plans", {}, true))} onOpen={(c) => go("targets", { client: c })} />
    );
  } else {
    screen = <LibraryHome lane={lane} onArea={(a) => go(a)} onOpenPlan={(id) => go("plans", { plan: id })} />;
  }

  return (
    <>
      {screen}
      <AssignSheet
        open={!!assign}
        onClose={() => setAssign(null)}
        template={assign?.template ?? null}
        lane={lane}
        assignments={assign?.assignments ?? []}
        onAssigned={() => undefined}
      />
    </>
  );
};
