import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { sheetChipStyle } from "../ui/sheetChip";
import { Button } from "../ui/Button";
import { Search, Mic, ScanLine, Clock, Star, Check, UtensilsCrossed, SlidersHorizontal, ChevronDown } from "lucide-react";
import { LOGO_TONES, logoTone } from "./logoTones";
import { NUTRIENT_SECTIONS } from "../../data/nutrientSchema";
import { foodCategories, addFoodFilterCategories } from "../../data/mockFoods";
import type { Food, MealType, ServingUnit } from "../../types";
import { servingMultiplier, targetsFromGoal } from "../../services/nutrition";
import { NutrientDetailSections } from "./NutrientSections";
import {
  searchFoods,
  listFoods,
  getFoodsByIds,
  lookupByBarcode,
  createFoodByBarcode,
  createCustomFood,
  logFoodEntry,
  type FoodSearchResult,
} from "../../services/food";
import { getFoodNutrientsById } from "../../services/food-nutrients";
import { useApp } from "../../context/AppContext";
import { AIVoiceLogger } from "./AIVoiceLogger";
import { foodCategoryIcon } from "../../utils/icons";

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

// Grey sheet container and its sentence-case label (CentiumFrame addFoodBody
// `grey` / `lbl`, and the same values as field() below).
const sheetGreyStyle: React.CSSProperties = { background: "#F2F3F5", borderRadius: 14, padding: "12px 14px" };
const sheetLabelStyle: React.CSSProperties = { margin: 0, fontSize: 13, fontWeight: 500, color: "#575863" };

