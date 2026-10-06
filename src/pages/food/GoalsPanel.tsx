import { useState } from "react";
import type React from "react";
import { Chip } from "../../components/ui/Chip";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { MacroSplitEditor, MACRO_REBALANCE_NOTE } from "../../components/food/MacroSplitEditor";
import { WeightTrendChart } from "../../components/health/WeightTrendChart";
import { useApp } from "../../context/AppContext";
import { PregnancyNutritionCard } from "../../components/pregnancy/PregnancyGuidance";
import {
  calculateTDEE,
  isReferenceOnlyTarget,
  REFERENCE_INTAKE_NOTE,
  targetsFromGoal,
} from "../../services/nutrition";
import { canDrawSparkline, trendLabel, withinDays } from "../../services/health-metrics/series";
import type { WeightGoalType, PlanType } from "../../types";
import { Check, Minus, Plus, ChevronDown, X, TrendingDown, TrendingUp, Equal } from "lucide-react";
import { dietaryRestrictionOptions } from "../../utils/dietaryRestrictions";
// Item 8 shares Food's own tab bar (labels + literal flex-weights) instead
// of a second, drifting copy of them.
import { foodTabs, type Tab } from "./foodTabs";
import { useIsDark } from "../../hooks/useIsDark";

// FO2.2 / FO4.2 / FO5.2: each Weight Goal button carries its trend icon.
const goalOptions: { value: WeightGoalType; label: string; Icon: typeof Equal }[] = [
  { value: "lose", label: "Lose weight", Icon: TrendingDown },
  { value: "maintain", label: "Maintain", Icon: Equal },
  { value: "gain", label: "Gain weight", Icon: TrendingUp },
];

// Handover 2026-09-29 FO2.2 / FO4.2 / FO5.2 card system, measured from the
// frames: white cards with a 1px #E7E6E6 (rgba(36,31,27,0.11)) hairline,
// radius 16, 14px sides, 10px apart; titles are bold purple caps with no icon.
const CARD_LIGHT: React.CSSProperties = { background: "rgb(var(--c-cream-card))", border: "1px solid #E7E6E6", borderRadius: 16, padding: "11px 14px 12px" };
const TITLE_LIGHT: React.CSSProperties = { margin: 0, fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "rgb(var(--thi-6d50d3))" };

/**
 * Mobile v5.1 R3, dark mode (no light islands). Colours whose light value is
 * a token are written as the token; these are the rest, as [light, dark]:
 * the card hairline (hairline dark), the titles (tabs.inactive.text dark,
 * 7.75:1 on the card), the goal colour as text (each hue lifted to 4.5:1 on
 * the card with liftTo, src/data/folderColors.ts: 4.53 / 4.57), the error
 * text (danger dark), the desired-weight field border (border.option dark)
 * and the daily-target stepper: its pill primary.tint.2, its field
 * primary.tint, the -/+ glyphs primary.deeper (7.93:1), the figure
 * text.primary (11.6:1), the unit text.secondary (6.28:1) and its dividers
 * the hairline. The slider fills (#9FC8B2 / #DF9C95) read on the dark track
 * and stay as they are.
 */
