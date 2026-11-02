import type { BizKind } from "../../components/business-more/kind";
import type { BusinessClassRow } from "../../services/business-classes/types";
import type { MembershipPlanRow } from "../../services/membership-plans/types";
import type { Offering } from "../../services/business-offerings/types";
import { offerLocked, placementView, type DbPromoTarget, type DbPromoType, type Placement, type PlacementView, type PromoStats, type PromoStatus, type Promotion } from "../../services/business-market/promoLogic";
import { addDays, dayMonth, daysLeft, dowTime, notEnded } from "./model";
import { appLocale } from "../../i18n/format";
import { fill, t, tk, tn, tx, type Vars } from "../../i18n/core";

// Create promotion (MA1-099 to 104, OURS-MA1-promotion-type-menu,
// OURS-MA1-gym-promotions): what can be promoted per type, the promotion
// types, and the Explore chip each one shows. Since B13 (MK-05 / MK-06): the
// mapping onto the promotions / featured_placements rows, the card view
// models, and the edit patch with the ATX10 offer lock.

export interface Promotable {
  id: string;
  kind: "class" | "offering" | "plan" | "day_pass" | "offer";
  title: string;
  /** The field text ("Strength Basics · Mon 7:30 PM"). */
  field: string;
  /** The listbox sub ("Class · Mon 7:30 PM · 6 of 14 booked"). */
  sub: string;
  /** The preview sub ("8 spots left"). */
  preview: string;
}

export function promotables(
  kind: BizKind,
  input: { classes: BusinessClassRow[]; booked: Map<string, number> | null; offerings: Offering[]; plans: MembershipPlanRow[]; offers: string[]; today: string; now: number; instructors: Map<string, string> }
): Promotable[] {
  const out: Promotable[] = [];
  if (kind === "classes" || kind === "gym") {
    for (const x of input.classes.filter((c) => c.date >= input.today && notEnded(c, input.now)).slice(0, 12)) {
      const b = input.booked?.get(x.id) ?? 0;
      const when = dowTime(x.date, x.startTime);
      const who = x.professionalId ? input.instructors.get(x.professionalId) : null;
      const left = Math.max(0, x.maxCapacity - b);
      out.push({
        id: x.id,
        kind: "class",
        title: x.title,
        field: `${x.title} · ${when}`,
        sub: t("Class · {when} · {booked} of {max} booked", { when, booked: b, max: x.maxCapacity }),
        preview: `${who ? `${t("With {name}", { name: who })} · ` : ""}${tn(left, "{n} spot left", "{n} spots left")}`,
      });
    }
  }
  for (const o of input.offers) out.push({ id: `offer:${o}`, kind: "offer", title: o, field: o, sub: t("Offer"), preview: t("On your listing") });
  if (kind === "gym") {
    for (const p of input.plans) {
      const day = p.kind === "day_pass";
      out.push({ id: p.id, kind: day ? "day_pass" : "plan", title: p.name, field: p.name, sub: day ? `${t("Day pass")} · ${p.price}` : `${t("Plan")} · ${billingWord(p.price, p.billing)}`, preview: p.price });
    }
  }
  for (const o of input.offerings) {
    const label = kind === "store" ? t("Product") : t("Class pack");
    out.push({ id: o.id, kind: "offering", title: o.title, field: o.title, sub: o.price ? `${label} · ${o.price}` : label, preview: o.price || label });
  }
  return out;
}

const billingWord = (price: string, b: string): string => (b === "monthly" ? t("{price} a month", { price }) : b === "annually" ? t("{price} a year", { price }) : price);

/** The app's promotion types are the DB's promo_type (OURS "7 days free" has no DB type and was removed). */
export type PromoType = DbPromoType;

export interface PromoTypeOption {
  value: PromoType;
  label: string;
  note?: string;
}

/** OURS-MA1-promotion-type-menu rows 2-6 per type. */
export function promoTypes(kind: BizKind): PromoTypeOption[] {
  const pct: PromoTypeOption = { value: "percent_off", label: t("Percent off"), note: t("Choose 5% to 90%") };
  if (kind === "store") return [pct, { value: "free_delivery", label: t("Free delivery") }];
  if (kind === "gym") return [pct, { value: "first_free", label: t("First visit free") }, { value: "bring_friend", label: t("Bring a friend free") }];
  return [pct, { value: "first_free", label: t("First class free") }, { value: "first_n_free", label: t("First 2 classes free") }, { value: "bring_friend", label: t("Bring a friend free") }];
}

/** first_n_free's n: the menu offers 2 (row 4); a row may hold another n (1 to 50). */
export const FIRST_N = 2;

/** The field text and the Explore chip for a type, in the app's language. */
export function promoText(kind: BizKind, type: PromoType | null, value: number | null): { field: string; chip: string } {
  return promoTextIn(t, kind, type, value);
}

