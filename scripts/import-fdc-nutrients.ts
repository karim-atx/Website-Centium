/**
 * Imports per-nutrient data for this app's food catalog from USDA
 * FoodData Central (FDC) into the `food_nutrients` table added by
 * supabase/migrations/20260923000000_food_nutrients_and_recipes.sql.
 *
 * WHY THIS IS A STANDALONE SCRIPT, NOT APP CODE
 * This repository ships as a static frontend (see README.md's "Deployment"
 * section) and only ever holds an anon/publishable Supabase key client-side
 * (see .env.example's own header). Writing food_nutrients needs a
 * SERVICE-ROLE key (the table's RLS has no client insert/update policy on
 * purpose, so a compromised client key can't corrupt it) and an FDC API
 * key, neither of which belongs anywhere near the app bundle. Run this from
 * a machine/CI job that holds both, not from the app.
 *
 * GETTING AN FDC API KEY
 * Free, immediate signup, no approval wait: https://fdc.nal.usda.gov/api-key-signup
 * (This script defaults to FDC's DEMO_KEY if FDC_API_KEY isn't set, purely
 * so --dry-run works out of the box for review — DEMO_KEY's rate limit is
 * far too low for a real import and this script will tell you so.)
 *
 * USAGE
 *   SUPABASE_URL=...            (the project URL, e.g. https://xyz.supabase.co)
 *   SUPABASE_SERVICE_ROLE_KEY=...  (Supabase dashboard -> Project Settings -> API)
 *   FDC_API_KEY=...              (from the signup link above)
 *
 *   npx tsx scripts/import-fdc-nutrients.ts --dry-run          # no writes, full report
 *   npx tsx scripts/import-fdc-nutrients.ts                    # real import
 *   npx tsx scripts/import-fdc-nutrients.ts --limit=10         # first 10 foods only
 *   npx tsx scripts/import-fdc-nutrients.ts --only="Hummus"    # one food by exact name
 *
 * WHAT IT DOES, IN ORDER
 *   1. Reads every row from `foods` (id, name, serving_label, calories,
 *      protein_g, carbs_g, fat_g).
 *   2. For each, searches FDC by name and picks the best match. Branded
 *      products are excluded from the response rather than from the request:
 *      FDC's gateway intermittently 400s on any URL containing a parenthesis,
 *      which rules out the dataType filter that would have carried
 *      "Survey (FNDDS)" (see searchFdc for the measurements). So the search
 *      asks for FDC's maximum page and drops Branded rows on arrival. Within
 *      what remains, the datasets are ranked by how complete their nutrient
 *      profiles are (SR Legacy, then Survey, then Foundation — see
 *      DATA_TYPE_RANK for the measurements) and an exact case-insensitive
 *      name match within that order wins.
 *   3. Fetches that FDC food's full nutrient profile (reported per 100 g)
 *      and converts it to THIS food's own serving_label basis — the same
 *      basis `foods.calories` etc. are already on. The gram weight comes
 *      from the label where the label carries one, and otherwise from FDC's
 *      own portion table for the measure the label names ("1/2 cup" of
 *      hummus is 123 g because FDC publishes 246 g per cup for it). A label
 *      naming no measure at all ("1 piece", "1 wrap", "1 bowl" — the
 *      Lebanese-dish case this app's own serving-multiplier logic already
 *      documents) cannot be converted honestly, so it is SKIPPED, not
 *      guessed, and so is a measure FDC publishes no weight for.
 *   4. Maps FDC nutrient ids to this app's canonical keys via
 *      src/data/fdcNutrientMap.ts. A "standard"-confidence mapping that
 *      resolves a real value gets one-time logged under VERIFY so a human
 *      can spot-check it against the live response before trusting it at
 *      scale (see that file's own header for what "standard" vs "verified"
 *      means).
 *   5. Upserts one row per matched food into `food_nutrients`.
 *
 * WHAT IT NEVER DOES: write a zero for a nutrient FDC didn't report, or
 * guess a match when nothing reasonable was found — an unmatched food is
 * reported and left alone, exactly like every other "no data" case in this
 * feature.
 */

