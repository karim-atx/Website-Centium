import { useState } from "react";
import type React from "react";
import clsx from "clsx";
import { Check, ChevronDown, Equal, Minus, Plus, TrendingDown, TrendingUp, TriangleAlert, X } from "lucide-react";
import { MACRO_REBALANCE_NOTE } from "../../../components/food/MacroSplitEditor";
import { WeightTrendChart } from "../../../components/health/WeightTrendChart";
import { useApp } from "../../../context/AppContext";
import { PregnancyNutritionCard } from "../../../components/pregnancy/PregnancyGuidance";
import { calculateTDEE, isReferenceOnlyTarget, REFERENCE_INTAKE_NOTE, targetsFromGoal } from "../../../services/nutrition";
import { canDrawSparkline, trendLabel, withinDays } from "../../../services/health-metrics/series";
import type { MacroSplit, PlanType, WeightGoalType } from "../../../types";
import { AllergiesSheet } from "../../../components/food/AllergiesSheet";
import { MealPlanCard } from "../../../components/food/MealPlanCard";
import { allergyLine, TARGETS_LOCKED_MESSAGE, withProfessionalTargets, type ProfessionalTargets } from "../../../services/nutrition/clientNutritionModel";
import { useMyAllergies } from "../useFoodProfessional";
import { dietaryRestrictionOptions } from "../../../utils/dietaryRestrictions";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { appLocale } from "../../../i18n/format";
import { isRtl, t, tk, tx } from "../../../i18n/core";
import { FoodWebMenu } from "./FoodWebMenu";

// Website viewport v1 · WC-FO.2 Goals & Macros (FO Goals Grid v8, as the Food
// page imports it: v 7). A 12-column grid, 24 apart: Weight goal (6) beside
// Plan (6); Current weight (3) and TDEE estimate (3) over Daily target (6),
// beside Macro distribution (6, two rows). Cards white, 1px #E7E6E6, r16,
// padding 24 (Macro 20), titles 12/16 800 0.08em #6D50D3. Dietary
// restriction opens the anchored menu (WC-FO.2.1). Lose and Gain keep the
// mobile panel's extra fields (desired weight and weekly rate, the weight
// trend and the target calories) inside the same cards. What is read, saved
// and locked is the mobile GoalsPanel's (client mode), unchanged.

const GOALS: { value: WeightGoalType; label: string; Icon: typeof Equal }[] = [
  { value: "lose", label: tk("Lose weight"), Icon: TrendingDown },
  { value: "maintain", label: "Maintain", Icon: Equal },
  { value: "gain", label: tk("Gain weight"), Icon: TrendingUp },
];

