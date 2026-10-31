import React, { useMemo, useState } from "react";
import { ChefHat, Plus, SlidersHorizontal } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { PopupMenu } from "../../ui/PopupMenu";
import { MealPrepFlowSheet } from "../../food/MealPrepFlowSheet";
import { PrepCreateSheet } from "../../food/PrepCreateSheet";
import { divideTotals, sumItems, type PrepItem } from "../../food/mealPrepShared";
import { INK, NO_ICON_SCALE } from "../proInk";
import { EmptyState } from "../EmptyState";
import { ProError } from "../states";
import { NuHead, SearchField, SquareButton } from "./kit";
import { appLocale } from "../../../i18n/format";

/**
 * Release 3 · NU9 v2 "Recipe library" (source gen r6c.js nuRecipes6): head
 * "Recipes" with the gradient plus (34, "New recipe"), search and filter,
 * then a two-column grid (gap 10) of cards (r18: a 4:3 picture area, then
 * pad 10 12, name 13 / 700, "{n} kcal · {n} g protein" 11 text.faint, per
 * serving).
 *
 * The professional's own recipes (recipes table, owner = me) through the
 * client Meal Prep's own pieces, reused, not forked: AppContext recipes,
 * PrepCreateSheet to create and MealPrepFlowSheet to view and edit (its
 * `professional` prop hides the diary logging, which would log into the
 * professional's own diary). Recipes have no photo column, so the picture
 * area is a plain tile.
 */
type Sort = "newest" | "name" | "protein";

export const Recipes: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const { recipes, recipesError, reloadMealPrep } = useApp();
  const dark = useIsDark();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = recipes
      .filter((r) => !term || r.title.toLowerCase().includes(term))
      .map((r) => ({ r, per: divideTotals(sumItems(r.items as PrepItem[]), r.servings) }));
    if (sort === "name") rows.sort((a, b) => a.r.title.localeCompare(b.r.title));
    if (sort === "protein") rows.sort((a, b) => b.per.p - a.per.p);
    return rows;
  }, [recipes, query, sort]);

  return (
    <div>
      <NuHead
        title="Recipes"
        onBack={onBack}
        right={
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label="New recipe"
            title="New recipe"
            className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[5px] before:content-['']"
            style={{ width: 34, height: 34, borderRadius: 9999, background: dark ? "linear-gradient(150deg,#54468a,#3b3168)" : "linear-gradient(150deg,#aea1dc,#6f5fa6)" }}
          >
            <Plus size={16} strokeWidth={2} aria-hidden style={{ color: "#FFFFFF", ...NO_ICON_SCALE }} />
          </button>
        }
      />
      <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
        <SearchField value={query} onChange={setQuery} placeholder="Search recipes" />
        <SquareButton icon={SlidersHorizontal} label="Filter" on={sort !== "newest" || !!sortAnchor} expanded={!!sortAnchor} onClick={(el) => setSortAnchor(sortAnchor ? null : el)} />
      </div>
      {recipesError && recipes.length === 0 ? (
        <ProError onRetry={() => void reloadMealPrep()} />
      ) : recipes.length === 0 ? (
        <EmptyState icon={ChefHat} title="No recipes yet" line="Recipes you save here can go into any meal plan." />
      ) : list.length === 0 ? (
        <EmptyState icon={ChefHat} title="No matches" line="Try another name." />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
          {list.map(({ r, per }) => (
            <button key={r.id} type="button" onClick={() => setOpen(r.id)} className="tap text-start overflow-hidden" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18 }}>
              <span className="flex items-center justify-center" style={{ aspectRatio: "4 / 3", background: INK.soft }}>
                <ChefHat size={26} strokeWidth={1.5} aria-hidden style={{ color: INK.prAccent }} />
              </span>
              <span className="block" style={{ padding: "10px 12px" }}>
                <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, lineHeight: 1.3, overflowWrap: "anywhere" }}>{r.title}</span>
                <span className="block" style={{ fontSize: textPx(11), color: INK.chF, marginTop: 2 }}>{`${Math.round(per.kcal).toLocaleString(appLocale("en-GB"))} kcal · ${Math.round(per.p)} g protein`}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      <PopupMenu
        open={!!sortAnchor}
        anchor={sortAnchor}
        onClose={() => setSortAnchor(null)}
        heading="Sort"
        options={[
          { value: "newest", label: "Newest" },
          { value: "name", label: "Name" },
          { value: "protein", label: "Most protein" },
        ]}
        selected={sort}
        align="right"
        width={180}
        onSelect={(v) => {
          setSort(v as Sort);
          setSortAnchor(null);
        }}
      />
      {open && <MealPrepFlowSheet kind="recipes" itemId={open} professional onClose={() => setOpen(null)} />}
      <PrepCreateSheet kind="recipes" open={creating} onClose={() => setCreating(false)} professional />
    </div>
  );
};
