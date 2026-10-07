import type { OfferingCategory } from "../../services/business-offerings";

/** MO1.4.1's sub-tabs, keyed by the business_type enum. */
export const BUSINESS_TYPES: { key: string; label: string }[] = [
  { key: "clothing_store", label: "Clothing" },
  { key: "equipment_seller", label: "Equipment" },
  { key: "supplement_store", label: "Supplements" },
  { key: "meal_prep_service", label: "Meal prep" },
  { key: "wellness_service", label: "Wellness" },
];

const OTHER_TYPES: Record<string, string> = { gym: "Gym", store: "Store" };

/** A business type as Explore names it. */
export const typeLabel = (t: string) =>
  BUSINESS_TYPES.find((x) => x.key === t)?.label ?? OTHER_TYPES[t] ?? t.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

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