// LOADED BEFORE ANYTHING READS process.env, which is why this import sits
// above the others and is not alphabetised with them: the constants below are
// evaluated at module load, so a later call would be too late.
//
// .env.local FIRST, then .env. The local file is the one git ignores and the
// one a person's own key belongs in; .env is the fallback for a CI job that
// injects a file instead of real environment variables. `override: false` is
// dotenv's default and is the behaviour wanted here — a variable already set
// in the real environment wins over the file, so CI secrets are not shadowed
// by a stale checkout.
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"], quiet: true });

import { createClient } from "@supabase/supabase-js";
import { gramsInServingLabel, servingLabelUnit } from "../src/services/nutrition";
import { FDC_NUTRIENT_MAP, type FdcNutrientMapping } from "../src/data/fdcNutrientMap";
import { ALL_NUTRIENT_ROWS } from "../src/data/nutrientSchema";

// ---------------------------------------------------------------------------
// CLI args / env
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const LIMIT = (() => {
  const flag = args.find((a) => a.startsWith("--limit="));
  return flag ? Number(flag.split("=")[1]) : undefined;
})();
const ONLY = (() => {
  const flag = args.find((a) => a.startsWith("--only="));
  return flag ? flag.slice("--only=".length).replace(/^["']|["']$/g, "") : undefined;
})();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FDC_API_KEY = process.env.FDC_API_KEY ?? "DEMO_KEY";

if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY)) {
  console.error(
    "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for a real import.\n" +
      "Use --dry-run to preview matching without either (writes are skipped either way in dry-run)."
  );
  process.exit(1);
}
if (FDC_API_KEY === "DEMO_KEY") {
  console.warn(
    "[warn] No FDC_API_KEY set — using FDC's DEMO_KEY, which rate-limits almost immediately " +
      "(this session's own dry run hit it after ~6 requests). Fine for a tiny --limit dry run, " +
      "not for a real import. Get a free key: https://fdc.nal.usda.gov/api-key-signup"
  );
}

const supabase =
  SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY) : null;

// ---------------------------------------------------------------------------
// FDC nutrient map, resolved to canonical keys once at startup
// ---------------------------------------------------------------------------

const NUTRIENT_NAME_TO_KEY = new Map(ALL_NUTRIENT_ROWS.map((r) => [r.name, r.key]));

interface ResolvedMapping extends FdcNutrientMapping {
  key: string;
}

const RESOLVED_MAP: ResolvedMapping[] = FDC_NUTRIENT_MAP.filter((m) => m.fdcIds !== null).map((m) => {
  const key = NUTRIENT_NAME_TO_KEY.get(m.name);
  if (!key) {
    throw new Error(
      `[fdcNutrientMap] "${m.name}" does not match any row name in src/data/nutrientSchema.ts — the two files have drifted apart. Fix the name in one of them before running this script.`
    );
  }
  return { ...m, key };
});

const alreadyVerified = new Set<string>();

// ---------------------------------------------------------------------------
// FDC HTTP client — small, sequential, with backoff. This app's catalog is
// small (~92 curated rows per services/food/index.ts's own comment), so
// there's no need for concurrency that would just trip FDC's rate limit
// faster.
// ---------------------------------------------------------------------------

const FDC_BASE = "https://api.nal.usda.gov/fdc/v1";

