import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { StepsPeriodCard } from "../../components/health/StepsPeriodCard";
import { BiomarkerCaptureFlow } from "../../components/health/BiomarkerCaptureFlow";
import { ShareBiomarkerSheet } from "../../components/health/ShareBiomarkerSheet";
import { BiomarkerDetailSheet } from "../../components/health/BiomarkerDetailSheet";
import { MetricDetailSheet } from "../../components/health/MetricDetailSheet";
import { WaterDetailSheet } from "../../components/health/WaterDetailSheet";
import { WaterVessel } from "../../components/health/WaterVessel";
import { MedicalRecordsSection } from "../../components/health/MedicalRecordsSection";
import { ImagingCaptureFlow } from "../../components/health/ImagingCaptureFlow";
import { ShareImagingSheet } from "../../components/health/ShareImagingSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { HeartRateEKG } from "../../components/health/HeartRateEKG";
import { CalorieFlame } from "../../components/health/CalorieFlame";
import { detectPlatform } from "../../components/health/IntegrationsCard";
import { healthMetrics } from "../../data/mockHealthData";
import { useApp } from "../../context/AppContext";
import { getTestRecommendations } from "../../utils/biomarkerRecommendations";
import { ArrowDown, ArrowUp, ChevronRight, Droplet, Flame, HeartPulse, Stethoscope } from "lucide-react";
import clsx from "clsx";
import type { BloodMarker, HealthMetric, ImagingRecord } from "../../types";

// V9 (QA 9.0): "swiping down on this page should prompt syncing data with
// selected integrated health data device" — a pull-to-refresh gesture,
// only armed at the very top of the page so it doesn't fight normal
// scrolling further down.
const PULL_THRESHOLD = 70;
const SYNC_DURATION_MS = 1400;


