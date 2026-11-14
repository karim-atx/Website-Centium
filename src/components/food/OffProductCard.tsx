import React from "react";
import { ExternalLink } from "lucide-react";
import type { OffProduct } from "../../services/barcode/lookup";
import { useIsDark } from "../../hooks/useIsDark";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { FOOD_DARK } from "./foodDark";
import { textPx } from "../../theme/textSize";
import { t } from "../../i18n/core";
import { safeHref } from "../../utils/safeHref";
import { addNotice } from "../../services/nutrition/clientNutritionModel";
import { conflictWords } from "../../services/food/onlineSearchModel";
import { dietLabel } from "../../utils/dietaryRestrictions";
import { FoodConflictNotice } from "./FoodConflictBadge";
import { useFoundFoodConflicts } from "./useFoundFoodConflicts";

/**
 * A product found on Open Food Facts (step 2 of the barcode lookup order),
 * shown with its licence notice and a link to its page, for the user to
 * confirm before anything is logged. What they confirm lands only on their
 * own diary row, with its attribution; nothing goes into the shared catalogue.
 * Batch D GI: with the allergy and diet warnings a catalogue food gets, from
 * the product's own allergen data; the add step checks the same answer.
 */
export const OffProductCard: React.FC<{
  product: OffProduct;
  onConfirm: () => void;
  onManual: () => void;
}> = ({ product, onConfirm, onManual }) => {
  const dark = useIsDark();
  // Round D (R3): name and serving only in recovery-sensitive mode.
  const hide = useHideNumbers();
  const conflicts = useFoundFoodConflicts(`off:${product.barcode}`, product);
  const notice = conflicts ? addNotice(product.name, conflicts, dietLabel, conflictWords(product)) : null;
  const macro = (v: number | null) => (v === null ? "–" : t("{n}g", { n: v }));
  return (
    <div>
      <div style={{ background: dark ? FOOD_DARK.box : "#F4F4F6", borderRadius: 16, padding: "13px 14px" }}>
        <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>{product.name}</p>
        <p style={{ margin: "2px 0 0", fontSize: textPx(12), color: "rgb(var(--c-charcoal-muted))" }}>
          {product.brand ? `${product.brand} · ` : ""}
          {product.perServing ? product.servingLabel : t("per 100 g")}
        </p>
        {!hide && (
        <div className="grid grid-cols-4 text-center" style={{ marginTop: 12 }}>
          {[
            [`${product.calories}`, t("kcal")],
            [macro(product.protein), t("protein")],
            [macro(product.carbs), t("carbs")],
            [macro(product.fat), t("fat")],
          ].map(([v, l]) => (
            <div key={l}>
              <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 800, color: "rgb(var(--c-charcoal))" }}>{v}</p>
              <p style={{ margin: 0, fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))" }}>{l}</p>
            </div>
          ))}
        </div>
        )}
      </div>
      {notice && (
        <div style={{ marginTop: 10 }}>
          <FoodConflictNotice notice={notice} />
        </div>
      )}
      <p style={{ margin: "10px 2px 0", fontSize: textPx(11), color: "rgb(var(--c-charcoal-muted))", lineHeight: 1.45 }}>
        {product.attribution.notice}{" "}
        <a
          href={safeHref(product.attribution.url) ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center"
          style={{ color: dark ? FOOD_DARK.lavInk : "rgb(var(--thi-7d67d9))", fontWeight: 600, gap: 3 }}
        >
          {t("View on Open Food Facts")} <ExternalLink size={11} />
        </a>
      </p>
      <div className="flex" style={{ gap: 10, marginTop: 14 }}>
        <button
          onClick={onManual}
          className="tap flex-1"
          style={{ height: 48, borderRadius: 14, background: "rgb(var(--c-cream-card))", border: `1px solid ${dark ? FOOD_DARK.outline : "#E4E4E9"}`, color: "rgb(var(--c-charcoal))", fontSize: textPx(14), fontWeight: 600 }}
        >
          {t("Enter it myself")}
        </button>
        <button
          onClick={onConfirm}
          className="tap flex-1"
          style={{ height: 48, borderRadius: 14, background: "rgb(var(--c-fill-cta))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(14), fontWeight: 700 }}
        >
          {t("Use this product")}
        </button>
      </div>
    </div>
  );
};
