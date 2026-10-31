// Release 3 · access_category labels for notification sentences, from the
// client's own sharing screen (services/consent ACCESS_CATEGORIES), plus the
// two DB-1 switches that screen gains in W7.
import { ACCESS_CATEGORIES } from "../../../services/consent";
import { tk } from "../../../i18n/core";

export const CATEGORY_LABEL: Record<string, string> = {
  ...Object.fromEntries(ACCESS_CATEGORIES.map((c) => [c.category, c.label.toLowerCase()])),
  allergies_dietary: tk("allergies and dietary needs"),
  habits: tk("habits"),
};
