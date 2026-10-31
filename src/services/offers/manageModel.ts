// Market + Share 3.0 · W3 · the owner's point offers, pure (B-MA.3 / P-MA.3
// Offers Manager, Create offer, Preview and publish). Rows: the DB2 `offers`
// table (Database 33c0bf5, 20261210800000): title, kind, value, category,
// points_cost, quantity_cap, per_member_limit, starts_on, ends_on (null = no
// end), where_used (in_person | online | both), terms, paused_at, hidden_at /
// hidden_reason (Centium took it down), funding_ack_at, redeemed_count,
// created_at, applies_to (Database PR #40, 20261215010000: one of the
// professional's own session types or plans; null for a business offer).
// The table has no status: it is derived here. The form's create / update
// arguments are the owner writers' (Database PR #39, 20261214010000:
// create_offer / update_offer take exactly the names offerArgs() builds;
// p_applies_to is stored since #40, and update_offer clears it on null).

import { formatShortDate } from "../../utils/date";
import { formatPoints } from "../../components/market/pointsModel";
import { num, rows, str } from "../market/parse";
import { BLOCKED_TEXT } from "../moderation/text";
import { appLocale } from "../../i18n/format";

export type OfferVariant = "business" | "professional";
export type OfferStatus = "active" | "scheduled" | "paused" | "expired";
export type OfferType = "percent_off" | "amount_off" | "free_item";
/** Business: in_store | online | both. Professional: in_person | online | both. */
export type OfferWhere = "in_store" | "online" | "both" | "in_person";

/** The owner's read of their own offers. */
export const MANAGED_OFFER_SELECT =
  "id,owner_kind,business_id,professional_id,title,category,kind,value,points_cost,quantity_cap,per_member_limit,starts_on,ends_on,where_used,terms,paused_at,hidden_at,funding_ack_at,redeemed_count,created_at,applies_to";

export interface ManagedOffer {
  id: string;
  headline: string;
  type: OfferType;
  value: number | null;
  /** offers.applies_to: the professional's session type or plan the offer applies to; null for a business. */
  appliesTo: string | null;
  category: string | null;
  pointsCost: number;
  quantityCap: number | null;
  perMemberLimit: number;
  /** YYYY-MM-DD */
  startsOn: string;
  /** YYYY-MM-DD, or null: the offer has no end date. */
  endsOn: string | null;
  where: OfferWhere;
  terms: string;
  paused: boolean;
  pausedAt: string | null;
  /** Set when Centium took the offer down (admin_set_offer_hidden). */
  hiddenAt: string | null;
  fundingAckAt: string | null;
  redeemedCount: number;
  createdAt: string | null;
}

const TYPES: readonly OfferType[] = ["percent_off", "amount_off", "free_item"];

/** The date part of an ISO date or timestamp ("2026-12-31"). */
const day = (v: unknown): string | null => {
  const s = str(v);
  return s && /^\d{4}-\d{2}-\d{2}/.test(s) ? s.slice(0, 10) : null;
};

/** where_used → the form's words: a business's in_person is "In store". */
function whereOf(v: unknown, professional: boolean): OfferWhere {
  const w = str(v);
  if (w === "online" || w === "both") return w;
  return professional ? "in_person" : "in_store";
}

export function parseManagedOffer(r: unknown): ManagedOffer | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  const id = str(o.id);
  const startsOn = day(o.starts_on);
  if (!id || !startsOn) return null;
  const t = str(o.kind);
  const pausedAt = str(o.paused_at);
  return {
    id,
    headline: str(o.title) ?? "",
    type: TYPES.includes(t as OfferType) ? (t as OfferType) : "percent_off",
    value: num(o.value),
    appliesTo: str(o.applies_to),
    category: str(o.category),
    pointsCost: num(o.points_cost) ?? 0,
    quantityCap: num(o.quantity_cap),
    perMemberLimit: num(o.per_member_limit) ?? 1,
    startsOn,
    endsOn: day(o.ends_on),
    where: whereOf(o.where_used, o.owner_kind === "professional"),
    terms: str(o.terms) ?? "",
    paused: !!pausedAt,
    pausedAt,
    hiddenAt: str(o.hidden_at),
    fundingAckAt: str(o.funding_ack_at),
    redeemedCount: num(o.redeemed_count) ?? 0,
    createdAt: str(o.created_at),
  };
}

