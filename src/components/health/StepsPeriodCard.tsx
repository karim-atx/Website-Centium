import React from "react";
import { Card } from "../ui/Card";
import { healthMetrics } from "../../data/mockHealthData";
import { useApp } from "../../context/AppContext";
import { Footprints } from "lucide-react";

// V4: the D/W/M/Y period toggle and the edit affordance both moved into the
// detail sheet — steps are now auto-sourced from Apple/Android Health and
// this compact card is "minimalistic" per QA (today's count + weekly avg).
// Design refinement §6.3: "Steps card gains a 7-bar sparkline (26px tall,
// 2px radius, #DCEAF8 with the current day #3A76B0)."
export const StepsPeriodCard: React.FC<{ onExpand?: () => void }> = ({ onExpand }) => {
  const { metricValues } = useApp();
  const stepsMeta = healthMetrics.find((m) => m.type === "steps")!;
  const dailyHistory = stepsMeta.history.map((h) => h.value);
  const weeklyAvg = Math.round(dailyHistory.reduce((s, v) => s + v, 0) / dailyHistory.length);
  const max = Math.max(...dailyHistory, 1);

  return (
    <Card className="relative" interactive={!!onExpand} onClick={() => onExpand?.()}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-semibold text-charcoal-soft">Steps</p>
        <Footprints size={11} className="text-charcoal-tertiary" />
      </div>
      <p className="text-[24px] font-extrabold text-charcoal leading-none tracking-[-0.03em] tabular-nums">
        {metricValues.steps.toLocaleString()}
      </p>
      <p className="text-[11px] text-charcoal-faint mt-1">today</p>
      <p className="text-[11px] text-primary-dark font-semibold mt-1 mb-2">
        Weekly avg {weeklyAvg.toLocaleString()}
      </p>
      <div className="flex items-end gap-1" style={{ height: 26 }}>
        {dailyHistory.map((v, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[2px] rounded-b-[2px]"
            style={{
              height: `${Math.max((v / max) * 100, 12)}%`,
              background: i === dailyHistory.length - 1 ? "#3A76B0" : "#DCEAF8",
            }}
          />
        ))}
      </div>
    </Card>
  );
};
