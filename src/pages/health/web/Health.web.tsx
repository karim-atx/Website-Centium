import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardCheck, ClipboardList, ClipboardPlus, Droplet, Eye, Flame, Footprints, Gauge, HeartPulse, Microscope, Moon, Plus } from "lucide-react";
import { SCREENING_COPY, bmiOf, screeningRows } from "../../../services/health-checks/screening";
import { usePregnancyFlags } from "../../../components/pregnancy/usePregnancyFlags";
import { PregnancyHealthCard } from "../../../components/pregnancy/PregnancyGuidance";
import { classifyBloodPressure, isSevere } from "../../../services/blood-pressure/classify";
import { bpCategoryWord, SEVERE_READING_MESSAGE } from "../../../services/blood-pressure/guidance";
import { BP_DISCUSS_TEXT, COPY as CHECKS_COPY, FLAG_LABEL, FLAG_TEXT } from "../../../services/health-checks/guidance";
import { HEALTH_DISCLAIMER } from "../../../services/legal/disclaimer";
import { averageOf, formatMetric, withinDays, type MetricReadings } from "../../../services/health-metrics/series";
import { useApp } from "../../../context/AppContext";
import { useOnline } from "../../../hooks/useOnline";
import { TrackerQuestion } from "../../../components/cycle/TrackerQuestion";
import { AddMetricSheet } from "../../../components/health/AddMetricSheet";
import { useCheckFlags } from "../../../components/health-checks/useCheckFlags";
import { BpWaveMini, CaloriesGaugeMini, EcgMini, SleepArcMini, StepsArcMini, WaterBottleMini, WeightJourneyStrip } from "../../../components/health/widgetGraphics";
import { HealthSafetyCard } from "../../../components/health/HealthSafetyCard";
import { CycleCalendarIcon, WeightScaleIcon } from "../../../components/icons/PartBIcons";
import { clock12, rangeClock12 } from "../../../utils/time12";
import { fetchLinkedProfessionals } from "../../../services/consent";
import { getMyCarePlan, type MyCarePlan } from "../../../services/care-plan";
import { fromLine, shortDay } from "../../../services/care-plan/logic";
import { activityByDay, localDay, syncState, useActivityDaily, useActivityHourly, useHealthSources, useDrinks, useMetricRows, useSleepSessions, whenText } from "../../../services/health-metrics/b1";
import { OFFLINE_CACHED, useMetricsLoad } from "../../../components/health/metric/MetricKit";
import type { MetricKey } from "../../../components/health/MetricWidget";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { appLocale } from "../../../i18n/format";
import { t, tk } from "../../../i18n/core";
import { HealthWebBody, HealthWebHeader, PatternLayer, WebCaps, type PatternLayerSpec } from "./HealthWebKit";
import { useActivityStepsOn } from "../../../components/dashboard/widgets/data";
import { stepsOfDay } from "../../../services/health-metrics/stepsRule";
import { valueOn } from "../../../services/health-metrics/periods";

// Website viewport v1 · WC-HE Health overview (WC-HE Health Web v5, screens
// "overview" and "overview-empty"). The page header carries the title, the
// sync line with Sources and the 96 × 40 + (Add Metric); "Today" is a 12
// column grid (8 at the rail) of the metric widgets, 3 columns each (4 at the
// rail) and Weight trend 6 (8), on two rows that share the page's height (four
// at the rail); at the rail each widget is compact (label left, number right,
// graphic below). Health records sit two to a row, then the disclaimer and
// Sources and guidelines. Data, rules, kept states and copy are the mobile
// page's (pages/health/Health.tsx): this file reads the same sources.

const METRIC_ROUTE: Record<MetricReadings["type"], string> = {
  water: "/app/health/water",
  steps: "/app/health/steps",
  sleep: "/app/health/sleep",
  caloriesBurned: "/app/health/calories",
  heartRate: "/app/health/heart-rate",
  weight: "/app/health/weight",
};

const hm = (hours: number) => {
  const total = Math.round(hours * 60);
  return t("{h}h {m}m", { h: Math.floor(total / 60), m: total % 60 });
};

const NO_DEVICE = tk("No device connected");

const joinAnd = (names: string[]) =>
  names.length > 1 ? t("{items} and {last}", { items: names.slice(0, -1).join(t(", ")), last: names[names.length - 1] }) : names[0];

