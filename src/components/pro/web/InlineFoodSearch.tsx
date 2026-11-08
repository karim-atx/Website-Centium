import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { AlertTriangle, ChefHat, CookingPot, Search, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { searchFoods, type FoodSearchResult } from "../../../services/food";
import { fetchConflicts, type ItemDraft } from "../../../services/pro/nutrition";
import { perServing } from "../nutrition/itemFacts";
import { worstConflict, type ConflictRow, type ItemKind, type MealSlot } from "../nutrition/nutritionModel";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-LI.7 / WP-LI.7.3 "searching" (WP-LI Plan Day
// Web, WP-LI Week Builder Web v3): the search box that replaces a meal's
// "Search food" row (40 high, r10, 1.5 #AEA1DC with the 3px focus ring) and
// its anchored results list (top 48, 360 wide, 330 on the rail; r14, the
// 0 16 40 shadow, 6 padding; rows 56 high with the 32 tile, the name 15/24,
// the serving 13/20, kcal 13/20 bold and C P F 11/16). A pick adds one
// serving to the meal, so the meal and day totals update at once; the
// quantity is then edited in place.
//
// The Day view (WP-LI Plan Day Web) draws the box at rest under each meal
// (#F5F5F6, a dashed 14% border, "Search food" 15/24 #8C8378) and opens the
// list above it, full width (bottom 46, the 0 12 32 shadow): rows 56 with the
// name 15/24 (700 when selected), the line "100 g · P 20 · C 0 · F 13" and
// kcal 15/24 bold, then the key hints (11/16). The drawn "Create custom food"
// row is left out: the repo has no flow that creates a food and adds it to a
// plan in one go.
//
// The search is the Add Food sheet's (services/food searchFoods, plus the
// professional's own recipes and meals). On a client's copy each result
// carries its food_conflicts flag; a flagged pick opens the Add Food sheet
// on the same search instead, where the repo's allergy block and "Add
// anyway" step apply (web only).

type Pick = { kind: ItemKind; id: string; name: string; sub: string; per: { kcal: number; p: number; c: number; f: number } };

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));

