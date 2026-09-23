/**
 * Hand-picked FDC ids for catalog foods the importer's search gets wrong.
 *
 * WHY THIS FILE EXISTS. The importer matches by name, and the ranking it uses
 * (completeness first, then name similarity — see DATA_TYPE_RANK and
 * nameScore in import-fdc-nutrients.ts) is a heuristic. It is right for most
 * of this catalog and reliably wrong for a minority, in three ways no
 * heuristic reading English descriptions can fix:
 *
 *   1. FDC has several near-identical rows and only a person knows which one
 *      the catalog means — "with salt" vs "without salt" for every boiled
 *      legume, "flesh" vs "flesh and skin" for a baked potato.
 *   2. The catalog's word is not FDC's word. "Oatmeal" appears in FDC only as
 *      a bread and a cookie; the porridge is filed under "Cereals, oats,
 *      regular and quick".
 *   3. The right row is not in the first 200 results at all, so no amount of
 *      re-ranking can reach it ("Rice, brown, long-grain, cooked").
 *
 * WHAT A ROW HERE MEANS. The id IS the decision. The importer does not search
 * for these foods; it fetches this id and uses it, and writes
 * match_confidence 'manual' so a reader can tell a pinned row from a matched
 * one. That also means a wrong id here is invisible to every check the
 * importer performs — which is why each row carries its reasoning rather than
 * just a number.
 *
 * LOW CONFIDENCE rows are approximations accepted knowingly, flagged so they
 * can be revisited rather than quietly inherited.
 *
 * Keys are `foods.name` exactly as the catalog spells it, matched
 * case-insensitively. The importer fails at startup if a key here matches no
 * food, so a renamed food cannot leave a dead override behind.
 */

export interface FdcOverride {
  fdcId: number;
  /** The reasoning that chose this id over what the search returned. */
  note: string;
  /** Set when this is an approximation of the food rather than the food. */
  lowConfidence?: true;
  /**
   * Grams in ONE catalog serving, for a label that names no weight or unit
   * the importer can convert ("1 piece", "1 bowl", "3 skewers"). Only ever
   * a sourced figure — `servingSource` says where it comes from — never an
   * estimate: a food nobody can weigh honestly stays skipped.
   */
  servingGrams?: number;
  /** Where servingGrams comes from (an FDC portion, a manufacturer spec, …). */
  servingSource?: string;
}

