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
