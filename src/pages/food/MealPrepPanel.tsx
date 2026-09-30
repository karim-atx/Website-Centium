import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { EllipsisVertical, Package, Pencil, Plus, Soup, Trash2, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { CreateMealSheet } from "../../components/food/CreateMealSheet";
import { CreateRecipeSheet } from "../../components/food/CreateRecipeSheet";
import { CustomFoodForm } from "../../components/food/CustomFoodForm";
import { CustomFoodSheet } from "../../components/food/CustomFoodSheet";
import { MealPrepFlowSheet, type PrepKind } from "../../components/food/MealPrepFlowSheet";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { ConfirmCard } from "../../components/ui/ConfirmCard";
import { sumItems, divideTotals, PREP_PRIMARY, type PrepItem } from "../../components/food/mealPrepShared";
import { logoTone } from "../../components/food/logoTones";
import { foodCategoryIcon } from "../../utils/icons";
import { deleteCustomFood, listCustomFoods, type FoodSearchResult } from "../../services/food";

// Pull-to-refresh, the same gesture and threshold as the Health page's: the
// load-error lines ask the user to "Pull to retry" (Part 4 Q7).
const PULL_THRESHOLD = 70;

type SubTab = "meals" | "recipes" | "foods";

// Handover 2026-09-29 FO3.2: each sub-tab's colour, its rows' lighter tint
// and its icon colour, measured from the frame. Custom Foods is Dark Lavender.
const SUB: Record<SubTab, { label: string; color: string; row: string; icon: string; create: string; empty: string; emptyText: string }> = {
  meals: { label: "Meal Prep", color: PREP_PRIMARY.meals, row: "#ECF4F3", icon: "#4F7F78", create: "Create Meal", empty: "No meal prep yet", emptyText: "#5F8681" },
  recipes: { label: "Recipes", color: PREP_PRIMARY.recipes, row: "#F0EEF9", icon: "#816FB7", create: "Create Recipe", empty: "No recipes yet", emptyText: "#7A6DB0" },
  foods: { label: "Custom Foods", color: "#7D67D9", row: "#F1EEFB", icon: "#7D67D9", create: "Create Custom Food", empty: "No custom foods yet", emptyText: "#7D67D9" },
};
const SUB_ORDER: SubTab[] = ["meals", "recipes", "foods"];

type Opened =
  | { kind: "meals" | "recipes"; id: string; edit: boolean }
  | { kind: "foods"; food: FoodSearchResult; edit: boolean };

/**
 * The Food tab's Custom tab (FO3.2, renamed from Meal Prep): three sub-tabs,
 * Meal Prep, Recipes and Custom Foods, each a scrollable list with its create
 * button pinned at the bottom above the nav bar. Every row has a ⋮ menu (Edit,
 * Delete); tapping a row opens its detail popup, where Edit changes the same
 * popup into the item's create form, prefilled.
 */
export default function MealPrepPanel() {
  const { customMeals, customMealsError, recipes, recipesError, reloadMealPrep, authUserId, removeCustomMeal, removeRecipe, forgetCustomFood } =
    useApp();
  const [sub, setSub] = useState<SubTab>("meals");

  // Custom Foods reads custom_foods itself: this device's copy only holds
  // what was created here.
  const [foods, setFoods] = useState<FoodSearchResult[]>([]);
  const [foodsError, setFoodsError] = useState<string | null>(null);
  const loadFoods = useCallback(async () => {
    if (!authUserId) return;
    const result = await listCustomFoods(authUserId);
    if (!result.ok) {
      setFoodsError(result.message);
      return;
    }
    setFoodsError(null);
    setFoods(result.foods);
  }, [authUserId]);
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void listCustomFoods(authUserId).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setFoodsError(null);
        setFoods(result.foods);
      } else setFoodsError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

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
      void Promise.all([reloadMealPrep(), loadFoods()]).finally(() => setRefreshing(false));
    }
    setPullY(0);
  };

  const [opened, setOpened] = useState<Opened | null>(null);
  const [creating, setCreating] = useState<SubTab | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; open: Opened } | null>(null);
  const [deleting, setDeleting] = useState<{ open: Opened; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const doDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    const target = deleting.open;
    if (target.kind === "foods") {
      const result = await deleteCustomFood(target.food.id);
      if (!result.ok) setDeleteError(result.message ?? "Couldn't delete that food.");
      else {
        forgetCustomFood(target.food.id);
        setFoods((prev) => prev.filter((f) => f.id !== target.food.id));
      }
    } else if (target.kind === "recipes") await removeRecipe(target.id);
    else await removeCustomMeal(target.id);
    setBusy(false);
    setDeleting(null);
  };

  const t = SUB[sub];
  // Newest first: recipes already arrive that way (getRecipes orders
  // descending); custom meals keep their ascending query and are reversed.
  const mealsNewest = customMeals.slice().reverse();

  const rows: { open: Opened; name: string; detail: string; icon: React.ReactNode; iconBg: string }[] =
    sub === "meals"
      ? mealsNewest.map((m) => ({
          open: { kind: "meals", id: m.id, edit: false },
          name: m.title,
          // Decision 12: "N ingredients · kcal"; there is no servings column.
          detail: `${m.items.length} ingredient${m.items.length === 1 ? "" : "s"} · ${Math.round(sumItems(m.items as PrepItem[]).kcal)} kcal`,
          icon: <Package size={16} />,
          iconBg: "#FFFFFF",
        }))
      : sub === "recipes"
        ? recipes.map((r) => ({
            open: { kind: "recipes", id: r.id, edit: false },
            name: r.title,
            detail: `${r.items.length} ingredient${r.items.length === 1 ? "" : "s"} · ${Math.round(divideTotals(sumItems(r.items as PrepItem[]), r.servings).kcal)} kcal / serving`,
            icon: <Soup size={16} />,
            iconBg: "#FFFFFF",
          }))
        : foods.map((f) => {
            const Icon = foodCategoryIcon[f.category] ?? UtensilsCrossed;
            const tone = logoTone(f.logoTone);
            return {
              open: { kind: "foods", food: f, edit: false },
              name: f.name,
              detail: `${f.servingLabel} · ${Math.round(f.calories)} kcal`,
              icon: <Icon size={16} style={tone ? { color: tone.fg } : undefined} />,
              iconBg: tone ? tone.bg : "#FFFFFF",
            };
          });
  const error = sub === "meals" ? customMealsError : sub === "recipes" ? recipesError : foodsError;
  const errorText =
    sub === "meals"
      ? "Couldn't load your meals. Pull to retry."
      : sub === "recipes"
        ? "Couldn't load your recipes. Pull to retry."
        : "Couldn't load your custom foods. Pull to retry.";

  return (
    <div
      className="animate-fade-slide-up"
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

      <div role="tablist" aria-label="Custom" className="flex" style={{ background: "#F4F3F9", borderRadius: 12, padding: 4, gap: 4 }}>
        {SUB_ORDER.map((k) => (
          <button
            key={k}
            role="tab"
            aria-selected={sub === k}
            onClick={() => setSub(k)}
            className="tap flex-1 min-w-0 truncate"
            style={{
              height: 32,
              borderRadius: 9,
              background: sub === k ? SUB[k].color : "transparent",
              color: sub === k ? "#FFFFFF" : "#5B5349",
              fontSize: 12,
              fontWeight: sub === k ? 700 : 600,
            }}
          >
            {SUB[k].label}
          </button>
        ))}
      </div>

      <div className="flex flex-col" style={{ gap: 8, marginTop: 12, paddingBottom: 72 }}>
        {error ? (
          <p style={{ margin: 0, fontSize: 13, color: "#5B5349", padding: "8px 2px" }}>{errorText}</p>
        ) : rows.length === 0 ? (
          <div className="flex items-center justify-center" style={{ height: 76, borderRadius: 16, background: t.row }}>
            <p style={{ margin: 0, fontSize: 13, color: t.emptyText }}>{t.empty}</p>
          </div>
        ) : (
          rows.map((r) => (
            <div key={r.open.kind === "foods" ? r.open.food.id : r.open.id} className="flex items-center" style={{ background: t.row, borderRadius: 12 }}>
              <button
                onClick={() => setOpened(r.open)}
                className="tap flex-1 min-w-0 flex items-center text-left"
                style={{ gap: 12, padding: "10px 0 10px 12px", minHeight: 56 }}
              >
                <span
                  className="flex items-center justify-center flex-none"
                  style={{ width: 34, height: 34, borderRadius: 10, background: r.iconBg, color: t.icon }}
                >
                  {r.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate" style={{ fontSize: 14, fontWeight: 700, color: "#241F1B" }}>
                    {r.name}
                  </span>
                  <span className="block truncate" style={{ fontSize: 11, color: "#8C8378" }}>
                    {r.detail}
                  </span>
                </span>
              </button>
              <button
                onClick={(e) => setMenu({ anchor: e.currentTarget, open: r.open })}
                aria-label={`${r.name} options`}
                className="tap flex items-center justify-center flex-none"
                style={{ width: 40, height: 44, color: "#8C8378" }}
              >
                <EllipsisVertical size={16} />
              </button>
            </div>
          ))
        )}
        {deleteError && <p className="text-xs font-semibold text-status-high">{deleteError}</p>}
      </div>

      {/* The create button, pinned above the nav bar. Portaled: the tab's
          animate-fade-slide-up transform would otherwise become the containing
          block for position: fixed and pin it to the panel instead. */}
      {createPortal(
      <button
        onClick={() => setCreating(sub)}
        className="tap fixed z-20 inline-flex items-center justify-center"
        style={{
          left: "calc(var(--app-gutter) + 16px)",
          right: "calc(var(--app-gutter) + 16px)",
          bottom: "calc(env(safe-area-inset-bottom) + 96px + var(--active-bar, 0px))",
          height: 44,
          gap: 7,
          borderRadius: 12,
          background: t.color,
          color: "#FFFFFF",
          fontSize: 13.5,
          fontWeight: 700,
        }}
      >
        <Plus size={15} /> {t.create}
      </button>,
        document.body
      )}

      {menu && (
        <PopupMenu
          open
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          width={132}
          options={[
            { value: "edit", label: "Edit", icon: <Pencil size={14} /> },
            { value: "delete", label: "Delete", icon: <Trash2 size={14} />, destructive: true },
          ]}
          onSelect={(v) => {
            const target = menu.open;
            setMenu(null);
            if (v === "edit") setOpened({ ...target, edit: true });
            else {
              const name =
                target.kind === "foods"
                  ? target.food.name
                  : (target.kind === "recipes" ? recipes : customMeals).find((x) => x.id === target.id)?.title ?? "";
              setDeleting({ open: target, name });
            }
          }}
        />
      )}

      <ConfirmCard
        open={!!deleting}
        title={`Delete ${deleting?.name || "this item"}?`}
        subtitle={
          deleting?.open.kind === "foods"
            ? "It's removed from your foods and from any recipes and meals that use it. Past diary entries stay."
            : deleting?.open.kind === "recipes"
              ? "The recipe is removed. Past diary entries stay."
              : "The meal is removed. Past diary entries stay."
        }
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void doDelete()}
      />

      {opened && opened.kind !== "foods" && (
        <MealPrepFlowSheet
          key={`${opened.kind}-${opened.id}-${opened.edit}`}
          kind={opened.kind as PrepKind}
          itemId={opened.id}
          startEditing={opened.edit}
          onClose={() => setOpened(null)}
        />
      )}
      {opened && opened.kind === "foods" && (
        <CustomFoodSheet
          key={`${opened.food.id}-${opened.edit}`}
          food={opened.food}
          startEditing={opened.edit}
          onClose={() => setOpened(null)}
          onSaved={(saved) => setFoods((prev) => prev.map((f) => (f.id === saved.id ? saved : f)))}
          onDeleted={(id) => {
            setFoods((prev) => prev.filter((f) => f.id !== id));
            setOpened(null);
          }}
        />
      )}

      <CreateMealSheet open={creating === "meals"} onClose={() => setCreating(null)} />
      <CreateRecipeSheet open={creating === "recipes"} onClose={() => setCreating(null)} />
      {creating === "foods" && (
        <CustomFoodForm
          open
          title="Create Custom Food"
          onClose={() => setCreating(null)}
          onSaved={() => {
            setCreating(null);
            void loadFoods();
          }}
        />
      )}
    </div>
  );
}
