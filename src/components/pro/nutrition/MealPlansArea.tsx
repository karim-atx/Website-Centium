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
import { useNutritionOverview } from "./useNutritionOverview";
import { useWebLayout } from "../../web/useWebLayout";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { ProPageBodyWeb, ProPageHeaderWeb } from "../web/ProPageWeb";
import { t } from "../../../i18n/core";

/**
 * Release 3 · W5 the Meal plans area, the same for Nutrition's navbar tab
 * (pages/pro/MealPlans.tsx) and Full coaching's Library › Meal plans
 * (LibraryMealPlans): which NU screen shows is the area and the query (see
 * nav.ts). Hidden by lane is the routes' job (Clinical overview never
 * reaches here: ProRoutes / LaneSlot); this renders only for Full coaching
 * and Nutrition.
 */
/** webTabs: the tabs the web Plans page shows under its header (WP-NU-MP.1, WP-LI.2). */
export const MealPlansArea: React.FC<{ lane: ProLane; area: NuArea; webTabs?: React.ReactNode }> = ({ lane, area, webTabs }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { authUserId } = useApp();
  const plan = params.get("plan");
  const client = params.get("client");
  const day = params.get("day");
  const [assign, setAssign] = useState<{ template: MealPlan; assignments: Assignment[] } | null>(null);
  const { web } = useWebLayout();

  const go = (a: NuArea, p: NuParams = {}, replace = false) => navigate(mealPlansHref(lane, a, p), { replace });
  // Back: the previous screen when there is one in this tab, else the area's list.
  const back = (fallback: () => void) => () => (location.key !== "default" ? navigate(-1) : fallback());

  const openAssign = async (template: MealPlan) => {
    const r = authUserId ? await fetchAssignments(authUserId) : null;
    setAssign({ template, assignments: r && r.ok ? r.data : [] });
  };

  let screen: React.ReactNode;
  if (web && !plan && (area === "journals" || area === "targets")) {
    screen = <NuListDetailWeb lane={lane} area={area} client={client} day={day} go={go} />;
  } else if (plan) {
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
    screen = <LibraryHome lane={lane} onArea={(a) => go(a)} onOpenPlan={(id) => go("plans", { plan: id })} webTabs={webTabs} />;
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

/**
 * Website viewport, WP-NU-MP.2 Journals and WP-NU-MP.4 Targets: list-detail
 * pages under the page header and the area tabs (Plans | Journals | Recipes |
 * Targets, 40, equal). Journals: the queue 5 + the entry 7; Targets: the list
 * 4 + the editor 8 (8 columns on the rail: 3 + 5). The first client opens by
 * default and the open one is tinted. Mobile keeps each as its own screen.
 */
const NuListDetailWeb: React.FC<{ lane: ProLane; area: "journals" | "targets"; client: string | null; day: string | null; go: (a: NuArea, p?: NuParams, replace?: boolean) => void }> = ({ lane, area, client, day, go }) => {
  const { rail } = useWebLayout();
  const o = useNutritionOverview(lane);
  const journals = area === "journals";
  const first = journals ? o.waiting[0] ?? o.reviewed[0] ?? null : o.clients[0] ?? null;
  const open = client ?? first?.clientId ?? null;
  const openDay = client ? day : journals && first && "lastDay" in first ? first.lastDay : null;
  // WP-NU Meal Plans Web v3 ldCols / tgCols: 4fr | 8fr (3fr | 5fr on the rail) for both.
  const spans = rail ? [3, 5] : [4, 8];
  return (
    <div>
      <ProPageHeaderWeb title={lane === "nutrition" ? t("Meal plans") : t("Library")} />
      <ProPageBodyWeb>
        <SegmentedTabs
          className="mb-6"
          items={[
            { key: "plans", label: t("Plans") },
            { key: "journals", label: t("Journals") },
            { key: "recipes", label: t("Recipes") },
            { key: "targets", label: t("Targets") },
          ]}
          activeKey={area}
          onChange={(k) => go(k as NuArea, {}, true)}
          tabHeight={32}
          trackStyle={{ height: 40, boxSizing: "border-box", padding: 4, gap: 4, borderRadius: 14 }}
          tabRadius={10}
          labelSize={15}
        />
        <div className="grid items-start" style={{ gridTemplateColumns: `repeat(${rail ? 8 : 12},minmax(0,1fr))`, columnGap: 24 }}>
          <div className="min-w-0" style={{ gridColumn: `span ${spans[0]}` }}>
            {journals ? (
              <JournalQueue lane={lane} onBack={() => go("plans", {}, true)} onOpen={(c, d) => go("journals", { client: c, day: d }, true)} pane={{ selected: open }} />
            ) : (
              <TargetsList lane={lane} onBack={() => go("plans", {}, true)} onOpen={(c) => go("targets", { client: c }, true)} pane={{ selected: open }} />
            )}
          </div>
          <div className="min-w-0" style={{ gridColumn: `span ${spans[1]}` }}>
            {open &&
              (journals ? (
                <JournalEntryView key={open} lane={lane} clientId={open} day={openDay} onBack={() => go("journals", {}, true)} onDay={(d) => go("journals", { client: open, day: d }, true)} pane />
              ) : (
                <TargetsEditor key={open} lane={lane} clientId={open} onBack={() => go("targets", {}, true)} pane />
              ))}
          </div>
        </div>
      </ProPageBodyWeb>
    </div>
  );
};
