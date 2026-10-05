import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { sheetChipStyle, sheetGreyStyle, sheetLabelStyle } from "../ui/sheetChip";
import { Button } from "../ui/Button";
import { Search, Mic, ScanBarcode, Camera, Plus, Carrot, Apple, Clock, Star, Check, UtensilsCrossed, SlidersHorizontal } from "lucide-react";
import { logoTone } from "./logoTones";
import { SheetField } from "./SheetField";
import { CustomFoodForm } from "./CustomFoodForm";
import { addFoodFilterCategories } from "../../data/mockFoods";
import type { Food, MealType, ServingUnit } from "../../types";
import { servingMultiplier, targetsFromGoal } from "../../services/nutrition";
import { NutrientDetailSections } from "./NutrientSections";
import {
  searchFoods,
  getFoodsByIds,
  createFoodByBarcode,
  logFoodEntry,
  type FoodSearchResult,
} from "../../services/food";
import { getFoodNutrientsById } from "../../services/food-nutrients";
import { useApp } from "../../context/AppContext";
import { AIVoiceLogger } from "./AIVoiceLogger";
import { foodCategoryIcon } from "../../utils/icons";
import { foodSuggestions, historyIds, lastUsed, type FoodSuggestion } from "../../services/food/suggestions";
import { todayLocal } from "../../utils/date";
import { Toast } from "../ui/Toast";
import { PopupMenu } from "../ui/PopupMenu";
import { BarcodeScanner } from "./BarcodeScanner";
import { OffProductCard } from "./OffProductCard";
import { offAsFood, resolveBarcode, type OffProduct } from "../../services/barcode/lookup";
import { mealForCurrentTime } from "../../utils/mealForTime";

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
  snack: "Snacks",
  lunch: "Lunch",
  dinner: "Dinner",
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
  /**
   * FO7: the meal the sheet was opened FOR — its suggestions are that meal's
   * frequent foods. Null from the general entry points (the Food diary's
   * floating + and Home's Log Food), which suggest across every meal. The
   * food is still logged to `defaultMeal` either way.
   */
  suggestMeal?: MealType | null;
}> = ({ open, onClose, defaultMeal = "lunch", suggestMeal = null }) => {
  const {
    addFoodEntryRecord,
    authUserId,
    foodLog,
    customFoods,
    customMeals,
    logCustomMeal,
    selectedDate,
    nutritionGoal,
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
  // Whether the barcode-entry view is open. A boolean now that there is only
  // one thing it can be.
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [scanResultFood, setScanResultFood] = useState<FoodSearchResult | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  // --- real catalog -------------------------------------------------------
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionFoods, setSuggestionFoods] = useState<Map<string, FoodSearchResult>>(new Map());
  const [scanNotice, setScanNotice] = useState(false);
  // FO9 multi-select: each picked food with the quantity it will log at.
  // Kept across searches; empty means multi-select is off.
  const [picked, setPicked] = useState<Map<string, { food: FoodSearchResult; quantity: number; unit: ServingUnit }>>(new Map());
  // The add step opened from multi-select: Confirm returns to the list.
  const [adjusting, setAdjusting] = useState(false);
  const [mealAnchor, setMealAnchor] = useState<HTMLElement | null>(null);
  const [addedMessage, setAddedMessage] = useState<string | null>(null);
  const [multiError, setMultiError] = useState<string | null>(null);
  const [multiSaving, setMultiSaving] = useState(false);

  // --- barcode ------------------------------------------------------------
  const [barcode, setBarcode] = useState("");
  const [barcodeState, setBarcodeState] = useState<"idle" | "looking" | "miss">("idle");
  const [barcodeDraft, setBarcodeDraft] = useState(emptyBarcodeDraft);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  // HO2.1: the camera scanner over this sheet, and an Open Food Facts product
  // waiting for the user to confirm it. The attribution travels with the one
  // food it belongs to, onto the user's own diary row.
  const [scanOpen, setScanOpen] = useState(false);
  const [offProduct, setOffProduct] = useState<OffProduct | null>(null);
  const [offAttribution, setOffAttribution] = useState<{ foodId: string; attribution: OffProduct["attribution"] } | null>(null);

  // --- logging ------------------------------------------------------------
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  // Search runs against Supabase, so it is debounced: a query per keystroke
  // would be a request per keystroke. FO7: nothing is fetched until the user
  // types — the empty box shows their own suggestions, not the database.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const term = query.trim();
    if (!term) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      void searchFoods(term).then((rows) => {
        if (cancelled) return;
        setResults(rows);
        setLoading(false);
      });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, open]);

  // FO7 suggestions: the user's frequent and recent foods for the meal the
  // sheet was opened for (services/food/suggestions). Each is re-read from the
  // catalog rather than rebuilt from the diary: an entry snapshots totals, and
  // logging the same food again needs the per-serving values only the
  // catalog holds.
  const suggestions = useMemo(
    () => (open ? foodSuggestions(foodLog, suggestMeal, todayLocal()) : []),
    [foodLog, suggestMeal, open]
  );
  const ownFoodIds = useMemo(() => historyIds(foodLog), [foodLog]);
  useEffect(() => {
    if (!open || suggestions.length === 0) return;
    let cancelled = false;
    void getFoodsByIds(suggestions.map((x) => x.id)).then((rows) => {
      if (!cancelled) setSuggestionFoods(new Map(rows.map((f) => [f.id, f])));
    });
    return () => {
      cancelled = true;
    };
  }, [suggestions, open]);

  /** Opens the add step for a suggestion, prefilled with its last-used quantity. */
  const pickSuggestion = (sg: FoodSuggestion) => {
    const food = suggestionFoods.get(sg.id);
    if (!food) return;
    setSelectedFood(food);
    setQuantity(sg.quantity);
    setUnit(sg.unit);
  };

  // --- FO9 multi-select ---------------------------------------------------
  const multi = picked.size > 0;
  /** A food's quantity when picked: its last-used one (FO7), from the whole log, else one serving. */
  const defaultsFor = (id: string): { quantity: number; unit: ServingUnit } => {
    const sg = suggestions.find((x) => x.id === id);
    if (sg) return { quantity: sg.quantity, unit: sg.unit };
    const last = lastUsed(foodLog, id, suggestMeal, todayLocal());
    return last ? { quantity: last.quantity, unit: last.unit as ServingUnit } : { quantity: 1, unit: "serving" };
  };
  const togglePick = (food: FoodSearchResult) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(food.id)) next.delete(food.id);
      else next.set(food.id, { food, ...defaultsFor(food.id) });
      return next;
    });
  /** While multi-select is on, a name opens the quantity step for that pick. */
  const openAdjust = (food: FoodSearchResult) => {
    const cur = picked.get(food.id) ?? { food, ...defaultsFor(food.id) };
    setSelectedFood(food);
    setQuantity(cur.quantity);
    setUnit(cur.unit);
    setAdjusting(true);
  };
  const confirmAdjust = () => {
    if (!selectedFood) return;
    const food = selectedFood;
    setPicked((prev) => new Map(prev).set(food.id, { food, quantity, unit }));
    setSelectedFood(null);
    setAdjusting(false);
    setQuantity(1);
    setUnit("serving");
  };

  /** Logs every pick to one meal, then closes with "Added n foods to Meal." */
  const logPicked = async (target: MealType) => {
    if (!authUserId || multiSaving) return;
    setMultiSaving(true);
    setMultiError(null);
    const failed = new Map(picked);
    for (const [id, p] of picked) {
      const result = await logFoodEntry({
        userId: authUserId,
        food: p.food,
        quantity: p.quantity,
        unit: p.unit,
        meal: target,
        date: selectedDate,
        loggedVia: p.food.barcode ? "barcode" : "search",
      });
      if (result.ok && result.entry) {
        addFoodEntryRecord(result.entry);
        failed.delete(id);
      }
    }
    setMultiSaving(false);
    const added = picked.size - failed.size;
    if (failed.size > 0) {
      // What didn't save stays selected, so trying again logs only those.
      setPicked(failed);
      setMultiError(`${failed.size} of ${picked.size} couldn't be saved. Try again.`);
      return;
    }
    setAddedMessage(`Added ${added} food${added === 1 ? "" : "s"} to ${detailMealLabels[target]}.`);
    resetAndClose();
  };

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
        .filter((f) => query.trim() !== "" && f.name.toLowerCase().includes(query.trim().toLowerCase()))
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
          logoTone: f.logoTone ?? null,
          nutrients: f.nutrients ?? null,
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
  // FO7: foods from the user's own history rank above other matches.
  const filtered = useMemo(() => {
    const all = [...localCustom, ...results];
    const shown = category ? all.filter((f) => f.category === category) : all;
    return [...shown.filter((f) => ownFoodIds.has(f.id)), ...shown.filter((f) => !ownFoodIds.has(f.id))];
  }, [localCustom, results, category, ownFoodIds]);

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
    setPicked(new Map());
    setAdjusting(false);
    setMealAnchor(null);
    setMultiError(null);
    setQuantity(1);
    setQuantityDraft("1");
    setUnit("serving");
    setAdvancedOpen(false);
    setRawNutrients(null);
    setNutrientsLoading(false);
    setBarcodeOpen(false);
    setScanResultFood(null);
    setJustAdded(false);
    setCustomMode(false);
    // Nothing to reset for the custom-food form: it unmounts with the sheet
    // and its state goes with it.
    setBarcode("");
    setScanOpen(false);
    setOffProduct(null);
    setOffAttribution(null);
    setBarcodeState("idle");
    setBarcodeDraft(emptyBarcodeDraft);
    setBarcodeError(null);
    setSaving(false);
    setAddError(null);
    onClose();
  }, [onClose]);


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
      external:
        offAttribution?.foodId === selectedFood.id
          ? {
              source: offAttribution.attribution.source,
              ref: offAttribution.attribution.ref,
              fetchedAt: offAttribution.attribution.fetchedAt,
            }
          : undefined,
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

  const openBarcode = () => {
    setBarcodeOpen(true);
    setScanResultFood(null);
    setOffProduct(null);
    setBarcodeError(null);
    setBarcodeState("idle");
    setScanOpen(true);
  };

  // HO2.1 lookup order for a scanned or typed code (services/barcode/lookup):
  // our catalogue, then Open Food Facts (confirmed by the user, never written
  // to the shared catalogue), then the manual form. Creating a shared catalog
  // row stays a separate, explicit step — see handleCreateBarcodeFood.
  const handleScannedCode = async (gtin: string) => {
    setScanOpen(false);
    setBarcode(gtin);
    setBarcodeError(null);
    setScanResultFood(null);
    setOffProduct(null);
    setBarcodeState("looking");
    const result = await resolveBarcode(gtin);
    if (result.kind === "catalog") {
      setScanResultFood(result.food);
      setBarcodeState("idle");
    } else if (result.kind === "off") {
      setOffProduct(result.product);
      setBarcodeState("idle");
    } else if (result.kind === "miss") {
      setBarcodeDraft(emptyBarcodeDraft);
      setBarcodeState("miss");
    } else {
      setBarcodeError(result.kind === "error" ? result.message : "That isn't a valid barcode.");
      setBarcodeState("idle");
    }
  };

  const chooseOffProduct = (product: OffProduct) => {
    const food = offAsFood(product);
    setOffAttribution({ foodId: food.id, attribution: product.attribution });
    setSelectedFood(food);
    setBarcodeOpen(false);
    setOffProduct(null);
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
    // Mobile handoff item 4: calories and macros always come from the food
    // itself (the figures the diary logs, so this step agrees with the macro
    // strip); every other nutrient only from its fetched profile, so a food
    // without one reads as missing rather than zero.
    const detailTotals: Record<string, number> = {
      ...(scaledNutrients ?? {}),
      calories: selectedFood.calories * multiplier,
      protein: selectedFood.protein * multiplier,
      total_fat: selectedFood.fat * multiplier,
      total_carbohydrates: selectedFood.carbs * multiplier,
    };
    const targets = targetsFromGoal(nutritionGoal);
    const multiplierDisplay = Math.round(multiplier * 100) / 100;

    return (
      <BottomSheet
        light
        open={open}
        onClose={resetAndClose}
        title={advancedOpen ? "Nutrient details" : "Add Food"}
        onBack={
          advancedOpen
            ? () => setAdvancedOpen(false)
            : () => {
                // A suggestion prefilled its last quantity; the next pick starts fresh.
                setSelectedFood(null);
                setAdjusting(false);
                setQuantity(1);
                setUnit("serving");
              }
        }
      >
        {advancedOpen ? (
          <div className="animate-fade-slide-up flex flex-col gap-2.5">
            <p style={{ fontSize: 13, color: "#5B5349", margin: "0 2px 2px" }}>
              {selectedFood.name} ·{" "}
              {multiplierDisplay === 1 ? selectedFood.servingLabel : `${multiplierDisplay} × ${selectedFood.servingLabel}`}
            </p>

            {selectedFood.source === "catalog" && nutrientsLoading ? (
              <p className="text-center text-sm text-charcoal-faint py-8">Loading nutrients…</p>
            ) : (
              <NutrientDetailSections
                totals={detailTotals}
                calorieTarget={targets.calories}
                proteinTarget={targets.protein}
                carbTarget={targets.carbs}
                fatTarget={targets.fat}
              />
            )}

            <p style={{ fontSize: 10.5, lineHeight: 1.5, color: "#8C8378", margin: "6px 2px 0" }}>
              % of the FDA Daily Value for adults, from this food alone. Calorie and macro percentages use your
              Goals.
            </p>
          </div>
        ) : (
          // Mobile handoff item 2: the detail step in the sheet control
          // vocabulary. Spacing is the markup's own per-block margins
          // (addFoodBody): header 16, controls 10, macro strip 16.
          <div className="animate-fade-slide-up">
            <div className="flex items-center" style={{ gap: 13, marginBottom: 16 }}>
              <span
                className="flex items-center justify-center shrink-0"
                style={{ width: 46, height: 46, borderRadius: 14, background: "#EEEBFB", color: "#6B4BE0" }}
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
                  {adjusting
                    ? `${unit === "serving" ? (quantity === 1 ? selectedFood.servingLabel : `${quantity} × ${selectedFood.servingLabel}`) : `${quantity} ${unit}`} · selected`
                    : `${selectedFood.servingLabel}${selectedFood.isVerified ? " · USDA verified" : " · estimate"}`}
                </p>
              </div>
            </div>

            <div
              className="flex items-center"
              style={{ ...sheetGreyStyle, gap: 12, marginBottom: 10 }}
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

            <div style={{ ...sheetGreyStyle, marginBottom: 10 }}>
              <p style={sheetLabelStyle}>Unit</p>
              <div
                className="flex scroll-row no-scrollbar"
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

            {!adjusting && (
            <div style={{ ...sheetGreyStyle, marginBottom: 10 }}>
              <p style={sheetLabelStyle}>Meal</p>
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
            )}

            <div className="grid grid-cols-4" style={{ ...sheetGreyStyle, padding: "13px 0", marginBottom: 16 }}>
              {[
                { value: `${foodTotalCal}`, color: "#241F1B", caption: "kcal" },
                { value: `${Math.round(selectedFood.protein * multiplier)}g`, color: "#7D6BB5", caption: "protein" },
                { value: `${Math.round(selectedFood.carbs * multiplier)}g`, color: "#8175C2", caption: "carbs" },
                { value: `${Math.round(selectedFood.fat * multiplier)}g`, color: "#4274D7", caption: "fat" },
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
              <p className="text-xs font-semibold text-status-high text-center" style={{ marginBottom: 10 }}>
                {addError}
              </p>
            )}

            {adjusting ? (
              <button
                type="button"
                onClick={confirmAdjust}
                className="tap w-full inline-flex items-center justify-center gap-2"
                style={{ height: 52, borderRadius: 14, border: "none", background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: 15.5, fontWeight: 700 }}
              >
                <Check size={16} /> Confirm
              </button>
            ) : (
            <div className="flex" style={{ gap: 10 }}>
              <button
                type="button"
                onClick={handleAdd}
                disabled={justAdded || saving}
                className="tap inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:pointer-events-none"
                style={{ flex: 1, height: 52, borderRadius: 14, border: "none", background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: 15.5, fontWeight: 700 }}
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
            )}
          </div>
        )}
      </BottomSheet>
    );
  }

  // Custom food creation — master handover, CentiumFrame "Create Custom Food"
  // (lavender sheet): grey field containers, a scrolling logo row whose
  // selected tile steps through LOGO_TONES, the macro grid, a barcode box,
  // and a save / advanced-nutrients row.
  if (customMode) {
    return (
      <CustomFoodForm
        open={open}
        onClose={resetAndClose}
        title="Create Custom Food"
        onBack={() => setCustomMode(false)}
        onSaved={(food) => {
          setCustomMode(false);
          setSelectedFood(food);
        }}
      />
    );
  }

  // Scan / barcode view
  if (barcodeOpen) {
    const barcodeField = (
      label: string,
      key: keyof typeof barcodeDraft,
      placeholder: string,
      numeric = false
    ) => (
      // CentiumFrame barcodeMiss: the same field() as Create Custom Food.
      <SheetField
        label={label}
        value={barcodeDraft[key]}
        onChange={(v) => setBarcodeDraft((d) => ({ ...d, [key]: v }))}
        placeholder={placeholder}
        numeric={numeric}
      />
    );

    const scanAgain = () => {
      setBarcodeError(null);
      setScanResultFood(null);
      setOffProduct(null);
      setBarcodeState("idle");
      setScanOpen(true);
    };
    const enterManually = () => {
      setOffProduct(null);
      setBarcodeError(null);
      setBarcodeDraft(emptyBarcodeDraft);
      setBarcodeState("miss");
    };

    return (
      <>
      <BottomSheet
        light
        open={open && !scanOpen}
        onClose={resetAndClose}
        title="Barcode"
        // Master handover (CentiumFrame sheetCanBack): this step has somewhere
        // to return to — the food list.
        onBack={() => {
          setBarcodeOpen(false);
          setScanResultFood(null);
          setOffProduct(null);
          setBarcodeState("idle");
        }}
      >
        <div className="flex flex-col animate-fade-slide-up" style={{ gap: 14 }}>
          {barcode && (
            <div className="flex items-center justify-between" style={{ background: "#F4F4F6", borderRadius: 12, padding: "11px 14px" }}>
              <span style={{ fontSize: 13, color: "#575863" }}>Barcode</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#241F1B", fontVariantNumeric: "tabular-nums" }}>{barcode}</span>
            </div>
          )}

          {barcodeState === "looking" && (
            <p className="text-center text-sm text-charcoal-faint py-6">Looking it up…</p>
          )}

          {/* 1. In our catalogue. */}
          {scanResultFood && (
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
                  setBarcodeOpen(false);
                }}
              >
                Use this result
              </Button>
            </div>
          )}

          {/* 2. Found on Open Food Facts: confirmed before anything is logged. */}
          {offProduct && (
            <OffProductCard product={offProduct} onConfirm={() => chooseOffProduct(offProduct)} onManual={enterManually} />
          )}

          {/* 3. Nowhere: the user reads the pack. */}
          {barcodeState === "miss" && (
            <div className="space-y-3 animate-fade-slide-up">
              <p className="text-[11px] text-charcoal-faint">
                Not in the catalog yet. Add it from the package label and everyone scanning this barcode will
                find it.
              </p>
              {barcodeField("Product name", "name", "Coca-Cola 330ml")}
              {barcodeField("Serving size", "serving", "1 can (330 ml)")}
              <div className="grid grid-cols-2 gap-3">
                {barcodeField("Calories", "calories", "0", true)}
                {barcodeField("Protein (g)", "protein", "0", true)}
                {barcodeField("Carbs (g)", "carbs", "0", true)}
                {barcodeField("Fat (g)", "fat", "0", true)}
              </div>
              {barcodeError && <p className="text-xs font-semibold text-status-high text-center">{barcodeError}</p>}
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
            <p className="text-xs font-semibold text-status-high">{barcodeError}</p>
          )}

          {barcodeState !== "looking" && (
            <div className="flex" style={{ gap: 10 }}>
              <button
                onClick={scanAgain}
                className="tap flex-1"
                style={{ height: 44, borderRadius: 14, background: "#FFFFFF", border: "1px solid #E4E4E9", color: "#241F1B", fontSize: 13.5, fontWeight: 600 }}
              >
                Scan again
              </button>
              {barcodeError && barcodeState !== "miss" && (
                <button
                  onClick={enterManually}
                  className="tap flex-1"
                  style={{ height: 44, borderRadius: 14, background: "#FFFFFF", border: "1px solid #E4E4E9", color: "#241F1B", fontSize: 13.5, fontWeight: 600 }}
                >
                  Enter it myself
                </button>
              )}
            </div>
          )}
        </div>
      </BottomSheet>
      <BarcodeScanner
        open={open && scanOpen}
        onClose={() => {
          setScanOpen(false);
          // Closed before anything was scanned: back to the food list.
          if (!barcode) setBarcodeOpen(false);
        }}
        onCode={(gtin) => void handleScannedCode(gtin)}
      />
      </>
    );
  }

  /**
   * One food row (FO7 suggestions and search results). FO9: the icon selects
   * the food and starts multi-select, turning every icon into a circle
   * (filled lavender with a check when picked); the rest of the row opens the
   * single-food step, or, while multi-select is on, that pick's quantity.
   */
  const renderRow = (r: {
    key: string;
    food: FoodSearchResult | undefined;
    name: string;
    sub: string;
    kcal: number;
    star?: boolean;
    open: () => void;
  }) => {
    const on = !!r.food && picked.has(r.food.id);
    // A custom food keeps the logo colour it was saved with, so it can be
    // told apart in the list at a glance.
    const tone = r.food?.source === "custom" ? logoTone(r.food.logoTone) : null;
    return (
      <div
        key={r.key}
        className="flex items-center shrink-0"
        style={{ margin: "0 -11px", padding: "10px 13px", gap: 12, borderRadius: 14, background: on ? "#F7F5FB" : undefined }}
      >
        <button
          onClick={() => r.food && togglePick(r.food)}
          disabled={!r.food}
          aria-pressed={on}
          aria-label={on ? `Deselect ${r.name}` : `Select ${r.name}`}
          className="tap flex items-center justify-center shrink-0"
          style={
            multi
              ? { width: 34, height: 34, borderRadius: 17, background: on ? "rgb(var(--c-primary-fill))" : "#FFFFFF", border: on ? "none" : "1.5px solid #D1CAEB", color: on ? "rgb(var(--c-on-primary-fill))" : "#FFFFFF" }
              : { width: 36, height: 36, borderRadius: 12, background: tone ? tone.bg : "#F0EDF9", color: tone ? tone.fg : "#7D6BB5" }
          }
        >
          {multi ? on && <Check size={17} strokeWidth={2.6} /> : <FoodIcon category={r.food?.category ?? "homemade"} size={16} />}
        </button>
        <button onClick={r.open} disabled={!r.food} className="tap flex-1 min-w-0 flex items-center justify-between text-left" style={{ gap: 10 }}>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 truncate" style={{ fontSize: 14, fontWeight: 600, color: "#241F1B" }}>
              {r.name}
              {r.star && <Star size={10} className="text-gold fill-gold shrink-0" />}
            </span>
            <span className="block truncate" style={{ fontSize: 11, color: "#8C8378" }}>
              {r.sub}
            </span>
          </span>
          <span className="shrink-0" style={{ fontSize: 12, fontWeight: 600, color: "#5B5349" }}>
            {r.kcal} kcal
          </span>
        </button>
      </div>
    );
  };

  // Browse view
  return (
    <>
      <BottomSheet
        light
        open={open}
        onClose={resetAndClose}
        title="Add Food"
        footerRule
        footer={
          multi ? (
            <div>
              <p style={{ margin: "0 0 8px", fontSize: 11, color: "#8C8378" }}>{picked.size} selected</p>
              {multiError && (
                <p className="text-xs font-semibold text-status-high" style={{ margin: "0 0 8px" }}>
                  {multiError}
                </p>
              )}
              <div className="flex items-center" style={{ gap: 12 }}>
                <button
                  onClick={(e) => (suggestMeal ? void logPicked(meal) : setMealAnchor(e.currentTarget))}
                  disabled={multiSaving}
                  className="tap flex-1 inline-flex items-center justify-center disabled:opacity-60"
                  style={{ height: 50, gap: 8, borderRadius: 16, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: 15, fontWeight: 700 }}
                >
                  <Plus size={16} /> {multiSaving ? "Adding…" : `Add food (${picked.size})`}
                </button>
                <button
                  onClick={() => {
                    setPicked(new Map());
                    setMultiError(null);
                  }}
                  className="tap"
                  style={{ padding: "0 10px", height: 44, color: "#8C8378", fontSize: 14, fontWeight: 500 }}
                >
                  Cancel
                </button>
              </div>
              <PopupMenu
                open={!!mealAnchor}
                anchor={mealAnchor}
                onClose={() => setMealAnchor(null)}
                heading="Add to"
                options={detailMealOrder.map((m) => ({ value: m, label: detailMealLabels[m] }))}
                selected={mealForCurrentTime()}
                onSelect={(m) => {
                  setMealAnchor(null);
                  void logPicked(m);
                }}
                align="left"
              />
            </div>
          ) : undefined
        }
      >
        <div className="animate-fade-slide-up">
          {/* V10 (QA 10.0): "Only the circled part in the attached picture
              should scroll the rest is locked in add food" — search, the
              AI/scan/custom buttons, recent, custom meals and the category
              chips sit in a static block; only the results list below
              scrolls, in its own region (master handover, CentiumFrame
              lavSheet browse view). The block bleeds to the panel's edges,
              so it carries the panel's top radius itself. */}
          <div className="bg-white" style={{ margin: "-20px -20px 0", padding: "12px 20px 4px", borderRadius: "22px 22px 0 0" }}>
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search food, meals or ingredients…"
              className="w-full rounded-2xl bg-cream-soft pl-10 pr-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* FOUR entry points, HO2.1's row (FO7 builds it): AI Voice, AI
              Scan, Barcode, Custom, each a gradient with a white glyph and
              label. AI Scan has no vision model behind it: tapping it says so
              rather than inventing a result. */}
          <div className="grid grid-cols-4 mb-4" style={{ gap: 9 }}>
            {[
              { label: "AI Voice", icon: <Mic size={17} />, bg: "linear-gradient(150deg,#A2C8C2,#6F9993)", onClick: () => setVoiceOpen(true) },
              {
                label: "AI Scan",
                icon: (
                  <span className="relative inline-flex">
                    <Camera size={17} />
                    <Plus size={9} strokeWidth={3} className="absolute" style={{ top: -5, right: -6 }} />
                  </span>
                ),
                bg: "linear-gradient(150deg,#8FB5AF,#4F7F78)",
                onClick: () => setScanNotice(true),
              },
              { label: "Barcode", icon: <ScanBarcode size={17} />, bg: "linear-gradient(150deg,#C0B4E8,#8F7FC9)", onClick: openBarcode },
              {
                label: "Custom",
                icon: (
                  <span className="inline-flex" style={{ gap: 1 }}>
                    <Carrot size={15} />
                    <Apple size={15} />
                  </span>
                ),
                bg: "linear-gradient(150deg,#9184CE,#5F5093)",
                onClick: () => setCustomMode(true),
              },
            ].map(({ label, icon, bg, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="tap flex flex-col items-center justify-center gap-1.5"
                style={{ height: 64, borderRadius: 14, background: bg, color: "#FFFFFF" }}
              >
                {icon}
                <span className="text-[11px] font-semibold">{label}</span>
              </button>
            ))}
          </div>

          {matchingMeals.length > 0 && (
            <div className="mb-4">
              <p className="section-label mb-2">
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

          {/* FO7: the filter chips only while searching, as filters on the results. */}
          {query.trim() && (
          <div className="flex gap-2 scroll-row no-scrollbar pb-1">
            {[{ id: null as string | null, label: "All" }, ...addFoodFilterCategories].map((c) => {
              const active = category === c.id;
              return (
                <button
                  key={c.label}
                  className="tap transition-colors"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                    borderRadius: 8,
                    padding: "7px 13px",
                    fontSize: 12,
                    border: `1px solid ${active ? "#A299DE" : "#E7E7EC"}`,
                    background: active ? "#A299DE" : "#FFFFFF",
                    color: active ? "#FFFFFF" : "#241F1B",
                    fontWeight: active ? 700 : 600,
                    flex: "none",
                  }}
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          )}
          </div>

          {/* The list's own scroll region, starting under the filter chips,
              so rows never travel up behind the pinned block or the band. */}
          <div className="flex flex-col no-scrollbar" style={{ gap: 6, maxHeight: 424, overflowY: "auto", margin: "0 -20px", padding: "12px 20px 0" }}>
            {!query.trim() &&
              (suggestions.length === 0 ? (
                <p className="text-center text-sm text-charcoal-faint py-8">Start typing to search foods</p>
              ) : (
                <>
                  <p className="section-label flex items-center gap-1.5">
                    <Clock size={12} />
                    {suggestMeal ? `Frequent at ${detailMealLabels[suggestMeal]}` : "Frequent & recent"}
                  </p>
                  {suggestions.map((sg) => {
                    const food = suggestionFoods.get(sg.id);
                    return renderRow({
                      key: sg.id,
                      food,
                      name: sg.name,
                      sub: sg.amount,
                      kcal: sg.kcal,
                      open: () => (food ? (multi ? openAdjust(food) : pickSuggestion(sg)) : undefined),
                    });
                  })}
                </>
              ))}
            {query.trim() !== "" &&
              filtered.map((f) =>
                renderRow({
                  key: `${f.source}-${f.id}`,
                  food: f,
                  name: f.name,
                  sub: f.servingLabel,
                  kcal: f.calories,
                  star: f.isLebanese,
                  open: () => (multi ? openAdjust(f) : setSelectedFood(f)),
                })
              )}
            {query.trim() !== "" && loading && filtered.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-8">Searching…</p>
            )}
            {query.trim() !== "" && !loading && filtered.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-8">
                Not in our catalog yet. Try Custom or Barcode to add it.
              </p>
            )}
          </div>
        </div>
      </BottomSheet>
      <Toast
        open={scanNotice}
        message="AI Scan isn't available yet."
        icon={<Camera size={15} className="flex-none" style={{ color: "#A2C8C2" }} />}
        onExpire={() => setScanNotice(false)}
      />
      <Toast open={!!addedMessage} message={addedMessage ?? ""} onExpire={() => setAddedMessage(null)} />

      <AIVoiceLogger open={voiceOpen} onClose={() => { setVoiceOpen(false); resetAndClose(); }} />
    </>
  );
};
