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
import { FDC_OVERRIDES, type FdcOverride } from "./fdc-overrides";
import {
  FDC_COMPUTED,
  SECTION_BY_KEY,
  atwaterCalories,
  partitionFor,
  type ComputedFood,
} from "./fdc-computed";

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

// WITHIN A TIER, THE CLOSEST NAME WINS. FDC's own result order is a
// relevance order, not a name-similarity order, and SR Legacy is large
// enough that a DERIVATIVE of a food routinely outranks the food itself.
// Measured on the previous dry run: "Apple" landed on "Croissants, apple",
// "Walnuts" on "Oil, walnut", "Orange" on "Marmalade, orange", "Carrot" on
// "Carrot, dehydrated" — fourteen in all. Ranking by completeness bought
// ~1,700 populated nutrients and paid for it in matches like those; this is
// what buys most of them back.
//
// The score is built only from signals that are IN the data, not from a
// list of foods:
//
//   HEAD NOUN — FDC writes descriptions head-first ("Apples, raw, with
//   skin"), so the text before the first comma is the food and everything
//   after qualifies it. A head containing one of the catalog name's words
//   outweighs any number of qualifier hits, which is the whole difference
//   between "Apples, raw" and "Croissants, apple".
//
//   COVERAGE — each distinct catalog word found anywhere in the
//   description. "Cheddar Cheese" scores twice against "Cheese, cheddar".
//
//   BRAND SHOUTING — FDC capitalises brand names inside otherwise
//   lower-case descriptions: "SILK Coffee, soymilk", "Cereals, QUAKER,
//   Quick Oats, Dry", "HOUSE FOODS Premium Firm Tofu", "Rice, brown,
//   parboiled, cooked, UNCLE BENS". Those are branded products filed under
//   SR Legacy, where the Branded dataType filter never sees them. An
//   all-caps word the catalog name did not ask for is the one reliable
//   marker of it, and it is treated as disqualifying rather than merely bad.
//
//   FORM WORDS — a word naming a different FORM of the food (oil, powder,
//   dehydrated, flour) is penalised ONLY when the catalog name doesn't
//   contain it, so "Tuna, canned in water" is not punished for "canned"
//   while "Tomato" is punished for "powder".
//
//   EVERY OTHER UNMATCHED WORD costs a little, so among otherwise equal
//   descriptions the plainest one wins.
//
// This is a heuristic and is not expected to be right every time. The
// override table below is what pins the cases it gets wrong; the point of
// the score is to keep that table down to the foods that genuinely need a
// human decision.
const SCORE_WEIGHTS = {
  /** A catalog word the description has, and the same size penalty for one it lacks. */
  word: 100,
  /** The description's very first word being one of the catalog's. */
  headFirst: 50,
  /** An unmatched word INSIDE the head — the head is the food's identity. */
  headExtra: 49,
  /** An unmatched word that names a different form of the food. */
  form: 29,
  /** Any other unmatched word: enough to break a tie toward the plainest. */
  other: 1,
  /** An all-caps word the catalog never asked for. Disqualifying. */
  brand: 500,
};

// BOTH WORD SETS ARE STEMMED ON CONSTRUCTION, because every word they are
// tested against has been through scoreStem first: "cookies" arrives as
// "cooki" and "juice" as "juic", so a set holding the dictionary spelling
// would silently never match. Written as the readable spellings and stemmed
// once here, rather than as pre-stemmed strings nobody could check.

// Grammar and USDA boilerplate. Free rather than penalised, because their
// presence says nothing about whether this is the right food ("Includes
// foods for USDA's Food Distribution Program" is appended to hundreds of
// rows).
const SCORE_STOPWORDS = new Set(
  [
    "a", "all", "and", "commercial", "commercially", "distribution", "food", "foods", "for",
    "in", "includes", "of", "or", "program", "s", "the", "usda", "variety", "varieties", "with",
    "without",
  ].map(scoreStem)
);

// Words that mean a DIFFERENT FORM of the food rather than a preparation of
// it. Cooking words ("cooked", "roasted", "boiled", "raw") are deliberately
// absent: this catalog's names often specify one, and a food prepared the
// way the catalog says is the match, not a penalty.
// "Dried", "frozen" and "canned" are absent for a related reason: they
// preserve a food rather than transform it, and for several catalog foods
// the preserved entry is the only measured one FDC has ("Seeds, sunflower
// seed kernels, dried" is the sunflower seed row).
const SCORE_FORM_WORDS = new Set(
  [
    "bread", "breaded", "cake", "candied", "chips", "cookie", "cookies", "croissant",
    "croissants", "dehydrated", "flour", "glazed", "imitation", "jam", "jelly", "juice",
    "marmalade", "oil", "paste", "pie", "powder", "salad", "sandwich", "sauce", "soup",
    "spread", "sticks", "substitute", "syrup",
  ].map(scoreStem)
);

