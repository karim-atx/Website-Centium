// Release 3 · W8 share cards (SH1 to SH3): what a card says, as data. Pure,
// so the DOM card (ShareCard.tsx), the canvas export (drawShareCard.ts) and
// the client's views (CU29, CU30) all read one spec.
//
// Templates and literal copy are the handover's (source/gen/r31.js CARD31),
// limited by DB-8 and Karim's answer 4: client wins are only a personal
// record, a programme finished, workouts in 4 weeks (consistency), a habit
// streak, a logging streak and a meal plan completed. No adherence
// percentage, no weight change, nothing from Health records. Every number
// on a win card comes from client_wins(); nothing is invented, so the
// frame's extra stats ("+7.5 kg in 8 weeks", "Week 8 of 12", "94% sessions
// done", "-4.1 kg since August") have no source and are not drawn.
//
// The payload stored with a request or a shared item (share_requests.card,
// shared_items.card) carries only the keys share_card_allowed() accepts:
// format, style, template, title, subtitle, name_display and stats
// [{ key, label, value }] with an allowlisted key. The database refuses
// anything else (ATXH1).

import { siteHref, siteText } from "../../config/site";
import { appLocale } from "../../i18n/format";
import { t, tn, tx } from "../../i18n/core";

export type ShareFormat = "story" | "post" | "square" | "sticker";
export type ShareStyle = "L" | "D" | "B" | "P";
export type CardTemplate = "pr" | "prog" | "streak" | "logging" | "cons" | "mealplan" | "mile" | "review" | "profile" | "promo" | "slots" | "tip";
export type HeroKind = "num" | "quote" | "title" | "profile";

