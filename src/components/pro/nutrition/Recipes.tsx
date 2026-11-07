import React, { useMemo, useState } from "react";
import { ChefHat, Plus, Search, SlidersHorizontal } from "lucide-react";
import { useWebLayout, WEB_READING_MAX } from "../../web/useWebLayout";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { PopupMenu } from "../../ui/PopupMenu";
import { MealPrepFlowSheet } from "../../food/MealPrepFlowSheet";
import { RecipeDetailWeb } from "../web/RecipeDetailWeb";
import { PrepCreateSheet } from "../../food/PrepCreateSheet";
import { divideTotals, sumItems, type PrepItem } from "../../food/mealPrepShared";
import { INK, NO_ICON_SCALE } from "../proInk";
import { EmptyState } from "../EmptyState";
import { ProError } from "../states";
import { NuHead, SearchField, SquareButton } from "./kit";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

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

/**
 * `webTabs` (WP-NU-MP.3, WP-NU Meal Plans Web v3 isRecipes): the web page
 * instead, the 64 header (Meal plans 28/36, the search 360 (260 on the rail)
 * × 40, Sort 40, New recipe 40 #9A8CD6), then under a 1280 cap the area tabs
 * and the cards 4 across (24 apart; 4:3 tile with the 32 chef hat, 12 16 14,
 * name 15/24 700, line 13/20), or the empty panel (112 tile, 28/36, 15/24,
 * New recipe 44 × 360).
 */
