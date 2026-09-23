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

// Master handover, CentiumTabFrame `tabsWorkout`: the segmented bar with the
// frame's own flex-weights (1 / 0.94 / 0.96 / 0.95) and idle label ink.
const tabWeights: Record<Tab, number> = { routines: 1, database: 0.94, history: 0.96, metrics: 0.95 };
const workoutTabs: SegmentedTabItem[] = (["routines", "database", "history", "metrics"] as Tab[]).map((t) => ({
  key: t,
  label: tabLabels[t],
  weight: tabWeights[t],
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
        idleInk="#5B5349"
        className="mb-4 animate-fade-slide-up"
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
