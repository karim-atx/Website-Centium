import { ALL_NUTRIENT_ROWS } from "../../data/nutrientSchema";
import { OFFLINE_MESSAGE } from "../network-error";

// Round D · DP, looking foods up online (search-foods-online, save_found_food,
// submit_food_to_catalogue): the pure half. Parsing the function's answer,
// its order, the words for every failure, and which foods may be suggested for
// the shared catalogue. Kept apart from onlineSearch.ts so it can be tested
// without a Supabase client.

export type OnlineSource = "usda_fdc" | "open_food_facts";
export type OnlineSourceStatus = "ok" | "cached" | "unavailable" | "not_configured";

/** One search-foods-online result. Every number is PER SERVING (`servingLabel`). */
export interface OnlineFood {
  source: OnlineSource;
  ref: string;
  name: string;
  brand: string | null;
  servingLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  /** The app's nutrient keys; a missing key is "no data", never zero. */
  nutrients: Record<string, number>;
  dataKind: "general" | "branded";
  attribution: { source: OnlineSource; ref: string; url: string | null; notice: string | null; fetchedAt: string | null };
}

export type OnlineSources = Partial<Record<OnlineSource, OnlineSourceStatus>>;

export type OnlineFailureKind = "offline" | "rate_limited" | "unavailable" | "invalid_query" | "signed_out" | "error";

export type OnlineSearchOutcome =
  | { ok: true; results: OnlineFood[]; sources: OnlineSources }
  | { ok: false; kind: OnlineFailureKind; message: string };

export const ONLINE_QUERY_MIN = 2;
export const ONLINE_QUERY_MAX = 80;

/** The words sent, trimmed with inner spaces collapsed, or null outside 2-80 characters. */
export function onlineQuery(raw: string): string | null {
  const q = raw.trim().replace(/\s+/g, " ");
  return q.length >= ONLINE_QUERY_MIN && q.length <= ONLINE_QUERY_MAX ? q : null;
}

const isSource = (v: unknown): v is OnlineSource => v === "usda_fdc" || v === "open_food_facts";
const text = (v: unknown): string | null => (typeof v === "string" && v.trim() !== "" ? v.trim() : null);
const amount = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** One result as the app uses it, or null when it lacks what saving needs (a source, ref, name, serving and calories). */
export function parseOnlineFood(x: unknown): OnlineFood | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const ref = text(r.ref);
  const name = text(r.name);
  const servingLabel = text(r.servingLabel);
  const calories = amount(r.calories);
  if (!isSource(r.source) || !ref || !name || !servingLabel || calories === null) return null;
  const nutrients: Record<string, number> = {};
  if (r.nutrients && typeof r.nutrients === "object" && !Array.isArray(r.nutrients)) {
    for (const [k, v] of Object.entries(r.nutrients as Record<string, unknown>)) {
      const n = amount(v);
      if (n !== null && /^[a-z0-9_]{1,48}$/.test(k)) nutrients[k] = n;
    }
  }
  const a = r.attribution && typeof r.attribution === "object" ? (r.attribution as Record<string, unknown>) : {};
  return {
    source: r.source,
    ref,
    name,
    brand: text(r.brand),
    servingLabel,
    calories,
    protein: amount(r.protein_g) ?? 0,
    carbs: amount(r.carbs_g) ?? 0,
    fat: amount(r.fat_g) ?? 0,
    nutrients,
    dataKind: r.dataKind === "branded" ? "branded" : "general",
    attribution: { source: r.source, ref, url: text(a.url), notice: text(a.notice), fetchedAt: text(a.fetchedAt) },
  };
}

const rank = (f: OnlineFood) => (f.source === "usda_fdc" ? (f.dataKind === "general" ? 0 : 1) : 2);

/** USDA's general data first, then USDA branded foods, then Open Food Facts; the function's order within each. */
export function orderOnlineResults(list: readonly OnlineFood[]): OnlineFood[] {
  return list
    .map((f, i) => ({ f, i }))
    .sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i)
    .map((x) => x.f);
}

