import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { MacroSplitEditor, MACRO_REBALANCE_NOTE } from "../../components/food/MacroSplitEditor";
import { WeightTrendChart } from "../../components/health/WeightTrendChart";
import { useApp } from "../../context/AppContext";
import {
  calculateTDEE,
  isReferenceOnlyTarget,
  REFERENCE_INTAKE_NOTE,
  targetsFromGoal,
} from "../../services/nutrition";
import { canDrawSparkline, trendLabel, withinDays } from "../../services/health-metrics/series";
import type { WeightGoalType, PlanType } from "../../types";
import { Check, Minus, Plus, ChevronDown, X } from "lucide-react";
import { dietaryRestrictionOptions } from "../../utils/dietaryRestrictions";
// Item 8 shares Food's own tab bar (labels + literal flex-weights) instead
// of a second, drifting copy of them.
import { foodTabs, type Tab } from "./foodTabs";

const goalOptions: { value: WeightGoalType; label: string }[] = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain weight" },
];

// V4: "Existing plan" applies a dietitian-provided target — a plausible
// stand-in preset, since the prototype doesn't wire real template content
// from the professional side through yet.
const existingPlanPreset = {
  weightGoal: "lose" as WeightGoalType,
  weeklyRateKg: 0.4,
  calorieAdjust: -400,
  macroSplit: { proteinPct: 35, carbsPct: 40, fatPct: 25 },
};

interface GoalsPanelProps {
  /** Item 8: the shared tab bar lives inside GoalsPanel too, so switching
   *  away from "Goals & Macros" has to bubble back up to Food's own tab
   *  state. */
  onTabChange: (tab: Tab) => void;
}