/** share_card_allowed()'s stat keys (20261124080000), verbatim. */
export const STAT_KEYS = [
  "pr_exercise",
  "pr_load_kg",
  "pr_load_lb",
  "pr_reps",
  "programme_name",
  "programme_weeks",
  "workouts_count",
  "weeks_count",
  "streak_days",
  "streak_label",
  "logging_streak_days",
  "meal_plan_name",
  "rating",
  "review_count",
  "review_quote",
  "clients_coached",
  "sessions_delivered",
  "years_on_centium",
  "slot_time",
  "slot_type",
  "course_title",
  "course_lessons",
  "package_name",
  "package_sessions",
  "price",
  "promotion",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export interface CardStat {
  key: StatKey;
  /** The big value ("64", "4.9", "3 years"). */
  value: string;
  /** The small line under it ("clients coached"). */
  label: string;
}

export interface CardSpec {
  template: CardTemplate;
  eyebrow: string;
  hero: HeroKind;
  /** hero num: the number, its unit, the subject line and the small line ({c} = the client as shown). */
  big?: string;
  unit?: string;
  heroKey?: StatKey;
  subject?: string;
  line?: string;
  /** hero quote. */
  quote?: string;
  by?: string;
  /** Filled stars over a review quote (1 to 5). */
  stars?: number;
  /** hero title. */
  title?: string;
  meta?: string;
  /** hero profile. */
  head?: string;
  role?: string;
  extra?: "leaves" | "slots";
  slots?: string[];
  /** The stat row (at most 3 drawn, as the frames). */
  stats: CardStat[];
}

export interface CardPro {
  name: string;
  /** professional_profiles.handle; null hides the handle line, the link and the QR. */
  handle: string | null;
}

export const STYLE_LABEL: Record<ShareStyle, string> = { L: "Light", D: "Dark", B: "Brand", P: "Photo" };
export const FORMAT_LABEL: Record<ShareFormat, string> = { story: "Story", post: "Post", square: "Square", sticker: "Sticker" };
export const STYLES: ShareStyle[] = ["L", "D", "B", "P"];
export const FORMATS: ShareFormat[] = ["story", "post", "square", "sticker"];

/**
 * Market + Share 3.0 · P-SH.3 (ADDED, additive): the editor's fifth style,
 * "Your photo". The card's content becomes a transparent layer over the
 * professional's own photo, placed with the overlay editor. Story, Post and
 * Square only: the Sticker has no Your photo (it draws as the repo sticker).
 * Anything that draws a whole card reads it as the Photo palette.
 */
export type EditorStyle = ShareStyle | "Y";
export const EDITOR_STYLES: EditorStyle[] = [...STYLES, "Y"];
export const EDITOR_STYLE_LABEL: Record<EditorStyle, string> = { ...STYLE_LABEL, Y: "Your photo" };
/** A style's name where it is shown (the constants above stay English, for the tests and as keys). */
export function editorStyleLabel(s: EditorStyle): string {
  switch (s) {
    case "L":
      return tx("Light", "card style");
    case "D":
      return tx("Dark", "card style");
    case "B":
      return t("Brand");
    case "P":
      return t("Photo");
    case "Y":
      return t("Your photo");
  }
}
/** A format's name where it is shown. */
export function formatLabel(f: ShareFormat): string {
  switch (f) {
    case "story":
      return t("Story");
    case "post":
      return tx("Post", "share format");
    case "square":
      return t("Square");
    case "sticker":
      return t("Sticker");
  }
}
export const cardStyleOf = (s: EditorStyle): ShareStyle => (s === "Y" ? "P" : s);
/** The editor shows the overlay (and exports the photo and layer) only for Your photo on Story, Post or Square. */
export const usesOverlay = (style: EditorStyle, format: ShareFormat): format is "story" | "post" | "square" => style === "Y" && format !== "sticker";

/**
 * D-29: Your photo is recorded as style "photo". share_card_allowed()
 * (20261124080000) allowlists the payload's keys but leaves `style`
 * unconstrained, so "photo" is accepted as is; read back, it draws as the
 * Photo style (the photo itself never leaves the device).
 */
export const YOUR_PHOTO_STYLE = "photo";
export type StoredStyle = ShareStyle | typeof YOUR_PHOTO_STYLE;
export const storedStyle = (s: EditorStyle): StoredStyle => (s === "Y" ? YOUR_PHOTO_STYLE : s);

/** PAL31, verbatim. `bg` is the CSS background; the canvas reads `grad`. */
export interface Palette {
  bg: string;
  ink: string;
  sub: string;
  acc: string;
  num: string;
  leaf: string;
  lop: number;
  line: string;
  chip: string;
  star: string;
}
export const PALETTE: Record<ShareStyle, Palette> = {
  L: { bg: "#FBFAFE", ink: "#241F1B", sub: "#5E5750", acc: "#6D50D3", num: "#2E2560", leaf: "#A2C8C2", lop: 0.5, line: "rgba(36,31,27,0.12)", chip: "rgba(109,80,211,0.08)", star: "#C8912B" },
  D: { bg: "radial-gradient(120% 70% at 90% 0%, #2B2645 0%, #16171D 62%)", ink: "#F5F3FA", sub: "#B8B3C7", acc: "#C3B3FB", num: "#FFFFFF", leaf: "#6F9993", lop: 0.4, line: "rgba(245,243,250,0.14)", chip: "rgba(195,179,251,0.12)", star: "#E0B360" },
  B: { bg: "linear-gradient(150deg, #7D6BB5 0%, #66709F 52%, #4F7F78 100%)", ink: "#FFFFFF", sub: "rgba(255,255,255,0.92)", acc: "#FFFFFF", num: "#FFFFFF", leaf: "#A2C8C2", lop: 0.3, line: "rgba(255,255,255,0.3)", chip: "rgba(255,255,255,0.16)", star: "#F3D28B" },
  P: { bg: "", ink: "#FFFFFF", sub: "rgba(255,255,255,0.92)", acc: "#D9CFFF", num: "#FFFFFF", leaf: "#A2C8C2", lop: 0, line: "rgba(255,255,255,0.26)", chip: "rgba(255,255,255,0.16)", star: "#F3D28B" },
};

/** photo31's scrim over the photo (and the stripes that stand in until one is chosen). */
export const PHOTO_SCRIM = "linear-gradient(to top, rgba(18,19,23,0.9) 0%, rgba(18,19,23,0.5) 46%, rgba(18,19,23,0.25) 100%)";
export const PHOTO_STRIPES = "repeating-linear-gradient(135deg, #3E3A36 0 10px, #37332F 10px 20px)";
export const STICKER_CHECKER = "repeating-conic-gradient(#2A2B31 0% 25%, #34353C 0% 50%) 0 0 / 16px 16px";

/** card31: H = W × 1.25 (Post), × 1 (Square), × 16/9 (Story, Sticker). */
export function cardHeight(format: ShareFormat, width: number): number {
  return Math.round(width * (format === "post" ? 1.25 : format === "square" ? 1 : 16 / 9));
}

/** Exports (SH1 "Type and numbers"): 1080 wide; Story 1920, Post 1350, Square 1080, Sticker a transparent 1080 × 1920. */
export const EXPORT_WIDTH = 1080;

/**
 * Round G (EH3): the cards keep their drawn layout in every language (the
 * export draws the same left-to-right page), so in Arabic each line of text
 * takes its own direction from its first strong letter (CSS unicode-bidi:
 * plaintext on the DOM card, ctx.direction on the canvas) and no line is
 * tracked (letter-spacing breaks Arabic joins). English draws as before.
 */
export function textDirection(text: string): "ltr" | "rtl" {
  const m = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u200E]|[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u200F]/.exec(text);
  return m && /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF\u200F]/.test(m[0]) ? "rtl" : "ltr";
}
/** The DOM card's classes for that rule (none in English). */
export const cardBidiClass = (rtlApp: boolean) => (rtlApp ? "[&_*]:[unicode-bidi:plaintext] [&_*]:!tracking-normal" : "");