/**
 * The same in English or in the app's language: promotions.name (promoName) is
 * stored, so it is always written in English, whatever the owner's language.
 */
function promoTextIn(tr: (key: string, vars?: Vars) => string, kind: BizKind, type: PromoType | null, value: number | null): { field: string; chip: string } {
  if (!type) return { field: tr(tk("Choose a type")), chip: tr(tk("Offer")) };
  switch (type) {
    case "percent_off":
      return value ? { field: tr(tk("{value}% off"), { value }), chip: tr(tk("{value}% off"), { value }) } : { field: tr(tk("Percent off")), chip: tr(tk("Offer")) };
    case "first_free":
      return { field: kind === "gym" ? tr(tk("First visit free")) : tr(tk("First class free")), chip: tr(tk("1 free")) };
    case "first_n_free": {
      const n = value ?? FIRST_N;
      return { field: tr(tk("First {n} classes free"), { n }), chip: tr(tk("{n} free"), { n }) };
    }
    case "bring_friend":
      return { field: tr(tk("Bring a friend free")), chip: tr(tk("Free friend")) };
    case "free_delivery":
      return { field: tr(tk("Free delivery")), chip: tr(tk("Free delivery")) };
  }
}

/** The value a type stores: percent_off its %, first_n_free its n, the rest null (promotions_value check). */
export const valueFor = (type: PromoType, value: number | null): number | null => (type === "percent_off" ? value : type === "first_n_free" ? value ?? FIRST_N : null);

export interface PromoDraft {
  what: string | null;
  type: PromoType | null;
  value: number | null;
  from: string | null;
  to: string | null;
  audience: "new" | "everyone";
}

export interface PromoErrors {
  what?: string;
  type?: string;
  value?: string;
  to?: string;
}

export function validatePromo(d: PromoDraft, whatError: string): PromoErrors {
  const e: PromoErrors = {};
  if (!d.what) e.what = whatError;
  if (!d.type) e.type = t("Pick a promotion type.");
  if (d.type === "percent_off" && (!d.value || d.value < 5 || d.value > 90)) e.value = t("Choose 5% to 90%");
  if (!d.to) e.to = t("Choose an end date.");
  else if (d.from && d.to < d.from) e.to = t("The end date must be after the start date.");
  return e;
}

// ---------------------------------------------------------------------------
// Promotable <-> promotions row

/** The synthetic "what" of a promotion for any offer (target any). */
export const ANY_ID = "any";

/** What a Promotable becomes in promotions.target_kind / target_id. Offers (the perk, discounts) have no row id: target any. */
export function promoTarget(item: Pick<Promotable, "id" | "kind">): { kind: DbPromoTarget; id: string | null } {
  switch (item.kind) {
    case "class":
      return { kind: "class", id: item.id };
    case "offering":
      return { kind: "product", id: item.id };
    case "plan":
      return { kind: "plan", id: item.id };
    case "day_pass":
      return { kind: "day_pass", id: item.id };
    default:
      return { kind: "any", id: null };
  }
}

const lowerFirst = (s: string): string => (s ? s[0].toLowerCase() + s.slice(1) : s);

/** promotions.name (1 to 60): "Strength Basics, 25% off"; an offer named like its type keeps its own name. */
export function promoName(kind: BizKind, title: string, type: PromoType, value: number | null): string {
  const field = promoTextIn(fill, kind, type, value).field;
  const name = title.trim().toLowerCase() === field.toLowerCase() ? title.trim() : `${title.trim()}, ${lowerFirst(field)}`;
  return name.length <= 60 ? name : `${name.slice(0, 59).trimEnd()}…`;
}

/** The title before ", <type>" in a name we wrote (an any-target promotion's offer). */
export const nameTitle = (name: string): string => name.split(", ")[0] || name;

/**
 * The Promotable a row points at: the listed item when it is still there,
 * else a stand-in built from what is known (a past class, an offer).
 */
export function itemForPromotion(p: Pick<Promotion, "targetKind" | "targetId" | "name">, items: Promotable[], titles: Map<string, string>): Promotable {
  if (p.targetKind === "any" || !p.targetId) {
    const nt = nameTitle(p.name);
    const offer = items.find((i) => i.kind === "offer" && i.title === nt);
    return offer ?? { id: ANY_ID, kind: "offer", title: nt, field: nt, sub: t("Offer"), preview: t("On your listing") };
  }
  const hit = items.find((i) => i.id === p.targetId);
  if (hit) return hit;
  const nt = titles.get(p.targetId) ?? nameTitle(p.name);
  const kind: Promotable["kind"] = p.targetKind === "class" ? "class" : p.targetKind === "plan" ? "plan" : p.targetKind === "day_pass" ? "day_pass" : p.targetKind === "product" ? "offering" : "offer";
  return { id: p.targetId, kind, title: nt, field: nt, sub: kind === "class" ? t("Class") : kind === "offering" ? t("Offering") : kind === "plan" ? t("Plan") : t("Offer"), preview: t("On your listing") };
}

