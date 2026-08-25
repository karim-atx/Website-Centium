import { useMemo, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Chip } from "../../components/ui/Chip";
import { MacroSplitEditor } from "../../components/food/MacroSplitEditor";
import { CreateMealSheet } from "../../components/food/CreateMealSheet";
import { WeightTrendChart } from "../../components/health/WeightTrendChart";
import { useApp } from "../../context/AppContext";
import type { ProfessionalClient, WeightGoalType } from "../../types";
import { Plus, Trash2, ClipboardList, Check } from "lucide-react";
import { mealLabels } from "../../services/nutrition";

const goalOptions: { value: WeightGoalType; label: string }[] = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain weight" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const isoDaysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// V7 (QA 7.0): a professional's client has no real logged weight-history in
// this prototype (only a current value + a trend delta) — this builds a
// plausible 7-day series ending at the client's actual current weight, the
// same "rescale a mocked shape to the real endpoint" approach GoalsPanel
// uses for the client's own chart.
const weightHistoryFor = (c: ProfessionalClient) => {
  const end = c.lastWeightKg;
  const start = end - c.weightTrend;
  return Array.from({ length: 7 }, (_, i) => ({
    date: isoDaysAgo(6 - i),
    value: +(start + ((end - start) * i) / 6).toFixed(1),
  }));
};