/** The canvas font for a weight and size (drawShareCard, the layer layout, the link fit). */
export const cardFont = (weight: number, size: number) => `${weight} ${size}px Manrope, "IBM Plex Sans Arabic", sans-serif`;

/** The profile link printed on the card (FINAL_PLAN section 3 {profile_url}): the site address + /p/{handle} (config/site); the QR opens the full link. */
export const cardLink = (handle: string) => siteText(`/p/${handle}`);
export const cardQrValue = (handle: string) => siteHref(`/p/${handle}`);

/**
 * The link's font size: the frame's size, shrunk just enough that the whole
 * link fits the space beside the QR. A link is never clipped or wrapped, and
 * the site address plus a 30-character handle is longer than the frame's
 * "centium.app/p/…" was drawn for. One rule for the DOM card and the export.
 */
export function fitLinkSize(base: number, naturalWidth: number, available: number): number {
  if (!(naturalWidth > 0) || naturalWidth <= available) return base;
  return Math.max(0, Math.floor(((base * available) / naturalWidth) * 10) / 10);
}

// ---------------------------------------------------------------------------
// How the client is shown
// ---------------------------------------------------------------------------

export type Visibility = "name" | "initials" | "none";

/** CL31: Name is the first name, Initials "S.R.", Nothing "A client". */
export function clientShownAs(fullName: string, visibility: Visibility): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (visibility === "none" || parts.length === 0) return t("A client");
  if (visibility === "name") return parts[0];
  return parts
    .slice(0, 2)
    .map((p) => `${p[0].toUpperCase()}.`)
    .join("");
}

export const fillClient = (text: string | undefined, shownAs: string): string | undefined => (text == null ? text : text.split("{c}").join(shownAs));

// ---------------------------------------------------------------------------
// Client wins (client_wins rows)
// ---------------------------------------------------------------------------

export type WinKind = "pr" | "programme_complete" | "consistency" | "streak" | "logging_streak" | "meal_plan_complete";

