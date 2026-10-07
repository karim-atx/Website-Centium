import { SCREENING_COPY, bmiOf, screeningRows } from "../../services/health-checks/screening";
import { usePregnancyFlags } from "../../components/pregnancy/usePregnancyFlags";
import { FlagNote } from "../../components/ui/FlagNote";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { BiomarkerCaptureFlow } from "../../components/health/BiomarkerCaptureFlow";
import { ShareBiomarkerSheet } from "../../components/health/ShareBiomarkerSheet";
import { BiomarkerDetailSheet } from "../../components/health/BiomarkerDetailSheet";
import { MetricDetailSheet } from "../../components/health/MetricDetailSheet";
import { WaterDetailSheet } from "../../components/health/WaterDetailSheet";
import { MedicalRecordsSection } from "../../components/health/MedicalRecordsSection";
import { ImagingCaptureFlow } from "../../components/health/ImagingCaptureFlow";
import { ShareImagingSheet } from "../../components/health/ShareImagingSheet";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { BloodPressureSheet } from "../../components/health/BloodPressureSheet";
import { PHASE_COLOR, PHASE_LABEL } from "../../services/cycle/guidance";
import { PregnancyHealthCard } from "../../components/pregnancy/PregnancyGuidance";
import { PREGNANCY_COLOR } from "../../components/pregnancy/PregnancyRing";
import { gestationOn } from "../../services/pregnancy";
import { daysBetween } from "../../services/cycle/hormones";
import { BloodPressureDetailSheet } from "../../components/health/BloodPressureDetailSheet";
import type { BloodPressureReading } from "../../services/blood-pressure";
import { classifyBloodPressure, isSevere } from "../../services/blood-pressure/classify";
import { BP_CATEGORY_LABEL, BP_NO_READINGS, SEVERE_READING_MESSAGE } from "../../services/blood-pressure/guidance";
import { detectPlatform } from "../../components/health/IntegrationsCard";
import {
  emptyHint,
  formatMetric,
  NO_READINGS,
  trendLabel,
  withinDays,
  type MetricReadings,
} from "../../services/health-metrics/series";
import { useApp } from "../../context/AppContext";
import { TrackerQuestion } from "../../components/cycle/TrackerQuestion";
import { Stethoscope, FileText, Moon, Flame, Heart, ClipboardList, ShieldCheck } from "lucide-react";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { BottleGlyph, HealthRow, HealthSectionLabel, ScaleGlyph, StepBarsGlyph } from "../../components/health/HealthRow";
import { useIsDark } from "../../hooks/useIsDark";
import type { BloodMarker, ImagingRecord } from "../../types";
import { NumberPlaceholder } from "../../components/ui/NumberPlaceholder";
import { useCheckFlags } from "../../components/health-checks/useCheckFlags";
import { CheckFlagNote } from "../../components/health-checks/CheckFlag";
import { COPY as CHECKS_COPY } from "../../services/health-checks/guidance";

// THE PULL-TO-SYNC GESTURE IS GONE, with the device toggle behind it.
// "Swiping down on this page should prompt syncing data with selected
// integrated health data device" was built as far as the prompt: a 70px pull
// threshold, a 1400 ms progress bar driven by requestAnimationFrame, and the
// message "Synced with Apple Health" at the end of it. No request was ever
// made. A gesture that reports a sync that did not happen is worse than no
// gesture, because it tells the user their empty cards are stale rather than
// empty. It returns when there is something to sync with — see
// IntegrationsCard.


/**
 * "20 min ago", "Yesterday", "Sep 18" — how long ago a reading was taken.
 *
 * A reading two weeks old and one from this morning mean different things
 * about the same numbers, and a bare timestamp makes the reader do that
 * arithmetic. Falls back to the date once counting days stops being useful.
 */