// The widget identity patterns (repo public/hero/w-*.svg) at the mobile
// widget's scale: a 175 × 173.7 widget over a 172 × 150 file (1.158).
const SW = 1.158;
const widgetPattern = (k: MetricKey, dark: boolean): PatternLayerSpec[] => {
  const f = (n: string) => `/hero/w-${n}${dark ? "-dark" : ""}.svg`;
  switch (k) {
    case "water":
      return [{ src: f("water"), vw: 172, vh: 150, s: SW, cw: 168, a: "x-bottom" }];
    case "steps":
      return [{ src: f("steps"), vw: 172, vh: 150, s: SW, a: "bl" }];
    case "sleep":
      return [{ src: f("sleep"), vw: 172, vh: 150, s: SW, a: "all" }];
    case "calories":
      return [{ src: f("cal"), vw: 172, vh: 150, s: SW, a: "x-bottom" }];
    case "heart-rate":
      return [{ src: f("hr"), vw: 172, vh: 150, s: SW, cw: 150, a: "all" }];
    case "blood-pressure":
      return [{ src: f("bp"), vw: 172, vh: 150, s: SW, a: "br" }];
    default:
      return [{ src: f("wt"), vw: 358, vh: 150, s: 1.091, cw: 50, a: "x-bottom" }];
  }
};
const WIDGET_MASK = "radial-gradient(ellipse 46% 40% at 50% 52%, transparent 55%, #000 100%)";

interface WidgetSpec {
  metric: MetricKey;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties }>;
  label: string;
  value?: string;
  unit?: string;
  /** The mobile widget graphic, drawn at its own size and scaled. */
  graphic?: React.ReactNode;
  /** Graphic scale at 1440 and at the rail. */
  k: [number, number];
  /** Graphic row height at 1440 (40 × k; Weight 24). */
  gh: number;
  context?: React.ReactNode;
  hint: string;
  loading?: boolean;
  span: [number, number];
  ariaLabel: string;
  onClick: () => void;
}

