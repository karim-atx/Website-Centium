// Maps this app's canonical nutrient keys (src/data/nutrientSchema.ts) to
// USDA FoodData Central nutrient IDs, for the FDC import pipeline
// (scripts/import-fdc-nutrients.ts).
//
// PROVENANCE, READ BEFORE EDITING:
//   confidence: "verified"  — this session fetched a real FDC food (egg,
//     salmon, coconut oil, or carrot; see the six `fdc_*.json` captures in
//     this session's scratchpad) and read the exact {id, number, name, unit}
//     straight off `foodNutrients[].nutrient`. Not guessed.
//   confidence: "standard"  — a USDA/FDC nutrient number that has been
//     stable for decades and is widely documented, but THIS SESSION did not
//     confirm it against a live response (the coffee/cocoa lookups needed to
//     verify caffeine/theobromine/phytosterols hit FDC's DEMO_KEY rate limit
//     before they could run). Treat as a strong lead, not a fact — the
//     import script's --verify pass (see the script's header) re-checks
//     every "standard" row against one real food before its first production
//     run and refuses to import a mismatch silently.
//   fdcId: null            — no id is recorded at all, by design, not
//     oversight. Some of these mirror the handoff's own "deliberate gaps"
//     list (chromium, chloride: a Daily Value exists but USDA composition
//     data essentially never carries an amount for them). Others
//     (sugar alcohols, arachidonic acid specifically vs. the 20:3 n-6 isomer
//     this session's sample actually returned) didn't have a confident match
//     in the foods sampled. Leaving these null is the intended behavior —
//     the app already renders "no data" rather than a zero for a missing
//     key, so an unmapped nutrient degrades gracefully instead of needing a
//     guess.
//
// `unit` is the unit FDC reports the id in. The import script converts to
// this app's display unit (src/data/nutrientSchema.ts's `unit` field) where
// the two differ (e.g. FDC's IU for vitamin D vs this app's mcg).

export type FdcConfidence = "verified" | "standard";

export interface FdcNutrientMapping {
  /** Canonical nutrient name, exactly as written in src/data/nutrientSchema.ts — resolved to a key at import time so the two files can never drift apart silently. */
  name: string;
  /** One FDC nutrient id, or several to sum (e.g. lutein + zeaxanthin are separate FDC ids feeding one app row). Null = intentionally unmapped, see header. */
  fdcIds: number[] | null;
  unit: string;
  confidence: FdcConfidence;
  note?: string;
}

