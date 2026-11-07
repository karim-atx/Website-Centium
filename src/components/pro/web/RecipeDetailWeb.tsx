import React from "react";
import { ChefHat, ChevronLeft, Pencil } from "lucide-react";
import { useWebLayout } from "../../web/useWebLayout";
import { servingMultiplier } from "../../../services/nutrition";
import { divideTotals, sumItems, type PrepItem } from "../../food/mealPrepShared";
import type { Recipe } from "../../../types";
import { appLocale } from "../../../i18n/format";
import { t, tn } from "../../../i18n/core";

// Professional handover v1, WP-NU-MP.3.1 (WP-NU Meal Plans Web v3,
// isRDetail): the recipe opens in the page, 5fr | 7fr, 24 apart. The recipe
// card (r20, 20 padding, 16 apart): the 40 back button and the RECIPE caps,
// the picture tile (the chef hat 48 on #F5F5F6, r16), the title 28/36 800
// and "{n} servings · {kcal} kcal total" 15/24, the per-serving card (#F4F4F6
// r16, 16 20: kcal 28/36 800, the 10 macro bar, P C F 15/20 700, the note
// 13/20) and Edit (44, r14, 1.5 #A198DF). Beside it Ingredients (#F4F4F6, r20,
// 16 20): white rows (r12, 64 high, 46 on the rail where the macro line drops
// under the name) with the name 15/22 600, its note in italics, the macro
// line (a 6 bar and P · C · F 11/16), the quantity and kcal (72 each); then
// Steps, numbered (28 dots, 24 on the rail). Edit opens the repo's edit sheet.

const fmt = (n: number) => Math.round(n).toLocaleString(appLocale("en-GB"));
const g1 = (n: number) => `${(Math.round(n * 10) / 10).toLocaleString(appLocale("en-GB"))}g`;