export default function HealthWeb() {
  const {
    user,
    waterByDate,
    waterGoalMl,
    metricValues,
    healthSeries,
    metricsLoadedAt,
    bloodPressure,
    pregnancy: recordedPregnancy,
    cycleSettings,
    cycleOffered,
    today,
    stepsGoal,
    recoverySensitive,
    recoveryModePending,
    nutritionGoal,
    theme,
    accessibility,
    bloodMarkers,
  } = useApp();
  const dark = theme === "dark";
  const hc = !!accessibility.highContrast;
  const { rail } = useWebLayout();
  const flaggedMarkers = bloodMarkers.filter((m) => m.status && m.status !== "normal").map((m) => m.name);
  const biomarkersSubtitle = flaggedMarkers.length > 0 ? t("{markers} suggested", { markers: joinAnd(flaggedMarkers.slice(0, 2)) }) : undefined;
  const online = useOnline();
  const metricsLoad = useMetricsLoad();
  const pregnancy = cycleOffered ? recordedPregnancy : null;
  const navigate = useNavigate();
  const location = useLocation();
  const checkFlags = useCheckFlags();
  const pregnancyFlags = usePregnancyFlags();
  const [addMetricOpen, setAddMetricOpen] = useState(false);

  useEffect(() => {
    const navState = location.state as { openMetric?: MetricReadings["type"]; openRecords?: boolean } | null;
    if (navState?.openRecords) {
      navigate("/app/health/records#biomarkers", { replace: true });
      return;
    }
    if (navState?.openMetric && METRIC_ROUTE[navState.openMetric]) navigate(METRIC_ROUTE[navState.openMetric], { replace: true });
  }, [location.state, navigate]);

  const [sharesWithSomeone, setSharesWithSomeone] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (user.accountType !== "customer") return;
    void fetchLinkedProfessionals().then((r) => {
      if (!cancelled && r.status === "ok") setSharesWithSomeone(r.professionals.length > 0);
    });
    return () => {
      cancelled = true;
    };
  }, [user.accountType]);

  const [carePlan, setCarePlan] = useState<MyCarePlan | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (user.accountType !== "customer") return;
    void getMyCarePlan().then((r) => {
      if (!cancelled && r.ok) setCarePlan(r.plan);
    });
    return () => {
      cancelled = true;
    };
  }, [user.accountType]);
  const carePlanSubtitle = carePlan
    ? carePlan.nextFollowUp
      ? t("From {who} · next review {date}", { who: fromLine(carePlan.professionalName, carePlan.professionalRole, carePlan.roleIsSpecialty), date: shortDay(carePlan.nextFollowUp.dueOn) })
      : t("From {who}", { who: fromLine(carePlan.professionalName, carePlan.professionalRole, carePlan.roleIsSpecialty) })
    : undefined;

  const go = (path: string) => navigate(path);

  const { data: sources } = useHealthSources();
  const syncLine = (() => {
    if (sources.length === 0) return t(NO_DEVICE);
    const off = sources.find((x) => syncState(x) === "access_off");
    if (off) return t("{name} access is off. Turn it on", { name: off.name });
    if (sources.some((x) => syncState(x) === "error")) return t("Couldn't sync. Try again");
    const latest = sources.map((x) => x.lastSyncedAt).filter((x): x is string => !!x).sort().pop();
    const names = sources.map((x) => (x.provider === "whoop" ? "Whoop" : x.name));
    const list = joinAnd(names);
    return latest ? t("Synced {when} from {list}", { when: localDay(latest) === today ? clock12(latest) : whenText(latest, today), list }) : t("Connected: {list}", { list });
  })();
  const week = (type: MetricReadings["type"]) => withinDays(healthSeries[type], 7, today);

  const drinksToday = useDrinks(today, today).data;
  const waterToday = drinksToday.length ? drinksToday.reduce((s, k) => s + k.ml, 0) : waterByDate[today] ?? 0;
  const waterL = (waterToday / 1000).toFixed(1);
  const goalL = (waterGoalMl / 1000).toFixed(1);
  // Today's steps by the one rule (stepsRule, Round J follow-up): hand-logged,
  // else synced (activity_daily), so a Health Connect-only member sees theirs;
  // a day with neither keeps the latest hand-logged reading, as before.
  const syncedStepsToday = useActivityStepsOn(today, metricsLoadedAt);
  const steps = stepsOfDay(valueOn(healthSeries.steps, today), syncedStepsToday) ?? metricValues.steps;
  const sleep = metricValues.sleepHours;
  const sleepAvg = averageOf(week("sleep"));
  const lastNight = useSleepSessions(today, today).data.find((x) => !x.isNap && x.bedStart && x.wakeEnd) ?? null;
  const sleepContext = lastNight ? rangeClock12(lastNight.bedStart as string, lastNight.wakeEnd as string) : sleepAvg === null ? undefined : t("{time} avg this week", { time: hm(sleepAvg) });
  const KCAL_GOAL = 2600;
  const kcal = metricValues.caloriesBurned;
  const hideKcal = recoverySensitive || recoveryModePending;
  const hrSamples = useMetricRows("heart_rate", today, today).data;
  const restingToday = activityByDay(useActivityDaily(today, today).data)[today]?.restingBpm ?? null;
  const restSample = [...hrSamples].reverse().find((r) => r.context === "rest")?.value ?? null;
  const resting = restingToday ?? restSample;
  const hr = resting ?? metricValues.heartRate;
  const hrWord = resting !== null ? t("resting") : t("latest");
  // Round J (DB-Z4): synced heart rate is hourly (min, average, max), not samples;
  // each synced hour adds its min and max to the day's range.
  const hrHours = useActivityHourly(today).data;
  const hrVals = [...hrSamples.map((r) => r.value), ...hrHours.flatMap((h) => (h.hrAvg === null ? [] : [h.hrMin ?? h.hrAvg, h.hrMax ?? h.hrAvg]))];
  const hrRange = hrVals.length > 1 ? t("{low} to {high}", { low: Math.round(Math.min(...hrVals)), high: Math.round(Math.max(...hrVals)) }) : null;

  const bpLatest = bloodPressure[0] ?? null;
  const bpInPregnancy = pregnancyFlags.replacesBpBands;
  const bpPregFlag = bpLatest ? pregnancyFlags.bp(bpLatest) : null;
  const bpSevere = !!bpLatest && !bpInPregnancy && isSevere(bpLatest.systolic, bpLatest.diastolic);
  const bpCheckFlag = bpLatest && !bpInPregnancy ? checkFlags.bp(bpLatest) : null;
  const bpCategory = bpLatest && !bpInPregnancy ? classifyBloodPressure(bpLatest.systolic, bpLatest.diastolic) : null;
  const IN_RANGE = dark ? "#6DC08A" : "#357A4D";
  const OUT_RANGE = dark ? "#E8837C" : "#C2453F";
  const bpWord = bpInPregnancy
    ? bpPregFlag
      ? { text: bpPregFlag.label, color: OUT_RANGE }
      : null
    : bpCategory
      ? { text: bpCategoryWord(bpCategory), color: bpCategory === "normal" ? IN_RANGE : OUT_RANGE }
      : null;

  const weight = metricValues.weight;
  const weightHistory = healthSeries.weight.history;
  const startKg = weightHistory.length ? weightHistory[0].value : null;
  const goalKg = nutritionGoal.desiredWeightKg ?? null;
  const journey = weight === null || startKg === null || goalKg === null || startKg === goalKg ? null : Math.max(0, Math.min(1, (startKg - weight) / (startKg - goalKg)));
  const weightContext = (() => {
    if (weight === null) return null;
    const parts: string[] = [];
    if (startKg !== null && weightHistory.length > 1) {
      const d = weight - startKg;
      parts.push(t("{arrow} {n} kg since start", { arrow: d > 0 ? "↑" : "↓", n: Math.abs(d).toFixed(1) }));
    }
    if (goalKg !== null) parts.push(t("{n} kg to goal", { n: Math.abs(weight - goalKg).toFixed(1) }));
    return parts.length ? parts.join(" · ") : null;
  })();

  const showChecks =
    !!pregnancy ||
    screeningRows({ age: user.age, sex: user.sex, bmi: bmiOf(user.heightCm, user.weightKg), recoverySensitive: recoverySensitive || recoveryModePending }).length > 0;
  const showCycle = cycleOffered && (cycleSettings?.trackerEnabled || !!pregnancy);
  const loading = metricsLoad.loading;

  // Spans: Calories burned hidden leaves Blood pressure on a row of its own
  // half (or the whole row once Weight trend is hidden too), so no row ends
  // in a hole.
  const weightShown = !recoverySensitive;
  const bpSpan: [number, number] = !hideKcal ? [3, 4] : weightShown ? [6, 8] : [12, 8];

  const widgets: (WidgetSpec | null)[] = [
    {
      metric: "water",
      icon: Droplet,
      label: t("Water"),
      value: waterToday > 0 ? waterL : undefined,
      unit: "L",
      graphic: <WaterBottleMini fraction={waterToday / waterGoalMl} dark={dark} />,
      k: [1.4, 0.6],
      gh: 56,
      context: t("of {n} L goal", { n: goalL }),
      hint: t("Click + to log a drink"),
      loading,
      span: [3, 4],
      ariaLabel: t("Water, {n} of {goal} litres today", { n: waterL, goal: goalL }),
      onClick: () => go("/app/health/water"),
    },
    {
      metric: "steps",
      icon: Footprints,
      label: t("Steps"),
      value: steps === null ? undefined : formatMetric("steps", steps),
      graphic: steps === null ? undefined : <StepsArcMini fraction={steps / stepsGoal} dark={dark} />,
      k: [1.4, 0.7],
      gh: 56,
      context: t("of {n} steps", { n: stepsGoal.toLocaleString(appLocale()) }),
      hint: t(NO_DEVICE),
      loading,
      span: [3, 4],
      ariaLabel: steps === null ? t("Steps, no readings yet") : t("Steps, {n} of {goal}", { n: formatMetric("steps", steps), goal: stepsGoal.toLocaleString(appLocale()) }),
      onClick: () => go("/app/health/steps"),
    },
    {
      metric: "sleep",
      icon: Moon,
      label: t("Sleep"),
      value: sleep === null ? undefined : hm(sleep),
      graphic: sleep === null ? undefined : <SleepArcMini dark={dark} />,
      k: [1.4, 0.7],
      gh: 56,
      context: sleepContext,
      hint: t(NO_DEVICE),
      loading,
      span: [3, 4],
      ariaLabel: sleep === null ? t("Sleep, no readings yet") : t("Sleep, {time}", { time: hm(sleep) }),
      onClick: () => go("/app/health/sleep"),
    },
    hideKcal
      ? null
      : {
          metric: "calories",
          icon: Flame,
          label: t("Calories burned"),
          value: kcal === null ? undefined : formatMetric("caloriesBurned", kcal),
          unit: "kcal",
          graphic: kcal === null ? undefined : <CaloriesGaugeMini fraction={kcal / KCAL_GOAL} dark={dark} />,
          k: [1.4, 0.7],
          gh: 56,
          context: t("of {n} kcal", { n: KCAL_GOAL.toLocaleString(appLocale()) }),
          hint: t(NO_DEVICE),
          loading,
          span: [3, 4],
          ariaLabel:
            kcal === null
              ? t("Calories burned, no readings yet")
              : t("Calories burned, {n} of {goal} kilocalories", { n: formatMetric("caloriesBurned", kcal), goal: KCAL_GOAL.toLocaleString(appLocale()) }),
          onClick: () => go("/app/health/calories"),
        },
    {
      metric: "heart-rate",
      icon: HeartPulse,
      label: t("Heart rate"),
      value: hr === null ? undefined : formatMetric("heartRate", hr),
      unit: "bpm",
      graphic: hr === null ? undefined : <EcgMini bpm={hr} />,
      k: [1.4, 0.7],
      gh: 56,
      context: hrRange ? `${hrWord} · ${hrRange}` : hrWord,
      hint: t(NO_DEVICE),
      loading,
      span: [3, 4],
      ariaLabel:
        hr === null
          ? t("Heart rate, no readings yet")
          : resting !== null
            ? t("Heart rate, {n} beats per minute, resting", { n: formatMetric("heartRate", hr) })
            : t("Heart rate, {n} beats per minute, latest reading", { n: formatMetric("heartRate", hr) }),
      onClick: () => go("/app/health/heart-rate"),
    },
    {
      metric: "blood-pressure",
      icon: Gauge,
      label: t("Blood pressure"),
      value: bpLatest ? `${bpLatest.systolic}/${bpLatest.diastolic}` : undefined,
      graphic: bpLatest ? <BpWaveMini /> : undefined,
      k: [1.4, 0.7],
      gh: 56,
      context: bpLatest ? (
        <>
          {t("mmHg")}
          {bpWord && (
            <>
              {" · "}
              <span style={{ color: bpWord.color }}>{bpWord.text}</span>
            </>
          )}
          {` · ${clock12(bpLatest.recordedAt)}`}
        </>
      ) : undefined,
      hint: t("Click to add one"),
      span: bpSpan,
      ariaLabel: bpLatest
        ? bpWord
          ? t("Blood pressure, {sys} over {dia}, {category}, at {time}", { sys: bpLatest.systolic, dia: bpLatest.diastolic, category: bpWord.text, time: clock12(bpLatest.recordedAt) })
          : t("Blood pressure, {sys} over {dia}, at {time}", { sys: bpLatest.systolic, dia: bpLatest.diastolic, time: clock12(bpLatest.recordedAt) })
        : t("Blood pressure, no readings yet"),
      onClick: () => go("/app/health/blood-pressure"),
    },
    weightShown
      ? {
          metric: "weight",
          icon: WeightScaleIcon,
          label: t("Weight trend"),
          value: weight === null ? undefined : formatMetric("weight", weight),
          unit: "kg",
          graphic: weight === null ? undefined : <WeightJourneyStrip fraction={journey} dark={dark} hc={hc} />,
          k: [1.8, 1.3],
          gh: 24,
          context: weightContext ?? undefined,
          hint: t("Log your weight to start tracking"),
          loading: loading || recoveryModePending,
          span: [6, 8],
          ariaLabel:
            weight === null
              ? t("Weight trend, no readings yet")
              : weightContext
                ? t("Weight trend, {n} kilograms, {context}", { n: formatMetric("weight", weight), context: weightContext })
                : t("Weight trend, {n} kilograms", { n: formatMetric("weight", weight) }),
          onClick: () => go("/app/health/weight"),
        }
      : null,
  ];
  const shown = widgets.filter((w): w is WidgetSpec => w !== null);
  const cols = rail ? 8 : 12;
  const rows = Math.ceil(shown.reduce((s, w) => s + w.span[rail ? 1 : 0], 0) / cols);

  const safety = (
    <>
      {bpSevere && <HealthSafetyCard tone="alert" text={SEVERE_READING_MESSAGE} onSeeReadings={() => go("/app/health/blood-pressure")} />}
      {bpPregFlag && (
        <HealthSafetyCard
          tone={bpPregFlag.level === "urgent" ? "alert" : bpPregFlag.level === "soon" ? "soon" : "note"}
          title={bpPregFlag.label}
          text={bpPregFlag.text}
          onSeeReadings={() => go("/app/health/blood-pressure")}
        />
      )}
      {bpCheckFlag && (
        <HealthSafetyCard
          tone={bpCheckFlag.level === "urgent" ? "alert" : "note"}
          title={FLAG_LABEL[bpCheckFlag.level]}
          text={bpCheckFlag.bloodPressure && bpCheckFlag.level === "discuss" ? BP_DISCUSS_TEXT : FLAG_TEXT[bpCheckFlag.level]}
          onSeeReadings={() => go("/app/health/blood-pressure")}
        />
      )}
    </>
  );
  const hasSafety = bpSevere || !!bpPregFlag || !!bpCheckFlag;

  return (
    <div className="flex flex-col bg-white" style={{ minHeight: "100dvh" }} data-web-page="health">
      <HealthWebHeader
        title={t("Health")}
        beside={
          <p className="min-w-0 whitespace-nowrap overflow-hidden text-ellipsis" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
            {online ? syncLine : t(OFFLINE_CACHED)}
            {online && (
              <>
                {" · "}
                <button type="button" onClick={() => go("/app/settings/devices")} className="hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ fontWeight: 700, color: "#7D6BB5" }}>
                  {t("Sources")}
                </button>
              </>
            )}
          </p>
        }
        actions={
          <button
            type="button"
            onClick={() => setAddMetricOpen(true)}
            aria-label={t("Add metric")}
            title={t("Add metric")}
            className="shrink-0 flex items-center justify-center transition-transform hover:scale-[0.98] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D6BB5]"
            style={{ width: 96, height: 40, borderRadius: 12, background: hc && !dark ? "#5B48B8" : "#AEA1DC", boxShadow: "0 16px 40px rgba(125,107,181,0.4)" }}
          >
            <Plus size={20} color="#FFFFFF" aria-hidden />
          </button>
        }
      />

      <HealthWebBody className="flex-1" style={{ minHeight: 0 }}>
        <div className="flex-1 flex flex-col" style={{ minHeight: 0, gap: 12 }}>
          {metricsLoad.error && online && (
            <div role="alert" className="flex items-center justify-between" style={{ borderRadius: 12, padding: "4px 4px 4px 12px", gap: 8, background: "#FBE7E4" }}>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" }}>{t("Couldn't load your health data.")}</span>
              <button type="button" onClick={metricsLoad.retry} className="hover:underline" style={{ minHeight: 40, padding: "0 12px", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#C0392B" }}>
                {t("Retry")}
              </button>
            </div>
          )}
          <WebCaps as="h2">{t("Today")}</WebCaps>
          <div
            className="flex-1"
            data-health-grid
            style={{
              minHeight: 0,
              display: "grid",
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${rows}, minmax(${rail ? 90 : 240}px, 1fr))`,
              gap: 24,
            }}
          >
            {shown.map((w) => (
              <HealthWidget key={w.metric} spec={w} rail={rail} dark={dark} />
            ))}
          </div>
          {hasSafety && (
            <div className="grid" style={{ gridTemplateColumns: rail ? "minmax(0,1fr)" : "repeat(2, minmax(0,1fr))", gap: 24 }}>
              {safety}
            </div>
          )}
          {pregnancy && <PregnancyHealthCard pregnancy={pregnancy} />}

          <WebCaps as="h2" style={{ marginTop: 12 }}>
            {t("Health records")}
          </WebCaps>
          <TrackerQuestion variant="health" />
          <div className="grid shrink-0" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 24 }}>
            {showChecks && <RecordRow icon={<ClipboardCheck size={24} strokeWidth={1.5} />} title={t(SCREENING_COPY.cardTitle)} onClick={() => navigate("/app/health/checks", { state: { plan: "general" } })} />}
            {checkFlags.active && <RecordRow icon={<ClipboardList size={24} strokeWidth={1.5} />} title={CHECKS_COPY.planTitle} onClick={() => go("/app/health/checks")} />}
            <RecordRow icon={<Microscope size={24} strokeWidth={1.5} />} title={t("Biomarkers & imaging")} subtitle={biomarkersSubtitle} onClick={() => go("/app/health/records#biomarkers")} />
            {carePlan && <RecordRow icon={<ClipboardPlus size={24} strokeWidth={1.5} />} title={t("Your care plan")} subtitle={carePlanSubtitle} onClick={() => go("/app/health/care-plan")} />}
            {showCycle && <RecordRow icon={<CycleCalendarIcon size={24} />} title={pregnancy ? t("Pregnancy") : t("Cycle tracking")} onClick={() => go("/app/cycle")} />}
            <RecordRow
              icon={<Eye size={24} strokeWidth={1.5} />}
              title={sharesWithSomeone === false ? t("Only you can see your health data.") : t("Who can see your health data")}
              onClick={() => go("/app/profile")}
            />
          </div>
          <div className="shrink-0 flex flex-col items-center text-center" style={{ gap: 2, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>{t(HEALTH_DISCLAIMER)}</p>
            <button type="button" onClick={() => go("/app/health/sources")} className="underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
              {t("Sources and guidelines")}
            </button>
          </div>
        </div>
      </HealthWebBody>

      <AddMetricSheet open={addMetricOpen} onClose={() => setAddMetricOpen(false)} />
    </div>
  );
}

/** Text ink per metric (the widget's label and context), light theme. */
const ink = (m: MetricKey) => `rgb(var(--metric-${m}-ink))`;
const accent = (m: MetricKey) => `rgb(var(--metric-${m}-accent))`;

/**
 * One widget. 1440: r20 in the metric tint, pad 18 20; the header (36 r11
 * #FFFFFF@80% tile with a 20 icon, the 13/20 700 .12em caps label, chevron
 * 16); centred below it the 40/48 600 value with its 17 unit, the graphic
 * scaled 1.4 and the 13/20 600 context line. Rail: pad 12 16, a 28 r9 tile
 * with a 16 icon, the 26/28 value at the end of the header row, the graphic
 * at the bottom start and the context at the bottom end. Empty: "No readings
 * yet" (17/24 700, rail 15/20) and the hint. Hover 0.98, press 0.96.
 */
const HealthWidget: React.FC<{ spec: WidgetSpec; rail: boolean; dark: boolean }> = ({ spec: w, rail, dark }) => {
  const has = w.value !== undefined && !w.loading;
  const none = !has && !w.loading;
  const k = rail ? w.k[1] : w.k[0];
  const Icon = w.icon;
  const gfx = w.graphic ? <span style={{ display: "inline-flex", zoom: k }}>{w.graphic}</span> : null;
  const skeleton = (
    <span className="flex flex-col items-center" style={{ gap: 8 }} aria-hidden>
      <span className="block animate-skeleton-pulse" style={{ width: 120, height: 24, borderRadius: 6, background: "rgba(255,255,255,0.6)" }} />
      <span className="block animate-skeleton-pulse" style={{ width: 80, height: 12, borderRadius: 6, background: "rgba(255,255,255,0.6)" }} />
    </span>
  );
  return (
    <button
      type="button"
      onClick={w.onClick}
      aria-label={w.ariaLabel}
      data-widget={w.metric}
      className="relative overflow-hidden flex flex-col text-start transition-transform duration-150 hover:scale-[0.98] active:scale-[0.96] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#7D6BB5]"
      style={{
        gridColumn: `span ${rail ? w.span[1] : w.span[0]}`,
        minWidth: 0,
        minHeight: 0,
        borderRadius: 20,
        background: `rgb(var(--metric-${w.metric}-tint))`,
        padding: rail ? "12px 16px" : "18px 20px",
        boxSizing: "border-box",
        transitionTimingFunction: "cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <PatternLayer layers={widgetPattern(w.metric, dark)} mask={WIDGET_MASK} />
      {!rail ? (
        <>
          <span className="relative flex items-center w-full" style={{ gap: 10 }}>
            <span className="grid place-items-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: "rgba(255,255,255,0.8)" }}>
              <Icon size={20} strokeWidth={1.5} style={{ color: accent(w.metric) }} />
            </span>
            <span className="flex-1 min-w-0 uppercase whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".12em", color: ink(w.metric) }}>
              {w.label}
            </span>
            <ChevronRight size={16} className="shrink-0" style={{ color: "#71685E" }} aria-hidden />
          </span>
          <span className="relative flex-1 flex flex-col items-center justify-center text-center w-full" style={{ minHeight: 0, gap: has ? 10 : 4 }}>
            {w.loading && skeleton}
            {has && (
              <>
                <span className="flex items-baseline whitespace-nowrap" style={{ gap: 4 }}>
                  <span style={{ fontSize: 40, lineHeight: "48px", fontWeight: 600, letterSpacing: "-1.2px", fontVariantNumeric: "tabular-nums", color: "#241F1B" }}>{w.value}</span>
                  {w.unit && <span style={{ fontSize: 17, fontWeight: 600, color: ink(w.metric) }}>{w.unit}</span>}
                </span>
                <span className="flex justify-center items-center w-full" style={{ minHeight: w.gh }}>
                  {gfx}
                </span>
                {w.context && (
                  <span className="whitespace-nowrap max-w-full overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: ink(w.metric) }}>
                    {w.context}
                  </span>
                )}
              </>
            )}
            {none && (
              <>
                <span className="whitespace-nowrap" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
                  {t("No readings yet")}
                </span>
                <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: ink(w.metric) }}>{w.hint}</span>
              </>
            )}
          </span>
        </>
      ) : (
        <span className="relative flex-1 w-full" style={{ minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gridTemplateRows: "auto minmax(0,1fr)", columnGap: 12, rowGap: 12 }}>
          <span className="min-w-0 flex items-center" style={{ gap: 10 }}>
            <span className="grid place-items-center shrink-0" style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(255,255,255,0.8)" }}>
              <Icon size={16} strokeWidth={1.5} style={{ color: accent(w.metric) }} />
            </span>
            <span className="uppercase whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".12em", color: ink(w.metric) }}>
              {w.label}
            </span>
          </span>
          <span className="flex items-center" style={{ justifySelf: "end", gap: 12 }}>
            {has && (
              <span className="flex items-baseline whitespace-nowrap" style={{ gap: 4 }}>
                <span style={{ fontSize: 26, lineHeight: "28px", fontWeight: 600, letterSpacing: "-0.8px", fontVariantNumeric: "tabular-nums", color: "#241F1B" }}>{w.value}</span>
                {w.unit && <span style={{ fontSize: 13, fontWeight: 600, color: ink(w.metric) }}>{w.unit}</span>}
              </span>
            )}
            <ChevronRight size={16} className="shrink-0" style={{ color: "#71685E" }} aria-hidden />
          </span>
          <span className="min-w-0 flex items-end" style={{ alignSelf: "end" }}>
            {has && gfx}
            {none && (
              <span className="whitespace-nowrap" style={{ fontSize: 15, lineHeight: "20px", fontWeight: 700, color: "#241F1B" }}>
                {t("No readings yet")}
              </span>
            )}
            {w.loading && <span className="block animate-skeleton-pulse" aria-hidden style={{ width: 96, height: 16, borderRadius: 6, background: "rgba(255,255,255,0.6)" }} />}
          </span>
          <span className="min-w-0 text-end" style={{ alignSelf: "end", justifySelf: "end" }}>
            {has && w.context && (
              <span className="block whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: ink(w.metric) }}>
                {w.context}
              </span>
            )}
            {none && (
              <span className="block whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: ink(w.metric) }}>
                {w.hint}
              </span>
            )}
          </span>
        </span>
      )}
    </button>
  );
};

/**
 * A Health records row: min 72, r18, white with the 0.5px hairline, pad 12 44
 * 12 12; a 48 r14 #F0EDF9 tile with a 24 icon #7D6BB5; title 17/24 600, an
 * optional 13/20 #8C8378 line; chevron 16 at 16 from the end; hover #FAFAFB.
 */
const RecordRow: React.FC<{ icon: React.ReactNode; title: string; subtitle?: string; onClick: () => void }> = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative w-full flex items-center text-start hover:bg-[#FAFAFB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ minHeight: 72, borderRadius: 18, background: "#FFFFFF", border: "0.5px solid rgba(36,31,27,0.08)", paddingBlock: 12, paddingInline: "12px 44px", gap: 14, boxSizing: "border-box" }}
  >
    <span className="shrink-0 grid place-items-center" style={{ width: 48, height: 48, borderRadius: 14, background: "#F0EDF9", color: "#7D6BB5" }} aria-hidden>
      {icon}
    </span>
    <span className="flex-1 min-w-0">
      <span className="block" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
        {title}
      </span>
      {subtitle && (
        <span className="block" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
          {subtitle}
        </span>
      )}
    </span>
    <ChevronRight size={16} aria-hidden className="absolute" style={{ insetInlineEnd: 16, top: "50%", marginTop: -8, color: "#71685E" }} />
  </button>
);
