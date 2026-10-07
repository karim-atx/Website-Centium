// The two chat cards of Stage A3 (Database 20261101010000_hire_chat_cards):
// MO1.2.1.3.7 "Rami's plans" (plans_offer) and MO1.2.1.3.8 "Plan confirmed"
// (hire_confirmed). Pure, so it is tested without a database (cards.test.ts).
//
// A CARD IS A DECORATION ON AN ORDINARY MESSAGE. Every card row has a real
// message beside it carrying plain text ("I have some plans that might suit
// you." / "Plan confirmed: Monthly coaching."), which is what search, the
// chat list's preview, quotes, push and unread counts all keep using. The
// thread draws the card IN PLACE OF that text bubble (the frames draw no text
// bubble beside the card), and falls back to the text whenever the card cannot
// be read: an unknown kind from a newer database, a payload missing a field,
// or a message whose content was removed.
//
// THE PAYLOAD IS A SNAPSHOT (plan names and prices copied in when it was
// posted), so nothing here looks a plan up to render it.

import { planPriceLabel } from "../hires/clientLogic";

export type CardBilling = "daily" | "monthly" | "annually";

export interface OfferedPlan {
  planId: string;
  name: string;
  price: number;
  billing: CardBilling;
  features: string[];
}

export type MessageCard =
  | { kind: "plans_offer"; plans: OfferedPlan[] }
  | {
      kind: "hire_confirmed";
      hireId: string;
      planName: string;
      price: number;
      billing: CardBilling;
      /** "2026-10-31", or null for a plan with no end date. */
      expiresOn: string | null;
    };

const BILLINGS: readonly string[] = ["daily", "monthly", "annually"];

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asPrice(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function asBilling(v: unknown): CardBilling | null {
  return typeof v === "string" && BILLINGS.includes(v) ? (v as CardBilling) : null;
}

function asText(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v.trim() : null;
}

function parsePlan(v: unknown): OfferedPlan | null {
  if (!isObject(v)) return null;
  const planId = asText(v.plan_id);
  const name = asText(v.name);
  const price = asPrice(v.price);
  const billing = asBilling(v.billing);
  if (!planId || !name || price === null || !billing) return null;
  const features = Array.isArray(v.features)
    ? v.features.filter((f): f is string => typeof f === "string" && f.trim() !== "").map((f) => f.trim())
    : [];
  return { planId, name, price, billing, features };
}

/**
 * The card on one message, from PostgREST's `message_cards(kind, payload)`
 * embed, or null when there is none or it cannot be read.
 *
 * TAKES AN ARRAY OR AN OBJECT. message_cards' primary key IS its foreign key to
 * messages, so PostgREST embeds it as a single object (or null); an array is
 * accepted too so the reader does not depend on how that detection goes.
 */
export function parseCard(raw: unknown): MessageCard | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!isObject(row) || !isObject(row.payload)) return null;
  const p = row.payload;
  if (row.kind === "plans_offer") {
    if (!Array.isArray(p.plans)) return null;
    const plans = p.plans.map(parsePlan).filter((x): x is OfferedPlan => x !== null);
    return plans.length > 0 ? { kind: "plans_offer", plans } : null;
  }
  if (row.kind === "hire_confirmed") {
    const hireId = asText(p.hire_id);
    const planName = asText(p.plan_name);
    const price = asPrice(p.price);
    const billing = asBilling(p.billing);
    if (!hireId || !planName || price === null || !billing) return null;
    const expiresOn = typeof p.expires_on === "string" && /^\d{4}-\d{2}-\d{2}/.test(p.expires_on) ? p.expires_on.slice(0, 10) : null;
    return { kind: "hire_confirmed", hireId, planName, price, billing, expiresOn };
  }
  return null;
}

/** "$120/mo" (MO1.2.1.3.7's own sample): the same label the hire sheet uses, so the two cannot disagree. */
export function cardPriceLine(price: number, billing: CardBilling): string {
  return planPriceLabel(price, billing);
}

/** "Thu, Oct 1, 2026" (MO1.2.1.3.8's date line). A date-only string is read as a local date. */
export function cardDate(isoOrDate: string): string {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(isoOrDate) ? new Date(`${isoOrDate}T00:00:00`) : new Date(isoOrDate);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/**
 * Which long-press actions a card message keeps.
 *
 * - Reply, Star, Pin, Info, Report, Delete for me: as on any message (they act
 *   on the message, whose text describes the card wherever it is quoted).
 * - Copy and Forward: no. The only text is the card's fallback sentence, and a
 *   forwarded "I have some plans that might suit you." would arrive as the
 *   forwarder's own words with no plans in it.
 * - Edit: no. The text is the card's caption; editing it would make the
 *   message and its card say different things (the card itself is not
 *   client-writable at all).
 * - Delete for everyone: an offer, yes, inside the server's window (a plans
 *   card sent by mistake can be withdrawn); a "Plan confirmed" card, no: it is
 *   the record of a confirmed payment and is posted by the server.
 */
export function cardAllows(card: MessageCard): { copy: boolean; forward: boolean; edit: boolean; unsend: boolean } {
  return { copy: false, forward: false, edit: false, unsend: card.kind === "plans_offer" };
}

/**
 * Each offered plan's button on the client's side of MO1.2.1.3.7 / .3.8:
 * "Selected" for a plan they hold a live hire on, "Choose" disabled while they
 * hold any live hire with this professional (hire_professional refuses a
 * second one, ATX99), otherwise "Choose".
 */
export function planButtonState(planId: string, hiredPlanIds: ReadonlySet<string>): "selected" | "disabled" | "choose" {
  if (hiredPlanIds.has(planId)) return "selected";
  return hiredPlanIds.size > 0 ? "disabled" : "choose";
}
