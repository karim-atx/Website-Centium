import { SCREENING_COPY, bmiOf, screeningRows } from "../../services/health-checks/screening";
import { usePregnancyFlags } from "../../components/pregnancy/usePregnancyFlags";
import { FlagChip, FlagNote } from "../../components/ui/FlagNote";
import { HealthDisclaimer } from "../../components/ui/HealthDisclaimer";
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
import { HeartRateEKG } from "../../components/health/HeartRateEKG";
import { BloodPressureSheet } from "../../components/health/BloodPressureSheet";
import { PHASE_COLOR, PHASE_LABEL } from "../../services/cycle/guidance";
import { PregnancyHealthCard } from "../../components/pregnancy/PregnancyGuidance";
import { PREGNANCY_COLOR } from "../../components/pregnancy/PregnancyRing";
import { gestationOn } from "../../services/pregnancy";
import { daysBetween } from "../../services/cycle/hormones";
import { bmiApplies } from "../../services/pregnancy/weight";
import { BMI_NOT_USED } from "../../services/pregnancy/guidance";
import { BloodPressureDetailSheet } from "../../components/health/BloodPressureDetailSheet";
import type { BloodPressureReading } from "../../services/blood-pressure";
import { averageReading, classifyBloodPressure, isSevere } from "../../services/blood-pressure/classify";
import {
  BP_CATEGORY_COLOR,
  BP_CATEGORY_LABEL,
  BP_NO_READINGS,
  SEVERE_READING_MESSAGE,
} from "../../services/blood-pressure/guidance";
import { CalorieFlame } from "../../components/health/CalorieFlame";
import { detectPlatform } from "../../components/health/IntegrationsCard";
import {
  averageOf,
  canDrawSparkline,
  emptyHint,
  formatMetric,
  NO_READINGS,
  trendLabel,
  withinDays,
  type MetricReadings,
} from "../../services/health-metrics/series";
import { dayLetter } from "../../utils/week";
import { useApp } from "../../context/AppContext";
import { TrackerQuestion } from "../../components/cycle/TrackerQuestion";
import { Stethoscope, FileText, Moon, Heart, ClipboardList, ShieldCheck } from "lucide-react";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { HealthRow, HealthSectionLabel, ScaleGlyph, StepBarsGlyph, WaterCupGlyph } from "../../components/health/HealthRow";
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
    lastEndedPregnancy: recordedEndedPregnancy,
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
  const lastEndedPregnancy = cycleOffered ? recordedEndedPregnancy : null;
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

  // RESTORE ROUND 2 (user, 2026-10-07): BMI and the weight sparkline are back,
  // inside the HE1 Weight trend row (the band under the subtitle, the line
  // before the chevron), with main's logic unchanged below.
  //
  // BMI FROM THE USER'S OWN HEIGHT, and only when both halves exist.
  //
  // This read `const heightM = 1.78` — a literal, for everybody. BMI is a
  // ratio of two measurements and the app was supplying one of them, so the
  // figure was wrong for every user who is not 178 cm, and the WHO category
  // printed beside it — "normal weight", "obese" — was a health
  // classification derived from a number nobody had measured.
  //
  // profiles.height_cm has been read into user.heightCm all along and is
  // editable in Profile, so this is a substitution rather than new plumbing.
  // Missing either height or a weight reading yields null, and the row
  // says what to add rather than computing around the gap.
  //
  // AND NOT AT ALL DURING A PREGNANCY OR THE POSTPARTUM WINDOW. BMI is weight
  // over height squared; a pregnancy adds a baby, a placenta, fluid and half
  // as much blood again, and the WHO bands were never drawn for that body. The
  // number rises BECAUSE the pregnancy is going well, so printing it — and
  // calling it "overweight" — states something false to somebody who has no
  // reason to doubt it. bmiApplies() holds the rule and is unit-tested; the
  // figure that does apply to this body is the gain range in the Pregnancy
  // card, which BMI_NOT_USED points at.
  const showBmi = bmiApplies(
    {
      pregnancyActive: pregnancy !== null,
      postpartumUntil: lastEndedPregnancy?.postpartumUntil ?? null,
    },
    today
  );
  const heightM = user.heightCm && user.heightCm > 0 ? user.heightCm / 100 : null;
  const bmiValue =
    showBmi && heightM !== null && metricValues.weight !== null
      ? metricValues.weight / (heightM * heightM)
      : null;
  const bmi = bmiValue === null ? null : bmiValue.toFixed(1);
  // V7 (QA 7.0): standard WHO BMI bands.
  const bmiCategory =
    bmiValue === null
      ? null
      : bmiValue < 18.5
      ? "Underweight"
      : bmiValue < 25
      ? "Normal weight"
      : bmiValue < 30
      ? "Overweight"
      : "Obese";
  // Design refinement §6.3: the band is a linear 0–40 scale filled to the reading.
  const bmiBandPct = bmiValue === null ? 0 : Math.max(0, Math.min(100, (bmiValue / 40) * 100));

  // Iteration 6 "Team" §5 Health: the weight sparkline, real 7-day history
  // scaled into the dc.html's own 130×44 viewBox.
  const weightValues = weightMeta.history.map((h) => h.value);
  const weightMin = Math.min(...weightValues);
  const weightMax = Math.max(...weightValues);
  const weightSparkPoints = weightValues.map((v, i) => {
    const x = 4 + (i * (126 - 4)) / (weightValues.length - 1);
    const y = weightMax === weightMin ? 22 : 39 - ((v - weightMin) / (weightMax - weightMin)) * (39 - 12);
    return `${x},${y}`;
  });

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
  const bpCategory = bpLatest ? classifyBloodPressure(bpLatest.systolic, bpLatest.diastolic) : null;
  // Restore round 2 (user, 2026-10-07): main's "· N bpm" and "· 7-day avg S/D"
  // are back in the subtitle, over the readings of the last seven days.
  const bpWeekAvg = averageReading(
    bloodPressure.filter((r) => new Date(r.recordedAt).getTime() >= Date.now() - 7 * 86400000)
  );
  const bpSubtitle = bpLatest
    ? [
        `${bpLatest.systolic}/${bpLatest.diastolic} mmHg`,
        relativeWhen(bpLatest.recordedAt),
        bpLatest.pulse != null ? `${bpLatest.pulse} bpm` : null,
        // Non-breaking hyphen: the line never wraps as "7-" / "day".
        bpWeekAvg ? `7‑day avg ${bpWeekAvg.systolic}/${bpWeekAvg.diastolic}` : null,
      ]
        .filter(Boolean)
        .join(" · ")
    : `${BP_NO_READINGS} · Tap to add one`;
  // THE CATEGORY IN WORDS, not as a colour: main's tinted chip, beside the
  // reading. Light keeps main's BP_CATEGORY_COLOR; dark lifts each hue so the
  // 9.5 label stays readable on the dark card (the same hue, lighter).
  const BP_CHIP_DARK: Record<NonNullable<typeof bpCategory>, string> = {
    normal: "#7FC79E",
    elevated: "#D6CD6A",
    stage1: "#E3A851",
    stage2: "#F29466",
    severe: "#F28B82",
  };
  const bpChipColor = bpCategory ? (dark ? BP_CHIP_DARK[bpCategory] : BP_CATEGORY_COLOR[bpCategory]) : null;

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
          // Restore round 2 (user, 2026-10-07): main's 7-point sparkline, only
          // where there are enough readings to draw a line through, in the
          // scale glyph's colour.
          aside={
            metricValues.weight !== null && canDrawSparkline(weightMeta) ? (
              <svg viewBox="0 0 130 44" style={{ width: 74, height: 25, display: "block" }} aria-hidden>
                <polyline
                  points={weightSparkPoints.join(" ")}
                  fill="none"
                  stroke={dark ? "rgb(var(--th-b7abde))" : "rgb(var(--th-7567b7))"}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {weightSparkPoints.map((p) => (
                  <circle
                    key={p}
                    cx={p.split(",")[0]}
                    cy={p.split(",")[1]}
                    r={3.2}
                    fill={dark ? "rgb(var(--th-b7abde))" : "rgb(var(--th-7567b7))"}
                  />
                ))}
              </svg>
            ) : undefined
          }
          onClick={() =>
            metricValues.weight === null ? setAddMetricOpen(true) : openDetail(weightMeta, metricValues.weight)
          }
        >
          {/* Restore round 2: main's BMI footer, under the subtitle. Shown with
              a weight (as main's hero was); TWO DIFFERENT SILENCES otherwise —
              without a height the fix is in Profile; during a pregnancy or the
              postpartum window the number would be wrong, so it says why. */}
          {metricValues.weight !== null && (
            <span className="flex items-center gap-2 mt-[5px]">
              <span className="shrink-0 text-[10px] font-semibold leading-[13px] uppercase text-charcoal-faint">BMI</span>
              {bmi !== null && bmiCategory !== null ? (
                <>
                  <span className="flex-1 min-w-0 block h-1 rounded-full overflow-hidden" style={{ background: tint(LAV, 0.3) }}>
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${bmiBandPct}%`,
                        background: dark ? "rgb(var(--th-b7abde))" : "rgb(var(--th-7567b7))",
                      }}
                    />
                  </span>
                  <span className="shrink-0 text-[11px] font-semibold leading-[13px] text-charcoal whitespace-nowrap">
                    {bmi} · {bmiCategory.toLowerCase()}
                  </span>
                </>
              ) : (
                <span className="flex-1 text-[11px] leading-[14px] text-charcoal-soft">
                  {!showBmi ? BMI_NOT_USED : "Add your height in Profile to see your BMI"}
                </span>
              )}
            </span>
          )}
        </HealthRow>
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
          // Dark: the same teal, translucent on the card (no light islands).
          tileFill={dark ? tint(TEAL, 0.45) : `rgb(${TEAL})`}
          glyph={
            stepsMeta.history.length > 0 ? (
              <StepBarsGlyph
                values={stepsMeta.history.map((h) => h.value)}
                letters={stepsMeta.history.map((h) => dayLetter(h.date))}
                max={stepsMax}
              />
            ) : undefined
          }
          onClick={() => openDetail(stepsMeta, metricValues.steps)}
        />
        <HealthRow
          title="Water"
          subtitle={`${(water / 1000).toFixed(1)} L of ${(waterGoalMl / 1000).toFixed(1)} L`}
          fill="rgba(143,192,232,0.17)"
          tileFill="rgba(143,192,232,0.4)"
          glyph={<WaterCupGlyph fraction={water / waterGoalMl} stroke={dark ? "rgb(var(--c-team-blue-ink))" : "#5E8BB3"} />}
          onClick={() => setWaterOpen(true)}
        />
        <HealthRow
          title="Sleep"
          // Restore round 2 (user, 2026-10-07): main's "X avg this week", over
          // nights actually recorded, only when there is an average.
          subtitle={[
            metricValues.sleepHours === null ? NO_READINGS : formatMetric("sleep", metricValues.sleepHours),
            averageOf(sleepMeta) !== null ? `${formatMetric("sleep", averageOf(sleepMeta) as number)} avg this week` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
          fill={tint(LAV, 0.13)}
          tileFill={dark ? tint(LAV, 0.45) : `rgb(${LAV})`}
          onClick={() => openDetail(sleepMeta, metricValues.sleepHours)}
        />
        <HealthRow
          title="Calories burned"
          subtitle={
            metricValues.caloriesBurned === null
              ? NO_READINGS
              : // Restore round 2: main's "Estimated, incl. workouts", with a value.
                `${formatMetric("caloriesBurned", metricValues.caloriesBurned)} kcal · Estimated, incl. workouts`
          }
          fill="rgba(217,164,65,0.14)"
          tileFill={dark ? "rgba(217,164,65,0.5)" : "#D9A441"}
          // Restore round 2 (user, 2026-10-07): main's moving flame (1.6s
          // flicker, 2.4s ember glow), white on the gold tile with a warm
          // pale glow so both layers show against it.
          glyph={<CalorieFlame size={18} className="text-white" glow="rgba(255,240,214,0.75)" />}
          onClick={() => openDetail(caloriesMeta, metricValues.caloriesBurned)}
        />
        <HealthRow
          title="Heart rate"
          subtitle={
            metricValues.heartRate === null
              ? NO_READINGS
              : // The "Resting" pill beside it says resting; not twice.
                `${formatMetric("heartRate", metricValues.heartRate)} bpm`
          }
          fill="rgba(156,79,124,0.1)"
          tileFill="rgba(156,79,124,0.25)"
          glyph={<Heart size={38} strokeWidth={1.25} absoluteStrokeWidth style={{ color: dark ? "rgb(var(--c-team-rose-ink))" : "#9C4F7C" }} />}
          // Restore round 2 (user, 2026-10-07): main's "Resting" pill and the
          // EKG trace at the reading's rate. NO TRACE OVER NO PULSE: the
          // trace animates at the bpm it is given, so nothing is drawn empty.
          aside={
            metricValues.heartRate !== null ? (
              <span className="text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap text-team-rose-ink bg-berry/[0.16]">
                Resting
              </span>
            ) : undefined
          }
          onClick={() => openDetail(heartRateMeta, metricValues.heartRate)}
        >
          {metricValues.heartRate !== null && (
            <span className="block mt-1.5">
              <HeartRateEKG bpm={metricValues.heartRate} />
            </span>
          )}
        </HealthRow>
        <div>
          <HealthRow
            title="Blood pressure"
            subtitle={bpSubtitle}
            fill="rgba(74,61,160,0.08)"
            tileFill="#4A3DA0"
            // Restore round 2 (user, 2026-10-07): main's chip in the header
            // place — during a pregnancy its own level (FlagChip), otherwise
            // the category, tinted, in words.
            aside={
              !bpLatest ? undefined : bpInPregnancy ? (
                bpPregFlag ? <FlagChip tone={bpPregFlag.level} label={bpPregFlag.label} /> : undefined
              ) : bpCategory && bpChipColor ? (
                <span
                  className="text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap"
                  style={{ color: bpChipColor, background: `${bpChipColor}1F` }}
                >
                  {BP_CATEGORY_LABEL[bpCategory]}
                </span>
              ) : undefined
            }
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

      {/* Restore round 2 (user, 2026-10-07): the app-wide HealthDisclaimer
          (Task Y2) is back in place of the frame's shorter line, 16 below
          Records as the frame spaces it. */}
      <HealthDisclaimer className="mt-4 mb-1.5" />
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
