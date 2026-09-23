/**
 * Foods whose nutrition is COMPUTED from real FDC-measured data rather than
 * read off a single FDC row, because FDC has no row for them.
 *
 * Two foods in this catalog are in that position, and both were checked
 * against every other option first (see this session's investigation):
 *
 *   Toum — a garlic/oil emulsion. FDC's only candidate is a Survey row
 *   called "Garlic sauce" whose formulation is unstated; everything else is
 *   a branded label. But toum is four ingredients in a published ratio, and
 *   each of those four IS measured by FDC, so the sauce can be computed
 *   exactly rather than approximated.
 *
 *   Labneh — strained yogurt. FDC has nothing non-branded for it at all.
 *   Modelling it as a recipe (yogurt, strained N:1) was tried and rejected:
 *   a recipe sums its ingredients and cannot remove whey, so it concentrates
 *   the lactose it should be draining away, and no single strain factor can
 *   reach labneh's measured fat-to-protein ratio from any yogurt FDC
 *   publishes. What works is concentrating a measured yogurt by THREE
 *   factors rather than one — see `concentrate` below.
 *
 * These rows are written with match_confidence 'computed', which is a third
 * value alongside 'exact'/'fuzzy' (the column is free text with no check
 * constraint, and nothing in the app branches on it). 'manual' already means
 * "a person chose this FDC row"; 'computed' means "no FDC row was chosen,
 * these numbers were derived" — a different claim, and one a reader should
 * be able to tell apart at a glance.
 *
 * fdc_id is left null for these, because there is no single id that produced
 * them. fdc_description carries the derivation in words instead.
 */

import { NUTRIENT_SECTIONS } from "../src/data/nutrientSchema";

/** Which of a concentrate's three factors scales a given nutrient. */
export type Partition = "fat" | "curd" | "serum";

export interface ComputedRecipe {
  kind: "recipe";
  /** Grams of finished product in one catalog serving. */
  servingGrams: number;
  /** Grams the whole batch yields, INCLUDING any nutritionally inert water. */
  yieldGrams: number;
  ingredients: { label: string; fdcId: number; grams: number }[];
  derivation: string;
  sources: string[];
}

export interface ComputedConcentrate {
  kind: "concentrate";
  servingGrams: number;
  base: { label: string; fdcId: number };
  /**
   * Measured per-100 g composition of the FINISHED food, from the literature.
   * These three are what the whole profile is pinned to: each becomes a
   * scaling factor against the base's own measured value for the same
   * nutrient, and every other nutrient rides one of the three.
   */
  anchors: { fatG: number; proteinG: number; waterG: number };
  derivation: string;
  sources: string[];
}

export type ComputedFood = ComputedRecipe | ComputedConcentrate;

// ---------------------------------------------------------------------------
// How a concentrate's nutrients are partitioned
// ---------------------------------------------------------------------------

/**
 * WHY THREE FACTORS AND NOT ONE. Straining yogurt does two different things
 * at once: it keeps the curd (fat, casein, and what is bound to them) and it
 * pours away serum (water, and what is dissolved in it). A single
 * concentration factor models only the first and gets the second exactly
 * backwards — lactose ends up concentrated when straining is the very thing
 * removing it.
 *
 * So each nutrient is scaled by whichever of three factors matches where it
 * actually goes:
 *
 *   fat   — fat, fatty acids, cholesterol and the fat-soluble vitamins and
 *           carotenoids, which travel with the fat globules.
 *   curd  — protein, the amino acids, and the minerals bound to the casein
 *           micelle (calcium, phosphorus, magnesium, zinc, and the trace
 *           metals that follow protein).
 *   serum — water, the sugars, sodium/potassium/chloride, the water-soluble
 *           vitamins, and anything else in solution. This factor is BELOW 1:
 *           per 100 g of the finished food there is less water than there
 *           was per 100 g of yogurt, and the dissolved load falls with it.
 *
 * The split is a modelling judgement, not a measurement, which is the honest
 * reason these rows are 'computed' rather than anything stronger. It does get
 * one free check: calcium is not an anchor and lands at ~262 mg/100 g, against
 * the 265 mg/100 g the FAO/USDA Near East table publishes for drained yogurt.
 */
