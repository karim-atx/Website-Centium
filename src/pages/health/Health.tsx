import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronRight, ClipboardCheck, ClipboardList, Droplet, Eye, Flame, Footprints, Gauge, HeartPulse, Microscope, Moon, Plus } from "lucide-react";
import { SCREENING_COPY, bmiOf, screeningRows } from "../../services/health-checks/screening";
import { usePregnancyFlags } from "../../components/pregnancy/usePregnancyFlags";
import { HealthDisclaimer } from "../../components/ui/HealthDisclaimer";
import { PregnancyHealthCard } from "../../components/pregnancy/PregnancyGuidance";
import { classifyBloodPressure, isSevere } from "../../services/blood-pressure/classify";
import { BP_CATEGORY_LABEL, SEVERE_READING_MESSAGE } from "../../services/blood-pressure/guidance";
import { BP_DISCUSS_TEXT, COPY as CHECKS_COPY, FLAG_LABEL, FLAG_TEXT } from "../../services/health-checks/guidance";
import { averageOf, formatMetric, withinDays, type MetricReadings } from "../../services/health-metrics/series";
import { useApp } from "../../context/AppContext";
import { useOnline } from "../../hooks/useOnline";
import { TrackerQuestion } from "../../components/cycle/TrackerQuestion";
import { AddMetricSheet } from "../../components/health/AddMetricSheet";
import { useCheckFlags } from "../../components/health-checks/useCheckFlags";
import { MetricWidget } from "../../components/health/MetricWidget";
import {
  BpWaveMini,
  CaloriesGaugeMini,
  EcgMini,
  SleepArcMini,
  StepsArcMini,
  WaterBottleMini,
  WeightJourneyStrip,
} from "../../components/health/widgetGraphics";
import { HealthSafetyCard } from "../../components/health/HealthSafetyCard";
import { CycleCalendarIcon, WeightScaleIcon } from "../../components/icons/PartBIcons";
import { textPx, linePx } from "../../theme/textSize";
import { clock12, rangeClock12 } from "../../utils/time12";
import { fetchLinkedProfessionals } from "../../services/consent";
import { activityByDay, localDay, syncState, useActivityDaily, useHealthSources, useDrinks, useMetricRows, useSleepSessions, whenText } from "../../services/health-metrics/b1";
import { OFFLINE_CACHED, hairline, useHealthMode, useMetricsLoad } from "../../components/health/metric/MetricKit";

// HE1 · Health (v6 Part B, health-handover.md HE1; checklist
// design-handover/v5-partB/frame-check/HE1.md). Replaces the History-style
// rows (HealthRow) with the 2-per-row metric widgets (MetricWidget, preset
// "health"), the Health records rows, the sharing row, the disclaimer and
// the floating + (HO1.1 Add metric). Each widget opens its full page
// (/app/health/<metric>, HE1.1-HE1.7); nothing opens a sheet any more.
//
// KEPT (no frame), each restyled into the new layout: the severe BP alert,
// the pregnancy and monitoring flags (HealthSafetyCard under the HR/BP row),
// recovery-sensitive hiding of Weight trend, the tracker question, the cycle
// or pregnancy row, the pregnancy guidance card, health checks in a
// pregnancy and the monitoring plan row. BMI moved to HE1.7 (V6-06).
//
// THE PULL-TO-SYNC GESTURE STAYS GONE (S9 NATIVE): a gesture that reports a
// sync that did not happen is worse than no gesture. On the web nothing is
// synced, so the sync line says so ("No device connected").

/** HE1 widget → its page, with the opening range from the HE1 interactions (S1). */
const METRIC_ROUTE: Record<MetricReadings["type"], string> = {
  water: "/app/health/water",
  steps: "/app/health/steps",
  sleep: "/app/health/sleep",
  caloriesBurned: "/app/health/calories",
  heartRate: "/app/health/heart-rate",
  weight: "/app/health/weight",
};

