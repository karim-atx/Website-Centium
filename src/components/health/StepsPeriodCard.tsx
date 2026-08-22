import React from "react";
import { Card } from "../ui/Card";
import { Sparkline } from "./Sparkline";
import { healthMetrics } from "../../data/mockHealthData";
import { useApp } from "../../context/AppContext";
import { Lock } from "lucide-react";

// V4: the D/W/M/Y period toggle and the edit affordance both moved into the
// detail sheet — steps are now auto-sourced from Apple/Android Health and
// this compact card is "minimalistic" per QA (today's count + weekly avg).
export const StepsPeriodCard: React.FC<{ onExpand?: () => void }> = ({ onExpand }) => {
  const { metricValues } = useApp();
  const stepsMeta = healthMetrics.find((m) => m.type === "steps")!;
  const dailyHistory = stepsMeta.history.map((h) => h.value);
  const weeklyAvg = Math.round(dailyHistory.reduce((s, v) => s + v, 0) / dailyHistory.length);

  return (
    <Card className="relative" interactive={!!onExpand} onClick={() => onExpand?.()}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-charcoal-soft">Steps</p>
        <Lock size={10} className="text-charcoal-faint" />
      </div>
      <p className="text-2xl font-bold text-charcoal leading-none">{metricValues.steps.toLocaleString()}</p>
      <p className="text-[11px] text-charcoal-faint mt-1">today</p>
      <p className="text-[11px] text-sohati-dark font-semibold mt-1 mb-2">
        Weekly avg {weeklyAvg.toLocaleString()}
      </p>
      <div className="w-full overflow-hidden">
        <Sparkline values={dailyHistory} color="#4C8FD1" width={130} height={36} />
      </div>
    </Card>
  );
};