export const parseManagedOffers = (data: unknown): ManagedOffer[] =>
  rows(data).flatMap((r) => {
    const o = parseManagedOffer(r);
    return o ? [o] : [];
  });

/** The first offer in a write's answer. */
export const parseOneOffer = (data: unknown): ManagedOffer | null => parseManagedOffers(data)[0] ?? null;

/** Today as YYYY-MM-DD in the device's local day. */
export function localDay(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/**
 * The status the list shows, from the row: after the end it's Expired (even
 * if paused), then Paused (paused by the owner, or taken down by Centium),
 * before the start Scheduled, else Active.
 */
export function offerStatus(o: Pick<ManagedOffer, "paused" | "hiddenAt" | "startsOn" | "endsOn">, today: string = localDay()): OfferStatus {
  if (o.endsOn && o.endsOn < today) return "expired";
  if (o.paused || o.hiddenAt) return "paused";
  if (o.startsOn > today) return "scheduled";
  return "active";
}

/** "Dec 31, 2026" from YYYY-MM-DD (read as a calendar day, never shifted by the timezone). */
export function dayLabel(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return formatShortDate(new Date(y, m - 1, d), { month: "short", day: "numeric", year: "numeric" });
}

/** "Oct 10, 2026" from an ISO timestamp, in the device's local day. */
export function instantDayLabel(iso: string): string {
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return "";
  return formatShortDate(t, { month: "short", day: "numeric", year: "numeric" });
}

/**
 * The manager row's meta line (B-MA.3 `offerList`, D-02 month first):
 * "Ends Dec 31, 2026 · 30 redeemed", "Starts Nov 1, 2026",
 * "Paused Oct 10, 2026 · 8 redeemed", "Ended Sep 30, 2026 · 41 redeemed".
 * Ours: "No end date · 30 redeemed" (ends_on null) and, when Centium hid it,
 * "Hidden by Centium. Contact support for details." (Karim: never the internal note).
 */
export function offerMeta(o: ManagedOffer, today: string = localDay()): string {
  const s = offerStatus(o, today);
  const red = `${formatPoints(o.redeemedCount)} redeemed`;
  if (s === "scheduled") return `Starts ${dayLabel(o.startsOn)}`;
  if (s === "expired") return `Ended ${dayLabel(o.endsOn ?? "")} · ${red}`;
  if (o.hiddenAt) return "Hidden by Centium. Contact support for details.";
  if (s === "paused") return o.pausedAt ? `Paused ${instantDayLabel(o.pausedAt)} · ${red}` : `Paused · ${red}`;
  return o.endsOn ? `Ends ${dayLabel(o.endsOn)} · ${red}` : `No end date · ${red}`;
}

const RANK: Record<OfferStatus, number> = { active: 0, scheduled: 1, paused: 2, expired: 3 };

/** The board's order: Active, Scheduled, Paused, Expired (read order within each). */
export function sortOffers(list: ManagedOffer[], today: string = localDay()): ManagedOffer[] {
  return list
    .map((o, i) => ({ o, i, r: RANK[offerStatus(o, today)] }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.o);
}

// ---------------------------------------------------------------------------
// The create / edit form

export interface OfferDraft {
  headline: string;
  type: OfferType;
  /** As typed. */
  value: string;
  appliesTo: string | null;
  pointsCost: string;
  quantityCap: string;
  perMemberLimit: string;
  startsOn: string;
  endsOn: string;
  where: OfferWhere;
  terms: string;
  fundingAck: boolean;
}

export function emptyDraft(variant: OfferVariant): OfferDraft {
  return {
    headline: "",
    type: "percent_off",
    value: "",
    appliesTo: null,
    pointsCost: "",
    quantityCap: "",
    perMemberLimit: "1",
    startsOn: "",
    endsOn: "",
    where: variant === "professional" ? "in_person" : "both",
    terms: "",
    fundingAck: false,
  };
}

export function draftOf(o: ManagedOffer): OfferDraft {
  return {
    headline: o.headline,
    type: o.type,
    value: o.value === null ? "" : String(o.value),
    appliesTo: o.appliesTo,
    pointsCost: String(o.pointsCost),
    quantityCap: o.quantityCap === null ? "" : String(o.quantityCap),
    perMemberLimit: String(o.perMemberLimit),
    startsOn: o.startsOn,
    endsOn: o.endsOn ?? "",
    where: o.where,
    terms: o.terms,
    fundingAck: !!o.fundingAckAt,
  };
}

export type DraftField = "headline" | "value" | "appliesTo" | "pointsCost" | "quantityCap" | "perMemberLimit" | "startsOn" | "endsOn";
export type DraftErrors = Partial<Record<DraftField, string>>;

/** Whole numbers only ("900", "1,200" read as 1200). */
const whole = (s: string): number | null => {
  const t = s.replace(/,/g, "").trim();
  return /^\d+$/.test(t) ? Number(t) : null;
};
const amount = (s: string): number | null => {
  const t = s.replace(/,/g, "").trim();
  return /^\d+(\.\d{1,2})?$/.test(t) ? Number(t) : null;
};

export const HEADLINE_MAX = 80;
export const TERMS_MAX = 500;

/**
 * The form's rules (the server checks them too): a headline; points cost a
 * whole number above 0; % off 1 to 100, amount off above 0 (cents allowed),
 * a free item has no value; a professional offer applies to one of their
 * services, new or edited (stored since Database PR #40; an offer published
 * before that reads back null and is asked again when edited);
 * per-member limit 1 or more; quantity cap empty or 1 or more; a start date;
 * the end date optional (no end date, as the server allows; Karim), on or
 * after the start. `endLocked`: the offer already has an end date, which
 * update_offer cannot remove (a null p_ends_on keeps the current one).
 */
export function validateDraft(d: OfferDraft, variant: OfferVariant, endLocked = false): DraftErrors {
  const e: DraftErrors = {};
  const h = d.headline.trim();
  if (!h) e.headline = "Give the offer a headline.";
  else if (h.length > HEADLINE_MAX) e.headline = `Keep the headline to ${HEADLINE_MAX} characters or fewer.`;
  if (d.type === "percent_off") {
    const v = whole(d.value);
    if (v === null || v < 1 || v > 100) e.value = "Enter a percentage from 1 to 100.";
  } else if (d.type === "amount_off") {
    const v = amount(d.value);
    if (v === null || v <= 0) e.value = "Enter an amount above 0.";
  }
  if (variant === "professional" && !d.appliesTo) e.appliesTo = "Choose the service this offer applies to.";
  const cost = whole(d.pointsCost);
  if (cost === null || cost <= 0) e.pointsCost = "Set a points cost above 0.";
  if (d.quantityCap.trim() !== "") {
    const q = whole(d.quantityCap);
    if (q === null || q < 1) e.quantityCap = "Leave it empty, or enter 1 or more.";
  }
  const lim = whole(d.perMemberLimit);
  if (lim === null || lim < 1) e.perMemberLimit = "Enter 1 or more.";
  if (!d.startsOn) e.startsOn = "Choose a start date.";
  if (!d.endsOn) {
    if (endLocked) e.endsOn = END_LOCKED_NOTE;
  } else if (d.startsOn && d.endsOn < d.startsOn) e.endsOn = "The end date can't be before the start date.";
  return e;
}

/** Shown when an offer that has an end date is saved without one. */
export const END_LOCKED_NOTE = "An end date can't be removed once it's set. Choose a new date instead.";

/**
 * offers.where_used is in_person | online | both (offers_where_check): a
 * business's "In store" is in_person, the counter (whereOf reads it back).
 */
export const whereUsedOf = (w: OfferWhere): "in_person" | "online" | "both" => (w === "online" || w === "both" ? w : "in_person");

/** The create_offer / update_offer fields (Database PR #39, 20261214010000), from a valid draft. */
export function offerArgs(d: OfferDraft, variant: OfferVariant): Record<string, unknown> {
  return {
    p_headline: d.headline.trim(),
    p_type: d.type,
    p_value: d.type === "free_item" ? null : d.type === "percent_off" ? whole(d.value) : amount(d.value),
    p_applies_to: variant === "professional" ? d.appliesTo : null,
    p_points_cost: whole(d.pointsCost),
    p_quantity_cap: d.quantityCap.trim() === "" ? null : whole(d.quantityCap),
    p_per_member_limit: whole(d.perMemberLimit) ?? 1,
    p_starts_on: d.startsOn,
    p_ends_on: d.endsOn || null,
    p_where_used: whereUsedOf(d.where),
    p_terms: d.terms.trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Labels (B-MA.3 / P-MA.3 board copy)

export const TYPE_OPTIONS = (variant: OfferVariant): readonly { key: OfferType; label: string }[] => [
  { key: "percent_off", label: "% off" },
  { key: "amount_off", label: "Amount off" },
  { key: "free_item", label: variant === "professional" ? "Free session" : "Free item or service" },
];

export const WHERE_OPTIONS = (variant: OfferVariant): readonly { key: OfferWhere; label: string }[] =>
  variant === "professional"
    ? [
        { key: "in_person", label: "In person" },
        { key: "online", label: "Online" },
        { key: "both", label: "Both" },
      ]
    : [
        { key: "in_store", label: "In store" },
        { key: "online", label: "Online" },
        { key: "both", label: "Both" },
      ];

/** The preview's Where row: "In store and online" (business Both), "In person and online" (professional Both). */
export function whereLabel(w: OfferWhere, variant: OfferVariant): string {
  if (w === "both") return variant === "professional" ? "In person and online" : "In store and online";
  return w === "in_store" ? "In store" : w === "in_person" ? "In person" : "Online";
}

export function typeLabel(t: OfferType, variant: OfferVariant): string {
  return TYPE_OPTIONS(variant).find((x) => x.key === t)?.label ?? "";
}

/** "$12" / "$12.50": whole dollars without cents. */
export function money(n: number): string {
  return Number.isInteger(n) ? `$${n.toLocaleString(appLocale("en-US"))}` : `$${n.toFixed(2)}`;
}

/** The preview's Value row: "15%", "$10", "Free". */
export function valueLabel(d: Pick<OfferDraft, "type" | "value">): string {
  if (d.type === "free_item") return "Free";
  if (d.type === "percent_off") return `${whole(d.value) ?? d.value}%`;
  const a = amount(d.value);
  return a === null ? d.value : money(a);
}

export interface PreviewRow {
  k: string;
  v: string;
}

/**
 * The summary rows under the preview card (Business `previewRows`: Type,
 * Value, Points cost, Quantity cap, Per-member limit, Dates, Where, Terms;
 * Professional: Type, Value, Applies to, Points cost, Quantity cap,
 * Per-client limit, Dates, Where). An empty cap reads "No cap"; empty terms
 * drop the row.
 */
export function previewRows(d: OfferDraft, variant: OfferVariant, appliesToLabel: string | null): PreviewRow[] {
  const out: PreviewRow[] = [
    { k: "Type", v: typeLabel(d.type, variant) },
    { k: "Value", v: valueLabel(d) },
  ];
  // The service's label from the editor's options (null only while they load or fail).
  if (variant === "professional" && appliesToLabel) out.push({ k: "Applies to", v: appliesToLabel });
  const cost = whole(d.pointsCost);
  out.push({ k: "Points cost", v: cost === null ? d.pointsCost : formatPoints(cost) });
  const cap = whole(d.quantityCap);
  out.push({ k: "Quantity cap", v: d.quantityCap.trim() === "" ? "No cap" : cap === null ? d.quantityCap : formatPoints(cap) });
  out.push({ k: variant === "professional" ? "Per-client limit" : "Per-member limit", v: String(whole(d.perMemberLimit) ?? d.perMemberLimit) });
  out.push({ k: "Dates", v: d.startsOn ? (d.endsOn ? `${dayLabel(d.startsOn)} to ${dayLabel(d.endsOn)}` : `From ${dayLabel(d.startsOn)} · No end date`) : "" });
  out.push({ k: "Where", v: whereLabel(d.where, variant) });
  if (variant === "business" && d.terms.trim()) out.push({ k: "Terms", v: d.terms.trim() });
  return out;
}

/** The parsed points cost for the preview card (0 while empty). */
export const draftCost = (d: Pick<OfferDraft, "pointsCost">): number => whole(d.pointsCost) ?? 0;

// ---------------------------------------------------------------------------
// Errors. The refusals the writers raise with their keyword in the
// message (HANDOVER_API "The four refusals the Website matches on": sqlstate
// 22023, offer_expired ATX10; applies_to_invalid 22023 since PR #40), matched on message, details and hint. The
// writers' other refusals carry no keyword: offerWriteRefusal reads the
// SQLSTATE.

export type OfferError = "funding_ack_required" | "invalid_dates" | "points_cost_required" | "offer_expired" | "applies_to_invalid";

export function offerErrorOf(e: { code?: string | null; message?: string | null; details?: string | null; hint?: string | null }): OfferError | null {
  const hay = [e.code, e.message, e.details, e.hint].filter(Boolean).join(" ").toLowerCase();
  for (const k of ["funding_ack_required", "invalid_dates", "points_cost_required", "offer_expired", "applies_to_invalid"] as const) if (hay.includes(k)) return k;
  return null;
}

/** Our words for each refusal (not drawn on the board). */
export const OFFER_ERROR_TEXT: Record<OfferError, string> = {
  funding_ack_required: "Tick the box to confirm you fund this discount in full.",
  invalid_dates: "The end date can't be before the start date.",
  points_cost_required: "Set a points cost above 0.",
  offer_expired: "This offer has ended, so it can't be edited.",
  applies_to_invalid: "Choose one of your own services for this offer.",
};

/**
 * The writers' other refusals, by SQLSTATE (20261214010000). Our words (not
 * drawn); null = not a documented refusal (the caller's fallback):
 * - ATX09: create_offer for a paused or closed business ("a paused or closed
 *   business cannot publish an offer"), or a caller who is neither a business
 *   nor a professional;
 * - 42501: not the caller's business or offer, or an offer Centium took down
 *   ("this offer has been taken down": update_offer, set_offer_paused);
 * - ATX08: update_offer / set_offer_paused on an offer that doesn't exist;
 * - ATX02: check_rate_limit('create_offer'), 20 an hour.
 */
export function offerWriteRefusal(e: { code?: string | null; message?: string | null }): string | null {
  const msg = (e.message ?? "").toLowerCase();
  switch (e.code) {
    case "ATX09":
      return msg.includes("paused or closed") ? "Your business is paused or closed, so it can't publish offers." : "Only a business or a professional can publish offers.";
    case "42501":
      return msg.includes("taken down") ? "Centium took this offer down. Contact support for details." : "You don't have permission to change this offer.";
    case "ATX08":
      return "This offer no longer exists.";
    case "ATX02":
      return "Too many new offers in a short time. Try again later.";
    // Round C Release 2: the word lists.
    case "ATX60":
      return BLOCKED_TEXT;
    default:
      return null;
  }
}