export interface ClientWin {
  winId: string;
  clientId: string;
  kind: WinKind;
  occurredAt: string;
  value: Record<string, unknown>;
}

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : null);

/** 120, 112.5 (kg to one decimal, trailing .0 dropped). */
export const fmtLoad = (kg: number) => {
  const r = Math.round(kg * 10) / 10;
  return Number.isInteger(r) ? String(r) : r.toFixed(1);
};
export const fmtInt = (n: number) => Math.round(n).toLocaleString(appLocale("en-US"));

/**
 * Every date the share features show, professional and client side: the
 * app's short date as Messages writes it (components/messages/chatTime
 * listTime): month first, "Oct 12", and "Oct 12, 2025" in another year.
 */
export function shareDate(iso: string, now: Date = new Date()): string {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(appLocale("en-US"), {
    month: "short",
    day: "numeric",
    ...(d.getFullYear() !== now.getFullYear() ? { year: "numeric" } : null),
  });
}

/** The card for one win. Null for a row whose value can't make an honest card. */
export function winCard(w: ClientWin): CardSpec | null {
  const v = w.value;
  switch (w.kind) {
    case "pr": {
      const ex = str(v.pr_exercise);
      const kg = num(v.pr_load_kg);
      if (!ex || kg == null) return null;
      // client_wins gives the estimated 1RM of the set (personal_records.estimated_one_rep_max_kg).
      return { template: "pr", eyebrow: t("New personal record"), hero: "num", big: fmtLoad(kg), unit: t("kg"), heroKey: "pr_load_kg", subject: ex, line: t("{c} · estimated 1RM"), stats: [] };
    }
    case "programme_complete": {
      const name = str(v.programme_name);
      if (!name) return null;
      const weeks = num(v.programme_weeks);
      return weeks
        ? { template: "prog", eyebrow: t("Programme complete"), hero: "num", big: fmtInt(weeks), unit: tn(weeks, "weeks", "weeks"), heroKey: "programme_weeks", subject: name, line: t("{c} finished the programme"), stats: [] }
        : { template: "prog", eyebrow: t("Programme complete"), hero: "title", title: name, meta: t("{c} finished the programme"), stats: [] };
    }
    case "consistency": {
      const n = num(v.workouts_count);
      const weeks = num(v.weeks_count) ?? 4;
      if (n == null) return null;
      return { template: "cons", eyebrow: t("Consistency"), hero: "num", big: fmtInt(n), unit: tn(n, "workouts", "workouts"), heroKey: "workouts_count", subject: tn(weeks, "in the last {n} weeks", "in the last {n} weeks"), line: "{c}", stats: [] };
    }
    case "streak": {
      const n = num(v.streak_days);
      if (n == null) return null;
      // The habit's own name is never drawn: a habit can name a medicine or a condition.
      return { template: "streak", eyebrow: t("Streak milestone"), hero: "num", big: fmtInt(n), unit: tn(n, "days", "days"), heroKey: "streak_days", subject: t("Habit streak"), line: "{c}", extra: "leaves", stats: [] };
    }
    case "logging_streak": {
      const n = num(v.logging_streak_days);
      if (n == null) return null;
      const end = new Date(w.occurredAt.length === 10 ? `${w.occurredAt}T00:00:00` : w.occurredAt);
      const since = Number.isNaN(end.getTime()) ? "" : shareDate(new Date(end.getTime() - (n - 1) * 86400000).toISOString());
      return { template: "logging", eyebrow: t("Streak milestone"), hero: "num", big: fmtInt(n), unit: tn(n, "days", "days"), heroKey: "logging_streak_days", subject: t("Logging every day"), line: since ? t("{c} · since {date}", { date: since }) : "{c}", extra: "leaves", stats: [] };
    }
    case "meal_plan_complete": {
      const name = str(v.meal_plan_name);
      if (!name) return null;
      return { template: "mealplan", eyebrow: t("Meal plan complete"), hero: "title", title: name, meta: t("{c} reached the end of the plan"), stats: [] };
    }
    default:
      return null;
  }
}