const PARTITION_BY_SECTION: Record<string, Partition> = {
  popular: "curd",
  carbs: "serum",
  vitamins: "serum",
  minerals: "curd",
  amino: "curd",
  omegas: "fat",
  mct: "fat",
  others: "serum",
};

const PARTITION_BY_KEY: Record<string, Partition> = {
  // Fat and what dissolves in it.
  total_fat: "fat",
  saturated_fat: "fat",
  trans_fat: "fat",
  monounsaturated_fat: "fat",
  polyunsaturated_fat: "fat",
  cholesterol: "fat",
  phytosterols: "fat",
  vitamin_a: "fat",
  vitamin_d: "fat",
  vitamin_e_alpha_tocopherol: "fat",
  vitamin_k: "fat",
  beta_carotene: "fat",
  alpha_carotene: "fat",
  beta_cryptoxanthin: "fat",
  lycopene: "fat",
  lutein_zeaxanthin: "fat",

  // Sugars and fibre are in solution, not in the curd.
  total_carbohydrates: "serum",
  dietary_fiber: "serum",
  total_sugars: "serum",
  added_sugars: "serum",

  // Electrolytes and the trace elements that do not follow casein.
  sodium: "serum",
  potassium: "serum",
  chloride: "serum",
  iodine: "serum",
  chromium: "serum",
  molybdenum: "serum",
  fluoride: "serum",

  water: "serum",
};

export function partitionFor(key: string, sectionId: string): Partition {
  return PARTITION_BY_KEY[key] ?? PARTITION_BY_SECTION[sectionId] ?? "serum";
}

/**
 * Calories are RECOMPUTED from the scaled macros rather than scaled by any one
 * factor, because energy is not a substance that partitions — it is a sum over
 * three things that each moved by a different amount. Atwater's 4/9/4, plus 7
 * for alcohol where a food has any.
 */
export function atwaterCalories(values: Record<string, number>): number {
  const protein = values.protein ?? 0;
  const fat = values.total_fat ?? 0;
  const carbs = values.total_carbohydrates ?? 0;
  const alcohol = values.alcohol ?? 0;
  return 4 * protein + 9 * fat + 4 * carbs + 7 * alcohol;
}

/**
 * Section id for every canonical key, so the partition can be looked up.
 *
 * A handful of keys appear in two sections — the "Popular Nutrients" section
 * repeats calcium, iron, sodium, potassium, vitamin D and the carbohydrate
 * rows that also live in their own sections. Every one of those is pinned
 * explicitly in PARTITION_BY_KEY above, so which of the two a key resolves to
 * here cannot change an answer.
 */
export const SECTION_BY_KEY: Record<string, string> = Object.fromEntries(
  NUTRIENT_SECTIONS.flatMap((section) =>
    (section.sub ? [...section.rows, ...section.sub.rows] : section.rows).map(
      (row) => [row.key, section.id] as const
    )
  )
);

// ---------------------------------------------------------------------------
// The foods
// ---------------------------------------------------------------------------