export const FDC_OVERRIDES: Record<string, FdcOverride> = {
  // --- wrong preparation, or the wrong part of the animal/plant -------------
  "Baked Sweet Potato": {
    fdcId: 168483,
    note: "Search lands on the frozen prepared version. This is baked-in-skin flesh, which is what a baked sweet potato is.",
  },
  "Beef Sirloin Steak, lean": {
    fdcId: 168634,
    note: "Search keeps the separable lean AND fat row; the catalog says lean. All grades rather than choice or select, since the catalog does not grade it.",
  },
  "Chicken Thigh, roasted": {
    fdcId: 172388,
    note: "Search returns Chicken, skin (drumsticks and thighs) — the skin, not the meat.",
  },
  "Chicken Breast, roasted": {
    fdcId: 171477,
    note: "Search returns Chicken breast, roll, oven-roasted, a processed deli roll rather than a roasted breast.",
  },
  "Salmon, wild, cooked": {
    fdcId: 173692,
    note: "Sockeye is the wild salmon this catalog means. Search prefers Atlantic wild, a farmed species taken wild and considerably fattier.",
  },
  "Baked Potato": {
    fdcId: 170093,
    note: "Flesh AND skin, without salt. Search picks flesh only, with salt.",
  },
  "Egg, raw": {
    fdcId: 171287,
    note: "Search returns the raw egg WHITE. A whole raw egg is the food; the white alone carries almost no fat and no vitamin A.",
  },

  // --- salted vs unsalted, where the catalog says neither -------------------
  "Lentils, cooked": {
    fdcId: 172421,
    note: "Boiled without salt. The catalog's serving carries no added salt, and the salted row differs from this one only in sodium.",
  },
  "Chickpeas, cooked": {
    fdcId: 173757,
    note: "Boiled without salt, for the same reason as lentils.",
  },
  "Kidney Beans, cooked": {
    fdcId: 175194,
    note: "Red kidney beans boiled without salt, for the same reason as lentils.",
  },

  // --- the catalog's word is not FDC's word ---------------------------------
  "Oatmeal, cooked": {
    fdcId: 173905,
    note: "FDC has no food called oatmeal — only oatmeal bread and oatmeal cookies, which is what search finds. Porridge is filed as Cereals, oats, regular and quick, cooked with water.",
  },
  "Oats, dry": {
    fdcId: 173904,
    note: "Plain unfortified dry oats. Search prefers the instant fortified row, whose added iron and B vitamins are a manufacturer's rather than the grain's.",
  },
  "Whole Milk": {
    fdcId: 172217,
    note: "Search lands on buttermilk. This is whole milk at 3.25% milkfat without added vitamins, matching the catalog's plain Whole Milk.",
  },
  Coffee: {
    fdcId: 171890,
    note: "Brewed coffee prepared with tap water. There is no non-branded coffee for search to find — every result is a branded coffee drink — so without this pin the food goes unmatched entirely.",
  },

  // --- right food, wrong variety or form ------------------------------------
  Apple: {
    fdcId: 171688,
    note: "Raw with skin. Search settles on the peeled row; an apple is eaten with its skin, which carries most of the fibre.",
  },
  Grapes: {
    fdcId: 174683,
    note: "The ordinary European/Thompson seedless table grape. Search finds muscadine, a regional variety with a different profile and only 27 of the 103 rows.",
  },
  Tomato: {
    fdcId: 170457,
    note: "Raw red ripe, year-round average. Search prefers crushed canned tomatoes.",
  },
  Cucumber: {
    fdcId: 168409,
    note: "With peel, which is how this catalog serves it and where its vitamin K is.",
  },
  Sugar: {
    fdcId: 169655,
    note: "Ordinary granulated sugar. Search prefers turbinado, a different product carrying only 19 of the 103 rows.",
  },
  "Cheddar Cheese": {
    fdcId: 173414,
    note: "Plain cheddar rather than search's sharp, sliced row — the catalog specifies neither sharpness nor slicing.",
  },
  "Cottage Cheese": {
    fdcId: 172179,
    note: "Creamed, large or small curd. Search returns Cheese, cottage, with vegetables, which is cottage cheese plus something else.",
  },
  "Greek Yogurt, nonfat": {
    fdcId: 330137,
    note: "Plain nonfat Greek yogurt. Search prefers the strawberry row, whose sugar belongs to fruit preparation rather than yogurt. Foundation rather than SR Legacy because SR Legacy's only plain nonfat Greek row is a branded one.",
  },
  "Greek Yogurt, whole milk": {
    fdcId: 171304,
    note: "Plain whole-milk Greek yogurt; search prefers the fruit row.",
  },
  "Whole-Wheat Bread": {
    fdcId: 172688,
    note: "Commercially prepared whole-wheat bread. Search prefers whole-wheat PITA, a different bread — and pita is already its own catalog food.",
  },
  "Tofu, firm": {
    fdcId: 172475,
    note: "Raw firm tofu set with calcium sulfate — the common kind, and the reason tofu counts as a calcium source. Search prefers extra-firm set with nigari, which is neither.",
  },
  "Tuna, canned in water": {
    fdcId: 171986,
    note: "Light tuna canned in water, without salt. Search prefers white (albacore), a different fish with a different fat profile and considerably more mercury.",
  },
  "White Rice, cooked": {
    fdcId: 168878,
    note: "Long-grain regular enriched, cooked. Search prefers glutinous (sticky) rice, a different grain.",
  },

  // --- the right row is not in the search results at all ---------------------
  "Brown Rice, cooked": {
    fdcId: 169704,
    note: "Long-grain brown rice, cooked. Unreachable by search: it is not among the first 200 non-branded results, and what wins instead is Pork sausage rice links.",
  },

  // --- count servings with a sourced gram weight ------------------------------
  // The catalog labels these in pieces, orders or cans, which the importer
  // cannot convert on its own. Each weight below is FDC's own portion for
  // that measure of that food (or says exactly where else it comes from),
  // and each was checked against the catalog's own calories for the serving.
  Falafel: {
    fdcId: 2707408,
    note: "FNDDS Falafel. 4 patties at FDC's 17 g per patty is 350 kcal, matching the catalog's 330; SR Legacy's home-prepared row (333 kcal/100 g) would give 226 and disagree.",
    servingGrams: 68,
    servingSource: "FDC 2707408 portion \"1 patty\" = 17 g, x4",
  },
  "French Fries": {
    fdcId: 2709461,
    note: "FNDDS Potato, french fries, fast food. A small order is 343 kcal, matching the catalog's 340.",
    servingGrams: 110,
    servingSource: "FDC 2709461 portion \"1 small fast food order\" = 110 g",
  },
  "Diet Pepsi": {
    fdcId: 2710542,
    note: "FNDDS Soft drink, cola, diet — generic, not the Pepsi brand, which FDC lists only as branded rows without micronutrients. About 7 kcal per can against the catalog's 0.",
    servingGrams: 360,
    servingSource: "FDC 2710542 portion \"1 can (12 fl oz)\" = 360 g",
  },
  "Lebanese Bread": {
    fdcId: 2707616,
    note: "FNDDS Bread, pita. FDC has no loaf size; its large pita is the nearest to a Lebanese khubz loaf and gives 234 kcal against the catalog's 210.",
    servingGrams: 85,
    servingSource: "FDC 2707616 portion \"1 large pita\" = 85 g",
    lowConfidence: true,
  },
  "Warak Enab": {
    fdcId: 2709064,
    note: "FNDDS Grape leaves stuffed with rice (the vegetarian Lebanese warak enab). This row's own \"1 roll\" is 56 g, which puts 6 rolls at 564 kcal — implausible for small Lebanese rolls. Its sister rows' 21 g roll gives 212 kcal, matching the catalog's 220.",
    servingGrams: 126,
    servingSource: "FDC 2706621 / 2706659 portion \"1 roll\" = 21 g (stuffed grape leaves, same rolls with meat), x6",
    lowConfidence: true,
  },
  Baklava: {
    fdcId: 2708044,
    note: "FNDDS Baklava. FDC's piece is 80 g (352 kcal) but the catalog shows 210 kcal per piece, so the serving is taken as the weight those 210 kcal imply at this row's 440 kcal/100 g, keeping the nutrient breakdown consistent with the calories the app shows. Revisit if the catalog's piece is reweighed.",
    servingGrams: 48,
    servingSource: "catalog calories 210 kcal / FDC 2708044's 440 kcal per 100 g",
    lowConfidence: true,
  },

  // --- accepted approximations ----------------------------------------------
  "Grilled Fish": {
    fdcId: 171956,
    note: "Atlantic cod, cooked by dry heat. The catalog name specifies no species, so there is no correct answer; cod is a lean white fish and a defensible stand-in. The real fix is naming a species in the catalog.",
    lowConfidence: true,
  },
  Laban: {
    fdcId: 170886,
    note: "Plain low-fat yogurt. FDC returns nothing non-branded for laban at all. Drinkable laban is thinner than set yogurt, so this overstates protein and fat per 100 g.",
    lowConfidence: true,
  },
};
