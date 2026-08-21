import React, { useState } from "react";
import { Card } from "../ui/Card";
import { Sparkline } from "./Sparkline";
import { healthMetrics } from "../../data/mockHealthData";
import { useApp } from "../../context/AppContext";
import { Pencil, Check } from "lucide-react";
import clsx from "clsx";

type Period = "daily" | "weekly" | "monthly" | "yearly";
const periods: { value: Period; label: string }[] = [
  { value: "daily", label: "D" },
  { value: "weekly", label: "W" },
  { value: "monthly", label: "M" },
  { value: "yearly", label: "Y" },
];

export const StepsPeriodCard: React.FC<{ onExpand?: () => void }> = ({ onExpand }) => {
  const { metricValues, updateMetricValue } = useApp();
  const [period, setPeriod] = useState<Period>("daily");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(metricValues.steps));
  const stepsMeta = healthMetrics.find((m) => m.type === "steps")!;
  const dailyHistory = stepsMeta.history.map((h) => h.value);
  const weeklyAvg = Math.round(dailyHistory.reduce((s, v) => s + v, 0) / dailyHistory.length);

  // Synthesized aggregate views for a prototype — a real integration would
  // pull these from Apple/Android Health rather than deriving them here.
  const weeklyTotals = Array.from({ length: 6 }).map((_, i) =>
    Math.round(weeklyAvg * 7 * (0.85 + i * 0.03))
  );
  const monthlyTotals = Array.from({ length: 6 }).map((_, i) =>
    Math.round(weeklyAvg * 30 * (0.8 + i * 0.04))
  );
  const yearlyTotals = Array.from({ length: 4 }).map((_, i) =>
    Math.round(weeklyAvg * 365 * (0.75 + i * 0.08))
  );

  const view = {
    daily: { values: dailyHistory, current: metricValues.steps, avgLabel: `Weekly avg ${weeklyAvg.toLocaleString()}`, unitLabel: "today" },
    weekly: { values: weeklyTotals, current: weeklyTotals[weeklyTotals.length - 1], avgLabel: `6-week avg ${Math.round(weeklyTotals.reduce((a, b) => a + b, 0) / weeklyTotals.length).toLocaleString()}`, unitLabel: "this week" },
    monthly: { values: monthlyTotals, current: monthlyTotals[monthlyTotals.length - 1], avgLabel: `6-month avg ${Math.round(monthlyTotals.reduce((a, b) => a + b, 0) / monthlyTotals.length).toLocaleString()}`, unitLabel: "this month" },
    yearly: { values: yearlyTotals, current: yearlyTotals[yearlyTotals.length - 1], avgLabel: `4-year avg ${Math.round(yearlyTotals.reduce((a, b) => a + b, 0) / yearlyTotals.length).toLocaleString()}`, unitLabel: "this year" },
  }[period];

  return (
    <Card
      className="relative"
      interactive={!!onExpand}
      onClick={() => !editing && onExpand?.()}
    >
      {period === "daily" &&
        (editing ? (
          <div className="absolute top-3 right-3 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value.replace(/\D/g, ""))}
              className="w-16 rounded-lg border border-sohati/40 bg-cream-card px-1.5 py-0.5 text-xs text-charcoal focus:outline-none"
            />
            <button
              onClick={() => {
                updateMetricValue("steps", Number(draft) || metricValues.steps);
                setEditing(false);
              }}
              className="tap w-6 h-6 rounded-full bg-sohati text-white flex items-center justify-center"
            >
              <Check size={11} strokeWidth={3} />
            </button>
          </div>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDraft(String(metricValues.steps));
              setEditing(true);
            }}
            aria-label="Edit steps"
            className="tap absolute top-3 right-3 w-6 h-6 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint hover:text-charcoal"
          >
            <Pencil size={11} />
          </button>
        ))}

      <p className="text-xs font-semibold text-charcoal-soft mb-2">Steps</p>
      <div className="flex bg-cream-soft rounded-full p-0.5 mb-3 w-fit gap-0.5" onClick={(e) => e.stopPropagation()}>
        {periods.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={clsx(
              "tap w-6 h-6 text-[10px] font-bold rounded-full leading-none",
              period === p.value ? "bg-sohati text-white" : "text-charcoal-faint"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <p className="text-2xl font-bold text-charcoal leading-none">{view.current.toLocaleString()}</p>
      <p className="text-[11px] text-charcoal-faint mt-1">{view.unitLabel}</p>
      <p className="text-[11px] text-sohati-dark font-semibold mt-1 mb-2">{view.avgLabel}</p>
      <div className="w-full overflow-hidden">
        <Sparkline values={view.values} color="#4C8FD1" width={130} height={36} />
      </div>
    </Card>
  );
};
