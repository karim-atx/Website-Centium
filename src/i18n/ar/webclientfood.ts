import type { Catalogue } from "../core";

// Website viewport v1, Arabic: the web Food pages at 1024px and wider (WC-FO
// Diary, Goals & Macros, Custom, WC-FO.4 Nutrient Summary). Every label the
// mobile Food screens already use keeps its Arabic from the food areas; only
// the web-only lines are here.

// Source files this catalogue covers (paths from src/). The catalogue test
// checks every t/tn/tk key in them has Arabic here or in another area file,
// and that no English is left outside t() in their JSX.
export const FILES: string[] = [
  "pages/food/Food.web.tsx",
  "pages/food/NutrientSummaryPage.web.tsx",
  "pages/food/web/FoodWebMenu.tsx",
  "pages/food/web/FoodWebTabs.tsx",
  "pages/food/web/NutrientSectionsWeb.tsx",
  "pages/food/web/GoalsPanel.web.tsx",
  "pages/food/web/CustomPanel.web.tsx",
  "components/food/web/ChipScrollbar.tsx",
];

const webclientfood: Catalogue = {
  // == The Diary panel (pages/food/Food.web, WC-FO.1.4): the back button from a food to the whole day ==
  "Back to the day's summary": "العودة إلى ملخّص اليوم",

  // == Custom (pages/food/web/CustomPanel.web, WC-FO.3): a column that could not load; web has Retry, not pull ==
  "Couldn't load your meals.": "تعذّر تحميل وجباتك.",
  "Couldn't load your recipes.": "تعذّر تحميل وصفاتك.",
  "Couldn't load your custom foods.": "تعذّر تحميل أطعمتك المخصّصة.",
};

export default webclientfood;