export const Recipes: React.FC<{ onBack: () => void; webTabs?: React.ReactNode }> = ({ onBack, webTabs }) => {
  const { recipes, recipesError, reloadMealPrep } = useApp();
  const dark = useIsDark();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // Website viewport (WP-NU-MP.3.1): on web a recipe opens in the page; Edit opens the repo's edit sheet.
  const [detail, setDetail] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const list = useMemo(() => {
    const term = query.trim().toLowerCase();
    const rows = recipes
      .filter((r) => !term || r.title.toLowerCase().includes(term))
      .map((r) => ({ r, per: divideTotals(sumItems(r.items as PrepItem[]), r.servings) }));
    if (sort === "name") rows.sort((a, b) => a.r.title.localeCompare(b.r.title));
    if (sort === "protein") rows.sort((a, b) => b.per.p - a.per.p);
    return rows;
  }, [recipes, query, sort]);

  const sortMenu = (
    <PopupMenu
      open={!!sortAnchor}
      anchor={sortAnchor}
      onClose={() => setSortAnchor(null)}
      heading={t("Sort")}
      options={[
        { value: "newest", label: t("Newest") },
        { value: "name", label: t("Name") },
        { value: "protein", label: t("Most protein") },
      ]}
      selected={sort}
      align="right"
      width={180}
      onSelect={(v) => {
        setSort(v as Sort);
        setSortAnchor(null);
      }}
    />
  );
  const sheets = (
    <>
      {open && <MealPrepFlowSheet kind="recipes" itemId={open} professional onClose={() => setOpen(null)} />}
      {editing && detail && <MealPrepFlowSheet kind="recipes" itemId={detail} professional startEditing onClose={() => setEditing(false)} />}
      <PrepCreateSheet kind="recipes" open={creating} onClose={() => setCreating(false)} professional />
    </>
  );

  if (webTabs) {
    const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";
    const shown = detail ? recipes.find((r) => r.id === detail) ?? null : null;
    if (shown)
      return (
        <WebRecipesPage query={query} onQuery={setQuery} sortOn={sort !== "newest"} onSort={(el) => setSortAnchor(sortAnchor ? null : el)} onNew={() => setCreating(true)} tabs={webTabs}>
          <RecipeDetailWeb recipe={shown} onBack={() => setDetail(null)} onEdit={() => setEditing(true)} />
          {sheets}
        </WebRecipesPage>
      );
    return (
      <WebRecipesPage
        query={query}
        onQuery={setQuery}
        sortOn={sort !== "newest" || !!sortAnchor}
        onSort={(el) => setSortAnchor(sortAnchor ? null : el)}
        onNew={() => setCreating(true)}
        tabs={webTabs}
      >
        {recipesError && recipes.length === 0 ? (
          <ProError onRetry={() => void reloadMealPrep()} />
        ) : recipes.length === 0 ? (
          <section className="flex flex-col items-center justify-center text-center" style={{ minHeight: 480, boxSizing: "border-box", borderRadius: 24, background: "#FAFAFB", border: "1px solid rgba(36,31,27,0.08)", padding: 40 }}>
            <span className="flex items-center justify-center" style={{ width: 112, height: 112, borderRadius: 32, background: "#F0EDF9" }}>
              <ChefHat size={52} strokeWidth={1.5} aria-hidden style={{ color: "#7D6BB5" }} />
            </span>
            <p style={{ margin: "24px 0 0", fontSize: 28, lineHeight: "36px", fontWeight: 700, color: "#241F1B" }}>{t("No recipes yet")}</p>
            <p style={{ margin: "8px 0 0", maxWidth: 440, fontSize: 15, lineHeight: "24px", fontWeight: 500, color: "#8C8378" }}>{t("Recipes you save here can go into any meal plan.")}</p>
            <button type="button" onClick={() => setCreating(true)} className={`flex items-center justify-center hover:bg-[#8E7FD0] ${ring}`} style={{ marginTop: 28, width: "100%", maxWidth: 360, height: 44, borderRadius: 16, background: "#9A8CD6", color: "#FFFFFF", gap: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
              <Plus size={20} strokeWidth={2} aria-hidden />
              {t("New recipe")}
            </button>
          </section>
        ) : list.length === 0 ? (
          <EmptyState icon={ChefHat} title={t("No matches")} line={t("Try another name.")} />
        ) : (
          <div className="grid" style={{ gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 24, alignContent: "start" }}>
            {list.map(({ r, per }) => (
              <button key={r.id} type="button" onClick={() => setDetail(r.id)} className={`flex flex-col text-start overflow-hidden hover:border-[#AEA1DC] ${ring}`} style={{ minWidth: 0, boxSizing: "border-box", borderRadius: 18, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)" }}>
                <span className="flex items-center justify-center w-full" style={{ aspectRatio: "4 / 3", background: "#F5F5F6" }}>
                  <ChefHat size={32} strokeWidth={1.5} aria-hidden style={{ color: "#7D6BB5" }} />
                </span>
                <span className="block w-full" style={{ padding: "12px 16px 14px", boxSizing: "border-box" }}>
                  <span className="block truncate" title={r.title} style={{ fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
                    {r.title}
                  </span>
                  <span className="block" style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                    {t("{kcal} kcal · {protein} g protein", { kcal: Math.round(per.kcal).toLocaleString(appLocale("en-GB")), protein: Math.round(per.p) })}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
        {sortMenu}
        {sheets}
      </WebRecipesPage>
    );
  }

  return (
    <div>
      <NuHead
        title={t("Recipes")}
        onBack={onBack}
        right={
          <button
            type="button"
            onClick={() => setCreating(true)}
            aria-label={t("New recipe")}
            title={t("New recipe")}
            className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-[5px] before:content-['']"
            style={{ width: 34, height: 34, borderRadius: 9999, background: dark ? "linear-gradient(150deg,#54468a,#3b3168)" : "linear-gradient(150deg,#aea1dc,#6f5fa6)" }}
          >
            <Plus size={16} strokeWidth={2} aria-hidden style={{ color: "#FFFFFF", ...NO_ICON_SCALE }} />
          </button>
        }
      />
      <div className="flex" style={{ gap: 8, marginBottom: 12 }}>
        <SearchField value={query} onChange={setQuery} placeholder={t("Search recipes")} />
        <SquareButton icon={SlidersHorizontal} label={t("Filter")} on={sort !== "newest" || !!sortAnchor} expanded={!!sortAnchor} onClick={(el) => setSortAnchor(sortAnchor ? null : el)} />
      </div>
      {recipesError && recipes.length === 0 ? (
        <ProError onRetry={() => void reloadMealPrep()} />
      ) : recipes.length === 0 ? (
        <EmptyState icon={ChefHat} title={t("No recipes yet")} line={t("Recipes you save here can go into any meal plan.")} />
      ) : list.length === 0 ? (
        <EmptyState icon={ChefHat} title={t("No matches")} line={t("Try another name.")} />
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 10 }}>
          {list.map(({ r, per }) => (
            <button key={r.id} type="button" onClick={() => setOpen(r.id)} className="tap text-start overflow-hidden" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18 }}>
              <span className="flex items-center justify-center" style={{ aspectRatio: "4 / 3", background: INK.soft }}>
                <ChefHat size={26} strokeWidth={1.5} aria-hidden style={{ color: INK.prAccent }} />
              </span>
              <span className="block" style={{ padding: "10px 12px" }}>
                <span className="block" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch, lineHeight: 1.3, overflowWrap: "anywhere" }}>{r.title}</span>
                <span className="block" style={{ fontSize: textPx(11), color: INK.chF, marginTop: 2 }}>{t("{kcal} kcal · {protein} g protein", { kcal: Math.round(per.kcal).toLocaleString(appLocale("en-GB")), protein: Math.round(per.p) })}</span>
              </span>
            </button>
          ))}
        </div>
      )}
      {sortMenu}
      {sheets}
    </div>
  );
};

/** The Meal plans web page frame around the recipes (header with search, Sort and New recipe; the area tabs). */
const WebRecipesPage: React.FC<{
  query: string;
  onQuery: (v: string) => void;
  sortOn: boolean;
  onSort: (el: HTMLElement) => void;
  onNew: () => void;
  tabs: React.ReactNode;
  children: React.ReactNode;
}> = ({ query, onQuery, sortOn, onSort, onNew, tabs, children }) => {
  const { rail } = useWebLayout();
  const m = rail ? 24 : 32;
  const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";
  return (
    <div>
      <header className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 12, padding: `0 ${m}px`, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <h1 className="flex-1 min-w-0 truncate" style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>
          {t("Meal plans")}
        </h1>
        <label className="flex items-center shrink-0" style={{ width: rail ? 260 : 360, height: 40, boxSizing: "border-box", gap: 10, padding: "0 14px", borderRadius: 12, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.10)" }}>
          <Search size={16} strokeWidth={2} aria-hidden style={{ color: "#8C8378" }} />
          <input type="search" value={query} onChange={(e) => onQuery(e.target.value)} placeholder={t("Search recipes")} aria-label={t("Search recipes")} className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-[#8C8378]" style={{ fontSize: 15, lineHeight: "24px", color: "#241F1B" }} />
        </label>
        <button type="button" aria-label={t("Sort")} title={t("Sort")} aria-haspopup="menu" aria-expanded={sortOn} onClick={(e) => onSort(e.currentTarget)} className={`flex items-center justify-center shrink-0 hover:bg-[#F0EDF9] ${ring}`} style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 12, background: sortOn ? "#F0EDF9" : "#F5F5F6", border: "1px solid rgba(36,31,27,0.10)" }}>
          <SlidersHorizontal size={20} strokeWidth={1.75} aria-hidden style={{ color: "#5B5349" }} />
        </button>
        <button type="button" onClick={onNew} className={`flex items-center shrink-0 hover:bg-[#8E7FD0] ${ring}`} style={{ height: 40, padding: "0 18px", borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600, whiteSpace: "nowrap", boxShadow: "0 10px 24px rgba(95,80,147,0.28)" }}>
          <Plus size={20} strokeWidth={2} aria-hidden />
          {t("New recipe")}
        </button>
      </header>
      <div style={{ maxWidth: WEB_READING_MAX, margin: "0 auto", boxSizing: "border-box", padding: `32px ${m}px` }}>
        <div style={{ marginBottom: 16 }}>{tabs}</div>
        {children}
      </div>
    </div>
  );
};
