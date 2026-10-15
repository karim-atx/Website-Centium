import React from "react";
import { CircleAlert, TriangleAlert } from "lucide-react";
import { textPx } from "../../theme/textSize";
import { INK, NO_ICON_SCALE } from "./proInk";
import type { ConflictKind } from "./proRules";

/**
 * Release 3 · ConflictBadge (HANDOVER e and h, safety: "Allergy badges use the
 * client's structured allergy and dietary data, never keyword matching on food
 * names alone"). One badge per food_conflicts row (DB-5), source gen/r7.js
 * allergyTag7 / restrTag7 / prefTag7:
 *
 * - allergy_confirmed: red, blocked (status.high on its pale, TriangleAlert
 *   12 / 2.4, 11.5 / 800). The only kind that blocks.
 * - allergy_check: a keyword match only, "Check this", never a severity
 *   (amber, the restriction style).
 * - restriction: amber, "Add anyway" is allowed (gold pale, goldInk,
 *   CircleAlert 12 / 2.2, 11.5 / 700).
 * - preference: shown only (soft fill, text.soft, no icon).
 * - allergies_unknown: the switch is off; nothing renders (the caller shows
 *   LockLine for Allergies and dietary needs).
 * All: r8, pad 4 8, gap 4, nowrap.
 */

export interface ConflictBadgeProps {
  kind: ConflictKind;
  /** The allergen or restriction as the client sees it ("Tree nuts", "Dairy-free"). Ignored for allergy_check. */
  label: string;
  /** allergy_confirmed only: the client's severity word ("severe"), from structured data. */
  severity?: string | null;
}

const BASE: React.CSSProperties = { gap: 4, borderRadius: 8, padding: "4px 8px", fontSize: textPx(11.5), whiteSpace: "nowrap" };

export const ConflictBadge: React.FC<ConflictBadgeProps> = ({ kind, label, severity }) => {
  if (kind === "allergies_unknown") return null;
  if (kind === "allergy_confirmed") {
    return (
      <span className="inline-flex items-center" style={{ ...BASE, fontWeight: 800, background: INK.hiBg, color: INK.hi }}>
        <TriangleAlert size={12} strokeWidth={2.4} aria-hidden style={NO_ICON_SCALE} />
        {severity ? `${label} (${severity})` : label}
      </span>
    );
  }
  if (kind === "allergy_check" || kind === "restriction") {
    return (
      <span className="inline-flex items-center" style={{ ...BASE, fontWeight: 700, background: INK.goldPale, color: INK.goldInk }}>
        <CircleAlert size={12} strokeWidth={2.2} aria-hidden style={NO_ICON_SCALE} />
        {kind === "allergy_check" ? "Check this" : label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center" style={{ ...BASE, fontWeight: 700, background: INK.soft, color: INK.chS }}>
      {label}
    </span>
  );
};
