// Canonical per-nutrient schema for Nutrient Summary (mobile handoff item 9)
// and every "Advanced" nutrient view that reuses it (items 2 and 10).
//
// Ported literally from the handoff's own reference data file,
// `scratchpad/design-handoff-centium-mobile/design_handoff_iterations/reference/nutrient-data.js`
// (`window.CENTIUM_NUTRIENTS`) — same section order, same row order, same
// names, units, target values and `kind` classification. Only the sample
// `amt` figures are dropped: this file is the STRUCTURE (what to render and
// what target to render it against), not a day's data, which is computed
// live from what the user actually logged.
//
// `kind` mirrors the handoff's own comment:
//   goal  — fill toward target (protein, fibre, vitamin C, ...)
//   limit — do not exceed (saturated fat, sodium, added sugars, ...)
//   ref   — reference-only guidance, no Daily Value, renders "Ref" with a
//           muted bar and no percent (ALA, linoleic acid, EPA+DHA)
//   calc  — derived from other rows, labelled "calculated" (net carbs,
//           total MCTs, omega-6:omega-3 ratio)
//   none  — no established target; amount only, never invent one

export type NutrientKind = "goal" | "limit" | "ref" | "calc" | "none";

export interface NutrientRow {
  /** Canonical key — stable, used everywhere data is looked up/summed. */
  key: string;
  /** Display name, exactly as the handoff writes it. */
  name: string;
  unit: string;
  /** Fixed target, or null when none is established or it's computed elsewhere (amino acids, Goals-sourced rows). */
  target: number | null;
  kind: NutrientKind;
  /** Where the target/reference figure comes from, for the row's source label. */
  source: string;
  /** Reference-only figures show this instead of a target number, e.g. "1.1–1.6 g/day". */
  refText?: string;
  /** Calories/protein/carbs/fat pull their target from the user's own Goals & Macros, not a fixed number. */
  fromGoals?: boolean;
  /** Essential amino acids: target is WHO/FAO/UNU mg/kg/day × the user's logged body weight. */
  mgPerKgBodyWeight?: number;
  /** Groups a handful of rows within a section for a sub-heading (omega sub-groups, non-essential amino acids). */
  group?: string;
  /** A short note rendered under the row — e.g. lauric acid's dual MCT/long-chain classification. */
  note?: string;
}

export interface NutrientSection {
  id: string;
  name: string;
  rows: NutrientRow[];
  /** Amino Acids only: the nine non-essential acids, amount-only, their own sub-heading. */
  sub?: { name: string; rows: NutrientRow[] };
}

