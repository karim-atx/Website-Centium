// Market + Share 3.0 · C-SH.2 / C-SH.3 / C-SH.4: the client share cards,
// pure (clientCardModel.test.ts). A literal port of the Client Sharing
// screen file's script: `card()` (the geometry, for the client subset: no
// QR, no quote, "Centium" + the date in the head), `cc()` (the client styles:
// Centium gradient "B", the metric pattern "I" = idPal, the sticker) and the
// `S` table (the eight templates' eyebrows, heroes, visuals and stats), with
// the board's sample values replaced by the builders below, which take the
// app's real data (D-52: no sample data ever ships).
//
// Everything here is in the board's 300-wide card space; the DOM card scales
// it (transform: scale(width / 300), as the board does) and the export draws
// it at 1080 (k = 3.6), so the preview and the PNG are one layout.

import { METRIC_IDENTITY, SHARE_TOKENS } from "../../../theme/marketTokens";
import { statAllowed, statDefaultOn, visibleStats, type ShareLocks } from "../shareLocks";

export type ClientTemplate = "workout" | "pr" | "streak" | "achievement" | "steps" | "sleep" | "water" | "food";
export type IdentityKey = keyof typeof METRIC_IDENTITY;
export type ClientFormat = "story" | "post" | "sticker";
/** The Background chips: Centium (gradient), {metric} pattern (identity), Your photo. */
export type ClientBackground = "B" | "I" | "P";

export type CardVis =
  | { kind: "bars"; values: number[] }
  | { kind: "arc"; pct: number }
  | { kind: "badge" }
  | { kind: "macro"; parts: { name: string; pct: number; color: string }[] };

/** One switchable stat: a row in "Show on the card" and, when on, a cell on the card. */
export interface ClientStat {
  key: string;
  /** The row's title ("Duration"). */
  title: string;
  /** The value on the card and in the row ("52 min"). */
  value: string;
  /** The card's label under the value ("duration"). */
  label: string;
}

export interface ClientCardSpec {
  template: ClientTemplate;
  id: IdentityKey;
  eyebrow: string;
  /** "Fri, Oct 16". */
  date: string;
  big: string;
  unit: string;
  subject: string;
  line: string;
  /** The streak card's leaf row (7 leaves). */
  leaves: boolean;
  vis: CardVis | null;
  /** The always-on headline row ("Volume", "8,450 kg"). */
  headline: { title: string; value: string };
  stats: ClientStat[];
  /** The sheet's title ("Share your workout"). */
  sheetTitle: string;
  /** The identity chip ("Workout pattern"). */
  patternLabel: string;
}

// ---------------------------------------------------------------------------
// Geometry (card(), client subset)

export const CARD_W = 300;
export const EXPORT_W = 1080;
/** The export's scale from card space: 1080 / 300. */
export const EXPORT_K = EXPORT_W / CARD_W;

/** Card height in card space: Post 375 (4:5); Story and Sticker 9:16 (533.33, the board rounds to 533). */
export const cardH = (format: ClientFormat): number => (format === "post" ? 375 : (CARD_W * 16) / 9);
/** The export's pixel size: Story / Sticker 1080 × 1920, Post 1080 × 1350. */
export const exportSize = (format: ClientFormat | "story" | "post"): { w: number; h: number } => ({ w: EXPORT_W, h: format === "post" ? 1350 : 1920 });

/** The sheet's preview widths (C-SH.2: Story 150, Post 196, Sticker 180; Destinations 120). */
export const PREVIEW_W: Record<ClientFormat, number> = { story: 150, post: 196, sticker: 180 };
export const DEST_PREVIEW_W = 120;

export interface CardColours {
  bg: string;
  ink: string;
  sub: string;
  acc: string;
  num: string;
  line: string;
  /** The visual's colour and its track (cc: visCol / track). */
  vis: string;
  track: string;
  /** The bars before the last (cc: white 0.45, else the identity ink at 0x66). */
  barIdle: string;
  /** The streak leaves (card(): mint on white cards, the points leaf on the light pattern). */
  leaf: string;
  /** Text shadow (CSS), or "none". */
  ts: string;
}