export type WinIcon = "trophy" | "leaf" | "calendar-check" | "flag";
export type WinTone = "gold" | "teal" | "pr";

/** The client page's "Wins this month" row (SH4 winRow31). */
export function winRowText(w: ClientWin): { title: string; icon: WinIcon; tone: WinTone } | null {
  const v = w.value;
  switch (w.kind) {
    case "pr": {
      const ex = str(v.pr_exercise);
      const kg = num(v.pr_load_kg);
      return ex && kg != null ? { title: t("New PR · {exercise} {load} kg", { exercise: ex, load: fmtLoad(kg) }), icon: "trophy", tone: "gold" } : null;
    }
    case "programme_complete": {
      const name = str(v.programme_name);
      return name ? { title: t("Programme complete · {name}", { name }), icon: "flag", tone: "pr" } : null;
    }
    case "consistency": {
      const n = num(v.workouts_count);
      return n != null ? { title: tn(n, "{n} workouts in {weeks} weeks", "{n} workouts in {weeks} weeks", { n: fmtInt(n), weeks: num(v.weeks_count) ?? 4 }), icon: "calendar-check", tone: "pr" } : null;
    }
    case "streak": {
      const n = num(v.streak_days);
      return n != null ? { title: tn(n, "{n}-day habit streak", "{n}-day habit streak", { n: fmtInt(n) }), icon: "leaf", tone: "teal" } : null;
    }
    case "logging_streak": {
      const n = num(v.logging_streak_days);
      return n != null ? { title: tn(n, "{n}-day logging streak", "{n}-day logging streak", { n: fmtInt(n) }), icon: "leaf", tone: "teal" } : null;
    }
    case "meal_plan_complete": {
      const name = str(v.meal_plan_name);
      return name ? { title: t("Meal plan complete · {name}", { name }), icon: "flag", tone: "pr" } : null;
    }
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// The professional's own practice (SH3)
// ---------------------------------------------------------------------------

export interface PracticeFacts {
  sessionsDelivered: number;
  clientsCoached: number;
  averageRating: number | null;
  reviewCount: number;
  yearsOnCentium: number | null;
}

/** Session milestones (our pick; the handover draws 500): the largest reached, or null below the first. */
export const SESSION_MILESTONES = [10, 25, 50, 100, 250, 500, 750, 1000, 1500, 2000, 2500, 5000, 10000];
export function reachedMilestone(sessions: number): number | null {
  let hit: number | null = null;
  for (const m of SESSION_MILESTONES) if (sessions >= m) hit = m;
  return hit;
}

const yearsValue = (y: number) => tn(y, "1 year", "{n} years");

/** SH3 Practice milestone: the milestone reached (sessionsDelivered), then clients, rating and years (each only when known). */
export function milestoneCard(f: PracticeFacts): CardSpec {
  const stats: CardStat[] = [{ key: "clients_coached", value: fmtInt(f.clientsCoached), label: t("clients coached") }];
  if (f.averageRating != null && f.reviewCount > 0) stats.push({ key: "rating", value: f.averageRating.toFixed(1), label: t("average rating") });
  if (f.yearsOnCentium != null && f.yearsOnCentium >= 1) stats.push({ key: "years_on_centium", value: yearsValue(f.yearsOnCentium), label: t("on Centium") });
  return { template: "mile", eyebrow: t("Practice milestone"), hero: "num", big: fmtInt(f.sessionsDelivered), unit: "", heroKey: "sessions_delivered", subject: t("sessions delivered"), line: t("Thank you to everyone I train"), stats };
}

/** SH3 Review: the published review, the reviewer as the public profile shows them. */
export function reviewCard(r: { rating: number; body: string; reviewer: string }): CardSpec {
  return { template: "review", eyebrow: t("New review"), hero: "quote", stars: Math.max(1, Math.min(5, Math.round(r.rating))), quote: r.body, by: r.reviewer, stats: [] };
}

export interface ProfileFacts {
  name: string;
  eyebrow: string;
  headline: string | null;
  role: string;
  averageRating: number | null;
  reviewCount: number;
  clients: number | null;
  /** "$120", with its unit ("a month", "a session"). */
  price: { value: string; label: string } | null;
}

/** SH3 Profile: the public profile in one card. */
export function profileCard(p: ProfileFacts): CardSpec {
  const stats: CardStat[] = [];
  if (p.averageRating != null && p.reviewCount > 0) stats.push({ key: "rating", value: p.averageRating.toFixed(1), label: tn(p.reviewCount, "{n} review", "{n} reviews") });
  if (p.clients != null && p.clients > 0) stats.push({ key: "clients_coached", value: fmtInt(p.clients), label: t("clients") });
  if (p.price) stats.push({ key: "price", value: p.price.value, label: p.price.label });
  return { template: "profile", eyebrow: p.eyebrow, hero: "profile", title: p.name, head: p.headline ?? undefined, role: p.role, stats };
}

export type PromoKind = "programme" | "meal_plan" | "course" | "package";

export interface PromoFacts {
  kind: PromoKind;
  title: string;
  meta: string;
  stats: CardStat[];
}

function promoEyebrow(kind: PromoKind): string {
  switch (kind) {
    case "programme":
      return t("New programme");
    case "meal_plan":
      return t("New meal plan");
    case "course":
      return t("New course");
    case "package":
      return t("New package");
  }
}

/** SH3 Programme, course or package (from the Library, Courses or Services). */
export function promoCard(p: PromoFacts): CardSpec {
  return { template: "promo", eyebrow: promoEyebrow(p.kind), hero: "title", title: p.title, meta: p.meta, stats: p.stats.slice(0, 3) };
}

/** SH3 Open slots: this week only, the first three times on chips. */
export function slotsCard(times: string[], line: string | null): CardSpec {
  return { template: "slots", eyebrow: t("Open this week"), hero: "num", big: String(times.length), unit: tn(times.length, "slot", "slots"), subject: t("for new clients"), line: line ?? undefined, extra: "slots", slots: times.slice(0, 3), stats: [] };
}

/** SH3 Community tip: a published post, on the professional's own photo. */
export function tipCard(firstName: string, body: string, topic: string | null): CardSpec {
  return { template: "tip", eyebrow: t("Tip from {name}", { name: firstName }), hero: "quote", quote: body, by: topic ? t("From my Community post · {topic}", { topic }) : t("From my Community post"), stats: [] };
}

/** Long quotes stop at a word, with an ellipsis, so the card keeps its shape. */
export function clipQuote(text: string, max = 160): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const at = cut.lastIndexOf(" ");
  return `${(at > max * 0.6 ? cut.slice(0, at) : cut).replace(/[\s.,;:!?-]+$/, "")}…`;
}

// ---------------------------------------------------------------------------
// The stored payload (share_requests.card, shared_items.card)
// ---------------------------------------------------------------------------

export interface CardPayload {
  format: ShareFormat;
  style: StoredStyle;
  template: CardTemplate;
  title?: string;
  subtitle?: string;
  name_display?: string;
  stats?: CardStat[];
}

const TEMPLATES: CardTemplate[] = ["pr", "prog", "streak", "logging", "cons", "mealplan", "mile", "review", "profile", "promo", "slots", "tip"];

/**
 * The spec as stored: the hero number is the first stat (its key), the text
 * lines go in title / subtitle with the client already filled in, and the
 * slot chips are slot_time stats. Only allowlisted keys.
 */
export function cardPayload(spec: CardSpec, format: ShareFormat, style: EditorStyle, shownAs: string | null): CardPayload {
  const fill = (t?: string) => (t == null ? undefined : shownAs == null ? t : fillClient(t, shownAs));
  const stats: CardStat[] = [];
  if (spec.hero === "num" && spec.heroKey && spec.big != null) stats.push({ key: spec.heroKey, value: spec.big, label: spec.unit ?? "" });
  if (spec.template === "review" && spec.stars) stats.push({ key: "rating", value: String(spec.stars), label: t("stars") });
  (spec.slots ?? []).forEach((s) => stats.push({ key: "slot_time", value: s, label: "" }));
  stats.push(...spec.stats);
  const title = spec.hero === "num" ? spec.subject : spec.hero === "quote" ? spec.quote : spec.hero === "profile" ? spec.head : spec.title;
  const subtitle = spec.hero === "num" ? spec.line : spec.hero === "quote" ? spec.by : spec.hero === "profile" ? spec.role : spec.meta;
  const out: CardPayload = { format, style: storedStyle(style), template: spec.template, stats: stats.slice(0, 6) };
  const tt = fill(title);
  const s = fill(subtitle);
  if (tt) out.title = tt;
  if (s) out.subtitle = s;
  if (shownAs != null) out.name_display = shownAs;
  return out;
}

function eyebrowFor(template: CardTemplate): string | null {
  switch (template) {
    case "pr":
      return t("New personal record");
    case "prog":
      return t("Programme complete");
    case "cons":
      return t("Consistency");
    case "streak":
    case "logging":
      return t("Streak milestone");
    case "mealplan":
      return t("Meal plan complete");
    case "mile":
      return t("Practice milestone");
    case "review":
      return t("New review");
    case "slots":
      return t("Open this week");
    default:
      return null;
  }
}

/** A promo payload carries no kind: its stats tell a course, package or programme apart; none is a meal plan. */
function promoEyebrowFrom(stats: CardStat[]): string {
  if (stats.some((s) => s.key === "course_lessons")) return promoEyebrow("course");
  if (stats.some((s) => s.key === "package_sessions")) return promoEyebrow("package");
  if (stats.some((s) => s.key === "programme_weeks")) return promoEyebrow("programme");
  return promoEyebrow("meal_plan");
}

/**
 * A stat label as stored: the words the card wrote in English ("kg",
 * "clients coached") show in the viewer's language; anything else (a label
 * stored in Arabic, a price's unit) shows as it was stored.
 */
function storedLabel(label: string): string {
  return label ? t(label) : label;
}

/** A stored payload back to a spec (the client's CU29 / CU30 view, the public card). Null when unreadable. */
export function specFromPayload(raw: unknown, proFirstName: string): { spec: CardSpec; format: ShareFormat; style: ShareStyle } | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const template = TEMPLATES.find((t) => t === p.template);
  if (!template) return null;
  const format = FORMATS.find((f) => f === p.format) ?? "post";
  const style = p.style === YOUR_PHOTO_STYLE ? "P" : (STYLES.find((s) => s === p.style) ?? "B");
  const stats: CardStat[] = Array.isArray(p.stats)
    ? (p.stats as unknown[])
        .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
        .map((s) => ({ key: s.key as StatKey, value: typeof s.value === "string" ? s.value : String(s.value ?? ""), label: typeof s.label === "string" ? storedLabel(s.label) : "" }))
        .filter((s) => (STAT_KEYS as readonly string[]).includes(s.key))
    : [];
  const title = str(p.title) ?? undefined;
  const subtitle = str(p.subtitle) ?? undefined;
  const heroKeys: StatKey[] = ["pr_load_kg", "programme_weeks", "workouts_count", "streak_days", "logging_streak_days", "sessions_delivered"];
  let spec: CardSpec;
  if (template === "review" || template === "tip") {
    const rating = stats.find((s) => s.key === "rating");
    spec = { template, eyebrow: template === "tip" ? t("Tip from {name}", { name: proFirstName }) : t("New review"), hero: "quote", quote: title, by: subtitle, stars: template === "review" && rating ? Number(rating.value) || 5 : undefined, stats: [] };
  } else if (template === "profile") {
    spec = { template, eyebrow: t("Train with me"), hero: "profile", head: title, role: subtitle, stats };
  } else if (template === "slots") {
    const slots = stats.filter((s) => s.key === "slot_time").map((s) => s.value);
    spec = slotsCard(slots, subtitle ?? null);
  } else {
    const hero = stats.find((s) => heroKeys.includes(s.key));
    const rest = stats.filter((s) => s !== hero);
    spec = hero
      ? { template, eyebrow: eyebrowFor(template) ?? "", hero: "num", big: hero.value, unit: hero.label, heroKey: hero.key, subject: title, line: subtitle, extra: template === "streak" || template === "logging" ? "leaves" : undefined, stats: rest }
      : { template, eyebrow: eyebrowFor(template) ?? promoEyebrowFrom(rest), hero: "title", title, meta: subtitle, stats: rest };
  }
  return { spec, format, style };
}