const slug = (name: string) =>
  name
    .toLowerCase()
    .replace(/[()%:+]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

function row(
  name: string,
  unit: string,
  target: number | null,
  kind: NutrientKind,
  source: string,
  extra?: Partial<NutrientRow>
): NutrientRow {
  return { key: slug(name), name, unit, target, kind, source, ...extra };
}

/** Essential amino acid: WHO/FAO/UNU mg/kg/day, scaled by the user's body weight at render time. */
function aminoAcid(name: string, mgPerKg: number): NutrientRow {
  return row(name, "g", null, "goal", `WHO/FAO/UNU 2007 · ${mgPerKg} mg/kg`, { mgPerKgBodyWeight: mgPerKg });
}

export const NUTRIENT_SECTIONS: NutrientSection[] = [
  {
    id: "popular",
    name: "Popular Nutrients",
    rows: [
      row("Calories", "kcal", null, "goal", "Goals", { fromGoals: true }),
      row("Protein", "g", null, "goal", "Goals", { fromGoals: true }),
      row("Total fat", "g", null, "goal", "Goals", { fromGoals: true }),
      row("Saturated fat", "g", 20, "limit", "FDA DV"),
      row("Trans fat", "g", null, "none", "No DV · keep as low as possible"),
      row("Cholesterol", "mg", 300, "limit", "FDA DV"),
      row("Sodium", "mg", 2300, "limit", "FDA DV"),
      row("Total carbohydrates", "g", null, "goal", "Goals", { fromGoals: true }),
      row("Dietary fiber", "g", 28, "goal", "FDA DV"),
      row("Total sugars", "g", null, "none", "No DV"),
      row("Added sugars", "g", 50, "limit", "FDA DV"),
      row("Potassium", "mg", 4700, "goal", "FDA DV"),
      row("Calcium", "mg", 1300, "goal", "FDA DV"),
      row("Iron", "mg", 18, "goal", "FDA DV"),
      row("Vitamin D", "mcg", 20, "goal", "FDA DV"),
    ],
  },
  {
    id: "carbs",
    name: "Carbohydrates related",
    rows: [
      row("Total carbohydrates", "g", null, "goal", "Goals", { fromGoals: true }),
      row("Net carbs", "g", null, "calc", "Total carbs − fiber"),
      row("Dietary fiber", "g", 28, "goal", "FDA DV"),
      row("Soluble fiber", "g", null, "none", "No DV"),
      row("Insoluble fiber", "g", null, "none", "No DV"),
      row("Total sugars", "g", null, "none", "No DV"),
      row("Added sugars", "g", 50, "limit", "FDA DV"),
      row("Sugar alcohols", "g", null, "none", "No DV"),
      row("Starch", "g", null, "none", "No DV"),
      row("Glucose", "g", null, "none", "No DV"),
      row("Fructose", "g", null, "none", "No DV"),
      row("Sucrose", "g", null, "none", "No DV"),
      row("Lactose", "g", null, "none", "No DV"),
      row("Maltose", "g", null, "none", "No DV"),
      row("Galactose", "g", null, "none", "No DV"),
    ],
  },
  {
    id: "vitamins",
    name: "Vitamins",
    rows: [
      row("Vitamin A", "mcg RAE", 900, "goal", "FDA DV"),
      row("Vitamin C", "mg", 90, "goal", "FDA DV"),
      row("Vitamin D", "mcg", 20, "goal", "FDA DV"),
      row("Vitamin E (alpha-tocopherol)", "mg", 15, "goal", "FDA DV"),
      row("Vitamin K", "mcg", 120, "goal", "FDA DV"),
      row("Thiamin (B1)", "mg", 1.2, "goal", "FDA DV"),
      row("Riboflavin (B2)", "mg", 1.3, "goal", "FDA DV"),
      row("Niacin (B3)", "mg NE", 16, "goal", "FDA DV"),
      row("Pantothenic acid (B5)", "mg", 5, "goal", "FDA DV"),
      row("Vitamin B6", "mg", 1.7, "goal", "FDA DV"),
      row("Biotin (B7)", "mcg", 30, "goal", "FDA DV"),
      row("Folate (B9)", "mcg DFE", 400, "goal", "FDA DV"),
      row("Vitamin B12", "mcg", 2.4, "goal", "FDA DV"),
      row("Choline", "mg", 550, "goal", "FDA DV"),
    ],
  },
  {
    id: "minerals",
    name: "Minerals",
    rows: [
      row("Calcium", "mg", 1300, "goal", "FDA DV"),
      row("Iron", "mg", 18, "goal", "FDA DV"),
      row("Magnesium", "mg", 420, "goal", "FDA DV"),
      row("Phosphorus", "mg", 1250, "goal", "FDA DV"),
      row("Potassium", "mg", 4700, "goal", "FDA DV"),
      row("Sodium", "mg", 2300, "limit", "FDA DV"),
      row("Zinc", "mg", 11, "goal", "FDA DV"),
      row("Copper", "mg", 0.9, "goal", "FDA DV"),
      row("Manganese", "mg", 2.3, "goal", "FDA DV"),
      row("Selenium", "mcg", 55, "goal", "FDA DV"),
      row("Iodine", "mcg", 150, "goal", "FDA DV"),
      // Chromium/chloride: a Daily Value exists but food-composition data
      // never carries an amount for them — the handoff's own "deliberate
      // gaps" list. Amount always renders as a dash, never zero.
      row("Chromium", "mcg", 35, "goal", "FDA DV"),
      row("Molybdenum", "mcg", 45, "goal", "FDA DV"),
      row("Chloride", "mg", 2300, "goal", "FDA DV"),
      row("Fluoride", "mcg", null, "none", "No DV"),
    ],
  },
  {
    id: "amino",
    name: "Amino Acids",
    rows: [
      aminoAcid("Histidine", 10),
      aminoAcid("Isoleucine", 20),
      aminoAcid("Leucine", 39),
      aminoAcid("Lysine", 30),
      aminoAcid("Methionine + cysteine", 15),
      aminoAcid("Phenylalanine + tyrosine", 25),
      aminoAcid("Threonine", 15),
      aminoAcid("Tryptophan", 4),
      aminoAcid("Valine", 26),
    ],
    sub: {
      name: "Non-essential",
      rows: [
        row("Alanine", "g", null, "none", "No DV"),
        row("Arginine", "g", null, "none", "No DV"),
        row("Aspartic acid", "g", null, "none", "No DV"),
        row("Cysteine", "g", null, "none", "No DV"),
        row("Glutamic acid", "g", null, "none", "No DV"),
        row("Glycine", "g", null, "none", "No DV"),
        row("Proline", "g", null, "none", "No DV"),
        row("Serine", "g", null, "none", "No DV"),
        row("Tyrosine", "g", null, "none", "No DV"),
      ],
    },
  },
  {
    id: "omegas",
    name: "Omegas",
    rows: [
      row("ALA (18:3 n-3)", "g", 1.6, "ref", "IOM AI", { refText: "1.1–1.6 g/day", group: "Omega-3" }),
      row("EPA (20:5 n-3)", "g", null, "none", "No DV", { group: "Omega-3" }),
      row("DPA (22:5 n-3)", "g", null, "none", "No DV", { group: "Omega-3" }),
      row("DHA (22:6 n-3)", "g", null, "none", "No DV", { group: "Omega-3" }),
      row("EPA + DHA", "mg", 250, "ref", "EFSA", { refText: "250 mg/day", group: "Omega-3" }),
      row("Linoleic acid (18:2 n-6)", "g", 17, "ref", "IOM AI", { refText: "12–17 g/day", group: "Omega-6" }),
      row("Arachidonic acid (20:4 n-6)", "g", null, "none", "No DV", { group: "Omega-6" }),
      row("Oleic acid (18:1 n-9)", "g", null, "none", "No DV", { group: "Omega-9" }),
      row("Omega-6 : omega-3", "", null, "calc", "Total n-6 ÷ total n-3", { group: "Ratio" }),
    ],
  },
  {
    id: "mct",
    name: "MCTs",
    rows: [
      row("Caproic acid (C6:0)", "g", null, "none", "No DV"),
      row("Caprylic acid (C8:0)", "g", null, "none", "No DV"),
      row("Capric acid (C10:0)", "g", null, "none", "No DV"),
      row("Lauric acid (C12:0)", "g", null, "none", "No DV", {
        note: "Sometimes classed as medium-chain, sometimes long-chain.",
      }),
      row("Total MCTs", "g", null, "calc", "C6:0 + C8:0 + C10:0", {
        note: "Lauric acid excluded from this total.",
      }),
    ],
  },
  {
    id: "others",
    name: "Others",
    rows: [
      row("Monounsaturated fat", "g", null, "none", "No DV"),
      row("Polyunsaturated fat", "g", null, "none", "No DV"),
      row("Water", "g", null, "none", "No DV"),
      row("Caffeine", "mg", 400, "limit", "FDA guidance"),
      row("Alcohol", "g", null, "none", "No DV"),
      row("Theobromine", "mg", null, "none", "No DV"),
      row("Beta-carotene", "mcg", null, "none", "No DV"),
      row("Alpha-carotene", "mcg", null, "none", "No DV"),
      row("Beta-cryptoxanthin", "mcg", null, "none", "No DV"),
      row("Lycopene", "mcg", null, "none", "No DV"),
      row("Lutein + zeaxanthin", "mcg", null, "none", "No DV"),
      row("Phytosterols", "mg", null, "none", "No DV"),
    ],
  },
];

/** Every row across every section and sub-group, flattened once for lookup. */
export const ALL_NUTRIENT_ROWS: NutrientRow[] = NUTRIENT_SECTIONS.flatMap((s) =>
  s.sub ? [...s.rows, ...s.sub.rows] : s.rows
);

export const NUTRIENT_ROW_BY_KEY: Record<string, NutrientRow> = Object.fromEntries(
  ALL_NUTRIENT_ROWS.map((r) => [r.key, r])
);

// Calculated rows are never looked up in imported data — they're derived at
// render time from the other keys in the same map.
export const CALC_KEYS = {
  netCarbs: { key: slug("Net carbs"), from: [slug("Total carbohydrates"), slug("Dietary fiber")] as const },
  totalMcts: {
    key: slug("Total MCTs"),
    from: [slug("Caproic acid (C6:0)"), slug("Caprylic acid (C8:0)"), slug("Capric acid (C10:0)")] as const,
  },
  omega6to3: {
    key: slug("Omega-6 : omega-3"),
    n6: [slug("Linoleic acid (18:2 n-6)"), slug("Arachidonic acid (20:4 n-6)")] as const,
    n3: [
      slug("ALA (18:3 n-3)"),
      slug("EPA (20:5 n-3)"),
      slug("DPA (22:5 n-3)"),
      slug("DHA (22:6 n-3)"),
    ] as const,
  },
};

// FDA guidance for healthy adults — used for the caffeine limit's warning line.
export const CAFFEINE_LIMIT_MG = 400;
