import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card } from "../../components/ui/Card";
import { BiomarkerCaptureFlow } from "../../components/health/BiomarkerCaptureFlow";
import { ShareBiomarkerSheet } from "../../components/health/ShareBiomarkerSheet";
import { BiomarkerDetailSheet } from "../../components/health/BiomarkerDetailSheet";
import { MetricDetailSheet } from "../../components/health/MetricDetailSheet";
import { WaterDetailSheet } from "../../components/health/WaterDetailSheet";
import { MedicalRecordsSection } from "../../components/health/MedicalRecordsSection";
import { ImagingCaptureFlow } from "../../components/health/ImagingCaptureFlow";
import { ShareImagingSheet } from "../../components/health/ShareImagingSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { HeartRateEKG } from "../../components/health/HeartRateEKG";
import { CalorieFlame } from "../../components/health/CalorieFlame";
import { detectPlatform } from "../../components/health/IntegrationsCard";
import { healthMetrics } from "../../data/mockHealthData";
import { dayLetter } from "../../utils/week";
import { useApp } from "../../context/AppContext";
import { getTestRecommendations } from "../../utils/biomarkerRecommendations";
import { ChevronRight, Flame, Stethoscope, FileText } from "lucide-react";
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
  const stepsMeta = healthMetrics.find((m) => m.type === "steps")!;
  const stepsMax = Math.max(...stepsMeta.history.map((h) => h.value), stepsGoal);

  // Biomarkers row subtitle: real markers outside their reference range,
  // not a fabricated example — falls back to a generic description when
  // nothing is currently flagged.
  const flaggedMarkers = bloodMarkers.filter((m) => m.status && m.status !== "normal").map((m) => m.name);
  const biomarkersSubtitle =
    flaggedMarkers.length > 0 ? `${flaggedMarkers.slice(0, 2).join(" and ")} suggested` : "Vitamins, minerals, panels";

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

  // Iteration 6 "Team" §5 Health: the weight-trend hero's sparkline, real
  // 7-day history scaled into the dc.html's own 130×44 viewBox.
  const weightValues = weightMeta.history.map((h) => h.value);
  const weightMin = Math.min(...weightValues);
  const weightMax = Math.max(...weightValues);
  const weightSparkPoints = weightValues.map((v, i) => {
    const x = 4 + (i * (126 - 4)) / (weightValues.length - 1);
    const y = weightMax === weightMin ? 22 : 39 - ((v - weightMin) / (weightMax - weightMin)) * (39 - 12);
    return `${x},${y}`;
  });

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
      <div className="mb-[13px]">
        <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Health</p>
        <p className="mt-[3px] text-[11px] text-charcoal-tertiary">
          {healthIntegrationConnected ? `Synced with ${platformLabel}` : `Connect ${platformLabel} in Settings to sync`}
        </p>
      </div>

      {/* Iteration 6 "Team" §5 Health: weight-trend hero (same gradient as
          the Home streak board), BMI folded into its footer instead of a
          separate card. Hidden under recovery-sensitive exactly as the
          weight/BMI cards it replaces were. */}
      {!recoverySensitive && (
        <button
          onClick={() => openDetail(weightMeta, metricValues.weight)}
          className="tap w-full text-left relative overflow-hidden rounded-[22px] px-[17px] py-4 mb-[13px]"
          style={{ background: "var(--gradient-board)" }}
        >
          <p className="text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.66]">Weight trend</p>
          <div className="flex items-end justify-between gap-3.5 mt-[9px]">
            <div>
              <p className="flex items-baseline gap-[5px]">
                <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-white tabular-nums">
                  {metricValues.weight}
                </span>
                <span className="text-[12px] font-semibold text-white/[0.74]">kg</span>
              </p>
              <p className="mt-[5px] text-[10px] text-white/70">
                {weightMeta.trend <= 0 ? "↓" : "↑"} {Math.abs(weightMeta.trend)} kg this week
              </p>
            </div>
            <svg viewBox="0 0 130 44" style={{ width: 148, height: 44, flex: "none", display: "block" }}>
              <polyline points={weightSparkPoints.join(" ")} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
              {weightSparkPoints.map((p) => (
                <circle key={p} cx={p.split(",")[0]} cy={p.split(",")[1]} r={2.2} fill="#fff" />
              ))}
            </svg>
          </div>
          <div className="flex items-center gap-[11px] mt-[13px] pt-[11px] border-t border-white/[0.24]">
            <span className="shrink-0 text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.62]">BMI</span>
            <span className="flex-1 min-w-0 block h-1 rounded-full bg-white/[0.26] overflow-hidden">
              <span className="block h-full rounded-full bg-white" style={{ width: `${bmiBandPct}%` }} />
            </span>
            <span className="shrink-0 text-[11px] font-bold text-white whitespace-nowrap">
              {bmi} · {bmiCategory.label.toLowerCase()}
            </span>
          </div>
        </button>
      )}

      {/* "Today" reuses the exact canonical small widgets from the Home
          widget library (steps/water/sleep) — the manifest's own README
          calls this set canonical and says every future placement should
          draw from it. Wired to this page's own detail sheets rather than
          Home's navigate-to-Health, since we're already here. */}
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Today</p>
      <div className="flex gap-[7px] mb-[9px]">
        <button
          onClick={() => openDetail(stepsMeta, metricValues.steps)}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
          style={{ background: "rgba(162,200,194,.2)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-teal-ink/[0.72]">Steps</p>
          <p className="mt-[5px] text-[16px] font-extrabold tracking-[-0.03em] text-charcoal tabular-nums">
            {metricValues.steps.toLocaleString()}
          </p>
          <div className="flex items-end gap-[2px] h-[26px] mt-[9px]">
            {stepsMeta.history.map((h, i) => {
              const isToday = i === stepsMeta.history.length - 1;
              return (
                <div
                  key={i}
                  className="flex-1 rounded-[1px]"
                  style={{ height: `${Math.max(8, (h.value / stepsMax) * 100)}%`, background: isToday ? "rgb(var(--c-team-teal-deep))" : "rgba(111,153,147,.34)" }}
                />
              );
            })}
          </div>
          <div className="flex gap-[2px] mt-1">
            {stepsMeta.history.map((h, i) => {
              const isToday = i === stepsMeta.history.length - 1;
              return (
                <span key={i} className={clsx("flex-1 text-center text-[7.5px]", isToday ? "font-extrabold text-team-teal-ink" : "font-semibold text-team-teal-ink/50")}>
                  {dayLetter(h.date)}
                </span>
              );
            })}
          </div>
        </button>

        <button
          onClick={() => setWaterOpen(true)}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
          style={{ background: "rgba(143,192,232,.17)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-blue-ink/[0.72]">Water</p>
          <div className="flex-1 flex items-center justify-center gap-2.5 min-h-0">
            <div className="min-w-0 text-right">
              <p className="text-[16px] font-extrabold tracking-[-0.03em] text-charcoal">{(water / 1000).toFixed(1)} L</p>
              <p className="mt-[5px] text-[9px] text-team-blue-ink">of {(waterGoalMl / 1000).toFixed(1)} L</p>
            </div>
            <svg viewBox="0 0 34 40" width={38} height={45} style={{ display: "block", flex: "none", overflow: "visible" }}>
              <defs>
                <clipPath id="health-cup-clip">
                  <path d="M5.2 5 H28.8 L26.4 35.2 A2.6 2.6 0 0 1 23.8 37.6 H10.2 A2.6 2.6 0 0 1 7.6 35.2 Z" />
                </clipPath>
              </defs>
              <g clipPath="url(#health-cup-clip)">
                <rect x="0" y={40 - Math.max(0, Math.min(1, water / waterGoalMl)) * 35} width="34" height="40" fill="#8FC0E8" />
              </g>
              <path d="M5.2 5 H28.8 L26.4 35.2 A2.6 2.6 0 0 1 23.8 37.6 H10.2 A2.6 2.6 0 0 1 7.6 35.2 Z" fill="none" stroke="#5E8BB3" strokeWidth={1.7} strokeLinejoin="round" />
              <path d="M3.6 5 H30.4" stroke="#5E8BB3" strokeWidth={1.7} strokeLinecap="round" />
            </svg>
          </div>
        </button>

        <button
          onClick={() => openDetail(sleepMeta, metricValues.sleepHours)}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left"
          style={{ background: "rgba(174,161,220,.13)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-primary-deep-text/[0.65]">Sleep</p>
          <p className="mt-[5px] text-[16px] font-extrabold tracking-[-0.03em] text-charcoal">
            {Math.floor(metricValues.sleepHours)}h{Math.round((metricValues.sleepHours % 1) * 60)
              .toString()
              .padStart(2, "0")}
          </p>
          <div className="flex-1 flex items-center min-h-0 mt-2">
            <svg viewBox="0 0 100 26" width="100%" height={26} preserveAspectRatio="none" style={{ display: "block", overflow: "visible" }}>
              <path
                d="M0 22 H14 V13 H26 V4 H34 V13 H48 V22 H60 V13 H72 V4 H80 V13 H92 V20 H100"
                fill="none"
                stroke="rgb(var(--c-team-lavender-deep))"
                strokeWidth={1.7}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <p className="mt-[6px] text-[9px] text-primary-deep-text">+0.3h avg</p>
        </button>
      </div>

      {/* Calories burned isn't part of the canonical widget set and isn't
          shown in this handoff's Health frame at all — kept as its own
          untouched card rather than deleted, per "absence from the canvas
          means not in scope, never delete." */}
      <Card interactive className="relative mb-[13px]" onClick={() => openDetail(caloriesMeta, metricValues.caloriesBurned)}>
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-charcoal-soft">Calories burned</p>
          <CalorieFlame size={13} />
        </div>
        <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">{metricValues.caloriesBurned.toLocaleString()}</p>
        <p className="text-[11px] text-charcoal-faint mt-2">Estimated, incl. workouts</p>
      </Card>

      {/* Canonical Heart Rate large widget, reusing the Health page's own
          EKG component (see the identical note in HomeWidget.tsx — the
          manifest requires the two to mirror exactly, so they share one
          instance rather than two hand-built copies). */}
      <button
        onClick={() => openDetail(heartRateMeta, metricValues.heartRate)}
        className="tap w-full h-[150px] box-border rounded-[15px] px-4 py-3.5 flex flex-col text-left mb-[13px]"
        style={{ background: "rgba(156,79,124,.1)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-rose-ink/80">Heart rate</p>
          <span className="text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap text-team-rose-ink bg-berry/[0.16]">Resting</span>
        </div>
        <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
          <div className="flex items-baseline gap-2">
            <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">
              {metricValues.heartRate}
            </span>
            <span className="text-[11px] font-bold text-team-rose-ink/80">bpm resting</span>
          </div>
          <HeartRateEKG bpm={metricValues.heartRate} />
        </div>
      </button>

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
          following tabs" — still one entry point (both rows open the same
          Records sheet, just as the single row did before); the manifest's
          two-row split is a visual regrouping, not a request to give
          Biomarkers and Imaging separate deep-linked destinations. */}
      <p className="mb-[9px] text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Records</p>
      <div className="flex flex-col gap-[7px] mb-3">
        <button
          onClick={() => setRecordsOpen(true)}
          className="tap flex items-center gap-[11px] rounded-[15px] px-3.5 py-3"
          style={{ background: "rgba(174,161,220,.16)" }}
        >
          <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0 bg-team-lavender-deep">
            <Stethoscope size={14} className="text-white" />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[12.5px] font-bold text-charcoal">Biomarkers &amp; labs</span>
            <span className="block text-[10px] text-charcoal-tertiary truncate">{biomarkersSubtitle}</span>
          </span>
          <ChevronRight size={14} className="text-primary-deep-text/60 shrink-0" />
        </button>
        <button
          onClick={() => setRecordsOpen(true)}
          className="tap flex items-center gap-[11px] rounded-[15px] px-3.5 py-3"
          style={{ background: "rgba(162,200,194,.18)" }}
        >
          <span className="w-[30px] h-[30px] rounded-[10px] flex items-center justify-center shrink-0 bg-team-teal-deep">
            <FileText size={14} className="text-white" />
          </span>
          <span className="flex-1 min-w-0 text-left">
            <span className="block text-[12.5px] font-bold text-charcoal">Imaging &amp; history</span>
            <span className="block text-[10px] text-charcoal-tertiary">Medications, surgeries, conditions</span>
          </span>
          <ChevronRight size={14} className="text-primary-deep-text/60 shrink-0" />
        </button>
      </div>

      <p className="text-[9.5px] leading-[1.5] text-charcoal-tertiary text-center mb-4 flex items-center justify-center gap-1">
        <Flame size={11} /> Health-data tracking, not a diagnosis. Always consult a professional.
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