const MacroLine: React.FC<{ p: number; c: number; f: number; name: string; bar: "row" | "under" }> = ({ p, c, f, name }) => {
  const tot = p + c + f;
  const none = tot < 3;
  const seg = none ? [] : [[p, "#7D6BB5"], [c, "#AEA1DC"], [f, "#A2C8C2"]] as const;
  const val = (v: number) => (none ? "–" : g1(v));
  return (
    <span role="img" aria-label={none ? t("{name}, no meaningful macros", { name }) : t("{name}, protein {p}, carbs {c}, fat {f}", { name, p: g1(p), c: g1(c), f: g1(f) })} className="flex flex-col min-w-0" style={{ gap: 4 }}>
      <span className="flex overflow-hidden" style={{ height: 6, borderRadius: 3, background: "rgba(36,31,27,0.07)" }}>
        {seg.map(([v, col], i) => (
          <span key={i} className="block h-full" style={{ width: `${(v / tot) * 100}%`, background: col }} />
        ))}
      </span>
      <span className="flex items-center whitespace-nowrap" style={{ gap: 6, fontSize: 11, lineHeight: "16px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
        <span style={{ color: none ? "#A79E93" : "#7D6BB5" }}>P {val(p)}</span>
        <span style={{ color: "#C9C3BA" }}>·</span>
        <span style={{ color: none ? "#A79E93" : "#8175C2" }}>C {val(c)}</span>
        <span style={{ color: "#C9C3BA" }}>·</span>
        <span style={{ color: none ? "#A79E93" : "#6F9993" }}>F {val(f)}</span>
      </span>
    </span>
  );
};

export const RecipeDetailWeb: React.FC<{ recipe: Recipe; onBack: () => void; onEdit: () => void }> = ({ recipe, onBack, onEdit }) => {
  const { rail } = useWebLayout();
  const items = recipe.items as PrepItem[];
  const total = sumItems(items);
  const per = divideTotals(total, recipe.servings);
  const pm = per.p + per.c + per.f;
  const steps = (recipe.steps ?? "")
    .split(/\n+/)
    .map((s) => s.replace(/^\s*\d+[.)]\s*/, "").trim())
    .filter(Boolean);
  const caps: React.CSSProperties = { margin: "0 0 8px", fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#8C8378" };
  const qty = (i: PrepItem) => `${i.quantity} ${i.unit ?? t("serving")}`;

  return (
    <div className="grid" style={{ gridTemplateColumns: "minmax(0,5fr) minmax(0,7fr)", gap: 24, alignItems: "start" }}>
      <section aria-label={t("Recipe")} className="flex flex-col min-w-0" style={{ boxSizing: "border-box", gap: 16, borderRadius: 20, background: "#FFFFFF", border: "1px solid rgba(36,31,27,0.08)", padding: 20 }}>
        <div className="flex items-center" style={{ gap: 12 }}>
          <button
            type="button"
            onClick={onBack}
            aria-label={t("Back to recipes")}
            className="flex items-center justify-center shrink-0 hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 12, background: "#F5F5F6", border: "1px solid rgba(36,31,27,0.10)" }}
          >
            <ChevronLeft size={20} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" style={{ color: "#241F1B" }} />
          </button>
          <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".12em", textTransform: "uppercase", color: "#8C8378" }}>{t("Recipe")}</span>
        </div>
        <span className="flex items-center justify-center" style={{ minHeight: 160, borderRadius: 16, background: "#F5F5F6" }}>
          <ChefHat size={48} strokeWidth={1.5} aria-hidden style={{ color: "#7D6BB5" }} />
        </span>
        <div>
          <h2 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 800, letterSpacing: "-0.02em", color: "#241F1B", overflowWrap: "anywhere" }}>{recipe.title}</h2>
          <p style={{ margin: "2px 0 0", fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>
            {tn(recipe.servings, "{n} serving", "{n} servings")} · {t("{n} kcal total", { n: fmt(total.kcal) })}
          </p>
        </div>
        <div role="img" aria-label={t("Per serving {kcal} kcal, protein {p}, carbs {c}, fat {f}", { kcal: fmt(per.kcal), p: g1(per.p), c: g1(per.c), f: g1(per.f) })} className="flex flex-col" style={{ borderRadius: 16, background: "#F4F4F6", padding: "16px 20px", gap: 10 }}>
          <div className="flex items-center" style={{ gap: 16 }}>
            <span className="flex items-baseline" style={{ flex: "none", gap: 4 }}>
              <span style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, letterSpacing: "-0.02em", color: "#241F1B" }}>{fmt(per.kcal)}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#8C8378" }}>{t("kcal")}</span>
            </span>
            <span className="flex-1 min-w-0 flex flex-col" style={{ gap: 6 }}>
              <span className="flex overflow-hidden" style={{ height: 10, borderRadius: 4, background: "rgba(36,31,27,0.07)" }}>
                {pm > 0 &&
                  ([[per.p, "#7D6BB5"], [per.c, "#AEA1DC"], [per.f, "#A2C8C2"]] as const).map(([v, c], i) => <span key={i} className="block h-full" style={{ width: `${(v / pm) * 100}%`, background: c }} />)}
              </span>
              <span className="flex justify-between whitespace-nowrap" style={{ gap: 8, fontSize: 15, lineHeight: "20px", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
                <span style={{ color: "#7D6BB5" }}>P {g1(per.p)}</span>
                <span style={{ color: "#8175C2" }}>C {g1(per.c)}</span>
                <span style={{ color: "#6F9993" }}>F {g1(per.f)}</span>
              </span>
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{tn(recipe.servings, "Per serving. Totals ÷ {n} serving.", "Per serving. Totals ÷ {n} servings.")}</p>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center justify-center hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
          style={{ height: 44, boxSizing: "border-box", borderRadius: 14, border: "1.5px solid #A198DF", background: "#FFFFFF", color: "#7D6BB5", gap: 8, fontSize: 15, lineHeight: "24px", fontWeight: 600 }}
        >
          <Pencil size={16} strokeWidth={2} aria-hidden />
          {t("Edit")}
        </button>
      </section>

      <div className="flex flex-col min-w-0" style={{ gap: 16 }}>
        <section aria-label={t("Ingredients")} className="flex flex-col" style={{ boxSizing: "border-box", borderRadius: 20, background: "#F4F4F6", padding: "16px 20px" }}>
          <p style={caps}>{t("Ingredients")}</p>
          <div className="flex flex-col" style={{ gap: rail ? 2 : 4 }}>
            {items.map((i, k) => {
              const m = servingMultiplier(i.food.serving, i.quantity, i.unit ?? "serving");
              const line = <MacroLine p={i.food.protein * m} c={i.food.carbs * m} f={i.food.fat * m} name={i.food.name} bar={rail ? "under" : "row"} />;
              const kcal = (
                <span style={{ flex: "none", width: 72, textAlign: "end", fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#5B5349", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{t("{n} kcal", { n: fmt(i.food.calories * m) })}</span>
              );
              return rail ? (
                <div key={k} className="flex flex-col justify-center" style={{ height: 46, boxSizing: "border-box", gap: 2, borderRadius: 12, background: "#FFFFFF", padding: "3px 14px" }}>
                  <span className="flex items-baseline" style={{ gap: 12 }}>
                    <span className="flex-1 min-w-0 truncate" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>
                      {i.food.name}
                      {i.note && <span style={{ fontSize: 13, fontWeight: 400, fontStyle: "italic", color: "#8C8378" }}> · {i.note}</span>}
                    </span>
                    <span style={{ flex: "none", fontSize: 15, lineHeight: "22px", color: "#8C8378", whiteSpace: "nowrap" }}>{qty(i)}</span>
                    {kcal}
                  </span>
                  {line}
                </div>
              ) : (
                <div key={k} className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 16, borderRadius: 12, background: "#FFFFFF", padding: "6px 14px" }}>
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: 15, lineHeight: "22px", fontWeight: 600, color: "#241F1B" }}>{i.food.name}</span>
                    {i.note && <span className="block truncate" style={{ fontSize: 13, lineHeight: "18px", fontStyle: "italic", color: "#8C8378" }}>{i.note}</span>}
                  </span>
                  <span style={{ flex: "0 0 40%", minWidth: 0 }}>{line}</span>
                  <span style={{ flex: "none", width: 72, textAlign: "end", fontSize: 15, lineHeight: "22px", color: "#8C8378", whiteSpace: "nowrap" }}>{qty(i)}</span>
                  {kcal}
                </div>
              );
            })}
          </div>
        </section>
        {steps.length > 0 && (
          <section aria-label={t("Steps")} className="flex flex-col" style={{ boxSizing: "border-box", borderRadius: 20, background: "#F4F4F6", padding: rail ? "12px 20px" : "16px 20px" }}>
            <p style={caps}>{t("Steps")}</p>
            <ol className="flex flex-col" style={{ margin: 0, padding: 0, listStyle: "none", gap: rail ? 6 : 8 }}>
              {steps.map((s, k) => (
                <li key={k} className="flex items-start" style={{ gap: 12 }}>
                  <span aria-hidden className="flex items-center justify-center" style={{ width: rail ? 24 : 28, height: rail ? 24 : 28, flex: "none", borderRadius: 999, background: "#FFFFFF", color: "#5F5093", fontSize: 13, fontWeight: 800 }}>
                    {(k + 1).toLocaleString(appLocale("en-GB"))}
                  </span>
                  <span className="flex-1 min-w-0" style={{ paddingTop: 2, fontSize: rail ? 13 : 15, lineHeight: rail ? "20px" : "24px", color: "#5B5349" }}>
                    {s}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  );
};
