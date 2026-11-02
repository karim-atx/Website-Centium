// QA 11.0: "another button should include dietary restriction that when
// pressed shows many dietary restrictions in a drop down box. Pressing a
// specific restriction will highlight specific food diary items that are
// not compatible with the restriction." A prototype stand-in for a real
// per-food ingredient tag system: flags a food by matching its name
// against a small keyword list per restriction.
import { t, tk } from "../i18n/core";

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "low_carb"
  | "pescatarian"
  // Database 20261222075000: the diets the approved form templates carry.
  | "halal"
  | "kosher";

export const dietaryRestrictionOptions: { value: DietaryRestriction; label: string }[] = [
  { value: "vegetarian", label: tk("Vegetarian") },
  { value: "vegan", label: tk("Vegan") },
  { value: "gluten_free", label: tk("Gluten-Free") },
  { value: "dairy_free", label: tk("Dairy-Free") },
  { value: "nut_free", label: tk("Nut-Free") },
  { value: "low_carb", label: tk("Low-Carb") },
  { value: "pescatarian", label: tk("Pescatarian") },
  { value: "halal", label: tk("Halal") },
  { value: "kosher", label: tk("Kosher") },
];

/**
 * A diet as words: its label, or, for a value the app doesn't know yet (the
 * Database can add one before the app does), the value itself in words
 * ("gluten_free" -> "Gluten free"), never the raw code.
 */
export function dietLabel(value: string | null | undefined): string {
  if (!value) return "";
  const known = dietaryRestrictionOptions.find((o) => o.value === value);
  if (known) return t(known.label);
  const words = value.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "";
}

const RESTRICTED_KEYWORDS: Record<DietaryRestriction, string[]> = {
  vegetarian: ["chicken", "beef", "lamb", "meat", "shawarma", "fish", "salmon", "tuna", "shrimp", "bacon", "sujuk", "kafta"],
  vegan: [
    "chicken", "beef", "lamb", "meat", "shawarma", "fish", "salmon", "tuna", "shrimp", "bacon", "sujuk", "kafta",
    "labneh", "cheese", "milk", "yogurt", "cream", "butter", "egg", "honey",
  ],
  gluten_free: ["bread", "pasta", "pita", "manoushe", "man'oushe", "wheat", "pastry", "cake", "cookie", "noodle", "bulgur", "freekeh"],
  dairy_free: ["labneh", "cheese", "milk", "yogurt", "cream", "butter", "halloumi", "kishk"],
  nut_free: ["almond", "walnut", "pistachio", "cashew", "pine nut", "hazelnut", "peanut", "nut"],
  low_carb: ["bread", "rice", "pasta", "pita", "manoushe", "man'oushe", "potato", "sugar", "cake", "sweet"],
  pescatarian: ["chicken", "beef", "lamb", "meat", "shawarma", "bacon", "sujuk", "kafta"],
  halal: ["pork", "bacon", "ham", "lard"],
  kosher: ["pork", "bacon", "ham", "lard", "shrimp", "lobster", "crab"],
};

// Takes just a name: a diary entry snapshots its name but not the catalog
// Food it came from, and the keyword match never needed anything else.
export function isFoodRestricted(food: { name: string }, restriction: DietaryRestriction): boolean {
  const name = food.name.toLowerCase();
  return RESTRICTED_KEYWORDS[restriction].some((kw) => name.includes(kw));
}