// Crude, deliberately symmetrical stemming: a trailing "s" then a trailing
// "e", applied to both sides so they agree. "Oranges"/"orange" both reach
// "orang" and "Tomatoes"/"tomato" both reach "tomato", which plural-only
// stripping does not manage.
function scoreStem(word: string): string {
  const singular = word.length > 3 ? word.replace(/s$/, "") : word;
  return singular.length > 3 ? singular.replace(/e$/, "") : singular;
}

// Digits are kept as words on purpose. They are the whole difference between
// "Milk, fluid, 1% fat" and "Milk, low sodium, fluid" for a catalog food
// called "Low-Fat Milk (1%)", and between 95% and 80% lean ground beef.
function scoreWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map(scoreStem);
}

/** All-caps runs of 3+ letters — FDC's own marker for a brand name. */
function shoutedWords(text: string): string[] {
  return (text.match(/[A-Z]{3,}/g) ?? []).map((w) => scoreStem(w.toLowerCase()));
}

function nameScore(description: string, catalogWords: Set<string>): number {
  const headWords = scoreWords(description.split(",")[0] ?? "");
  const headSet = new Set(headWords);
  const all = new Set(scoreWords(description));

  let score = 0;

  // A catalog word the description LACKS counts against it as hard as a
  // present one counts for it. Without that, "Salmon nuggets, cooked" scored
  // close to "Fish, salmon, Atlantic, farmed, cooked, dry heat" simply by
  // being shorter — missing the word that made the match specific was free.
  for (const word of catalogWords) score += all.has(word) ? SCORE_WEIGHTS.word : -SCORE_WEIGHTS.word;

  if (headWords[0] && catalogWords.has(headWords[0])) score += SCORE_WEIGHTS.headFirst;

  for (const word of shoutedWords(description)) {
    if (!catalogWords.has(word)) score -= SCORE_WEIGHTS.brand;
  }

  for (const word of all) {
    if (catalogWords.has(word) || SCORE_STOPWORDS.has(word)) continue;
    score -= SCORE_WEIGHTS.other;
    // An extra word in the head names a DIFFERENT food, not a variation of
    // this one: "Grape leaves", "Salmon nuggets", "Wild rice", "Fish broth"
    // and "Rose-apples" all beat the right answer until this landed.
    if (headSet.has(word)) score -= SCORE_WEIGHTS.headExtra;
    if (SCORE_FORM_WORDS.has(word)) score -= SCORE_WEIGHTS.form;
  }
  return score;
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
  // capture.
  //
  // Tier first, then name similarity within the tier, then — because sort is
  // stable — FDC's own relevance order for anything still tied.
  const catalogWords = new Set(scoreWords(name));
  const sorted = [...foods].sort((a, b) => {
    const tier = (DATA_TYPE_RANK[a.dataType] ?? 9) - (DATA_TYPE_RANK[b.dataType] ?? 9);
    if (tier !== 0) return tier;
    return nameScore(b.description, catalogWords) - nameScore(a.description, catalogWords);
  });
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

// Case-insensitive because the override table is written the way a person
// reads the catalog, and a capitalisation drift between the two would fail
// silently in the direction of doing nothing.
const OVERRIDES_BY_NAME = new Map(
  Object.entries(FDC_OVERRIDES).map(([name, override]) => [name.trim().toLowerCase(), override])
);

function overrideFor(name: string): FdcOverride | undefined {
  return OVERRIDES_BY_NAME.get(name.trim().toLowerCase());
}

// AN OVERRIDE FOR A FOOD THAT DOESN'T EXIST DOES NOTHING, AND SAYS NOTHING.
// A renamed or deleted catalog food would leave its pin behind as a line
// that looks like a decision and has no effect, so the mismatch is a hard
// error rather than a warning — there is no version of this worth
// continuing past.
const COMPUTED_BY_NAME = new Map(
  Object.entries(FDC_COMPUTED).map(([name, spec]) => [name.trim().toLowerCase(), spec])
);

function computedFor(name: string): ComputedFood | undefined {
  return COMPUTED_BY_NAME.get(name.trim().toLowerCase());
}

/**
 * Per-serving nutrients for a food FDC has no row for, from FDC rows for
 * what it is made of. Returns the same shape a matched food produces, so
 * nothing downstream has to know the difference.
 */
async function computeNutrients(
  spec: ComputedFood
): Promise<{ nutrients: Record<string, number>; servingGrams: number }> {
  const per100: Record<string, number> = {};

  if (spec.kind === "recipe") {
    // Straight mass balance. Energy is summed from the ingredients' own
    // measured values rather than recomputed, because nothing here is being
    // concentrated — what goes in is what comes out.
    const totals: Record<string, number> = {};
    for (const ingredient of spec.ingredients) {
      // An ingredient with no FDC row carries its own cited composition.
      if ("composition" in ingredient) {
        console.log(`    · ${ingredient.label} (${ingredient.grams} g) <- measured composition: ${ingredient.compositionSource}`);
        for (const [key, amount] of Object.entries(ingredient.composition)) {
          totals[key] = (totals[key] ?? 0) + (amount * ingredient.grams) / 100;
        }
        continue;
      }
      const detail = await fetchFdcDetail(ingredient.fdcId);
      // Printed so a mistyped id shows up in a dry run as the wrong food
      // next to its label, rather than silently feeding a recipe.
      console.log(`    · ${ingredient.label} (${ingredient.grams} g) <- FDC ${ingredient.fdcId} "${detail.description}"`);
      const values = extractPer100g(detail);
      for (const [key, amount] of Object.entries(values)) {
        totals[key] = (totals[key] ?? 0) + (amount * ingredient.grams) / 100;
      }
      await sleep(150);
    }
    for (const [key, amount] of Object.entries(totals)) {
      per100[key] = (amount / spec.yieldGrams) * 100;
    }
  } else {
    const base = extractPer100g(await fetchFdcDetail(spec.base.fdcId));

    // The three anchors only mean anything as RATIOS against the base's own
    // measured values, so a base missing any of them would silently produce
    // Infinity or NaN across a whole profile. Caught here instead.
    for (const key of ["total_fat", "protein", "water"]) {
      if (!(base[key] > 0)) {
        throw new Error(
          `FDC ${spec.base.fdcId} ("${spec.base.label}") publishes no usable ${key}, so it cannot be used as a concentrate base.`
        );
      }
    }

    const factors: Record<string, number> = {
      fat: spec.anchors.fatG / base.total_fat,
      curd: spec.anchors.proteinG / base.protein,
      serum: spec.anchors.waterG / base.water,
    };

    for (const [key, amount] of Object.entries(base)) {
      per100[key] = amount * factors[partitionFor(key, SECTION_BY_KEY[key] ?? "others")];
    }

    // The anchors are measurements of the finished food, so they are set
    // exactly rather than left as the product of a rounded ratio.
    per100.total_fat = spec.anchors.fatG;
    per100.protein = spec.anchors.proteinG;
    per100.water = spec.anchors.waterG;
    if (per100.calories !== undefined) per100.calories = atwaterCalories(per100);
  }

  let servingGrams: number;
  if (spec.kind === "recipe" && spec.servingKcal !== undefined) {
    if (spec.servingGrams !== undefined) throw new Error("A computed recipe gives servingGrams or servingKcal, not both.");
    if (!(per100.calories > 0)) throw new Error("Cannot size a serving by calories: the recipe computed no energy.");
    servingGrams = (spec.servingKcal / per100.calories) * 100;
  } else if (spec.servingGrams !== undefined) {
    servingGrams = spec.servingGrams;
  } else {
    throw new Error("A computed food needs servingGrams (or, for a recipe, servingKcal).");
  }

  const scale = servingGrams / 100;
  return {
    nutrients: Object.fromEntries(
      Object.entries(per100).map(([key, amount]) => [key, Math.round(amount * scale * 1000) / 1000])
    ),
    servingGrams: Math.round(servingGrams * 10) / 10,
  };
}

function assertCuratedNamesMatchCatalog(foods: FoodRow[]) {
  // ONLY MEANINGFUL AGAINST THE WHOLE CATALOG. --only and --limit hand this
  // a deliberately short list, where every curated name that wasn't asked
  // for looks dead. Checking anyway turned a one-food dry run into a
  // 30-name error about nothing.
  if (ONLY || LIMIT) {
    console.log("[note] --only/--limit in use, so the curated-name check against the catalog is skipped.");
    return;
  }

  const known = new Set(foods.map((f) => f.name.trim().toLowerCase()));
  for (const [file, names] of [
    ["fdc-overrides.ts", Object.keys(FDC_OVERRIDES)],
    ["fdc-computed.ts", Object.keys(FDC_COMPUTED)],
  ] as const) {
    const dead = names.filter((name) => !known.has(name.trim().toLowerCase()));
    if (dead.length > 0) {
      throw new Error(
        `${file} names ${dead.length} food${dead.length === 1 ? "" : "s"} that the catalog does not contain: ${dead.join(", ")}. Fix the key or remove the row.`
      );
    }
  }

  // A food cannot be both pinned to an FDC row and computed from other
  // rows; whichever branch ran first would win and the other would look
  // like it had been applied when it never was.
  const both = Object.keys(FDC_COMPUTED).filter((name) => FDC_OVERRIDES[name] !== undefined);
  if (both.length > 0) {
    throw new Error(`${both.join(", ")} appear in BOTH fdc-overrides.ts and fdc-computed.ts. Pick one.`);
  }
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
  assertCuratedNamesMatchCatalog(foods);
  console.log(`Loaded ${foods.length} food${foods.length === 1 ? "" : "s"} to match against FDC.\n`);

  let matchedExact = 0;
  let matchedFuzzy = 0;
  let matchedManual = 0;
  let matchedComputed = 0;
  const unmatched: string[] = [];
  const skippedNoGramWeight: string[] = [];
  const failures: string[] = [];

  for (const food of foods) {
    try {
      // COMPUTED FOODS SHORT-CIRCUIT EVERYTHING BELOW. There is no FDC row
      // to search for, and no gram weight to read off the label either —
      // the derivation states its own serving weight, because it is the
      // thing that knows how much a tablespoon of the finished food
      // actually weighs.
      const computed = computedFor(food.name);
      if (computed) {
        const { nutrients, servingGrams } = await computeNutrients(computed);

        // If the catalog label DOES carry a gram weight, it and the
        // derivation have to agree, or the app would show per-serving
        // numbers for a serving the label describes as a different size.
        const labelled = gramsInServingLabel(food.serving_label);
        if (labelled && Math.abs(labelled - servingGrams) > 0.5) {
          throw new Error(
            `${food.name}: fdc-computed.ts gives one serving as ${servingGrams} g, the catalog label says ${labelled} g ("${food.serving_label}"). Fix whichever is wrong.`
          );
        }

        const sizedByKcal = computed.kind === "recipe" && computed.servingKcal !== undefined;
        console.log(
          `[computed] ${food.name} -> ${computed.derivation} — ` +
            `${Object.keys(nutrients).length}/${ALL_NUTRIENT_ROWS.length} nutrients, per ${servingGrams} g serving` +
            (sizedByKcal ? ` (sized to the catalog's ${computed.servingKcal} kcal)` : "")
        );

        let computeWriteError: string | null = null;
        if (!DRY_RUN && supabase) {
          const { error } = await supabase.from("food_nutrients").upsert({
            food_id: food.id,
            // No single id produced these, so the column stays null rather
            // than naming one ingredient as though it were the source.
            fdc_id: null,
            fdc_description: computed.derivation,
            match_confidence: "computed",
            nutrients,
            imported_at: new Date().toISOString(),
          });
          if (error) computeWriteError = error.message;
        }
        if (computeWriteError) failures.push(`${food.name}: ${computeWriteError}`);
        else matchedComputed++;
        await sleep(150);
        continue;
      }

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
      //
      // …unless a pinned override states a SOURCED gram weight for the
      // serving (servingGrams, with its servingSource). That is the one way a
      // count label gets converted: someone looked the weight up, and the
      // override table records where.
      const override = overrideFor(food.name);
      const labelGrams = gramsInServingLabel(food.serving_label);
      if (labelGrams && override?.servingGrams && Math.abs(labelGrams - override.servingGrams) > 0.5) {
        throw new Error(
          `${food.name}: fdc-overrides.ts says one serving is ${override.servingGrams} g, the catalog label says ${labelGrams} g ("${food.serving_label}"). Fix whichever is wrong.`
        );
      }
      const labelUnit = labelGrams || override?.servingGrams ? null : servingLabelUnit(food.serving_label);
      if (!labelGrams && !labelUnit && !override?.servingGrams) {
        skippedNoGramWeight.push(
          `${food.name} (serving: "${food.serving_label}" — no unit to convert from)`
        );
        continue;
      }

      // A PINNED ID SKIPS THE SEARCH ENTIRELY. The override table IS the
      // decision for these foods; searching anyway and then discarding the
      // result would only give the two something to disagree about silently.

      let detail: FdcFoodDetail;
      let fdcId: number;
      let description: string;
      let dataType: string;
      let confidence: string;
      if (override) {
        detail = await fetchFdcDetail(override.fdcId);
        fdcId = override.fdcId;
        // FDC's own description for the pinned row, not a remembered copy of
        // it in the override table: the column should say what was actually
        // fetched, and a description that has since changed upstream is worth
        // seeing rather than papering over.
        description = detail.description;
        dataType = detail.dataType;
        confidence = "manual";
      } else {
        const found = await searchFdc(food.name);
        if (!found) {
          unmatched.push(food.name);
          continue;
        }
        detail = await fetchFdcDetail(found.fdcId);
        fdcId = found.fdcId;
        description = found.description;
        dataType = found.dataType;
        confidence =
          description.trim().toLowerCase() === food.name.trim().toLowerCase() ? "exact" : "fuzzy";
      }

      const perUnit = labelUnit ? portionGramsPerUnit(detail, labelUnit.unit) : null;
      const grams =
        labelGrams ?? override?.servingGrams ?? (perUnit && labelUnit ? labelUnit.count * perUnit : null);
      if (!grams) {
        skippedNoGramWeight.push(
          `${food.name} (serving: "${food.serving_label}" — FDC ${fdcId} "${description}" publishes no gram weight per ${labelUnit?.unit})`
        );
        continue;
      }

      const per100g = extractPer100g(detail);
      const scale = grams / 100;
      const nutrients = Object.fromEntries(
        Object.entries(per100g).map(([key, amount]) => [key, Math.round(amount * scale * 1000) / 1000])
      );

      console.log(
        `[${confidence}]${override?.lowConfidence ? "[low-confidence]" : ""} ${food.name} -> FDC ${fdcId} "${description}" ` +
          `(${dataType}) — ${Object.keys(nutrients).length}/${ALL_NUTRIENT_ROWS.length} nutrients matched` +
          // Named explicitly when the serving basis came from FDC rather
          // than from the label, because it is the one number in this line
          // that was derived rather than read, and every nutrient on the
          // row is scaled by it.
          (labelGrams
            ? ""
            : override?.servingGrams
              ? ` [${food.serving_label} = ${override.servingGrams} g, from ${override.servingSource ?? "fdc-overrides.ts"}]`
              : ` [${food.serving_label} = ${Math.round(grams)} g, from FDC portion data]`)
      );

      let writeError: string | null = null;
      if (!DRY_RUN && supabase) {
        const { error } = await supabase.from("food_nutrients").upsert({
          food_id: food.id,
          fdc_id: fdcId,
          fdc_description: description,
          match_confidence: confidence,
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
      // — which is why an early dry run's buckets summed to 115 across 92
      // foods.
      if (writeError) failures.push(`${food.name}: ${writeError}`);
      else if (confidence === "manual") matchedManual++;
      else if (confidence === "exact") matchedExact++;
      else matchedFuzzy++;

      // Polite pacing — see this session's own DEMO_KEY rate-limit hit.
      await sleep(150);
    } catch (err) {
      failures.push(`${food.name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Every food resolves to exactly one of these seven buckets, so they sum to
  // foods.length. Printed and checked rather than assumed: a future edit that
  // adds a sixth outcome, or re-introduces a double-count, shows up here
  // instead of quietly skewing the match-quality picture.
  const accounted =
    matchedExact + matchedFuzzy + matchedManual + matchedComputed + unmatched.length + skippedNoGramWeight.length + failures.length;

  console.log("\n" + "=".repeat(72));
  console.log(`${DRY_RUN ? "DRY RUN — no rows written" : "Import complete"}`);
  console.log(`  Foods considered: ${foods.length}`);
  console.log(`  Matched exact: ${matchedExact}`);
  console.log(`  Pinned by the override table: ${matchedManual}`);
  console.log(`  Computed from ingredient data: ${matchedComputed}`);
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
