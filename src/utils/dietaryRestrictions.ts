import type { Food } from "../types";

// QA 11.0: "another button should include dietary restriction that when
// pressed shows many dietary restrictions in a drop down box. Pressing a
// specific restriction will highlight specific food diary items that are
// not compatible with the restriction." A prototype stand-in for a real
// per-food ingredient tag system: flags a food by matching its name
// against a small keyword list per restriction.
export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten_free"
  | "dairy_free"
  | "nut_free"
  | "low_carb"
  | "pescatarian";

export const dietaryRestrictionOptions: { value: DietaryRestriction; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "gluten_free", label: "Gluten-Free" },
  { value: "dairy_free", label: "Dairy-Free" },
  { value: "nut_free", label: "Nut-Free" },
  { value: "low_carb", label: "Low-Carb" },
  { value: "pescatarian", label: "Pescatarian" },
];

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
};

export function isFoodRestricted(food: Food, restriction: DietaryRestriction): boolean {
  const name = food.name.toLowerCase();
  return RESTRICTED_KEYWORDS[restriction].some((kw) => name.includes(kw));
}