export const InlineFoodSearch: React.FC<{
  slot: MealSlot;
  clientId: string | null;
  width: number;
  onPick: (draft: ItemDraft) => Promise<void>;
  /** A flagged result: the Add Food sheet on the same search. */
  onFlagged: (query: string) => void;
  onClose: () => void;
  variant?: "week" | "day";
  /** Day view: the meal's "Add food" asks for focus by bumping this. */
  focusKey?: number;
}> = ({ slot, clientId, width, onPick, onFlagged, onClose, variant = "week", focusKey = 0 }) => {
  const day = variant === "day";
  const [active, setActive] = useState(!day);
  const input = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    if (focusKey) input.current?.focus();
  }, [focusKey]);
  const { recipes, customMeals } = useApp();
  const [query, setQuery] = useState("");
  const [foods, setFoods] = useState<FoodSearchResult[] | null>([]);
  const [failed, setFailed] = useState(false);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<Record<string, ConflictRow[] | null>>({});
  const asked = useRef(new Set<string>());
  const box = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  useEffect(() => {
    const term = query.trim();
    if (!term) return;
    let live = true;
    const id = window.setTimeout(() => {
      searchFoods(term)
        .then((r) => live && (setFoods(r.foods), setFailed(r.failure !== null)))
        .catch(() => live && (setFoods([]), setFailed(true)));
    }, 250);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, [query]);

  const results: Pick[] = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    const src = { recipes, customMeals };
    const own: Pick[] = [
      ...recipes.filter((r) => r.title.toLowerCase().includes(term)).map((r) => ({ kind: "recipe" as const, id: r.id, name: r.title, sub: t("Your recipe"), per: perServing("recipe", r.id, null, src)!.per })),
      ...customMeals.filter((m) => m.title.toLowerCase().includes(term)).map((m) => ({ kind: "custom_meal" as const, id: m.id, name: m.title, sub: t("Your meal"), per: perServing("custom_meal", m.id, null, src)!.per })),
    ];
    const fd: Pick[] = (foods ?? []).map((f) => ({ kind: f.source === "custom" ? "custom_food" : "food", id: f.id, name: f.name, sub: f.servingLabel, per: { kcal: f.calories, p: f.protein, c: f.carbs, f: f.fat } }));
    return [...own, ...fd].slice(0, 6);
  }, [query, foods, recipes, customMeals]);


  // food_conflicts for the results on a client's copy.
  useEffect(() => {
    if (!clientId) return;
    const todo = results.filter((r) => !asked.current.has(`${r.kind}:${r.id}`));
    if (!todo.length) return;
    todo.forEach((r) => asked.current.add(`${r.kind}:${r.id}`));
    let live = true;
    void Promise.all(todo.map(async (r) => [`${r.kind}:${r.id}`, await fetchConflicts(clientId, { kind: r.kind, refId: r.id }, r.name)] as const)).then((pairs) => {
      if (live) setConflicts((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      live = false;
    };
  }, [clientId, results]);

  // A click outside closes it.
  useEffect(() => {
    const down = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) close();
    };
    document.addEventListener("pointerdown", down);
    return () => document.removeEventListener("pointerdown", down);
  });

  function close() {
    if (day) {
      setQuery("");
      setActive(false);
      input.current?.blur();
    } else onClose();
  }

  const flagOf = (p: Pick) => (clientId ? worstConflict(conflicts[`${p.kind}:${p.id}`] ?? []) : null);
  // On a client's copy a result whose flags haven't loaded (or couldn't be read) goes through the sheet too.
  const unchecked = (p: Pick) => !!clientId && conflicts[`${p.kind}:${p.id}`] == null;

  const choose = async (p: Pick) => {
    if (busy) return;
    if (flagOf(p) || unchecked(p)) return onFlagged(query.trim());
    setBusy(true);
    await onPick({ ref: { kind: p.kind, refId: p.id }, slot, grams: null, servings: 1 });
    setBusy(false);
    close();
  };

  const searching = foods === null;
  const open = query.trim().length > 0;
  const boxStyle: React.CSSProperties = active
    ? { background: "#FFFFFF", border: "1.5px solid #AEA1DC", boxShadow: "0 0 0 3px rgba(174,161,220,0.25)" }
    : { background: "#F5F5F6", border: "1px dashed rgba(36,31,27,0.14)", boxShadow: "none" };
  return (
    <div ref={box} style={{ position: "relative", marginTop: day ? 6 : 4 }}>
      <label className="flex items-center" style={{ height: 40, boxSizing: "border-box", gap: 8, padding: day ? "0 12px" : "0 10px", borderRadius: 10, ...boxStyle }}>
        <Search size={16} strokeWidth={2} aria-hidden style={{ color: "#71685E", flex: "none" }} />
        <input
          ref={input}
          autoFocus={!day}
          placeholder={day ? t("Search food") : undefined}
          onFocus={() => setActive(true)}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={open && results[sel] ? `${listId}-${sel}` : undefined}
          aria-label={t("Search food")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSel(0);
            // The list shows "Searching…" until the next answer.
            setFoods(e.target.value.trim() ? null : []);
            setFailed(false);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.stopPropagation();
              close();
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSel((s) => Math.min(results.length - 1, s + 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSel((s) => Math.max(0, s - 1));
            } else if (e.key === "Enter" && results[sel]) {
              e.preventDefault();
              void choose(results[sel]);
            }
          }}
          className="flex-1 min-w-0 outline-none bg-transparent placeholder:text-[#71685E]"
          style={{ fontSize: 15, lineHeight: "24px", fontWeight: day && !query ? 500 : 600, color: "#241F1B" }}
        />
      </label>
      {open && (
        <div
          id={listId}
          role="listbox"
          aria-label={t("Foods matching {q}", { q: query.trim() })}
          className="flex flex-col"
          style={
            day
              ? { position: "absolute", insetInline: 0, bottom: 46, zIndex: 20, boxSizing: "border-box", background: "#FFFFFF", borderRadius: 14, border: "1px solid rgba(174,161,220,0.5)", boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 6, gap: 2 }
              : { position: "absolute", insetInlineStart: 0, top: 48, zIndex: 20, width, boxSizing: "border-box", background: "#FFFFFF", borderRadius: 14, border: "1px solid rgba(174,161,220,0.5)", boxShadow: "0 16px 40px rgba(95,80,147,0.18)", padding: 6, gap: 2 }
          }
        >
          {results.length === 0 ? (
            <p role="status" style={{ margin: 0, padding: "10px", fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
              {searching ? t("Searching…") : failed ? t("Couldn't search foods. Check your connection and try again.") : t("Nothing matches that search.")}
            </p>
          ) : (
            results.map((r, i) => {
              const flag = flagOf(r);
              if (day)
                return (
                  <div
                    key={`${r.kind}-${r.id}`}
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === sel}
                    onPointerEnter={() => setSel(i)}
                    onClick={() => void choose(r)}
                    className="flex items-center cursor-pointer"
                    style={{ minHeight: 56, boxSizing: "border-box", gap: 12, padding: "6px 12px", borderRadius: 10, background: i === sel ? "#F0EDF9" : "transparent", boxShadow: i === sel ? "inset 0 0 0 1.5px #AEA1DC" : "none" }}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center" style={{ gap: 4 }}>
                        <span className="truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: i === sel ? 700 : 500, color: "#241F1B" }}>
                          {r.name}
                        </span>
                        {flag && <AlertTriangle size={14} strokeWidth={2.2} role="img" aria-label={flag.kind === "allergy_confirmed" ? t("Allergy") : t("Check this")} style={{ flex: "none", color: flag.kind === "allergy_confirmed" ? "#C0392B" : "#A86B00" }} />}
                      </span>
                      <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E", fontVariantNumeric: "tabular-nums" }}>
                        {`${r.sub} · P ${fmt(r.per.p)} · C ${fmt(r.per.c)} · F ${fmt(r.per.f)}`}
                      </span>
                    </span>
                    <span style={{ flex: "none", fontSize: 15, lineHeight: "24px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{t("{n} kcal", { n: fmt(r.per.kcal) })}</span>
                  </div>
                );
              const Icon = r.kind === "recipe" ? ChefHat : r.kind === "custom_meal" ? CookingPot : UtensilsCrossed;
              return (
                <div
                  key={`${r.kind}-${r.id}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === sel}
                  onPointerEnter={() => setSel(i)}
                  onClick={() => void choose(r)}
                  className="flex items-center cursor-pointer"
                  style={{ gap: 10, minHeight: 56, padding: "6px 10px", borderRadius: 10, background: i === sel ? "#F0EDF9" : "transparent" }}
                >
                  <span className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: "#F0EDF9", flex: "none" }}>
                    <Icon size={16} strokeWidth={2} aria-hidden style={{ color: "#7D6BB5" }} />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center" style={{ gap: 4 }}>
                      <span title={r.name} className="truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#241F1B" }}>
                        {r.name}
                      </span>
                      {flag && (
                        <AlertTriangle
                          size={14}
                          strokeWidth={2.2}
                          role="img"
                          aria-label={flag.kind === "allergy_confirmed" ? t("Allergy") : t("Check this")}
                          style={{ flex: "none", color: flag.kind === "allergy_confirmed" ? "#C0392B" : "#A86B00" }}
                        />
                      )}
                    </span>
                    <span className="block truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
                      {r.sub}
                    </span>
                  </span>
                  <span style={{ flex: "none", textAlign: "end", fontVariantNumeric: "tabular-nums" }}>
                    <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#241F1B" }}>
                      {t("{n} kcal", { n: fmt(r.per.kcal) })}
                    </span>
                    <span className="flex justify-end" style={{ gap: 6, fontSize: 11, lineHeight: "16px", color: "#5B5349" }}>
                      <span>
                        <b style={{ color: "#8175C2" }}>C</b> {fmt(r.per.c)}
                      </span>
                      <span>
                        <b style={{ color: "#7D6BB5" }}>P</b> {fmt(r.per.p)}
                      </span>
                      <span>
                        <b style={{ color: "#4F8079" }}>F</b> {fmt(r.per.f)}
                      </span>
                    </span>
                  </span>
                </div>
              );
            })
          )}
          {day && (
            <div className="flex" style={{ gap: 12, padding: "6px 12px 4px", fontSize: 11, lineHeight: "16px", fontWeight: 600, color: "#71685E" }}>
              <span>{t("↑↓ to move")}</span>
              <span>{t("↵ to add")}</span>
              <span>{t("Esc to close")}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
