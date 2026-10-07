import { supabase } from "../../../lib/supabase/client";

// The four system streaks, and getting them to exist.
//
// WHY THIS IS A CLIENT CONCERN AT ALL. streaks rows are per-account and RLS
// scopes every one of them to their owner, so nothing server-side creates them
// on sign-up — there is no trigger on profiles and no service-role path that
// would know to. The nightly sweep (Database 20260916070000) UPDATEs rows it
// finds; it does not create any. An account with no auto rows therefore has
// nothing to advance, and its streaks stay empty forever without this.

/**
 * The four labels, spelled exactly as the app has always spelled them.
 *
 * THE SWEEP NORMALISES, WHICH IS WHY THIS SPELLING IS SAFE. It trims,
 * lowercases and strips a trailing "streak"/"streaks" before matching against
 * 'logging' | 'movement' | 'workout' | 'nutrition', so "Logging streak"
 * resolves to 'logging'. Both spellings work; this one is chosen because it is
 * what mockHealthData has always used and what the UI renders — StreaksBar and
 * Mind both strip the same suffix for display (`/\s*streak$/i`), so a bare
 * "logging" would render as "logging" in lower case beside three capitalised
 * siblings.
 *
 * A label outside these four is skipped by the sweep rather than zeroed, so a
 * typo here would produce a row that silently never advances.
 */
export const AUTO_STREAK_LABELS = [
  "Logging streak",
  "Movement streak",
  "Workout streak",
  "Nutrition streak",
] as const;

/** The four canonical categories, in the order the UI has always listed them. */
export const AUTO_STREAK_CATEGORIES = ["logging", "movement", "workout", "nutrition"] as const;
export type AutoStreakCategory = (typeof AUTO_STREAK_CATEGORIES)[number];

/** The display label for each, so a stored row never reaches the UI raw. */
export const AUTO_STREAK_LABEL_BY_CATEGORY: Record<AutoStreakCategory, string> = {
  logging: "Logging streak",
  movement: "Movement streak",
  workout: "Workout streak",
  nutrition: "Nutrition streak",
};

/**
 * The sweep's own normalisation, reimplemented here so both ends agree.
 *
 * Trim, lowercase, drop a trailing "streak"/"streaks". Matching the server
 * exactly is what lets a row stored as either "logging" or "Logging streak"
 * resolve to the same category on this side.
 */
export function normaliseStreakLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s*streaks?$/, "");
}

function toCategory(label: string): AutoStreakCategory | null {
  const n = normaliseStreakLabel(label);
  return (AUTO_STREAK_CATEGORIES as readonly string[]).includes(n) ? (n as AutoStreakCategory) : null;
}

/** One auto streak as the database holds it, resolved to a known category. */
export interface AutoStreakRow {
  id: string;
  category: AutoStreakCategory;
  days: number;
}

export interface AutoStreaksResult {
  /**
   * False means the read FAILED, which is not "this account has none" — the
   * same distinction getDiaryEntries and getCustomMeals draw. The caller
   * replaces state with these, so a dropped connection must not reset four
   * visible streaks to zero.
   */
  ok: boolean;
  streaks: AutoStreakRow[];
  message?: string;
}

/**
 * Reads the four rows the nightly sweep maintains.
 *
 * ONLY current_days IS TAKEN FROM THE ROW. The label is thrown away and
 * rebuilt from the category, because a row could legitimately be stored as
 * "logging" — the sweep accepts that spelling — and the UI has always rendered
 * "Logging streak". Displaying whatever happens to be in the column would let
 * storage decide copy.
 *
 * A row whose label matches none of the four is dropped here, exactly as the
 * sweep skips it: it is not one of the four, nothing advances it, and showing
 * it as a system streak stuck at zero would be a worse lie than omitting it.
 */