// CentiumFrame field(): a grey labelled container with a white borderless
// input. Shared by Create Custom Food and the barcode no-match form.
const SheetField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  numeric?: boolean;
}> = ({ label, value, onChange, placeholder, numeric = false }) => (
  <label className="block" style={{ ...sheetGreyStyle, boxSizing: "border-box" }}>
    <span className="block" style={{ ...sheetLabelStyle, marginBottom: 8 }}>
      {label}
    </span>
    <input
      value={value}
      onChange={(e) => onChange(numeric ? e.target.value.replace(/[^\d.]/g, "") : e.target.value)}
      placeholder={placeholder}
      inputMode={numeric ? "decimal" : "text"}
      className="w-full placeholder:text-charcoal-faint focus:outline-none"
      style={{ borderRadius: 10, background: "#FFFFFF", border: "none", padding: "11px 13px", fontSize: 14, color: "#241F1B", boxSizing: "border-box" }}
    />
  </label>
);

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
  const [customDraft, setCustomDraft] = useState({
    name: "",
    serving: "1 serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    category: "homemade" as Food["category"],
  });
  // Create Custom Food extras (master handover frame): the selected logo's
  // colour (an index into LOGO_TONES, stepped by tapping it again), an
  // optional barcode, and the advanced per-serving nutrients.
  const [customLogoTone, setCustomLogoTone] = useState(0);
  const [customBarcode, setCustomBarcode] = useState("");
  const [customAdvOpen, setCustomAdvOpen] = useState(false);
  const [customAdvGroups, setCustomAdvGroups] = useState<Record<string, boolean>>({ popular: true });
  const [customNutrients, setCustomNutrients] = useState<Record<string, string>>({});
  const [customError, setCustomError] = useState<string | null>(null);

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
    setBarcodeOpen(false);
    setScanResultFood(null);
    setJustAdded(false);
    setCustomMode(false);
    setCustomDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "", category: "homemade" });
    setCustomLogoTone(0);
    setCustomBarcode("");
    setCustomAdvOpen(false);
    setCustomAdvGroups({ popular: true });
    setCustomNutrients({});
    setCustomError(null);
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
    setCustomError(null);

    const draft = {
      name: customDraft.name.trim(),
      category: customDraft.category,
      serving: customDraft.serving || "1 serving",
      calories: Number(customDraft.calories) || 0,
      protein: Number(customDraft.protein) || 0,
      carbs: Number(customDraft.carbs) || 0,
      fat: Number(customDraft.fat) || 0,
    };
    // "Leave anything you do not have blank": only typed fields are kept, so
    // a blank stays "no data" rather than becoming a zero.
    const nutrients = Object.fromEntries(
      Object.entries(customNutrients)
        .filter(([, v]) => v.trim() !== "" && Number.isFinite(Number(v)))
        .map(([k, v]) => [k, Number(v)])
    );
    const hasNutrients = Object.keys(nutrients).length > 0;

    // WITH A BARCODE the food goes to the shared catalog through the same
    // route a scanned product does, so "anyone scanning this pack" finds it.
    // The colour and advanced nutrients are the user's own, so they ride on
    // a personal correction of that row (overrides_food_id), which search
    // and barcode lookup already prefer for its owner.
    const code = customBarcode.trim();
    if (code) {
      const shared = await createFoodByBarcode({ barcode: code, servingLabel: draft.serving, ...draft });
      if (!shared.ok || !shared.food) {
        setSavingCustom(false);
        setCustomError(shared.message ?? "Couldn't add that barcode. Try again, or save without it.");
        return;
      }
      let chosen = shared.food;
      if (authUserId) {
        const mine = await createCustomFood(authUserId, {
          ...draft,
          logoTone: customLogoTone,
          nutrients: hasNutrients ? nutrients : null,
          overridesFoodId: shared.food.id,
        });
        if (mine.ok && mine.food) chosen = mine.food;
      }
      setSavingCustom(false);
      setCustomMode(false);
      setSelectedFood(chosen);
      return;
    }

    const food = await addCustomFood({
      ...draft,
      logoTone: customLogoTone,
      nutrients: hasNutrients ? nutrients : null,
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
      logoTone: food.logoTone ?? null,
      nutrients: food.nutrients ?? null,
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

  const openBarcode = () => {
    setBarcodeOpen(true);
    setScanResultFood(null);
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
        open={open}
        onClose={resetAndClose}
        title={advancedOpen ? "Nutrient details" : "Add Food"}
        onBack={advancedOpen ? () => setAdvancedOpen(false) : () => setSelectedFood(null)}
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
                  {selectedFood.servingLabel}
                  {selectedFood.isVerified ? " · USDA verified" : " · estimate"}
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

  // Custom food creation — master handover, CentiumFrame "Create Custom Food"
  // (lavender sheet): grey field containers, a scrolling logo row whose
  // selected tile steps through LOGO_TONES, the macro grid, a barcode box,
  // and a save / advanced-nutrients row.
  if (customMode) {
    const field = (
      label: string,
      key: keyof typeof customDraft,
      placeholder: string,
      numeric = false
    ) => (
      <SheetField
        label={label}
        value={customDraft[key]}
        onChange={(v) => setCustomDraft((d) => ({ ...d, [key]: v }))}
        placeholder={placeholder}
        numeric={numeric}
      />
    );

    const tone = LOGO_TONES[customLogoTone % LOGO_TONES.length];
    const canSave = !!customDraft.name.trim() && !!customDraft.calories && !savingCustom;

    // Advanced nutrients: the same sourced set the Nutrient Summary reads, so
    // the two stay in step. Popular's four macros are already the fields
    // above; calculated rows (net carbs, the omega ratio, total MCTs) are
    // derived from the others, so there is nothing to type for them.
    const DUPES = new Set(["calories", "protein", "total_fat", "total_carbohydrates"]);
    const advGroups = NUTRIENT_SECTIONS.map((sec) => ({
      id: sec.id,
      name: sec.name,
      rows: [...sec.rows, ...(sec.sub ? sec.sub.rows : [])].filter(
        (r) => r.kind !== "calc" && !(sec.id === "popular" && DUPES.has(r.key))
      ),
    }));

    return (
      <BottomSheet open={open} onClose={resetAndClose} title="Create Custom Food" onBack={() => setCustomMode(false)}>
        <div className="flex flex-col animate-fade-slide-up" style={{ gap: 16 }}>
          {field("Food name", "name", "Mom's Kibbeh")}
          {field("Serving size", "serving", "1 piece")}

          <div>
            <span className="block" style={{ fontSize: 12, fontWeight: 600, color: "#5B5349", marginBottom: 6 }}>
              Logo
            </span>
            <div className="flex no-scrollbar" style={{ flexWrap: "nowrap", gap: 8, overflowX: "auto", margin: "0 -20px", padding: "0 20px" }}>
              {foodCategories.map((c) => {
                const Icon = foodCategoryIcon[c.id] ?? UtensilsCrossed;
                const active = customDraft.category === c.id;
                return (
                  <button
                    key={c.id}
                    // Tapping the already-selected tile steps its colour on,
                    // so the saved food can be told apart at a glance.
                    onClick={() =>
                      active
                        ? setCustomLogoTone((t) => (t + 1) % LOGO_TONES.length)
                        : setCustomDraft((d) => ({ ...d, category: c.id }))
                    }
                    aria-label={c.label}
                    title={active ? "Tap again for another colour" : c.label}
                    className="tap flex items-center justify-center"
                    style={{
                      width: 44,
                      height: 44,
                      flex: "none",
                      borderRadius: 16,
                      border: `1px solid ${active ? tone.bg : "#E7E7EC"}`,
                      background: active ? tone.bg : "#FFFFFF",
                      color: active ? tone.fg : "#241F1B",
                      transition: "background-color .18s ease, border-color .18s ease",
                    }}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
            <p style={{ margin: "7px 2px 0", fontSize: 10, color: "#8C8378" }}>
              Tap the selected icon again to change its colour.
            </p>
          </div>

          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            {field("Calories", "calories", "0", true)}
            {field("Protein (g)", "protein", "0", true)}
            {field("Carbs (g)", "carbs", "0", true)}
            {field("Fat (g)", "fat", "0", true)}
          </div>

          {/* Barcode sits after the macros, just before the save / advanced row. */}
          <div style={{ border: "1px solid rgba(174,161,220,0.4)", borderRadius: 14, background: "rgba(174,161,220,0.07)", padding: 12 }}>
            <p
              style={{
                margin: "0 0 8px",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#5F5093",
              }}
            >
              Barcode
            </p>
            <div className="flex" style={{ gap: 8 }}>
              <input
                value={customBarcode}
                onChange={(e) => setCustomBarcode(e.target.value.replace(/[^\dA-Za-z]/g, ""))}
                placeholder="Enter number manually"
                inputMode="numeric"
                aria-label="Barcode"
                className="placeholder:text-charcoal-faint focus:outline-none"
                style={{
                  flex: 1,
                  minWidth: 0,
                  borderRadius: 10,
                  background: "#FFFFFF",
                  border: "1px solid rgba(36,31,27,0.1)",
                  padding: "10px 12px",
                  fontSize: 13,
                  color: "#241F1B",
                }}
              />
              <button
                onClick={() => {
                  setCustomMode(false);
                  openBarcode();
                }}
                aria-label="Look up barcode"
                className="tap flex items-center justify-center"
                style={{ flex: "none", width: 44, height: 40, borderRadius: 10, background: "#A092E0", border: "none" }}
              >
                <ScanLine size={17} style={{ color: "#FFFFFF" }} />
              </button>
            </div>
            <p style={{ margin: "7px 2px 0", fontSize: 10, color: "#8C8378" }}>
              Optional. Adding it lets anyone scanning this pack find your food.
            </p>
          </div>

          {customAdvOpen && (
            <div className="flex flex-col animate-fade-slide-up" style={{ gap: 8 }}>
              <p style={{ margin: 0, fontSize: 11, color: "#8C8378" }}>
                Per serving. Leave anything you do not have blank.
              </p>
              {advGroups.map((sec) => {
                const groupOpen = !!customAdvGroups[sec.id];
                const filled = sec.rows.filter((r) => (customNutrients[r.key] ?? "").trim() !== "").length;
                return (
                  <div
                    key={sec.id}
                    style={{ border: "1px solid rgba(174,161,220,0.34)", borderRadius: 12, overflow: "hidden", background: "#FFFFFF" }}
                  >
                    <button
                      onClick={() => setCustomAdvGroups((g) => ({ ...g, [sec.id]: !g[sec.id] }))}
                      className="tap w-full flex items-center text-left"
                      style={{
                        gap: 8,
                        padding: "10px 12px",
                        background: groupOpen ? "rgba(174,161,220,0.12)" : "#FFFFFF",
                        border: "none",
                      }}
                    >
                      <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 700, color: "#241F1B" }}>{sec.name}</span>
                      {filled > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: "#5F5093",
                            background: "rgba(174,161,220,0.22)",
                            borderRadius: 6,
                            padding: "2px 6px",
                          }}
                        >
                          {filled} set
                        </span>
                      )}
                      <span
                        className="flex"
                        style={{
                          color: "#8C8378",
                          transform: groupOpen ? "rotate(180deg)" : "none",
                          transition: "transform .18s ease",
                        }}
                      >
                        <ChevronDown size={14} />
                      </span>
                    </button>
                    {groupOpen && (
                      <div style={{ padding: "2px 12px 10px" }}>
                        {sec.rows.map((r, i) => (
                          <div
                            key={r.key}
                            className="flex items-center"
                            style={{ gap: 8, padding: "5px 0", borderTop: i === 0 ? "0" : "1px solid rgba(36,31,27,0.05)" }}
                          >
                            <span style={{ flex: 1, minWidth: 0, fontSize: 12, color: "#241F1B" }}>{r.name}</span>
                            <input
                              value={customNutrients[r.key] ?? ""}
                              onChange={(e) =>
                                setCustomNutrients((n) => ({ ...n, [r.key]: e.target.value.replace(/[^\d.]/g, "") }))
                              }
                              placeholder="0"
                              inputMode="decimal"
                              aria-label={`${r.name}${r.unit ? ` (${r.unit})` : ""}`}
                              className="focus:outline-none"
                              style={{
                                width: 62,
                                flex: "none",
                                borderRadius: 8,
                                background: "#F5F5F6",
                                border: "1px solid rgba(36,31,27,0.07)",
                                padding: "5px 8px",
                                fontSize: 12,
                                color: "#241F1B",
                                textAlign: "right",
                              }}
                            />
                            <span style={{ width: 34, flex: "none", fontSize: 10.5, color: "#8C8378" }}>{r.unit || ""}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {customError && (
            <p className="text-xs font-semibold text-status-high text-center" style={{ margin: 0 }}>
              {customError}
            </p>
          )}

          {/* Three-quarters save, one-quarter advanced toggle. */}
          <div className="flex" style={{ gap: 8 }}>
            <button
              onClick={saveCustomFood}
              disabled={!canSave}
              className="tap"
              style={{
                flex: 3,
                minWidth: 0,
                height: 52,
                borderRadius: 16,
                background: "#AEA1DC",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: 14,
                border: "none",
                opacity: canSave ? 1 : 0.4,
              }}
            >
              {savingCustom ? "Saving…" : "Save custom food"}
            </button>
            <button
              onClick={() => setCustomAdvOpen((v) => !v)}
              aria-pressed={customAdvOpen}
              title={customAdvOpen ? "Hide advanced nutrients" : "Advanced nutrients"}
              aria-label={customAdvOpen ? "Hide advanced nutrients" : "Advanced nutrients"}
              className="tap flex items-center justify-center"
              style={{
                flex: 1,
                minWidth: 0,
                height: 52,
                borderRadius: 16,
                border: `1px solid ${customAdvOpen ? "#A092E0" : "rgba(36,31,27,0.11)"}`,
                background: customAdvOpen ? "rgba(174,161,220,0.18)" : "#FFFFFF",
                color: customAdvOpen ? "#5F5093" : "#5B5349",
                transition: "background-color .18s ease, border-color .18s ease",
              }}
            >
              <SlidersHorizontal size={20} strokeWidth={1.9} />
            </button>
          </div>
          <p style={{ margin: 0, fontSize: 11, color: "#8C8378", textAlign: "center" }}>
            Saved foods, scanned barcodes and logged items all go to your Food Library, and show up in search
            alongside the database.
          </p>
        </div>
      </BottomSheet>
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

    return (
      <BottomSheet
        open={open}
        onClose={resetAndClose}
        title="Enter barcode"
        // Master handover (CentiumFrame sheetCanBack): this step has somewhere
        // to return to — the food list.
        onBack={() => {
          setBarcodeOpen(false);
          setScanResultFood(null);
          setBarcodeState("idle");
        }}
      >
        <div className="flex flex-col items-center text-center py-4">
          {/* THE VIEWFINDER IS GONE, and that is the point of this screen now.
              A 4:3 charcoal panel with a dashed frame and a pulsing scanner
              glyph is a camera as far as anyone looking at it is concerned,
              so the feature read as a broken scanner rather than as the
              keyed-in lookup it has always been. Camera scanning needs a
              scanning library, a camera permission and a video pipeline;
              until those exist the screen says so in one line instead of
              miming them. The lookup and creation paths below are real. */}
          {!scanResultFood && (
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
                  setBarcodeOpen(false);
                }}
              >
                Use this result
              </Button>
            </div>
          ) : (
            <p className="text-xs text-charcoal-faint max-w-xs">Camera scanning is coming soon.</p>
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

          {/* THREE entry points, on Centium's two brand hues at alternating
              depths — teal, lavender, deep purple — each a gradient with a
              white glyph and label.

              AI SCAN IS GONE, not hidden behind a flag. It opened a camera
              that was a styled div and announced a catalog row after 1600ms,
              which is a made-up answer to a question nobody had asked it.
              Identifying a meal from a photo needs a vision model; there is
              nothing to switch back on until one exists, and the tile is
              worth less than nothing in the meantime. Its teal-deep gradient
              goes with it — the remaining three keep their own. */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {[
              { label: "AI Voice", Icon: Mic, bg: "linear-gradient(150deg,#A2C8C2,#6F9993)", onClick: () => setVoiceOpen(true) },
              { label: "Enter barcode", Icon: ScanLine, bg: "linear-gradient(150deg,#C0B4E8,#8F7FC9)", onClick: openBarcode },
              { label: "Custom", Icon: UtensilsCrossed, bg: "linear-gradient(150deg,#9184CE,#5F5093)", onClick: () => setCustomMode(true) },
            ].map(({ label, Icon, bg, onClick }) => (
              <button
                key={label}
                onClick={onClick}
                className="tap flex flex-col items-center gap-1.5 rounded-2xl py-3"
                style={{ background: bg, color: "#FFFFFF" }}
              >
                <Icon size={17} />
                <span className="text-[11px] font-semibold">{label}</span>
              </button>
            ))}
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
          </div>

          {/* The list's own scroll region, starting under the filter chips,
              so rows never travel up behind the pinned block or the band. */}
          <div className="flex flex-col no-scrollbar" style={{ gap: 6, maxHeight: 424, overflowY: "auto", margin: "0 -20px", padding: "12px 20px 0" }}>
            {filtered.map((f) => {
              // A custom food keeps the logo colour it was saved with, so it
              // can be told apart in the list at a glance.
              const tone = f.source === "custom" ? logoTone(f.logoTone) : null;
              return (
              <button
                key={`${f.source}-${f.id}`}
                onClick={() => setSelectedFood(f)}
                className="tap w-full flex items-center justify-between text-left shrink-0"
                style={{ borderRadius: 16, padding: "10px 12px" }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 36, height: 36, borderRadius: 12, background: tone ? tone.bg : "#F0EDF9", color: tone ? tone.fg : "#7D6BB5" }}
                  >
                    <FoodIcon category={f.category} size={16} />
                  </span>
                  <div>
                    <p className="flex items-center gap-1.5" style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "#241F1B" }}>
                      {f.name}
                      {f.isLebanese && <Star size={10} className="text-gold fill-gold" />}
                    </p>
                    <p style={{ margin: 0, fontSize: 11, color: "#8C8378" }}>{f.servingLabel}</p>
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#5B5349" }}>{f.calories} kcal</span>
              </button>
              );
            })}
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