/** The success body: usable results in order (one per source and ref), and each source's status. */
export function parseOnlineResults(body: unknown): { results: OnlineFood[]; sources: OnlineSources } {
  const b = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const seen = new Set<string>();
  const results: OnlineFood[] = [];
  for (const x of Array.isArray(b.results) ? b.results : []) {
    const f = parseOnlineFood(x);
    if (!f || seen.has(`${f.source}:${f.ref}`)) continue;
    seen.add(`${f.source}:${f.ref}`);
    results.push(f);
  }
  const sources: OnlineSources = {};
  const s = b.sources && typeof b.sources === "object" ? (b.sources as Record<string, unknown>) : {};
  for (const k of ["usda_fdc", "open_food_facts"] as const) {
    const v = s[k];
    if (v === "ok" || v === "cached" || v === "unavailable" || v === "not_configured") sources[k] = v;
  }
  return { results: orderOnlineResults(results), sources };
}

/** Which failure an HTTP status and code are. A request that never got an answer is offline. */
export function onlineFailureKind(status: number, code: string | undefined, offline: boolean): OnlineFailureKind {
  if (offline) return "offline";
  if (status === 429 || code === "rate_limited") return "rate_limited";
  if (status === 503 || code === "upstream_unavailable") return "unavailable";
  if (status === 400 || code === "invalid_query") return "invalid_query";
  if (status === 401 || code === "unauthenticated") return "signed_out";
  return "error";
}

export function onlineFailureMessage(kind: OnlineFailureKind): string {
  switch (kind) {
    case "offline":
      return "Searching online needs a connection.";
    case "rate_limited":
      return "You can search online 30 times an hour. Try again later, or add it yourself.";
    case "unavailable":
      return "The online food databases aren't answering right now. Try again later, or add it yourself.";
    case "invalid_query":
      return "Search online with 2 to 80 characters.";
    case "signed_out":
      return "Your session expired. Sign in again to search online.";
    default:
      return "Couldn't search online. Try again.";
  }
}

export const SOURCE_NAME: Record<OnlineSource, string> = { usda_fdc: "USDA", open_food_facts: "Open Food Facts" };
const SOURCE_FULL: Record<OnlineSource, string> = { usda_fdc: "USDA FoodData Central", open_food_facts: "Open Food Facts" };

/**
 * A line when one source didn't take part (unavailable or not set up), so a
 * short list isn't read as all there is. Null when both answered.
 */
export function sourcesNote(sources: OnlineSources): string | null {
  const answered = (k: OnlineSource) => sources[k] === "ok" || sources[k] === "cached";
  const missing = (["usda_fdc", "open_food_facts"] as const).filter((k) => sources[k] !== undefined && !answered(k));
  if (missing.length !== 1) return null;
  const other = missing[0] === "usda_fdc" ? "open_food_facts" : "usda_fdc";
  return `Results from ${SOURCE_FULL[other]} only. ${SOURCE_FULL[missing[0]]} isn't available right now.`;
}

/** The source line on the confirm card (Open Food Facts adds its notice and link). */
export function sourceLine(source: OnlineSource): string {
  return source === "usda_fdc" ? "From USDA FoodData Central (public domain)." : "Product data from Open Food Facts.";
}

/** "Brand · serving", or the serving alone. */
export function brandServing(brand: string | null | undefined, serving: string): string {
  return brand ? `${brand} · ${serving}` : serving;
}

/** "P 12g · C 30g · F 5g", per serving. */
export function macroLine(f: { protein: number; carbs: number; fat: number }): string {
  const g = (n: number) => `${Math.round(n * 10) / 10}g`;
  return `P ${g(f.protein)} · C ${g(f.carbs)} · F ${g(f.fat)}`;
}

/** The four the macro strip already shows, so the nutrient list leaves them out. */
const MACRO_KEYS = new Set(["calories", "protein", "total_fat", "total_carbohydrates"]);

export interface NutrientLine {
  key: string;
  name: string;
  unit: string;
  amount: number;
}

/** The nutrients a source gave, by the app's own names and units, in the app's order; anything it didn't give is left out. */
export function foundNutrientLines(nutrients: Readonly<Record<string, number>> | null | undefined): NutrientLine[] {
  if (!nutrients) return [];
  const seen = new Set<string>();
  const out: NutrientLine[] = [];
  for (const row of ALL_NUTRIENT_ROWS) {
    if (seen.has(row.key) || MACRO_KEYS.has(row.key)) continue;
    seen.add(row.key);
    const v = nutrients[row.key];
    if (typeof v === "number" && Number.isFinite(v)) out.push({ key: row.key, name: row.name, unit: row.unit, amount: v });
  }
  return out;
}

