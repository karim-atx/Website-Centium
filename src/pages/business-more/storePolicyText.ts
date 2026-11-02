import type { StoreSettings } from "../../services/business-more/types";
import { t, tk } from "../../i18n/core";

// Store policies (MO1B-005, OURS-MO1B-store-policies-edit). The returns
// policy is stored as one sentence (business_store_settings.returns_policy,
// free text up to 2000): the Returns sheet writes it from its two choices and
// reads them back when the sentence is one it wrote. A sentence written
// elsewhere (onboarding's template) is shown as it is.

export const RETURN_WINDOWS = [7, 14, 30] as const;
export type ReturnWindow = (typeof RETURN_WINDOWS)[number] | "none";
export type ReturnCondition = "unopened" | "any";

// Round G (EH5): the stored sentence stays English (it is the store's policy
// text, read back by parseReturns); returnsSummary is what the screen reads.
export function composeReturns(window: ReturnWindow, condition: ReturnCondition): string {
  if (window === "none") return "No returns.";
  return `Returns within ${window} days. ${condition === "unopened" ? "Unopened items only." : "Any condition."}`;
}

export function parseReturns(text: string | null): { window: ReturnWindow; condition: ReturnCondition; ours: boolean } {
  const t = (text ?? "").trim();
  if (!t) return { window: 14, condition: "unopened", ours: true };
  if (/^no returns\.?$/i.test(t)) return { window: "none", condition: "unopened", ours: true };
  const m = t.match(/^Returns within (\d+) days\. (Unopened items only|Any condition)\.$/);
  if (m && (RETURN_WINDOWS as readonly number[]).includes(Number(m[1]))) {
    return { window: Number(m[1]) as ReturnWindow, condition: m[2] === "Any condition" ? "any" : "unopened", ours: true };
  }
  return { window: 14, condition: "unopened", ours: false };
}

/** The More row's desc (MO1B-010 row 3: "14 days, unopened items"). */
export function returnsSummary(s: StoreSettings): string | null {
  if (!s.returnsPolicy) return null;
  const p = parseReturns(s.returnsPolicy);
  if (!p.ours) return s.returnsPolicy;
  if (p.window === "none") return t("No returns");
  return p.condition === "unopened" ? t("{n} days, unopened items", { n: p.window }) : t("{n} days, any condition", { n: p.window });
}

/** Money as the store set it ($3, $50, $2.50). Store settings only, never payments. */
export const dollars = (n: number): string => (Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`);

/** Stored as written (members see it on the store); shown with t() in the picker. */
export const DELIVERY_TIMES = [tk("Same day"), tk("1 to 2 days"), tk("3 to 5 days")] as const;
