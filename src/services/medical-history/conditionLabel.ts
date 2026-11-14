// Batch D GJ: PCOS is shown by its new name, "PMOS (formerly PCOS)", and in
// Arabic «PMOS (متلازمة تكيّس المبايض سابقًا)» until an official Arabic term
// exists. Display only: nothing stored changes. The cycle tracker keeps the
// key "pcos" (cycle_settings.conditions), and the medical-history chip keeps
// saving the text "PCOS" (comorbidities.condition), so rows saved before and
// after the rename read the same way.
//
// Pure (no DOM), so node --test loads it.

import { t, tk } from "../../i18n/core";

/** The renamed condition's label, through t(). */
export const PMOS_LABEL = tk("PMOS (formerly PCOS)");

/** What the medical-history chip saves (and what rows saved before the rename say). */
export const PCOS_STORED = "PCOS";

/**
 * A medical-history condition as shown when the text is the chip's own: the
 * stored "PCOS" reads as PMOS. Anything a person typed themselves is shown
 * as they wrote it, never renamed.
 */
export function storedConditionText(stored: string): string {
  return stored === PCOS_STORED ? t(PMOS_LABEL) : stored;
}
