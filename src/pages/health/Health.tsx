import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Sparkline } from "../../components/health/Sparkline";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { healthMetrics, bloodPanel } from "../../data/mockHealthData";
import { useApp } from "../../context/AppContext";
import { ArrowDown, ArrowUp, Plus, Droplet, Flame, ChevronDown } from "lucide-react";
import clsx from "clsx";

const statusColor: Record<string, string> = {
  low: "text-sky bg-sky-pale",
  normal: "text-sohati-dark bg-sohati-pale",
  high: "text-ember-dark bg-ember-pale",
};

export default function Health() {
  const { water } = useApp();
  const [metricOpen, setMetricOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  const weight = healthMetrics.find((m) => m.type === "weight")!;
  const bodyFat = healthMetrics.find((m) => m.type === "bodyFat")!;
  const steps = healthMetrics.find((m) => m.type === "steps")!;
  const sleep = healthMetrics.find((m) => m.type === "sleep")!;

  const heightM = 1.78;
  const bmi = (weight.current / (heightM * heightM)).toFixed(1);

  const trendCard = (
    label: string,
    value: string,
    trendLabel: string,
    positive: boolean,
    good: boolean,
    history: number[],
    color: string
  ) => (
    <Card className="animate-fade-slide-up">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-charcoal-soft mb-1">{label}</p>
          <p className="text-xl font-bold text-charcoal">{value}</p>
        </div>
        <Sparkline values={history} color={color} width={72} height={30} />
      </div>
      <span
        className={clsx(
          "inline-flex items-center gap-0.5 text-xs font-semibold rounded-full px-2 py-0.5",
          good ? "text-sohati-dark bg-sohati-pale" : "text-ember-dark bg-ember-pale"
        )}
      >
        {positive ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
        {trendLabel}
      </span>
    </Card>
  );

  return (
    <div>
      <PageHeader
        title="Health"
        right={
          <button
            onClick={() => setMetricOpen(true)}
            className="tap w-10 h-10 rounded-full bg-sohati text-white flex items-center justify-center shadow-soft"
          >
            <Plus size={18} />
          </button>
        }
      />

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Body</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {trendCard("Weight", `${weight.current} kg`, `${Math.abs(weight.trend)} kg this week`, weight.trend >= 0, weight.trend < 0, weight.history.map((h) => h.value), "#1B6B52")}
        {trendCard("Body Fat", `${bodyFat.current}%`, `${Math.abs(bodyFat.trend)}% this week`, bodyFat.trend >= 0, bodyFat.trend < 0, bodyFat.history.map((h) => h.value), "#9C4F7C")}
        <Card className="col-span-2 animate-fade-slide-up flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-charcoal-soft mb-1">BMI</p>
            <p className="text-xl font-bold text-charcoal">{bmi}</p>
          </div>
          <span className="text-xs text-charcoal-faint max-w-[55%] text-right">
            Body Mass Index — a general prototype estimate, not a diagnosis.
          </span>
        </Card>
      </div>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Activity</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {trendCard("Steps", steps.current.toLocaleString(), `+${steps.trend} vs avg`, true, true, steps.history.map((h) => h.value), "#4C8FD1")}
        <Card className="animate-fade-slide-up">
          <p className="text-xs font-semibold text-charcoal-soft mb-1">Calories burned</p>
          <p className="text-xl font-bold text-charcoal mb-2">2,340</p>
          <span className="text-xs text-charcoal-faint">Estimated, incl. workouts</span>
        </Card>
      </div>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Recovery</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {trendCard("Sleep", `${sleep.current}h`, "+0.3h vs avg", true, true, sleep.history.map((h) => h.value), "#9C4F7C")}
        <Card interactive className="animate-fade-slide-up flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-charcoal-soft mb-1">Water</p>
            <p className="text-xl font-bold text-charcoal">{(water / 1000).toFixed(1)}L</p>
          </div>
          <Droplet size={20} className="text-sky" />
        </Card>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Biomarkers</p>
        <span className="text-xs text-charcoal-faint">{bloodPanel.date}</span>
      </div>
      <Card padded={false} className="mb-3 divide-y divide-charcoal/[0.04] animate-fade-slide-up">
        {bloodPanel.markers.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-charcoal">{m.name}</p>
              <p className="text-[11px] text-charcoal-faint">Range: {m.range} {m.unit}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-bold text-charcoal">
                {m.value} <span className="text-xs font-normal text-charcoal-faint">{m.unit}</span>
              </p>
              <span className={clsx("text-[10px] font-bold uppercase rounded-full px-2 py-0.5", statusColor[m.status])}>
                {m.status}
              </span>
            </div>
          </div>
        ))}
      </Card>

      <button
        onClick={() => setHistoryOpen((v) => !v)}
        className="tap w-full flex items-center justify-center gap-1.5 text-sm font-semibold text-sohati py-2 mb-6"
      >
        View History <ChevronDown size={15} className={clsx("transition-transform", historyOpen && "rotate-180")} />
      </button>

      {historyOpen && (
        <div className="grid grid-cols-2 gap-3 mb-6 animate-fade-slide-up">
          {bloodPanel.markers.map((m) => (
            <Card key={m.id}>
              <p className="text-xs font-semibold text-charcoal-soft mb-1">{m.name}</p>
              <Sparkline values={m.history.map((h) => h.value)} color="#9C4F7C" width={100} height={32} />
              <p className="text-[11px] text-charcoal-faint mt-1">Last 3 panels</p>
            </Card>
          ))}
        </div>
      )}

      <p className="text-[11px] text-charcoal-faint text-center mb-4 flex items-center justify-center gap-1">
        <Flame size={11} /> This is health-data tracking, not a diagnosis. Always consult a professional.
      </p>

      <AddMetricSheet open={metricOpen} onClose={() => setMetricOpen(false)} />
    </div>
  );
}