const GOALS_COLORS = {
  hairline: ["#E7E6E6", "rgba(238,239,242,0.08)"],
  title: ["rgb(var(--th-6d50d3))", "rgb(var(--th-b7abde))"],
  gain: ["#3F9165", "#47956B"],
  lose: ["#C0392B", "#CF695E"],
  fieldBorder: ["#E0DFE0", "rgba(238,239,242,0.10)"],
  stepperPill: ["rgb(var(--th-f5f4fe))", "rgb(var(--th-2b2c3a))"],
  stepperField: ["rgb(var(--th-f2f2fe))", "rgb(var(--th-303141))"],
  stepperRule: ["rgb(var(--th-eeecfe))", "rgba(238,239,242,0.08)"],
  stepperGlyph: ["rgb(var(--th-1d167d))", "rgb(var(--th-c8bfe9))"],
  stepperFigure: ["#01012A", "#F5F3FA"],
  stepperUnit: ["#8A8594", "#B8B3C7"],
} as const;
const goalsColor = (key: keyof typeof GOALS_COLORS, dark: boolean): string => GOALS_COLORS[key][dark ? 1 : 0];
const CARD_DARK: React.CSSProperties = { ...CARD_LIGHT, border: `1px solid ${GOALS_COLORS.hairline[1]}` };
const TITLE_DARK: React.CSSProperties = { ...TITLE_LIGHT, color: GOALS_COLORS.title[1] };
// "Use suggested" and "Use custom": one size (FO2.2 "both buttons the same size").
// Both measure 92 x 28 in the frame.
const ACTION: React.CSSProperties = { width: 92, height: 28, padding: 0, borderRadius: 10, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap" };

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
  const { user, healthSeries, metricValues, nutritionGoal, setWeightGoal, setMacroSplit, setNutritionGoal, dietaryRestriction, setDietaryRestriction, today, pregnancy, cycleOffered } =
    useApp();
  const dark = useIsDark();
  const CARD = dark ? CARD_DARK : CARD_LIGHT;
  const TITLE = dark ? TITLE_DARK : TITLE_LIGHT;
  // What the stepper shows: the user's edit, or (null) the saved target, so it
  // never shows a figure from before the goal loaded — with "Use custom"
  // always on screen, that stale figure would be one tap from being saved.
  const [calorieEdit, setCalorieEdit] = useState<string | null>(null);
  const calorieDraft = calorieEdit ?? String(nutritionGoal.targetCalories);
  const setCalorieDraft = (v: string | null) => setCalorieEdit(v);
  const [planError, setPlanError] = useState<string | null>(null);
  // FO6: the options open in the shared floating popup (PopupMenu, the
  // Nutrient Summary filter style) anchored to the chip, not inline.
  const [restrictionAnchor, setRestrictionAnchor] = useState<HTMLElement | null>(null);
  const restrictionOpen = !!restrictionAnchor;
  // The desired-weight field shows the saved goal until edited (never the
  // current weight: FO4.2 confirms on blur, and blurring an untouched field
  // must not try to confirm a goal equal to where the user already is).
  const [desiredWeightEdit, setDesiredWeightEdit] = useState<string | null>(null);
  const desiredWeightDraft = desiredWeightEdit ?? (nutritionGoal.desiredWeightKg != null ? String(nutritionGoal.desiredWeightKg) : "");
  const setDesiredWeightDraft = (v: string | null) => setDesiredWeightEdit(v);
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
  // FO4.2 / FO5.2: the field has no check button; the weight is confirmed
  // when the user presses Enter or leaves the field. Unchanged does nothing;
  // cleared un-confirms it (the weekly rate locks again).
  const confirmDesiredWeight = () => {
    if (desiredWeightEdit === null) return;
    setDesiredWeightDraft(null);
    const kg = Number(desiredWeightDraft);
    if (!desiredWeightDraft.trim() || !kg) {
      setWeightGoalError(null);
      setNutritionGoal({ ...nutritionGoal, desiredWeightConfirmed: false });
      return;
    }
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
    setDesiredWeightDraft(null);
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
    setCalorieDraft(null);
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
    setCalorieDraft(null);
  };

  const maintain = nutritionGoal.weightGoal === "maintain";
  // FO4.2 / FO5.2: one colour token for the weekly-rate slider and Target
  // calories, red to lose, green to gain; the slider fills with it at 50%.
  const rateColor = goalsColor(nutritionGoal.weightGoal === "gain" ? "gain" : "lose", dark);
  const rateTint = nutritionGoal.weightGoal === "gain" ? "#9FC8B2" : "#DF9C95";
  const rateFrac = (((nutritionGoal.weeklyRateKg || 0.5) - 0.1) / 0.9) * 100;

  const useSuggestedButton = (
    <button
      onClick={applySuggested}
      disabled={locked || tdee === null}
      className="tap shrink-0 inline-flex items-center justify-center disabled:opacity-40 disabled:pointer-events-none"
      style={{ ...ACTION, background: "rgb(var(--c-cream-soft))", color: "rgb(var(--c-charcoal))" }}
    >
      Use suggested
    </button>
  );

  return (
    <div className="flex flex-col animate-fade-slide-up" style={{ gap: 10 }}>
      <SegmentedTabs items={foodTabs} activeKey="goals" onChange={(key) => onTabChange(key as Tab)} />

      {/* PREGNANCY GUIDANCE SITS WITH THE TARGET IT OFFERS TO CHANGE. "Apply
          to my targets" writes into the calorie goal two cards below, so it
          belongs on the same screen as that number rather than somewhere the
          user has to remember what it did. */}
      {cycleOffered && pregnancy && <PregnancyNutritionCard pregnancy={pregnancy} />}

      <section style={CARD}>
        <p style={{ ...TITLE, marginBottom: 12 }}>Weight goal</p>
        <div className="grid grid-cols-3" style={{ gap: 6 }}>
          {goalOptions.map((g) => {
            const on = nutritionGoal.weightGoal === g.value;
            return (
              <button
                key={g.value}
                onClick={() => changeWeightGoal(g.value)}
                disabled={locked}
                className="tap inline-flex items-center justify-center disabled:opacity-50"
                style={{
                  height: 29,
                  gap: 5,
                  borderRadius: 8,
                  background: on ? "rgb(var(--c-primary-fill))" : "rgb(var(--c-cream-soft))",
                  color: on ? "rgb(var(--c-on-primary-fill))" : "rgb(var(--c-charcoal-soft))",
                  fontSize: 12,
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <g.Icon size={13} strokeWidth={2.2} />
                {g.label}
              </button>
            );
          })}
        </div>

        {!maintain && (
          // FO4.2 / FO5.2: desired weight (narrowed, no check button) and the
          // weekly rate share one row; the slider fills in its goal colour.
          <div className="flex items-end" style={{ gap: 18, marginTop: 14 }}>
            <label className="block flex-none">
              <span className="block" style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-charcoal-soft))", marginBottom: 6 }}>
                Desired weight
              </span>
              <span className="flex items-center" style={{ gap: 7 }}>
                <input
                  value={desiredWeightDraft}
                  onChange={(e) => setDesiredWeightDraft(e.target.value.replace(/[^\d.]/g, ""))}
                  onBlur={confirmDesiredWeight}
                  onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                  disabled={locked}
                  inputMode="decimal"
                  enterKeyHint="done"
                  aria-label="Desired weight in kg"
                  className="text-center focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                  style={{ width: 64, height: 28, borderRadius: 8, background: "rgb(var(--c-cream-soft))", border: `1px solid ${goalsColor("fieldBorder", dark)}`, fontSize: 13, fontWeight: 600, color: "rgb(var(--c-charcoal))" }}
                />
                <span style={{ fontSize: 11.5, color: "rgb(var(--c-charcoal-muted))" }}>kg</span>
              </span>
            </label>
            <label className="block flex-1 min-w-0">
              <span className="block" style={{ fontSize: 12, fontWeight: 600, color: "rgb(var(--c-charcoal-soft))", marginBottom: 6 }}>
                Desired weekly rate
              </span>
              <span className="flex items-center" style={{ gap: 8, height: 28 }}>
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.1}
                  value={nutritionGoal.weeklyRateKg || 0.5}
                  onChange={(e) => setWeightGoal(nutritionGoal.weightGoal, Number(e.target.value))}
                  // V8 (QA 8.0): the weekly rate can only be edited once a
                  // desired weight is confirmed.
                  disabled={locked || !nutritionGoal.desiredWeightConfirmed}
                  aria-label="Desired weekly rate"
                  className="flex-1 min-w-0 h-[6px] rounded-full appearance-none disabled:opacity-50"
                  style={{
                    accentColor: rateTint,
                    backgroundImage: `linear-gradient(to right, ${rateTint} ${rateFrac}%, rgb(var(--c-cream-soft)) ${rateFrac}%)`,
                  }}
                />
                <span className="flex-none" style={{ fontSize: 11, color: "rgb(var(--c-charcoal-muted))", whiteSpace: "nowrap" }}>
                  {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                  {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg / week
                </span>
              </span>
            </label>
          </div>
        )}
        {!maintain && weightGoalError && (
          <p className="text-[10.5px] font-semibold text-[#C0392B] dark:text-[#FF6B5E] mt-1.5">{weightGoalError}</p>
        )}

        {locked && (
          <p className="text-[10.5px] text-charcoal-faint mt-2">
            Locked: only your dietitian can edit this plan.
          </p>
        )}
      </section>

      {maintain ? (
        // FO2.2: in Maintain, the last logged weight (no chart) beside a
        // compact TDEE card; the target equals maintenance, so no separate
        // Target calories stat.
        <div className="flex" style={{ gap: 6 }}>
          <section style={{ ...CARD, flex: 138, minWidth: 0 }}>
            <p style={{ ...TITLE, marginBottom: 10 }}>Current weight</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgb(var(--c-charcoal-muted))" }}>Last logged</p>
            {weight.current === null ? (
              <p className="text-[13px] font-semibold text-charcoal-tertiary" style={{ marginTop: 2 }}>
                No weigh-ins yet
              </p>
            ) : (
              <p style={{ margin: "1px 0 0", fontSize: 19, fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>
                {weight.current}
                <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 3 }}>kg</span>
              </p>
            )}
          </section>
          <section style={{ ...CARD, flex: 215, minWidth: 0 }}>
            <p style={{ ...TITLE, marginBottom: 10 }}>TDEE estimate</p>
            {tdee === null ? (
              <>
                <p className="text-[13px] font-semibold leading-[1.1] text-charcoal-tertiary">Needs your height and weight</p>
                <p className="mt-1 text-[8.5px] leading-[1.3] text-charcoal-faint">
                  Mifflin-St Jeor is a formula in both. Add them in Profile for a maintenance estimate.
                </p>
              </>
            ) : (
              <>
                <p style={{ margin: 0, fontSize: 11, color: "rgb(var(--c-charcoal-muted))" }}>Maintenance calories</p>
                {/* Wraps at 360, where the figure and the button don't both fit. */}
                <div className="flex items-center justify-between flex-wrap" style={{ columnGap: 8, rowGap: 6, marginTop: 1 }}>
                  <p style={{ margin: 0, fontSize: 19, fontWeight: 800, color: "rgb(var(--c-charcoal))", whiteSpace: "nowrap" }}>
                    {tdee.toLocaleString()}
                    <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 3 }}>kcal</span>
                  </p>
                  {useSuggestedButton}
                </div>
                <p style={{ margin: "6px 0 0", fontSize: 8.5, color: "rgb(var(--c-charcoal-muted))" }}>Based on the Mifflin-St Jeor Formula</p>
              </>
            )}
          </section>
        </div>
      ) : (
        <>
          <section style={CARD}>
            <div className="flex items-center justify-between mb-1">
              <p style={TITLE}>Weight trend</p>
              <span className="text-[10px] text-charcoal-faint">{reachDate ? "To goal" : "7 days"}</span>
            </div>
            <div className="flex items-end justify-between gap-2.5">
              <div className="shrink-0">
                {weight.current === null ? (
                  <p className="text-[13px] font-semibold text-charcoal-tertiary leading-[1.1]">No weigh-ins yet</p>
                ) : (
                  <>
                    <p style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.1, color: "rgb(var(--c-charcoal))" }}>
                      {weight.current}
                      <span style={{ fontSize: 13, fontWeight: 700, marginLeft: 3 }}>kg</span>
                    </p>
                    {trendLabel(weightMeta) && <p className="text-[10px] text-charcoal-faint">{trendLabel(weightMeta)}</p>}
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
                  fill
                />
              )}
            </div>
            {reachDate && (
              <p className="text-[10px] text-primary-dark bg-primary-pale rounded-full px-2.5 py-0.5 mt-1 inline-block">
                At this rate, reach {desiredWeightKg}kg by {reachDate}
              </p>
            )}
          </section>

          <section style={CARD}>
            <p style={{ ...TITLE, marginBottom: 10 }}>TDEE estimate</p>
            {tdee === null ? (
              <>
                <p className="text-[13px] font-semibold leading-[1.1] text-charcoal-tertiary">Needs your height and weight</p>
                <p className="mt-1 text-[8.5px] leading-[1.3] text-charcoal-faint">
                  Mifflin-St Jeor is a formula in both. Add them in Profile for a maintenance estimate.
                </p>
              </>
            ) : (
              <>
                {/* FO4.2 / FO5.2: Maintenance and Target calories, two equal
                    labelled stats on one row with Use suggested. */}
                <div className="flex items-center" style={{ gap: 10 }}>
                  {/* Content-sized: one line from 390 up, the label wraps at 360. */}
                  <div className="min-w-0" style={{ flex: "1 1 auto" }}>
                    <p style={{ margin: 0, fontSize: 11, color: "rgb(var(--c-charcoal-muted))" }}>Maintenance calories</p>
                    <p style={{ margin: "2px 0 0", fontSize: 19, fontWeight: 800, color: "rgb(var(--c-charcoal))", whiteSpace: "nowrap" }}>
                      {tdee.toLocaleString()}
                      <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 3 }}>kcal</span>
                    </p>
                  </div>
                  <div className="min-w-0 self-stretch" style={{ flex: "1 1 auto", borderLeft: `1px solid ${goalsColor("hairline", dark)}`, paddingLeft: 10 }}>
                    <p style={{ margin: 0, fontSize: 11, color: "rgb(var(--c-charcoal-muted))" }}>Target calories</p>
                    <p style={{ margin: "2px 0 0", fontSize: 19, fontWeight: 800, color: rateColor, whiteSpace: "nowrap" }}>
                      {(suggestedForGoal ?? tdee).toLocaleString()}
                      <span style={{ fontSize: 11, fontWeight: 600, marginLeft: 3 }}>kcal</span>
                    </p>
                    <p style={{ margin: "1px 0 0", fontSize: 10.5, color: rateColor, opacity: 0.6 }}>
                      to {nutritionGoal.weightGoal} weight
                    </p>
                  </div>
                  {useSuggestedButton}
                </div>
                <p style={{ margin: "8px 0 0", fontSize: 8.5, color: "rgb(var(--c-charcoal-muted))" }}>Based on the Mifflin-St Jeor Formula</p>
              </>
            )}
          </section>
        </>
      )}

      <section style={CARD}>
        {/* V10 (QA 10.0): a +/- stepper plus direct typing. FO2.2: the save
            is "Use custom", beside it and the same size as "Use suggested". */}
        {/* One line from 390 up; at 360 the stepper and Use custom wrap under the title together. */}
        <div className="flex items-center justify-between flex-wrap" style={{ columnGap: 8, rowGap: 8 }}>
          <p style={{ ...TITLE, minWidth: 0, whiteSpace: "nowrap" }}>Daily target</p>
          <div className="flex items-center ml-auto" style={{ gap: 8 }}>
          {/* No overflow clipping: it would clip the 44px hit area of the - / + buttons, and the ends are transparent anyway. A minimum height, so 130% text grows the pill rather than being cut. */}
          <span className="flex items-stretch rounded-full flex-none" style={{ minHeight: 30, background: goalsColor("stepperPill", dark) }}>
            <button
              onClick={() => !locked && setCalorieDraft(String(Math.max(0, Number(calorieDraft || 0) - 50)))}
              disabled={locked}
              aria-label="Decrease by 50 kcal"
              className="tap flex items-center justify-center disabled:opacity-50"
              style={{ width: 28, color: goalsColor("stepperGlyph", dark) }}
            >
              <Minus size={14} strokeWidth={2.2} />
            </button>
            <span
              className="flex items-baseline justify-center"
              style={{ width: 66, background: goalsColor("stepperField", dark), borderLeft: `1px solid ${goalsColor("stepperRule", dark)}`, borderRight: `1px solid ${goalsColor("stepperRule", dark)}`, gap: 3 }}
            >
              <input
                value={calorieDraft}
                onChange={(e) => setCalorieDraft(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                disabled={locked}
                aria-label="Daily calorie target"
                className="text-right focus:outline-none disabled:opacity-60 bg-transparent self-center"
                style={{ width: 38, padding: 0, fontSize: 14, fontWeight: 800, color: goalsColor("stepperFigure", dark) }}
              />
              <span className="self-center" style={{ fontSize: 9.5, color: goalsColor("stepperUnit", dark) }}>kcal</span>
            </span>
            <button
              onClick={() => !locked && setCalorieDraft(String(Number(calorieDraft || 0) + 50))}
              disabled={locked}
              aria-label="Increase by 50 kcal"
              className="tap flex items-center justify-center disabled:opacity-50"
              style={{ width: 28, color: goalsColor("stepperGlyph", dark) }}
            >
              <Plus size={14} strokeWidth={2.2} />
            </button>
          </span>
          <button
            onClick={() => {
              const kcal = Number(calorieDraft);
              if (!kcal) return;
              setNutritionGoal({ ...nutritionGoal, targetCalories: kcal });
              setCalorieDraft(null);
            }}
            disabled={locked}
            className="tap inline-flex items-center justify-center flex-none disabled:opacity-40 disabled:pointer-events-none"
            style={{ ...ACTION, gap: 5, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))" }}
          >
            <Check size={13} /> Use custom
          </button>
          </div>
        </div>
        {/* WHAT THIS NUMBER IS, when it is not this user's. */}
        {isReferenceOnlyTarget(user) && (
          <p className="mt-2 text-[10.5px] leading-[1.4] text-charcoal-faint">{REFERENCE_INTAKE_NOTE}</p>
        )}
        {/* WHAT ELSE IS IN THE NUMBER. The field above edits the base target;
            a pregnancy addition the user applied sits on top of it, and would
            otherwise be an unexplained gap between this card and every ring
            in the app. */}
        {(nutritionGoal.pregnancyKcal ?? 0) > 0 && (
          <p className="mt-2 text-[10.5px] leading-[1.4] text-charcoal-faint">
            Plus {nutritionGoal.pregnancyKcal} kcal a day for pregnancy, {targets.calories} kcal in total. The
            pregnancy card at the top of this tab takes it off again.
          </p>
        )}
      </section>

      <section style={CARD}>
        <p style={{ ...TITLE, marginBottom: 12 }}>Macro distribution</p>
        <MacroSplitEditor split={nutritionGoal.macroSplit} calories={targets.calories} onChange={setMacroSplit} disabled={locked} squares />
        <p className="text-charcoal-faint" style={{ margin: "12px 0 0", fontSize: 9.5, lineHeight: 1.4 }}>
          {MACRO_REBALANCE_NOTE}
        </p>
      </section>

      <section style={CARD}>
        <p style={{ ...TITLE, marginBottom: 12 }}>Plan</p>
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
            onClick={(e) => setRestrictionAnchor(restrictionOpen ? null : e.currentTarget)}
          >
            <span className="flex items-center gap-1">
              Dietary restriction
              <ChevronDown size={11} className={restrictionOpen ? "rotate-180" : undefined} />
            </span>
          </Chip>
        </div>
        {planError && <p className="text-[10.5px] font-semibold text-[#C0392B] dark:text-[#FF6B5E] mt-1.5">{planError}</p>}
        {!planError && nutritionGoal.planType === "existing" && (
          <p className="text-[10.5px] text-charcoal-faint mt-1.5">
            {user.linkedProfessionalName} is responsible for your goals and macros while this plan is active: weight goal, calorie target and macro distribution can only be changed by them.
          </p>
        )}
        <PopupMenu
          open={restrictionOpen}
          anchor={restrictionAnchor}
          onClose={() => setRestrictionAnchor(null)}
          options={dietaryRestrictionOptions}
          selected={dietaryRestriction}
          onSelect={(value) => {
            // Unchanged: tapping the active restriction clears it.
            setDietaryRestriction(dietaryRestriction === value ? null : value);
            setRestrictionAnchor(null);
          }}
          width={160}
          align="right"
        />
        {dietaryRestriction && (
          <button
            onClick={() => setDietaryRestriction(null)}
            className="tap flex items-center gap-1.5 text-xs font-semibold text-charcoal-faint mt-2"
          >
            <X size={12} />
            {dietaryRestrictionOptions.find((r) => r.value === dietaryRestriction)?.label} active. Incompatible Diary
            items are highlighted. Tap to clear.
          </button>
        )}
      </section>
    </div>
  );
}