/** shared_items.kind for a template (a practice milestone is `milestone` since Release A 20261216020000); null only for a promo without its kind. */
export function itemKind(spec: CardSpec, promo?: PromoKind): "win" | "profile" | "review" | "slot" | "content" | "programme" | "course" | "package" | "meal_plan" | "milestone" | null {
  switch (spec.template) {
    case "pr":
    case "prog":
    case "streak":
    case "logging":
    case "cons":
    case "mealplan":
      return "win";
    case "profile":
      return "profile";
    case "review":
      return "review";
    case "slots":
      return "slot";
    case "tip":
      return "content";
    case "promo":
      return promo ?? null;
    case "mile":
      return "milestone";
  }
}

// ---------------------------------------------------------------------------
// The client's win-sharing setting, as the professional sees it (815efc5,
// W8-2: my_client_stages().win_sharing)
// ---------------------------------------------------------------------------

/** profiles.win_sharing; anything else (null, unknown) reads as "always_ask", the column default. */
export type WinSharingSetting = "always_ask" | "always_allow" | "never";
export const readWinSharing = (v: unknown): WinSharingSetting => (v === "always_allow" || v === "never" ? v : "always_ask");

/** Share and ask controls show only when the client hasn't chosen Never allow. */
export const canAskToShare = (setting: WinSharingSetting) => setting !== "never";

