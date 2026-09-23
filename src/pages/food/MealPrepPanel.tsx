import { useState } from "react";
import type React from "react";
import { Plus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CreateMealSheet } from "../../components/food/CreateMealSheet";
import { CreateRecipeSheet } from "../../components/food/CreateRecipeSheet";
import { MealPrepFlowSheet, type PrepKind } from "../../components/food/MealPrepFlowSheet";
import { MacroBar, sumItems, divideTotals, PREP_TEAL, PREP_LAV, type PrepItem } from "../../components/food/mealPrepShared";
import type { CustomMeal, Recipe } from "../../types";

// Mobile handoff item 10 (README lines 613-774, CentiumMealPrep.dc.html):
// the tab is now two widget cards modelled on the Habits widget — tinted
// container, caps title top-left, count badge top-right, up to three
// newest-first preview rows with a macro bar, then a CTA. Tapping the card
// body opens that item's List screen; tapping a preview row (stopping
// propagation so the card body's own handler doesn't also fire) opens that
// item's Detail screen directly; the CTA (also stopping propagation) opens
// Create. List/Detail/Advanced live in MealPrepFlowSheet; Create/Edit stays
// its own sheet (CreateMealSheet already worked this way before this
// handoff; CreateRecipeSheet mirrors it).
export default function MealPrepPanel() {
  const { customMeals, customMealsError, recipes, recipesError } = useApp();

  const [flow, setFlow] = useState<null | { kind: PrepKind; screen: "list" | "detail"; itemId?: string }>(null);
  const [createKind, setCreateKind] = useState<PrepKind | null>(null);
  const [editMeal, setEditMeal] = useState<CustomMeal | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);

  const openCreate = (kind: PrepKind) => {
    if (kind === "meals") setEditMeal(null);
    else setEditRecipe(null);
    setCreateKind(kind);
  };
  const openEdit = (kind: PrepKind, id: string) => {
    if (kind === "meals") setEditMeal(customMeals.find((m) => m.id === id) ?? null);
    else setEditRecipe(recipes.find((r) => r.id === id) ?? null);
    setCreateKind(kind);
  };

  return (
    <div className="space-y-3 animate-fade-slide-up">
      <PrepCard
        kind="meals"
        entries={customMeals}
        error={customMealsError}
        onOpenList={() => setFlow({ kind: "meals", screen: "list" })}
        onOpenDetail={(id) => setFlow({ kind: "meals", screen: "detail", itemId: id })}
        onCreate={() => openCreate("meals")}
      />
      <PrepCard
        kind="recipes"
        entries={recipes}
        error={recipesError}
        onOpenList={() => setFlow({ kind: "recipes", screen: "list" })}
        onOpenDetail={(id) => setFlow({ kind: "recipes", screen: "detail", itemId: id })}
        onCreate={() => openCreate("recipes")}
      />

      <MealPrepFlowSheet
        kind="meals"
        open={flow?.kind === "meals"}
        initialScreen={flow?.kind === "meals" ? flow.screen : "list"}
        initialItemId={flow?.kind === "meals" ? flow.itemId : undefined}
        onClose={() => setFlow(null)}
        onEdit={(id) => openEdit("meals", id)}
        onCreate={() => openCreate("meals")}
      />
      <MealPrepFlowSheet
        kind="recipes"
        open={flow?.kind === "recipes"}
        initialScreen={flow?.kind === "recipes" ? flow.screen : "list"}
        initialItemId={flow?.kind === "recipes" ? flow.itemId : undefined}
        onClose={() => setFlow(null)}
        onEdit={(id) => openEdit("recipes", id)}
        onCreate={() => openCreate("recipes")}
      />

      <CreateMealSheet open={createKind === "meals"} onClose={() => setCreateKind(null)} editMeal={editMeal} />
      <CreateRecipeSheet open={createKind === "recipes"} onClose={() => setCreateKind(null)} editRecipe={editRecipe} />
    </div>
  );
}

const PrepCard: React.FC<{
  kind: PrepKind;
  entries: (CustomMeal | Recipe)[];
  error: string | null;
  onOpenList: () => void;
  onOpenDetail: (id: string) => void;
  onCreate: () => void;
}> = ({ kind, entries, error, onOpenList, onOpenDetail, onCreate }) => {
  const isR = kind === "recipes";
  const c = isR ? PREP_LAV : PREP_TEAL;
  // Handoff acceptance: "newest-first display, CLIENT-SIDE ONLY" — the
  // services intentionally keep `created_at ascending`; reverse here only.
  const newestFirst = entries.slice().reverse();
  const preview = newestFirst.slice(0, 3);
  const count = entries.length;

  const cta = (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onCreate();
      }}
      data-cta="1"
      className="tap flex items-center justify-center gap-1.5 w-full rounded-xl text-[13px] font-bold text-white"
      style={{ background: c.cta, padding: "12px 0" }}
    >
      <Plus size={14} strokeWidth={2} /> {isR ? "Create Recipe" : "Create Meal"}
    </button>
  );

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenList}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onOpenList();
      }}
      className="block w-full text-left rounded-[20px] cursor-pointer"
      style={{ padding: 16, background: c.container }}
    >
      <div className="flex items-center justify-between gap-2.5 mb-3">
        <span
          className="whitespace-nowrap"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase", color: c.caps }}
        >
          {isR ? "Recipes" : "Custom Meals"}
        </span>
        <span
          className="flex-none whitespace-nowrap"
          style={{ fontSize: 10.5, fontWeight: 700, color: c.text, background: c.badgeBg, borderRadius: 9999, padding: "4px 10px" }}
        >
          {count ? `${count} saved` : "None yet"}
        </span>
      </div>

      {/* A failed read must not look empty (handoff Q7) — distinct from the
          "No custom meals/recipes yet" empty-state copy below. */}
      {error && (
        <p className="text-[11px] font-semibold text-status-high mb-2">
          {`Couldn't refresh your ${isR ? "recipes" : "custom meals"}${count ? " — showing what was saved on this device." : "."}`}
        </p>
      )}

      {count > 0 ? (
        <>
          <div className="flex flex-col gap-1.5">
            {preview.map((x) => {
              const total = sumItems(x.items as PrepItem[]);
              const servings = "servings" in x ? x.servings : 1;
              const per = isR ? divideTotals(total, servings) : total;
              return (
                <button
                  key={x.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDetail(x.id);
                  }}
                  className="tap flex items-center justify-between gap-2.5 rounded-xl w-full text-left"
                  style={{ background: c.rowBg, padding: "11px 13px" }}
                >
                  <span className="flex-1 min-w-0 text-[13.5px] font-bold truncate" style={{ color: "#241F1B" }}>
                    {x.title}
                  </span>
                  <MacroBar p={per.p} c={per.c} f={per.f} />
                  <span className="flex-none text-[12px] font-semibold tabular-nums whitespace-nowrap" style={{ color: c.text }}>
                    {Math.round(per.kcal)}{isR ? " /srv" : " kcal"}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="mt-2.5">{cta}</div>
        </>
      ) : (
        <div>
          {!error && (
            <p className="mb-2.5" style={{ fontSize: 13, color: isR ? "rgba(95,80,147,0.8)" : "rgba(60,107,101,0.8)" }}>
              {isR ? "No recipes yet" : "No custom meals yet"}
            </p>
          )}
          {cta}
        </div>
      )}
    </div>
  );
};
