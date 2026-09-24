import React, { useState } from "react";
import { ChevronDown, ScanLine, SlidersHorizontal, UtensilsCrossed } from "lucide-react";
import { SheetField } from "./SheetField";
import { LOGO_TONES } from "./logoTones";
import { NUTRIENT_SECTIONS } from "../../data/nutrientSchema";
import { foodCategories } from "../../data/mockFoods";
import { foodCategoryIcon } from "../../utils/icons";
import { createCustomFood, createFoodByBarcode, type FoodSearchResult } from "../../services/food";
import { useApp } from "../../context/AppContext";
import type { Food } from "../../types";

// Create Custom Food — master handover, CentiumFrame "Create Custom Food"
// (lavender sheet): grey field containers, a scrolling logo row whose
// selected tile steps through LOGO_TONES, the macro grid, a barcode box, and
// a save / advanced-nutrients row.
//
// LIFTED OUT OF AddFoodSheet UNCHANGED, because a second caller arrived. The
// voice logger needs this exact form for an item it could not match — the
// spoken name goes in, the saved food comes back, and the review row it came
// from becomes a matched row with real nutrition. Rebuilding a smaller
// version there would have been a second place to keep the macro fields, the
// logo tones and the advanced-nutrient set in step, and they would not have
// stayed in step.
//
// IT RENDERS A BODY, NOT A SHEET. Each caller already owns a BottomSheet and
// its own idea of what "back" means: Add Food returns to the food list, the
// voice logger returns to its review. Wrapping a sheet in here would have
// meant either a sheet inside a sheet or a title this component cannot know.

export interface CustomFoodFormProps {
  /** Prefills the name field — the voice logger passes what was heard. */
  initialName?: string;
  /** The saved food, carrying its real custom_foods (or catalog) id. */
  onSaved: (food: FoodSearchResult) => void;
  /**
   * Opens the barcode-entry screen, where there is one. Absent from the voice
   * logger, which has no such step.
   */
  onLookUpBarcode?: () => void;
}

