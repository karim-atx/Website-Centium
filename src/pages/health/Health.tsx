import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { BiomarkerHistoryChart } from "../../components/health/BiomarkerHistoryChart";
import { StepsPeriodCard } from "../../components/health/StepsPeriodCard";
import { BiomarkerCaptureFlow } from "../../components/health/BiomarkerCaptureFlow";
import { ShareBiomarkerSheet } from "../../components/health/ShareBiomarkerSheet";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { MetricDetailSheet } from "../../components/health/MetricDetailSheet";
import { WaterDetailSheet } from "../../components/health/WaterDetailSheet";
import { healthMetrics } from "../../data/mockHealthData";
import { useApp } from "../../context/AppContext";
import { ArrowDown, ArrowUp, Plus, Droplet, Flame, ChevronDown, Camera, Share2, Lock } from "lucide-react";
import clsx from "clsx";
import type { BloodMarker, HealthMetric } from "../../types";

// Kept as explicit warning/normal hues (independent of the brand
// purple/sage tokens) so an out-of-range "HIGH" reading still reads as a
// warning rather than blending into the rebrand's decorative palette.
const statusColor: Record<string, string> = {
  low: "text-sky bg-sky-pale",
  normal: "text-[#3F9165] bg-[#E3F3E9]",
  high: "text-[#C0392B] bg-[#FBE7E4]",
};

