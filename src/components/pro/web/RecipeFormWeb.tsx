import React from "react";
import { Search, Trash2, X, Plus } from "lucide-react";
import type { ServingUnit } from "../../../types";
import type { FoodSearchResult } from "../../../services/food";
import { sumItems, type MacroTotals, type PrepItem } from "../../food/mealPrepShared";
import { t } from "../../../i18n/core";

/**
 * Website viewport v1, WP-NU-MP.9 (WP-NU-MP Sheets Web, `sh.rf`): the
 * professional's Create / Edit Recipe form in the 440 side sheet. Name and
 * Servings on one row, the ingredient rows, the food search docked under
 * them with its results dropping below, the per-serving strip and Steps.
 * There is no Playlist on web (the frame draws none; a saved playlist is
 * kept). usePrepForm owns every value; this only lays them out.
 */

const INK = "#241F1B";
const LABEL = "#5B5349";
const MUTED = "#71685E";
const FAINT = "#A39A90";
const FIELD: React.CSSProperties = {
  height: 44,
  boxSizing: "border-box",
  borderRadius: 12,
  background: "#F5F5F6",
  border: "1px solid rgba(36,31,27,0.1)",
  padding: "0 12px",
  fontSize: 15,
  color: INK,
  width: "100%",
};
const labelStyle: React.CSSProperties = { margin: "0 0 6px", fontSize: 13, lineHeight: "20px", fontWeight: 600, color: LABEL, display: "block" };
const capsStyle: React.CSSProperties = { margin: 0, fontSize: 12, lineHeight: "16px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED };
const footStyle: React.CSSProperties = { display: "block", fontSize: 13, lineHeight: "20px", color: MUTED };
const ring = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]";
const UNITS: ServingUnit[] = ["serving", "g", "ml", "cup", "tbsp", "tsp"];

