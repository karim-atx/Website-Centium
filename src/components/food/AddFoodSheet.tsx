import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { sheetChipStyle } from "../ui/sheetChip";
import { Button } from "../ui/Button";
import { Search, Mic, Camera, ScanLine, Clock, Star, Check, UtensilsCrossed, Sparkles, SlidersHorizontal } from "lucide-react";
import { foodCategories, addFoodFilterCategories } from "../../data/mockFoods";
import type { Food, MealType, ServingUnit } from "../../types";
import { servingMultiplier, sumNutrientMaps, targetsFromGoal } from "../../services/nutrition";
import { NutrientSections } from "./NutrientSections";
import {
  searchFoods,
  listFoods,
  getFoodsByIds,
  lookupByBarcode,
  createFoodByBarcode,
  logFoodEntry,
  type FoodSearchResult,
} from "../../services/food";
import { getFoodNutrientsById } from "../../services/food-nutrients";
import { useApp } from "../../context/AppContext";
import { AIVoiceLogger } from "./AIVoiceLogger";
import { foodCategoryIcon } from "../../utils/icons";

type ScanMode = "scan" | "barcode" | null;

// V4: preset serving units offered as tap targets — only the quantity number
// is typed. The relevant subset differs a little by food category (a plate
// of rice logs in cups/g; a drink logs in ml).
const servingUnitOptions: { value: ServingUnit; label: string }[] = [
  { value: "serving", label: "serving" },
  { value: "g", label: "g" },
  { value: "ml", label: "ml" },
  { value: "cup", label: "cup" },
  { value: "tbsp", label: "tbsp" },
  { value: "tsp", label: "tsp" },
];

// Mobile handoff item 2: the detail step's meal row order and labels. Local
// to this step — the shared mealOrder/mealLabels drive the diary and other
// screens, which this item doesn't touch.
const detailMealOrder: MealType[] = ["breakfast", "snack", "lunch", "dinner"];
const detailMealLabels: Record<MealType, string> = {
  breakfast: "Breakfast",
  snack: "Snack",
  lunch: "Lunch",
  dinner: "Dinner",
};

// Caps label at the top of a grey sheet container (00-FOUNDATIONS §0.3).
const sheetCapsLabelStyle: React.CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#8C8378",
};

const FoodIcon: React.FC<{ category: Food["category"]; size?: number; className?: string }> = ({
  category,
  size = 16,
  className,
}) => {
  const Icon = foodCategoryIcon[category] ?? UtensilsCrossed;
  return <Icon size={size} className={className} />;
};

const emptyBarcodeDraft = {
  name: "",
  serving: "1 serving",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  category: "snacks" as Food["category"],
};

