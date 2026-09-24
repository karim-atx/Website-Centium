import { useEffect, useMemo, useState } from "react";
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
import { BloodPressureSheet } from "../../components/health/BloodPressureSheet";
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
import { getTestRecommendations } from "../../utils/biomarkerRecommendations";
import { ChevronRight, Flame, Stethoscope, FileText } from "lucide-react";
import clsx from "clsx";
import type { BloodMarker, ImagingRecord } from "../../types";

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
    today,
    bloodMarkers,
    stepsGoal,
    setStepsGoal,
    recoverySensitive,
    imagingRecords,
  } = useApp();
  const testRecommendations = useMemo(() => getTestRecommendations(user), [user]);
  const platformLabel = detectPlatform() === "ios" ? "Apple Health" : "Android Health";
  const [waterOpen, setWaterOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [shareMarker, setShareMarker] = useState<BloodMarker | null>(null);
  const [detailMarker, setDetailMarker] = useState<BloodMarker | null>(null);
  const [shareAllOpen, setShareAllOpen] = useState(false);
  const [detailMetric, setDetailMetric] = useState<{ metric: MetricReadings; current: number } | null>(null);
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
  // not a fabricated example — falls back to a generic description when
  // nothing is currently flagged.
  const flaggedMarkers = bloodMarkers.filter((m) => m.status && m.status !== "normal").map((m) => m.name);
  const biomarkersSubtitle =
    flaggedMarkers.length > 0 ? `${flaggedMarkers.slice(0, 2).join(" and ")} suggested` : "Vitamins, minerals, panels";

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
  // Missing either height or a weight reading yields null, and the footer
  // says what to add rather than computing around the gap.
  const heightM = user.heightCm && user.heightCm > 0 ? user.heightCm / 100 : null;
  const bmiValue =
    heightM !== null && metricValues.weight !== null
      ? metricValues.weight / (heightM * heightM)
      : null;
  const bmi = bmiValue === null ? null : bmiValue.toFixed(1);
  // V7 (QA 7.0): standard WHO BMI bands, colored consistently with the
  // rest of the app's explicit (brand-independent) status colors.
  const bmiCategory =
    bmiValue === null
      ? null
      : bmiValue < 18.5
      ? { label: "Underweight", color: "#4C8FD1" }
      : bmiValue < 25
      ? { label: "Normal weight", color: "#3F9165" }
      : bmiValue < 30
      ? { label: "Overweight", color: "#D9A441" }
      : { label: "Obese", color: "#C0392B" };
  // Design refinement §6.3: "a proportional four-segment WHO band (flex
  // 1.85/0.65/0.5/1 = under/normal/over/obese, a linear 0–40 scale) with a
  // downward triangle marker pinned at the reading's position."
  const bmiBandPct = bmiValue === null ? 0 : Math.max(0, Math.min(100, (bmiValue / 40) * 100));

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

  const openDetail = (metric: MetricReadings, current: number) => setDetailMetric({ metric, current });

  // V8 (QA 8.0): "the widget directory for weight, steps and sleep should
  // redirect you to the detailed version" — Home links here with the
  // target metric in nav state so it opens straight into that sheet.
  const location = useLocation();
  const navigate = useNavigate();
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

  return (
    <div>
      {/* V7 (QA 7.0): the "+" quick water-log moved to the Home water
          widget — pressing it opens this same AddMetricSheet. */}
      <div className="mb-[13px]">
        <p className="text-[19px] font-bold tracking-[-0.03em] text-charcoal">Health</p>
        <p className="mt-[3px] text-[11px] text-charcoal-tertiary">
          Weight and water are yours to log. {platformLabel} sync is coming.
        </p>
      </div>

      {/* Iteration 6 "Team" §5 Health: weight-trend hero (same gradient as
          the Home streak board), BMI folded into its footer instead of a
          separate card. Hidden under recovery-sensitive exactly as the
          weight/BMI cards it replaces were. */}
      {/* NO HERO WITHOUT A WEIGHT. The card's whole content is a number, a
          trend and a sparkline; with nothing recorded it used to render
          106.4 kg, "↓ 0.6 kg this week" and a seven-point line, none of which
          had ever been measured. An account that has never weighed in gets an
          invitation instead. */}
      {!recoverySensitive && metricValues.weight === null && (
        <div className="rounded-[22px] px-[17px] py-4 mb-[13px] bg-cream-card border border-charcoal/[0.06]">
          <p className="text-[9px] font-bold tracking-[.2em] uppercase text-charcoal/[0.42]">Weight trend</p>
          <p className="mt-[9px] text-[15px] font-bold text-charcoal">{NO_READINGS}</p>
          <p className="mt-[5px] text-[11px] text-charcoal-tertiary">{emptyHint("weight")}</p>
        </div>
      )}
      {!recoverySensitive && metricValues.weight !== null && (
        <button
          onClick={() => openDetail(weightMeta, metricValues.weight as number)}
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
              {/* Only where there are two readings to compare. One weigh-in
                  has no direction, and "↓ 0 kg" over nothing is the a8499e4
                  bug in a different card. */}
              {trendLabel(weightMeta) && (
                <p className="mt-[5px] text-[10px] text-white/70">{trendLabel(weightMeta)}</p>
              )}
            </div>
            {canDrawSparkline(weightMeta) && (
              <svg viewBox="0 0 130 44" style={{ width: 148, height: 44, flex: "none", display: "block" }}>
                <polyline points={weightSparkPoints.join(" ")} fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                {weightSparkPoints.map((p) => (
                  <circle key={p} cx={p.split(",")[0]} cy={p.split(",")[1]} r={2.2} fill="#fff" />
                ))}
              </svg>
            )}
          </div>
          <div className="flex items-center gap-[11px] mt-[13px] pt-[11px] border-t border-white/[0.24]">
            <span className="shrink-0 text-[9px] font-bold tracking-[.2em] uppercase text-white/[0.62]">BMI</span>
            {bmi !== null && bmiCategory !== null ? (
              <>
                <span className="flex-1 min-w-0 block h-1 rounded-full bg-white/[0.26] overflow-hidden">
                  <span className="block h-full rounded-full bg-white" style={{ width: `${bmiBandPct}%` }} />
                </span>
                <span className="shrink-0 text-[11px] font-bold text-white whitespace-nowrap">
                  {bmi} · {bmiCategory.label.toLowerCase()}
                </span>
              </>
            ) : (
              // No band and no category, because both would be drawn from a
              // height this app does not know.
              <span className="flex-1 text-[11px] font-semibold text-white/[0.78]">
                Add your height in Profile to see your BMI
              </span>
            )}
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
          onClick={() => metricValues.steps !== null && openDetail(stepsMeta, metricValues.steps)}
          disabled={metricValues.steps === null}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left disabled:cursor-default"
          style={{ background: "rgba(162,200,194,.2)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-teal-ink/[0.72]">Steps</p>
          <p className="mt-[5px] text-[16px] font-extrabold tracking-[-0.03em] text-charcoal tabular-nums">
            {metricValues.steps === null ? (
              <span className="text-[11px] font-semibold text-charcoal-tertiary">{NO_READINGS}</span>
            ) : (
              formatMetric("steps", metricValues.steps)
            )}
          </p>
          <div className="flex items-end gap-[2px] h-[26px] mt-[9px]">
            {/* One bar per day that HAS a step count. The week used to be
                seven bars whatever the account had recorded. */}
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
          onClick={() => metricValues.sleepHours !== null && openDetail(sleepMeta, metricValues.sleepHours)}
          disabled={metricValues.sleepHours === null}
          className="tap flex-1 min-w-0 h-[114px] box-border rounded-[15px] px-3 py-[11px] flex flex-col text-left disabled:cursor-default"
          style={{ background: "rgba(174,161,220,.13)" }}
        >
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-primary-deep-text/[0.65]">Sleep</p>
          <p className="mt-[5px] text-[16px] font-extrabold tracking-[-0.03em] text-charcoal">
            {metricValues.sleepHours === null ? (
              <span className="text-[11px] font-semibold text-charcoal-tertiary">{NO_READINGS}</span>
            ) : (
              formatMetric("sleep", metricValues.sleepHours)
            )}
          </p>
          {/* THE HYPNOGRAM IS GONE. It was one fixed `d` attribute — the same
              five-step zigzag for every account and every night, drawn
              whether or not anything had been slept through. Real stage data
              lives in sleep_details and is drawn in the detail sheet; there
              is nothing to shrink into a 100×26 box until a night exists. */}
          <div className="flex-1 min-h-0" />
          {/* The week's average, over nights actually recorded. */}
          {averageOf(sleepMeta) !== null && (
            <p className="mt-[6px] text-[9px] text-primary-deep-text">
              {formatMetric("sleep", averageOf(sleepMeta) as number)} avg this week
            </p>
          )}
        </button>
      </div>

      {/* Calories burned isn't part of the canonical widget set and isn't
          shown in this handoff's Health frame at all — kept as its own
          untouched card rather than deleted, per "absence from the canvas
          means not in scope, never delete." */}
      <Card
        interactive={metricValues.caloriesBurned !== null}
        className="relative mb-[13px]"
        onClick={
          metricValues.caloriesBurned === null
            ? undefined
            : () => openDetail(caloriesMeta, metricValues.caloriesBurned as number)
        }
      >
        <div className="flex items-center justify-between mb-1">
          <p className="text-[11px] font-semibold text-charcoal-soft">Calories burned</p>
          <CalorieFlame size={13} />
        </div>
        {metricValues.caloriesBurned === null ? (
          <p className="text-[13px] font-semibold text-charcoal-tertiary">{NO_READINGS}</p>
        ) : (
          <>
            <p className="text-[24px] font-extrabold text-charcoal tracking-[-0.03em] tabular-nums">
              {formatMetric("caloriesBurned", metricValues.caloriesBurned)}
            </p>
            <p className="text-[11px] text-charcoal-faint mt-2">Estimated, incl. workouts</p>
          </>
        )}
      </Card>

      {/* Canonical Heart Rate large widget, reusing the Health page's own
          EKG component (see the identical note in HomeWidget.tsx — the
          manifest requires the two to mirror exactly, so they share one
          instance rather than two hand-built copies). */}
      <button
        onClick={() => metricValues.heartRate !== null && openDetail(heartRateMeta, metricValues.heartRate)}
        disabled={metricValues.heartRate === null}
        className="tap w-full box-border rounded-[15px] px-4 py-3.5 flex flex-col text-left mb-[13px] disabled:cursor-default"
        style={{ background: "rgba(156,79,124,.1)", height: metricValues.heartRate === null ? undefined : 150 }}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-[9px] font-bold tracking-[.16em] uppercase text-team-rose-ink/80">Heart rate</p>
          {metricValues.heartRate !== null && (
            <span className="text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap text-team-rose-ink bg-berry/[0.16]">Resting</span>
          )}
        </div>
        {metricValues.heartRate === null ? (
          // NO TRACE OVER NO PULSE. HeartRateEKG animates at the bpm it is
          // given, so an empty card used to draw a steady 68 for somebody
          // wearing nothing.
          <p className="mt-2 text-[13px] font-semibold text-charcoal-tertiary">{NO_READINGS}</p>
        ) : (
          <div className="flex-1 flex flex-col justify-between min-h-0 mt-[9px]">
            <div className="flex items-baseline gap-2">
              <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">
                {formatMetric("heartRate", metricValues.heartRate)}
              </span>
              <span className="text-[11px] font-bold text-team-rose-ink/80">bpm resting</span>
            </div>
            <HeartRateEKG bpm={metricValues.heartRate} />
          </div>
        )}
      </button>

      {/* Blood pressure, in the same large-card shape as heart rate above —
          the closest sibling on this page, and the pattern the brief names.
          Two numbers rather than one, so the category does the work the bpm
          figure does there. */}
      {(() => {
        const latest = bloodPressure[0] ?? null;
        if (!latest) {
          return (
            <button
              onClick={() => {
                setBpEditing(null);
                setBpSheetOpen(true);
              }}
              className="tap w-full box-border rounded-[15px] px-4 py-3.5 flex flex-col text-left mb-[13px]"
              style={{ background: "rgba(74,61,160,.08)" }}
            >
              <p className="text-[9px] font-bold tracking-[.16em] uppercase text-charcoal/[0.48]">
                Blood pressure
              </p>
              <p className="mt-2 text-[13px] font-semibold text-charcoal-tertiary">{BP_NO_READINGS}</p>
              <p className="mt-1 text-[11px] text-charcoal-faint">Tap to add one</p>
            </button>
          );
        }

        const category = classifyBloodPressure(latest.systolic, latest.diastolic);
        const week = bloodPressure.filter(
          (r) => new Date(r.recordedAt).getTime() >= Date.now() - 7 * 86400000
        );
        const weekAvg = averageReading(week);
        const severe = isSevere(latest.systolic, latest.diastolic);

        return (
          <button
            onClick={() => setBpDetailOpen(true)}
            className="tap w-full box-border rounded-[15px] px-4 py-3.5 flex flex-col text-left mb-[13px]"
            style={{ background: "rgba(74,61,160,.08)" }}
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-[9px] font-bold tracking-[.16em] uppercase text-charcoal/[0.48]">
                Blood pressure
              </p>
              {/* THE CATEGORY IN WORDS, not as a colour. The chip is tinted
                  too, but the label is what carries the meaning. */}
              <span
                className="text-[9.5px] font-bold rounded-full px-2 py-[3px] whitespace-nowrap"
                style={{ color: BP_CATEGORY_COLOR[category], background: `${BP_CATEGORY_COLOR[category]}1F` }}
              >
                {BP_CATEGORY_LABEL[category]}
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-[9px]">
              <span className="text-[30px] font-extrabold leading-none tracking-[-0.04em] text-charcoal tabular-nums">
                {latest.systolic}/{latest.diastolic}
              </span>
              <span className="text-[11px] font-bold text-charcoal-soft">mmHg</span>
            </div>
            <p className="mt-[7px] text-[10.5px] text-charcoal-faint">
              {relativeWhen(latest.recordedAt)}
              {latest.pulse != null && ` · ${latest.pulse} bpm`}
              {weekAvg && ` · 7-day avg ${weekAvg.systolic}/${weekAvg.diastolic}`}
            </p>
            {severe && (
              <p
                role="alert"
                className="mt-2.5 text-[11px] leading-[1.45] font-semibold rounded-xl px-2.5 py-2"
                style={{ background: "rgba(164,35,28,0.08)", color: "#7E1B15" }}
              >
                {SEVERE_READING_MESSAGE}
              </p>
            )}
          </button>
        );
      })()}

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
          onClick={() => setRecordsTab("biomarkers")}
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
          onClick={() => setRecordsTab("imaging")}
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