// V6 (QA 6.0): the professional's Meal Plan Builder — replaces the Food tab
// concept for the professional's own UI. Since this prototype has a single
// shared account rather than real separate per-client backends, "editing
// the client's Goals & Macros" edits the same nutritionGoal a client would
// see on their own Food > Goals & Macros tab, and "creating a meal plan for
// the client" adds it to the same customMeals list their Meal Prep tab
// reads from.
export default function MealPlanBuilderTab() {
  const {
    professionalClients,
    nutritionGoal,
    setWeightGoal,
    setMacroSplit,
    setNutritionGoal,
    customMeals,
    removeCustomMeal,
  } = useApp();
  const [clientId, setClientId] = useState(professionalClients[0]?.id ?? "");
  const [createMealOpen, setCreateMealOpen] = useState(false);
  const [desiredWeightDraft, setDesiredWeightDraft] = useState(String(nutritionGoal.desiredWeightKg ?? ""));
  const [weightGoalError, setWeightGoalError] = useState<string | null>(null);

  const client = professionalClients.find((c) => c.id === clientId);
  const weightHistory = useMemo(() => (client ? weightHistoryFor(client) : []), [client]);

  // V7 (QA 7.0): mirrors the client UI's own desired-weight validation —
  // a target that contradicts the chosen direction is rejected, not
  // silently accepted.
  const confirmDesiredWeight = () => {
    if (!client) return;
    if (nutritionGoal.desiredWeightConfirmed) {
      setNutritionGoal({ ...nutritionGoal, desiredWeightConfirmed: false });
      setWeightGoalError(null);
      return;
    }
    const kg = Number(desiredWeightDraft);
    if (!kg) return;
    if (nutritionGoal.weightGoal === "lose" && kg >= client.lastWeightKg) {
      setWeightGoalError(`Desired weight must be lower than ${client.name}'s current weight (${client.lastWeightKg}kg) to lose weight.`);
      return;
    }
    if (nutritionGoal.weightGoal === "gain" && kg <= client.lastWeightKg) {
      setWeightGoalError(`Desired weight must be higher than ${client.name}'s current weight (${client.lastWeightKg}kg) to gain weight.`);
      return;
    }
    setWeightGoalError(null);
    setNutritionGoal({ ...nutritionGoal, desiredWeightKg: kg, desiredWeightConfirmed: true });
  };

  const changeWeightGoal = (g: WeightGoalType) => {
    setWeightGoal(g, nutritionGoal.weeklyRateKg || 0.5);
    setDesiredWeightDraft("");
    setWeightGoalError(null);
  };

  return (
    <div>
      <PageHeader title="Meal Plans" subtitle="Edit goals & build meal plans for your clients" />

      {professionalClients.length === 0 ? (
        <Card className="text-center py-8">
          <p className="text-sm text-charcoal-faint">Add a client first to build a meal plan for them.</p>
        </Card>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-5">
            {professionalClients.map((c) => (
              <Chip key={c.id} active={clientId === c.id} onClick={() => setClientId(c.id)}>
                {c.name}
              </Chip>
            ))}
          </div>

          <Card className="mb-5">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
              {client?.name}'s weight goal
            </p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {goalOptions.map((g) => (
                <button
                  key={g.value}
                  onClick={() => changeWeightGoal(g.value)}
                  className={`tap rounded-xl py-2.5 text-xs font-semibold border transition-colors ${
                    nutritionGoal.weightGoal === g.value
                      ? "bg-sohati text-white border-sohati"
                      : "bg-cream-soft border-transparent text-charcoal-soft"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {nutritionGoal.weightGoal !== "maintain" && (
              <>
                <label className="block mb-4">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Desired weight</span>
                  <div className="flex items-center gap-2">
                    <input
                      value={desiredWeightDraft}
                      onChange={(e) => setDesiredWeightDraft(e.target.value.replace(/[^\d.]/g, ""))}
                      disabled={nutritionGoal.desiredWeightConfirmed}
                      inputMode="decimal"
                      className="flex-1 rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm font-semibold text-charcoal focus:outline-none focus:ring-2 focus:ring-sohati/20 disabled:opacity-60"
                    />
                    <span className="text-xs text-charcoal-faint">kg</span>
                    <button
                      onClick={confirmDesiredWeight}
                      aria-label={nutritionGoal.desiredWeightConfirmed ? "Edit desired weight" : "Confirm desired weight"}
                      className={`tap w-9 h-9 rounded-full flex items-center justify-center shrink-0 border-2 transition-colors ${
                        nutritionGoal.desiredWeightConfirmed
                          ? "bg-charcoal/10 border-transparent text-charcoal-faint"
                          : "bg-sohati border-sohati text-white"
                      }`}
                    >
                      <Check size={16} strokeWidth={3} />
                    </button>
                  </div>
                  {weightGoalError && <p className="text-xs font-semibold text-[#C0392B] mt-1.5">{weightGoalError}</p>}
                </label>

                <label className="block">
                  <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">
                    Desired weekly rate (kg/week)
                  </span>
                  <input
                    type="range"
                    min={0.1}
                    max={1}
                    step={0.1}
                    value={nutritionGoal.weeklyRateKg || 0.5}
                    onChange={(e) => setWeightGoal(nutritionGoal.weightGoal, Number(e.target.value))}
                    disabled={!nutritionGoal.desiredWeightConfirmed}
                    className="w-full disabled:opacity-50"
                    style={{ accentColor: nutritionGoal.weightGoal === "gain" ? "#3F9165" : "#C0392B" }}
                  />
                  <p className="text-xs text-charcoal-faint mt-1">
                    {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                    {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg / week
                  </p>
                  {!nutritionGoal.desiredWeightConfirmed && (
                    <p className="text-[11px] text-charcoal-faint mt-1">
                      Add and confirm a desired weight above to set the weekly rate.
                    </p>
                  )}
                </label>
              </>
            )}
          </Card>

          {client && (
            <Card className="mb-5">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
                  {client.name}'s weight trend
                </p>
              </div>
              <div className="mb-1">
                <p className="text-2xl font-bold text-charcoal">{client.lastWeightKg} kg</p>
                <p className="text-xs text-charcoal-faint">
                  {client.weightTrend <= 0 ? "↓" : "↑"} {Math.abs(client.weightTrend)} kg this week
                </p>
              </div>
              <div className="flex justify-center">
                <WeightTrendChart history={weightHistory} width={260} height={110} />
              </div>
            </Card>
          )}

          <Card className="mb-6">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-3">
              Macro distribution
            </p>
            <MacroSplitEditor
              split={nutritionGoal.macroSplit}
              calories={nutritionGoal.targetCalories}
              onChange={setMacroSplit}
            />
          </Card>

          <div className="flex items-center justify-between mb-2.5">
            <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide">
              Custom meal plans
            </p>
            <button
              onClick={() => setCreateMealOpen(true)}
              className="tap flex items-center gap-1.5 text-xs font-semibold text-sohati"
            >
              <Plus size={13} /> New meal plan
            </button>
          </div>
          <div className="space-y-2">
            {customMeals.map((m) => (
              <Card key={m.id} padded={false} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ClipboardList size={16} className="text-sohati shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal truncate flex items-center gap-1.5">
                      {m.title}
                      {m.mealType && (
                        <span className="text-[9px] font-bold uppercase tracking-wide text-sohati-dark bg-sohati-pale rounded-full px-1.5 py-0.5 shrink-0">
                          {mealLabels[m.mealType]}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-charcoal-faint">
                      {m.items.length} item{m.items.length !== 1 ? "s" : ""} · in {client?.name}'s Meal Prep
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeCustomMeal(m.id)}
                  aria-label={`Remove ${m.title}`}
                  className="tap text-charcoal-faint shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </Card>
            ))}
            {customMeals.length === 0 && (
              <Card className="text-center py-6">
                <p className="text-sm text-charcoal-faint">No meal plans yet.</p>
              </Card>
            )}
          </div>
        </>
      )}

      <CreateMealSheet open={createMealOpen} onClose={() => setCreateMealOpen(false)} clientId={clientId || undefined} />
    </div>
  );
}