export default function Health() {
  const {
    user,
    water,
    waterGoalMl,
    metricValues,
    bloodMarkers,
    stepsGoal,
    setStepsGoal,
    healthIntegrationConnected,
    recoverySensitive,
    imagingRecords,
  } = useApp();
  const testRecommendations = useMemo(() => getTestRecommendations(user), [user]);
  const [waterOpen, setWaterOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [shareMarker, setShareMarker] = useState<BloodMarker | null>(null);
  const [detailMarker, setDetailMarker] = useState<BloodMarker | null>(null);
  const [shareAllOpen, setShareAllOpen] = useState(false);
  const [detailMetric, setDetailMetric] = useState<{ metric: HealthMetric; current: number } | null>(null);
  // QA 13.0: "Have records be a button you can press that leads to the
  // following tabs" — Biomarkers/Imaging/History/Medications now live
  // behind one entry point instead of sitting inline on the page.
  const [recordsOpen, setRecordsOpen] = useState(false);
  const [scanImagingOpen, setScanImagingOpen] = useState(false);
  const [shareImagingRecord, setShareImagingRecord] = useState<ImagingRecord | null>(null);
  const [shareAllImagingOpen, setShareAllImagingOpen] = useState(false);

  const [pullY, setPullY] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const pullStartY = useRef<number | null>(null);
  const platformLabel = detectPlatform() === "ios" ? "Apple Health" : "Android Health";

  const runSync = () => {
    if (syncing) return;
    if (!healthIntegrationConnected) {
      setSyncMessage(`Connect ${platformLabel} in Settings to sync.`);
      setTimeout(() => setSyncMessage(null), 2200);
      return;
    }
    setSyncing(true);
    setSyncProgress(0);
    const start = Date.now();
    const tick = () => {
      const pct = Math.min(100, ((Date.now() - start) / SYNC_DURATION_MS) * 100);
      setSyncProgress(pct);
      if (pct < 100) requestAnimationFrame(tick);
      else {
        setSyncing(false);
        setSyncMessage(`Synced with ${platformLabel}`);
        setTimeout(() => setSyncMessage(null), 1800);
      }
    };
    requestAnimationFrame(tick);
  };

  const handlePullStart = (clientY: number) => {
    if (syncing || window.scrollY > 0) return;
    pullStartY.current = clientY;
  };
  const handlePullMove = (clientY: number) => {
    if (pullStartY.current === null || syncing) return;
    const delta = clientY - pullStartY.current;
    if (delta > 0) setPullY(Math.min(delta, 100));
  };
  const handlePullEnd = () => {
    if (pullStartY.current === null) return;
    pullStartY.current = null;
    if (pullY >= PULL_THRESHOLD) runSync();
    setPullY(0);
  };

  const sleepMeta = healthMetrics.find((m) => m.type === "sleep")!;
  const weightMeta = healthMetrics.find((m) => m.type === "weight")!;
  const heartRateMeta = healthMetrics.find((m) => m.type === "heartRate")!;
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
  // Design refinement §6.3: "a proportional four-segment WHO band (flex
  // 1.85/0.65/0.5/1 = under/normal/over/obese, a linear 0–40 scale) with a
  // downward triangle marker pinned at the reading's position."
  const bmiBandPct = Math.max(0, Math.min(100, (bmiValue / 40) * 100));

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
      heartRate: metricValues.heartRate,
    };
    const meta = healthMetrics.find((m) => m.type === openMetric);
    if (meta && currentByType[openMetric] !== undefined) {
      openDetail(meta, currentByType[openMetric]);
    }
    navigate(".", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  return (
    <div
      onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
      onTouchMove={(e) => handlePullMove(e.touches[0].clientY)}
      onTouchEnd={handlePullEnd}
      onMouseDown={(e) => handlePullStart(e.clientY)}
      onMouseMove={(e) => e.buttons === 1 && handlePullMove(e.clientY)}
      onMouseUp={handlePullEnd}
      onMouseLeave={handlePullEnd}
    >
      {(pullY > 0 || syncing) && (
        <div className="flex flex-col items-center justify-center overflow-hidden" style={{ height: syncing ? 28 : pullY }}>
          {syncing ? (
            <div className="w-24 h-1 rounded-full bg-cream-soft overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${syncProgress}%`, transition: "width 0.05s linear" }}
              />
            </div>
          ) : (
            <p className="text-[10px] font-semibold text-charcoal-faint">
              {pullY >= PULL_THRESHOLD ? "Release to sync" : "Pull to sync"}
            </p>
          )}
        </div>
      )}
      {syncMessage && (
        <p className="text-center text-xs font-semibold text-primary-dark bg-primary-pale rounded-full px-3 py-1.5 mb-3 animate-fade-in">
          {syncMessage}
        </p>
      )}
      {/* V7 (QA 7.0): the "+" quick water-log moved to the Home water
          widget — pressing it opens this same AddMetricSheet. */}
      <PageHeader title="Health" />

      <p className="section-label text-charcoal-faint mb-2.5">Body</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* QA 12.0 recovery-sensitive experience: "Hide weight, BMI, and
            body measurement features." Heart Rate isn't a body-measurement
            metric, so it stays and just takes the full row alone. */}
        {!recoverySensitive && (
          <Card
            interactive
            className="relative"
            onClick={() => openDetail(weightMeta, metricValues.weight)}
          >
            <p className="text-[11px] font-semibold text-charcoal-soft mb-1">Weight</p>
            <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">
              {metricValues.weight} <span className="text-[13px] font-semibold text-charcoal-tertiary tracking-normal">kg</span>
            </p>
            <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold text-teal-deep-text bg-teal-pale rounded-full px-2 py-0.5">
              <ArrowDown size={10} /> 0.6 kg this week
            </span>
          </Card>
        )}
        <Card
          interactive
          className={clsx("relative", recoverySensitive && "col-span-2")}
          onClick={() => openDetail(heartRateMeta, metricValues.heartRate)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-charcoal-soft">Heart Rate</p>
            <HeartPulse size={11} className="text-charcoal-tertiary" />
          </div>
          <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">
            {metricValues.heartRate} <span className="text-[13px] font-semibold text-charcoal-tertiary tracking-normal">bpm</span>
          </p>
          <div className="mt-1.5">
            <HeartRateEKG bpm={metricValues.heartRate} />
          </div>
        </Card>
        {/* V8 (QA 8.0): "Have the result of the BMI be more central and
            slightly bigger" — the number is now the centered focal point
            of the card instead of sharing a left/right split with the
            disclaimer text. */}
        {!recoverySensitive && (
          <Card className="col-span-2">
            <div className="flex items-center gap-4">
              <div className="shrink-0">
                <p className="text-[11px] font-semibold text-charcoal-soft mb-1">BMI</p>
                <p className="text-[32px] font-extrabold text-charcoal leading-none tracking-[-0.035em] tabular-nums">{bmi}</p>
              </div>
              <div className="flex-1 min-w-0">
                <span
                  className="inline-block text-[10px] font-bold uppercase rounded-full px-2.5 py-1 mb-2"
                  style={{ color: bmiCategory.color, background: `${bmiCategory.color}20` }}
                >
                  {bmiCategory.label}
                </span>
                <div className="relative">
                  <div className="flex h-2 rounded-full overflow-hidden">
                    <div className="flex-[1.85]" style={{ background: "#4C8FD1" }} />
                    <div className="flex-[0.65]" style={{ background: "#3F9165" }} />
                    <div className="flex-[0.5]" style={{ background: "#D9A441" }} />
                    <div className="flex-[1]" style={{ background: "#C0392B" }} />
                  </div>
                  <div
                    className="absolute -top-1.5 w-0 h-0 -translate-x-1/2"
                    style={{
                      left: `${bmiBandPct}%`,
                      borderLeft: "5px solid transparent",
                      borderRight: "5px solid transparent",
                      borderTop: "6px solid rgb(var(--c-charcoal))",
                    }}
                  />
                </div>
              </div>
            </div>
            <p className="text-[10.5px] font-medium text-charcoal-faint mt-3">
              Body Mass Index — a general prototype estimate, not a diagnosis.
            </p>
          </Card>
        )}
      </div>

      <p className="section-label text-charcoal-faint mb-2.5">Activity</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StepsPeriodCard onExpand={() => openDetail(healthMetrics.find((m) => m.type === "steps")!, metricValues.steps)} />
        <Card
          interactive
          className="relative"
          onClick={() => openDetail(caloriesMeta, metricValues.caloriesBurned)}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="text-[11px] font-semibold text-charcoal-soft">Calories burned</p>
            <CalorieFlame size={13} />
          </div>
          <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">{metricValues.caloriesBurned.toLocaleString()}</p>
          <p className="text-[11px] text-charcoal-faint mt-2">Estimated, incl. workouts</p>
        </Card>
      </div>

      <p className="section-label text-charcoal-faint mb-2.5">Recovery</p>
      <div className="grid grid-cols-2 gap-3 mb-6">
        <Card
          interactive
          className="relative"
          onClick={() => openDetail(sleepMeta, metricValues.sleepHours)}
        >
          <p className="text-[11px] font-semibold text-charcoal-soft mb-1">Sleep</p>
          <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">
            {Math.floor(metricValues.sleepHours)}h {Math.round((metricValues.sleepHours % 1) * 60)}m
          </p>
          <span className="mt-2 inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary-deep-text bg-primary-pale rounded-full px-2 py-0.5">
            <ArrowUp size={10} /> +0.3h vs avg
          </span>
        </Card>
        <Card interactive className="relative flex items-center gap-3" onClick={() => setWaterOpen(true)}>
          <WaterVessel ml={water} goalMl={waterGoalMl} />
          <div className="min-w-0">
            <div className="flex items-center gap-1 mb-1">
              <p className="text-[11px] font-semibold text-charcoal-soft">Water</p>
              <Droplet size={11} className="text-charcoal-tertiary" />
            </div>
            <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">{(water / 1000).toFixed(1)}L</p>
            <p className="text-[11px] text-charcoal-faint mt-1">of {(waterGoalMl / 1000).toFixed(1)}L goal</p>
          </div>
        </Card>
      </div>

      {/* QA 11.0: "Based on the information provided by the client...
          provide recommendations on what tests might be important...
          Make sure to state that this is not for diagnosis or prognosis
          only recommendation." */}
      {testRecommendations.length > 0 && (
        <Card className="mb-4 !bg-primary-pale">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope size={15} className="text-primary-dark" />
            <p className="text-sm font-bold text-primary-deep-text">Recommended tests</p>
          </div>
          <div className="space-y-2 mb-2">
            {testRecommendations.map((r) => (
              <div key={r.test}>
                <p className="text-[13px] font-bold text-charcoal">{r.test}</p>
                <p className="text-[11.5px] text-charcoal-soft">{r.reason}</p>
              </div>
            ))}
          </div>
          <p className="text-[10.5px] font-medium text-charcoal-faint border-t border-primary/[0.15] pt-2">
            Based on your profile only — not a diagnosis or prognosis. Discuss with a doctor before acting on it.
          </p>
        </Card>
      )}

      {/* QA 13.0: "Have records be a button you can press that leads to the
          following tabs" — collapses the Biomarkers/Imaging/History/
          Medications tab strip behind one row instead of it sitting inline
          on the page. */}
      <button
        onClick={() => setRecordsOpen(true)}
        className="tap w-full flex items-center justify-between rounded-2xl bg-cream-card border border-charcoal/[0.11] px-4 py-3.5 mb-4"
      >
        <span className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
            <Stethoscope size={16} className="text-primary-dark" />
          </span>
          <span className="text-left">
            <span className="text-sm font-bold text-charcoal block">Records</span>
            <span className="text-xs text-charcoal-faint block">Biomarkers, imaging, history & medications</span>
          </span>
        </span>
        <ChevronRight size={16} className="text-charcoal-faint shrink-0" />
      </button>

      <p className="text-[11px] text-charcoal-faint text-center mb-4 flex items-center justify-center gap-1">
        <Flame size={11} /> This is health-data tracking, not a diagnosis. Always consult a professional.
      </p>

      <BottomSheet open={recordsOpen} onClose={() => setRecordsOpen(false)} title="Records">
        <MedicalRecordsSection
          hideLabel
          bloodMarkers={bloodMarkers}
          onShareAll={() => setShareAllOpen(true)}
          onScan={() => setScanOpen(true)}
          onShareMarker={(m) => setShareMarker(m)}
          onOpenMarker={(m) => setDetailMarker(m)}
          onScanImaging={() => setScanImagingOpen(true)}
          onShareAllImaging={() => setShareAllImagingOpen(true)}
          onShareImagingRecord={(r) => setShareImagingRecord(r)}
        />
      </BottomSheet>

      <WaterDetailSheet open={waterOpen} onClose={() => setWaterOpen(false)} />
      <BiomarkerCaptureFlow open={scanOpen} onClose={() => setScanOpen(false)} />
      <ImagingCaptureFlow open={scanImagingOpen} onClose={() => setScanImagingOpen(false)} />
      <ShareImagingSheet
        open={!!shareImagingRecord}
        onClose={() => setShareImagingRecord(null)}
        record={shareImagingRecord}
      />
      <ShareImagingSheet
        open={shareAllImagingOpen}
        onClose={() => setShareAllImagingOpen(false)}
        record={null}
        records={imagingRecords}
      />
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
