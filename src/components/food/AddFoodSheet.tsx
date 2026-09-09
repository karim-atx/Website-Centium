import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Search, Mic, Camera, ScanLine, Clock, Star, Minus, Plus, Check, UtensilsCrossed, Sparkles } from "lucide-react";
import { foodCategories, addFoodFilterCategories } from "../../data/mockFoods";
import type { Food, MealType, ServingUnit } from "../../types";
import { mealLabels, mealOrder, servingMultiplier } from "../../services/nutrition";
import {
  searchFoods,
  listFoods,
  getFoodsByIds,
  lookupByBarcode,
  createFoodByBarcode,
  logFoodEntry,
  type FoodSearchResult,
} from "../../services/food";
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
  // programmatically (the +/- buttons, or resetting the form).
  const setQuantity = (updater: number | ((q: number) => number)) => {
    setQuantityRaw((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setQuantityDraft(String(next));
      return next;
    });
  };
  const [unit, setUnit] = useState<ServingUnit>("serving");
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
    return (
      <BottomSheet open={open} onClose={resetAndClose} title="Add Food">
        <div className="animate-fade-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-11 h-11 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0">
              <FoodIcon category={selectedFood.category} size={19} className="text-primary-dark" />
            </span>
            <div>
              <p className="font-display font-semibold text-lg text-charcoal">{selectedFood.name}</p>
              <p className="text-xs text-charcoal-faint">
                {selectedFood.servingLabel}
                {selectedFood.isVerified ? " · USDA verified" : " · estimate"}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3 mb-3">
            <span className="text-sm font-semibold text-charcoal-soft">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(0.1, +(q - 1).toFixed(1)))}
                className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
              >
                <Minus size={14} />
              </button>
              <input
                value={quantityDraft}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d.]/g, "");
                  setQuantityDraft(v);
                  const n = Number(v);
                  if (v && !Number.isNaN(n) && n > 0) setQuantityRaw(n);
                }}
                onBlur={() => setQuantityDraft(String(quantity))}
                inputMode="decimal"
                className="w-14 text-center font-semibold text-charcoal bg-transparent focus:outline-none"
              />
              <button
                onClick={() => setQuantity((q) => +(q + 1).toFixed(1))}
                className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Unit</p>
          <div className="flex flex-wrap gap-2 mb-6">
            {servingUnitOptions.map((u) => (
              <button
                key={u.value}
                onClick={() => setUnit(u.value)}
                className={`tap rounded-xl px-3.5 py-2 text-xs font-semibold border transition-colors ${
                  unit === u.value ? "bg-primary text-white border-primary" : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                }`}
              >
                {u.label}
              </button>
            ))}
          </div>

          <p className="text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">Meal</p>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {mealOrder.map((m) => (
              <button
                key={m}
                onClick={() => setMeal(m)}
                className={`tap rounded-xl py-2.5 text-xs font-semibold border transition-colors ${
                  meal === m ? "bg-primary text-white border-primary" : "bg-cream-card border-charcoal/10 text-charcoal-soft"
                }`}
              >
                {mealLabels[m]}
              </button>
            ))}
          </div>

          <div className="flex justify-around bg-cream-soft rounded-2xl px-4 py-3 mb-6 text-center">
            <div>
              <p className="text-sm font-bold text-charcoal">{foodTotalCal}</p>
              <p className="text-[10px] text-charcoal-faint">kcal</p>
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{Math.round(selectedFood.protein * multiplier)}g</p>
              <p className="text-[10px] text-charcoal-faint">protein</p>
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{Math.round(selectedFood.carbs * multiplier)}g</p>
              <p className="text-[10px] text-charcoal-faint">carbs</p>
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{Math.round(selectedFood.fat * multiplier)}g</p>
              <p className="text-[10px] text-charcoal-faint">fat</p>
            </div>
          </div>

          {addError && (
            <p className="text-xs font-semibold text-status-high text-center mb-3">{addError}</p>
          )}

          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => setSelectedFood(null)}>
              Back
            </Button>
            <Button fullWidth onClick={handleAdd} disabled={justAdded || saving}>
              {justAdded ? <><Check size={16} /> Added</> : saving ? "Saving…" : "Add to Diary"}
            </Button>
          </div>
        </div>
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
            <Chip active={category === null} onClick={() => setCategory(null)}>
              All
            </Chip>
            {addFoodFilterCategories.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </Chip>
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