export const FDC_NUTRIENT_MAP: FdcNutrientMapping[] = [
  // --- Popular / macro basics --------------------------------------------
  { name: "Calories", fdcIds: [1008], unit: "kcal", confidence: "verified" },
  { name: "Protein", fdcIds: [1003], unit: "g", confidence: "verified" },
  { name: "Total fat", fdcIds: [1004], unit: "g", confidence: "verified" },
  { name: "Saturated fat", fdcIds: [1258], unit: "g", confidence: "verified" },
  { name: "Trans fat", fdcIds: null, unit: "g", confidence: "standard", note: "FDC number 605 (Fatty acids, total trans) not present in the six sampled foods; verify before enabling." },
  { name: "Cholesterol", fdcIds: [1253], unit: "mg", confidence: "verified" },
  { name: "Sodium", fdcIds: [1093], unit: "mg", confidence: "verified" },
  { name: "Total carbohydrates", fdcIds: [1005], unit: "g", confidence: "verified" },
  { name: "Dietary fiber", fdcIds: [1079], unit: "g", confidence: "verified" },
  { name: "Total sugars", fdcIds: [1063], unit: "g", confidence: "verified" },
  { name: "Added sugars", fdcIds: null, unit: "g", confidence: "standard", note: "FDC number 539 (Sugars, added) exists mainly on Branded foods, not Foundation/SR Legacy raw ingredients — expect this to stay unmatched for most of the catalog." },
  { name: "Potassium", fdcIds: [1092], unit: "mg", confidence: "verified" },
  { name: "Calcium", fdcIds: [1087], unit: "mg", confidence: "verified" },
  { name: "Iron", fdcIds: [1089], unit: "mg", confidence: "verified" },
  { name: "Vitamin D", fdcIds: [1114], unit: "mcg", confidence: "verified", note: "FDC 1114 (number 328) is already µg D2+D3 — prefer this over 1110 (IU) to avoid a unit conversion." },

  // --- Carbohydrates related ----------------------------------------------
  { name: "Soluble fiber", fdcIds: null, unit: "g", confidence: "standard", note: "FDC number 1082 (Fiber, soluble) exists but wasn't present in the sampled foods." },
  { name: "Insoluble fiber", fdcIds: null, unit: "g", confidence: "standard", note: "FDC number 1084 (Fiber, insoluble); unverified this session." },
  { name: "Sugar alcohols", fdcIds: null, unit: "g", confidence: "standard", note: "FDC has no single 'sugar alcohols, total' id in the datasets this app targets — individual ones (sorbitol 1085x etc.) exist but summing them is a separate, deliberate decision, not made here." },
  { name: "Starch", fdcIds: [1009], unit: "g", confidence: "verified" },
  { name: "Glucose", fdcIds: [1011], unit: "g", confidence: "verified" },
  { name: "Fructose", fdcIds: [1012], unit: "g", confidence: "verified" },
  { name: "Sucrose", fdcIds: [1010], unit: "g", confidence: "verified" },
  { name: "Lactose", fdcIds: [1013], unit: "g", confidence: "verified" },
  { name: "Maltose", fdcIds: [1014], unit: "g", confidence: "verified" },
  { name: "Galactose", fdcIds: null, unit: "g", confidence: "standard", note: "FDC number 287 (Galactose) not present in the sampled foods." },

  // --- Vitamins ------------------------------------------------------------
  { name: "Vitamin A", fdcIds: [1106], unit: "mcg RAE", confidence: "verified" },
  { name: "Vitamin C", fdcIds: null, unit: "mg", confidence: "standard", note: "FDC number 401 (Vitamin C, total ascorbic acid); none of the sampled foods (egg/salmon/coconut oil/carrot) carry meaningful vitamin C, so it wasn't confirmed in a response this session." },
  { name: "Vitamin D", fdcIds: [1114], unit: "mcg", confidence: "verified" },
  { name: "Vitamin E (alpha-tocopherol)", fdcIds: null, unit: "mg", confidence: "standard", note: "FDC number 323 (Vitamin E, alpha-tocopherol) is a long-standing stable id; not present in the six foods sampled this session." },
  { name: "Vitamin K", fdcIds: null, unit: "mcg", confidence: "standard", note: "FDC number 430 (Vitamin K, phylloquinone); unverified this session." },
  { name: "Thiamin (B1)", fdcIds: [1165], unit: "mg", confidence: "verified" },
  { name: "Riboflavin (B2)", fdcIds: [1166], unit: "mg", confidence: "verified" },
  { name: "Niacin (B3)", fdcIds: [1167], unit: "mg NE", confidence: "verified", note: "FDC reports preformed niacin in mg, not niacin equivalents (NE), which also credit tryptophan conversion. Treated as mg≈mg NE, a standard simplification for whole foods — flagged, not silently assumed exact." },
  { name: "Pantothenic acid (B5)", fdcIds: null, unit: "mg", confidence: "standard", note: "FDC number 410 (Pantothenic acid); unverified this session." },
  { name: "Vitamin B6", fdcIds: [1175], unit: "mg", confidence: "verified" },
  { name: "Biotin (B7)", fdcIds: null, unit: "mcg", confidence: "standard", note: "FDC number 416 (Biotin); unverified this session." },
  { name: "Folate (B9)", fdcIds: [1177], unit: "mcg DFE", confidence: "verified", note: "FDC 1177 (number 417) is Folate, total — not Folate, DFE (number 435), which weights synthetic folic acid 1.7x. Using total folate under-credits fortified foods; a real gap, not an oversight — switch to 435 once verified live." },
  { name: "Vitamin B12", fdcIds: [1178], unit: "mcg", confidence: "verified" },
  { name: "Choline", fdcIds: [1180], unit: "mg", confidence: "verified" },

  // --- Minerals --------------------------------------------------------------
  { name: "Magnesium", fdcIds: [1090], unit: "mg", confidence: "verified" },
  { name: "Phosphorus", fdcIds: [1091], unit: "mg", confidence: "verified" },
  { name: "Zinc", fdcIds: [1095], unit: "mg", confidence: "verified" },
  { name: "Copper", fdcIds: [1098], unit: "mg", confidence: "verified" },
  { name: "Manganese", fdcIds: [1101], unit: "mg", confidence: "verified" },
  { name: "Selenium", fdcIds: [1103], unit: "mcg", confidence: "verified" },
  { name: "Iodine", fdcIds: [1100], unit: "mcg", confidence: "verified" },
  // Chromium and chloride: the handoff's OWN "deliberate gaps" list says
  // these carry an FDA Daily Value but essentially never an amount in
  // food-composition data. Left unmapped on purpose — render a dash, not a
  // guess, exactly as the handoff instructs.
  { name: "Chromium", fdcIds: null, unit: "mcg", confidence: "standard", note: "Deliberate gap per the handoff — FDA DV exists, food-composition data does not. Do not fill with zero." },
  { name: "Molybdenum", fdcIds: null, unit: "mcg", confidence: "standard", note: "FDC number 315 exists in some datasets but wasn't confirmed against a live response this session; low natural-language collision risk with Manganese (also near 315) makes this one worth double-checking live before enabling, not assuming from memory." },
  { name: "Chloride", fdcIds: null, unit: "mg", confidence: "standard", note: "Deliberate gap per the handoff — same as chromium." },
  { name: "Fluoride", fdcIds: null, unit: "mcg", confidence: "standard", note: "No FDA Daily Value either way; FDC number 313 exists in some datasets, unverified this session." },

  // --- Amino acids -------------------------------------------------------
  { name: "Histidine", fdcIds: [1221], unit: "g", confidence: "verified" },
  { name: "Isoleucine", fdcIds: [1212], unit: "g", confidence: "verified" },
  { name: "Leucine", fdcIds: [1213], unit: "g", confidence: "verified" },
  { name: "Lysine", fdcIds: [1214], unit: "g", confidence: "verified" },
  { name: "Methionine + cysteine", fdcIds: [1215, 1232], unit: "g", confidence: "verified", note: "Sum of FDC Methionine (1215) + Cysteine (1232), matching the app row's combined label." },
  { name: "Phenylalanine + tyrosine", fdcIds: [1217, 1218], unit: "g", confidence: "verified", note: "Sum of FDC Phenylalanine (1217) + Tyrosine (1218)." },
  { name: "Threonine", fdcIds: [1211], unit: "g", confidence: "verified" },
  { name: "Tryptophan", fdcIds: [1210], unit: "g", confidence: "verified" },
  { name: "Valine", fdcIds: [1219], unit: "g", confidence: "verified" },
  { name: "Alanine", fdcIds: [1222], unit: "g", confidence: "verified" },
  { name: "Arginine", fdcIds: [1220], unit: "g", confidence: "verified" },
  { name: "Aspartic acid", fdcIds: [1223], unit: "g", confidence: "verified" },
  { name: "Cysteine", fdcIds: [1232], unit: "g", confidence: "verified" },
  { name: "Glutamic acid", fdcIds: [1224], unit: "g", confidence: "verified" },
  { name: "Glycine", fdcIds: [1225], unit: "g", confidence: "verified" },
  { name: "Proline", fdcIds: [1226], unit: "g", confidence: "verified" },
  { name: "Serine", fdcIds: [1227], unit: "g", confidence: "verified" },
  { name: "Tyrosine", fdcIds: [1218], unit: "g", confidence: "verified" },

  // --- Omegas ---------------------------------------------------------------
  { name: "ALA (18:3 n-3)", fdcIds: [1404], unit: "g", confidence: "verified" },
  { name: "EPA (20:5 n-3)", fdcIds: [1278], unit: "g", confidence: "verified" },
  { name: "DPA (22:5 n-3)", fdcIds: [1280], unit: "g", confidence: "verified" },
  { name: "DHA (22:6 n-3)", fdcIds: [1272], unit: "g", confidence: "verified" },
  { name: "EPA + DHA", fdcIds: [1278, 1272], unit: "g", confidence: "verified", note: "Summed here, then converted g→mg at import (the app row's unit is mg, matching the EFSA reference it's checked against)." },
  { name: "Linoleic acid (18:2 n-6)", fdcIds: [1316], unit: "g", confidence: "verified" },
  { name: "Arachidonic acid (20:4 n-6)", fdcIds: null, unit: "g", confidence: "standard", note: "This session's sample only confirmed FDC 1406/number 853 = PUFA 20:3 n-6, a DIFFERENT fatty acid. The true 20:4 n-6 id needs live confirmation before use — left unmapped rather than risk mislabeling 20:3 data as 20:4." },
  { name: "Oleic acid (18:1 n-9)", fdcIds: [1315], unit: "g", confidence: "verified", note: "FDC number 674 is 'MUFA 18:1 c' (cis-18:1), the closest FDC proxy for oleic acid — natural 18:1 is overwhelmingly the cis n-9 isomer, but this is an approximation, not an exact id match, and is flagged as such." },

  // --- MCTs --------------------------------------------------------------
  { name: "Caproic acid (C6:0)", fdcIds: [1260], unit: "g", confidence: "verified" },
  { name: "Caprylic acid (C8:0)", fdcIds: [1261], unit: "g", confidence: "verified" },
  { name: "Capric acid (C10:0)", fdcIds: [1262], unit: "g", confidence: "verified" },
  { name: "Lauric acid (C12:0)", fdcIds: [1263], unit: "g", confidence: "verified" },

  // --- Others --------------------------------------------------------------
  { name: "Monounsaturated fat", fdcIds: [1292], unit: "g", confidence: "verified" },
  { name: "Polyunsaturated fat", fdcIds: [1293], unit: "g", confidence: "verified" },
  { name: "Water", fdcIds: [1051], unit: "g", confidence: "verified" },
  { name: "Caffeine", fdcIds: null, unit: "mg", confidence: "standard", note: "FDC number 262 for caffeine is a strong, widely-documented lead, but this session's coffee/cocoa lookups hit FDC's DEMO_KEY rate limit before confirming it live. Left unmapped rather than risk mislabeling theobromine (an adjacent, easily-confused id) as caffeine." },
  { name: "Alcohol", fdcIds: null, unit: "g", confidence: "standard", note: "FDC number 221 (Alcohol, ethyl); unverified this session." },
  { name: "Theobromine", fdcIds: null, unit: "mg", confidence: "standard", note: "Same rate-limit gap as caffeine — needs live confirmation against a real cocoa/coffee food before use." },
  { name: "Beta-carotene", fdcIds: [1107], unit: "mcg", confidence: "verified" },
  { name: "Alpha-carotene", fdcIds: [1108], unit: "mcg", confidence: "verified" },
  { name: "Beta-cryptoxanthin", fdcIds: [1120], unit: "mcg", confidence: "verified" },
  { name: "Lycopene", fdcIds: [1122], unit: "mcg", confidence: "verified" },
  { name: "Lutein + zeaxanthin", fdcIds: [1121, 1119], unit: "mcg", confidence: "verified", note: "Sum of FDC Lutein (1121) + Zeaxanthin (1119), matching the app row's combined label." },
  { name: "Phytosterols", fdcIds: null, unit: "mg", confidence: "standard", note: "FDC number 636 (Phytosterols, total); unverified this session." },
];
