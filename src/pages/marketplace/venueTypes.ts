import type { OfferingCategory } from "../../services/business-offerings";
import { t, tk } from "../../i18n/core";

/** MO1.4.1's sub-tabs, keyed by the business_type enum. */
export const BUSINESS_TYPES: { key: string; label: string }[] = [
  { key: "clothing_store", label: tk("Clothing") },
  { key: "equipment_seller", label: tk("Equipment") },
  { key: "supplement_store", label: tk("Supplements") },
  { key: "meal_prep_service", label: tk("Meal prep") },
  { key: "wellness_service", label: tk("Wellness") },
];

const OTHER_TYPES: Record<string, string> = { gym: tk("Gym"), store: tk("Store") };

/** A business type as Explore names it (translated where shown). */
export const typeLabel = (type: string) => {
  const known = BUSINESS_TYPES.find((x) => x.key === type)?.label ?? OTHER_TYPES[type];
  return known ? t(known) : type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
};

/** The offerings categories' names (data/mockProfessionals' marketplaceCategories), translated where shown. */
const CATEGORY_LABELS: Record<string, string> = {
  gyms: tk("Gyms"),
  classes: tk("Classes"),
  stores: tk("Stores"),
  clothing: tk("Clothing"),
  equipment: tk("Equipment"),
  supplements: tk("Supplements"),
  wellness: tk("Wellness Services"),
  meal_prep: tk("Meal Prepping"),
};
export const categoryLabel = (c: string): string => (CATEGORY_LABELS[c] ? t(CATEGORY_LABELS[c]) : c);

/**
 * The offerings category a business type sells in, so a business page can
 * link to its category page (decision 23, item 46: the "More categories" grid
 * is gone, and the category pages are reached from the businesses instead).
 */
export const TYPE_CATEGORY: Record<string, OfferingCategory> = {
  clothing_store: "clothing",
  equipment_seller: "equipment",
  supplement_store: "supplements",
  meal_prep_service: "meal_prep",
  wellness_service: "wellness",
  store: "stores",
};