export const AddFoodSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultMeal?: MealType;
}> = ({ open, onClose, defaultMeal = "lunch" }) => {
  const {
    addFoodEntryRecord,
    authUserId,
    foodLog,
    customFoods,
    addCustomFood,
    customMeals,
    logCustomMeal,
    selectedDate,
    nutritionGoal,
    metricValues,
  } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  // Initialised from the prop, then RE-SYNCED on every open by the effect
  // below. The initialiser alone is not enough: this sheet is mounted
  // permanently by its parents (`<AddFoodSheet open={...} />` sits in the
  // tree unconditionally; only the inner BottomSheet returns null when
  // closed), so useState captures the first `defaultMeal` it ever sees and
  // ignores every later one. That is why tapping "+" on the Breakfast row
  // opened a sheet with Lunch selected, and why entries logged that way were
  // written as lunch.
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [quantity, setQuantityRaw] = useState(1);
  const [quantityDraft, setQuantityDraft] = useState("1");
  // V7 (QA 7.0): quantity can now be typed directly (with decimals), not
  // just stepped — keep the draft text in sync whenever it changes
  // programmatically (resetting the form).
  const setQuantity = (updater: number | ((q: number) => number)) => {
    setQuantityRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setQuantityDraft(String(next));
      return next;
    });
  };
  const [unit, setUnit] = useState<ServingUnit>("serving");
  // Mobile handoff item 2: "Advanced" opens a second step inside this same
  // sheet (BottomSheet's onBack, not a separate sheet/route) showing the
  // selected food's full per-nutrient breakdown, scaled by the same
  // quantity/unit multiplier as the macro strip below.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // Per-serving nutrient map for the selected catalog food (unscaled). Null
  // for a custom/manual food (no food_nutrients row exists) or before the
  // fetch resolves.
  const [rawNutrients, setRawNutrients] = useState<Record<string, number> | null>(null);
  const [nutrientsLoading, setNutrientsLoading] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [scanResultFood, setScanResultFood] = useState<FoodSearchResult | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    name: "",
    serving: "1 serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    category: "homemade" as Food["category"],
  });

  // --- real catalog -------------------------------------------------------
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<FoodSearchResult[]>([]);

  // --- barcode ------------------------------------------------------------
  const [barcode, setBarcode] = useState("");
  const [barcodeState, setBarcodeState] = useState<"idle" | "looking" | "miss">("idle");
  const [barcodeDraft, setBarcodeDraft] = useState(emptyBarcodeDraft);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // --- logging ------------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [savingCustom, setSavingCustom] = useState(false);

  // Search runs against Supabase, so it is debounced: a query per keystroke
  // would be a request per keystroke. An empty box lists the whole catalog,
  // which keeps the browse-by-category behaviour the sheet already had.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const term = query.trim();
    setLoading(true);
    const timer = window.setTimeout(
      () => {
        void (term ? searchFoods(term) : listFoods()).then((rows) => {
          if (cancelled) return;
          setResults(rows);
          setLoading(false);
        });
      },
      term ? 250 : 0
    );
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  // Recent has to be re-read from the catalog rather than rebuilt from the
  // diary: an entry snapshots totals, and logging the same food again needs
  // the per-serving values only the catalog holds.
  useEffect(() => {
    if (!open) return;
    const ids: string[] = [];
    for (let i = foodLog.length - 1; i >= 0 && ids.length < 5; i--) {
      const id = foodLog[i].foodId ?? foodLog[i].customFoodId;
      if (id && !ids.includes(id)) ids.push(id);
    }
    if (ids.length === 0) {
      setRecent([]);
      return;
    }
    let cancelled = false;
    void getFoodsByIds(ids).then((rows) => {
      if (!cancelled) setRecent(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [foodLog, open]);

  // Fetched as soon as a food is selected (not lazily on Advanced tap) so the
  // multiplier — already recomputed every render from quantity/unit — stays
  // live if the user opens Advanced, backs out, changes quantity, and
  // reopens it. Custom/manual foods have no food_nutrients row; per
  // getFoodNutrientsById's contract that's always null, never an error.
  useEffect(() => {
    if (!selectedFood || selectedFood.source !== "catalog") {
      setRawNutrients(null);
      setNutrientsLoading(false);
      return;
    }
    let cancelled = false;
    setNutrientsLoading(true);
    void getFoodNutrientsById(selectedFood.id).then((data) => {
      if (cancelled) return;
      setRawNutrients(data);
      setNutrientsLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedFood]);

  // Foods the user created before custom-food writes were wired to Supabase
  // still live in localStorage. Merged in so they stay searchable; see the
  // note in the sheet's own follow-ups.
  const localCustom = useMemo(
    () =>
      customFoods
        .filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
        .map<FoodSearchResult>((f) => ({
          id: f.id,
          source: "custom",
          name: f.name,
          nameAr: f.nameAr ?? null,
          category: f.category,
          servingLabel: f.serving,
          calories: f.calories,
          protein: f.protein,
          carbs: f.carbs,
          fat: f.fat,
          isLebanese: !!f.isLebanese,
          isVerified: false,
          barcode: null,
          overridesFoodId: null,
        })),
    [customFoods, query]
  );

  const matchingMeals = useMemo(
    () => (query.trim() ? customMeals.filter((m) => m.title.toLowerCase().includes(query.toLowerCase())) : []),
    [customMeals, query]
  );

  const logMeal = (mealId: string) => {
    logCustomMeal(mealId, meal, selectedDate);
    setJustAdded(true);
    setTimeout(resetAndClose, 700);
  };

  // Category filtering stays client-side: the catalog is small, the rows are
  // already loaded, and doing it here keeps the chips instant.
  const filtered = useMemo(() => {
    const all = [...localCustom, ...results];
    return category ? all.filter((f) => f.category === category) : all;
  }, [localCustom, results, category]);

  // Takes the meal from the row the user actually tapped, each time the sheet
  // opens. Deliberately here rather than in resetAndClose below: that runs on
  // CLOSE, so it would capture the defaultMeal of the sheet being dismissed,
  // and the next open from a different row would still show the previous
  // row's meal. Guarded on `open` so it never overwrites a choice the user
  // makes with the chips while the sheet is up.
  useEffect(() => {
    if (open) setMeal(defaultMeal);
  }, [open, defaultMeal]);

  const resetAndClose = useCallback(() => {
    // `meal` is intentionally absent from this reset — the effect above owns
    // it, for the reason given there. Everything else is cleared here.
    setQuery("");
    setCategory(null);
    setSelectedFood(null);
    setQuantity(1);
    setQuantityDraft("1");
    setUnit("serving");
    setAdvancedOpen(false);
    setRawNutrients(null);
    setNutrientsLoading(false);
    setScanMode(null);
    setScanResultFood(null);
    setJustAdded(false);
    setCustomMode(false);
    setCustomDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "", category: "homemade" });
    setBarcode("");
    setBarcodeState("idle");
    setBarcodeDraft(emptyBarcodeDraft);
    setBarcodeError(null);
    setSaving(false);
    setAddError(null);
    onClose();
  }, [onClose]);

  // Awaits the write so the food that lands in the detail view carries its
  // real custom_foods id, which is what gives the resulting diary entry real
  // provenance. A failed write still returns a usable local food.
  const saveCustomFood = async () => {
    if (!customDraft.name.trim() || !customDraft.calories || savingCustom) return;
    setSavingCustom(true);
    const food = await addCustomFood({
      name: customDraft.name.trim(),
      category: customDraft.category,
      serving: customDraft.serving || "1 serving",
      calories: Number(customDraft.calories) || 0,
      protein: Number(customDraft.protein) || 0,
      carbs: Number(customDraft.carbs) || 0,
      fat: Number(customDraft.fat) || 0,
    });
    setSavingCustom(false);
    setCustomMode(false);
    setSelectedFood({
      id: food.id,
      source: "custom",
      name: food.name,
      nameAr: food.nameAr ?? null,
      category: food.category,
      servingLabel: food.serving,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
      isLebanese: !!food.isLebanese,
      isVerified: false,
      barcode: null,
      overridesFoodId: null,
    });
  };

  /**
   * Writes the entry to food_log_entries, then mirrors it into local state.
   *
   * The service is the one doing the arithmetic and the insert; what comes
   * back carries the row's real database id, and that is what goes into the
   * diary. Minting a local id here instead would make stage (d)'s hydration
   * duplicate this row rather than recognise it.
   *
   * Failures surface. A silent no-op would leave someone believing they had
   * logged a meal they had not, which in a food diary is worse than an error.
   */
  const handleAdd = async () => {
    if (!selectedFood || saving) return;
    if (!authUserId) {
      setAddError("You need to be signed in to log food.");
      return;
    }
    setSaving(true);
    setAddError(null);

    const result = await logFoodEntry({
      userId: authUserId,
      food: selectedFood,
      quantity,
      unit,
      meal,
      date: selectedDate,
      loggedVia: selectedFood.barcode ? "barcode" : "search",
    });

    setSaving(false);
    if (!result.ok || !result.entry) {
      setAddError(result.message ?? "Could not save that entry.");
      return;
    }

    addFoodEntryRecord(result.entry);
    setJustAdded(true);
    setTimeout(resetAndClose, 700);
  };

  // AI Scan stays a demo — there is no on-device image recognition — but it
  // now "recognises" a real catalog row rather than a hardcoded mock, so the
  // food it hands back can actually be logged with real provenance.
  const runScan = (mode: ScanMode) => {
    setScanMode(mode);
    setScanResultFood(null);
    if (mode !== "scan") return;
    setTimeout(() => {
      const demo = results.find((f) => f.name === "Manoushe Jebneh") ?? results[0] ?? null;
      setScanResultFood(demo);
    }, 1600);
  };

  // Lookup only. Creating a shared catalog row is a separate, explicit step —
  // see handleCreateBarcodeFood.
  const handleBarcodeLookup = async () => {
    const code = barcode.trim();
    if (!code) return;
    setBarcodeError(null);
    setBarcodeState("looking");
    const hit = await lookupByBarcode(code);
    if (hit) {
      setScanResultFood(hit);
      setBarcodeState("idle");
      return;
    }
    // Miss: offer to add it, with the values the user will have to read off
    // the package. Stage (d) fills these in from Open Food Facts.
    setBarcodeDraft(emptyBarcodeDraft);
    setBarcodeState("miss");
  };

  const handleCreateBarcodeFood = async () => {
    if (!barcodeDraft.name.trim() || !barcodeDraft.calories) return;
    setCreating(true);
    setBarcodeError(null);
    const result = await createFoodByBarcode({
      barcode: barcode.trim(),
      name: barcodeDraft.name.trim(),
      category: barcodeDraft.category,
      servingLabel: barcodeDraft.serving || "1 serving",
      calories: Number(barcodeDraft.calories) || 0,
      protein: Number(barcodeDraft.protein) || 0,
      carbs: Number(barcodeDraft.carbs) || 0,
      fat: Number(barcodeDraft.fat) || 0,
    });
    setCreating(false);
    if (!result.ok || !result.food) {
      setBarcodeError(result.message ?? "Could not add that product.");
      return;
    }
    // First scan wins: if someone registered this barcode first, the RPC
    // returns THEIR row and ignores what was typed here. Use what came back.
    setScanResultFood(result.food);
    setBarcodeState("idle");
  };

  // Detail / quantity view
  if (selectedFood) {
    const multiplier = servingMultiplier(selectedFood.servingLabel, quantity, unit);
    const foodTotalCal = Math.round(selectedFood.calories * multiplier);

    // Mobile handoff item 2: same scaling rule as the macro strip above —
    // the per-serving map fetched for this food, multiplied by the same
    // `multiplier` quantity/unit already produces for calories/protein/
    // carbs/fat. null stays null (custom/manual foods, or not loaded yet)
    // rather than becoming a fabricated zero.
    const scaledNutrients = rawNutrients
      ? Object.fromEntries(Object.entries(rawNutrients).map(([key, amount]) => [key, amount * multiplier]))
      : null;
    // Single-food case: itemCount is always 1, so sumNutrientMaps' "partial:
    // N of M" machinery degrades to plain has-data/no-data for this one food,
    // which is what NutrientSections should render for an embedded context.
    const nutrientTotals = sumNutrientMaps([scaledNutrients]);
    const targets = targetsFromGoal(nutritionGoal);
    const multiplierDisplay = Math.round(multiplier * 100) / 100;

    return (
      <BottomSheet
        open={open}
        onClose={resetAndClose}
        title={advancedOpen ? "Nutrient details" : "Add Food"}
        onBack={advancedOpen ? () => setAdvancedOpen(false) : () => setSelectedFood(null)}
      >
        {advancedOpen ? (
          <div className="animate-fade-slide-up flex flex-col gap-2.5">
            <p className="text-[13px]" style={{ color: "#575863", margin: "0 2px 2px" }}>
              {selectedFood.name} ·{" "}
              {multiplierDisplay === 1 ? selectedFood.servingLabel : `${multiplierDisplay} × ${selectedFood.servingLabel}`}
            </p>

            {selectedFood.source !== "catalog" ? (
              <p className="text-center text-sm text-charcoal-faint py-8">
                No per-nutrient data for custom or manually entered foods.
              </p>
            ) : nutrientsLoading ? (
              <p className="text-center text-sm text-charcoal-faint py-8">Loading nutrients…</p>
            ) : (
              <NutrientSections
                totals={nutrientTotals.totals}
                present={nutrientTotals.present}
                itemCount={nutrientTotals.itemCount}
                calorieTarget={targets.calories}
                proteinTarget={targets.protein}
                carbTarget={targets.carbs}
                fatTarget={targets.fat}
                bodyWeightKg={metricValues.weight ?? null}
                // Embedded Advanced view has no filter toggle — README.md
                // line 925: "Removed; the view always shows available
                // nutrients and names empty groups."
                filter="all"
                suppressEmptyState
              />
            )}

            <p className="text-[10.5px] leading-relaxed" style={{ color: "#8C8378", margin: "6px 2px 0" }}>
              % of the FDA Daily Value for adults, from this food alone. Calorie and macro percentages use your
              Goals.
            </p>
          </div>
        ) : (
          // Mobile handoff item 2: the detail step in the sheet control
          // vocabulary, sections 10px apart.
          <div className="animate-fade-slide-up flex flex-col" style={{ gap: 10 }}>
            <div className="flex items-center" style={{ gap: 13, marginBottom: 14 }}>
              <span
                className="flex items-center justify-center shrink-0"
                style={{ width: 48, height: 48, borderRadius: 15, background: "#EFECFB", color: "#6B4BE0" }}
              >
                <FoodIcon category={selectedFood.category} size={20} />
              </span>
              <div className="min-w-0">
                <p style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.01em", color: "#241F1B" }}>
                  {selectedFood.name}
                </p>
                {/* The verified/estimate note isn't in the handoff's header
                    spec; kept (restyled) because it tells the user whether the
                    figures are sourced or approximate. */}
                <p style={{ margin: "2px 0 0", fontSize: 12.5, color: "#8C8378" }}>
                  {selectedFood.servingLabel}
                  {selectedFood.isVerified ? " · USDA verified" : " · estimate"}
                </p>
              </div>
            </div>

            <div
              className="flex items-center"
              style={{ gap: 12, background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}
            >
              <span style={{ flex: "none", fontSize: 14.5, fontWeight: 500, color: "#575863" }}>Quantity</span>
              <input
                value={quantityDraft}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, "").replace(/(?<=\..*)\./g, "");
                  setQuantityDraft(v);
                  const n = Number(v);
                  if (v && !Number.isNaN(n) && n > 0) setQuantityRaw(n);
                }}
                onBlur={() => setQuantityDraft(String(quantity))}
                inputMode="decimal"
                className="min-w-0 text-center focus:outline-none"
                style={{ flex: 1, background: "#FFFFFF", border: "none", borderRadius: 10, padding: "10px 12px", fontSize: 15, fontWeight: 700, color: "#241F1B" }}
              />
            </div>

            <div style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}>
              <p style={sheetCapsLabelStyle}>UNIT</p>
              <div
                className="flex overflow-x-auto no-scrollbar"
                style={{ gap: 7, margin: "9px -14px 0", padding: "0 14px" }}
              >
                {servingUnitOptions.map((u) => (
                  <button
                    key={u.value}
                    onClick={() => setUnit(u.value)}
                    className="tap transition-colors"
                    style={sheetChipStyle(unit === u.value)}
                  >
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}>
              <p style={sheetCapsLabelStyle}>MEAL</p>
              <div className="flex" style={{ gap: 6, marginTop: 9 }}>
                {detailMealOrder.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMeal(m)}
                    className="tap transition-colors"
                    style={{ ...sheetChipStyle(meal === m), flex: 1, minWidth: 0, padding: "8px 4px" }}
                  >
                    {detailMealLabels[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-4" style={{ background: "#F4F4F6", borderRadius: 16, padding: "13px 0" }}>
              {[
                { value: `${foodTotalCal}`, color: "#241F1B", caption: "kcal" },
                { value: `${(selectedFood.protein * multiplier).toFixed(1)}g`, color: "#7D6BB5", caption: "protein" },
                { value: `${Math.round(selectedFood.carbs * multiplier)}g`, color: "#8175C2", caption: "carbs" },
                { value: `${(selectedFood.fat * multiplier).toFixed(1)}g`, color: "#5E8A83", caption: "fat" },
              ].map((cell, i) => (
                <div
                  key={cell.caption}
                  className="text-center"
                  style={i > 0 ? { borderLeft: "1px solid #E2E3E7" } : undefined}
                >
                  <p style={{ margin: 0, fontSize: 15.5, fontWeight: 800, color: cell.color }}>{cell.value}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "#8C8378" }}>{cell.caption}</p>
                </div>
              ))}
            </div>

            {addError && (
              <p className="text-xs font-semibold text-status-high text-center">{addError}</p>
            )}

            <div className="flex" style={{ gap: 10 }}>
              <button
                type="button"
                onClick={handleAdd}
                disabled={justAdded || saving}
                className="tap inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                style={{ flex: 1, height: 52, borderRadius: 14, border: "none", background: "#A198DF", color: "#FFFFFF", fontSize: 15.5, fontWeight: 700 }}
              >
                {justAdded ? <><Check size={16} /> Added</> : saving ? "Saving…" : "Add to Diary"}
              </button>
              <button
                type="button"
                onClick={() => setAdvancedOpen(true)}
                aria-label="Nutrient details"
                title="Nutrient details"
                className="tap shrink-0 flex items-center justify-center"
                style={{ width: 60, height: 52, borderRadius: 14, background: "#FFFFFF", border: "1px solid #E4E4E9", color: "#241F1B" }}
              >
                <SlidersHorizontal size={20} strokeWidth={1.9} />
              </button>
            </div>
          </div>
        )}
      </BottomSheet>
    );
  }

  // Custom food creation
  if (customMode) {
    const field = (
      label: string,
      key: keyof typeof customDraft,
      placeholder: string,
      numeric = false
    ) => (
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{label}</span>
        <input
          value={customDraft[key]}
          onChange={(e) =>
            setCustomDraft((d) => ({
              ...d,
              [key]: numeric ? e.target.value.replace(/[^\d.]/g, "") : e.target.value,
            }))
          }
          placeholder={placeholder}
          inputMode={numeric ? "decimal" : "text"}
          className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
    );

    return (
      <BottomSheet open={open} onClose={resetAndClose} title="Create Custom Food">
        <div className="space-y-4 animate-fade-slide-up">
          {field("Food name", "name", "Mom's Kibbeh")}
          {field("Serving size", "serving", "1 piece")}

          <div>
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Logo</span>
            <div className="flex flex-wrap gap-2">
              {foodCategories.map((c) => {
                const Icon = foodCategoryIcon[c.id] ?? UtensilsCrossed;
                const active = customDraft.category === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCustomDraft((d) => ({ ...d, category: c.id }))}
                    aria-label={c.label}
                    title={c.label}
                    className={`tap w-11 h-11 rounded-2xl flex items-center justify-center border transition-colors ${
                      active ? "bg-primary text-white border-primary" : "bg-cream-soft text-charcoal-soft border-transparent"
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {field("Calories", "calories", "0", true)}
            {field("Protein (g)", "protein", "0", true)}
            {field("Carbs (g)", "carbs", "0", true)}
            {field("Fat (g)", "fat", "0", true)}
          </div>
          <Button
            fullWidth
            size="lg"
            onClick={saveCustomFood}
            disabled={!customDraft.name.trim() || !customDraft.calories || savingCustom}
          >
            {savingCustom ? "Saving…" : "Save custom food"}
          </Button>
          <p className="text-[11px] text-charcoal-faint text-center">
            Saved foods appear in search next time, alongside the food database.
          </p>
        </div>
      </BottomSheet>
    );
  }

  // Scan / barcode view
  if (scanMode) {
    const barcodeField = (
      label: string,
      key: keyof typeof barcodeDraft,
      placeholder: string,
      numeric = false
    ) => (
      <label className="block">
        <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{label}</span>
        <input
          value={barcodeDraft[key]}
          onChange={(e) =>
            setBarcodeDraft((d) => ({
              ...d,
              [key]: numeric ? e.target.value.replace(/[^\d.]/g, "") : e.target.value,
            }))
          }
          placeholder={placeholder}
          inputMode={numeric ? "decimal" : "text"}
          className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </label>
    );

    return (
      <BottomSheet open={open} onClose={resetAndClose} title={scanMode === "barcode" ? "Scan Barcode" : "Scan Food"}>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-full aspect-[4/3] rounded-3xl bg-charcoal relative overflow-hidden mb-5 flex items-center justify-center">
            <div className="absolute inset-6 border-2 border-dashed border-white/40 rounded-2xl" />
            {!scanResultFood ? (
              <div className="text-white/70 text-sm flex flex-col items-center gap-2">
                {scanMode === "barcode" ? <ScanLine size={28} className="animate-pulse" /> : <Camera size={28} className="animate-pulse" />}
                {scanMode === "barcode"
                  ? barcodeState === "looking"
                    ? "Looking up…"
                    : "Enter a barcode below"
                  : "Scanning…"}
              </div>
            ) : (
              <div className="text-white text-sm">Match found</div>
            )}
          </div>

          {/* Barcode entry. Camera scanning is a separate, larger task (a
              scanning library, camera permission, a video pipeline), so the
              barcode arrives as text for now — the lookup and creation paths
              behind it are real. */}
          {scanMode === "barcode" && !scanResultFood && (
            <div className="w-full text-left mb-4">
              <div className="flex gap-2">
                <input
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value.replace(/[^\dA-Za-z]/g, ""));
                    setBarcodeState("idle");
                    setBarcodeError(null);
                  }}
                  placeholder="e.g. 5449000000996"
                  inputMode="numeric"
                  className="flex-1 rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <Button
                  onClick={handleBarcodeLookup}
                  disabled={!barcode.trim() || barcodeState === "looking"}
                >
                  {barcodeState === "looking" ? "…" : "Look up"}
                </Button>
              </div>

              {barcodeState === "miss" && (
                <div className="mt-4 space-y-3 animate-fade-slide-up">
                  <p className="text-[11px] text-charcoal-faint">
                    Not in the catalog yet. Add it from the package label and everyone
                    scanning this barcode will find it.
                  </p>
                  {barcodeField("Product name", "name", "Coca-Cola 330ml")}
                  {barcodeField("Serving size", "serving", "1 can (330 ml)")}
                  <div className="grid grid-cols-2 gap-3">
                    {barcodeField("Calories", "calories", "0", true)}
                    {barcodeField("Protein (g)", "protein", "0", true)}
                    {barcodeField("Carbs (g)", "carbs", "0", true)}
                    {barcodeField("Fat (g)", "fat", "0", true)}
                  </div>
                  {barcodeError && (
                    <p className="text-xs font-semibold text-status-high text-center">{barcodeError}</p>
                  )}
                  <Button
                    fullWidth
                    onClick={handleCreateBarcodeFood}
                    disabled={creating || !barcodeDraft.name.trim() || !barcodeDraft.calories}
                  >
                    {creating ? "Adding…" : "Add to catalog"}
                  </Button>
                </div>
              )}

              {barcodeError && barcodeState !== "miss" && (
                <p className="text-xs font-semibold text-status-high mt-2">{barcodeError}</p>
              )}
            </div>
          )}

          {scanResultFood ? (
            <div className="w-full animate-fade-slide-up">
              <div className="flex items-center gap-3 bg-cream-soft rounded-2xl px-4 py-3 mb-4">
                <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
                  <FoodIcon category={scanResultFood.category} size={16} className="text-primary-dark" />
                </span>
                <div className="text-left">
                  <p className="font-semibold text-charcoal text-sm">{scanResultFood.name}</p>
                  <p className="text-xs text-charcoal-faint">{scanResultFood.calories} kcal · {scanResultFood.servingLabel}</p>
                </div>
              </div>
              <Button
                fullWidth
                onClick={() => {
                  setSelectedFood(scanResultFood);
                  setScanMode(null);
                }}
              >
                Use this result
              </Button>
            </div>
          ) : (
            scanMode === "scan" && (
              <p className="text-xs text-charcoal-faint max-w-xs">
                Prototype demo — production Centium will use on-device image recognition to identify food automatically.
              </p>
            )
          )}
        </div>
      </BottomSheet>
    );
  }

  // Browse view
  return (
    <>
      <BottomSheet open={open} onClose={resetAndClose} title="Add Food">
        <div className="animate-fade-slide-up">
          {/* V10 (QA 10.0): "Only the circled part in the attached picture
              should scroll the rest is locked in add food" — search, the
              AI/scan/custom buttons, recent, custom meals and the category
              chips all stay pinned right under the sheet's own sticky
              title bar; only the results list below scrolls. */}
          <div className="sticky top-16 -mt-5 -mx-5 px-5 pt-3 pb-1 bg-cream z-10">
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search food, meals or ingredients…"
              className="w-full rounded-2xl bg-cream-soft pl-10 pr-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="grid grid-cols-4 gap-2 mb-5">
            <button
              onClick={() => setVoiceOpen(true)}
              className="tap flex flex-col items-center gap-1.5 rounded-2xl py-3 bg-teal/10 text-teal-dark"
            >
              <Mic size={17} />
              <span className="text-[11px] font-semibold">AI Voice</span>
            </button>
            <button
              onClick={() => runScan("scan")}
              className="tap flex flex-col items-center gap-1.5 rounded-2xl py-3 bg-sky-pale text-sky"
            >
              <Sparkles size={17} />
              <span className="text-[11px] font-semibold">AI Scan</span>
            </button>
            <button
              onClick={() => runScan("barcode")}
              className="tap flex flex-col items-center gap-1.5 rounded-2xl py-3 bg-berry-pale text-berry"
            >
              <ScanLine size={17} />
              <span className="text-[11px] font-semibold">Barcode</span>
            </button>
            <button
              onClick={() => setCustomMode(true)}
              className="tap flex flex-col items-center gap-1.5 rounded-2xl py-3 bg-gold-pale text-gold"
            >
              <UtensilsCrossed size={17} />
              <span className="text-[11px] font-semibold">Custom</span>
            </button>
          </div>

          {!query && recent.length > 0 && (
            <div className="mb-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                <Clock size={12} /> Recent
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {recent.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFood(f)}
                    className="tap shrink-0 flex items-center gap-2 bg-cream-soft rounded-2xl pl-2 pr-3.5 py-2"
                  >
                    <span className="w-7 h-7 rounded-lg bg-cream-card flex items-center justify-center shrink-0">
                      <FoodIcon category={f.category} size={13} className="text-primary-dark" />
                    </span>
                    <span className="text-xs font-semibold text-charcoal whitespace-nowrap">{f.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {matchingMeals.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                Custom meals
              </p>
              <div className="space-y-1.5">
                {matchingMeals.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => logMeal(m.id)}
                    disabled={justAdded}
                    className="tap w-full flex items-center justify-between rounded-2xl px-3.5 py-3 bg-primary-pale/60 hover:bg-primary-pale text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{m.title}</p>
                      <p className="text-[11px] text-charcoal-faint">{m.items.length} items logged together</p>
                    </div>
                    <span className="text-xs font-semibold text-primary">
                      {justAdded ? "Added" : "Log all"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button className="tap transition-colors" style={sheetChipStyle(category === null)} onClick={() => setCategory(null)}>
              All
            </button>
            {addFoodFilterCategories.map((c) => (
              <button
                key={c.id}
                className="tap transition-colors"
                style={sheetChipStyle(category === c.id)}
                onClick={() => setCategory(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
          </div>

          <div className="space-y-1.5 pt-4 min-h-[200px]">
            {filtered.map((f) => (
              <button
                key={`${f.source}-${f.id}`}
                onClick={() => setSelectedFood(f)}
                className="tap w-full flex items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-cream-soft text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-primary-pale flex items-center justify-center shrink-0">
                    <FoodIcon category={f.category} size={16} className="text-primary-dark" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                      {f.name}
                      {f.isLebanese && <Star size={10} className="text-gold fill-gold" />}
                    </p>
                    <p className="text-[11px] text-charcoal-faint">{f.servingLabel}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-charcoal-soft">{f.calories} kcal</span>
              </button>
            ))}
            {loading && filtered.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-8">Searching…</p>
            )}
            {!loading && filtered.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-8">
                {query
                  ? "Not in our catalog yet — try Custom or Barcode to add it."
                  : "No foods match your search."}
              </p>
            )}
          </div>
        </div>
      </BottomSheet>

      <AIVoiceLogger open={voiceOpen} onClose={() => { setVoiceOpen(false); resetAndClose(); }} />
    </>
  );
};