async function fdcFetch(path: string, attempt = 1): Promise<unknown> {
  const url = `${FDC_BASE}${path}${path.includes("?") ? "&" : "?"}api_key=${FDC_API_KEY}`;
  const res = await fetch(url);
  if (res.status === 429 || res.status === 503) {
    if (attempt > 4) throw new Error(`FDC rate limit/unavailable after ${attempt} attempts: ${path}`);
    const backoffMs = 2000 * attempt;
    console.warn(`[fdc] ${res.status} on ${path} — backing off ${backoffMs}ms (attempt ${attempt})`);
    await sleep(backoffMs);
    return fdcFetch(path, attempt + 1);
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`FDC ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface FdcSearchFood {
  fdcId: number;
  description: string;
  dataType: string;
}

// FDC RETURNS TWO SHAPES FROM /food/{id}, AND ONLY ONE IS DOCUMENTED BY THE
// TYPE THIS USED TO DECLARE.
//
// Foundation, SR Legacy and Survey entries nest the nutrient:
//   { nutrient: { id, number, name, unitName }, amount }
//
// Branded entries do not. They come back flattened, and in some responses
// with no nutrient identity at all:
//   { type: "FoodNutrient", id: 30027791, amount: 13.3 }
//
// That `id` is the FoodNutrient ROW id, not a nutrient id — 30027791 is not
// nutrient 30027791. Reading it as one would silently map real amounts onto
// whatever canonical keys those numbers collide with, which is worse than the
// crash it replaced. Measured against the live API: for Branded "ALMONDS"
// (fdcId 2433310) all 13 entries lacked `.nutrient`, and for Branded "APPLE"
// (454004) all 15 did.
interface FdcNutrientEntry {
  nutrient?: { id: number; number: string; name: string; unitName: string };
  /** Flattened variant seen on some responses. */
  nutrientId?: number;
  /** FoodNutrient row id — deliberately NOT usable as a nutrient id. */
  id?: number;
  amount?: number;
}

/**
 * The nutrient id for an entry, or null when the entry does not carry one.
 *
 * Returns null rather than guessing. An entry with no nutrient identity is
 * not a nutrient reading this script can place, and there is no fallback that
 * would be honest — see the note above about the row id.
 */
function nutrientIdOf(entry: FdcNutrientEntry): number | null {
  if (entry?.nutrient && typeof entry.nutrient.id === "number") return entry.nutrient.id;
  if (typeof entry?.nutrientId === "number") return entry.nutrientId;
  return null;
}

/**
 * A gram weight FDC publishes for one named household measure of a food.
 * The three datasets fill this in differently, which is why the reader below
 * looks at four fields rather than one: SR Legacy puts the unit in
 * `modifier` with `measureUnit` literally set to "undetermined"
 * (hummus: modifier "cup", gramWeight 246), Survey puts it in
 * `portionDescription` with no `amount` at all (tabbouleh: "1 cup", 160 g),
 * and Foundation uses `measureUnit` properly when it uses it.
 */
interface FdcPortion {
  amount?: number;
  gramWeight?: number;
  modifier?: string;
  portionDescription?: string;
  measureUnit?: { name?: string; abbreviation?: string };
}

interface FdcFoodDetail {
  fdcId: number;
  description: string;
  dataType: string;
  foodNutrients: FdcNutrientEntry[];
  foodPortions?: FdcPortion[];
}

// RANKED BY HOW COMPLETE THE NUTRIENT PROFILE ACTUALLY IS, not by how
// authoritative the dataset sounds. Foundation is FDC's newest and most
// rigorously measured set and the obvious thing to prefer, but measured
// against this app's own 103-row schema it is the thinnest: across the last
// full dry run, Foundation matches populated 13-25 of 103 nutrients, SR
// Legacy 49-62, and Survey (FNDDS) a consistent 40. Foundation publishes
// few nutrients per food to a high standard; SR Legacy publishes a full
// profile. For a nutrition screen that has to fill 103 rows, the fuller
// profile is worth more than the tighter one, so SR Legacy leads.
//
// THE KEYS ARE FDC'S OWN STRINGS, which is a bug this table used to carry:
// "Survey" was written here, FDC returns "Survey (FNDDS)". The lookup never
// matched, so every Survey food fell to the `?? 9` default and sorted BELOW
// Branded — the exact inversion of the intended preference. Branded stays
// last here even though searchFdc filters it out before this table is
// consulted: the filter is what excludes it, and this is the backstop for
// the one way a branded product still gets through (FDC files some under SR
// Legacy — "HOUSE FOODS Premium Firm Tofu" is in this catalog's own results).
const DATA_TYPE_RANK: Record<string, number> = {
  "SR Legacy": 0,
  "Survey (FNDDS)": 1,
  Foundation: 2,
  Branded: 3,
};

// BRANDED IS EXCLUDED CLIENT-SIDE, because FDC's gateway will not reliably
// accept the filter that would have done it at the source.
//
// The header has always said this script prefers measured data over a
// branded product label, and a bare pageSize=8 search could not enforce it:
// the sort could only reorder whatever the first page happened to contain,
// and for a plain whole food that page is often entirely Branded. Measured:
// a search for "Almonds" returned eight Branded "ALMONDS" rows and nothing
// else, while 48 Foundation/SR Legacy entries — including "Nuts, almonds" —
// existed and were never in view.
//
// The obvious fix — asking FDC for the types we want via dataType — is the
// one thing that cannot be done here, and finding out why is what this
// round measured:
//
//   api.data.gov's edge intermittently answers 400 Bad Request to ANY
//   request URL containing a parenthesis, encoded (%28) or literal, and
//   non-deterministically — the identical URL measured 200, 400, 400, 200,
//   400 back to back, while the same URL with the parentheses removed
//   measured 200 on 10 of 10.
//
// Every request this script sent carried "Survey (FNDDS)" in its dataType,
// so every request was a coin flip: that, not anything about the food names,
// is what failed 38 of 92 foods in the previous dry run. The two rules below
// follow from it, and the constraint is FDC's, not a preference:
//
//   * No dataType parameter at all. Foundation and SR Legacy alone would be
//     parenthesis-free and reliable, but they would silently drop Survey,
//     which is measured (FNDDS is built on real intake data) and is what
//     covers several prepared dishes here — it is also what matched this
//     catalog's "Broccoli, raw" and "Spinach, raw" exactly. So the response
//     is filtered instead, and pageSize is FDC's maximum so the measured
//     rows are genuinely in view rather than buried under branded labels.
//
//   * Parentheses are stripped from the query itself, so "Low-Fat Milk (1%)"
//     is searched as "Low-Fat Milk 1%". Measured: that returns the same
//     intended row ("Milk, low fat (1%)", Survey) and stops 400ing.
//
//   * A forward slash is stripped for the same measured reason: the query
//     "Beef, ground, 95% lean meat / 5% fat, raw" 400s on both attempts,
//     and the same query without the slash returns that exact row. No name
//     in this catalog carries one today, so this costs nothing now and
//     stops the next name that does from failing for a reason nobody would
//     think to look for. Percent signs and apostrophes are genuinely fine
//     and are left alone.
const SEARCH_PAGE_SIZE = 200;

function searchableName(name: string): string {
  return name.replace(/[()/]/g, " ").replace(/\s+/g, " ").trim();
}

async function searchFdc(name: string): Promise<FdcSearchFood | null> {
  const params = new URLSearchParams({
    query: searchableName(name),
    pageSize: String(SEARCH_PAGE_SIZE),
  });
  const result = (await fdcFetch(`/foods/search?${params}`)) as {
    foods?: FdcSearchFood[];
  };
  const foods = (result.foods ?? []).filter((f) => f.dataType !== "Branded");

  // A whole page of Branded and nothing else. This is not hypothetical and
  // not rare for a generic name: "Whole Milk" has 164,847 hits and all 200
  // of FDC's top-ranked ones are branded cartons, so the measured rows that
  // do exist are unreachable by page size alone. Retrying WITH a dataType
  // filter is safe here because Foundation and SR Legacy contain no
  // parentheses — it is only Survey (FNDDS) that the gateway chokes on (see
  // above) — so this fallback trades away Survey, which a branded-swamped
  // generic name was never going to reach anyway, for a real candidate.
  //
  // The candidate is still only a candidate: it comes back as a fuzzy match
  // and is reported for review like every other one. The point is that
  // "unmatched" should mean FDC has no measured row for this name, not that
  // its first page happened to be full of labels.
  if (foods.length === 0) {
    const measuredOnly = new URLSearchParams({
      query: searchableName(name),
      pageSize: "25",
      dataType: "Foundation,SR Legacy",
    });
    const retry = (await fdcFetch(`/foods/search?${measuredOnly}`)) as {
      foods?: FdcSearchFood[];
    };
    const measured = (retry.foods ?? []).filter((f) => f.dataType !== "Branded");
    if (measured.length === 0) return null;
    foods.push(...measured);
  }

  // RANKED FIRST, THEN SEARCHED FOR AN EXACT NAME — not the other way round.
  // The same description exists in more than one dataset ("Broccoli, raw" is
  // in both Survey and SR Legacy), so taking the first exact match in FDC's
  // relevance order threw away the completeness the ranking above exists to
  // capture. Array.prototype.sort is stable, so within a tier FDC's own
  // relevance ordering is preserved.
  const sorted = [...foods].sort(
    (a, b) => (DATA_TYPE_RANK[a.dataType] ?? 9) - (DATA_TYPE_RANK[b.dataType] ?? 9)
  );
  const normalized = name.trim().toLowerCase();
  return sorted.find((f) => f.description.trim().toLowerCase() === normalized) ?? sorted[0];
}

async function fetchFdcDetail(fdcId: number): Promise<FdcFoodDetail> {
  return (await fdcFetch(`/food/${fdcId}`)) as FdcFoodDetail;
}

/** FDC reports per 100 g. Sums multi-id mappings (e.g. lutein+zeaxanthin). */
function extractPer100g(detail: FdcFoodDetail): Record<string, number> {
  const byId = new Map<number, number>();
  let unidentified = 0;
  for (const entry of detail.foodNutrients ?? []) {
    if (typeof entry?.amount !== "number") continue;
    const id = nutrientIdOf(entry);
    if (id === null) {
      unidentified++;
      continue;
    }
    byId.set(id, entry.amount);
  }

  // Said out loud rather than swallowed. With Branded excluded from search
  // this should be zero; if it is ever not, the shape assumption has moved
  // again and the count is the first sign of it.
  if (unidentified > 0) {
    console.warn(
      `[fdc] "${detail.description}" (${detail.dataType}): ${unidentified} nutrient entr${
        unidentified === 1 ? "y" : "ies"
      } carried no nutrient id and were skipped.`
    );
  }

  const per100g: Record<string, number> = {};
  for (const mapping of RESOLVED_MAP) {
    const ids = mapping.fdcIds!;
    let sum = 0;
    let any = false;
    for (const id of ids) {
      const v = byId.get(id);
      if (v !== undefined) {
        sum += v;
        any = true;
      }
    }
    if (!any) continue; // no data for this nutrient in this food — leave it out, never a zero.

    if (mapping.confidence === "standard" && !alreadyVerified.has(mapping.name)) {
      alreadyVerified.add(mapping.name);
      console.log(
        `[VERIFY] "${mapping.name}" resolved via FDC id(s) ${ids.join("+")} = ${sum} ${mapping.unit} ` +
          `from "${detail.description}" — spot-check this against the live FDC response before trusting it at scale (see fdcNutrientMap.ts's header).`
      );
    }

    // EPA+DHA is stored in mg in this app's schema but FDC reports g for
    // the ids it's summed from (1278, 1272) — the one unit conversion this
    // map needs, called out explicitly rather than buried in a generic
    // "convert units" step that could silently mis-scale something else.
    per100g[mapping.key] = mapping.name === "EPA + DHA" ? sum * 1000 : sum;
  }
  return per100g;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