export function draftOf(p: Promotion, item: Promotable): PromoDraft {
  return { what: item.id, type: p.type, value: p.type === "percent_off" || p.type === "first_n_free" ? p.value : null, from: p.startsOn, to: p.endsOn, audience: p.audience };
}

/** The UI status of an edit sheet. */
export type EditStatus = "scheduled" | "active" | "paused" | "ended";
export const editStatusOf = (s: PromoStatus): EditStatus => (s === "live" ? "active" : s);

/**
 * The columns an edit writes: only what changed. A started promotion's offer
 * (target, type, value, audience) and its start day are never sent (ATX10).
 */
export function editPatch(
  before: Promotion,
  status: PromoStatus,
  d: PromoDraft,
  item: Promotable,
  kind: BizKind
): Partial<{ name: string; target_kind: DbPromoTarget; target_id: string | null; type: PromoType; value: number | null; starts_on: string; ends_on: string | null; audience: "new" | "everyone" }> {
  const out: ReturnType<typeof editPatch> = {};
  if (d.to !== before.endsOn) out.ends_on = d.to;
  if (offerLocked(status)) return out;
  if (d.from && d.from !== before.startsOn) out.starts_on = d.from;
  const type = d.type ?? before.type;
  const value = valueFor(type, d.value);
  const target = item.id === ANY_ID ? { kind: before.targetKind, id: before.targetId } : promoTarget(item);
  if (target.kind !== before.targetKind || target.id !== before.targetId) {
    out.target_kind = target.kind;
    out.target_id = target.id;
  }
  if (type !== before.type) out.type = type;
  if (value !== before.value) out.value = value;
  if (d.audience !== before.audience) out.audience = d.audience;
  const name = promoName(kind, item.title, type, value);
  if (name !== before.name && (out.type || out.value !== undefined || out.target_kind)) out.name = name;
  return out;
}

// ---------------------------------------------------------------------------
// Cards (MA1-007 P1-P2, 107, 109, 111, 115, 118; OURS-MA1-feature-payment-cash 9, 11)

export type ChipKey = "active" | "scheduled" | "paused" | "ended" | "featured" | "awaiting" | "unpaid";

export const CHIP_LABEL: Record<ChipKey, string> = {
  active: tk("Active"),
  scheduled: tk("Scheduled"),
  paused: tk("Paused"),
  ended: tk("Ended"),
  featured: tk("Featured"),
  awaiting: tk("Awaiting payment"),
  unpaid: tk("Payment not received"),
};

export const chipOfStatus = (s: PromoStatus): ChipKey => (s === "live" ? "active" : s);

/** A chip's words in the app's language ("Active" here is a running promotion, not a person). */
export const chipLabel = (k: ChipKey): string => (k === "active" ? tx("Active", "promotion") : t(CHIP_LABEL[k]));

export type IconKey = "percent" | "gift" | "megaphone" | "award";
export const iconOfType = (t: PromoType): IconKey => (t === "percent_off" ? "percent" : t === "free_delivery" ? "megaphone" : "gift");

/** "new clients" / "new members" / "new customers" from the audience option (vocab audienceNew, already in the app's language). */
export const audienceWord = (audienceNew: string, a: "new" | "everyone"): string =>
  a === "everyone"
    ? t("everyone")
    : audienceNew === t("New members only")
      ? t("new members")
      : audienceNew === t("New customers only")
        ? t("new customers")
        : audienceNew === t("New clients only")
          ? t("new clients")
          : audienceNew.replace(/ only$/, "").toLowerCase();

/** The real end: the day it was ended early, else the end date. */
export function realEnd(p: Pick<Promotion, "endsOn" | "endedAt">): string | null {
  if (p.endedAt) {
    const d = new Date(p.endedAt);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return p.endsOn && p.endsOn < iso ? p.endsOn : iso;
  }
  return p.endsOn;
}

/** Dates line: "28 Sep to 31 Oct · new clients"; scheduled "From 12 Oct · everyone"; ended early shows the real end. */
export function promoDates(p: Promotion, status: PromoStatus, audienceNew: string): string {
  const end = realEnd(p);
  const span = status === "scheduled" || !end ? t("From {date}", { date: dayMonth(p.startsOn) }) : t("{from} to {to}", { from: dayMonth(p.startsOn), to: dayMonth(end) });
  return `${span} · ${audienceWord(audienceNew, p.audience)}`;
}

/** "41" / "41 of 100"; "–" before it starts or without stats. */
export function usesText(status: PromoStatus, s: PromoStats | undefined): string {
  if (status === "scheduled" || !s) return "–";
  return s.useLimit ? t("{n} of {max}", { n: s.uses.toLocaleString(appLocale("en-US")), max: s.useLimit.toLocaleString(appLocale("en-US")) }) : s.uses.toLocaleString(appLocale("en-US"));
}

