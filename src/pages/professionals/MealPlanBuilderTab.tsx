import { useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
import { Button } from "../../components/ui/Button";
import { Chip } from "../../components/ui/Chip";
import { MacroSplitEditor } from "../../components/food/MacroSplitEditor";
import { CreateMealSheet } from "../../components/food/CreateMealSheet";
import { useApp } from "../../context/AppContext";
import type { WeightGoalType } from "../../types";
import { Plus, Trash2, ClipboardList } from "lucide-react";

const goalOptions: { value: WeightGoalType; label: string }[] = [
  { value: "lose", label: "Lose weight" },
  { value: "maintain", label: "Maintain" },
  { value: "gain", label: "Gain weight" },
];

// V6 (QA 6.0): the professional's Meal Plan Builder — replaces the Food tab
// concept for the professional's own UI. Since this prototype has a single
// shared account rather than real separate per-client backends, "editing
// the client's Goals & Macros" edits the same nutritionGoal a client would
// see on their own Food > Goals & Macros tab, and "creating a meal plan for
// the client" adds it to the same customMeals list their Meal Prep tab
// reads from.
export default function MealPlanBuilderTab() {
  const { professionalClients, nutritionGoal, setWeightGoal, setMacroSplit, customMeals, removeCustomMeal } =
    useApp();
  const [clientId, setClientId] = useState(professionalClients[0]?.id ?? "");
  const [createMealOpen, setCreateMealOpen] = useState(false);

  const client = professionalClients.find((c) => c.id === clientId);

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
                  onClick={() => setWeightGoal(g.value, nutritionGoal.weeklyRateKg || 0.5)}
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
                  className="w-full"
                  style={{ accentColor: nutritionGoal.weightGoal === "gain" ? "#3F9165" : "#C0392B" }}
                />
                <p className="text-xs text-charcoal-faint mt-1">
                  {nutritionGoal.weightGoal === "gain" ? "+" : "-"}
                  {(nutritionGoal.weeklyRateKg || 0.5).toFixed(1)} kg / week
                </p>
              </label>
            )}
          </Card>

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
                    <p className="text-sm font-semibold text-charcoal truncate">{m.title}</p>
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

          <Button fullWidth size="lg" className="mt-6" onClick={() => setCreateMealOpen(true)}>
            <Plus size={15} /> Build a meal plan
          </Button>
        </>
      )}

      <CreateMealSheet open={createMealOpen} onClose={() => setCreateMealOpen(false)} />
    </div>
  );
}