export async function getAutoStreaks(userId: string): Promise<AutoStreaksResult> {
  const { data, error } = await supabase
    .from("streaks")
    .select("id, label, current_days")
    .eq("owner_id", userId)
    .eq("auto", true);

  if (error) {
    console.error("[streaks] Could not read auto streaks:", error.message);
    return { ok: false, streaks: [], message: "Couldn't load your streaks." };
  }

  const rows: AutoStreakRow[] = [];
  for (const r of data ?? []) {
    const category = toCategory(r.label);
    if (!category) continue;
    // (owner_id, label) is unique now, so two rows both spelled "Logging
    // streak" cannot exist. Two that merely normalise alike still can — a
    // "logging" beside a "Logging streak" is two distinct strings to the
    // index — so this keeps the first and ignores the rest rather than
    // rendering one streak twice.
    if (rows.some((existing) => existing.category === category)) continue;
    rows.push({ id: r.id, category, days: r.current_days ?? 0 });
  }
  return { ok: true, streaks: rows };
}

/**
 * Creates any of the four that this account is missing.
 *
 * NO GOAL, AND THAT IS ENFORCED THREE TIMES OVER. `streaks_auto_no_goal_check`
 * refuses an auto row carrying goal_days, and the insert POLICY refuses one
 * unless `current_days = 0 and goal_days is null` — so passing a goal here
 * would not be a bad default, it would be a rejected write. goal_days is
 * therefore omitted entirely rather than sent as null, which is the same thing
 * to Postgres and a clearer statement of intent.
 *
 * ONE UPSERT, NOT A READ AND THEN AN INSERT. streaks now has a unique
 * constraint over (owner_id, label) (Database 20260916090000), so the database
 * can absorb the collision itself — the same trick ensureProfileRow has always
 * used, which had no target here until that migration existed.
 *
 * THE RACE WAS REAL AND WAS MEASURED. The first run of the original code
 * against a clean account produced EIGHT rows, two of every label:
 * onAuthChange fires more than once on a single sign-in — INITIAL_SESSION,
 * then SIGNED_IN — and both reads returned nothing before either insert
 * landed. The memo below still collapses that case into one attempt, so the
 * common path costs one round trip rather than two. What it could never cover
 * is two TABS signing in at the same instant, because a promise in one tab
 * knows nothing about the other; that is what the constraint closes, and the
 * losing writer now no-ops instead of reporting a normal race as a failure.
 *
 * ignoreDuplicates IS LOAD-BEARING, not a tidiness flag. It compiles to
 * ON CONFLICT DO NOTHING; the default compiles to ON CONFLICT DO UPDATE SET
 * every column in the payload, which here would mean writing current_days = 0
 * over a streak the nightly sweep had already advanced. It would also be
 * refused outright — the update grant on this table covers label,
 * habit_item_id, current_days and goal_days but not owner_id or auto, and
 * streaks_update_own_non_auto forbids updating an auto row at all.
 *
 * MATCHING IS ON THE STORED TEXT, so this cannot merge a row spelled
 * "logging" with one spelled "Logging streak" — both normalise to the same
 * category for the sweep, but they are two different strings to a unique
 * index. The migration says the same thing and calls the gap unreachable,
 * because this is the only code path that writes the table and it uses one
 * fixed spelling. AUTO_STREAK_LABELS is that spelling.
 *
 * SILENT ON FAILURE, like ensureProfileRow. The user is signed in either way,
 * there is no action they could take, and the next auth event tries again.
 */
const inFlight = new Map<string, Promise<void>>();

export function ensureAutoStreaks(userId: string): Promise<void> {
  const running = inFlight.get(userId);
  if (running) return running;

  // Cleared in both directions: a failed attempt must not poison the account
  // for the rest of the page's life, since the next auth event is the retry.
  const attempt = seedAutoStreaks(userId).finally(() => inFlight.delete(userId));
  inFlight.set(userId, attempt);
  return attempt;
}

async function seedAutoStreaks(userId: string): Promise<void> {
  // All four every time. Sending only the missing ones was what required
  // reading first; letting the constraint decide is both fewer round trips and
  // the only version that is correct when two tabs arrive together.
  const { error } = await supabase.from("streaks").upsert(
    AUTO_STREAK_LABELS.map((label) => ({
      owner_id: userId,
      label,
      auto: true,
      current_days: 0,
    })),
    { onConflict: "owner_id,label", ignoreDuplicates: true }
  );

  // Reached only by something genuinely wrong — a dropped connection, a
  // revoked grant. A row that already exists is no longer an error to report.
  if (error) {
    console.error("[streaks] Could not seed auto streaks:", error.message);
  }
}
