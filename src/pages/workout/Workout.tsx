import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Chip } from "../../components/ui/Chip";
import RoutinesTab from "./RoutinesTab";
import HistoryTab from "./HistoryTab";
import MetricsTab from "./MetricsTab";

type Tab = "routines" | "history" | "metrics";

export default function Workout() {
  const [tab, setTab] = useState<Tab>("routines");

  return (
    <div>
      <PageHeader title="Workout" />

      <div className="flex gap-2 mb-5 animate-fade-slide-up">
        {(["routines", "history", "metrics"] as Tab[]).map((t) => (
          <Chip key={t} active={tab === t} onClick={() => setTab(t)}>
            {t === "routines" ? "Routines" : t === "history" ? "History" : "Metrics"}
          </Chip>
        ))}
      </div>

      {tab === "routines" && <RoutinesTab />}
      {tab === "history" && <HistoryTab />}
      {tab === "metrics" && <MetricsTab />}
    </div>
  );
}
