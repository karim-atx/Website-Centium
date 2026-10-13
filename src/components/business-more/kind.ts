import type { BusinessTypeValue } from "../../services/business-more";

// The business's lane for the MO1B per-type rows (COPY.md "Type variants",
// More (MO1)): Classes (stored "studio", D8), Gym, or a store (the five store
// types). Wellness Service is a store that may offer appointments.

export type BizKind = "classes" | "gym" | "store";

export function bizKindOf(type: string | null | undefined): BizKind {
  if (type === "studio") return "classes";
  if (type === "gym") return "gym";
  return "store";
}

/** Business type labels (MO1B-015; D8 adds Classes, first). */
export const BUSINESS_TYPE_OPTIONS: { value: BusinessTypeValue; label: string }[] = [
  { value: "studio", label: "Classes" },
  { value: "gym", label: "Gym" },
  { value: "store", label: "Store" },
  { value: "supplement_store", label: "Supplement Store" },
  { value: "equipment_seller", label: "Equipment Seller" },
  { value: "wellness_service", label: "Wellness Service" },
  { value: "clothing_store", label: "Clothing Store" },
  { value: "meal_prep_service", label: "Meal-Prepping Service" },
];

export const typeLabel = (type: string | null | undefined): string =>
  BUSINESS_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? "Business";

/** COPY vocabulary: Staff. */
export const STAFF_LABEL: Record<BizKind, string> = { classes: "Instructors", gym: "Employees", store: "Staff" };

/** The venue kind a new location takes (B5 venue_kind). */
export function venueKindOf(type: string | null | undefined): "gym" | "studio" | "store" | "wellness" {
  if (type === "studio") return "studio";
  if (type === "gym") return "gym";
  if (type === "wellness_service") return "wellness";
  return "store";
}

/**
 * Explore categories (business_profiles.categories, a closed set of B5 keys,
 * at most 5). The chips per lane are the keys that apply to it.
 */
export const CATEGORY_LABEL: Record<string, string> = {
  gym: "Gym",
  studio: "Studio",
  crossfit: "CrossFit",
  pilates: "Pilates",
  yoga: "Yoga",
  boxing: "Boxing",
  martial_arts: "Martial arts",
  swimming: "Swimming",
  dance: "Dance",
  physiotherapy: "Physiotherapy",
  nutrition: "Nutrition",
  supplements: "Supplements",
  equipment: "Equipment",
  clothing: "Clothing",
  meal_prep: "Meal prep",
  spa: "Spa",
  recovery: "Recovery",
  other: "Other",
};

export const CATEGORY_KEYS: Record<BizKind, string[]> = {
  classes: ["studio", "pilates", "yoga", "boxing", "martial_arts", "dance", "crossfit", "swimming", "recovery", "other"],
  gym: ["gym", "crossfit", "boxing", "martial_arts", "swimming", "yoga", "pilates", "physiotherapy", "recovery", "other"],
  store: ["supplements", "nutrition", "equipment", "clothing", "meal_prep", "recovery", "spa", "physiotherapy", "other"],
};

export const MAX_CATEGORIES = 5;

export const initialsOf = (name: string): string =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "B";