export const peopleText = (status: PromoStatus, s: PromoStats | undefined): string => (status === "scheduled" || !s ? "–" : s.people.toLocaleString(appLocale("en-US")));

/** "$1,230" / "$12.50". */
export const money = (n: number): string => `$${n.toLocaleString(appLocale("en-US"), { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

/** Recorded revenue line, only when the offer was used: the business's own payments, never Centium's. */
export function recordedLine(s: PromoStats | undefined): string | null {
  if (!s || s.uses === 0) return null;
  return t("{amount} recorded on the payments that used it", { amount: money(s.recorded) });
}

export type PromoAction = "edit" | "pause" | "resume" | "end" | "cancel" | "again";

export function promoActions(status: PromoStatus): PromoAction[] {
  switch (status) {
    case "live":
      return ["edit", "pause", "end"];
    case "paused":
      return ["edit", "resume", "end"];
    case "scheduled":
      return ["edit", "cancel"];
    case "ended":
      return ["again"];
  }
}

/** Sort: running first (live, paused), then scheduled, then ended; newest start first inside each. */
export function sortPromotions<T extends { status: PromoStatus; p: Pick<Promotion, "startsOn"> }>(rows: T[]): T[] {
  const rank: Record<PromoStatus, number> = { live: 0, paused: 1, scheduled: 2, ended: 3 };
  return [...rows].sort((a, b) => rank[a.status] - rank[b.status] || (a.p.startsOn < b.p.startsOn ? 1 : a.p.startsOn > b.p.startsOn ? -1 : 0));
}

// ---------------------------------------------------------------------------
// Offers on your listing (MA1-007 OF1 / OF2): a promotion's switch is show_on_listing.

/** OF2 right text: `34 uses`, `Live now`, `Off`; paused / scheduled say so. */
export function offerUsed(status: PromoStatus, on: boolean, s: PromoStats | undefined): string {
  if (!on) return t("Off");
  if (status === "paused") return t("Paused");
  if (status === "scheduled") return t("Not started");
  if (s && s.uses > 0) return tn(s.uses, "{n} use", "{n} uses", { n: s.uses.toLocaleString(appLocale("en-US")) });
  return t("Live now");
}

/** OF1 sub: "Promotion · ends 31 Oct". */
export const offerSub = (p: Pick<Promotion, "endsOn">): string => (p.endsOn ? t("Promotion · ends {date}", { date: dayMonth(p.endsOn) }) : t("Promotion"));

// ---------------------------------------------------------------------------
// Featured weeks

export interface PlacementCard {
  view: Exclude<PlacementView, null>;
  chip: ChipKey;
  dates: string;
  /** OURS-MA1-feature-payment-cash row 11 line. */
  line: string | null;
}

export function placementCard(p: Placement, today: string): PlacementCard | null {
  const view = placementView(p);
  if (!view) return null;
  const span = t("{from} to {to}", { from: dayMonth(p.startsOn), to: dayMonth(p.endsOn) });
  switch (view) {
    case "awaiting":
      return { view, chip: "awaiting", dates: t("Starts {date} once paid", { date: dayMonth(p.startsOn) }), line: null };
    case "scheduled":
      return { view, chip: "scheduled", dates: span, line: null };
    case "featured":
      return { view, chip: "featured", dates: `${span} · ${daysLeft(today, p.endsOn)}`, line: null };
    case "ended":
      return { view, chip: "ended", dates: span, line: null };
    case "unpaid":
      return { view, chip: "unpaid", dates: span, line: t("Your start date passed without a payment.") };
  }
}

/** MA1-007 F2 / OURS-MA1-feature-payment-cash row 12: the line on the Featured card, from the most relevant week. */
export function featuredLine(placements: Placement[], title: (p: Placement) => string, today: string): { text: string; right: string | null } | null {
  const live = placements.find((p) => p.status === "live");
  if (live) return { text: t("{name} is featured", { name: title(live) }), right: daysLeft(today, live.endsOn) };
  const awaiting = placements.find((p) => p.status === "requested");
  if (awaiting) return { text: t("{name}: awaiting payment", { name: title(awaiting) }), right: null };
  return null;
}

/** request_featured_week is the owner's (ATX03 for anyone else). */
export const OWNER_ONLY = tk("Only the owner can feature your business.");

/** A start day for Pick new dates: the old one if still ahead, else today. */
export const retryStart = (p: Pick<Placement, "startsOn">, today: string): string => (p.startsOn >= today ? p.startsOn : today);

/** The last start day request_featured_week takes (today + 90). */
export const lastFeatureStart = (today: string): string => addDays(today, 90);
