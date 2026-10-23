// Market + Share 3.0 · B-SH business promo cards: the templates' content,
// toggles and layout maths, pure so the DOM card, the canvas export, the
// sheet and node:test share one definition. Ported from Business Sharing
// Screens.dc.html: SPEC, DEF_HIDE, bcard() (lines 283 to 308), the TG toggle
// lists (368 to 373) and the sheet's preview widths (361).
//
// Templates (HANDOVER §4 B-SH; PLAN F34): Weekly schedule, Class spotlight,
// Offer, Product spotlight, Membership plan, Find us on Centium. "Now hiring"
// is Release 2 (W4): it slots in as another BizTemplate with its own content
// builder and DEF_HIDE["hiring"] = ["pay"]; nothing ships for it here.
//
// Privacy (B-SH.4, HANDOVER §9): a card is built only from what is already
// public on Centium. The data types below have no field for member names or
// counts, client data, revenue or the Overview figures, so none can reach a
// card; PRIVATE_FIGURES names what must never appear (tested).

import { SHARE_TOKENS } from "../../../theme/marketTokens";
import { time12 } from "../../../utils/time12";
import { bizShareHref, bizShareText, isBizSlug, type ShareLinkKind } from "../../../services/share-links/links";
import type { MembershipPlanRow } from "../../../services/membership-plans/types";
import { billingLabel, daysLabel, priceLine } from "../../../pages/business-ops/plans/planModel";

export type BizTemplate = "schedule" | "class" | "offer" | "product" | "plan" | "profile";
export type BizFormat = "story" | "post" | "sticker";
/** Business colours · Centium · Your photo (sticker: none). */
export type BizBackground = "biz" | "cen" | "photo";

/** The card's artboard (bcard: 300 wide; 533 tall for Story and Sticker, 375 for Post). */
export const CARD_W = 300;
export const cardH = (format: BizFormat): number => (format === "post" ? 375 : 533);

/** The PNG (HANDOVER §12): 1080 wide; 9:16 = 1080×1920, 4:5 = 1080×1350; the sticker is 9:16, transparent. */
export const EXPORT_W = 1080;
export const exportH = (format: BizFormat): number => (format === "post" ? 1350 : 1920);
/** The export's artboard height in card px (1920 / 3.6 = 533.33; the DOM preview keeps the board's 533). */
export const exportArtboardH = (format: BizFormat): number => (exportH(format) * CARD_W) / EXPORT_W;

/** Story and Post; Offer and Class also Sticker (HANDOVER §4 B-SH). */
export function templateFormats(t: BizTemplate): BizFormat[] {
  return t === "offer" || t === "class" ? ["story", "post", "sticker"] : ["story", "post"];
}

/**
 * Open item 10: there is no per-business brand colour in the repo, so
 * "Business colours" uses the board's two business fills: the gym sample
 * (Hamra Strength Club, #667BB1 → #3F4F7E) for gyms and class studios, the
 * shop sample (Outlast Athletics, #4F8F8A → #2F5F58) for every other type.
 */
export const BIZ_FILLS = {
  venue: { c1: "#667BB1", c2: "#3F4F7E" },
  shop: { c1: "#4F8F8A", c2: "#2F5F58" },
} as const;
export const fillOf = (businessType: string | null | undefined) => (businessType === "gym" || businessType === "studio" ? BIZ_FILLS.venue : BIZ_FILLS.shop);

export const bizGradient = (c1: string, c2: string) => `linear-gradient(150deg, ${c1} 0%, ${c2} 100%)`;
/** CEN, verbatim (= SHARE_TOKENS.brandGradient). */
export const CEN_GRADIENT = SHARE_TOKENS.brandGradient;
/** TS_SOFT: sticker and photo cards (white text on anything). */
export const TS_SOFT = SHARE_TOKENS.overlayTextShadow;
/** CHECK: the sticker preview's transparency checker (preview only). */
export const CHECKER = SHARE_TOKENS.checkerLight;
/** The "Your photo" chip's swatch (sheet.bgs). */
export const PHOTO_SWATCH = "repeating-linear-gradient(135deg, #3E3A36 0 3px, #37332F 3px 6px)";