const CARD: React.CSSProperties = { background: "#FFFFFF", border: "1px solid #E7E6E6", borderRadius: 16, padding: 24, boxSizing: "border-box", minWidth: 0 };
const TITLE: React.CSSProperties = { margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#6D50D3" };
const NOTE: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" };
const FIGURE: React.CSSProperties = { margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 800, color: "#241F1B", whiteSpace: "nowrap" };
const UNIT: React.CSSProperties = { fontSize: 15, fontWeight: 600, marginInlineStart: 4 };
const MISSING: React.CSSProperties = { margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 600, color: "#776E64" };
const ERROR: React.CSSProperties = { margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#C0392B" };
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2";

const existingPlanPreset = { weightGoal: "lose" as WeightGoalType, weeklyRateKg: 0.4, calorieAdjust: -400, macroSplit: { proteinPct: 35, carbsPct: 40, fatPct: 25 } };

// MacroSplitEditor's AMDR ranges, colours and squares (FO Goals Grid v8 v7:
// a 12 track, a 24 thumb, the label 22 above it, a 72 × 52 r12 square).
const MACROS = [
  { key: "proteinPct" as const, label: tk("Protein"), color: "#7D6BB5", ink: "#7D6BB5", tint: "#F0EDF9", kcalPerG: 4, min: 10, max: 35 },
  { key: "carbsPct" as const, label: tk("Carbs"), color: "#AEA1DC", ink: "#8175C2", tint: "#F0EDF9", kcalPerG: 4, min: 30, max: 65 },
  { key: "fatPct" as const, label: tk("Fat"), color: "#A2C8C2", ink: "#6F9993", tint: "#EAF4F2", kcalPerG: 9, min: 20, max: 40 },
];
type Macro = (typeof MACROS)[number];
const clampMacro = (v: number, m: Macro) => Math.min(m.max, Math.max(m.min, v));

/** The mobile editor's rebalance: the other two keep their ratio, each kept inside its AMDR range. */
function rebalance(split: MacroSplit, key: keyof MacroSplit, raw: number): MacroSplit {
  const m = MACROS.find((x) => x.key === key)!;
  const value = clampMacro(raw, m);
  const [o1, o2] = MACROS.filter((x) => x.key !== key);
  const remaining = 100 - value;
  const othersSum = split[o1.key] + split[o2.key];
  const ratio = othersSum === 0 ? 0.5 : split[o1.key] / othersSum;
  let v1 = clampMacro(Math.round(ratio * remaining), o1);
  let v2 = remaining - v1;
  if (v2 < o2.min) v2 = o2.min;
  else if (v2 > o2.max) v2 = o2.max;
  v1 = clampMacro(remaining - v2, o1);
  v2 = remaining - v1;
  return { ...split, [key]: value, [o1.key]: v1, [o2.key]: v2 };
}

function MacroSliders({ split, calories, onChange, disabled }: { split: MacroSplit; calories: number; onChange: (s: MacroSplit) => void; disabled: boolean }) {
  const dir = isRtl() ? "left" : "right";
  return (
    <div className={clsx("flex flex-col", disabled && "opacity-50 pointer-events-none")} style={{ gap: 24, padding: "16px 0" }}>
      <style>{`
        .fo-macro{-webkit-appearance:none;appearance:none;height:12px;border-radius:999px;outline:none;display:block;width:100%;margin:0;cursor:pointer}
        .fo-macro::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:24px;height:24px;border-radius:999px;background:var(--fo-thumb);border:none;cursor:grab}
        .fo-macro::-moz-range-thumb{width:24px;height:24px;border-radius:999px;background:var(--fo-thumb);border:none;cursor:grab}
        .fo-macro:focus-visible{outline:2px solid #AEA1DC;outline-offset:4px}
      `}</style>
      {MACROS.map((m) => {
        const pct = split[m.key];
        const grams = Math.round((calories * (pct / 100)) / m.kcalPerG);
        const frac = ((pct - m.min) / (m.max - m.min)) * 100;
        return (
          <div key={m.key} className="flex items-center" style={{ gap: 18 }}>
            <div className="flex-1 min-w-0">
              <p style={{ margin: "0 0 22px", fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#241F1B" }}>{t(m.label)}</p>
              <input
                type="range"
                min={m.min}
                max={m.max}
                value={pct}
                onChange={(e) => onChange(rebalance(split, m.key, Number(e.target.value)))}
                disabled={disabled}
                aria-label={t("{macro} share", { macro: t(m.label) })}
                className="fo-macro"
                style={{ ["--fo-thumb" as string]: m.color, backgroundImage: `linear-gradient(to ${dir}, ${m.color} ${frac}%, #F5F5F6 ${frac}%)` } as React.CSSProperties}
              />
            </div>
            <div className="flex flex-col items-center justify-center flex-none" style={{ width: 72, height: 52, borderRadius: 12, background: m.tint }}>
              <span style={{ fontSize: 17, lineHeight: "22px", fontWeight: 800, color: m.ink }}>{t("{n}g", { n: grams })}</span>
              <span style={{ fontSize: 13, lineHeight: "18px", color: m.ink, opacity: 0.6 }}>{pct}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PlanChip({ on, onClick, children, grow = 1, haspopup, expanded }: { on: boolean; onClick: (e: React.MouseEvent<HTMLButtonElement>) => void; children: React.ReactNode; grow?: number; haspopup?: "menu" | "dialog"; expanded?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={haspopup ? undefined : on}
      aria-haspopup={haspopup}
      aria-expanded={expanded}
      className={clsx("inline-flex items-center justify-center whitespace-nowrap", FOCUS, !on && "hover:!bg-[#F0EDF9] hover:!border-[#AEA1DC] hover:!text-[#5F5093]")}
      style={{
        flex: `${grow} 1 auto`,
        minWidth: "max-content",
        height: 40,
        gap: 6,
        borderRadius: 999,
        padding: "0 14px",
        fontSize: 15,
        border: `1px solid ${on ? "#AEA1DC" : "rgba(36,31,27,0.11)"}`,
        background: on ? "#AEA1DC" : "#FFFFFF",
        color: on ? "#FFFFFF" : "#5B5349",
        fontWeight: on ? 700 : 600,
      }}
    >
      {children}
    </button>
  );
}

export default function GoalsPanelWeb({ clientTargets, onAllergiesSaved }: { clientTargets?: ProfessionalTargets | null; onAllergiesSaved?: () => void }) {
  const app = useApp();
  const { user, healthSeries, metricValues, dietaryRestriction, setDietaryRestriction, pregnancy, cycleOffered, authUserId, nutritionGoal, setNutritionGoal, setWeightGoal, setMacroSplit, today } = app;
  const proTargets = clientTargets ?? null;
  const myAllergies = useMyAllergies(true);
  const [allergiesOpen, setAllergiesOpen] = useState(false);
  const hide = useHideNumbers();
  const [calorieEdit, setCalorieEdit] = useState<string | null>(null);
  const calorieDraft = calorieEdit ?? String(nutritionGoal.targetCalories);
  const [planError, setPlanError] = useState<string | null>(null);
  const [restrictionAnchor, setRestrictionAnchor] = useState<HTMLElement | null>(null);
  const [desiredEdit, setDesiredEdit] = useState<string | null>(null);
  const desiredDraft = desiredEdit ?? (nutritionGoal.desiredWeightKg != null ? String(nutritionGoal.desiredWeightKg) : "");
  const [weightGoalError, setWeightGoalError] = useState<string | null>(null);

  const locked = nutritionGoal.planType === "existing" || !!proTargets?.locked;
  const tdee = calculateTDEE(user);
  const targets = targetsFromGoal(nutritionGoal);
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
  const weightMeta = withinDays(healthSeries.weight, 7, today);
  const weight = { current: metricValues.weight, history: weightMeta.history };
  const rate = nutritionGoal.weeklyRateKg || 0.5;
  const desiredWeightKg = nutritionGoal.desiredWeightKg ?? user.weightKg;
  const currentKg = user.weightKg;
  const weeksToGoal = nutritionGoal.weightGoal !== "maintain" && rate > 0 && weight.current !== null && desiredWeightKg !== null ? Math.abs(desiredWeightKg - weight.current) / rate : 0;
  const reachDateObj = weeksToGoal > 0 ? new Date(Date.parse(`${today}T00:00:00Z`) + weeksToGoal * 7 * 86400000) : null;
  const reachDateIso = reachDateObj ? reachDateObj.toISOString().slice(0, 10) : null;
  const reachDate = reachDateObj ? reachDateObj.toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", year: "numeric" }) : null;

  const confirmDesiredWeight = () => {
    if (desiredEdit === null) return;
    setDesiredEdit(null);
    const kg = Number(desiredDraft);
    if (!desiredDraft.trim() || !kg) {
      setWeightGoalError(null);
      setNutritionGoal({ ...nutritionGoal, desiredWeightConfirmed: false });
      return;
    }
    if (nutritionGoal.weightGoal === "lose" && currentKg !== null && kg >= currentKg) {
      setWeightGoalError(t("Desired weight must be lower than your current weight ({kg} kg) to lose weight.", { kg: currentKg }));
      return;
    }
    if (nutritionGoal.weightGoal === "gain" && currentKg !== null && kg <= currentKg) {
      setWeightGoalError(t("Desired weight must be higher than your current weight ({kg} kg) to gain weight.", { kg: currentKg }));
      return;
    }
    setWeightGoalError(null);
    setNutritionGoal({ ...nutritionGoal, desiredWeightKg: kg, desiredWeightConfirmed: true });
  };
  const changeWeightGoal = (g: WeightGoalType) => {
    setWeightGoal(g, nutritionGoal.weeklyRateKg || 0.5);
    setDesiredEdit(null);
    setWeightGoalError(null);
  };
  const applyExistingPlan = () => {
    if (proTargets) {
      setNutritionGoal(withProfessionalTargets({ ...nutritionGoal, planType: "existing" }, proTargets));
      setCalorieEdit(null);
      return;
    }
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
    setCalorieEdit(null);
  };
  const applySuggested = () => {
    if (tdee === null) return;
    const delta = (nutritionGoal.weeklyRateKg * 7700) / 7;
    const cals = nutritionGoal.weightGoal === "lose" ? tdee - delta : nutritionGoal.weightGoal === "gain" ? tdee + delta : tdee;
    setNutritionGoal({ ...nutritionGoal, targetCalories: Math.round(cals) });
    setCalorieEdit(null);
  };
  const pickPlan = (p: PlanType) => {
    if (proTargets?.locked) {
      setPlanError(p === "existing" ? null : TARGETS_LOCKED_MESSAGE);
      return;
    }
    if (p === "existing") {
      if (!user.linkedProfessionalName && !proTargets) {
        setPlanError(t("You need to hire a professional before switching to an existing plan."));
        setNutritionGoal({ ...nutritionGoal, planType: "custom" });
        return;
      }
      setPlanError(null);
      applyExistingPlan();
    } else {
      setPlanError(null);
      setNutritionGoal({ ...nutritionGoal, planType: p });
    }
  };

  const maintain = nutritionGoal.weightGoal === "maintain";
  const rateColor = nutritionGoal.weightGoal === "gain" ? "#1D744A" : "#C0392B";
  const rateTint = nutritionGoal.weightGoal === "gain" ? "#9FC8B2" : "#DF9C95";
  const rateFrac = (((nutritionGoal.weeklyRateKg || 0.5) - 0.1) / 0.9) * 100;
  const restrictionOpen = !!restrictionAnchor;
  const r0 = !hide && cycleOffered && pregnancy ? 2 : 1;

  const useSuggested = (
    <button
      type="button"
      onClick={applySuggested}
      disabled={locked || tdee === null}
      className={clsx("self-start whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none hover:!bg-[#F0EDF9] active:scale-[0.96]", FOCUS)}
      style={{ height: 40, padding: "0 16px", borderRadius: 12, fontSize: 15, fontWeight: 700, background: "#F5F5F6", color: "#241F1B" }}
    >
      {t("Use suggested")}
    </button>
  );

  const tdeeMissing = (
    <>
      <p style={MISSING}>{t("Needs your height and weight")}</p>
      <p style={NOTE}>{t("Mifflin-St Jeor is a formula in both. Add them in Profile for a maintenance estimate.")}</p>
      {useSuggested}
    </>
  );

  const allergy = allergyLine(myAllergies.allergies, myAllergies.sharedWith, myAllergies.others ?? []);

  return (
    <div className="grid items-start animate-fade-slide-up" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))", gap: 24, alignContent: "start" }}>
      {r0 === 2 && pregnancy && (
        <div style={{ gridColumn: "1 / -1", gridRow: 1 }}>
          <PregnancyNutritionCard pregnancy={pregnancy} />
        </div>
      )}

      {hide ? (
        <section style={{ ...CARD, gridColumn: "1 / span 6", gridRow: r0 }} className="flex flex-col" aria-label={t("Goals & macros")}>
          <p style={{ ...TITLE, marginBottom: 16 }}>{t("Goals & macros")}</p>
          <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{t("Targets are hidden in recovery-sensitive mode.")}</p>
        </section>
      ) : (
        <>
          <section style={{ ...CARD, gridColumn: "1 / span 6", gridRow: r0, gap: 16 }} className="flex flex-col">
            <p style={TITLE}>{t("Weight goal")}</p>
            <div className="grid" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
              {GOALS.map((g) => {
                const on = nutritionGoal.weightGoal === g.value;
                return (
                  <button
                    key={g.value}
                    type="button"
                    onClick={() => changeWeightGoal(g.value)}
                    disabled={locked}
                    aria-pressed={on}
                    className={clsx("inline-flex items-center justify-center whitespace-nowrap disabled:opacity-50 active:scale-[0.96]", FOCUS, !on && "hover:!bg-[#F0EDF9]")}
                    style={{ height: 40, gap: 8, borderRadius: 12, fontSize: 15, fontWeight: 600, background: on ? "#AEA1DC" : "#F5F5F6", color: on ? "#FFFFFF" : "#5B5349" }}
                  >
                    <g.Icon size={20} strokeWidth={2.2} aria-hidden />
                    {g.value === "maintain" ? tx("Maintain", "weight goal") : t(g.label)}
                  </button>
                );
              })}
            </div>
            {!maintain && (
              <div className="flex items-end" style={{ gap: 24 }}>
                <label className="block flex-none">
                  <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349", marginBottom: 8 }}>
                    {t("Desired weight")}
                  </span>
                  <span className="flex items-center" style={{ gap: 8 }}>
                    <input
                      value={desiredDraft}
                      onChange={(e) => setDesiredEdit(e.target.value.replace(/[^\d.]/g, ""))}
                      onBlur={confirmDesiredWeight}
                      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                      disabled={locked}
                      inputMode="decimal"
                      aria-label={t("Desired weight in kg")}
                      className="text-center focus:outline-none focus:ring-2 focus:ring-[#AEA1DC] disabled:opacity-60"
                      style={{ width: 88, height: 40, borderRadius: 12, background: "#F5F5F6", border: "1px solid #E0DFE0", fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}
                    />
                    <span style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>{t("kg")}</span>
                  </span>
                </label>
                <label className="block flex-1 min-w-0">
                  <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#5B5349", marginBottom: 8 }}>
                    {t("Desired weekly rate")}
                  </span>
                  <span className="flex items-center" style={{ gap: 12, height: 40 }}>
                    <input
                      type="range"
                      min={0.1}
                      max={1}
                      step={0.1}
                      value={nutritionGoal.weeklyRateKg || 0.5}
                      onChange={(e) => setWeightGoal(nutritionGoal.weightGoal, Number(e.target.value))}
                      disabled={locked || !nutritionGoal.desiredWeightConfirmed}
                      aria-label={t("Desired weekly rate")}
                      className="flex-1 min-w-0 h-[6px] rounded-full appearance-none disabled:opacity-50"
                      style={{ accentColor: rateTint, backgroundImage: `linear-gradient(to ${isRtl() ? "left" : "right"}, ${rateTint} ${rateFrac}%, #F5F5F6 ${rateFrac}%)` }}
                    />
                    <span className="flex-none whitespace-nowrap" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                      {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                      {t("{n} kg / week", { n: (nutritionGoal.weeklyRateKg || 0.5).toFixed(1) })}
                    </span>
                  </span>
                </label>
              </div>
            )}
            {!maintain && weightGoalError && <p style={ERROR}>{t(weightGoalError)}</p>}
            {locked && <p style={{ ...NOTE, color: "#776E64" }}>{t("Locked: only your dietitian can edit this plan.")}</p>}
          </section>

          {maintain ? (
            <section style={{ ...CARD, gridColumn: "1 / span 3", gridRow: r0 + 1, gap: 10 }} className="flex flex-col">
              <div className="flex flex-col" style={{ gap: 10 }}>
                <p style={TITLE}>{t("Current weight")}</p>
                <p style={NOTE}>{t("Last logged")}</p>
              </div>
              {weight.current === null ? (
                <p style={MISSING}>{t("No weigh-ins yet")}</p>
              ) : (
                <p style={FIGURE}>
                  {weight.current}
                  <span style={UNIT}>{t("kg")}</span>
                </p>
              )}
            </section>
          ) : (
            <section style={{ ...CARD, gridColumn: "1 / span 3", gridRow: r0 + 1, gap: 10 }} className="flex flex-col">
              <div className="flex items-center justify-between" style={{ gap: 8 }}>
                <p style={TITLE}>{t("Weight trend")}</p>
                <span className="whitespace-nowrap" style={NOTE}>
                  {reachDate ? t("To goal") : t("7 days")}
                </span>
              </div>
              {weight.current === null ? (
                <p style={MISSING}>{t("No weigh-ins yet")}</p>
              ) : (
                <div>
                  <p style={FIGURE}>
                    {weight.current}
                    <span style={UNIT}>{t("kg")}</span>
                  </p>
                  {trendLabel(weightMeta) && <p style={NOTE}>{trendLabel(weightMeta)}</p>}
                </div>
              )}
              {canDrawSparkline(weightMeta) && (
                <WeightTrendChart history={weight.history} desiredWeightKg={reachDate ? desiredWeightKg ?? undefined : undefined} reachDate={reachDateIso} width={260} height={110} displayWidth={192} displayHeight={56} fill />
              )}
              {reachDate && (
                <p className="self-start" style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#5F5093", background: "#F0EDF9", borderRadius: 999, padding: "2px 10px" }}>
                  {t("At this rate, reach {kg} kg by {date}", { kg: desiredWeightKg ?? "", date: reachDate })}
                </p>
              )}
            </section>
          )}

          <section style={{ ...CARD, gridColumn: "4 / span 3", gridRow: r0 + 1, gap: 10 }} className="flex flex-col">
            <p style={TITLE}>{t("TDEE estimate")}</p>
            {tdee === null ? (
              tdeeMissing
            ) : (
              <>
                <p style={NOTE}>{t("Maintenance calories")}</p>
                <p style={FIGURE}>
                  {tdee.toLocaleString(appLocale())}
                  <span style={UNIT}>{t("kcal")}</span>
                </p>
                {!maintain && (
                  <div>
                    <p style={NOTE}>{t("Target calories")}</p>
                    <p style={{ ...FIGURE, color: rateColor }}>
                      {(suggestedForGoal ?? tdee).toLocaleString(appLocale())}
                      <span style={UNIT}>{t("kcal")}</span>
                    </p>
                    <p style={{ ...NOTE, color: rateColor, opacity: 0.6 }}>{nutritionGoal.weightGoal === "lose" ? t("to lose weight") : t("to gain weight")}</p>
                  </div>
                )}
                {useSuggested}
                <p style={NOTE}>{t("Based on the Mifflin-St Jeor Formula")}</p>
              </>
            )}
          </section>

          <section style={{ ...CARD, gridColumn: "1 / span 6", gridRow: r0 + 2, gap: 12 }} className="flex flex-col">
            <div className="flex items-center justify-between flex-wrap" style={{ columnGap: 12, rowGap: 12 }}>
              <p className="whitespace-nowrap" style={TITLE}>
                {t("Daily target")}
              </p>
              <div className="flex items-center ms-auto" style={{ gap: 10 }}>
                <span className="flex items-stretch flex-none" style={{ minHeight: 40, borderRadius: 999, background: "#F5F4FE" }}>
                  <button
                    type="button"
                    onClick={() => !locked && setCalorieEdit(String(Math.max(0, Number(calorieDraft || 0) - 50)))}
                    disabled={locked}
                    aria-label={t("Decrease by 50 kcal")}
                    className={clsx("flex items-center justify-center disabled:opacity-50 hover:!bg-[#EDEAFE]", FOCUS)}
                    style={{ width: 42, color: "#1D167D", borderStartStartRadius: 999, borderEndStartRadius: 999 }}
                  >
                    <Minus size={20} strokeWidth={2.2} aria-hidden />
                  </button>
                  <span className="flex items-center justify-center" style={{ width: 100, gap: 4, background: "#F2F2FE", borderInlineStart: "1px solid #EEECFE", borderInlineEnd: "1px solid #EEECFE" }}>
                    <input
                      value={calorieDraft}
                      onChange={(e) => setCalorieEdit(e.target.value.replace(/\D/g, ""))}
                      inputMode="numeric"
                      disabled={locked}
                      aria-label={t("Daily calorie target")}
                      className="text-end bg-transparent focus:outline-none disabled:opacity-60"
                      style={{ width: 48, padding: 0, fontSize: 17, fontWeight: 800, color: "#01012A" }}
                    />
                    <span style={{ fontSize: 13, color: "#8A8594" }}>{t("kcal")}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => !locked && setCalorieEdit(String(Number(calorieDraft || 0) + 50))}
                    disabled={locked}
                    aria-label={t("Increase by 50 kcal")}
                    className={clsx("flex items-center justify-center disabled:opacity-50 hover:!bg-[#EDEAFE]", FOCUS)}
                    style={{ width: 42, color: "#1D167D", borderStartEndRadius: 999, borderEndEndRadius: 999 }}
                  >
                    <Plus size={20} strokeWidth={2.2} aria-hidden />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const kcal = Number(calorieDraft);
                    if (!kcal) return;
                    setNutritionGoal({ ...nutritionGoal, targetCalories: kcal });
                    setCalorieEdit(null);
                  }}
                  disabled={locked}
                  className={clsx("inline-flex items-center flex-none whitespace-nowrap disabled:opacity-40 disabled:pointer-events-none hover:scale-[0.98] active:scale-[0.96]", FOCUS)}
                  style={{ height: 44, padding: "0 18px", gap: 6, borderRadius: 12, fontSize: 15, fontWeight: 700, background: "#AEA1DC", color: "#FFFFFF" }}
                >
                  <Check size={20} aria-hidden /> {t("Use custom")}
                </button>
              </div>
            </div>
            {isReferenceOnlyTarget(user) && <p style={NOTE}>{t(REFERENCE_INTAKE_NOTE)}</p>}
            {(nutritionGoal.pregnancyKcal ?? 0) > 0 && (
              <p style={NOTE}>
                {t("Plus {extra} kcal a day for pregnancy, {total} kcal in total. The pregnancy card at the top of this tab takes it off again.", { extra: nutritionGoal.pregnancyKcal ?? 0, total: targets.calories })}
              </p>
            )}
          </section>

          <section style={{ ...CARD, padding: 20, gridColumn: "7 / span 6", gridRow: `${r0 + 1} / span 2` }} className="flex flex-col">
            <p style={TITLE}>{t("Macro distribution")}</p>
            <MacroSliders split={nutritionGoal.macroSplit} calories={targets.calories} onChange={setMacroSplit} disabled={locked} />
            <p style={NOTE}>{t(MACRO_REBALANCE_NOTE)}</p>
          </section>
        </>
      )}

      <section style={{ ...CARD, gridColumn: "7 / span 6", gridRow: r0, gap: 16 }} className="flex flex-col">
        <p style={TITLE}>{hide ? t("Diet & allergies") : t("Plan")}</p>
        <div className="flex flex-wrap" style={{ gap: 8 }}>
          {!hide &&
            (["custom", "existing"] as PlanType[]).map((p) => (
              <PlanChip key={p} on={nutritionGoal.planType === p} onClick={() => pickPlan(p)}>
                {p === "custom" ? t("Custom plan") : t("Existing plan")}
              </PlanChip>
            ))}
          <PlanChip on={!!dietaryRestriction || restrictionOpen} grow={1.2} haspopup="menu" expanded={restrictionOpen} onClick={(e) => setRestrictionAnchor(restrictionOpen ? null : e.currentTarget)}>
            {t("Dietary restriction")}
            <ChevronDown size={16} aria-hidden style={{ transform: restrictionOpen ? "rotate(180deg)" : "none" }} />
          </PlanChip>
          <PlanChip on={myAllergies.allergies.length + (myAllergies.others?.length ?? 0) > 0 || allergiesOpen} haspopup="dialog" onClick={() => setAllergiesOpen(true)}>
            {t("Allergies")}
            <ChevronDown size={16} aria-hidden />
          </PlanChip>
        </div>
        {!hide && planError && <p style={ERROR}>{t(planError)}</p>}
        {!hide && !planError && nutritionGoal.planType === "existing" && (
          <p style={NOTE}>
            {t("{name} is responsible for your goals and macros while this plan is active: weight goal, calorie target and macro distribution can only be changed by them.", { name: proTargets?.professionalName || user.linkedProfessionalName || "" })}
          </p>
        )}
        {dietaryRestriction && (
          <button type="button" onClick={() => setDietaryRestriction(null)} className={clsx("self-start flex items-center text-start hover:underline", FOCUS)} style={{ gap: 6, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#71685E" }}>
            <X size={14} aria-hidden className="shrink-0" />
            {t("{diet} active. Incompatible Diary items are highlighted. Tap to clear.", { diet: t(dietaryRestrictionOptions.find((r) => r.value === dietaryRestriction)?.label ?? "") })}
          </button>
        )}
        {allergy && (
          <p className="flex items-center text-status-high" style={{ gap: 6, margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700 }}>
            <TriangleAlert size={14} strokeWidth={2.4} className="shrink-0" aria-hidden />
            {allergy}
          </p>
        )}
        {myAllergies.status === "error" && (
          <p className="flex items-center" style={{ gap: 10, margin: 0, fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
            {t("Couldn't load your allergies.")}
            <button type="button" onClick={myAllergies.reload} className={clsx("hover:underline", FOCUS)} style={{ fontWeight: 700, color: "#5F5093" }}>
              {t("Retry")}
            </button>
          </p>
        )}
      </section>

      {authUserId && (
        <div className="empty:hidden" style={{ gridColumn: "1 / -1" }}>
          <MealPlanCard userId={authUserId} today={today} card={CARD} title={TITLE} hideNumbers={hide} />
        </div>
      )}

      {restrictionAnchor && (
        <FoodWebMenu
          anchor={restrictionAnchor}
          onClose={() => setRestrictionAnchor(null)}
          width={184}
          align="end"
          label={t("Dietary restriction")}
          selected={dietaryRestriction}
          options={dietaryRestrictionOptions.map((o) => ({ value: o.value, label: t(o.label) }))}
          onSelect={(value) => setDietaryRestriction(dietaryRestriction === value ? null : value)}
        />
      )}

      {allergiesOpen && (
        <AllergiesSheet
          open
          onClose={() => setAllergiesOpen(false)}
          userId={authUserId}
          initial={myAllergies.allergies}
          initialOthers={myAllergies.others}
          onSaved={() => {
            myAllergies.reload();
            onAllergiesSaved?.();
          }}
        />
      )}
    </div>
  );
}