/** "6h 56m" (HE1 #31): the widget's own duration format. */
const hm = (hours: number) => {
  const total = Math.round(hours * 60);
  return `${Math.floor(total / 60)}h ${total % 60}m`;
};

const NO_DEVICE = "No device connected";

export default function Health() {
  const {
    user,
    waterByDate,
    waterGoalMl,
    metricValues,
    healthSeries,
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
  } = useApp();
  const dark = theme === "dark";
  const hc = !!accessibility.highContrast;
  const online = useOnline();
  // O1 / O2: the health_metrics read state (AppContext), never a null value.
  const metricsLoad = useMetricsLoad();
  const ld = (s: "ready" | "empty") => (metricsLoad.loading ? ("loading" as const) : s);
  // MO11: a profile not offered the cycle section sees no cycle or
  // pregnancy content here — filtered at render, nothing is changed.
  const pregnancy = cycleOffered ? recordedPregnancy : null;
  const navigate = useNavigate();
  const location = useLocation();
  const checkFlags = useCheckFlags();
  const pregnancyFlags = usePregnancyFlags();

  const [addMetricOpen, setAddMetricOpen] = useState(false);
  // K19: deep links. Home (and Add metric's "Add Records") used to open a
  // sheet here through nav state; they now land on the metric's page.
  useEffect(() => {
    const navState = location.state as { openMetric?: MetricReadings["type"]; openRecords?: boolean } | null;
    if (navState?.openRecords) {
      navigate("/app/health/records#biomarkers", { replace: true });
      return;
    }
    if (navState?.openMetric && METRIC_ROUTE[navState.openMetric]) {
      navigate(METRIC_ROUTE[navState.openMetric], { replace: true });
    }
  }, [location.state, navigate]);

  // S6 / D-H9 (V6-134): the sharing row's title. Nobody connected → "Only you
  // can see your health data." Read from the real relationships.
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

  const go = (path: string) => navigate(path);

  // #2 sync line (HA-01, Database B1 health_integrations): "Synced 8:40 AM
  // from Apple Health and Whoop"; access off "<Source> access is off. Turn it
  // on"; a failed sync "Couldn't sync. Try again"; nothing connected (the web
  // today) "No device connected". "Sources" follows each.
  const { data: sources } = useHealthSources();
  const syncLine = (() => {
    if (sources.length === 0) return NO_DEVICE;
    const off = sources.find((x) => syncState(x) === "access_off");
    if (off) return `${off.name} access is off. Turn it on`;
    if (sources.some((x) => syncState(x) === "error")) return "Couldn't sync. Try again";
    const latest = sources.map((x) => x.lastSyncedAt).filter((x): x is string => !!x).sort().pop();
    const names = sources.map((x) => (x.provider === "whoop" ? "Whoop" : x.name));
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0];
    return latest ? `Synced ${localDay(latest) === today ? clock12(latest) : whenText(latest, today)} from ${list}` : `Connected: ${list}`;
  })();
  const week = (type: MetricReadings["type"]) => withinDays(healthSeries[type], 7, today);

  // --- Water (#5-#16): today's total of the goal; the bottle and bar fill to it (K6).
  // B1 water_intakes: today's drinks (a backfilled row is a day total); a
  // day with no rows falls back to the health_metrics day total (two-phase).
  const drinksToday = useDrinks(today, today).data;
  const waterToday = drinksToday.length ? drinksToday.reduce((s, k) => s + k.ml, 0) : waterByDate[today] ?? 0;
  const waterL = (waterToday / 1000).toFixed(1);
  const goalL = (waterGoalMl / 1000).toFixed(1);

  // --- Steps (#17-#25): of the step goal (follows HE1.2.1 Save).
  const steps = metricValues.steps;
  // --- Sleep (#26-#34): bed/wake times need PB-H-07 (B-stage); until then the
  // kept weekly average (K9) is the context line.
  const sleep = metricValues.sleepHours;
  const sleepAvg = averageOf(week("sleep"));
  // HA-06 (Database B1 sleep_details.bed_start / wake_end): last night's times
  // when a source recorded them; the weekly average otherwise (K9).
  const lastNight = useSleepSessions(today, today).data.find((x) => !x.isNap && x.bedStart && x.wakeEnd) ?? null;
  const sleepContext = lastNight ? rangeClock12(lastNight.bedStart as string, lastNight.wakeEnd as string) : sleepAvg === null ? undefined : `${hm(sleepAvg)} avg this week`;
  // --- Calories burned (#35-#44): of the 2,600 kcal app constant.
  const KCAL_GOAL = 2600;
  const kcal = metricValues.caloriesBurned;
  // --- Heart rate (#45-#54): "resting · low to high" for today's readings.
  // Resting (HA-08, Database B1): activity_daily.resting_bpm for today, else a
  // reading marked context = rest; without either the latest reading,
  // labelled "latest" (V6-21). Never a rhythm label (V6-07). Day low to high
  // from today's samples (health_metrics keeps every sample).
  const hrSamples = useMetricRows("heart_rate", today, today).data;
  const restingToday = activityByDay(useActivityDaily(today, today).data)[today]?.restingBpm ?? null;
  const restSample = [...hrSamples].reverse().find((r) => r.context === "rest")?.value ?? null;
  const resting = restingToday ?? restSample;
  const hr = resting ?? metricValues.heartRate;
  const hrWord = resting !== null ? "resting" : "latest";
  const hrVals = hrSamples.map((r) => r.value);
  const hrRange = hrVals.length > 1 ? `${Math.round(Math.min(...hrVals))} to ${Math.round(Math.max(...hrVals))}` : null;

  // --- Blood pressure (#55-#64) and the safety card (K1-K3, K8).
  const bpLatest = bloodPressure[0] ?? null;
  const bpInPregnancy = pregnancyFlags.replacesBpBands;
  const bpPregFlag = bpLatest ? pregnancyFlags.bp(bpLatest) : null;
  const bpSevere = !!bpLatest && !bpInPregnancy && isSevere(bpLatest.systolic, bpLatest.diastolic);
  const bpCheckFlag = bpLatest && !bpInPregnancy ? checkFlags.bp(bpLatest) : null;
  const bpCategory = bpLatest && !bpInPregnancy ? classifyBloodPressure(bpLatest.systolic, bpLatest.diastolic) : null;
  // Range colours (fixed): Normal #357A4D (dark #6DC08A); every other
  // category and the pregnancy levels #C2453F (dark #E8837C). Words unchanged.
  const IN_RANGE = dark ? "#6DC08A" : "#357A4D";
  const OUT_RANGE = dark ? "#E8837C" : "#C2453F";
  const bpWord = bpInPregnancy
    ? bpPregFlag
      ? { text: bpPregFlag.label, color: OUT_RANGE }
      : null
    : bpCategory
      ? { text: BP_CATEGORY_LABEL[bpCategory], color: bpCategory === "normal" ? IN_RANGE : OUT_RANGE }
      : null;

  // --- Weight trend (#65-#78): start = the first weigh-in on record (in the
  // metric window), goal = nutrition goal's desired weight.
  const weight = metricValues.weight;
  const weightHistory = healthSeries.weight.history;
  const startKg = weightHistory.length ? weightHistory[0].value : null;
  const goalKg = nutritionGoal.desiredWeightKg ?? null;
  const journey =
    weight === null || startKg === null || goalKg === null || startKg === goalKg
      ? null
      : Math.max(0, Math.min(1, (startKg - weight) / (startKg - goalKg)));
  const weightContext = (() => {
    if (weight === null) return null;
    const parts: string[] = [];
    if (startKg !== null && weightHistory.length > 1) {
      const d = weight - startKg;
      parts.push(`${d > 0 ? "↑" : "↓"} ${Math.abs(d).toFixed(1)} kg since start`);
    }
    if (goalKg !== null) parts.push(`${Math.abs(weight - goalKg).toFixed(1)} kg to goal`);
    return parts.length ? parts.join(" · ") : null;
  })();

  // Health records rows (#79-#83, K14, K16, K17).
  const showChecks =
    !!pregnancy ||
    screeningRows({
      age: user.age,
      sex: user.sex,
      bmi: bmiOf(user.heightCm, user.weightKg),
      recoverySensitive: recoverySensitive || recoveryModePending,
    }).length > 0;
  const showCycle = cycleOffered && (cycleSettings?.trackerEnabled || !!pregnancy);

  // Ink helpers.
  const primaryText = hc && !dark ? "#4B3BA0" : dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))";

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* #1-#3: title 19/28.5 700 ls-0.6; sync line 11/16.5 400 #5B5349 (dark
          #B8B3C7), m-top 3, with "Sources" 11/16.5 700 #7D6BB5 (dark #C3B3FB)
          → MO1.8 Devices. Web (decided): "No device connected · Sources". */}
      <h1 style={{ fontSize: textPx(19), lineHeight: linePx(28.5), fontWeight: 700, letterSpacing: -0.6, color: "rgb(var(--c-charcoal))" }}>Health</h1>
      <p style={{ marginTop: 3, fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 400, color: "rgb(var(--c-charcoal-soft))" }}>
        {online ? syncLine : OFFLINE_CACHED}
        {online && (
          <>
            {" · "}
            <button
              type="button"
              onClick={() => go("/app/settings/devices")}
              className="tap relative inline before:absolute before:-inset-y-[14px] before:-inset-x-2 before:content-['']"
              style={{ fontWeight: 700, color: primaryText }}
            >
              Sources
            </button>
          </>
        )}
      </p>

      {/* O2 (OURS-health-loading-error-offline #5): banner under the title,
          #FBE7E4 r12 (dark #3C2A30 / #F09A8E); the widgets keep their last values. */}
      {metricsLoad.error && online && (
        <div
          role="alert"
          className="flex items-center justify-between"
          style={{ marginTop: 10, borderRadius: 12, padding: "4px 4px 4px 12px", gap: 8, background: dark ? "#3C2A30" : "#FBE7E4" }}
        >
          <span style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 600, color: dark ? "#F09A8E" : "#C0392B" }}>Couldn't load your health data.</span>
          <button
            type="button"
            onClick={metricsLoad.retry}
            className="tap min-h-[44px] px-2"
            style={{ fontSize: textPx(12), lineHeight: linePx(18), fontWeight: 700, color: dark ? "#F09A8E" : "#C0392B" }}
          >
            Retry
          </button>
        </div>
      )}

      <SectionCaps style={{ marginTop: 14 }}>Today</SectionCaps>

      <div className="grid grid-cols-2 items-stretch" style={{ gap: 8 }}>
        <MetricWidget
          preset="health"
          metric="water"
          icon={Droplet}
          label="Water"
          value={waterL}
          unit="L"
          graphic={<WaterBottleMini fraction={waterToday / waterGoalMl} dark={dark} />}
          context={`of ${goalL} L goal`}
          state={ld(waterToday > 0 ? "ready" : "empty")}
          emptyHint="Tap + to log a drink"
          ariaLabel={`Water, ${waterL} of ${goalL} litres today`}
          onClick={() => go("/app/health/water")}
        />
        <MetricWidget
          preset="health"
          metric="steps"
          icon={Footprints}
          label="Steps"
          value={steps === null ? undefined : formatMetric("steps", steps)}
          graphic={steps === null ? undefined : <StepsArcMini fraction={steps / stepsGoal} dark={dark} />}
          context={`of ${stepsGoal.toLocaleString()} steps`}
          state={ld(steps === null ? "empty" : "ready")}
          emptyHint={NO_DEVICE}
          ariaLabel={steps === null ? "Steps, no readings yet" : `Steps, ${formatMetric("steps", steps)} of ${stepsGoal.toLocaleString()}`}
          onClick={() => go("/app/health/steps")}
        />
        <MetricWidget
          preset="health"
          metric="sleep"
          icon={Moon}
          label="Sleep"
          value={sleep === null ? undefined : hm(sleep)}
          graphic={sleep === null ? undefined : <SleepArcMini dark={dark} />}
          context={sleepContext}
          state={ld(sleep === null ? "empty" : "ready")}
          emptyHint={NO_DEVICE}
          ariaLabel={sleep === null ? "Sleep, no readings yet" : `Sleep, ${hm(sleep)}`}
          onClick={() => go("/app/health/sleep")}
        />
        <MetricWidget
          preset="health"
          metric="calories"
          icon={Flame}
          label="Calories burned"
          value={kcal === null ? undefined : formatMetric("caloriesBurned", kcal)}
          unit="kcal"
          graphic={kcal === null ? undefined : <CaloriesGaugeMini fraction={kcal / KCAL_GOAL} dark={dark} />}
          context={`of ${KCAL_GOAL.toLocaleString()} kcal`}
          state={ld(kcal === null ? "empty" : "ready")}
          emptyHint={NO_DEVICE}
          ariaLabel={kcal === null ? "Calories burned, no readings yet" : `Calories burned, ${formatMetric("caloriesBurned", kcal)} of ${KCAL_GOAL.toLocaleString()} kilocalories`}
          onClick={() => go("/app/health/calories")}
        />
        <MetricWidget
          preset="health"
          metric="heart-rate"
          icon={HeartPulse}
          label="Heart rate"
          value={hr === null ? undefined : formatMetric("heartRate", hr)}
          unit="bpm"
          graphic={hr === null ? undefined : <EcgMini bpm={hr} />}
          context={hrRange ? `${hrWord} · ${hrRange}` : hrWord}
          state={ld(hr === null ? "empty" : "ready")}
          emptyHint={NO_DEVICE}
          ariaLabel={hr === null ? "Heart rate, no readings yet" : `Heart rate, ${formatMetric("heartRate", hr)} beats per minute, ${hrWord === "resting" ? "resting" : "latest reading"}`}
          onClick={() => go("/app/health/heart-rate")}
        />
        <MetricWidget
          preset="health"
          metric="blood-pressure"
          icon={Gauge}
          label="Blood pressure"
          value={bpLatest ? `${bpLatest.systolic}/${bpLatest.diastolic}` : undefined}
          graphic={bpLatest ? <BpWaveMini /> : undefined}
          context={
            bpLatest ? (
              <>
                {"mmHg · "}
                {bpWord && (
                  <>
                    <span style={{ color: bpWord.color }}>{bpWord.text}</span>
                    {" · "}
                  </>
                )}
                {clock12(bpLatest.recordedAt)}
              </>
            ) : undefined
          }
          state={bpLatest ? "ready" : "empty"}
          emptyHint="Tap to add one"
          ariaLabel={
            bpLatest
              ? `Blood pressure, ${bpLatest.systolic} over ${bpLatest.diastolic}${bpWord ? `, ${bpWord.text}` : ""}, at ${clock12(bpLatest.recordedAt)}`
              : "Blood pressure, no readings yet"
          }
          onClick={() => go("/app/health/blood-pressure")}
        />

        {/* K1-K3 (OURS-health-he1-safety-card): one card per active item,
            severe (adult) or the pregnancy level first, then the check flag. */}
        {bpSevere && <HealthSafetyCard tone="alert" text={SEVERE_READING_MESSAGE} onSeeReadings={() => go("/app/health/blood-pressure")} />}
        {bpPregFlag && (
          <HealthSafetyCard
            tone={bpPregFlag.level === "urgent" ? "alert" : "note"}
            title={bpPregFlag.label}
            text={bpPregFlag.text}
            onSeeReadings={() => go("/app/health/blood-pressure")}
          />
        )}
        {bpCheckFlag && (
          <HealthSafetyCard
            tone="note"
            title={FLAG_LABEL[bpCheckFlag.level]}
            text={bpCheckFlag.bloodPressure && bpCheckFlag.level === "discuss" ? BP_DISCUSS_TEXT : FLAG_TEXT[bpCheckFlag.level]}
            onSeeReadings={() => go("/app/health/blood-pressure")}
          />
        )}

        {/* #65-#78 Weight trend, full width. K5: hidden under recovery-
            sensitive mode, a neutral 358 x 163.7 r15 skeleton while that
            setting loads. */}
        {recoveryModePending ? (
          <div className="col-span-2 animate-skeleton-pulse" aria-label="Weight trend" style={{ height: 163.7, borderRadius: 15, background: dark ? "#1C1F28" : "#F5F5F6" }} />
        ) : (
          !recoverySensitive && (
            <MetricWidget
              preset="health"
              size="large"
              metric="weight"
              className="col-span-2"
              icon={WeightScaleIcon}
              label="Weight trend"
              value={weight === null ? undefined : formatMetric("weight", weight)}
              unit="kg"
              graphic={weight === null ? undefined : <WeightJourneyStrip fraction={journey} dark={dark} hc={hc} />}
              graphicHeight={24}
              context={weightContext ?? undefined}
              state={ld(weight === null ? "empty" : "ready")}
              emptyHint="Log your weight to start tracking"
              ariaLabel={weight === null ? "Weight trend, no readings yet" : `Weight trend, ${formatMetric("weight", weight)} kilograms${weightContext ? `, ${weightContext}` : ""}`}
              onClick={() => go("/app/health/weight")}
            />
          )
        )}
      </div>

      {/* K15: the pregnancy guidance card, full width between the widgets and
          Health records, while a pregnancy is active. */}
      {pregnancy && (
        <div style={{ marginTop: 8 }}>
          <PregnancyHealthCard pregnancy={pregnancy} />
        </div>
      )}

      <SectionCaps style={{ marginTop: 20 }}>Health records</SectionCaps>
      {/* K13: the one-time tracker question, above the rows, while unanswered. */}
      <TrackerQuestion tile className="mb-2" />
      <div className="flex flex-col" style={{ gap: 8 }}>
        {showChecks && <RecordRow icon={<ClipboardCheck size={21} strokeWidth={1.5} />} title={SCREENING_COPY.cardTitle} onClick={() => navigate("/app/health/checks", { state: { plan: "general" } })} />}
        {/* K17 (OURS-health-advanced-monitoring-entry): only while the plan
            is active; its title is the plan's own (never the mode's name). */}
        {checkFlags.active && <RecordRow icon={<ClipboardList size={21} strokeWidth={1.5} />} title={CHECKS_COPY.planTitle} onClick={() => go("/app/health/checks")} />}
        <RecordRow icon={<Microscope size={21} strokeWidth={1.5} />} title="Biomarkers & imaging" onClick={() => go("/app/health/records#biomarkers")} />
        {/* K14: the tracker's way in; "Pregnancy" during a pregnancy (V6-135). */}
        {showCycle && <RecordRow icon={<CycleCalendarIcon size={21} />} title={pregnancy ? "Pregnancy" : "Cycle tracking"} onClick={() => go("/app/cycle")} />}
        {/* #84-#88: who can see the data → Profile › Connected professionals. */}
        <RecordRow
          radius={16}
          icon={<Eye size={17} strokeWidth={1.5} />}
          title={sharesWithSomeone === false ? "Only you can see your health data." : "Who can see your health data"}
          onClick={() => go("/app/profile")}
        />
      </div>

      {/* #89-#90: the app-wide disclaimer (HEALTH_DISCLAIMER, word for word)
          and the kept Sources page (V6-111). */}
      <HealthDisclaimer className="mt-[18px]" />
      <div className="flex justify-center" style={{ marginTop: 4 }}>
        <button
          type="button"
          onClick={() => go("/app/health/sources")}
          className="tap relative underline underline-offset-2 before:absolute before:-inset-y-[14px] before:inset-x-0 before:content-['']"
          style={{ fontSize: textPx(11), lineHeight: linePx(16.5), fontWeight: 400, color: "rgb(var(--c-charcoal-soft))" }}
        >
          Sources and guidelines
        </button>
      </div>

      {/* #91-#92: floating + → HO1.1 Add metric (same component as Home).
          Light #AEA1DC with the FAB shadow, dark #A991FE without; High
          contrast #5B48B8. Offsets as Food's FAB (UNSPECIFIED in HE1). */}
      <button
        type="button"
        onClick={() => setAddMetricOpen(true)}
        aria-label="Add metric"
        className="tap fixed bottom-[calc(env(safe-area-inset-bottom)+104px+var(--active-bar,0px))] right-[calc(var(--app-gutter)+20px)] z-30 rounded-full flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          background: hc && !dark ? "#5B48B8" : dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-aea1dc))",
          boxShadow: dark ? "none" : "var(--shadow-fab)",
          color: "#FFFFFF",
        }}
      >
        <Plus size={22} aria-hidden />
      </button>

      <AddMetricSheet open={addMetricOpen} onClose={() => setAddMetricOpen(false)} />
    </div>
  );
}