// ---------------------------------------------------------------------------
// The business on the card

export interface BizBrand {
  name: string;
  /** "HS" */
  initials: string;
  /** typeLabel(business_type): "Gym", "Classes", "Clothing Store" ... */
  category: string;
  /** business_profiles.location, or null. */
  location: string | null;
  logoUrl: string | null;
  slug: string;
  c1: string;
  c2: string;
}

/** "Gym · Hamra, Beirut" (the card's second head line). */
export const brandLine = (b: Pick<BizBrand, "category" | "location">) => [b.category, b.location].filter(Boolean).join(" · ");

// ---------------------------------------------------------------------------
// Template data (public fields only)

export interface SchedItem {
  /** "7:00 AM" */
  t: string;
  n: string;
}
export interface SchedDay {
  /** "MON" */
  d: string;
  items: SchedItem[];
}

export interface ScheduleData {
  days: SchedDay[];
  /** Classes on the card this week (the sheet's always-on row). */
  count: number;
}

export interface ClassData {
  id: string;
  title: string;
  /** business_classes.about, or null. */
  about: string | null;
  /** "Every Sun at 10:00 AM" or "Sun, Oct 25 · 10:00 AM". */
  when: string;
  /** "Sun 10:00 AM" (the toggle's line). */
  whenShort: string;
  /** "45 min" */
  duration: string;
  /** Spots left and capacity; null when unknown. */
  spotsLeft: number | null;
  capacity: number;
  /** created within 14 days. */
  isNew: boolean;
  /** Only an instructor hired through Centium (Team). Release 1 has no Team (D-11 / F11): always null. */
  instructor: string | null;
}

/** An offer card's fields, from the DB2 `offers` row (ManagedOffer: title, points_cost, ends_on, where_used). */
export interface OfferData {
  id: string;
  headline: string;
  pointsCost: number;
  /** ISO day, offers.ends_on; null = the offer has no end date. */
  validUntil: string | null;
  where: "in_store" | "online" | "both" | "in_person";
}

export interface ProductData {
  id: string;
  name: string;
  /** "$85", or "" when the item has no price. */
  price: string;
  description: string | null;
  imageUrl: string | null;
}

export interface PlanData {
  id: string;
  name: string;
  /** "$45" */
  price: string;
  /** "a month", "a day", "for 10 classes" (planModel.priceLine without the price). */
  unit: string;
  /** "Monthly", "30 days" ... */
  duration: string;
  /** membership_plans.includes, joined: "Gym floor, lockers, showers". */
  includes: string | null;
}

export interface ProfileData {
  /** "4.8 · 212 reviews", or null under 3 reviews (the live rule). */
  rating: string | null;
}

export type TemplateData =
  | { t: "schedule"; d: ScheduleData }
  | { t: "class"; d: ClassData }
  | { t: "offer"; d: OfferData }
  | { t: "product"; d: ProductData }
  | { t: "plan"; d: PlanData }
  | { t: "profile"; d: ProfileData };

/** Never on a card (B-SH.4): the Overview figures and anything about members, clients or money earned. */
export const PRIVATE_FIGURES = ["Members reached", "Redemptions", "Active offers", "Revenue", "Members", "Booked", "Check-ins"] as const;

// ---------------------------------------------------------------------------
// Links

export function linkOf(data: TemplateData): { kind: ShareLinkKind | null; item: string | null } {
  switch (data.t) {
    case "schedule":
      return { kind: "week", item: null };
    case "class":
      return { kind: "c", item: data.d.id };
    case "offer":
      return { kind: "o", item: data.d.id };
    case "product":
      return { kind: "i", item: data.d.id };
    case "plan":
      return { kind: "m", item: data.d.id };
    case "profile":
      return { kind: null, item: null };
  }
}