/** idPal(): the identity pattern over the identity tint. */
export function identityBg(id: IdentityKey): string {
  const [t, i] = METRIC_IDENTITY[id];
  return `radial-gradient(85% 55% at 100% 0%, ${i}2E 0%, transparent 62%), repeating-linear-gradient(135deg, ${i}0F 0 2px, transparent 2px 13px), ${t}`;
}

export function cardColours(id: IdentityKey, format: ClientFormat, bg: ClientBackground): CardColours {
  const stk = format === "sticker";
  const ink2 = METRIC_IDENTITY[id][1];
  if (stk || bg !== "I") {
    // The sticker (white, card() "white"), the Centium gradient (PAL.B) and the photo layer (PAL.P) are all white type.
    return {
      bg: stk ? "transparent" : SHARE_TOKENS.brandGradient,
      ink: "#FFFFFF",
      sub: stk ? "rgba(255,255,255,0.94)" : "rgba(255,255,255,0.92)",
      acc: "#FFFFFF",
      num: "#FFFFFF",
      line: stk ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.3)",
      vis: "#FFFFFF",
      track: "rgba(255,255,255,0.28)",
      barIdle: "rgba(255,255,255,0.45)",
      leaf: "#A2C8C2",
      ts: stk ? SHARE_TOKENS.overlayTextShadow : "none",
    };
  }
  return {
    bg: identityBg(id),
    ink: "#241F1B",
    sub: "#5E5750",
    acc: ink2,
    num: "#241F1B",
    line: "rgba(36,31,27,0.12)",
    vis: ink2,
    track: "rgba(36,31,27,0.08)",
    barIdle: `${ink2}66`,
    leaf: "#6F9993",
    ts: "none",
  };
}

/** card()'s sizes for a client card (never square), in card space. */
export function cardMetrics(format: ClientFormat) {
  const stk = format === "sticker";
  const story = format === "story" || stk;
  const bs = story ? 90 : 72;
  return {
    h: cardH(format),
    pad: 21,
    markW: 24,
    markH: 24.9,
    nameFs: 11.4,
    handleFs: 9,
    ebFs: 9.6,
    bigFs: bs,
    unitFs: Math.round(bs * 0.3 * 10) / 10,
    subjFs: 18.6,
    lineFs: 10.5,
    svFs: stk ? 19.8 : 18,
    slFs: 8.7,
    statMt: 18,
    statPt: 12,
    /** The sticker centres everything with a 24 gap under the head; the cards push the body down. */
    centred: stk,
  };
}

/** The board's preview radius: max(10, 12 × k). */
export const previewRadius = (width: number) => Math.round(Math.max(10, (12 * width) / CARD_W) * 10) / 10;

/** Bar heights in card space (bars(): round(v × 44)). */
export const barHeights = (values: number[]) => values.map((v) => Math.round(Math.max(0, Math.min(1, v)) * 44));

/** The arc's dash ("pct 100" on pathLength 100). */
export const arcDash = (pct: number) => `${Math.max(0, Math.min(100, Math.round(pct)))} 100`;

// ---------------------------------------------------------------------------
// Stats: rows, defaults, locks

/** The row's second line: the value, "· the headline", "· off by default" (C-SH.2 rows). */
export const rowSub = (s: ClientStat) => (statDefaultOn(s.key) ? s.value : `${s.value} · off by default`);
export const headlineSub = (spec: ClientCardSpec) => `${spec.headline.value} · the headline`;

/** The switches' starting state: every stat on except the sensitive ones (D-28). */
export const initialOn = (spec: ClientCardSpec): Set<string> => new Set(spec.stats.filter((s) => statDefaultOn(s.key)).map((s) => s.key));