/** #4: caps label 9.5/14.3 700 ls1.9 #9A94B3 (dark #8A8698), m-bottom 9. */
function SectionCaps({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const { dark, hc } = useHealthMode();
  return (
    <h2
      className="uppercase"
      style={{
        marginBottom: 9,
        fontSize: textPx(9.5),
        lineHeight: linePx(14.3),
        fontWeight: 700,
        letterSpacing: 1.9,
        color: hc ? "rgb(var(--c-charcoal))" : dark ? "#8A8698" : "#9A94B3",
        ...style,
      }}
    >
      {children}
    </h2>
  );
}

/**
 * #79-#88: one-line row 358 x 60, r18 (#84 r16), white + 0.5px #241F1B@8%
 * (dark #1C1F28, #F5F3FA@8%; High contrast 30% of ink), pad 0 40 0 10;
 * tile 40 r12 #F0EDF9 (dark #2F2E47) with a 21 icon #7D6BB5 (dark
 * #C3B3FB); title 14/19 600; ChevronRight 17 #8C8378 / #B8B3C7.
 */
function RecordRow({ icon, title, onClick, radius = 18 }: { icon: React.ReactNode; title: string; onClick: () => void; radius?: number }) {
  const { dark, hc } = useHealthMode();
  const primaryText = hc && !dark ? "#4B3BA0" : dark ? "rgb(var(--th-c3b3fb))" : "rgb(var(--th-7d6bb5))";
  return (
    <button
      type="button"
      onClick={onClick}
      className="tap relative w-full flex items-center text-left"
      style={{
        minHeight: 60,
        borderRadius: radius,
        padding: "0 40px 0 10px",
        gap: 12,
        background: dark ? "#1C1F28" : "#FFFFFF",
        border: `0.5px solid ${hairline(dark, hc)}`,
      }}
    >
      <span className="shrink-0 grid place-items-center" style={{ width: 40, height: 40, borderRadius: 12, background: dark ? "rgb(var(--th-2f2e47))" : "rgb(var(--th-f0edf9))", color: primaryText }} aria-hidden>
        {icon}
      </span>
      <span className="flex-1 min-w-0 line-clamp-2" style={{ fontSize: textPx(14), lineHeight: linePx(19), fontWeight: 600, color: "rgb(var(--c-charcoal))" }}>
        {title}
      </span>
      <ChevronRight size={17} aria-hidden className="absolute" style={{ right: 13.5, top: "50%", marginTop: -8.5, color: "rgb(var(--c-charcoal-faint))" }} />
    </button>
  );
}