export const CustomFoodForm: React.FC<CustomFoodFormProps> = ({
  initialName,
  onSaved,
  onLookUpBarcode,
}) => {
  const { authUserId, addCustomFood } = useApp();
  const [draft, setDraft] = useState({
    name: initialName ?? "",
    serving: "1 serving",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
    category: "homemade" as Food["category"],
  });
  const [logoTone, setLogoTone] = useState(0);
  const [barcode, setBarcode] = useState("");
  const [advOpen, setAdvOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ popular: true });
  const [nutrients, setNutrients] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Awaits the write so the food handed back carries its real custom_foods
  // id, which is what gives the resulting diary entry real provenance.
  const saveCustomFood = async () => {
    if (!draft.name.trim() || !draft.calories || saving) return;
    setSaving(true);
    setError(null);

    const payload = {
      name: draft.name.trim(),
      category: draft.category,
      serving: draft.serving || "1 serving",
      calories: Number(draft.calories) || 0,
      protein: Number(draft.protein) || 0,
      carbs: Number(draft.carbs) || 0,
      fat: Number(draft.fat) || 0,
    };
    // "Leave anything you do not have blank": only typed fields are kept, so
    // a blank stays "no data" rather than becoming a zero.
    const typedNutrients = Object.fromEntries(
      Object.entries(nutrients)
        .filter(([, v]) => v.trim() !== "" && Number.isFinite(Number(v)))
        .map(([k, v]) => [k, Number(v)])
    );
    const hasNutrients = Object.keys(typedNutrients).length > 0;

    // WITH A BARCODE the food goes to the shared catalog through the same
    // route a scanned product does, so "anyone scanning this pack" finds it.
    // The colour and advanced nutrients are the user's own, so they ride on
    // a personal correction of that row (overrides_food_id), which search
    // and barcode lookup already prefer for its owner.
    const code = barcode.trim();
    if (code) {
      const shared = await createFoodByBarcode({ barcode: code, servingLabel: payload.serving, ...payload });
      if (!shared.ok || !shared.food) {
        setSaving(false);
        setError(shared.message ?? "Couldn't add that barcode. Try again, or save without it.");
        return;
      }
      let chosen = shared.food;
      if (authUserId) {
        const mine = await createCustomFood(authUserId, {
          ...payload,
          logoTone,
          nutrients: hasNutrients ? typedNutrients : null,
          overridesFoodId: shared.food.id,
        });
        if (mine.ok && mine.food) chosen = mine.food;
      }
      setSaving(false);
      onSaved(chosen);
      return;
    }

    const food = await addCustomFood({
      ...payload,
      logoTone,
      nutrients: hasNutrients ? typedNutrients : null,
    });
    setSaving(false);
    onSaved({
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

  const field = (
    label: string,
    key: keyof typeof draft,
    placeholder: string,
    numeric = false
  ) => (
    <SheetField
      label={label}
      value={draft[key]}
      onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
      placeholder={placeholder}
      numeric={numeric}
    />
  );

  const tone = LOGO_TONES[logoTone % LOGO_TONES.length];
  const canSave = !!draft.name.trim() && !!draft.calories && !saving;

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
            const active = draft.category === c.id;
            return (
              <button
                key={c.id}
                // Tapping the already-selected tile steps its colour on,
                // so the saved food can be told apart at a glance.
                onClick={() =>
                  active
                    ? setLogoTone((t) => (t + 1) % LOGO_TONES.length)
                    : setDraft((d) => ({ ...d, category: c.id }))
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
            value={barcode}
            onChange={(e) => setBarcode(e.target.value.replace(/[^\dA-Za-z]/g, ""))}
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
          {/* Only where there is a barcode screen to go to. The voice
              logger opens this form over its own review list and has no
              such step, so it passes no handler and the shortcut is not
              rendered rather than being a dead control. */}
          {onLookUpBarcode && (
            <button
              onClick={onLookUpBarcode}
              aria-label="Look up barcode"
              className="tap flex items-center justify-center"
              style={{ flex: "none", width: 44, height: 40, borderRadius: 10, background: "#A092E0", border: "none" }}
            >
              <ScanLine size={17} style={{ color: "#FFFFFF" }} />
            </button>
          )}
        </div>
        <p style={{ margin: "7px 2px 0", fontSize: 10, color: "#8C8378" }}>
          Optional. Adding it lets anyone scanning this pack find your food.
        </p>
      </div>

      {advOpen && (
        <div className="flex flex-col animate-fade-slide-up" style={{ gap: 8 }}>
          <p style={{ margin: 0, fontSize: 11, color: "#8C8378" }}>
            Per serving. Leave anything you do not have blank.
          </p>
          {advGroups.map((sec) => {
            const groupOpen = !!openGroups[sec.id];
            const filled = sec.rows.filter((r) => (nutrients[r.key] ?? "").trim() !== "").length;
            return (
              <div
                key={sec.id}
                style={{ border: "1px solid rgba(174,161,220,0.34)", borderRadius: 12, overflow: "hidden", background: "#FFFFFF" }}
              >
                <button
                  onClick={() => setOpenGroups((g) => ({ ...g, [sec.id]: !g[sec.id] }))}
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
                          value={nutrients[r.key] ?? ""}
                          onChange={(e) =>
                            setNutrients((n) => ({ ...n, [r.key]: e.target.value.replace(/[^\d.]/g, "") }))
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

      {error && (
        <p className="text-xs font-semibold text-status-high text-center" style={{ margin: 0 }}>
          {error}
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
          {saving ? "Saving…" : "Save custom food"}
        </button>
        <button
          onClick={() => setAdvOpen((v) => !v)}
          aria-pressed={advOpen}
          title={advOpen ? "Hide advanced nutrients" : "Advanced nutrients"}
          aria-label={advOpen ? "Hide advanced nutrients" : "Advanced nutrients"}
          className="tap flex items-center justify-center"
          style={{
            flex: 1,
            minWidth: 0,
            height: 52,
            borderRadius: 16,
            border: `1px solid ${advOpen ? "#A092E0" : "rgba(36,31,27,0.11)"}`,
            background: advOpen ? "rgba(174,161,220,0.18)" : "#FFFFFF",
            color: advOpen ? "#5F5093" : "#5B5349",
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
  );
};