interface FoodRow {
  id: string;
  name: string;
  serving_label: string;
  calories: number;
}

// The words each of this app's serving units can appear as in FDC's portion
// fields. FDC is not consistent about spelling or placement ("tbsp" in an SR
// Legacy modifier, "Tablespoons" in a Foundation measureUnit name), so this
// matches whole words from any of the four fields rather than one field's
// exact spelling. Plain "g" and "ml" are absent deliberately: a gram label
// never reaches here, and treating a millilitre as a gram for an arbitrary
// food is exactly the guess this script refuses to make.
const PORTION_UNIT_WORDS: Record<string, string[]> = {
  cup: ["cup", "cups"],
  tbsp: ["tbsp", "tbs", "tablespoon", "tablespoons"],
  tsp: ["tsp", "teaspoon", "teaspoons"],
};

/** Grams in ONE `unit` of this food, per FDC's own portion table. */
function portionGramsPerUnit(detail: FdcFoodDetail, unit: string): number | null {
  const words = PORTION_UNIT_WORDS[unit];
  if (!words) return null;

  for (const portion of detail.foodPortions ?? []) {
    if (!(typeof portion.gramWeight === "number") || portion.gramWeight <= 0) continue;

    const tokens = new Set(
      [portion.measureUnit?.name, portion.measureUnit?.abbreviation, portion.modifier, portion.portionDescription]
        .filter((field): field is string => typeof field === "string")
        .join(" ")
        .toLowerCase()
        .split(/[^a-z]+/)
    );
    if (!words.some((word) => tokens.has(word))) continue;

    // HOW MANY of that unit the gram weight covers. SR Legacy says so in
    // `amount`; Survey omits `amount` and writes it into the description
    // ("1 cup"). Falling back to 1 when neither is present is not a guess
    // about the food — it is what "a cup" means when nothing says otherwise.
    const described = Number(portion.portionDescription?.trim().match(/^[0-9.]+/)?.[0]);
    const amount =
      portion.amount && portion.amount > 0 ? portion.amount : described > 0 ? described : 1;
    return portion.gramWeight / amount;
  }
  return null;
}

