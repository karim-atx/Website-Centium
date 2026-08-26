import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { StepsPeriodCard } from "../../components/health/StepsPeriodCard";
import { BiomarkerCaptureFlow } from "../../components/health/BiomarkerCaptureFlow";
import { ShareBiomarkerSheet } from "../../components/health/ShareBiomarkerSheet";
import { BiomarkerDetailSheet } from "../../components/health/BiomarkerDetailSheet";
import { MetricDetailSheet } from "../../components/health/MetricDetailSheet";
import { WaterDetailSheet } from "../../components/health/WaterDetailSheet";
import { healthMetrics } from "../../data/mockHealthData";
import { useApp } from "../../context/AppContext";
import { ArrowDown, ArrowUp, Droplet, Flame, Camera, Share2, Lock } from "lucide-react";
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
  const { water, waterGoalMl, metricValues, bloodMarkers, stepsGoal, setStepsGoal } = useApp();
  const [waterOpen, setWaterOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [shareMarker, setShareMarker] = useState<BloodMarker | null>(null);
  const [detailMarker, setDetailMarker] = useState<BloodMarker | null>(null);
  const [shareAllOpen, setShareAllOpen] = useState(false);
  const [detailMetric, setDetailMetric] = useState<{ metric: HealthMetric; current: number } | null>(null);

  const sleepMeta = healthMetrics.find((m) => m.type === "sleep")!;
  const weightMeta = healthMetrics.find((m) => m.type === "weight")!;
  const bodyFatMeta = healthMetrics.find((m) => m.type === "bodyFat")!;
  const caloriesMeta = healthMetrics.find((m) => m.type === "caloriesBurned")!;

  const heightM = 1.78;
  const bmiValue = metricValues.weight / (heightM * heightM);
  const bmi = bmiValue.toFixed(1);
  // V7 (QA 7.0): standard WHO BMI bands, colored consistently with the
  // rest of the app's explicit (brand-independent) status colors.
  const bmiCategory =
    bmiValue < 18.5
      ? { label: "Underweight", color: "#4C8FD1" }
      : bmiValue < 25
      ? { label: "Normal weight", color: "#3F9165" }
      : bmiValue < 30
      ? { label: "Overweight", color: "#D9A441" }
      : { label: "Obese", color: "#C0392B" };

  const openDetail = (metric: HealthMetric, current: number) => setDetailMetric({ metric, current });

  // V8 (QA 8.0): "the widget directory for weight, steps and sleep should
  // redirect you to the detailed version" — Home links here with the
  // target metric in nav state so it opens straight into that sheet.
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    const openMetric = (location.state as { openMetric?: string } | null)?.openMetric;
    if (!openMetric) return;
    const currentByType: Record<string, number> = {
      weight: metricValues.weight,
      steps: metricValues.steps,
      sleep: metricValues.sleepHours,
    };
    const meta = healthMetrics.find((m) => m.type === openMetric);
    if (meta && currentByType[openMetric] !== undefined) {
      openDetail(meta, currentByType[openMetric]);
    }
    navigate(".", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  return (
    <div>
      {/* V7 (QA 7.0): the "+" quick water-log moved to the Home water
          widget — pressing it opens this same AddMetricSheet. */}
      <PageHeader title="Health" />

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
          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-2 py-0.5">
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
          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-2 py-0.5">
            <ArrowDown size={10} /> 0.4% this week
          </span>
        </Card>
        {/* V8 (QA 8.0): "Have the result of the BMI be more central and
            slightly bigger" — the number is now the centered focal point
            of the card instead of sharing a left/right split with the
            disclaimer text. */}
        <Card className="col-span-2 text-center">
          <p className="text-xs font-semibold text-charcoal-soft mb-2">BMI</p>
          <p className="text-3xl font-bold text-charcoal leading-none mb-2">{bmi}</p>
          <span
            className="inline-block text-[10px] font-bold uppercase rounded-full px-2.5 py-1 mb-3"
            style={{ color: bmiCategory.color, background: `${bmiCategory.color}20` }}
          >
            {bmiCategory.label}
          </span>
          <p className="text-xs text-charcoal-faint">
            Body Mass Index — a general prototype estimate, not a diagnosis.
          </p>
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
          <span className="mt-2 inline-flex items-center gap-0.5 text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-2 py-0.5">
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
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShareAllOpen(true)}
            className="tap flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <Share2 size={13} /> Share all
          </button>
          <button
            onClick={() => setScanOpen(true)}
            className="tap flex items-center gap-1.5 text-xs font-semibold text-primary"
          >
            <Camera size={13} /> Scan result
          </button>
        </div>
      </div>
      {/* V8 (QA 8.0): "instead having a list of all the saved biomarkers so
          far. When pressing on the selected biomarker, it shows you a
          graph of the history" — replaces the old "View History" toggle
          that expanded every marker's chart at once. */}
      <Card padded={false} className="mb-6 divide-y divide-charcoal/[0.04]">
        {bloodMarkers.map((m) => (
          <button
            key={m.id}
            onClick={() => setDetailMarker(m)}
            className="tap w-full flex items-center justify-between px-4 py-3.5 text-left"
          >
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
                onClick={(e) => {
                  e.stopPropagation();
                  setShareMarker(m);
                }}
                className="tap w-7 h-7 rounded-full bg-cream-soft flex items-center justify-center text-charcoal-faint shrink-0"
                aria-label={`Share ${m.name}`}
              >
                <Share2 size={12} />
              </button>
            </div>
          </button>
        ))}
      </Card>

      <p className="text-[11px] text-charcoal-faint text-center mb-4 flex items-center justify-center gap-1">
        <Flame size={11} /> This is health-data tracking, not a diagnosis. Always consult a professional.
      </p>

      <WaterDetailSheet open={waterOpen} onClose={() => setWaterOpen(false)} />
      <BiomarkerCaptureFlow open={scanOpen} onClose={() => setScanOpen(false)} />
      <ShareBiomarkerSheet open={!!shareMarker} onClose={() => setShareMarker(null)} marker={shareMarker} />
      <ShareBiomarkerSheet
        open={shareAllOpen}
        onClose={() => setShareAllOpen(false)}
        marker={null}
        markers={bloodMarkers}
      />
      <MetricDetailSheet
        open={!!detailMetric}
        onClose={() => setDetailMetric(null)}
        metric={detailMetric?.metric ?? null}
        current={detailMetric?.current ?? 0}
        stepsGoal={stepsGoal}
        onEditStepsGoal={setStepsGoal}
      />
      <BiomarkerDetailSheet open={!!detailMarker} onClose={() => setDetailMarker(null)} marker={detailMarker} />
    </div>
  );
}
