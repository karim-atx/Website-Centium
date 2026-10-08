// v6 asset URLs under public/ (TK 4.1, 4.7, 5.1; PB4 section 8 step 2). The
// files are fetched only when a page renders them (<img loading="lazy">), so
// none of them is in the JS bundle. All C2PA <metadata> blocks were stripped
// from the SVGs when they were copied in.

// ---------------------------------------------------------------------------
// Achievement badges (Part B svg/illustrations/achievements, 58 files). The
// keys are the 58 rows of public.achievements one to one (checked against the
// local database, read only). Colours are drawn and fixed in every theme
// (tiers, D9); no dark files. A key without art (a database row added before
// its art) returns null so the caller falls back to the row's emoji `icon`.
const ACHIEVEMENT_ART_KEYS = new Set([
  "add_widget", "app_review_left", "block_completed", "body_awareness", "bp_days", "calendar",
  "coach_connected", "custom_food_created", "endurance_completed", "exercise_library",
  "explore_page", "explorer_all", "first_bp", "first_food_log", "first_lab", "first_measurements",
  "first_pr", "first_workout", "food_logs_bronze", "food_logs_gold", "food_logs_silver",
  "full_day", "habit_days_bronze", "habit_days_gold", "habit_days_silver", "health_records",
  "hydration", "journal_entries_bronze", "journal_entries_gold", "journal_entries_silver",
  "meditation_days_bronze", "meditation_days_gold", "meditation_days_silver", "mind_journal",
  "notifications_on", "onboarded", "profile_complete", "prs_bronze", "prs_silver",
  "recipe_created", "referrals_bronze", "referrals_silver", "routine_created", "streak_100",
  "streak_14", "streak_3", "streak_30", "streak_365", "streak_60", "streak_7", "voice_logger",
  "weigh_ins", "well_rested", "wod_formats", "workout_metrics", "workouts_bronze", "workouts_gold",
  "workouts_silver",
]);

/** `/achievements/<key>.svg` (48 x 48 viewBox), or null when there is no art for the key. */
export const achievementArtUrl = (key: string): string | null =>
  ACHIEVEMENT_ART_KEYS.has(key) ? `/achievements/${key}.svg` : null;

// ---------------------------------------------------------------------------
// Meditation poses v2 (Part B animations/meditation-poses-v2, motion-specs.md
// "Meditation poses v2"). 3.5 s loop, loop while current. Hero GIF 208 px shown
// at 104; thumbnail 88 px shown at 40 (= the first frame); Reduce motion = the
// static first frame (`still`, the hero GIF's frame 0 as a 208 px PNG).
// Grounds are baked lavender (#ECE8F7 hero, #F3F0FB thumbnails), fixed in
// every theme. Replaces public/meditation/yoga/* (v1, not shipped in v6).
export const MEDITATION_POSE_V2 = {
  childs: { name: "Child's Pose", tab: "yoga" },
  catcow: { name: "Cat-Cow", tab: "yoga" },
  downdog: { name: "Downward Dog", tab: "yoga" },
  warrior: { name: "Warrior II", tab: "yoga" },
  crow: { name: "Crow", tab: "yoga" },
  wheel: { name: "Wheel", tab: "yoga" },
  hamstring: { name: "Standing Hamstring Stretch", tab: "stretching" },
  doorway: { name: "Doorway Chest Stretch", tab: "stretching" },
  twist: { name: "Seated Spinal Twist", tab: "stretching" },
  legswing: { name: "Leg Swings", tab: "stretching" },
  armcircle: { name: "Arm Circles", tab: "stretching" },
  lunge: { name: "Walking Lunges with Twist", tab: "stretching" },
} as const;

export type MeditationPoseV2 = keyof typeof MEDITATION_POSE_V2;

export const meditationPoseV2Urls = (pose: MeditationPoseV2) => ({
  /** 208 x 208, 70 frames at 50 ms, loops. */
  gif: `/meditation/v2/${pose}.gif`,
  /** 208 x 208 PNG, the GIF's first frame (Reduce motion). */
  still: `/meditation/v2/${pose}.png`,
  /** 88 x 88 PNG thumbnail (shown at 40). */
  thumb: `/meditation/v2/${pose}-thumb.png`,
});

// ---------------------------------------------------------------------------
// Confirmation v6 (Part B animations/confirmation-v6): 480 x 480 GIF, 46
// frames at 40 ms, plays once (1.8 s motion + 2.5 s hold). Crop centred on
// the mark (GIF x 165 to 314, y 110 to 271) at 124 px (MO1.2.1.5.2) and 96 px
// (HE1.9.2.1a). Reduce motion = the final frame. Opaque white ground: the GIF
// is for Centium light (O8).
export const CONFIRMATION_V6 = {
  gif: "/anim/centium-confirmed-v6.gif",
  final: "/anim/centium-confirmed-v6-final.png",
} as const;

// ---------------------------------------------------------------------------
// Health card identity patterns (Part B svg/illustrations/hero-patterns, 25):
// p0 to p6 and one per metric, w-<metric>.svg / w-<metric>-dark.svg. "Sits
// under content at 6 to 22% in the metric accent." Metric colours are fixed.
export const HERO_PATTERN_METRICS = ["bp", "cal", "cyL", "cyS", "hr", "sleep", "steps", "water", "wt"] as const;
export type HeroPatternMetric = (typeof HERO_PATTERN_METRICS)[number];
export const heroPatternUrl = (metric: HeroPatternMetric, dark: boolean) => `/hero/w-${metric}${dark ? "-dark" : ""}.svg`;
/** p0 to p6. */
export const heroPatternGenericUrl = (n: 0 | 1 | 2 | 3 | 4 | 5 | 6) => `/hero/p${n}.svg`;