/** "1.2", "0.035", "250": small amounts keep their digits. */
export function formatNutrientAmount(n: number): string {
  const a = Math.abs(n);
  if (a === 0) return "0";
  if (a < 0.1) return n.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
  if (a < 10) return (Math.round(n * 10) / 10).toString();
  return Math.round(n).toLocaleString("en-US");
}

/** save_found_food's arguments for a confirmed result. */
export function saveFoundFoodArgs(f: OnlineFood): Record<string, unknown> {
  return {
    p_source: f.source,
    p_ref: f.ref,
    p_name: f.name,
    p_brand: f.brand,
    p_serving_label: f.servingLabel,
    p_calories: f.calories,
    p_protein_g: f.protein,
    p_carbs_g: f.carbs,
    p_fat_g: f.fat,
    p_nutrients: Object.keys(f.nutrients).length > 0 ? f.nutrients : null,
    p_fetched_at: f.attribution.fetchedAt,
  };
}

export function saveFoundFoodMessage(code: string | undefined, offline: boolean): string {
  if (offline) return OFFLINE_MESSAGE;
  if (code === "22023") return "This food's values are outside what we can save. Add it yourself instead.";
  if (code === "ATX06") return "Your session expired. Sign in again to save foods.";
  return "Couldn't save that food. Try again.";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a food may be suggested for the shared catalogue: one of the user's
 * own saved foods (a real row), found in USDA or typed by them. NEVER Open
 * Food Facts data (ATXL0): its licence would follow it into the catalogue.
 */
export function canSuggestForCatalogue(food: { id: string; source: string; externalSource?: string | null }): boolean {
  return food.source === "custom" && UUID.test(food.id) && food.externalSource !== "open_food_facts";
}

export const SUGGESTED_LINE = "Sent for review. We'll let you know when it's checked.";

export function suggestFoodMessage(code: string | undefined, offline: boolean): string {
  if (offline) return OFFLINE_MESSAGE;
  switch (code) {
    case "ATXL0":
      return "Foods from Open Food Facts stay in your own foods. Their licence doesn't allow adding them to the catalogue.";
    case "ATX60":
      return "That name can't go into the catalogue. Change the name and try again.";
    case "ATX02":
      return "You can suggest 10 foods an hour. Try again later.";
    case "ATX08":
      return "That food isn't in your foods any more.";
    case "ATX06":
      return "Your session expired. Sign in again to suggest foods.";
    default:
      return "Couldn't send that suggestion. Try again.";
  }
}

// ---- the decision, told to the person (food_submission_reviewed) ----

const REVIEW_REASON: Record<string, string> = {
  duplicate: "The catalogue already has it.",
  incorrect_values: "Its values didn't look right.",
  not_a_food: "It isn't a food we list.",
  not_allowed_content: "Its name isn't allowed.",
  other: "It didn't meet our guidelines.",
};

/** The reason category in a sentence; the "other" sentence for anything unknown. */
export const reviewReasonText = (reason: unknown): string =>
  typeof reason === "string" && Object.prototype.hasOwnProperty.call(REVIEW_REASON, reason) ? REVIEW_REASON[reason] : REVIEW_REASON.other;

/** The plain line, with no payload. */
export const FOOD_REVIEW_COPY = { title: "Your food suggestion", body: "We've checked a food you suggested for the catalogue." };

/** status (approved | rejected), name, reason_category; never the reviewer's note. */
export function foodReviewCopy(status: unknown, name: unknown, reason: unknown): { title?: string; body?: string } {
  const food = typeof name === "string" && name.trim() !== "" ? name.trim() : null;
  if (status === "approved") {
    return { title: "Added to the catalogue", body: `${food ?? "Your food"} is in the catalogue now, so everyone can find it.` };
  }
  if (status === "rejected") {
    return {
      title: "Not added to the catalogue",
      body: `${food ?? "Your food"} wasn't added. ${reviewReasonText(reason)} It's still in your own foods.`,
    };
  }
  return {};
}
