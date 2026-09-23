import { useRef, useState } from "react";
import type React from "react";
import { Plus } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CreateMealSheet } from "../../components/food/CreateMealSheet";
import { CreateRecipeSheet } from "../../components/food/CreateRecipeSheet";
import { MealPrepFlowSheet, type PrepKind } from "../../components/food/MealPrepFlowSheet";
import { MacroBar, sumItems, divideTotals, PREP_TEAL, PREP_LAV, type PrepItem } from "../../components/food/mealPrepShared";
import type { CustomMeal, Recipe } from "../../types";

// Pull-to-refresh, the same gesture and threshold as the Health page's: the
// load-error lines ask the user to "Pull to retry" (Part 4 Q7).
const PULL_THRESHOLD = 70;

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
  const { customMeals, customMealsError, recipes, recipesError, reloadMealPrep } = useApp();

  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullStartY = useRef<number | null>(null);
  const handlePullStart = (clientY: number) => {
    if (refreshing || window.scrollY > 0) return;
    pullStartY.current = clientY;
  };
  const handlePullMove = (clientY: number) => {
    if (pullStartY.current === null || refreshing) return;
    const delta = clientY - pullStartY.current;
    if (delta > 0) setPullY(Math.min(delta, 100));
  };
  const handlePullEnd = () => {
    if (pullStartY.current === null) return;
    pullStartY.current = null;
    if (pullY >= PULL_THRESHOLD) {
      setRefreshing(true);
      void reloadMealPrep().finally(() => setRefreshing(false));
    }
    setPullY(0);
  };

  const [flow, setFlow] = useState<null | { kind: PrepKind; screen: "list" | "detail"; itemId?: string }>(null);
  const [createKind, setCreateKind] = useState<PrepKind | null>(null);
  const [editMeal, setEditMeal] = useState<CustomMeal | null>(null);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);
  // Item 11: create opened from the flow's List or Detail steps back there
  // (the chevron); opened from a card's CTA it has no previous screen.
  const [createFromFlow, setCreateFromFlow] = useState(false);

  const openCreate = (kind: PrepKind, fromFlow = false) => {
    if (kind === "meals") setEditMeal(null);
    else setEditRecipe(null);
    setCreateFromFlow(fromFlow);
    setCreateKind(kind);
  };
  const openEdit = (kind: PrepKind, id: string) => {
    if (kind === "meals") setEditMeal(customMeals.find((m) => m.id === id) ?? null);
    else setEditRecipe(recipes.find((r) => r.id === id) ?? null);
    setCreateFromFlow(true);
    setCreateKind(kind);
  };

  return (
    <div
      className="space-y-3 animate-fade-slide-up"
      onTouchStart={(e) => handlePullStart(e.touches[0].clientY)}
      onTouchMove={(e) => handlePullMove(e.touches[0].clientY)}
      onTouchEnd={handlePullEnd}
      onMouseDown={(e) => handlePullStart(e.clientY)}
      onMouseMove={(e) => e.buttons === 1 && handlePullMove(e.clientY)}
      onMouseUp={handlePullEnd}
      onMouseLeave={handlePullEnd}
    >
      {(pullY > 0 || refreshing) && (
        <div className="flex items-center justify-center overflow-hidden" style={{ height: refreshing ? 28 : pullY }}>
          <p className="text-[10px] font-semibold text-charcoal-faint">
            {refreshing ? "Refreshing…" : pullY >= PULL_THRESHOLD ? "Release to refresh" : "Pull to refresh"}
          </p>
        </div>
      )}
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
        onCreate={() => openCreate("meals", true)}
      />
      <MealPrepFlowSheet
        kind="recipes"
        open={flow?.kind === "recipes"}
        initialScreen={flow?.kind === "recipes" ? flow.screen : "list"}
        initialItemId={flow?.kind === "recipes" ? flow.itemId : undefined}
        onClose={() => setFlow(null)}
        onEdit={(id) => openEdit("recipes", id)}
        onCreate={() => openCreate("recipes", true)}
      />

      <CreateMealSheet
        open={createKind === "meals"}
        onClose={() => setCreateKind(null)}
        editMeal={editMeal}
        hasPrevious={createFromFlow}
      />
      <CreateRecipeSheet
        open={createKind === "recipes"}
        onClose={() => setCreateKind(null)}
        editRecipe={editRecipe}
        hasPrevious={createFromFlow}
      />
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
  // Newest first: recipes already arrive that way (getRecipes orders
  // descending, item 11); custom meals keep their ascending query and are
  // reversed here instead (Part 4 Q2).
  const newestFirst = isR ? entries : entries.slice().reverse();
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
        {/* Item 11: the badge hides while the read has failed. */}
        {!error && (
          <span
            className="flex-none whitespace-nowrap"
            style={{ fontSize: 10.5, fontWeight: 700, color: c.text, background: c.badgeBg, borderRadius: 9999, padding: "4px 10px" }}
          >
            {count ? `${count} saved` : "None yet"}
          </span>
        )}
      </div>

      {/* A failed read must never look empty (Part 4 Q7): the error line
          replaces the rows, then the CTA. */}
      {error ? (
        <div>
          <p className="mb-[9px]" style={{ fontSize: 13, color: "#5B5349" }}>
            {isR ? "Couldn't load your recipes. Pull to retry." : "Couldn't load your meals. Pull to retry."}
          </p>
          {cta}
        </div>
      ) : count > 0 ? (
        <>
          <div className="flex flex-col gap-[7px]">
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
          <div className="mt-[9px]">{cta}</div>
        </>
      ) : (
        <div>
          <p className="mb-[9px]" style={{ fontSize: 13, color: isR ? "rgba(95,80,147,0.8)" : "rgba(60,107,101,0.8)" }}>
            {isR ? "No recipes yet" : "No custom meals yet"}
          </p>
          {cta}
        </div>
      )}
    </div>
  );
};
