import React, { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, AlertTriangle, ChefHat, CookingPot, Plus, Repeat, UserRound, UtensilsCrossed } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { Toggle } from "../../ui/Toggle";
import { INK, NO_ICON_SCALE } from "../proInk";
import { listFoods, searchFoods, type FoodSearchResult } from "../../../services/food";
import { fetchConflicts, type ItemDraft } from "../../../services/pro/nutrition";
import type { DietaryNeeds } from "../../../services/pro/clientPage";
import { DietStrip, Flag, SearchField } from "./kit";
import { allergenLabel, restrictionLabel } from "./nuFormat";
import { useTileBg } from "./hooks";
import { perServing } from "./itemFacts";
import { SLOT_CHIP_ORDER, SLOT_LABEL, gramsAllowed, portionMultiplier, scaleMacros, worstConflict, type ConflictRow, type ItemKind, type MealSlot } from "./nutritionModel";

/**
 * Release 3 · NU3 v2 "Add food with conflict flags" and NU4 v2 "Add food ·
 * conflict warning" (source gen r6c.js addFoodBrowse6 / addFoodDetail6, r7.js
 * addFoodBrowse7 / addFoodDetail7), plus NU11 "Allergy blocked" when a
 * blocked item is chosen.
 *
 * The item search covers the catalog and the professional's own foods
 * (services/food searchFoods, the same search Add Food uses), their recipes
 * and their custom meals (Food › Meal Prep lists). Conflict flags come from
 * food_conflicts for the client only (DB-5): allergy_confirmed is red and
 * blocked (NU11), allergy_check is "Check this" with no severity, a
 * restriction is amber with "Add anyway", a preference is shown only. A
 * template has no client, so it has no flags.
 *
 * Not carried over from the client AddFoodSheet: AI Voice, AI Scan and
 * Barcode (they log straight into the signed-in user's own diary) and
 * "Client favourites" (a client's favourites aren't shared with
 * professionals).
 */

export interface AddContext {
  clientId: string | null;
  clientName: string | null;
  firstName: string | null;
  planName: string;
  dayShort: string;
  slot: MealSlot;
  /** A client's copy made from one of my templates: offer "Also add to the template". */
  templateId: string | null;
  /** Swapping an existing item rather than adding one. */
  swapItemName?: string | null;
}

type Pick = { kind: ItemKind; id: string; name: string; sub: string; per: { kcal: number; p: number; c: number; f: number }; servingLabel: string | null };
type Filter = "all" | "recipes" | "foods" | "meals";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "recipes", label: "Recipes" },
  { key: "foods", label: "Foods" },
  { key: "meals", label: "Meals" },
];


