import React, { useMemo, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Chip } from "../ui/Chip";
import { Search, Mic, Camera, ScanLine, Clock, Star, Minus, Plus, Check, UtensilsCrossed, Sparkles } from "lucide-react";
import { mockFoods, foodCategories } from "../../data/mockFoods";
import type { Food, MealType, ServingUnit } from "../../types";
import { mealLabels, mealOrder } from "../../services/nutrition";
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

const FoodIcon: React.FC<{ food: Food; size?: number; className?: string }> = ({
  food,
  size = 16,
  className,
}) => {
  const Icon = foodCategoryIcon[food.category] ?? UtensilsCrossed;
  return <Icon size={size} className={className} />;
};

export const AddFoodSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  defaultMeal?: MealType;
}> = ({ open, onClose, defaultMeal = "lunch" }) => {
  const { addFoodEntry, foodLog, customFoods, addCustomFood, customMeals, logCustomMeal, selectedDate } = useApp();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [selectedFood, setSelectedFood] = useState<Food | null>(null);
  const [meal, setMeal] = useState<MealType>(defaultMeal);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<ServingUnit>("serving");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [scanMode, setScanMode] = useState<ScanMode>(null);
  const [scanResultFood, setScanResultFood] = useState<Food | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const [customMode, setCustomMode] = useState(false);
  const [customDraft, setCustomDraft] = useState({
    name: "",
    serving: "1 serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  const recentFoods = useMemo(() => {
    const seen = new Set<string>();
    const items: Food[] = [];
    for (let i = foodLog.length - 1; i >= 0 && items.length < 5; i--) {
      const f = foodLog[i].food;
      if (!seen.has(f.id)) {
        seen.add(f.id);
        items.push(f);
      }
    }
    return items;
  }, [foodLog]);

  const allFoods = useMemo(() => [...customFoods, ...mockFoods], [customFoods]);

  const matchingMeals = useMemo(
    () => (query.trim() ? customMeals.filter((m) => m.title.toLowerCase().includes(query.toLowerCase())) : []),
    [customMeals, query]
  );

  const logMeal = (mealId: string) => {
    logCustomMeal(mealId, meal, selectedDate);
    setJustAdded(true);
    setTimeout(resetAndClose, 700);
  };

  const filtered = useMemo(() => {
    return allFoods.filter((f) => {
      const matchesQuery = f.name.toLowerCase().includes(query.toLowerCase());
      const matchesCategory = category ? f.category === category : true;
      return matchesQuery && matchesCategory;
    });
  }, [allFoods, query, category]);

  const resetAndClose = () => {
    setQuery("");
    setCategory(null);
    setSelectedFood(null);
    setQuantity(1);
    setUnit("serving");
    setScanMode(null);
    setScanResultFood(null);
    setJustAdded(false);
    setCustomMode(false);
    setCustomDraft({ name: "", serving: "1 serving", calories: "", protein: "", carbs: "", fat: "" });
    onClose();
  };

  const saveCustomFood = () => {
    if (!customDraft.name.trim() || !customDraft.calories) return;
    const food = addCustomFood({
      name: customDraft.name.trim(),
      category: "homemade",
      serving: customDraft.serving || "1 serving",
      calories: Number(customDraft.calories) || 0,
      protein: Number(customDraft.protein) || 0,
      carbs: Number(customDraft.carbs) || 0,
      fat: Number(customDraft.fat) || 0,
    });
    setCustomMode(false);
    setSelectedFood(food);
  };

  const handleAdd = () => {
    if (!selectedFood) return;
    addFoodEntry({
      foodId: selectedFood.id,
      food: selectedFood,
      quantity,
      unit,
      meal,
      loggedVia: "search",
    });
    setJustAdded(true);
    setTimeout(resetAndClose, 700);
  };

  const runScan = (mode: ScanMode) => {
    setScanMode(mode);
    setScanResultFood(null);
    setTimeout(() => {
      const demo = mode === "barcode" ? mockFoods.find((f) => f.name === "Laban")! : mockFoods.find((f) => f.name === "Manoushe Jebneh")!;
      setScanResultFood(demo);
    }, 1600);
  };

  // Detail / quantity view
  if (selectedFood) {
    const foodTotalCal = Math.round(selectedFood.calories * quantity);
    return (
      <BottomSheet open={open} onClose={resetAndClose} title="Add Food">
        <div className="animate-fade-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <span className="w-11 h-11 rounded-2xl bg-sohati-pale flex items-center justify-center shrink-0">
              <FoodIcon food={selectedFood} size={19} className="text-sohati-dark" />
            </span>
            <div>
              <p className="font-display font-semibold text-lg text-charcoal">{selectedFood.name}</p>
              <p className="text-xs text-charcoal-faint">{selectedFood.serving} · prototype estimate</p>
            </div>
          </div>

          <div className="flex items-center justify-between bg-cream-soft rounded-2xl px-4 py-3 mb-3">
            <span className="text-sm font-semibold text-charcoal-soft">Quantity</span>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity((q) => Math.max(1, +(q - 1).toFixed(1)))}
                className="tap w-8 h-8 rounded-full bg-white shadow-soft flex items-center justify-center text-charcoal"
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center font-semibold text-charcoal">{quantity}</span>
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
                  unit === u.value ? "bg-sohati text-white border-sohati" : "bg-cream-card border-charcoal/10 text-charcoal-soft"
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
                  meal === m ? "bg-sohati text-white border-sohati" : "bg-cream-card border-charcoal/10 text-charcoal-soft"
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
              <p className="text-sm font-bold text-charcoal">{Math.round(selectedFood.protein * quantity)}g</p>
              <p className="text-[10px] text-charcoal-faint">protein</p>
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{Math.round(selectedFood.carbs * quantity)}g</p>
              <p className="text-[10px] text-charcoal-faint">carbs</p>
            </div>
            <div>
              <p className="text-sm font-bold text-charcoal">{Math.round(selectedFood.fat * quantity)}g</p>
              <p className="text-[10px] text-charcoal-faint">fat</p>
            </div>
          </div>

          <div className="flex gap-2.5">
            <Button variant="outline" onClick={() => setSelectedFood(null)}>
              Back
            </Button>
            <Button fullWidth onClick={handleAdd} disabled={justAdded}>
              {justAdded ? <><Check size={16} /> Added</> : "Add to Diary"}
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
          className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
        />
      </label>
    );

    return (
      <BottomSheet open={open} onClose={resetAndClose} title="Create Custom Food">
        <div className="space-y-4 animate-fade-slide-up">
          {field("Food name", "name", "Mom's Kibbeh")}
          {field("Serving size", "serving", "1 piece")}
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
            disabled={!customDraft.name.trim() || !customDraft.calories}
          >
            Save custom food
          </Button>
          <p className="text-[11px] text-charcoal-faint text-center">
            Saved foods appear in search next time, alongside the Lebanese database.
          </p>
        </div>
      </BottomSheet>
    );
  }

  // Scan / barcode mock view
  if (scanMode) {
    return (
      <BottomSheet open={open} onClose={resetAndClose} title={scanMode === "barcode" ? "Scan Barcode" : "Scan Food"}>
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-full aspect-[4/3] rounded-3xl bg-charcoal relative overflow-hidden mb-5 flex items-center justify-center">
            <div className="absolute inset-6 border-2 border-dashed border-white/40 rounded-2xl" />
            {!scanResultFood ? (
              <div className="text-white/70 text-sm flex flex-col items-center gap-2">
                {scanMode === "barcode" ? <ScanLine size={28} className="animate-pulse" /> : <Camera size={28} className="animate-pulse" />}
                Scanning…
              </div>
            ) : (
              <div className="text-white text-sm">Match found</div>
            )}
          </div>
          {scanResultFood ? (
            <div className="w-full animate-fade-slide-up">
              <div className="flex items-center gap-3 bg-cream-soft rounded-2xl px-4 py-3 mb-4">
                <span className="w-9 h-9 rounded-xl bg-sohati-pale flex items-center justify-center shrink-0">
                  <FoodIcon food={scanResultFood} size={16} className="text-sohati-dark" />
                </span>
                <div className="text-left">
                  <p className="font-semibold text-charcoal text-sm">{scanResultFood.name}</p>
                  <p className="text-xs text-charcoal-faint">{scanResultFood.calories} kcal · {scanResultFood.serving}</p>
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
            <p className="text-xs text-charcoal-faint max-w-xs">
              Prototype demo — production Centium will use on-device image recognition to identify food automatically.
            </p>
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
          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-charcoal-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Lebanese food, meals or ingredients…"
              className="w-full rounded-2xl bg-cream-soft pl-10 pr-4 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-sohati/20"
            />
          </div>

          <div className="grid grid-cols-4 gap-2 mb-5">
            <button
              onClick={() => setVoiceOpen(true)}
              className="tap flex flex-col items-center gap-1.5 rounded-2xl py-3 bg-ember/10 text-ember-dark"
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

          {!query && recentFoods.length > 0 && (
            <div className="mb-5">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-faint uppercase tracking-wide mb-2">
                <Clock size={12} /> Recent
              </p>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {recentFoods.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setSelectedFood(f)}
                    className="tap shrink-0 flex items-center gap-2 bg-cream-soft rounded-2xl pl-2 pr-3.5 py-2"
                  >
                    <span className="w-7 h-7 rounded-lg bg-cream-card flex items-center justify-center shrink-0">
                      <FoodIcon food={f} size={13} className="text-sohati-dark" />
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
                    className="tap w-full flex items-center justify-between rounded-2xl px-3.5 py-3 bg-sohati-pale/60 hover:bg-sohati-pale text-left disabled:opacity-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-charcoal">{m.title}</p>
                      <p className="text-[11px] text-charcoal-faint">{m.items.length} items logged together</p>
                    </div>
                    <span className="text-xs font-semibold text-sohati">
                      {justAdded ? "Added" : "Log all"}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 mb-4">
            <Chip active={category === null} onClick={() => setCategory(null)}>
              All
            </Chip>
            {foodCategories.map((c) => (
              <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                {c.label}
              </Chip>
            ))}
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto no-scrollbar">
            {filtered.map((f) => (
              <button
                key={f.id}
                onClick={() => setSelectedFood(f)}
                className="tap w-full flex items-center justify-between rounded-2xl px-3 py-2.5 hover:bg-cream-soft text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-xl bg-sohati-pale flex items-center justify-center shrink-0">
                    <FoodIcon food={f} size={16} className="text-sohati-dark" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5">
                      {f.name}
                      {f.isLebanese && <Star size={10} className="text-gold fill-gold" />}
                    </p>
                    <p className="text-[11px] text-charcoal-faint">{f.serving}</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-charcoal-soft">{f.calories} kcal</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-sm text-charcoal-faint py-8">No foods match your search.</p>
            )}
          </div>
        </div>
      </BottomSheet>

      <AIVoiceLogger open={voiceOpen} onClose={() => { setVoiceOpen(false); resetAndClose(); }} />
    </>
  );
};
