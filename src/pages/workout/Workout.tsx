import { useState } from "react";
import { SegmentedTabs, type SegmentedTabItem } from "../../components/ui/SegmentedTabs";
import RoutinesTab from "./RoutinesTab";
import ExerciseDatabaseTab from "./ExerciseDatabaseTab";
import HistoryTab from "./HistoryTab";
import MetricsTab from "./MetricsTab";
import { PersonalRecordReviewSheet } from "../../components/workout/PersonalRecordReviewSheet";

type Tab = "routines" | "database" | "history" | "metrics";

const tabLabels: Record<Tab, string> = {
  routines: "Routines",
  database: "Library",
  history: "History",
  metrics: "Metrics",
};

// Mobile handoff item 11: the pill-tab row is replaced by the shared
// SegmentedTabs bar everywhere it appears (Food and Workout). The handoff's
// README gives literal flex-weights for Food's three tabs but not Workout's
// four beyond "fill the track, no horizontal scroll at 390px" — left
// unweighted (equal share) rather than guessing decimals that weren't
// specified.
const workoutTabs: SegmentedTabItem[] = (["routines", "database", "history", "metrics"] as Tab[]).map((t) => ({
  key: t,
  label: tabLabels[t],
}));

export default function Workout() {
  const [tab, setTab] = useState<Tab>("routines");

  return (
    <div>
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. */}
      <p className="mb-3 text-[19px] font-bold tracking-[-0.03em] text-charcoal">Workout</p>

      <SegmentedTabs
        items={workoutTabs}
        activeKey={tab}
        onChange={(key) => setTab(key as Tab)}
        className="mb-5 animate-fade-slide-up"
      />

      {tab === "routines" && <RoutinesTab />}
      {tab === "database" && <ExerciseDatabaseTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "metrics" && <MetricsTab />}

      {/* One-time, and rendered here rather than on Home because this is where
          personal records live and are edited. It shows itself only when this
          device actually has old local records to review. */}
      <PersonalRecordReviewSheet />
    </div>
  );
}