async function loadFoods(): Promise<FoodRow[]> {
  if (!supabase) {
    throw new Error("Cannot read the foods table without SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY, even for --dry-run's matching preview. Set both, or point --only at a name you'll type manually.");
  }
  let query = supabase.from("foods").select("id, name, serving_label, calories").order("name");
  if (ONLY) query = query.ilike("name", ONLY);
  const { data, error } = await query;
  if (error) throw new Error(`Could not read foods: ${error.message}`);
  return (LIMIT ? data?.slice(0, LIMIT) : data) ?? [];
}

async function main() {
  const foods = await loadFoods();
  console.log(`Loaded ${foods.length} food${foods.length === 1 ? "" : "s"} to match against FDC.\n`);

  let matchedExact = 0;
  let matchedFuzzy = 0;
  const unmatched: string[] = [];
  const skippedNoGramWeight: string[] = [];
  const failures: string[] = [];

  for (const food of foods) {
    try {
      // A GRAM WEIGHT IN THE LABEL IS STILL THE HONEST BASIS and is used
      // as-is. Failing that, a countable household measure — "1/2 cup",
      // "2 tbsp" — can still be converted, but only with FDC's own gram
      // weight for that measure OF THAT FOOD, which isn't known until the
      // food has been matched and fetched. So the search now runs before the
      // skip decision instead of after it, and 24 foods that were skipped
      // unconditionally get a real chance.
      //
      // A label naming no unit at all still skips without spending a request:
      // "1 piece", "1 wrap", "1 bowl" and "3 skewers" have nothing to convert
      // FROM, and inventing a weight for them is the guess this script exists
      // to refuse. That distinction — no unit vs. a unit FDC has no weight
      // for — is why the skip message now says which one happened.
      const labelGrams = gramsInServingLabel(food.serving_label);
      const labelUnit = labelGrams ? null : servingLabelUnit(food.serving_label);
      if (!labelGrams && !labelUnit) {
        skippedNoGramWeight.push(
          `${food.name} (serving: "${food.serving_label}" — no unit to convert from)`
        );
        continue;
      }

      const found = await searchFdc(food.name);
      if (!found) {
        unmatched.push(food.name);
        continue;
      }
      const isExact = found.description.trim().toLowerCase() === food.name.trim().toLowerCase();

      const detail = await fetchFdcDetail(found.fdcId);

      const perUnit = labelUnit ? portionGramsPerUnit(detail, labelUnit.unit) : null;
      const grams = labelGrams ?? (perUnit && labelUnit ? labelUnit.count * perUnit : null);
      if (!grams) {
        skippedNoGramWeight.push(
          `${food.name} (serving: "${food.serving_label}" — FDC ${found.fdcId} "${found.description}" publishes no gram weight per ${labelUnit?.unit})`
        );
        continue;
      }

      const per100g = extractPer100g(detail);
      const scale = grams / 100;
      const nutrients = Object.fromEntries(
        Object.entries(per100g).map(([key, amount]) => [key, Math.round(amount * scale * 1000) / 1000])
      );

      console.log(
        `${isExact ? "[exact]" : "[fuzzy]"} ${food.name} -> FDC ${found.fdcId} "${found.description}" ` +
          `(${found.dataType}) — ${Object.keys(nutrients).length}/${ALL_NUTRIENT_ROWS.length} nutrients matched` +
          // Named explicitly when the serving basis came from FDC rather
          // than from the label, because it is the one number in this line
          // that was derived rather than read, and every nutrient on the
          // row is scaled by it.
          (labelGrams ? "" : ` [${food.serving_label} = ${Math.round(grams)} g, from FDC portion data]`)
      );

      let writeError: string | null = null;
      if (!DRY_RUN && supabase) {
        const { error } = await supabase.from("food_nutrients").upsert({
          food_id: food.id,
          fdc_id: found.fdcId,
          fdc_description: found.description,
          match_confidence: isExact ? "exact" : "fuzzy",
          nutrients,
          imported_at: new Date().toISOString(),
        });
        if (error) writeError = error.message;
      }

      // THE ONE PLACE A FOOD IS COUNTED AS MATCHED. Every other bucket above
      // reaches its own `continue`, and this line sits past the last step that
      // could still reassign the food, so each food lands in exactly one
      // bucket and the buckets sum to foods.length. The previous version
      // incremented the match counters the moment a search hit came back, so a
      // food that then failed its detail fetch or its write was counted twice
      // — which is why the last dry run's buckets summed to 115 across 92
      // foods.
      if (writeError) failures.push(`${food.name}: ${writeError}`);
      else if (isExact) matchedExact++;
      else matchedFuzzy++;

      // Polite pacing — see this session's own DEMO_KEY rate-limit hit.
      await sleep(150);
    } catch (err) {
      failures.push(`${food.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Every food resolves to exactly one of these five buckets, so they sum to
  // foods.length. Printed and checked rather than assumed: a future edit that
  // adds a sixth outcome, or re-introduces a double-count, shows up here
  // instead of quietly skewing the match-quality picture.
  const accounted =
    matchedExact + matchedFuzzy + unmatched.length + skippedNoGramWeight.length + failures.length;

  console.log("\n" + "=".repeat(72));
  console.log(`${DRY_RUN ? "DRY RUN — no rows written" : "Import complete"}`);
  console.log(`  Foods considered: ${foods.length}`);
  console.log(`  Matched exact: ${matchedExact}`);
  console.log(`  Matched fuzzy (review these): ${matchedFuzzy}`);
  console.log(`  Unmatched (no FDC result at all): ${unmatched.length}`);
  if (unmatched.length) console.log("    " + unmatched.join(", "));
  console.log(`  Skipped, no gram weight to convert against: ${skippedNoGramWeight.length}`);
  if (skippedNoGramWeight.length) console.log("    " + skippedNoGramWeight.join(", "));
  if (failures.length) {
    console.log(`  Failures: ${failures.length}`);
    console.log("    " + failures.join("\n    "));
  }
  if (accounted !== foods.length) {
    console.warn(
      `  BUCKET MISMATCH: ${accounted} outcomes recorded for ${foods.length} foods - the summary above is not a clean partition.`
    );
  }
  console.log("=".repeat(72));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
