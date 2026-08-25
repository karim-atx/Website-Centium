import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Chip } from "../../components/ui/Chip";
import RoutinesTab from "./RoutinesTab";
import ExerciseDatabaseTab from "./ExerciseDatabaseTab";
import HistoryTab from "./HistoryTab";
import MetricsTab from "./MetricsTab";

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
      <PageHeader title="Workout" />

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
    </div>
  );
}