/** The wins this professional may still offer to share: a Never allow client's wins drop out. */
export function shareableWins<W extends { clientId: string }>(wins: W[], settings: ReadonlyMap<string, WinSharingSetting>): W[] {
  return wins.filter((w) => canAskToShare(settings.get(w.clientId) ?? "always_ask"));
}

/**
 * The shield line under the client page's "Wins this month" (SH4,
 * source/gen/r31.js clientFC31 / clientNT31). Full coaching draws the
 * setting after the ask line ("Sharing a win asks Sam first. Sam's setting:
 * Always ask."); Nutrition draws its own second sentence and no setting.
 * Always allow shares by initials without asking (ask_to_share_win), so the
 * ask sentence would be untrue and gives way to the app's existing "lets
 * professionals share wins by initials". Never allow: one neutral line.
 */
export function winsShieldLine(firstName: string, lane: "full_coaching" | "nutrition" | "clinical_overview", setting: WinSharingSetting): string {
  if (setting === "never") return t("{name} doesn't want wins shared.", { name: firstName });
  const lead = setting === "always_allow" ? t("{name} lets professionals share wins by initials.", { name: firstName }) : t("Sharing a win asks {name} first.", { name: firstName });
  if (lane === "nutrition") return `${lead} ${t("Food entries and photos are never on a card.")}`;
  return `${lead} ${t("{name}'s setting: {setting}.", { name: firstName, setting: setting === "always_allow" ? t("Always allow") : t("Always ask") })}`;
}