/** What reaches the card and the export: on, allowed, at most 4 (cc: max 4). */
export const cardStats = (spec: ClientCardSpec, on: ReadonlySet<string>, locks: ShareLocks): ClientStat[] => visibleStats(spec.stats, on, locks).slice(0, 4);

export interface RowState {
  key: string;
  title: string;
  sub: string;
  kind: "headline" | "switch" | "locked";
  on: boolean;
}

/** "Show on the card": the headline (Always on), then each stat with its switch, or locked (D-28: no switch, the lock line). */
export function statRows(spec: ClientCardSpec, on: ReadonlySet<string>, locks: ShareLocks): RowState[] {
  return [
    { key: "headline", title: spec.headline.title, sub: headlineSub(spec), kind: "headline", on: true },
    ...spec.stats.map((s): RowState => {
      const allowed = statAllowed(s.key, locks);
      return { key: s.key, title: s.title, sub: allowed ? rowSub(s) : (locks.lockLine ?? ""), kind: allowed ? "switch" : "locked", on: allowed && on.has(s.key) };
    }),
  ];
}

/** Whether a template can be made at all (D-28: the food day in recovery mode, the streak in recovery mode). */
export function templateAllowed(t: ClientTemplate, locks: ShareLocks): boolean {
  if (t === "food") return !locks.foodDayLocked;
  if (t === "streak") return !locks.streakHidden;
  return true;
}

/** The payload a card is drawn from (what is shared): only the switched-on, allowed stats. */
export interface ClientCardPayload {
  template: ClientTemplate;
  format: ClientFormat;
  background: ClientBackground;
  eyebrow: string;
  date: string;
  big: string;
  unit: string;
  subject: string;
  stats: { key: string; value: string; label: string }[];
}

export function clientPayload(spec: ClientCardSpec, format: ClientFormat, background: ClientBackground, on: ReadonlySet<string>, locks: ShareLocks): ClientCardPayload {
  return {
    template: spec.template,
    format,
    background: format === "sticker" ? "B" : background,
    eyebrow: spec.eyebrow,
    date: spec.date,
    big: spec.big,
    unit: spec.unit,
    subject: spec.subject,
    stats: cardStats(spec, on, locks).map(({ key, value, label }) => ({ key, value, label })),
  };
}

// ---------------------------------------------------------------------------
// Formatting

const WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Fri, Oct 16" from yyyy-mm-dd (month-first, the app's rule). */
export function cardDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return `${WEEKDAY[dt.getDay()]}, ${MONTH[dt.getMonth()]} ${dt.getDate()}`;
}
/** "Sep 17". */
export function shortDate(iso: string): string {
  const [, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${MONTH[(m || 1) - 1]} ${d || 1}`;
}

export const fmtInt = (n: number) => Math.round(n).toLocaleString("en-US");
/** 92.5 → "92.5", 120 → "120". */
export const fmtKg = (kg: number) => (Math.round(kg * 10) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 });
/** "52 min" under an hour, else "3 h 26" (the board's durations). */
export function fmtDuration(totalSec: number): string {
  const min = Math.max(0, Math.round(totalSec / 60));
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
}
/** Minutes as the board's "1 h 36" / "48 min". */
export const fmtMinutes = (min: number) => fmtDuration(min * 60);

/** yyyy-mm-dd minus n days. */
export function daysBefore(iso: string, n: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d - n);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// The eight templates from real data

const sheetTitle = (what: string) => `Share your ${what}`;

export interface WorkoutFacts {
  name: string;
  date: string;
  durationSec: number;
  volumeKg: number;
  sets: number;
  exercises: number;
  prs: number;
  /** Per-exercise volume, in order (the bars: the last six, scaled to the largest). */
  exerciseVolumes: number[];
  /** The latest body weight on record, or null (D-28: off by default). */
  bodyWeightKg: number | null;
}

/** Up to six bars, each a share of the largest (bars(): v × 44). */
export function barValues(volumes: number[]): number[] {
  const last = volumes.filter((v) => v > 0).slice(-6);
  const max = Math.max(0, ...last);
  return max > 0 ? last.map((v) => Math.round((v / max) * 100) / 100) : [];
}

export function workoutCard(w: WorkoutFacts): ClientCardSpec {
  const stats: ClientStat[] = [
    { key: "duration", title: "Duration", value: fmtDuration(w.durationSec), label: "duration" },
    { key: "sets", title: "Sets", value: fmtInt(w.sets), label: "sets" },
    { key: "personal_bests", title: "Personal bests", value: fmtInt(w.prs), label: w.prs === 1 ? "personal best" : "personal bests" },
  ];
  if (w.bodyWeightKg != null) stats.push({ key: "body_weight", title: "Body weight", value: `${fmtKg(w.bodyWeightKg)} kg`, label: "body weight" });
  const bars = barValues(w.exerciseVolumes);
  return {
    template: "workout",
    id: "workout",
    eyebrow: "Strength workout",
    date: cardDate(w.date),
    big: fmtInt(w.volumeKg),
    unit: "kg",
    subject: w.name,
    line: `Total volume · ${w.exercises} ${w.exercises === 1 ? "exercise" : "exercises"}`,
    leaves: false,
    vis: bars.length ? { kind: "bars", values: bars } : null,
    headline: { title: "Volume", value: `${fmtInt(w.volumeKg)} kg` },
    stats,
    sheetTitle: sheetTitle("workout"),
    patternLabel: "Workout pattern",
  };
}

export interface PrFacts {
  lift: string;
  oneRmKg: number;
  date: string;
  best: { weightKg: number; reps: number };
  /** The 1RM's change over 30 days, or null. */
  change30: number | null;
  /** The day 30 days back ("since Sep 22"). */
  since: string;
  /** Session bests, oldest first (the bars: the last six). */
  history: number[];
}

export function prCard(p: PrFacts): ClientCardSpec {
  const stats: ClientStat[] = [{ key: "best_set", title: "Best set", value: `${fmtKg(p.best.weightKg)} kg × ${p.best.reps}`, label: "best set" }];
  if (p.change30 != null && Math.abs(p.change30) >= 0.05) {
    const v = Math.round(p.change30 * 10) / 10;
    stats.push({ key: "change", title: "Change", value: `${v > 0 ? "+" : "-"}${fmtKg(Math.abs(v))} kg`, label: `since ${shortDate(p.since)}` });
  }
  const bars = barValues(p.history);
  return {
    template: "pr",
    id: "workout",
    eyebrow: "Personal best",
    date: cardDate(p.date),
    big: fmtKg(p.oneRmKg),
    unit: "kg",
    subject: p.lift,
    line: "Estimated 1RM",
    leaves: false,
    vis: bars.length ? { kind: "bars", values: bars } : null,
    headline: { title: "One-rep max", value: `${fmtKg(p.oneRmKg)} kg` },
    stats,
    sheetTitle: sheetTitle("personal best"),
    patternLabel: "Workout pattern",
  };
}

export interface StreakFacts {
  days: number;
  today: string;
  /** The streak's first day. */
  since: string;
  workouts: number;
  meals: number;
}

export function streakCard(s: StreakFacts): ClientCardSpec {
  return {
    template: "streak",
    id: "streak",
    eyebrow: "Streak milestone",
    date: cardDate(s.today),
    big: fmtInt(s.days),
    unit: s.days === 1 ? "day" : "days",
    subject: "Logged every day",
    line: `Since ${shortDate(s.since)}`,
    leaves: true,
    vis: null,
    headline: { title: "Streak", value: `${fmtInt(s.days)} ${s.days === 1 ? "day" : "days"}` },
    stats: [
      { key: "workouts", title: "Workouts", value: fmtInt(s.workouts), label: s.workouts === 1 ? "workout" : "workouts" },
      { key: "meals", title: "Meals logged", value: fmtInt(s.meals), label: "meals logged" },
    ],
    sheetTitle: sheetTitle("streak"),
    patternLabel: "Streak pattern",
  };
}

export interface AchievementFacts {
  title: string;
  /** "Gold", or null for a one-off. */
  level: string | null;
  threshold: number;
  points: number;
  earnedAt: string;
}

export function achievementCard(a: AchievementFacts): ClientCardSpec {
  const subject = a.level ? `${a.title} · ${a.level}` : a.title;
  // A one-off (threshold 1) has no count worth a big number: its points take the hero instead.
  const pointsHero = a.threshold <= 1 && a.points > 0;
  const stats: ClientStat[] = [];
  if (a.points > 0 && !pointsHero) stats.push({ key: "points", title: "Points", value: `+${fmtInt(a.points)}`, label: "points" });
  if (a.level) stats.push({ key: "tier", title: "Tier", value: a.level, label: "tier" });
  return {
    template: "achievement",
    id: "gold",
    eyebrow: "Achievement unlocked",
    date: cardDate(a.earnedAt),
    big: pointsHero ? `+${fmtInt(a.points)}` : fmtInt(a.threshold),
    unit: pointsHero ? "points" : "",
    subject,
    line: a.level ? `${a.level} tier reached` : "",
    leaves: false,
    vis: { kind: "badge" },
    headline: { title: "Achievement", value: subject },
    stats,
    sheetTitle: sheetTitle("achievement"),
    patternLabel: "Achievement pattern",
  };
}

export interface StepsFacts {
  date: string;
  steps: number;
  goal: number;
  distanceM: number | null;
  activeMin: number | null;
}

export function stepsCard(s: StepsFacts): ClientCardSpec {
  const stats: ClientStat[] = [];
  if (s.distanceM != null && s.distanceM > 0) stats.push({ key: "distance", title: "Distance", value: `${(Math.round(s.distanceM / 100) / 10).toLocaleString("en-US")} km`, label: "distance" });
  if (s.activeMin != null && s.activeMin > 0) stats.push({ key: "active", title: "Active", value: `${fmtInt(s.activeMin)} min`, label: "active" });
  return {
    template: "steps",
    id: "steps",
    eyebrow: "Steps goal reached",
    date: cardDate(s.date),
    big: fmtInt(s.steps),
    unit: "",
    subject: `steps · goal ${fmtInt(s.goal)}`,
    line: "",
    leaves: false,
    vis: { kind: "arc", pct: s.goal > 0 ? (s.steps / s.goal) * 100 : 100 },
    headline: { title: "Steps", value: fmtInt(s.steps) },
    stats,
    sheetTitle: sheetTitle("steps"),
    patternLabel: "Steps pattern",
  };
}

export interface SleepFacts {
  date: string;
  asleepMin: number;
  deepMin: number | null;
  remMin: number | null;
  /** The night's score 0 to 100 (the arc), or null. */
  score: number | null;
  /** Bed to wake ("10:58 PM to 6:52 AM"), or null. */
  times: string | null;
}

export function sleepCard(s: SleepFacts): ClientCardSpec {
  const stats: ClientStat[] = [];
  if (s.deepMin != null && s.deepMin > 0) stats.push({ key: "deep", title: "Deep", value: fmtMinutes(s.deepMin), label: "deep" });
  if (s.remMin != null && s.remMin > 0) stats.push({ key: "rem", title: "REM", value: fmtMinutes(s.remMin), label: "REM" });
  return {
    template: "sleep",
    id: "sleep",
    eyebrow: "Last night's sleep",
    date: cardDate(s.date),
    big: fmtMinutes(s.asleepMin),
    unit: "",
    subject: "Asleep",
    line: s.times ?? "",
    leaves: false,
    vis: s.score != null ? { kind: "arc", pct: s.score } : null,
    headline: { title: "Asleep", value: fmtMinutes(s.asleepMin) },
    stats,
    sheetTitle: sheetTitle("sleep"),
    patternLabel: "Sleep pattern",
  };
}

export interface WaterFacts {
  date: string;
  ml: number;
  goalMl: number;
  drinks: number | null;
  /** "ml" shows litres (the board's "2.5 L"); "floz" fluid ounces. */
  unit: "ml" | "floz";
}

const FL_OZ_ML = 29.5735;
export function waterAmount(ml: number, unit: "ml" | "floz"): { big: string; unit: string } {
  if (unit === "floz") return { big: fmtInt(ml / FL_OZ_ML), unit: "fl oz" };
  return { big: (Math.round(ml / 100) / 10).toLocaleString("en-US", { maximumFractionDigits: 1 }), unit: "L" };
}

export function waterCard(w: WaterFacts): ClientCardSpec {
  const a = waterAmount(w.ml, w.unit);
  const g = waterAmount(w.goalMl, w.unit);
  const stats: ClientStat[] = [];
  if (w.drinks != null && w.drinks > 0) stats.push({ key: "drinks", title: "Drinks", value: fmtInt(w.drinks), label: w.drinks === 1 ? "drink" : "drinks" });
  return {
    template: "water",
    id: "water",
    eyebrow: "Water goal reached",
    date: cardDate(w.date),
    big: a.big,
    unit: a.unit,
    subject: `Daily goal ${g.big} ${g.unit}`,
    line: "",
    leaves: false,
    vis: { kind: "arc", pct: w.goalMl > 0 ? (w.ml / w.goalMl) * 100 : 100 },
    headline: { title: "Water", value: `${a.big} ${a.unit}` },
    stats,
    sheetTitle: sheetTitle("water"),
    patternLabel: "Water pattern",
  };
}

export interface FoodFacts {
  date: string;
  kcal: number;
  goalKcal: number | null;
  protein: number;
  carbs: number;
  fat: number;
}

/** macro(): each macro's share of the day's energy (protein and carbs 4 kcal / g, fat 9). */
export function macroShares(protein: number, carbs: number, fat: number): [number, number, number] {
  const e = [protein * 4, carbs * 4, fat * 9];
  const total = e[0] + e[1] + e[2];
  if (total <= 0) return [0, 0, 0];
  return e.map((v) => Math.round((v / total) * 100)) as [number, number, number];
}

export function foodCard(f: FoodFacts): ClientCardSpec {
  const [p, c, fa] = macroShares(f.protein, f.carbs, f.fat);
  const g = (n: number) => `${fmtInt(n)} g`;
  return {
    template: "food",
    id: "food",
    eyebrow: "Day summary",
    date: cardDate(f.date),
    big: fmtInt(f.kcal),
    unit: "kcal",
    subject: f.goalKcal ? `of a ${fmtInt(f.goalKcal)} goal` : "",
    line: "",
    leaves: false,
    vis:
      p + c + fa > 0
        ? {
            kind: "macro",
            parts: [
              { name: `Protein ${g(f.protein)}`, pct: p, color: "#7D6BB5" },
              { name: `Carbs ${g(f.carbs)}`, pct: c, color: "#AEA1DC" },
              { name: `Fat ${g(f.fat)}`, pct: fa, color: "#6F9993" },
            ],
          }
        : null,
    headline: { title: "Calories", value: `${fmtInt(f.kcal)} kcal` },
    stats: [
      { key: "protein", title: "Protein", value: g(f.protein), label: "protein" },
      { key: "carbs", title: "Carbs", value: g(f.carbs), label: "carbs" },
      { key: "fat", title: "Fat", value: g(f.fat), label: "fat" },
    ],
    sheetTitle: sheetTitle("food day"),
    patternLabel: "Food pattern",
  };
}

/** The file name of a saved card. */
export const exportFileName = (t: ClientTemplate, format: ClientFormat) => `centium-${t}-${format}.png`;