export const AddItemSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  ctx: AddContext;
  needs: { needs: DietaryNeeds | null; shared: boolean; allergiesShared: boolean; loading: boolean } | null;
  onSubmit: (draft: ItemDraft, alsoTemplate: boolean) => Promise<string | null>;
}> = ({ open, onClose, ctx, needs, onSubmit }) => {
  const { recipes, customMeals } = useApp();
  const dark = useIsDark();
  const tile = useTileBg();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [foods, setFoods] = useState<FoodSearchResult[] | null>(null);
  const [foodsError, setFoodsError] = useState(false);
  const [picked, setPicked] = useState<Pick | null>(null);
  const [slot, setSlot] = useState<MealSlot>(ctx.slot);
  const [unit, setUnit] = useState<"serving" | "g">("serving");
  const [qty, setQty] = useState("1");
  const [alsoTemplate, setAlsoTemplate] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<{ pick: Pick; row: ConflictRow } | null>(null);
  const [conflicts, setConflicts] = useState<Record<string, ConflictRow[] | null>>({});
  const asked = useRef(new Set<string>());

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setFilter("all");
    setPicked(null);
    setSlot(ctx.slot);
    setError(null);
    setAlsoTemplate(false);
    setBlocked(null);
  }, [open, ctx.slot]);

  // Foods: the same service the client's Add Food uses; an empty box lists.
  useEffect(() => {
    if (!open) return;
    let live = true;
    const term = query.trim();
    setFoods(null);
    setFoodsError(false);
    const t = window.setTimeout(
      () => {
        // searchFoods reports a failed search instead of throwing, so it
        // reaches the same error line a thrown request does.
        (term ? searchFoods(term) : listFoods().then((foods) => ({ foods, failure: null })))
          .then((r) => live && (setFoods(r.foods), setFoodsError(r.failure !== null)))
          .catch(() => live && (setFoods([]), setFoodsError(true)));
      },
      term ? 250 : 0
    );
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [open, query]);

  const results: Pick[] = useMemo(() => {
    const term = query.trim().toLowerCase();
    const match = (s: string) => !term || s.toLowerCase().includes(term);
    const rec: Pick[] = recipes
      .filter((r) => match(r.title))
      .map((r) => {
        const base = perServing("recipe", r.id, null, { recipes, customMeals })!;
        return { kind: "recipe", id: r.id, name: r.title, sub: `Your recipe · ${r.servings} ${r.servings === 1 ? "serving" : "servings"}`, per: base.per, servingLabel: null };
      });
    const meals: Pick[] = customMeals
      .filter((m) => match(m.title))
      .map((m) => {
        const base = perServing("custom_meal", m.id, null, { recipes, customMeals })!;
        return { kind: "custom_meal", id: m.id, name: m.title, sub: `Your meal · ${m.items.length} ${m.items.length === 1 ? "food" : "foods"}`, per: base.per, servingLabel: null };
      });
    const fd: Pick[] = (foods ?? []).slice(0, 60).map((f) => ({
      kind: f.source === "custom" ? "custom_food" : "food",
      id: f.id,
      name: f.name,
      sub: f.source === "custom" ? `${f.servingLabel} · your food` : `${f.servingLabel}${f.isVerified ? " · verified" : ""}`,
      per: { kcal: f.calories, p: f.protein, c: f.carbs, f: f.fat },
      servingLabel: f.servingLabel,
    }));
    if (filter === "recipes") return rec;
    if (filter === "meals") return meals;
    if (filter === "foods") return fd;
    return [...rec, ...meals, ...fd];
  }, [query, filter, recipes, customMeals, foods]);

  // food_conflicts for what's on screen (client only).
  useEffect(() => {
    if (!open || !ctx.clientId) return;
    const todo = results.slice(0, 25).filter((r) => !asked.current.has(`${r.kind}:${r.id}`));
    if (!todo.length) return;
    todo.forEach((r) => asked.current.add(`${r.kind}:${r.id}`));
    let live = true;
    void Promise.all(todo.map(async (r) => [`${r.kind}:${r.id}`, await fetchConflicts(ctx.clientId!, { kind: r.kind, refId: r.id }, r.name)] as const)).then((pairs) => {
      if (live) setConflicts((prev) => ({ ...prev, ...Object.fromEntries(pairs) }));
    });
    return () => {
      live = false;
    };
  }, [open, ctx.clientId, results]);

  const conflictOf = (p: Pick): ConflictRow | null => worstConflict(conflicts[`${p.kind}:${p.id}`] ?? []);

  const choose = (p: Pick) => {
    const c = conflictOf(p);
    if (c?.kind === "allergy_confirmed") {
      setBlocked({ pick: p, row: c });
      return;
    }
    setPicked(p);
    setUnit("serving");
    setQty("1");
    setError(null);
  };

  const isFood = picked && (picked.kind === "food" || picked.kind === "custom_food");
  const q = Number(qty) > 0 ? Number(qty) : 0;
  const shown = picked ? scaleMacros(picked.per, unit === "g" && isFood ? portionMultiplier({ servingLabel: picked.servingLabel ?? "", per: picked.per }, q, null) : q) : null;
  const pickedConflict = picked ? conflictOf(picked) : null;
  const warn = pickedConflict && (pickedConflict.kind === "restriction" || pickedConflict.kind === "allergy_check") ? pickedConflict : null;
  const first = ctx.firstName ?? "";

  const submit = async () => {
    if (!picked || !(q > 0) || busy) return;
    setBusy(true);
    setError(null);
    const msg = await onSubmit(
      { ref: { kind: picked.kind, refId: picked.id }, slot, grams: unit === "g" && isFood ? q : null, servings: unit === "g" && isFood ? null : q },
      alsoTemplate
    );
    setBusy(false);
    if (msg) setError(msg);
    else onClose();
  };

  const label = ctx.swapItemName ? "Swap" : warn ? "Add anyway" : ctx.clientId ? `Add to ${first}'s plan` : "Add to plan";
  const banner = [ctx.clientName, ctx.planName, `${ctx.dayShort} ${SLOT_LABEL[ctx.slot].toLowerCase()}`].filter(Boolean).join(" · ");
  const grey: React.CSSProperties = { borderRadius: 14, background: dark ? "#242730" : "#F4F4F6", padding: "12px 14px", marginBottom: 10 };
  const chip = (on: boolean): React.CSSProperties => ({ whiteSpace: "nowrap", borderRadius: 10, padding: "8px 12px", minHeight: 36, fontSize: textPx(13), fontWeight: on ? 700 : 500, background: on ? INK.fill : INK.card, color: on ? INK.onFill : INK.ch });

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={ctx.swapItemName ? "Choose a swap" : "Add Food"}
        onBack={picked ? () => setPicked(null) : undefined}
        footer={
          picked ? (
            <div className="flex w-full" style={{ gap: 8 }}>
              <CtaButton className="flex-1" size="sheet" icon={ctx.swapItemName ? <Repeat size={15} /> : <Plus size={15} />} label={label} loading={busy} disabled={!(q > 0)} onClick={() => void submit()} />
            </div>
          ) : undefined
        }
      >
        {!picked ? (
          <div>
            <div className="flex items-center" style={{ gap: 8, borderRadius: 12, background: INK.prPale, padding: "9px 12px", marginBottom: 12, fontSize: textPx(12), fontWeight: 600, color: INK.prDeep }}>
              <UserRound size={13} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} />
              <span className="min-w-0" style={{ overflowWrap: "anywhere" }}>
                {ctx.swapItemName ? `Swapping ${ctx.swapItemName} · ${banner}` : `Adding to ${banner}`}
              </span>
            </div>
            {ctx.clientId && needs && <DietStrip name={ctx.clientName ?? ""} {...needs} />}
            <div className="flex" style={{ marginBottom: 16 }}>
              <SearchField value={query} onChange={setQuery} placeholder="Search foods, recipes and meals" height={48} radius={16} />
            </div>
            <div className="flex overflow-x-auto no-scrollbar" style={{ gap: 6, padding: "6px 0", margin: "-6px 0 2px" }} role="tablist" aria-label="Show">
              {FILTERS.map((f) => {
                const on = f.key === filter;
                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={on}
                    onClick={() => setFilter(f.key)}
                    className="tap relative whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[6px] before:content-['']"
                    style={{ flex: "none", borderRadius: 9999, padding: "6px 12px", minHeight: 32, fontSize: textPx(12), border: `1px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}`, background: on ? INK.fill : INK.card, color: on ? INK.onFill : INK.chS, fontWeight: on ? 700 : 600 }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
            {foods === null && filter !== "recipes" && filter !== "meals" && results.length === 0 ? (
              <p role="status" style={{ textAlign: "center", padding: "16px 0", fontSize: textPx(13), color: INK.chF }}>
                Searching…
              </p>
            ) : results.length === 0 ? (
              <p style={{ textAlign: "center", padding: "16px 0", fontSize: textPx(13), color: INK.chF }}>{foodsError ? "Couldn't search foods. Check your connection and try again." : query.trim() ? "Nothing matches that search." : "Nothing here yet."}</p>
            ) : (
              <div className="flex flex-col">
                {results.map((r) => {
                  const c = conflictOf(r);
                  const isBlocked = c?.kind === "allergy_confirmed";
                  return (
                    <button key={`${r.kind}-${r.id}`} type="button" onClick={() => choose(r)} className="tap w-full flex items-center text-left" style={{ gap: 12, padding: "10px 2px", minHeight: 44 }}>
                      <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 12, background: tile }}>
                        {r.kind === "recipe" ? (
                          <ChefHat size={16} strokeWidth={2} aria-hidden style={{ color: dark ? INK.prAccent : "#7D6BB5" }} />
                        ) : r.kind === "custom_meal" ? (
                          <CookingPot size={16} strokeWidth={2} aria-hidden style={{ color: dark ? INK.prAccent : "#7D6BB5" }} />
                        ) : (
                          <UtensilsCrossed size={16} strokeWidth={2} aria-hidden style={{ color: dark ? INK.prAccent : "#7D6BB5" }} />
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                          {r.name}
                          <Flag row={c} />
                        </span>
                        <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{isBlocked ? `${r.sub} · blocked` : r.sub}</span>
                      </span>
                      <span className="shrink-0" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, whiteSpace: "nowrap" }}>{`${Math.round(r.per.kcal).toLocaleString("en-GB")} kcal`}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center" style={{ gap: 13, marginBottom: 16 }}>
              <span className="flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 14, background: dark ? "rgba(174,161,220,0.14)" : "#EEEBFB" }}>
                {picked.kind === "recipe" ? (
                  <ChefHat size={20} strokeWidth={2} aria-hidden style={{ color: dark ? INK.prAccent : "#6B4BE0" }} />
                ) : (
                  <UtensilsCrossed size={20} strokeWidth={2} aria-hidden style={{ color: dark ? INK.prAccent : "#6B4BE0" }} />
                )}
              </span>
              <span className="min-w-0">
                <span className="block" style={{ fontSize: textPx(18), fontWeight: 800, letterSpacing: "-0.01em", color: INK.ch, overflowWrap: "anywhere" }}>{picked.name}</span>
                <span className="block" style={{ fontSize: textPx(12.5), color: INK.chF }}>{picked.sub}</span>
              </span>
            </div>
            {warn && (
              <div role="alert" className="flex" style={{ gap: 10, borderRadius: 14, background: INK.goldPale, padding: "10px 12px", marginBottom: 10 }}>
                <AlertCircle size={16} strokeWidth={2.2} aria-hidden style={{ color: INK.goldInk, flexShrink: 0, marginTop: 1 }} />
                <span>
                  <span className="block" style={{ fontSize: textPx(13), fontWeight: 800, color: INK.goldInk }}>
                    {warn.kind === "restriction" ? `${picked.name} isn't ${restrictionLabel(warn.restriction ?? "").toLowerCase()}` : `${picked.name} may contain ${allergenLabel(warn.allergen ?? "").toLowerCase()}. Check this.`}
                  </span>
                  <span className="block" style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>
                    {warn.kind === "restriction" ? `${first} follows ${restrictionLabel(warn.restriction ?? "")}.` : `The name suggests it. Check the ingredients with ${first}.`}
                  </span>
                </span>
              </div>
            )}
            <div className="flex items-center" style={{ ...grey, gap: 12 }}>
              <span className="flex-none whitespace-nowrap" style={{ fontSize: textPx(14.5), fontWeight: 500, color: dark ? "#B8B3C7" : "#575863" }}>
                {ctx.clientId ? `Portion for ${first}` : "Portion"}
              </span>
              <input
                value={qty}
                inputMode="decimal"
                aria-label={unit === "g" ? "Portion in grams" : "Portion in servings"}
                onChange={(e) => setQty(e.target.value.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, ""))}
                className="flex-1 min-w-0 text-center outline-none"
                style={{ background: INK.card, border: "none", borderRadius: 10, padding: "10px 12px", fontSize: textPx(15), fontWeight: 700, color: INK.ch }}
              />
            </div>
            {isFood && gramsAllowed(picked.servingLabel) && (
              <div style={grey}>
                <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>Unit</p>
                <div className="flex" style={{ gap: 7, marginTop: 9 }}>
                  {(["serving", "g"] as const).map((u) => (
                    <button key={u} type="button" aria-pressed={unit === u} onClick={() => { setUnit(u); setQty(u === "g" ? "100" : "1"); }} className="tap" style={chip(unit === u)}>
                      {u}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div style={grey}>
              <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>Meal</p>
              <div className="flex" style={{ gap: 6, marginTop: 9 }}>
                {SLOT_CHIP_ORDER.map((m) => (
                  <button key={m} type="button" aria-pressed={slot === m} onClick={() => setSlot(m)} className="tap flex-1 min-w-0" style={{ ...chip(slot === m), padding: "8px 4px", textAlign: "center" }}>
                    {SLOT_LABEL[m]}
                  </button>
                ))}
              </div>
            </div>
            {shown && (
              <div className="grid" style={{ ...grey, gridTemplateColumns: "repeat(4, minmax(0, 1fr))", padding: "13px 0", marginBottom: 12 }}>
                {[
                  [Math.round(shown.kcal).toLocaleString("en-GB"), INK.ch, "kcal"],
                  [`${Math.round(shown.p)}g`, dark ? "#C3B3FB" : "#7D6BB5", "protein"],
                  [`${Math.round(shown.c)}g`, dark ? "#B7ABDE" : "#8175C2", "carbs"],
                  [`${Math.round(shown.f)}g`, dark ? "#8FB0F0" : "#4274D7", "fat"],
                ].map(([v, col, l], i) => (
                  <div key={l} style={{ textAlign: "center", borderLeft: i ? `1px solid ${dark ? "rgba(245,243,250,0.08)" : "#E2E3E7"}` : "none" }}>
                    <p style={{ fontSize: textPx(15.5), fontWeight: 800, color: col }}>{v}</p>
                    <p style={{ fontSize: textPx(11), color: INK.chF, marginTop: 2 }}>{l}</p>
                  </div>
                ))}
              </div>
            )}
            {ctx.templateId && !ctx.swapItemName && (
              <div className="flex items-center justify-between" style={{ ...grey, gap: 12 }}>
                <span className="min-w-0">
                  <span className="block" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch }}>Also add to the template</span>
                  <span className="block" style={{ fontSize: textPx(11), color: INK.chF }}>{`${ctx.planName}, for all clients on it`}</span>
                </span>
                <Toggle checked={alsoTemplate} onChange={setAlsoTemplate} label="Also add to the template" />
              </div>
            )}
            {ctx.templateId && !ctx.swapItemName && alsoTemplate && (
              <p style={{ fontSize: textPx(11.5), color: INK.chF, marginBottom: 8 }}>Clients already on the plan keep their own copy. The template change applies to new assignments.</p>
            )}
            {error && (
              <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
                {error}
              </p>
            )}
            {!(q > 0) && <p style={{ fontSize: textPx(11.5), color: INK.chF }}>Enter a portion above 0.</p>}
          </div>
        )}
      </BottomSheet>

      <CentredPopup
        open={!!blocked}
        onClose={() => setBlocked(null)}
        title={blocked ? `${blocked.pick.name} contains ${allergenLabel(blocked.row.allergen ?? "").toLowerCase()}` : ""}
        icon={<ConflictTile red />}
        iconBare
        body={blocked ? `${first} is allergic to ${allergenLabel(blocked.row.allergen ?? "").toLowerCase()}${blocked.row.severity ? ` (${blocked.row.severity})` : ""}. Foods with an allergen are blocked by default.` : undefined}
      >
        <BlockedActions first={first} onSwap={() => setBlocked(null)} onKeepOut={() => setBlocked(null)} />
      </CentredPopup>
    </>
  );
};

/** NU11 / NU12 icon tile (r7 nuConflict7): 48 r14, status.high pale with the triangle, or gold pale with the circle; 22 / 2. */
export const ConflictTile: React.FC<{ red?: boolean }> = ({ red }) => (
  <span className="flex items-center justify-center" style={{ width: 48, height: 48, borderRadius: 14, background: red ? INK.hiBg : INK.goldPale }}>
    {red ? <AlertTriangle size={22} strokeWidth={2} aria-hidden style={{ color: INK.hi, ...NO_ICON_SCALE }} /> : <AlertCircle size={22} strokeWidth={2} aria-hidden style={{ color: INK.goldInk, ...NO_ICON_SCALE }} />}
  </span>
);

/** NU11's two buttons and footnote (r7 nuConflict7). */
export const BlockedActions: React.FC<{ first: string; onSwap: () => void; onKeepOut: () => void; keepOutLabel?: string }> = ({ first, onSwap, onKeepOut, keepOutLabel = "Keep it out" }) => (
  <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
    <CtaButton size="page" icon={<Repeat size={15} />} label="Choose a swap" onClick={onSwap} />
    <CtaButton size="page" variant="secondary" label={keepOutLabel} onClick={onKeepOut} />
    <p style={{ fontSize: textPx(11.5), color: INK.chF, textAlign: "center", lineHeight: 1.5 }}>{`To allow it, ${first} must update their allergies first.`}</p>
  </div>
);