export default function GoalsPanel({ onTabChange }: GoalsPanelProps) {
  const { user, healthSeries, metricValues, nutritionGoal, setWeightGoal, setMacroSplit, setNutritionGoal, dietaryRestriction, setDietaryRestriction, today } =
    useApp();
  const [calorieDraft, setCalorieDraft] = useState(String(nutritionGoal.targetCalories));
  const [planError, setPlanError] = useState<string | null>(null);
  const [restrictionOpen, setRestrictionOpen] = useState(false);
  const restrictionContentRef = useRef<HTMLDivElement>(null);
  // The picker, its "no selection" empty state, and its "X restriction
  // active" summary line are three different heights of the SAME slot —
  // previously the summary line was a separate element that popped in
  // instantly the moment an option was tapped, right next to the picker
  // box which was still mid-collapse from its own separate animation, so
  // the two uncoordinated layout changes landing at once looked like a
  // glitch. Measuring this slot's actual content height and animating a
  // single max-height/margin between whatever it was and whatever it
  // becomes makes every transition between all three states one smooth
  // motion, regardless of what triggered it.
  const [restrictionSlotHeight, setRestrictionSlotHeight] = useState(0);
  useLayoutEffect(() => {
    setRestrictionSlotHeight(restrictionContentRef.current?.scrollHeight ?? 0);
  }, [restrictionOpen, dietaryRestriction]);
  // This dropdown sits at the bottom of the page, and when it opens while
  // already scrolled near the end, the browser doesn't auto-scroll to
  // reveal the new content — it opens partly hidden behind the fixed
  // bottom nav (which also swallows taps in the overlap zone).
  useEffect(() => {
    if (restrictionOpen) restrictionContentRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [restrictionOpen]);
  const [desiredWeightDraft, setDesiredWeightDraft] = useState(
    String(nutritionGoal.desiredWeightKg ?? user.weightKg)
  );
  const [weightGoalError, setWeightGoalError] = useState<string | null>(null);

  // V6 (QA 6.0): "Existing plan" is a dietitian-provided plan — the client
  // can view it but only the dietitian edits it (from the professional UI),
  // so every editable control here locks while it's selected.
  const locked = nutritionGoal.planType === "existing";

  const tdee = calculateTDEE(user);
  const targets = targetsFromGoal(nutritionGoal);
  // V9 (QA 9.0): "TDEE estimate should include the maintenance calorie as
  // well as the calories based on what goal is chosen" — same formula
  // "Use suggested" applies, shown alongside the maintenance figure.
  // NO SUGGESTION WITHOUT A BODY TO BASE IT ON. calculateTDEE returns null
  // when height or weight is unrecorded, rather than running Mifflin-St Jeor
  // on a stand-in.
  const suggestedForGoal =
    tdee === null
      ? null
      : Math.round(
          nutritionGoal.weightGoal === "lose"
            ? tdee - ((nutritionGoal.weeklyRateKg || 0.5) * 7700) / 7
            : nutritionGoal.weightGoal === "gain"
            ? tdee + ((nutritionGoal.weeklyRateKg || 0.5) * 7700) / 7
            : tdee
        );
  // THE USER'S OWN WEIGH-INS, and only those.
  //
  // This took the mock's seven-point shape and RESCALED it so the last point
  // landed on the user's real weight — which produced a chart whose ending
  // was true and whose whole trajectory was somebody else's, then printed a
  // "↓ 1.2 kg this week" derived from the invented end of it.
  const weightMeta = withinDays(healthSeries.weight, 7, today);
  const weight = {
    current: metricValues.weight,
    history: weightMeta.history,
  };
  // TDEE at the goal weight — adapts as the weight goal / desired weight
  // change, since a lighter or heavier body has a different BMR.
  const tdeeAtGoal =
    nutritionGoal.weightGoal !== "maintain" && nutritionGoal.desiredWeightKg
      ? calculateTDEE({ ...user, weightKg: nutritionGoal.desiredWeightKg })
      : null;

  const rate = nutritionGoal.weeklyRateKg || 0.5;
  const desiredWeightKg = nutritionGoal.desiredWeightKg ?? user.weightKg;
  // NO PROJECTION WITHOUT A STARTING POINT. "Reach 75 kg by 12 March" needs
  // a weight to count down from; with no weigh-in on record there is nothing
  // to measure the distance from, so no date is offered.
  const weeksToGoal =
    nutritionGoal.weightGoal !== "maintain" && rate > 0 && weight.current !== null && desiredWeightKg !== null
      ? Math.abs(desiredWeightKg - weight.current) / rate
      : 0;
  // Projected forward from today, which the provider re-derives rather than
  // freezing at import — so this stays a real projection instead of drifting
  // further into the past every day the app runs.
  const reachDateObj =
    weeksToGoal > 0 ? new Date(Date.parse(`${today}T00:00:00Z`) + weeksToGoal * 7 * 86400000) : null;
  const reachDateIso = reachDateObj ? reachDateObj.toISOString().slice(0, 10) : null;
  const reachDate = reachDateObj
    ? reachDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;

  // V7 (QA 7.0): a desired weight that contradicts the chosen direction
  // (e.g. wanting to "lose" but entering a heavier target) is rejected with
  // an explanation instead of silently accepted.
  const confirmDesiredWeight = () => {
    if (nutritionGoal.desiredWeightConfirmed) {
      setNutritionGoal({ ...nutritionGoal, desiredWeightConfirmed: false });
      setWeightGoalError(null);
      return;
    }
    const kg = Number(desiredWeightDraft);
    if (!kg) return;
    if (nutritionGoal.weightGoal === "lose" && user.weightKg !== null && kg >= user.weightKg) {
      setWeightGoalError(`Desired weight must be lower than your current weight (${user.weightKg}kg) to lose weight.`);
      return;
    }
    if (nutritionGoal.weightGoal === "gain" && user.weightKg !== null && kg <= user.weightKg) {
      setWeightGoalError(`Desired weight must be higher than your current weight (${user.weightKg}kg) to gain weight.`);
      return;
    }
    setWeightGoalError(null);
    setNutritionGoal({ ...nutritionGoal, desiredWeightKg: kg, desiredWeightConfirmed: true });
  };

  // Switching goal direction invalidates whatever desired weight was
  // typed/confirmed for the previous direction (setWeightGoal itself clears
  // the stored value; this just resets the on-screen draft to match).
  const changeWeightGoal = (g: WeightGoalType) => {
    setWeightGoal(g, nutritionGoal.weeklyRateKg || 0.5);
    setDesiredWeightDraft("");
    setWeightGoalError(null);
  };

  const applyExistingPlan = () => {
    const suggested = calculateTDEE(user);
    if (suggested === null) return;
    setNutritionGoal({
      ...nutritionGoal,
      planType: "existing",
      weightGoal: existingPlanPreset.weightGoal,
      weeklyRateKg: existingPlanPreset.weeklyRateKg,
      targetCalories: Math.round(suggested + existingPlanPreset.calorieAdjust),
      macroSplit: existingPlanPreset.macroSplit,
    });
    setCalorieDraft(String(Math.round(suggested + existingPlanPreset.calorieAdjust)));
  };

  const applySuggested = () => {
    const suggested = calculateTDEE(user);
    if (suggested === null) return;
    const delta = (nutritionGoal.weeklyRateKg * 7700) / 7;
    const cals =
      nutritionGoal.weightGoal === "lose"
        ? suggested - delta
        : nutritionGoal.weightGoal === "gain"
        ? suggested + delta
        : suggested;
    setNutritionGoal({ ...nutritionGoal, targetCalories: Math.round(cals) });
    setCalorieDraft(String(Math.round(cals)));
  };

  // Master handover item 9: the whole panel fits one 390x844 screen in the
  // Maintain state, using the compact Goals & Macros frame in the handoff's
  // reference (CentiumTabFrame): cards 14px radius with 8px/11px padding,
  // 5px apart, 9.5px caps labels, 19px figures, and the weight-trend chart,
  // TDEE button and calorie stepper beside their values. Every field, value
  // and control is kept; the Lose/Gain extras compact the same way.
  const cardClass = "rounded-[14px] px-[11px] py-2";
  const capsLabel = "text-[9.5px] font-bold uppercase tracking-[0.1em]";

  return (
    <div className="flex flex-col gap-[5px] animate-fade-slide-up">
      <SegmentedTabs items={foodTabs} activeKey="goals" onChange={(key) => onTabChange(key as Tab)} />

      <Card padded={false} className={cardClass}>
        <p className={`${capsLabel} text-charcoal-faint mb-1.5`}>Weight goal</p>
        <div className="grid grid-cols-3 gap-1.5">
          {goalOptions.map((g) => (
            <button
              key={g.value}
              onClick={() => changeWeightGoal(g.value)}
              disabled={locked}
              className={`tap rounded-[9px] py-1.5 text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
                nutritionGoal.weightGoal === g.value
                  ? "bg-primary text-white border-primary"
                  : "bg-cream-soft border-transparent text-charcoal-soft"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>

        {nutritionGoal.weightGoal !== "maintain" && (
          <>
            <label className="block mt-2">
              <span className="text-[10.5px] font-semibold text-charcoal-soft mb-0.5 block">Desired weight</span>
              <div className="flex items-center gap-2">
                <input
                  value={desiredWeightDraft}
                  onChange={(e) => setDesiredWeightDraft(e.target.value.replace(/[^\d.]/g, ""))}
                  disabled={nutritionGoal.desiredWeightConfirmed || locked}
                  inputMode="decimal"
                  className="flex-1 rounded-[9px] bg-cream-soft border border-charcoal/10 px-2.5 py-1 text-[13px] font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                />
                <span className="text-[11px] text-charcoal-faint">kg</span>
                <button
                  onClick={confirmDesiredWeight}
                  disabled={locked}
                  aria-label={nutritionGoal.desiredWeightConfirmed ? "Edit desired weight" : "Confirm desired weight"}
                  className={`tap w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors disabled:opacity-50 ${
                    nutritionGoal.desiredWeightConfirmed
                      ? "bg-charcoal/10 border-transparent text-charcoal-faint"
                      : "bg-primary border-primary text-white"
                  }`}
                >
                  <Check size={14} strokeWidth={3} />
                </button>
              </div>
              {weightGoalError && (
                <p className="text-[10.5px] font-semibold text-[#C0392B] mt-0.5">{weightGoalError}</p>
              )}
            </label>

            <label className="block mt-1.5">
              <span className="flex items-baseline justify-between">
                <span className="text-[10.5px] font-semibold text-charcoal-soft">Desired weekly rate (kg/week)</span>
                <span className="text-[10px] text-charcoal-faint">
                  {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                  {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg / week
                </span>
              </span>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={nutritionGoal.weeklyRateKg || 0.5}
                onChange={(e) => setWeightGoal(nutritionGoal.weightGoal, Number(e.target.value))}
                disabled={locked || !nutritionGoal.desiredWeightConfirmed}
                className="w-full disabled:opacity-50"
                style={{ accentColor: nutritionGoal.weightGoal === "gain" ? "#3F9165" : "#C0392B" }}
              />
              {/* V8 (QA 8.0): "desired weekly rate can only be edited once
                  desired weight is added." */}
              {!locked && !nutritionGoal.desiredWeightConfirmed && (
                <p className="text-[10px] text-charcoal-faint">
                  Add and confirm a desired weight above to set your weekly rate.
                </p>
              )}
            </label>
          </>
        )}

        {locked && (
          <p className="text-[10.5px] text-charcoal-faint mt-1.5">
            Locked — only your dietitian can edit this plan.
          </p>
        )}
      </Card>

      <Card padded={false} className={cardClass}>
        <div className="flex items-center justify-between mb-0.5">
          {/* "WEIGHT TREND" in #6D50D3; the figure below stays charcoal
              (#241F1B), per the reference markup. */}
          <p className={capsLabel} style={{ color: "#6D50D3" }}>Weight trend</p>
          <span className="text-[10px] text-charcoal-faint">{reachDate ? "To goal" : "7 days"}</span>
        </div>
        <div className="flex items-end justify-between gap-2.5">
          <div className="shrink-0">
            {weight.current === null ? (
              <p className="text-[13px] font-semibold text-charcoal-tertiary leading-[1.1]">
                No weigh-ins yet
              </p>
            ) : (
              <>
                <p className="text-[19px] font-bold leading-[1.1] text-charcoal">{weight.current} kg</p>
                {trendLabel(weightMeta) && (
                  <p className="text-[10px] text-charcoal-faint">{trendLabel(weightMeta)}</p>
                )}
              </>
            )}
          </div>
          {/* A LINE NEEDS TWO POINTS. One weigh-in drew a flat week. */}
          {canDrawSparkline(weightMeta) && (
          <WeightTrendChart
            history={weight.history}
            desiredWeightKg={reachDate ? desiredWeightKg ?? undefined : undefined}
            reachDate={reachDateIso}
            width={260}
            height={110}
            displayWidth={192}
            displayHeight={56}
          />
          )}
        </div>
        {reachDate && (
          <p className="text-[10px] text-primary-dark bg-primary-pale rounded-full px-2.5 py-0.5 mt-1 inline-block">
            At this rate, reach {desiredWeightKg}kg by {reachDate}
          </p>
        )}
      </Card>

      <Card padded={false} className={cardClass}>
        {/* Item 9: no icon on the TDEE card. */}
        <p className={`${capsLabel} text-charcoal-faint mb-1`}>TDEE estimate</p>
        <div className="flex items-center justify-between gap-2.5">
          <div className="min-w-0">
            {tdee === null ? (
              <>
                <p className="text-[13px] font-semibold leading-[1.1] text-charcoal-tertiary">
                  Needs your height and weight
                </p>
                <p className="mt-px text-[8px] leading-[1.3] text-charcoal-faint">
                  Mifflin-St Jeor is a formula in both — add them in Profile for a maintenance
                  estimate.
                </p>
              </>
            ) : (
              <>
                <p className="text-[19px] font-bold leading-[1.1] text-charcoal">{tdee.toLocaleString()} kcal</p>
                <p className="mt-px text-[8px] leading-[1.3] text-charcoal-faint">
                  Estimated maintenance calories at your current weight (Mifflin-St Jeor) — a prototype
                  estimate, adjust as needed.
                </p>
              </>
            )}
          </div>
          <button
            onClick={applySuggested}
            disabled={locked || tdee === null}
            className="tap shrink-0 h-[30px] px-[11px] rounded-[9px] bg-cream-soft text-charcoal text-[11px] font-bold whitespace-nowrap inline-flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
          >
            Use suggested
          </button>
        </div>
        {(nutritionGoal.weightGoal !== "maintain" || tdeeAtGoal !== null) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {nutritionGoal.weightGoal !== "maintain" && suggestedForGoal !== null && (
              <p className="text-[10px] text-charcoal bg-cream-soft rounded-full px-2.5 py-0.5">
                {suggestedForGoal.toLocaleString()} kcal to {nutritionGoal.weightGoal} weight at your
                current rate
              </p>
            )}
            {tdeeAtGoal !== null && (
              <p className="text-[10px] text-primary-dark bg-primary-pale rounded-full px-2.5 py-0.5">
                ≈ {tdeeAtGoal.toLocaleString()} kcal once you reach {nutritionGoal.desiredWeightKg}kg
              </p>
            )}
          </div>
        )}
      </Card>

      <Card padded={false} className={cardClass}>
        {/* V10 (QA 10.0): "I want another better way to edit daily calorie
            target instead of pressing a pencil icon" — a +/- stepper plus
            direct typing, with an explicit Save that only appears once the
            value changes. */}
        <div className="flex items-center justify-between gap-2.5">
          <p className={`${capsLabel} min-w-0`} style={{ color: "#9891A8" }}>
            Daily target
          </p>
          <div className="flex items-center gap-[11px] shrink-0">
            <span className="flex items-stretch h-9 rounded-full overflow-hidden" style={{ background: "#F5F5FE" }}>
              <button
                onClick={() => !locked && setCalorieDraft(String(Math.max(0, Number(calorieDraft || 0) - 50)))}
                disabled={locked}
                aria-label="Decrease by 50 kcal"
                className="tap w-[54px] flex items-center justify-center disabled:opacity-50"
                style={{ color: "#1D167D" }}
              >
                <Minus size={15} strokeWidth={2.2} />
              </button>
              <input
                value={calorieDraft}
                onChange={(e) => setCalorieDraft(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                disabled={locked}
                className="w-[72px] text-center text-[15px] font-extrabold focus:outline-none disabled:opacity-60"
                style={{ background: "#F2F2FE", borderLeft: "1px solid #EEECFE", borderRight: "1px solid #EEECFE", color: "#01012A" }}
              />
              <button
                onClick={() => !locked && setCalorieDraft(String(Number(calorieDraft || 0) + 50))}
                disabled={locked}
                aria-label="Increase by 50 kcal"
                className="tap w-[54px] flex items-center justify-center disabled:opacity-50"
                style={{ color: "#1D167D" }}
              >
                <Plus size={15} strokeWidth={2.2} />
              </button>
            </span>
            <span className="text-[12px]" style={{ color: "#898597" }}>kcal</span>
          </div>
        </div>
        {/* WHAT THIS NUMBER IS, when it is not this user's. */}
        {isReferenceOnlyTarget(user) && (
          <p className="mt-1.5 text-[10.5px] leading-[1.4] text-charcoal-faint">
            {REFERENCE_INTAKE_NOTE}
          </p>
        )}
        {!locked && Number(calorieDraft || 0) !== nutritionGoal.targetCalories && (
          <Button
            size="sm"
            className="mt-1.5"
            onClick={() => {
              const kcal = Number(calorieDraft);
              if (!kcal) return;
              setNutritionGoal({ ...nutritionGoal, targetCalories: kcal });
            }}
          >
            <Check size={13} /> Save target
          </Button>
        )}
      </Card>

      <Card padded={false} className={cardClass}>
        <p className={`${capsLabel} text-charcoal-faint mb-[7px]`}>Macro distribution</p>
        <MacroSplitEditor
          split={nutritionGoal.macroSplit}
          calories={nutritionGoal.targetCalories}
          onChange={setMacroSplit}
          disabled={locked}
          compact
        />
        {/* Item 9: the dashboard's nutrition trio. Protein #7D6BB5; carbs on
            #F0EDF9 with #8175C2; fat on #EAF4F2 with #6F9993, per the
            reference markup. */}
        <div className="grid grid-cols-3 gap-1.5 mt-[7px]">
          <div className="text-center rounded-[9px] py-1" style={{ background: "#F0EDF9" }}>
            <p className="text-[12px] font-bold" style={{ color: "#7D6BB5" }}>{targets.protein}g</p>
            <p className="text-[9px]" style={{ color: "rgba(125,107,181,0.7)" }}>Protein</p>
          </div>
          <div className="text-center rounded-[9px] py-1" style={{ background: "#F0EDF9" }}>
            <p className="text-[12px] font-bold" style={{ color: "#8175C2" }}>{targets.carbs}g</p>
            <p className="text-[9px]" style={{ color: "rgba(129,117,194,0.75)" }}>Carbs</p>
          </div>
          <div className="text-center rounded-[9px] py-1" style={{ background: "#EAF4F2" }}>
            <p className="text-[12px] font-bold" style={{ color: "#6F9993" }}>{targets.fat}g</p>
            <p className="text-[9px]" style={{ color: "rgba(111,153,147,0.7)" }}>Fat</p>
          </div>
        </div>
        <p className="mt-1.5 text-[9.5px] leading-[1.35] text-charcoal-faint">{MACRO_REBALANCE_NOTE}</p>
      </Card>

      <Card padded={false} className={cardClass}>
        <p className={`${capsLabel} text-charcoal-faint mb-1.5`}>Plan</p>
        <div className="flex gap-1.5 flex-wrap">
          {(["custom", "existing"] as PlanType[]).map((p) => (
            <Chip
              key={p}
              active={nutritionGoal.planType === p}
              className="!px-2.5 !py-[5px] !text-[11px] !leading-[14px] !gap-[5px]"
              onClick={() => {
                // V10 (QA 10.0): "Pressing existing plan, will tell the
                // client that the professional will be responsible for the
                // goals and macros. if they don't have a hired professional,
                // make it so that when pressed it reverts back to custom
                // plan with an error message saying that they should hire a
                // professional."
                if (p === "existing") {
                  if (!user.linkedProfessionalName) {
                    setPlanError("You need to hire a professional before switching to an existing plan.");
                    setNutritionGoal({ ...nutritionGoal, planType: "custom" });
                    return;
                  }
                  setPlanError(null);
                  applyExistingPlan();
                } else {
                  setPlanError(null);
                  setNutritionGoal({ ...nutritionGoal, planType: p });
                }
              }}
            >
              {p === "custom" ? "Custom plan" : "Existing plan"}
            </Chip>
          ))}
          {/* QA 11.0: "Besides custom and existing plan, another button
              should include dietary restriction that when pressed shows
              many dietary restrictions in a drop down box." */}
          <Chip
            active={!!dietaryRestriction || restrictionOpen}
            className="!px-2.5 !py-[5px] !text-[11px] !leading-[14px] !gap-[5px]"
            onClick={() => setRestrictionOpen((v) => !v)}
          >
            <span className="flex items-center gap-1">
              Dietary restriction
              <ChevronDown size={11} className={restrictionOpen ? "rotate-180" : undefined} />
            </span>
          </Chip>
        </div>
        {planError && <p className="text-[10.5px] font-semibold text-[#C0392B] mt-1.5">{planError}</p>}
        {!planError && nutritionGoal.planType === "existing" && (
          <p className="text-[10.5px] text-charcoal-faint mt-1.5">
            {user.linkedProfessionalName} is responsible for your goals and macros while this plan is
            active — weight goal, calorie target and macro distribution can only be changed by them.
          </p>
        )}
        {/* One slot, one animated height — see the state comment above for
            why this used to glitch. */}
        <div
          className="overflow-hidden transition-[height,margin-top] duration-300 ease-out"
          style={{ height: restrictionSlotHeight, marginTop: restrictionSlotHeight > 0 ? 8 : 0 }}
        >
          <div ref={restrictionContentRef}>
            {restrictionOpen ? (
              <div className="bg-cream-soft rounded-2xl p-2 space-y-1 scroll-mb-24">
                {dietaryRestrictionOptions.map((r) => (
                  <button
                    key={r.value}
                    onClick={() => {
                      setDietaryRestriction(dietaryRestriction === r.value ? null : r.value);
                      setRestrictionOpen(false);
                    }}
                    className={`tap w-full text-left rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                      dietaryRestriction === r.value ? "bg-primary text-white" : "text-charcoal hover:bg-cream-card"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ) : dietaryRestriction ? (
              <button
                onClick={() => setDietaryRestriction(null)}
                className="tap flex items-center gap-1.5 text-xs font-semibold text-charcoal-faint"
              >
                <X size={12} />
                {dietaryRestrictionOptions.find((r) => r.value === dietaryRestriction)?.label} active —
                incompatible Diary items are highlighted. Tap to clear.
              </button>
            ) : null}
          </div>
        </div>
      </Card>
    </div>
  );
}
