import { useState } from "react";
import { Chip } from "../../components/ui/Chip";
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

export default function Workout() {
  const [tab, setTab] = useState<Tab>("routines");

  return (
    <div>
      {/* Iteration 6 "Team": compact 19px title in place of PageHeader's
          27px default — see the identical note in Food.tsx. */}
      <p className="mb-3 text-[19px] font-bold tracking-[-0.03em] text-charcoal">Workout</p>

      <div className="flex gap-2 mb-5 animate-fade-slide-up overflow-x-auto no-scrollbar">
        {(["routines", "database", "history", "metrics"] as Tab[]).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {tabLabels[t]}
          </Chip>
        ))}
      </div>

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