export const FDC_COMPUTED: Record<string, ComputedFood> = {
  Toum: {
    kind: "recipe",
    // 1 tbsp of the finished emulsion. The batch below is ~856 g and the
    // recipe calls it a quart, which at toum's density is ~61 tablespoons —
    // so the batch divided by its own tablespoon count agrees with the
    // 14 g/tbsp an oil-and-water emulsion weighs. Two ways of getting there,
    // same number.
    servingGrams: 14,
    // Ingredients plus the ice water, which carries no nutrients but is part
    // of what comes out of the food processor and therefore part of what a
    // tablespoon is 1/61st of. Leaving it out would overstate every nutrient
    // by 7.5%.
    yieldGrams: 856,
    ingredients: [
      { label: "Garlic, raw", fdcId: 169230, grams: 130 },
      // SR Legacy rather than the Survey row the catalog's own Canola Oil
      // food matched: same oil, and SR Legacy publishes the full fatty-acid
      // breakdown that a 70%-oil sauce needs.
      { label: "Oil, canola", fdcId: 172336, grams: 600 },
      { label: "Lemon juice, raw", fdcId: 167747, grams: 60 },
      { label: "Salt, table", fdcId: 173468, grams: 6 },
    ],
    derivation:
      "Computed from FDC 169230 (garlic) + 172336 (canola oil) + 167747 (lemon juice) + 173468 (salt) at the Serious Eats ratio, over an 856 g yield",
    sources: [
      "Serious Eats, 'Traditional Toum (Lebanese Garlic Sauce)' (Sohla El-Waylly): 130 g garlic, 600 g neutral oil, 60 g lemon juice, 60 g ice water, 2 tsp Diamond Crystal kosher salt (~6 g), yielding 1 quart. https://www.seriouseats.com/traditional-toum",
    ],
  },

  Labneh: {
    kind: "concentrate",
    // 2 tbsp, the catalog's own serving. Labneh is a little denser than
    // water, so a tablespoon is ~15 g and the serving ~30 g.
    servingGrams: 30,
    base: { label: "Yogurt, plain, whole milk", fdcId: 171284 },
    // WHY THESE THREE NUMBERS. Four sources describe labneh's composition and
    // they do not agree, so the anchors take the overlap rather than any one
    // of them:
    //
    //   Tamime & Robinson (1999) specify 23-25% total solids and 9-11% fat.
    //   That is a specification, and it is the highest of the four.
    //
    //   Three independent measurements sit lower. Abou Jaoude et al. (2010),
    //   on Lebanese labneh, measured 78.6 g/100 g moisture (21.4% solids).
    //   A separate characterisation study reports 20.5-22.5% solids,
    //   6.7-8.2% protein and 7.8-8.9% fat. Bhaskaracharya et al. (2024),
    //   surveying the UAE retail market, put full-fat labneh at 7.1-8% fat
    //   and note its composition matches traditional labneh.
    //
    // So: fat takes 9.0, the lowest value Tamime allows and just above the
    // highest the measurements show — the one point where specification and
    // measurement meet. Water takes 78.0, between the measured 78.6 and
    // Tamime's implied 75-77. Protein takes 7.5, the midpoint of the only
    // measured protein range available.
    //
    // The result is ~128 kcal/100 g, inside the 118-293 kcal/100 g the 2024
    // market survey found on real labneh labels, and roughly a third of what
    // this catalog previously claimed.
    anchors: { fatG: 9.0, proteinG: 7.5, waterG: 78.0 },
    derivation:
      "Computed from FDC 171284 (plain whole-milk yogurt) concentrated to measured labneh composition: 9.0 g fat, 7.5 g protein, 78.0 g water per 100 g",
    sources: [
      "Tamime, A.Y. & Robinson, R.K. (1999), Yoghurt: Science and Technology — labneh at 23-25% total solids, 9-11% fat.",
      "Abou Jaoude, D., Olabi, A., Najm, N.E.O., Malek, A., Saadeh, C., Baydoun, E. & Toufeili, I. (2010), 'Chemical composition, mineral content and cholesterol levels of some regular and reduced-fat white brined cheeses and strained yogurt (Labneh)', Dairy Science & Technology 90(6), 699-706, doi:10.1051/dst/2010026 — Lebanese labneh moisture 78.6 g/100 g.",
      "Bhaskaracharya, R.K., Alnuaimi, F.S.R., Aldarmaki, S.R.J., Abdulazeez, A. & Ayyash, M. (2024), 'Labneh: A Retail Market Analysis and Selected Product Characterization', Foods 13(21), 3461 — full-fat labneh 7.1-8% fat, 8.6-12.7% protein, 2.3-8% carbohydrate; market energy range 118.2-293 kcal/100 g.",
      "FAO/USDA Food and Nutrition Paper 26 (1982), Food Composition Tables for the Near East, Table I item 767 'YOGURT - drained' — used only as an independent check on calcium (265 mg/100 g), not as an anchor.",
    ],
  },
};