export default function Health() {
  const { water, waterGoalMl, metricValues, bloodMarkers } = useApp();
  const [metricOpen, setMetricOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [shareMarker, setShareMarker] = useState<BloodMarker | null>(null);
  const [detailMetric, setDetailMetric] = useState<{ metric: HealthMetric; current: number } | null>(null);

  const sleepMeta = healthMetrics.find((m) => m.type === "sleep")!;
  const weightMeta = healthMetrics.find((m) => m.type === "weight")!;
  const bodyFatMeta = healthMetrics.find((m) => m.type === "bodyFat")!;
  const caloriesMeta = healthMetrics.find((m) => m.type === "caloriesBurned")!;

  const heightM = 1.78;
  const bmi = (metricValues.weight / (heightM * heightM)).toFixed(1);

  const openDetail = (metric: HealthMetric, current: number) => setDetailMetric({ metric, current });

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
        <Card
          interactive
          className="relative"
          onClick={() => openDetail(weightMeta, metricValues.weight)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-charcoal-soft">Weight</p>
            <Lock size={10} className="text-charcoal-faint" />
          </div>
          <p className="text-xl font-bold text-charcoal">
            {metricValues.weight} <span className="text-sm font-normal text-charcoal-faint">kg</span>
          </p>
          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2 py-0.5">
            <ArrowDown size={10} /> 0.6 kg this week
          </span>
        </Card>
        <Card
          interactive
          className="relative"
          onClick={() => openDetail(bodyFatMeta, metricValues.bodyFat)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-charcoal-soft">Body Fat</p>
            <Lock size={10} className="text-charcoal-faint" />
          </div>
          <p className="text-xl font-bold text-charcoal">
            {metricValues.bodyFat} <span className="text-sm font-normal text-charcoal-faint">%</span>
          </p>
          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2 py-0.5">
            <ArrowDown size={10} /> 0.4% this week
          </span>
        </Card>
        <Card className="col-span-2 flex items-center justify-between">
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
        <StepsPeriodCard onExpand={() => openDetail(healthMetrics.find((m) => m.type === "steps")!, metricValues.steps)} />
        <Card
          interactive
          className="relative"
          onClick={() => openDetail(caloriesMeta, metricValues.caloriesBurned)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-charcoal-soft">Calories burned</p>
            <Lock size={10} className="text-charcoal-faint" />
          </div>
          <p className="text-xl font-bold text-charcoal">{metricValues.caloriesBurned.toLocaleString()}</p>
          <p className="text-xs text-charcoal-faint mt-2">Estimated, incl. workouts</p>
        </Card>
      </div>

      <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2.5">Recovery</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card
          interactive
          className="relative"
          onClick={() => openDetail(sleepMeta, metricValues.sleepHours)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-charcoal-soft">Sleep</p>
            <Lock size={10} className="text-charcoal-faint" />
          </div>
          <p className="text-xl font-bold text-charcoal">
            {Math.floor(metricValues.sleepHours)}h {Math.round((metricValues.sleepHours % 1) * 60)}m
          </p>
          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-sohati-dark bg-sohati-pale rounded-full px-2 py-0.5">
            <ArrowUp size={10} /> +0.3h vs avg
          </span>
        </Card>
        <Card interactive className="relative" onClick={() => setWaterOpen(true)}>
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-semibold text-charcoal-soft">Water</p>
            <Droplet size={11} className="text-sky" />
          </div>
          <p className="text-xl font-bold text-charcoal">{(water / 1000).toFixed(1)}L</p>
          <p className="text-xs text-charcoal-faint mt-2">of {(waterGoalMl / 1000).toFixed(1)}L goal</p>
        </Card>
      </div>

      <div className="flex items-center justify-between mb-2.5">
        <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">Biomarkers</p>
        <button
          onClick={() => setScanOpen(true)}
          className="tap flex items-center gap-1.5 text-xs font-semibold text-sohati"
        >
          <Camera size={13} /> Scan result
        </button>
      </div>
      <Card padded={false} className="mb-3 divide-y divide-charcoal/[0.04]">
        {bloodMarkers.map((m) => (
          <div key={m.id} className="flex items-center justify-between px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold text-charcoal">{m.name}</p>
              <p className="text-[11px] text-charcoal-faint">Range: {m.range} {m.unit}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold text-charcoal">
                  {m.value} <span className="text-xs font-normal text-charcoal-faint">{m.unit}</span>
                </p>
                <span className={clsx("text-[10px] font-bold uppercase rounded-full px-2 py-0.5", statusColor[m.status])}>
                  {m.status}
                </span>
              </div>
              <button
                onClick={() => setShareMarker(m)}
                className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint shrink-0"
                aria-label={`Share ${m.name}`}
              >
                <Share2 size={12} />
              </button>
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
        <div className="space-y-3 mb-6 animate-fade-slide-up">
          {bloodMarkers.map((m) => {
            // Color-coded by direction relative to whether "up" is good for
            // this marker: stable (flat) is neutral, movement toward normal
            // is green, movement away from normal (or already abnormal and
            // moving further) is red. Uses explicit green/red, independent
            // of the brand purple/sage tokens, so the meaning stays clear.
            const last = m.history[m.history.length - 1]?.value ?? 0;
            const prev = m.history[m.history.length - 2]?.value ?? last;
            const delta = last - prev;
            const GOOD = "#3F9165";
            const BAD = "#C0392B";
            const NEUTRAL = "#8B8378";
            const trendColor =
              delta === 0
                ? NEUTRAL
                : m.status === "high"
                ? delta > 0
                  ? BAD
                  : GOOD
                : m.status === "low"
                ? delta < 0
                  ? BAD
                  : GOOD
                : GOOD;
            const trendLabel = delta === 0 ? "Stable" : delta > 0 ? "↑ Increasing" : "↓ Decreasing";
            return (
              <Card key={m.id}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-semibold text-charcoal-soft">{m.name}</p>
                  <span className="text-[10px] font-bold" style={{ color: trendColor }}>
                    {trendLabel}
                  </span>
                </div>
                <div className="overflow-x-auto no-scrollbar">
                  <BiomarkerHistoryChart history={m.history} unit={m.unit} color={trendColor} />
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <p className="text-[11px] text-charcoal-faint text-center mb-4 flex items-center justify-center gap-1">
        <Flame size={11} /> This is health-data tracking, not a diagnosis. Always consult a professional.
      </p>

      <AddMetricSheet open={metricOpen} onClose={() => setMetricOpen(false)} />
      <WaterDetailSheet open={waterOpen} onClose={() => setWaterOpen(false)} />
      <BiomarkerCaptureFlow open={scanOpen} onClose={() => setScanOpen(false)} />
      <ShareBiomarkerSheet open={!!shareMarker} onClose={() => setShareMarker(null)} marker={shareMarker} />
      <MetricDetailSheet
        open={!!detailMetric}
        onClose={() => setDetailMetric(null)}
        metric={detailMetric?.metric ?? null}
        current={detailMetric?.current ?? 0}
      />
    </div>
  );
}