export function cardLink(slug: string, data: TemplateData): { href: string; text: string } {
  const { kind, item } = linkOf(data);
  return { href: bizShareHref(slug, kind, item), text: bizShareText(slug, kind, item) };
}

// ---------------------------------------------------------------------------
// Toggles ("Show on the card")

export interface ToggleRow {
  key: string;
  title: string;
  /** The value line under the title. */
  sub: string;
  /** "Always on" (the headline). */
  lock: boolean;
}

/** DEF_HIDE: off by default per template (hiring: ["pay"] in Release 2). */
export const DEF_HIDE: Partial<Record<BizTemplate, string[]>> = {};

const WHERE: Record<OfferData["where"], string> = { in_store: "In store", online: "Online", both: "In store and online", in_person: "In person" };
export const whereLabel = (w: OfferData["where"]) => WHERE[w];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Dec 31, 2026" (month first). */
export function longDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

export const pointsText = (n: number) => Math.round(n).toLocaleString("en-US");

/** The TG lists, per template, from the item's own values. */
export function toggleRows(data: TemplateData, brand: Pick<BizBrand, "name" | "category" | "location">): ToggleRow[] {
  switch (data.t) {
    case "offer": {
      const o = data.d;
      return [
        { key: "headline", title: "Offer headline", sub: o.headline, lock: true },
        { key: "points", title: "Points cost", sub: `${pointsText(o.pointsCost)} points`, lock: false },
        ...(o.validUntil ? [{ key: "valid", title: "Validity dates", sub: `Until ${longDay(o.validUntil)}`, lock: false }] : []),
        { key: "where", title: "Where", sub: whereLabel(o.where), lock: false },
      ];
    }
    case "class": {
      const c = data.d;
      return [
        { key: "when", title: "Class and time", sub: `${c.title} · ${c.whenShort}`, lock: true },
        { key: "dur", title: "Duration", sub: c.duration, lock: false },
        ...(c.instructor ? [{ key: "instr", title: "Instructor", sub: c.instructor, lock: false }] : []),
        ...(c.spotsLeft !== null ? [{ key: "spots", title: "Spots left", sub: `${c.spotsLeft} of ${c.capacity}`, lock: false }] : []),
      ];
    }
    case "plan": {
      const p = data.d;
      return [
        { key: "plan", title: "Plan and price", sub: [p.name, p.price].filter(Boolean).join(" · "), lock: true },
        ...(p.duration ? [{ key: "dur", title: "Duration", sub: p.duration, lock: false }] : []),
        ...(p.includes ? [{ key: "inc", title: "Includes", sub: p.includes, lock: false }] : []),
      ];
    }
    case "product": {
      const p = data.d;
      return [
        { key: "product", title: "Product and price", sub: [p.name, p.price].filter(Boolean).join(" · "), lock: true },
        ...(p.imageUrl ? [{ key: "img", title: "Photo", sub: "From your showcase", lock: false }] : []),
        ...(p.description ? [{ key: "desc", title: "Description", sub: p.description, lock: false }] : []),
      ];
    }
    case "profile":
      return [
        { key: "name", title: "Name", sub: brand.name, lock: true },
        { key: "cat", title: "Category", sub: brand.category, lock: false },
        ...(brand.location ? [{ key: "loc", title: "Location", sub: brand.location, lock: false }] : []),
        ...(data.d.rating ? [{ key: "rating", title: "Rating", sub: data.d.rating, lock: false }] : []),
      ];
    case "schedule":
      return [{ key: "week", title: "This week's classes", sub: `${data.d.count} ${data.d.count === 1 ? "class" : "classes"}`, lock: true }];
  }
}

/** A switch flipped: the hidden set without / with the key. Locked rows never hide. */
export function toggleHide(hide: readonly string[], rows: readonly ToggleRow[], key: string, on: boolean): string[] {
  const row = rows.find((r) => r.key === key);
  if (!row || row.lock) return [...hide];
  const rest = hide.filter((k) => k !== key);
  return on ? rest : [...rest, key];
}

