/**
 * Foods whose nutrition is COMPUTED from real FDC-measured data rather than
 * read off a single FDC row, because FDC has no row for them.
 *
 * Toum and Labneh were the first two, and both were checked against every
 * other option first. Eleven Lebanese and other dishes with no FDC row
 * (manakeesh, kibbeh, fattoush, shawarma and the rest) follow at the end of
 * the table, each from a cited published recipe and sized to the catalog's
 * own calories — see the note above them.
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
  /**
   * Grams of finished product in one catalog serving. Give this OR
   * servingKcal, never both.
   */
  servingGrams?: number;
  /**
   * The catalog's own calories for one serving. When set, the serving is
   * sized from the recipe's computed energy density so its calories equal
   * this figure — used where no weight for the catalog's serving ("1 bowl",
   * "1 piece" of a differently sized recipe) is published, so the nutrient
   * breakdown agrees with the calories the app already shows. It is the
   * recipe's PROPORTIONS that are sourced; the serving size is the catalog's.
   */
  servingKcal?: number;
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

  // ---------------------------------------------------------------------------
  // Dishes FDC has no row for, computed from a published recipe and SIZED TO
  // THE CATALOG'S OWN CALORIES (servingKcal). The recipe fixes the proportions
  // — so the balance of protein, fat, fibre, vitamins and minerals is the
  // dish's — and the serving is whatever amount of it carries the calories
  // the app already shows, since none of these catalog servings ("1 piece",
  // "1 bowl", "1 wrap") has a published weight that matches the recipe.
  //
  // Conventions throughout: volumes are converted with the FDC row's own
  // household portions (e.g. olive oil 1 tbsp = 13.5 g, bulgur 1 cup = 140 g,
  // all-purpose flour 1 cup = 125 g, lemon juice 1 fl oz = 30.5 g). Cooking
  // water carries no nutrients and is left out; because the serving is sized
  // by calories, the batch's water and cooking losses don't change the
  // result. Ingredients FDC has no generic row for (sumac, pomegranate
  // molasses, mahlab, akkawi) are left out or substituted, as each entry says.
  // ---------------------------------------------------------------------------

  "Manoushe Zaatar": {
    kind: "recipe",
    servingKcal: 420,
    // The whole batch makes 4 manakeesh. 24 g of za'atar blend is split per
    // Abood's stated blend — dried thyme, sumac and sesame in equal parts,
    // salt at half a part (3.5 parts): 6.9 g each and 3.4 g salt. Sumac has
    // no FDC row and is left out (6.9 g of 1,000+).
    yieldGrams: 352.2,
    ingredients: [
      { label: "Wheat flour, bread", fdcId: 168896, grams: 248 },
      { label: "Yeast, baker's, active dry", fdcId: 175043, grams: 5 },
      { label: "Sugar, granulated", fdcId: 169655, grams: 4 },
      { label: "Salt (dough 12 g + za'atar 3.4 g)", fdcId: 173468, grams: 15.4 },
      { label: "Olive oil (dough 4 g + topping 62 g)", fdcId: 171413, grams: 66 },
      { label: "Thyme, dried (za'atar)", fdcId: 170938, grams: 6.9 },
      { label: "Sesame seeds (za'atar)", fdcId: 170150, grams: 6.9 },
    ],
    derivation:
      "Computed from Maureen Abood's za'atar manakeesh (all weights in grams; FDC 168896 bread flour, 171413 olive oil, 170938 thyme, 170150 sesame), sized to the catalog's calories",
    sources: [
      "Maureen Abood, Lebanese Baking (2024): Za'atar Manakeesh — 248 g bread flour, 5 g instant yeast, 4 g sugar, 12 g salt, 4 g olive oil in the dough; 24 g za'atar with 62 g olive oil on top; makes 4. https://www.kingarthurbaking.com/recipes/zaatar-manakeesh-recipe and https://www.splendidtable.org/story/2025/10/31/zaatar-manakeesh",
      "Za'atar blend (equal parts thyme, sumac, sesame; half-part salt) per Maureen Abood, https://maureenabood.com/what-is-zaatar-and-how-to-cook-with-zaatar/ — read from a search snippet; the page itself could not be opened to confirm.",
    ],
  },

  "Manoushe Jebneh": {
    kind: "recipe",
    servingKcal: 460,
    // Same Abood dough; her cheese topping: 226 g mozzarella (standing in
    // for akkawi, which FDC lists only as branded rows), 25 g olive oil, 9 g
    // onion, 2 garlic cloves (FDC 1 clove = 3 g) and 1 tbsp dried mint
    // (FDC 1 tbsp = 1.6 g).
    yieldGrams: 540.6,
    ingredients: [
      { label: "Wheat flour, bread", fdcId: 168896, grams: 248 },
      { label: "Yeast, baker's, active dry", fdcId: 175043, grams: 5 },
      { label: "Sugar, granulated", fdcId: 169655, grams: 4 },
      { label: "Salt", fdcId: 173468, grams: 12 },
      { label: "Olive oil (dough 4 g + topping 25 g)", fdcId: 171413, grams: 29 },
      { label: "Mozzarella, whole milk (for akkawi)", fdcId: 170845, grams: 226 },
      { label: "Onion, raw", fdcId: 170000, grams: 9 },
      { label: "Garlic, raw (2 cloves)", fdcId: 169230, grams: 6 },
      { label: "Spearmint, dried (1 tbsp)", fdcId: 172239, grams: 1.6 },
    ],
    derivation:
      "Computed from Maureen Abood's cheese manakeesh (FDC 168896 bread flour, 170845 mozzarella for akkawi, 171413 olive oil), sized to the catalog's calories",
    sources: [
      "Maureen Abood, Lebanese Baking (2024), via King Arthur Baking — manakeesh dough as for za'atar; cheese topping 226 g mozzarella, 25 g olive oil, 9 g onion, 2 garlic cloves, 1 tbsp dried mint; 4 pieces. https://www.kingarthurbaking.com/recipes/zaatar-manakeesh-recipe",
    ],
  },

  Kibbeh: {
    kind: "recipe",
    servingKcal: 280,
    // Hadia Zebib's fried kibbeh, 35 pieces. Bulgur 2½ cups + 4 tbsp at FDC
    // 1 cup = 140 g (385 g); onions 1 medium + 3 large at FDC 110 g / 150 g
    // (560 g); pine nuts ⅓ cup at FDC 1 cup = 135 g (45 g); sunflower oil
    // ¼ cup at FDC 1 cup = 218 g (54.5 g); salt 2 tsp at 6 g. The spices
    // (small unmeasured amounts) are left out. Deep-frying oil taken up is
    // not published anywhere found and is NOT counted.
    yieldGrams: 2056.5,
    ingredients: [
      { label: "Veal, leg, lean, raw (shell)", fdcId: 175269, grams: 500 },
      { label: "Bulgur, dry", fdcId: 170688, grams: 385 },
      { label: "Onions, raw", fdcId: 170000, grams: 560 },
      { label: "Lamb, ground, raw (filling)", fdcId: 174370, grams: 500 },
      { label: "Pine nuts", fdcId: 170591, grams: 45 },
      { label: "Sunflower oil (filling)", fdcId: 171025, grams: 54.5 },
      { label: "Salt", fdcId: 173468, grams: 12 },
    ],
    derivation:
      "Computed from Hadia Zebib's fried kibbeh (FDC 175269 veal, 174370 lamb, 170688 bulgur, 170000 onion, 170591 pine nuts), frying oil not counted, sized to the catalog's calories",
    sources: [
      "Hadia's Lebanese Cuisine (Hadia Zebib), Kibbeh — 500 g veal leg, 2½ cups + 4 tbsp fine bulgur, 1 + 3 large onions, 500 g minced lamb, ⅓ cup pine nuts, ¼ cup sunflower oil, 2 tsp salt; 35 pieces. https://hadiaslebanesecuisine.com/blog/?p=4189",
    ],
  },

  Fattoush: {
    kind: "recipe",
    servingKcal: 190,
    // RecipeTin Eats, serves 5–6. Pita 2 at FDC large pita = 60 g; olive oil
    // 2 tbsp + ¼ cup at 13.5 g/tbsp (81 g); romaine 5 cups at FDC 47 g/cup
    // shredded; ½ small red onion at FDC small = 70 g; 5 radishes at FDC
    // 4.5 g; mint ½ cup at FDC 2 tbsp = 11.4 g (45.6 g); lemon juice 2 tbsp
    // = 1 fl oz (30.5 g); 1 garlic clove; ½ tsp salt. Left out: the
    // cucumbers (Lebanese cucumbers have no published weight), sumac and
    // pomegranate molasses (no FDC rows).
    yieldGrams: 775.6,
    ingredients: [
      { label: "Pita, white", fdcId: 174915, grams: 120 },
      { label: "Olive oil", fdcId: 171413, grams: 81 },
      { label: "Romaine, raw", fdcId: 169247, grams: 235 },
      { label: "Tomatoes, cherry (recipe: 1 cup, 200 g)", fdcId: 170457, grams: 200 },
      { label: "Onion, red, raw", fdcId: 170000, grams: 35 },
      { label: "Radishes, raw", fdcId: 169276, grams: 22.5 },
      { label: "Spearmint, fresh", fdcId: 173475, grams: 45.6 },
      { label: "Lemon juice", fdcId: 167747, grams: 30.5 },
      { label: "Garlic, raw", fdcId: 169230, grams: 3 },
      { label: "Salt", fdcId: 173468, grams: 3 },
    ],
    derivation:
      "Computed from RecipeTin Eats' fattoush (FDC 174915 pita, 171413 olive oil, 169247 romaine, 170457 tomato; cucumber, sumac and pomegranate molasses left out), sized to the catalog's calories",
    sources: [
      "RecipeTin Eats (Nagi Maehashi), Lebanese Fattoush Salad — 2 pita, 2 tbsp + ¼ cup olive oil, 5 cups romaine, 2 Lebanese cucumbers, 1 cup cherry tomatoes (200 g), ½ small red onion, 5 radishes, ½ cup mint, 2 tbsp lemon juice, 2 tsp pomegranate molasses, 1 garlic clove, sumac, ½ tsp salt; serves 5–6. https://www.recipetineats.com/lebanese-fattoush-salad/",
    ],
  },

  "Chicken Shawarma": {
    kind: "recipe",
    servingKcal: 620,
    // Mama's Lebanese Kitchen, 6 sandwiches. Chicken 2.5 lb (1,134 g; the
    // recipe doesn't say breast or thigh — breast used); lemon juice ½ cup
    // (FDC 1 cup = 244 g); yogurt 4 tbsp (FDC 1 cup = 245 g); olive oil
    // 2 tbsp; 6 pita (FDC large = 60 g); pickles ½ lb; 4 tomatoes (FDC
    // medium 123 g); fries 2 cups (FDC 2709461 1 cup = 60 g). The garlic
    // paste, 6 tsp (~28 g at toum's 14 g/tbsp), is split into the Toum
    // recipe's own ingredients in its ratio (130:600:60:6 over 856 g).
    yieldGrams: 2569.1,
    ingredients: [
      { label: "Chicken breast, raw", fdcId: 171077, grams: 1134 },
      { label: "Lemon juice (marinade)", fdcId: 167747, grams: 122 },
      { label: "Yogurt, plain, whole milk", fdcId: 171284, grams: 61 },
      { label: "Olive oil", fdcId: 171413, grams: 27 },
      { label: "Pita, white (6)", fdcId: 174915, grams: 360 },
      { label: "Pickles, dill", fdcId: 168558, grams: 227 },
      { label: "Tomatoes (4)", fdcId: 170457, grams: 492 },
      { label: "French fries, fast food (2 cups)", fdcId: 2709461, grams: 120 },
      { label: "Garlic (in toum)", fdcId: 169230, grams: 4.3 },
      { label: "Canola oil (in toum)", fdcId: 172336, grams: 19.6 },
      { label: "Lemon juice (in toum)", fdcId: 167747, grams: 2 },
      { label: "Salt (in toum)", fdcId: 173468, grams: 0.2 },
    ],
    derivation:
      "Computed from Mama's Lebanese Kitchen chicken shawarma sandwiches (FDC 171077 chicken breast, 174915 pita, 168558 pickles, 2709461 fries, toum as its own recipe), sized to the catalog's calories",
    sources: [
      "Mama's Lebanese Kitchen, Chicken Shawarma — 2.5 lb chicken, ½ cup lemon juice, 4 tbsp yogurt, 2 tbsp olive oil, 6 pita, 6 tsp garlic paste, ½ lb pickles, 4 tomatoes, 2 cups fries; 6 sandwiches. https://mamaslebanesekitchen.com/poultry/chicken-shawarma-recipe-garlic/",
      "Garlic paste as Toum: Serious Eats, 'Traditional Toum' — see the Toum entry above.",
    ],
  },

  "Shish Tawook": {
    kind: "recipe",
    servingKcal: 320,
    // Mama's Lebanese Kitchen, serves 4. The whole marinade is counted as
    // eaten — how much clings to the chicken is not published — which
    // overstates oil a little: this lands near 34 g protein / 17 g fat per
    // 320 kcal against the catalog's 40 / 14. Lemon juice 1 cup (244 g),
    // yogurt 6 tbsp (FDC 1 cup = 245 g), olive oil 6 tbsp (13.5 g), 15
    // garlic cloves (3 g).
    yieldGrams: 1369,
    ingredients: [
      { label: "Chicken breast, raw", fdcId: 171077, grams: 907 },
      { label: "Lemon juice", fdcId: 167747, grams: 244 },
      { label: "Yogurt, plain, whole milk", fdcId: 171284, grams: 92 },
      { label: "Olive oil", fdcId: 171413, grams: 81 },
      { label: "Garlic, raw", fdcId: 169230, grams: 45 },
    ],
    derivation:
      "Computed from Mama's Lebanese Kitchen shish tawook (FDC 171077 chicken breast with its whole yogurt-lemon-garlic marinade), sized to the catalog's calories",
    sources: [
      "Mama's Lebanese Kitchen, Shish Tawook — 2 lb chicken breast, 1 cup lemon juice, 6 tbsp yogurt, 6 tbsp olive oil, 15 garlic cloves; serves 4. https://mamaslebanesekitchen.com/poultry/shish-tawook-chicken-kabob-recipe/",
    ],
  },

  Kaak: {
    kind: "recipe",
    servingKcal: 260,
    // Hadia Zebib's ka'ak al-asreya, 9 pieces. Flour 1 kg + 2 tbsp (FDC
    // 1 cup = 125 g → 7.8 g/tbsp); sugar ⅓ cup (100 g, stated); yeast 2 tbsp
    // (FDC 1 tbsp = 12 g); salt ½ tsp + pinch (3 g); olive oil 2 tbsp; sesame
    // 1 cup (FDC 1 cup = 144 g). Her pieces are about twice the catalog's
    // 260 kcal, so the catalog's serving is roughly half of one.
    yieldGrams: 1313.6,
    ingredients: [
      { label: "Wheat flour, all-purpose", fdcId: 168894, grams: 1015.6 },
      { label: "Sugar, granulated", fdcId: 169655, grams: 100 },
      { label: "Yeast, baker's, active dry", fdcId: 175043, grams: 24 },
      { label: "Salt", fdcId: 173468, grams: 3 },
      { label: "Olive oil (glaze)", fdcId: 171413, grams: 27 },
      { label: "Sesame seeds", fdcId: 170150, grams: 144 },
    ],
    derivation:
      "Computed from Hadia Zebib's ka'ak al-asreya (FDC 168894 flour, 170150 sesame, 169655 sugar), sized to the catalog's calories",
    sources: [
      "Hadia's Lebanese Cuisine (Hadia Zebib), Ka'ak al-Asreya — 1 kg flour + 2 tbsp, ⅓ cup sugar (100 g), 2 tbsp instant yeast, ½ tsp salt, 2 tbsp olive oil, 1 cup sesame, 3 cups water; 9 pieces. https://hadiaslebanesecuisine.com/blog/kaak-kaak-alasreya/",
    ],
  },

  "Om Ali": {
    kind: "recipe",
    servingKcal: 410,
    // Lin's Food (Azlin Bloor), serves 6. Milk 500 ml (FDC 1 cup = 244 g →
    // 515 g); evaporated milk 250 ml (FDC 1 cup = 252 g → 266 g); pistachios
    // and almonds 1 tbsp each (FDC 1 cup = 123 g / 92 g sliced). Ashta or
    // mascarpone (250 g) has no generic FDC row: heavy cream stands in, the
    // closest generic dairy fat — an approximation.
    yieldGrams: 1524.5,
    ingredients: [
      { label: "Puff pastry, frozen, ready-to-bake", fdcId: 172790, grams: 320 },
      { label: "Milk, whole", fdcId: 171265, grams: 515 },
      { label: "Milk, evaporated", fdcId: 171276, grams: 266 },
      { label: "Sugar, granulated", fdcId: 169655, grams: 100 },
      { label: "Cream, heavy (for ashta / mascarpone)", fdcId: 170859, grams: 250 },
      { label: "Raisins, dark", fdcId: 168165, grams: 60 },
      { label: "Pistachios, dry roasted", fdcId: 170185, grams: 7.7 },
      { label: "Almonds", fdcId: 170567, grams: 5.8 },
    ],
    derivation:
      "Computed from Lin's Food om ali (FDC 172790 puff pastry, 171265 milk, 171276 evaporated milk, 170859 cream for ashta), sized to the catalog's calories",
    sources: [
      "Lin's Food (Azlin Bloor), Om Ali — 320 g puff pastry, 500 ml whole milk, 250 ml evaporated milk, 100 g sugar, 250 g ashta or mascarpone, 60 g raisins, 1 tbsp pistachios, 1 tbsp almonds; serves 6. https://www.linsfood.com/om-ali-egyptian-umm-ali/",
    ],
  },

  Maamoul: {
    kind: "recipe",
    servingKcal: 180,
    // Hadia Zebib's date maamoul, 25 pieces. Ghee 250 g + 2 tbsp (FDC butter
    // oil 1 tbsp = 12.8 g); condensed milk 200 ml (FDC 1 cup = 306 g). The
    // 500 g of dates is weighed WITH pits and is used as-is (FDC's pit share
    // isn't available through its API), which slightly overstates the dates.
    // Mahlab, orange-blossom water and mastic (small amounts) are left out.
    yieldGrams: 1534.3,
    ingredients: [
      { label: "Wheat flour, all-purpose", fdcId: 168894, grams: 500 },
      { label: "Ghee (butter oil, anhydrous)", fdcId: 173412, grams: 275.6 },
      { label: "Milk, condensed, sweetened", fdcId: 171275, grams: 258.7 },
      { label: "Dates, medjool", fdcId: 168191, grams: 500 },
    ],
    derivation:
      "Computed from Hadia Zebib's date maamoul (FDC 168894 flour, 173412 ghee, 171275 condensed milk, 168191 dates), sized to the catalog's calories",
    sources: [
      "Hadia's Lebanese Cuisine (Hadia Zebib), Maamoul — 500 g flour, 250 g ghee + 2 tbsp, 200 ml sweetened condensed milk, 500 g dates with pits, mahlab, orange-blossom water, mastic; 25 pieces. https://hadiaslebanesecuisine.com/blog/?p=6949",
    ],
  },

  Mujaddara: {
    kind: "recipe",
    servingKcal: 350,
    // Chef in Disguise, serves 4, weights in grams except the onion (1 large,
    // FDC 150 g) and the oil (60 ml; FDC 1 tbsp = 13.5 g → 54 g). The dry
    // rice and lentils are used as weighed; the ~7 g of spices are left out.
    yieldGrams: 712.5,
    ingredients: [
      { label: "Rice, white, short-grain, uncooked", fdcId: 168881, grams: 300 },
      { label: "Lentils, raw", fdcId: 172420, grams: 200 },
      { label: "Olive oil", fdcId: 171413, grams: 54 },
      { label: "Onions, raw", fdcId: 170000, grams: 150 },
      { label: "Salt", fdcId: 173468, grams: 8.5 },
    ],
    derivation:
      "Computed from Chef in Disguise's mujaddara (FDC 168881 rice, 172420 lentils, 171413 olive oil, 170000 onion), sized to the catalog's calories",
    sources: [
      "Chef in Disguise (Sawsan Abu Farha), Mujadara — 300 g short-grain rice, 200 g brown lentils, 60 ml olive oil, 1 large onion, 8.5 g salt, spices; serves 4. https://chefindisguise.com/2015/09/16/mujadara-lentil-rice-with-caramelized-onions/",
    ],
  },

  "Greek Salad": {
    kind: "recipe",
    servingKcal: 220,
    // RecipeTin Eats, serves 5 (415 g each). Olive oil 6 tbsp (13.5 g);
    // red wine vinegar 3 tbsp (FDC 1 tbsp = 14.9 g); 3 tomatoes (FDC medium
    // 123 g); ½ small red onion (FDC small 70 g); 1 small green pepper (FDC
    // 74 g). Left out: the 4 Lebanese cucumbers (no published weight).
    // Kalamata olives are branded-only in FDC; generic ripe olives stand in.
    yieldGrams: 978.7,
    ingredients: [
      { label: "Cheese, feta", fdcId: 173420, grams: 250 },
      { label: "Olives, ripe, canned (for kalamata)", fdcId: 169094, grams: 125 },
      { label: "Olive oil", fdcId: 171413, grams: 81 },
      { label: "Vinegar, red wine", fdcId: 172240, grams: 44.7 },
      { label: "Tomatoes (3)", fdcId: 170457, grams: 369 },
      { label: "Onion, red, raw", fdcId: 170000, grams: 35 },
      { label: "Peppers, sweet, green, raw", fdcId: 170427, grams: 74 },
    ],
    derivation:
      "Computed from RecipeTin Eats' Greek salad (FDC 173420 feta, 169094 olives, 171413 olive oil, 170457 tomato; cucumber left out), sized to the catalog's calories",
    sources: [
      "RecipeTin Eats (Nagi Maehashi), Greek Salad — 250 g feta, 125 g kalamata olives, 6 tbsp olive oil, 3 tbsp red wine vinegar, 3 tomatoes, ½ small red onion, 1 small green pepper, 4 Lebanese cucumbers; 5 servings of 415 g. https://www.recipetineats.com/greek-salad/",
    ],
  },
};
