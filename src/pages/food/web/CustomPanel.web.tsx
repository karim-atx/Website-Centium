import { useCallback, useEffect, useState } from "react";
import type React from "react";
import clsx from "clsx";
import { EllipsisVertical, Package, Pencil, Plus, Soup, Trash2, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { CreateMealSheet } from "../../../components/food/CreateMealSheet";
import { CreateRecipeSheet } from "../../../components/food/CreateRecipeSheet";
import { CustomFoodForm } from "../../../components/food/CustomFoodForm";
import { CustomFoodSheet } from "../../../components/food/CustomFoodSheet";
import { MealPrepFlowSheet, type PrepKind } from "../../../components/food/MealPrepFlowSheet";
import { MusicSection } from "../../../components/music/MusicSection";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { sumItems, divideTotals, type PrepItem } from "../../../components/food/mealPrepShared";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { logoTone } from "../../../components/food/logoTones";
import { foodCategoryIcon } from "../../../utils/icons";
import { deleteCustomFood, listCustomFoods, type FoodSearchResult } from "../../../services/food";
import { brandServing } from "../../../services/food/onlineSearchModel";
import { t, tn, tk } from "../../../i18n/core";
import { MealPlannerEntry } from "../planner/MealPlannerEntry";
import { FoodWebMenu } from "./FoodWebMenu";

// Website viewport v1 · WC-FO.3 Custom (FO Custom Sections v7, as the Food
// page imports it: v 6). The mobile sub-tabs become three columns side by
// side, 24 apart: Meal Prep, Recipes and Custom Foods, each headed by its
// 40 title chip (15/700 white on the section colour, r12) and a 40 square +
// that creates one. Rows 56+ (r12, the section's tint; a 34 r10 white icon
// tile, the name 15/24 700, the detail 13/20), a 40 × 44 ⋮ (Edit, Delete);
// empty: the tint card, r16, padding 24, its line 15px. REPO CHANGED rows
// built with the global rules: the meal planner entry above the columns and
// cooking's "Play your music" at the top of Recipes, as on mobile. Reading,
// deleting and the sheets are the mobile MealPrepPanel's, unchanged.

type Kind = "meals" | "recipes" | "foods";
type Opened = { kind: "meals" | "recipes"; id: string; edit: boolean } | { kind: "foods"; food: FoodSearchResult; edit: boolean };

const SECTIONS: Record<Kind, { label: string; color: string; row: string; icon: string; create: string; empty: string; emptyText: string }> = {
  meals: { label: tk("Meal Prep"), color: "#79A8A1", row: "#ECF4F3", icon: "#4F7F78", create: tk("Create Meal"), empty: tk("No meal prep yet"), emptyText: "#5F8681" },
  recipes: { label: tk("Recipes"), color: "#A198DF", row: "#F0EEF9", icon: "#816FB7", create: tk("Create Recipe"), empty: tk("No recipes yet"), emptyText: "#7A6DB0" },
  foods: { label: tk("Custom Foods"), color: "#7D67D9", row: "#F1EEFB", icon: "#7D67D9", create: tk("Create Custom Food"), empty: tk("No custom foods yet"), emptyText: "#7D67D9" },
};
const ORDER: Kind[] = ["meals", "recipes", "foods"];
const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2";

export default function CustomPanelWeb() {
  const { customMeals, customMealsError, recipes, recipesError, reloadMealPrep, authUserId, removeCustomMeal, removeRecipe, forgetCustomFood } = useApp();
  const hide = useHideNumbers();
  const kcalPart = (text: string) => (hide ? "" : ` · ${text}`);

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

  const [opened, setOpened] = useState<Opened | null>(null);
  const [creating, setCreating] = useState<Kind | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; open: Opened; name: string } | null>(null);
  const [deleting, setDeleting] = useState<{ open: Opened; name: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);

  const doDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    setDeleteError(null);
    const target = deleting.open;
    if (target.kind === "foods") {
      const result = await deleteCustomFood(target.food.id);
      if (!result.ok) setDeleteError(result.message ?? t("Couldn't delete that food."));
      else {
        forgetCustomFood(target.food.id);
        setFoods((prev) => prev.filter((f) => f.id !== target.food.id));
      }
    } else if (target.kind === "recipes") await removeRecipe(target.id);
    else await removeCustomMeal(target.id);
    setBusy(false);
    setDeleting(null);
  };

  const rowsFor = (k: Kind): { open: Opened; name: string; detail: string; icon: React.ReactNode; iconBg: string }[] =>
    k === "meals"
      ? customMeals
          .slice()
          .reverse()
          .map((m) => ({
            open: { kind: "meals", id: m.id, edit: false },
            name: m.title,
            detail: `${tn(m.items.length, "{n} ingredient", "{n} ingredients")}${kcalPart(t("{n} kcal", { n: Math.round(sumItems(m.items as PrepItem[]).kcal) }))}`,
            icon: <Package size={16} />,
            iconBg: "#FFFFFF",
          }))
      : k === "recipes"
        ? recipes.map((r) => ({
            open: { kind: "recipes", id: r.id, edit: false },
            name: r.title,
            detail: `${tn(r.items.length, "{n} ingredient", "{n} ingredients")}${kcalPart(t("{n} kcal / serving", { n: Math.round(divideTotals(sumItems(r.items as PrepItem[]), r.servings).kcal) }))}`,
            icon: <Soup size={16} />,
            iconBg: "#FFFFFF",
          }))
        : foods.map((f) => {
            const Icon = foodCategoryIcon[f.category] ?? UtensilsCrossed;
            const tone = logoTone(f.logoTone, false);
            return {
              open: { kind: "foods", food: f, edit: false },
              name: f.name,
              detail: `${brandServing(f.brand, f.servingLabel)}${kcalPart(t("{n} kcal", { n: Math.round(f.calories) }))}`,
              icon: <Icon size={16} style={tone ? { color: tone.fg } : undefined} />,
              iconBg: tone ? tone.bg : "#FFFFFF",
            };
          });

  const errorFor = (k: Kind) => (k === "meals" ? customMealsError : k === "recipes" ? recipesError : foodsError);
  // Web: no pull-to-refresh, so the load error offers Retry (the mobile reload).
  const errorText = (k: Kind) => (k === "meals" ? t("Couldn't load your meals.") : k === "recipes" ? t("Couldn't load your recipes.") : t("Couldn't load your custom foods."));
  const retry = () => {
    setRetrying(true);
    void Promise.all([reloadMealPrep(), loadFoods()]).finally(() => setRetrying(false));
  };

  return (
    <div className="flex flex-col animate-fade-slide-up" style={{ gap: 24 }}>
      <MealPlannerEntry />
      <div className="grid items-start" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 24 }}>
        {ORDER.map((k) => {
          const s = SECTIONS[k];
          const rows = rowsFor(k);
          const error = errorFor(k);
          return (
            <section key={k} className="flex flex-col min-w-0" style={{ gap: 16 }} aria-label={t(s.label)}>
              <div className="grid items-stretch" style={{ gridTemplateColumns: "minmax(0, 1fr) 40px", gap: 8, height: 40 }}>
                <h2 className="flex items-center justify-center whitespace-nowrap overflow-hidden" style={{ margin: 0, height: "100%", borderRadius: 12, fontSize: 15, fontWeight: 700, color: "#FFFFFF", background: s.color }}>
                  {t(s.label)}
                </h2>
                <button
                  type="button"
                  onClick={() => setCreating(k)}
                  aria-label={t(s.create)}
                  title={t(s.create)}
                  className={clsx("grid place-items-center hover:scale-[0.98] active:scale-[0.96]", FOCUS)}
                  style={{ height: "100%", minWidth: 0, padding: 0, borderRadius: 12, background: s.color, color: "#FFFFFF", transition: "transform .15s cubic-bezier(0.22,1,0.36,1)" }}
                >
                  <Plus size={20} aria-hidden />
                </button>
              </div>
              {k === "recipes" && <MusicSection moment="cooking" />}
              {error ? (
                <div className="flex items-center justify-between" style={{ gap: 12, borderRadius: 16, background: s.row, padding: "16px 20px" }}>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349" }}>{errorText(k)}</p>
                  <button type="button" onClick={retry} disabled={retrying} className={clsx("shrink-0 hover:underline disabled:opacity-50", FOCUS)} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#5F5093" }}>
                    {retrying ? t("Refreshing…") : t("Retry")}
                  </button>
                </div>
              ) : rows.length === 0 ? (
                <div className="flex flex-col items-center justify-center" style={{ gap: 16, padding: 24, borderRadius: 16, background: s.row, boxSizing: "border-box" }}>
                  <p className="whitespace-nowrap" style={{ margin: 0, fontSize: 15, color: s.emptyText }}>
                    {t(s.empty)}
                  </p>
                </div>
              ) : (
                <div className="flex flex-col" style={{ gap: 8 }}>
                  {rows.map((r) => (
                    <div key={r.open.kind === "foods" ? r.open.food.id : r.open.id} className="flex items-center" style={{ borderRadius: 12, background: s.row }}>
                      <button
                        type="button"
                        onClick={() => setOpened(r.open)}
                        className={clsx("flex-1 min-w-0 flex items-center text-start rounded-[12px]", FOCUS)}
                        style={{ gap: 12, padding: "10px 0", paddingInlineStart: 12, minHeight: 56, boxSizing: "border-box" }}
                      >
                        <span className="grid place-items-center flex-none" style={{ width: 34, height: 34, borderRadius: 10, background: r.iconBg, color: s.icon }}>
                          {r.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate" title={r.name} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
                            {r.name}
                          </span>
                          <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                            {r.detail}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => setMenu({ anchor: e.currentTarget, open: r.open, name: r.name })}
                        aria-label={t("{name} options", { name: r.name })}
                        aria-haspopup="menu"
                        className={clsx("grid place-items-center flex-none hover:!bg-[rgba(255,255,255,0.6)]", FOCUS)}
                        style={{ width: 40, height: 44, borderRadius: 10, color: "#8C8378" }}
                      >
                        <EllipsisVertical size={16} aria-hidden />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {k === "foods" && deleteError && (
                <p className="text-status-high" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600 }}>
                  {t(deleteError)}
                </p>
              )}
            </section>
          );
        })}
      </div>

      {menu && (
        <FoodWebMenu
          anchor={menu.anchor}
          onClose={() => setMenu(null)}
          width={156}
          align="end"
          label={t("{name} options", { name: menu.name })}
          options={[
            { value: "edit", label: t("Edit"), icon: <Pencil size={16} /> },
            { value: "delete", label: t("Delete"), icon: <Trash2 size={16} />, destructive: true },
          ]}
          onSelect={(v) => {
            const target = menu.open;
            if (v === "edit") setOpened({ ...target, edit: true });
            else setDeleting({ open: target, name: menu.name });
          }}
        />
      )}

      <ConfirmCard
        open={!!deleting}
        title={deleting?.name ? t("Delete {name}?", { name: deleting.name }) : t("Delete this item?")}
        subtitle={
          deleting?.open.kind === "foods"
            ? t("It's removed from your foods and from any recipes and meals that use it. Past diary entries stay.")
            : deleting?.open.kind === "recipes"
              ? t("The recipe is removed. Past diary entries stay.")
              : t("The meal is removed. Past diary entries stay.")
        }
        busy={busy}
        onCancel={() => setDeleting(null)}
        onConfirm={() => void doDelete()}
      />

      {opened && opened.kind !== "foods" && (
        <MealPrepFlowSheet key={`${opened.kind}-${opened.id}-${opened.edit}`} kind={opened.kind as PrepKind} itemId={opened.id} startEditing={opened.edit} onClose={() => setOpened(null)} />
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
          title={t("Create Custom Food")}
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