/** The row's line with its state: "6 of 20 · off" when off (TG: "6 of 20 · off"). */
export const toggleSub = (row: ToggleRow, on: boolean) => (row.lock || on ? row.sub : [row.sub, "off"].filter(Boolean).join(" · "));

// ---------------------------------------------------------------------------
// The card's content (SPEC + bcard's row filter)

export interface CardRow {
  key: string;
  k: string;
  v: string;
}

export interface CardContent {
  eyebrow: string;
  isNew: boolean;
  title: string;
  /** schedule titles are smaller (bcard titleFs). */
  small: boolean;
  img: string | null;
  val: string | null;
  leaf: boolean;
  unit: string;
  sub: string | null;
  rows: CardRow[];
  sched: SchedDay[] | null;
}

/** A class's about line on the card: one short sentence, cut at a word. */
export function clip(text: string | null, max = 90): string | null {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const sp = cut.lastIndexOf(" ");
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).replace(/[\s.,;:]+$/, "")}…`;
}

export function cardContent(brand: Pick<BizBrand, "name" | "category" | "location">, data: TemplateData, hide: readonly string[]): CardContent {
  const off = (k: string) => hide.includes(k);
  const keep = (rows: CardRow[]) => rows.filter((r) => !off(r.key));
  const base: CardContent = { eyebrow: "", isNew: false, title: "", small: false, img: null, val: null, leaf: false, unit: "", sub: null, rows: [], sched: null };
  switch (data.t) {
    case "schedule":
      return { ...base, eyebrow: "Weekly schedule", title: `This week at ${brand.name}`, small: true, sched: data.d.days };
    case "class": {
      const c = data.d;
      return {
        ...base,
        eyebrow: "Class spotlight",
        isNew: c.isNew,
        title: c.title,
        sub: clip(c.about),
        rows: keep([
          { key: "when", k: "When", v: c.when },
          { key: "dur", k: "Duration", v: c.duration },
          ...(c.instructor ? [{ key: "instr", k: "Instructor", v: c.instructor }] : []),
          ...(c.spotsLeft !== null ? [{ key: "spots", k: "Spots left", v: `${c.spotsLeft} of ${c.capacity}` }] : []),
        ]).filter((r) => r.key === "when" || r.v),
      };
    }
    case "offer": {
      const o = data.d;
      const pts = !off("points");
      return {
        ...base,
        eyebrow: "Offer",
        title: o.headline,
        val: pts ? pointsText(o.pointsCost) : null,
        leaf: pts,
        unit: pts ? "points" : "",
        sub: "Redeem with Centium Points",
        rows: keep([
          ...(o.validUntil ? [{ key: "valid", k: "Valid", v: `Until ${longDay(o.validUntil)}` }] : []),
          { key: "where", k: "Where", v: whereLabel(o.where) },
        ]),
      };
    }
    case "product": {
      const p = data.d;
      return { ...base, eyebrow: "From our shop", img: off("img") ? null : p.imageUrl, title: p.name, val: p.price || null, sub: off("desc") ? null : clip(p.description, 110) };
    }
    case "plan": {
      const p = data.d;
      return {
        ...base,
        eyebrow: "Membership",
        title: p.name,
        val: p.price || null,
        unit: p.unit,
        rows: keep([
          { key: "dur", k: "Duration", v: p.duration },
          ...(p.includes ? [{ key: "inc", k: "Includes", v: p.includes }] : []),
        ]).filter((r) => r.v),
      };
    }
    case "profile":
      return {
        ...base,
        eyebrow: "Find us on Centium",
        title: brand.name,
        rows: keep([
          { key: "cat", k: "Category", v: brand.category },
          ...(brand.location ? [{ key: "loc", k: "Location", v: brand.location }] : []),
          ...(data.d.rating ? [{ key: "rating", k: "Rating", v: data.d.rating }] : []),
        ]),
      };
  }
}

// ---------------------------------------------------------------------------
// Layout maths (bcard)

export interface CardLayout {
  /** scale from the 300 artboard */
  k: number;
  /** artboard height */
  h: number;
  /** the scaled box */
  bw: number;
  bh: number;
  br: number;
  /** flex-grow of the spacer under the head (Story / Sticker push the content down) */
  grow: number;
  gap: number;
  titleFs: number;
  imgH: number;
  valFs: number;
  schedGap: number;
  qrS: number;
}

export function cardLayout(format: BizFormat, width: number, small: boolean): CardLayout {
  const k = width / CARD_W;
  const h = cardH(format);
  const post = format === "post";
  return {
    k,
    h,
    bw: Math.round(CARD_W * k * 10) / 10,
    bh: Math.round(h * k * 10) / 10,
    br: Math.max(8, Math.round(12 * k)),
    grow: post ? 0 : 1,
    gap: post ? 14 : 0,
    titleFs: small ? (post ? 17 : 22) : post ? 22 : 28,
    imgH: post ? 96 : 190,
    valFs: post ? 38 : 48,
    schedGap: post ? 3 : 7,
    qrS: post ? 34 : 42,
  };
}

/** The sheet's preview width (sheet line 361): Post 196, Story and Sticker 150; Destinations 120. */
export const previewWidth = (format: BizFormat): number => (format === "post" ? 196 : 150);
export const DEST_PREVIEW_W = 120;

/** The card's shadow when it sits on a well (not the sticker, not flat). */
export const CARD_SHADOW = "0 1px 2px rgba(0,0,0,0.06), 0 8px 24px rgba(36,31,27,0.10)";

// ---------------------------------------------------------------------------
// Data builders from the live rows

/** "NEW CLASS" for 14 days from creation (HANDOVER §4 B-SH). */
export const NEW_CLASS_DAYS = 14;
export function isNewClass(createdAt: string | null, now: Date = new Date()): boolean {
  if (!createdAt) return false;
  const t = Date.parse(createdAt);
  if (!Number.isFinite(t)) return false;
  const age = now.getTime() - t;
  return age >= 0 && age < NEW_CLASS_DAYS * 86_400_000;
}

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const at = (iso: string) => new Date(`${iso}T00:00:00`);
const isoOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** 0 = Monday (Monday-first weeks). */
const monIdx = (d: Date) => (d.getDay() + 6) % 7;

/** The Monday-to-Sunday week holding `today`: [monday, sunday]. */
export function weekOf(today: string): [string, string] {
  const d = at(today);
  d.setDate(d.getDate() - monIdx(d));
  const mon = isoOf(d);
  d.setDate(d.getDate() + 6);
  return [mon, isoOf(d)];
}

/** At most this many classes a day on the card; the rest read "+N more". */
export const SCHED_PER_DAY = 4;

/** This week's timetable (Monday first; days without classes left out; cancelled sessions never). */
export function weekSchedule(sessions: readonly { date: string; startTime: string; title: string; cancelled?: boolean }[], today: string): ScheduleData {
  const [mon, sun] = weekOf(today);
  const live = sessions.filter((s) => !s.cancelled && s.date >= mon && s.date <= sun);
  const byDay = new Map<number, typeof live>();
  for (const s of live) {
    const i = monIdx(at(s.date));
    byDay.set(i, [...(byDay.get(i) ?? []), s]);
  }
  const days: SchedDay[] = [];
  for (let i = 0; i < 7; i++) {
    const list = (byDay.get(i) ?? []).slice().sort((a, b) => a.startTime.localeCompare(b.startTime) || a.title.localeCompare(b.title));
    if (!list.length) continue;
    const items = list.slice(0, SCHED_PER_DAY).map((s) => ({ t: time12(s.startTime), n: s.title }));
    if (list.length > SCHED_PER_DAY) items.push({ t: `+${list.length - SCHED_PER_DAY}`, n: "more" });
    days.push({ d: DAYS[i], items });
  }
  return { days, count: live.length };
}

const minutes = (hhmm: string) => {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

/** "45 min", "1 hr", "1 hr 15 min". */
export function durationText(start: string, end: string): string {
  const a = minutes(start);
  const b = minutes(end);
  if (a === null || b === null || b <= a) return "";
  const d = b - a;
  const h = Math.floor(d / 60);
  const m = d % 60;
  return h ? `${h} hr${m ? ` ${m} min` : ""}` : `${m} min`;
}

/** "Sun, Oct 25" */
export function dayLabel(iso: string): string {
  const d = at(iso);
  return `${DAY_SHORT[monIdx(d)]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function classData(
  s: { id: string; title: string; date: string; startTime: string; endTime: string; maxCapacity: number; booked: number },
  o: { about: string | null; repeat: string | null; createdAt: string | null; now?: Date },
): ClassData {
  const d = at(s.date);
  return {
    id: s.id,
    title: s.title,
    about: o.about,
    when: o.repeat ?? `${dayLabel(s.date)} · ${time12(s.startTime)}`,
    whenShort: `${DAY_SHORT[monIdx(d)]} ${time12(s.startTime)}`,
    duration: durationText(s.startTime, s.endTime),
    spotsLeft: Math.max(0, s.maxCapacity - s.booked),
    capacity: s.maxCapacity,
    isNew: isNewClass(o.createdAt, o.now),
    instructor: null,
  };
}

/** A plan's card values from its row (planModel's own phrases: "a month", "Monthly", "for 10 classes"). */
export function planData(p: Pick<MembershipPlanRow, "id" | "name" | "price" | "billing" | "kind" | "sessionsInPack" | "validForDays" | "includes">): PlanData {
  const line = priceLine(p);
  const unit = line.startsWith(p.price) ? line.slice(p.price.length).trim() : "";
  const duration =
    p.kind === "class_pack"
      ? [p.sessionsInPack ? `${p.sessionsInPack} classes` : "", p.validForDays ? daysLabel(p.validForDays) : ""].filter(Boolean).join(" · ")
      : p.kind === "day_pass"
        ? "1 day"
        : p.kind === "drop_in"
          ? "1 class"
          : p.kind === "intro_offer"
            ? daysLabel(p.validForDays)
            : billingLabel(p.billing);
  const inc = (p.includes ?? []).map((s) => s.trim()).filter(Boolean);
  return { id: p.id, name: p.name, price: p.price, unit, duration, includes: inc.length ? inc.join(", ") : null };
}

/** A showcase item (business_offerings) as its card values. */
export function productData(o: { id: string; title: string; price: string; description: string | null }, imageUrl: string | null): ProductData {
  return { id: o.id, name: o.title, price: o.price, description: o.description?.trim() || null, imageUrl };
}

/** The sheet's title per template (board: "Share offer", "Share class"). */
export const SHEET_TITLE: Record<BizTemplate, string> = {
  schedule: "Share schedule",
  class: "Share class",
  offer: "Share offer",
  product: "Share item",
  plan: "Share plan",
  profile: "Share profile",
};

/** What the QR opens, for the Destinations note and the public page ("this offer"). */
export const ITEM_NOUN: Record<BizTemplate, string> = {
  schedule: "this week's schedule",
  class: "this class",
  offer: "this offer",
  product: "this item",
  plan: "this plan",
  profile: "your profile",
};

/**
 * Whether the business's share link resolves, in the order the share button
 * explains it. resolve_share_link answers found only for a publicly visible
 * business (Database 727924b, business_is_publicly_visible): on Explore
 * (`active`), not closed (`closedAt`) and not paused (`deactivatedAt`; a
 * verification can set active without clearing it). Any other answer would
 * offer a link that no longer opens.
 */
export type BizLinkState = "ready" | "noSlug" | "hidden" | "paused";

export function bizLinkState(b: { slug: string | null; active: boolean; closedAt: string | null; deactivatedAt: string | null }): BizLinkState {
  if (!isBizSlug(b.slug)) return "noSlug";
  if (!b.active || b.closedAt) return "hidden";
  if (b.deactivatedAt) return "paused";
  return "ready";
}