export const RecipeFormWeb: React.FC<{
  title: string;
  onTitle: (v: string) => void;
  servings: string;
  onServings: (v: string) => void;
  onServingsBlur: () => void;
  items: PrepItem[];
  qtyDraft: (i: number) => string;
  onQty: (i: number, raw: string) => void;
  onQtyBlur: (i: number) => void;
  onUnit: (i: number, u: ServingUnit) => void;
  onRemove: (i: number) => void;
  query: string;
  onQuery: (v: string) => void;
  searching: boolean;
  results: FoodSearchResult[];
  emptyLine: string;
  onAdd: (r: FoodSearchResult) => void;
  /** The repo's inline "Create a new food" (kept: its form renders below). */
  createFood: React.ReactNode;
  onCreateFood: () => void;
  strip: MacroTotals;
  steps: string;
  onSteps: (v: string) => void;
  error: string | null;
}> = (p) => {
  const [focused, setFocused] = React.useState(false);
  const typed = p.query.trim().length > 0;
  const cells: [string, string, string][] = [
    [String(Math.round(p.strip.kcal)), t("kcal"), INK],
    [t("{n} g", { n: Math.round(p.strip.p) }), t("protein"), "#7D6BB5"],
    [t("{n} g", { n: Math.round(p.strip.c) }), t("carbs"), "#8175C2"],
    [t("{n} g", { n: Math.round(p.strip.f) }), t("fat"), "#4274D7"],
  ];
  return (
    <div className="flex flex-col" style={{ gap: 16, color: INK }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 96px", gap: 10 }}>
        <label className="block min-w-0">
          <span style={labelStyle}>{t("Recipe name")}</span>
          <input
            value={p.title}
            onChange={(e) => p.onTitle(e.target.value)}
            placeholder={t("e.g. Chicken and rice bowl")}
            className={`placeholder:text-[#A39A90] ${ring}`}
            style={FIELD}
          />
        </label>
        <label className="block">
          <span style={labelStyle}>{t("Servings")}</span>
          <input
            value={p.servings}
            onChange={(e) => p.onServings(e.target.value)}
            onBlur={p.onServingsBlur}
            inputMode="numeric"
            className={ring}
            style={FIELD}
          />
        </label>
      </div>

      <p style={capsStyle}>{t("Ingredients")}</p>
      {p.items.length === 0 ? (
        <p style={{ margin: "-4px 0 0", fontSize: 13, lineHeight: "20px", color: MUTED }}>{t("No foods added yet.")}</p>
      ) : (
        <div className="flex flex-col">
          {p.items.map((it, i) => (
            <div key={`${it.food.id}-${i}`} className="flex items-center" style={{ gap: 10, minHeight: 56, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
              <span className="flex-1 min-w-0">
                <span className="block truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
                  {it.food.name}
                </span>
                <span style={footStyle}>{t("{n} kcal", { n: Math.round(sumItems([it]).kcal) })}</span>
              </span>
              <span
                className="flex-none flex items-center justify-end"
                style={{ height: 32, minWidth: 72, boxSizing: "border-box", borderRadius: 10, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.1)", padding: "0 6px 0 10px", gap: 2, fontSize: 13, fontWeight: 600 }}
              >
                <input
                  value={p.qtyDraft(i)}
                  onChange={(e) => p.onQty(i, e.target.value)}
                  onBlur={() => p.onQtyBlur(i)}
                  inputMode="decimal"
                  aria-label={t("{name} quantity", { name: it.food.name })}
                  className={`bg-transparent text-end ${ring}`}
                  style={{ width: 36, fontSize: 13, fontWeight: 600, color: INK, border: "none", padding: 0 }}
                />
                <select
                  value={it.unit ?? "serving"}
                  onChange={(e) => p.onUnit(i, e.target.value as ServingUnit)}
                  aria-label={t("Unit")}
                  className={`bg-transparent cursor-pointer ${ring}`}
                  style={{ fontSize: 13, fontWeight: 600, color: INK, border: "none", padding: 0 }}
                >
                  {UNITS.map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </span>
              <button
                onClick={() => p.onRemove(i)}
                aria-label={t("Remove {name}", { name: it.food.name })}
                className={`tap flex-none flex items-center justify-center rounded-full ${ring}`}
                style={{ width: 28, height: 28 }}
              >
                <X size={15} strokeWidth={2.2} color={FAINT} />
              </button>
            </div>
          ))}
        </div>
      )}

      <label
        className="flex items-center"
        style={{ ...FIELD, gap: 8, border: focused || typed ? "1.5px solid #AEA1DC" : FIELD.border }}
      >
        <Search size={16} strokeWidth={2} color={MUTED} className="flex-none" />
        <input
          value={p.query}
          onChange={(e) => p.onQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={t("Search foods")}
          aria-label={t("Search foods")}
          className="flex-1 min-w-0 bg-transparent outline-none placeholder:text-[#A39A90]"
          style={{ fontSize: 15, color: INK, border: "none", padding: 0 }}
        />
      </label>
      {typed && (
        <div style={{ marginTop: -6, borderRadius: 14, border: "1px solid rgba(174,161,220,0.5)", boxShadow: "0 12px 32px rgba(95,80,147,0.12)", padding: "4px 12px" }}>
          {p.searching || p.results.length === 0 ? (
            <p style={{ margin: 0, padding: "12px 0", fontSize: 13, lineHeight: "20px", color: MUTED }}>{p.searching ? t("Searching…") : p.emptyLine}</p>
          ) : (
            p.results.map((r, i) => {
              const added = p.items.some((it) => it.food.id === r.id);
              return (
                <div
                  key={`${r.source}-${r.id}`}
                  className="flex items-center"
                  style={{ gap: 10, minHeight: 44, borderBottom: i < p.results.length - 1 ? "1px solid rgba(36,31,27,0.06)" : "none" }}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
                      {r.name}
                    </span>
                    <span style={footStyle}>
                      {t("{n} kcal", { n: Math.round(r.calories) })} · {r.servingLabel}
                    </span>
                  </span>
                  <button
                    onClick={() => p.onAdd(r)}
                    disabled={added}
                    className={`tap flex-none rounded-[8px] disabled:opacity-40 ${ring}`}
                    style={{ fontSize: 13, fontWeight: 700, color: "#5F5093" }}
                  >
                    {t("Add to recipe")}
                  </button>
                </div>
              );
            })
          )}
          <button
            onClick={p.onCreateFood}
            className={`tap flex items-center rounded-[8px] ${ring}`}
            style={{ gap: 4, minHeight: 40, fontSize: 13, fontWeight: 700, color: "#5F5093" }}
          >
            <Plus size={13} /> {t("Create a new food")}
          </button>
          {p.createFood}
        </div>
      )}

      <div style={{ borderRadius: 14, background: "#F6F5FB", padding: "10px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 8 }}>
          {cells.map(([v, l, c]) => (
            <div key={l} className="min-w-0 text-center">
              <p className="tabular-nums" style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800, color: c }}>
                {v}
              </p>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: MUTED }}>{l}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: "20px", color: MUTED, textAlign: "center" }}>{t("Per serving, updating as ingredients are added.")}</p>
      </div>

      <label className="block">
        <span style={labelStyle}>{t("Steps (optional)")}</span>
        <textarea
          value={p.steps}
          onChange={(e) => p.onSteps(e.target.value)}
          placeholder={t("One step per line")}
          className={`resize-none placeholder:text-[#A39A90] ${ring}`}
          style={{ ...FIELD, height: undefined, minHeight: 88, padding: "10px 12px", fontSize: 13, lineHeight: "20px", color: LABEL, display: "block" }}
        />
      </label>

      {p.error && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#C0392B" }}>{p.error}</p>}
    </div>
  );
};

/** The sheet's pinned footer: the trash (edit only), Save, and the armed line. */
export const RecipeFormWebFooter: React.FC<{
  editing: boolean;
  armed: boolean;
  disabled: boolean;
  saving: boolean;
  onDelete: () => void;
  onSave: () => void;
  deleteLabel: string;
  armedLine: React.ReactNode;
}> = ({ editing, armed, disabled, saving, onDelete, onSave, deleteLabel, armedLine }) => (
  <div className="flex flex-col" style={{ gap: 8 }}>
    <div className="flex" style={{ gap: 8 }}>
      {editing && (
        <button
          onClick={onDelete}
          aria-label={deleteLabel}
          title={deleteLabel}
          className={`tap flex-none flex items-center justify-center ${ring}`}
          style={{ width: 44, height: 44, boxSizing: "border-box", borderRadius: 14, border: armed ? "1.5px solid #C0392B" : "1px solid rgba(192,57,43,0.3)", background: armed ? "#FBEAE8" : "#FFFFFF" }}
        >
          <Trash2 size={18} strokeWidth={2} color="#C0392B" />
        </button>
      )}
      <button
        onClick={onSave}
        disabled={disabled}
        className={`tap flex-1 min-w-0 flex items-center justify-center disabled:opacity-50 disabled:pointer-events-none ${ring}`}
        style={{ height: 44, borderRadius: 14, background: "#9A8CD6", color: "#FFFFFF", fontSize: 15, fontWeight: 600, whiteSpace: "nowrap" }}
      >
        {saving ? t("Saving…") : editing ? t("Save changes") : t("Save")}
      </button>
    </div>
    {armed && (
      <p role="alert" style={{ margin: 0, textAlign: "center", fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#C0392B" }}>
        {armedLine}
      </p>
    )}
  </div>
);