function relativeWhen(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function Health() {
  const {
    user,
    water,
    waterGoalMl,
    metricValues,
    healthSeries,
    bloodPressure,
    reloadBloodPressure,
    cycleSettings,
    cyclePrediction,
    pregnancy: recordedPregnancy,
    cycleOffered,
    today,
    bloodMarkers,
    stepsGoal,
    setStepsGoal,
    recoverySensitive,
    recoveryModePending,
    imagingRecords,
    noteFeatureMilestone,
  } = useApp();
  // MO11: a profile not offered the cycle section sees no cycle or
  // pregnancy content here — filtered at render, nothing is changed.
  const pregnancy = cycleOffered ? recordedPregnancy : null;
  // HE1 copy: "Apple Health sync is coming." Android's platform is Health
  // Connect (Foundations 2.4 brand list); "Android Health" is not a product.
  const platformLabel = detectPlatform() === "ios" ? "Apple Health" : "Health Connect";
  const dark = useIsDark();
  const [addMetricOpen, setAddMetricOpen] = useState(false);
  const [waterOpen, setWaterOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [shareMarker, setShareMarker] = useState<BloodMarker | null>(null);
  const [detailMarker, setDetailMarker] = useState<BloodMarker | null>(null);
  const [shareAllOpen, setShareAllOpen] = useState(false);
  const [detailMetric, setDetailMetric] = useState<{ metric: MetricReadings; current: number | null } | null>(null);
  // QA 13.0: "Have records be a button you can press that leads to the
  // following tabs" — Biomarkers/Imaging/History/Medications now live
  // behind one entry point instead of sitting inline on the page.
  // WHICH ROW WAS PRESSED, not just that one was. Both rows used to set a
  // bare boolean and the sheet always opened on Biomarkers.
  const [recordsTab, setRecordsTab] = useState<"biomarkers" | "imaging" | null>(null);
  const [bpDetailOpen, setBpDetailOpen] = useState(false);
  // Null means "add"; a reading means "correct this one".
  const [bpEditing, setBpEditing] = useState<BloodPressureReading | null>(null);
  const [bpSheetOpen, setBpSheetOpen] = useState(false);
  const recordsOpen = recordsTab !== null;

  // Explorer milestone: "Paperwork". One row per account for ever — the repeat is
  // a primary-key conflict the service treats as the success it is. Recorded when the Records sheet actually
  // opens, not on every visit to Health — the badge is for finding it.
  useEffect(() => {
    if (recordsOpen) noteFeatureMilestone("health_records");
  }, [recordsOpen, noteFeatureMilestone]);
  const [scanImagingOpen, setScanImagingOpen] = useState(false);
  const [shareImagingRecord, setShareImagingRecord] = useState<ImagingRecord | null>(null);
  const [shareAllImagingOpen, setShareAllImagingOpen] = useState(false);

  const week = (type: MetricReadings["type"]) => withinDays(healthSeries[type], 7, today);
  const sleepMeta = week("sleep");
  const weightMeta = week("weight");
  const heartRateMeta = week("heartRate");
  const caloriesMeta = week("caloriesBurned");
  const stepsMeta = week("steps");
  // Guarded against an empty history: Math.max() of nothing is -Infinity, and
  // a bar height divided by that is not a number.
  const stepsMax = Math.max(...stepsMeta.history.map((h) => h.value), stepsGoal);

  // Biomarkers row subtitle: real markers outside their reference range,
  // not a fabricated example — falls back to the frame's description when
  // nothing is currently flagged.
  const flaggedMarkers = bloodMarkers.filter((m) => m.status && m.status !== "normal").map((m) => m.name);
  const biomarkersSubtitle =
    flaggedMarkers.length > 0 ? `${flaggedMarkers.slice(0, 2).join(" and ")} suggested` : "Vitamins, minerals, panels";

  // HANDOVER-COMPLETE PASS (2026-10-07): BMI is no longer shown on Health.
  // HE1 draws Weight trend as one row (title, one subtitle, chevron), so the
  // weight hero with its sparkline and BMI band is gone; the weight detail
  // sheet still opens from the row.

  // HE1: every row opens its detail, empty or not (the sheet says "No
  // readings yet" itself). Weight with nothing logged opens Add Metric
  // instead, since its subtitle asks the user to log one.
  const openDetail = (metric: MetricReadings, current: number | null) =>
    setDetailMetric({ metric, current: current as number });

  // V8 (QA 8.0): "the widget directory for weight, steps and sleep should
  // redirect you to the detailed version" — Home links here with the
  // target metric in nav state so it opens straight into that sheet.
  const location = useLocation();
  const navigate = useNavigate();
  const checkFlags = useCheckFlags();
  const pregnancyFlags = usePregnancyFlags();
  useEffect(() => {
    const navState = location.state as { openMetric?: string; openRecords?: boolean } | null;
    // Add Metric's "Add Records" button lands here with the Records sheet open.
    if (navState?.openRecords) {
      setRecordsTab("biomarkers");
      navigate(".", { replace: true, state: null });
      return;
    }
    const openMetric = navState?.openMetric as MetricReadings["type"] | undefined;
    if (!openMetric) return;
    // Only opens onto a metric that has something to show. Deep-linking into
    // a detail sheet for a metric with no readings would open an empty sheet.
    const meta = healthSeries[openMetric];
    if (meta && meta.current !== null) openDetail(meta, meta.current);
    navigate(".", { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  // HE1 colours, measured from the frame. Primary and secondary follow the
  // theme (HE1 §9: #AEA1DC and #A2C8C2 swap); water, calories (#D9A441),
  // heart (#9C4F7C) and blood pressure are fixed. Dark mode keeps the tints
  // (they read on #121317) and lifts the three tile glyphs to 3:1.
  const tint = (rgb: string, a: number) => `rgb(${rgb} / ${a})`;
  const LAV = "var(--th-aea1dc)";
  const TEAL = "var(--th-a2c8c2)";

  // Blood pressure: the latest reading in words. Its alerts stay under the row.
  const bpLatest = bloodPressure[0] ?? null;
  const bpInPregnancy = pregnancyFlags.replacesBpBands;
  const bpPregFlag = bpLatest ? pregnancyFlags.bp(bpLatest) : null;
  const bpSevere = !!bpLatest && !bpInPregnancy && isSevere(bpLatest.systolic, bpLatest.diastolic);
  const bpCheckFlag = bpLatest && !bpInPregnancy ? checkFlags.bp(bpLatest) : null;
  const bpSubtitle = bpLatest
    ? [
        `${bpLatest.systolic}/${bpLatest.diastolic} mmHg`,
        // THE CATEGORY IN WORDS; during a pregnancy its own levels replace the bands.
        bpInPregnancy ? bpPregFlag?.label : BP_CATEGORY_LABEL[classifyBloodPressure(bpLatest.systolic, bpLatest.diastolic)],
        relativeWhen(bpLatest.recordedAt),
      ]
        .filter(Boolean)
        .join(" · ")
    : `${BP_NO_READINGS} · Tap to add one`;

  const weightTrend = trendLabel(weightMeta);

  return (
    <div>
      {/* HE1 #1: title 19/700, subtitle 11/400 #A79E93, 13 above Weight trend. */}
      <div className="mb-[13px]">
        <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Health</p>
        <p className="mt-[3px] text-[11px] text-charcoal-tertiary">
          Weight and water are yours to log. {platformLabel} sync is coming.
        </p>
      </div>

      {/* HE1 #2 Weight trend. Hidden under recovery-sensitive (a safety
          setting), and held as a placeholder while that setting loads. */}
      {recoveryModePending && <NumberPlaceholder height={71} label="Weight trend" />}
      {!recoverySensitive && !recoveryModePending && (
        <HealthRow
          title="Weight trend"
          subtitle={
            metricValues.weight === null
              ? `${NO_READINGS} · ${emptyHint("weight")}`
              : `${formatMetric("weight", metricValues.weight)} kg${weightTrend ? ` · ${weightTrend}` : ""}`
          }
          fill={tint(LAV, 0.11)}
          tileFill={tint(LAV, 0.4)}
          glyph={<ScaleGlyph color={dark ? "rgb(var(--th-b7abde))" : "rgb(var(--th-7567b7))"} />}
          onClick={() =>
            metricValues.weight === null ? setAddMetricOpen(true) : openDetail(weightMeta, metricValues.weight)
          }
        />
      )}

      {/* HE1 #3–#9: "Today", 20 below Weight trend, rows 10 below it, 8 apart. */}
      <HealthSectionLabel className={recoverySensitive && !recoveryModePending ? "mb-2.5" : "mt-5 mb-2.5"}>Today</HealthSectionLabel>
      <div className="flex flex-col gap-2">
        {/* Steps: a solid teal tile; the week's bars (the Home graphic) only
            when there are readings, as the board notes. */}
        <HealthRow
          title="Steps"
          subtitle={metricValues.steps === null ? NO_READINGS : `${formatMetric("steps", metricValues.steps)} steps`}
          fill={tint(TEAL, 0.2)}
          tileFill={`rgb(${TEAL})`}
          glyph={
            stepsMeta.history.length > 0 ? (
              <StepBarsGlyph values={stepsMeta.history.map((h) => h.value)} max={stepsMax} />
            ) : undefined
          }
          onClick={() => openDetail(stepsMeta, metricValues.steps)}
        />
        <HealthRow
          title="Water"
          subtitle={`${(water / 1000).toFixed(1)} L of ${(waterGoalMl / 1000).toFixed(1)} L`}
          fill="rgba(143,192,232,0.17)"
          tileFill="rgba(143,192,232,0.4)"
          glyph={<BottleGlyph color={dark ? "rgb(var(--c-team-blue-ink))" : "#4A85C4"} capFill={dark ? "rgba(143,192,232,0.4)" : "#A5C6E6"} />}
          onClick={() => setWaterOpen(true)}
        />
        <HealthRow
          title="Sleep"
          subtitle={metricValues.sleepHours === null ? NO_READINGS : formatMetric("sleep", metricValues.sleepHours)}
          fill={tint(LAV, 0.13)}
          tileFill={`rgb(${LAV})`}
          onClick={() => openDetail(sleepMeta, metricValues.sleepHours)}
        />
        <HealthRow
          title="Calories burned"
          subtitle={
            metricValues.caloriesBurned === null
              ? NO_READINGS
              : `${formatMetric("caloriesBurned", metricValues.caloriesBurned)} kcal`
          }
          fill="rgba(217,164,65,0.14)"
          tileFill="#D9A441"
          glyph={<Flame size={18} strokeWidth={1.75} className="text-white" />}
          onClick={() => openDetail(caloriesMeta, metricValues.caloriesBurned)}
        />
        <HealthRow
          title="Heart rate"
          subtitle={
            metricValues.heartRate === null
              ? NO_READINGS
              : `${formatMetric("heartRate", metricValues.heartRate)} bpm resting`
          }
          fill="rgba(156,79,124,0.1)"
          tileFill="rgba(156,79,124,0.25)"
          glyph={<Heart size={38} strokeWidth={1.25} absoluteStrokeWidth style={{ color: dark ? "rgb(var(--c-team-rose-ink))" : "#9C4F7C" }} />}
          onClick={() => openDetail(heartRateMeta, metricValues.heartRate)}
        />
        <div>
          <HealthRow
            title="Blood pressure"
            subtitle={bpSubtitle}
            fill="rgba(74,61,160,0.08)"
            tileFill="#4A3DA0"
            onClick={() => {
              if (bpLatest) setBpDetailOpen(true);
              else {
                setBpEditing(null);
                setBpSheetOpen(true);
              }
            }}
          />
          {/* KEPT FOR SAFETY (no frame): the severe-reading alert and the
              monitoring / pregnancy flags on the latest reading. */}
          {bpSevere && (
            <p
              role="alert"
              // Mobile v5.1 R3, dark mode: danger #FF6B5E (5.7:1 on the 8% red tint over the dark card).
              className="mt-2 text-[11px] leading-[1.45] font-semibold rounded-xl px-2.5 py-2 text-[#7E1B15] dark:text-[#FF6B5E]"
              style={{ background: "rgba(164,35,28,0.08)" }}
            >
              {SEVERE_READING_MESSAGE}
            </p>
          )}
          {bpCheckFlag && <CheckFlagNote flag={bpCheckFlag} className="mt-2" />}
          {bpPregFlag && (
            <FlagNote tone={bpPregFlag.level} label={bpPregFlag.label} className="mt-2">
              <p className="mt-0.5 text-[11.5px] leading-[1.45] text-charcoal-soft">{bpPregFlag.text}</p>
            </FlagNote>
          )}
        </div>

        {/* KEPT (no frame), in the HE1 row style: the cycle tracker's way in
            (the only one, so its data stays reachable), its one-time
            question, the pregnancy guidance (safety), health checks and the
            advanced monitoring plan (safety). */}
        <TrackerQuestion />
        {cycleOffered && (cycleSettings?.trackerEnabled || pregnancy) && (() => {
          const accent = pregnancy ? PREGNANCY_COLOR : cyclePrediction ? PHASE_COLOR[cyclePrediction.phase] : "#AEA1DC";
          const nextIn =
            !pregnancy && cyclePrediction?.nextPeriodStart ? daysBetween(today, cyclePrediction.nextPeriodStart) : null;
          const g = pregnancy ? gestationOn(today, pregnancy) : null;
          return (
            <HealthRow
              title={pregnancy ? "Pregnancy" : "Cycle"}
              subtitle={
                pregnancy
                  ? g
                    ? `Week ${g.week} · trimester ${g.trimester}`
                    : "Being tracked"
                  : cyclePrediction
                    ? [
                        `${PHASE_LABEL[cyclePrediction.phase]}${cyclePrediction.cycleDay !== null ? ` · day ${cyclePrediction.cycleDay}` : ""}`,
                        // Decision 5 (MO11 frame): the next period, only when predicted.
                        nextIn !== null && nextIn >= 0
                          ? nextIn === 0
                            ? "next period expected today"
                            : `next period in about ${nextIn} ${nextIn === 1 ? "day" : "days"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")
                    : "Log a period to start"
              }
              fill={`${accent}14`}
              tileFill={accent}
              glyph={<Moon size={18} strokeWidth={1.75} className="text-white" />}
              onClick={() => navigate("/app/cycle")}
            />
          );
        })()}
        {pregnancy && <PregnancyHealthCard pregnancy={pregnancy} />}
        {(pregnancy ||
          screeningRows({
            age: user.age,
            sex: user.sex,
            bmi: bmiOf(user.heightCm, user.weightKg),
            recoverySensitive: recoverySensitive || recoveryModePending,
          }).length > 0) && (
          <HealthRow
            title={SCREENING_COPY.cardTitle}
            subtitle={SCREENING_COPY.cardSubtitle}
            fill="rgba(74,61,160,0.08)"
            tileFill="#4A3DA0"
            glyph={<ShieldCheck size={18} strokeWidth={1.75} className="text-white" />}
            onClick={() => navigate("/app/health/checks", { state: { plan: "general" } })}
          />
        )}
        {checkFlags.active && (
          <HealthRow
            title={CHECKS_COPY.planTitle}
            subtitle="Your monitoring plan"
            fill="rgba(74,61,160,0.08)"
            tileFill="#4A3DA0"
            glyph={<ClipboardList size={18} strokeWidth={1.75} className="text-white" />}
            onClick={() => navigate("/app/health/checks")}
          />
        )}
      </div>

      {/* HE1 #10–#11: "Records", 20 below the last row; both rows open the
          one Records sheet on their own tab. */}
      <HealthSectionLabel className="mt-5 mb-2.5">Records</HealthSectionLabel>
      <div className="flex flex-col gap-2">
        <HealthRow
          title="Biomarkers & labs"
          subtitle={biomarkersSubtitle}
          fill={tint(LAV, 0.16)}
          tileFill="rgb(var(--th-7d6bb5))"
          glyph={<Stethoscope size={18} strokeWidth={1.75} className="text-white" />}
          onClick={() => setRecordsTab("biomarkers")}
        />
        <HealthRow
          title="Imaging & history"
          subtitle="Medications, surgeries, conditions"
          fill={tint(TEAL, 0.18)}
          tileFill="rgb(var(--th-4f7f78))"
          glyph={<FileText size={18} strokeWidth={1.75} className="text-white" />}
          onClick={() => setRecordsTab("imaging")}
        />
      </div>

      {/* HE1 #12–#13: 16 below Records, one centred line, Flame 11 then 4
          to 9.5/400 #A79E93 (the frame's own disclaimer copy). */}
      <p className="mt-4 flex items-center justify-center gap-1 text-center text-[9.5px] leading-[14px] text-charcoal-tertiary">
        <Flame size={11} className="shrink-0" aria-hidden />
        <span>Health-data tracking, not a diagnosis. Always consult a professional.</span>
      </p>
      {/* KEPT (no frame): where the health guidance comes from (Task Y2). */}
      <button
        onClick={() => navigate("/app/health/sources")}
        className="tap mx-auto mb-3 flex items-center min-h-[44px] px-3 text-[9.5px] text-charcoal-tertiary underline underline-offset-2"
      >
        Sources and guidelines
      </button>

      <BottomSheet open={recordsOpen} onClose={() => setRecordsTab(null)} title="Records">
        {/* KEYED ON THE TAB, so the sheet remounts when it is opened from the
            other row. Without the key, initialTab is only the INITIAL value of
            a useState that already exists, and the second row would land
            wherever the first visit left off. */}
        <MedicalRecordsSection
          key={recordsTab ?? "closed"}
          initialTab={recordsTab ?? "biomarkers"}
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
      <AddMetricSheet open={addMetricOpen} onClose={() => setAddMetricOpen(false)} />
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
        current={detailMetric?.current ?? null}
        stepsGoal={stepsGoal}
        onEditStepsGoal={setStepsGoal}
      />
      <BiomarkerDetailSheet open={!!detailMarker} onClose={() => setDetailMarker(null)} marker={detailMarker} />
      <BloodPressureDetailSheet
        open={bpDetailOpen}
        onClose={() => setBpDetailOpen(false)}
        onAdd={() => {
          setBpEditing(null);
          setBpSheetOpen(true);
        }}
        onEdit={(reading) => {
          setBpEditing(reading);
          setBpSheetOpen(true);
        }}
      />
      <BloodPressureSheet
        open={bpSheetOpen}
        onClose={() => setBpSheetOpen(false)}
        editing={bpEditing}
        onSaved={reloadBloodPressure}
      />
    </div>
  );
}
