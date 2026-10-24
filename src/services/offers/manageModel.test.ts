import { test } from "node:test";
import assert from "node:assert/strict";
import {
  END_LOCKED_NOTE,
  MANAGED_OFFER_SELECT,
  OFFER_ERROR_TEXT,
  dayLabel,
  draftOf,
  emptyDraft,
  offerArgs,
  offerErrorOf,
  offerMeta,
  offerWriteRefusal,
  offerStatus,
  parseManagedOffers,
  previewRows,
  sortOffers,
  validateDraft,
  valueLabel,
  whereLabel,
  type OfferDraft,
} from "./manageModel.ts";

const TODAY = "2026-10-22";
// An `offers` row as the owner's read returns it (DB2 20261210800000).
const row = (over: Record<string, unknown> = {}) => ({
  id: "of1",
  owner_kind: "business",
  title: "15% off full-price items",
  category: "clothing",
  kind: "percent_off",
  value: 15,
  points_cost: 900,
  per_member_limit: 1,
  starts_on: "2026-10-01",
  ends_on: "2026-12-31",
  where_used: "both",
  redeemed_count: 30,
  paused_at: null,
  hidden_at: null,
  funding_ack_at: "2026-09-30T10:00:00Z",
  ...over,
});
const one = (over: Record<string, unknown> = {}) => parseManagedOffers([row(over)])[0];
const PAUSED = new Date(2026, 9, 10, 14).toISOString();

test("parse: the table's columns; rows without an id or a start are dropped; defaults", () => {
  assert.equal(parseManagedOffers([{ id: "x" }, row()]).length, 1);
  const o = one({ quantity_cap: null, per_member_limit: null, terms: null });
  assert.equal(o.headline, "15% off full-price items");
  assert.equal(o.type, "percent_off");
  assert.equal(o.perMemberLimit, 1);
  assert.equal(o.quantityCap, null);
  assert.equal(o.terms, "");
  assert.equal(o.where, "both");
  assert.equal(o.appliesTo, null);
  // applies_to (Database PR #40) reads back into the form and round-trips.
  const pro = one({ owner_kind: "professional", applies_to: "svc1" });
  assert.equal(pro.appliesTo, "svc1");
  assert.equal(draftOf(pro).appliesTo, "svc1");
  assert.equal(offerArgs(draftOf(pro), "professional").p_applies_to, "svc1");
  assert.ok(MANAGED_OFFER_SELECT.split(",").includes("applies_to"));
  assert.equal(o.fundingAckAt, "2026-09-30T10:00:00Z");
  assert.equal(one({ starts_on: "2026-10-01T00:00:00Z" }).startsOn, "2026-10-01");
  assert.equal(one({ ends_on: null }).endsOn, null);
  // where_used in_person: "In store" for a business, "In person" for a professional.
  assert.equal(one({ where_used: "in_person" }).where, "in_store");
  assert.equal(one({ where_used: "in_person", owner_kind: "professional" }).where, "in_person");
  assert.equal(one({ paused_at: PAUSED }).paused, true);
  assert.equal(draftOf(one({ ends_on: null })).endsOn, "");
});

test("status: derived from dates, paused_at and hidden_at", () => {
  assert.equal(offerStatus(one(), TODAY), "active");
  assert.equal(offerStatus(one({ starts_on: "2026-11-01" }), TODAY), "scheduled");
  assert.equal(offerStatus(one({ paused_at: PAUSED }), TODAY), "paused");
  assert.equal(offerStatus(one({ hidden_at: PAUSED }), TODAY), "paused");
  assert.equal(offerStatus(one({ ends_on: "2026-09-30", paused_at: PAUSED }), TODAY), "expired");
  assert.equal(offerStatus(one({ ends_on: TODAY }), TODAY), "active");
  assert.equal(offerStatus(one({ ends_on: null }), TODAY), "active");
  assert.equal(offerStatus(one({ starts_on: TODAY }), TODAY), "active");
});

test("meta lines, month first (B-MA.3 offerList)", () => {
  assert.equal(offerMeta(one(), TODAY), "Ends Dec 31, 2026 · 30 redeemed");
  assert.equal(offerMeta(one({ starts_on: "2026-11-01", redeemed_count: 0 }), TODAY), "Starts Nov 1, 2026");
  assert.equal(offerMeta(one({ paused_at: PAUSED, redeemed_count: 8 }), TODAY), "Paused Oct 10, 2026 · 8 redeemed");
  assert.equal(offerMeta(one({ hidden_at: PAUSED, redeemed_count: 8 }), TODAY), "Hidden by Centium. Contact support for details.");
  assert.equal(offerMeta(one({ ends_on: null }), TODAY), "No end date · 30 redeemed");
  assert.equal(offerMeta(one({ starts_on: "2026-06-01", ends_on: "2026-09-30", redeemed_count: 41 }), TODAY), "Ended Sep 30, 2026 · 41 redeemed");
  assert.equal(offerMeta(one({ redeemed_count: 1200 }), TODAY), "Ends Dec 31, 2026 · 1,200 redeemed");
  assert.equal(dayLabel("2027-01-31"), "Jan 31, 2027");
});

test("sort: Active, Scheduled, Paused, Expired; stable inside a status", () => {
  const list = parseManagedOffers([
    row({ id: "e", ends_on: "2026-09-30" }),
    row({ id: "p", paused_at: PAUSED }),
    row({ id: "a1" }),
    row({ id: "s", starts_on: "2026-11-01" }),
    row({ id: "a2" }),
  ]);
  assert.deepEqual(sortOffers(list, TODAY).map((o) => o.id), ["a1", "a2", "s", "p", "e"]);
});

const good = (over: Partial<OfferDraft> = {}): OfferDraft => ({
  ...emptyDraft("business"),
  headline: "15% off outerwear",
  value: "15",
  pointsCost: "900",
  quantityCap: "200",
  startsOn: "2026-11-01",
  endsOn: "2027-01-31",
  ...over,
});

test("validate: points cost > 0, ends ≥ starts, value per type, limit ≥ 1", () => {
  assert.deepEqual(validateDraft(good(), "business"), {});
  assert.ok(validateDraft(good({ headline: "  " }), "business").headline);
  assert.ok(validateDraft(good({ pointsCost: "0" }), "business").pointsCost);
  assert.ok(validateDraft(good({ pointsCost: "" }), "business").pointsCost);
  assert.ok(validateDraft(good({ pointsCost: "12.5" }), "business").pointsCost);
  assert.deepEqual(validateDraft(good({ pointsCost: "1,200" }), "business"), {});
  assert.equal(validateDraft(good({ endsOn: "2026-10-31" }), "business").endsOn, "The end date can't be before the start date.");
  assert.deepEqual(validateDraft(good({ endsOn: "2026-11-01" }), "business"), {});
  // No end date is allowed (the server allows it; Karim)…
  assert.deepEqual(validateDraft(good({ endsOn: "" }), "business"), {});
  // …except on an offer that already has one: update_offer can't clear it.
  assert.equal(validateDraft(good({ endsOn: "" }), "business", true).endsOn, END_LOCKED_NOTE);
  assert.deepEqual(validateDraft(good({ endsOn: "2027-03-01" }), "business", true), {});
  assert.ok(validateDraft(good({ value: "0" }), "business").value);
  assert.ok(validateDraft(good({ value: "101" }), "business").value);
  assert.ok(validateDraft(good({ type: "amount_off", value: "0" }), "business").value);
  assert.deepEqual(validateDraft(good({ type: "amount_off", value: "12.50" }), "business"), {});
  assert.deepEqual(validateDraft(good({ type: "free_item", value: "" }), "business"), {});
  assert.ok(validateDraft(good({ perMemberLimit: "0" }), "business").perMemberLimit);
  assert.ok(validateDraft(good({ quantityCap: "0" }), "business").quantityCap);
  assert.deepEqual(validateDraft(good({ quantityCap: "" }), "business"), {});
  assert.ok(validateDraft(good({ where: "in_person" }), "professional").appliesTo);
  assert.deepEqual(validateDraft(good({ where: "in_person", appliesTo: "svc1" }), "professional"), {});
  // Stored since Database PR #40: editing asks for it too (an older offer reads back null).
  assert.ok(validateDraft(good({ where: "in_person" }), "professional", true).appliesTo);
  assert.deepEqual(validateDraft(good({ where: "in_person", appliesTo: "svc1" }), "professional", true), {});
});

test("args: documented fields; free item has no value; empty cap is null", () => {
  const a = offerArgs(good({ pointsCost: "1,200", terms: "  " }), "business");
  assert.equal(a.p_points_cost, 1200);
  assert.equal(a.p_value, 15);
  assert.equal(a.p_quantity_cap, 200);
  assert.equal(a.p_terms, null);
  assert.equal(a.p_applies_to, null);
  assert.equal(a.p_where_used, "both");
  assert.equal(offerArgs(good({ type: "free_item", value: "9" }), "business").p_value, null);
  assert.equal(offerArgs(good({ quantityCap: "" }), "business").p_quantity_cap, null);
  assert.equal(offerArgs(good({ endsOn: "" }), "business").p_ends_on, null);
  assert.equal(offerArgs(good({ appliesTo: "svc1" }), "professional").p_applies_to, "svc1");
  // offers_where_check: in_person | online | both; a business's "In store" is in_person.
  assert.equal(offerArgs(good({ where: "in_store" }), "business").p_where_used, "in_person");
  assert.equal(offerArgs(good({ where: "online" }), "business").p_where_used, "online");
  assert.equal(offerArgs(good({ where: "in_person", appliesTo: "svc1" }), "professional").p_where_used, "in_person");
  // The exact argument names create_offer / update_offer take (20261214010000 asserts them).
  assert.deepEqual(Object.keys(offerArgs(good(), "business")).sort(), ["p_applies_to", "p_ends_on", "p_headline", "p_per_member_limit", "p_points_cost", "p_quantity_cap", "p_starts_on", "p_terms", "p_type", "p_value", "p_where_used"]);
});

test("preview rows: business (Terms) and professional (Applies to, Per-client limit)", () => {
  const d = good({ terms: "Full-price items only." });
  assert.deepEqual(previewRows(d, "business", null), [
    { k: "Type", v: "% off" },
    { k: "Value", v: "15%" },
    { k: "Points cost", v: "900" },
    { k: "Quantity cap", v: "200" },
    { k: "Per-member limit", v: "1" },
    { k: "Dates", v: "Nov 1, 2026 to Jan 31, 2027" },
    { k: "Where", v: "In store and online" },
    { k: "Terms", v: "Full-price items only." },
  ]);
  const p = previewRows(good({ value: "20", pointsCost: "1200", quantityCap: "30", where: "in_person", appliesTo: "x" }), "professional", "4-session pack · $120");
  assert.deepEqual(p.map((r) => r.k), ["Type", "Value", "Applies to", "Points cost", "Quantity cap", "Per-client limit", "Dates", "Where"]);
  assert.equal(p[2].v, "4-session pack · $120");
  assert.equal(p[3].v, "1,200");
  assert.equal(p[7].v, "In person");
  // The label isn't known yet (options loading or failed): the row is left out.
  assert.ok(!previewRows(good({ where: "in_person" }), "professional", null).some((r) => r.k === "Applies to"));
  assert.equal(previewRows(good({ endsOn: "" }), "business", null).find((r) => r.k === "Dates")?.v, "From Nov 1, 2026 · No end date");
  assert.equal(previewRows(good({ quantityCap: "" }), "business", null)[3].v, "No cap");
  assert.equal(valueLabel({ type: "amount_off", value: "12.5" }), "$12.50");
  assert.equal(valueLabel({ type: "free_item", value: "" }), "Free");
  assert.equal(whereLabel("both", "professional"), "In person and online");
});

test("draftOf round-trips an offer; the funding box starts ticked once acknowledged", () => {
  const d = draftOf(one({ funding_ack_at: "2026-10-01T10:00:00Z", quantity_cap: 50 }));
  assert.equal(d.pointsCost, "900");
  assert.equal(d.quantityCap, "50");
  assert.equal(d.fundingAck, true);
  assert.equal(draftOf(one({ funding_ack_at: null })).fundingAck, false);
});

test("errors: documented names map, anything else is null", () => {
  assert.equal(offerErrorOf({ code: "P0001", message: "funding_ack_required" }), "funding_ack_required");
  assert.equal(offerErrorOf({ message: "x", details: "invalid_dates" }), "invalid_dates");
  assert.equal(offerErrorOf({ hint: "offer_expired" }), "offer_expired");
  assert.equal(offerErrorOf({ code: "23505", message: "duplicate" }), null);
  // The writers' own wording (22023 / ATX10 with the keyword first).
  assert.equal(offerErrorOf({ code: "22023", message: "funding_ack_required: you fund this discount in full, and Centium does not reimburse redemptions" }), "funding_ack_required");
  assert.equal(offerErrorOf({ code: "22023", message: "points_cost_required: an offer costs points" }), "points_cost_required");
  assert.equal(offerErrorOf({ code: "ATX10", message: "offer_expired: this offer has ended, so it cannot be edited" }), "offer_expired");
  assert.equal(offerErrorOf({ code: "22023", message: "applies_to_invalid: that is not one of your session types or plans" }), "applies_to_invalid");
  assert.equal(OFFER_ERROR_TEXT.applies_to_invalid, "Choose one of your own services for this offer.");
});

test("the writers' other refusals by SQLSTATE", () => {
  assert.equal(offerWriteRefusal({ code: "ATX09", message: "a paused or closed business cannot publish an offer" }), "Your business is paused or closed, so it can't publish offers.");
  assert.equal(offerWriteRefusal({ code: "ATX09", message: "only a business or a professional can publish an offer" }), "Only a business or a professional can publish offers.");
  assert.equal(offerWriteRefusal({ code: "42501", message: "this offer has been taken down" }), "Centium took this offer down. Contact support for details.");
  assert.equal(offerWriteRefusal({ code: "42501", message: "ATXB8: that offer is not yours" }), "You don't have permission to change this offer.");
  assert.equal(offerWriteRefusal({ code: "ATX08", message: "no such offer" }), "This offer no longer exists.");
  assert.equal(offerWriteRefusal({ code: "ATX02", message: "Too many create_offer attempts" }), "Too many new offers in a short time. Try again later.");
  assert.equal(offerWriteRefusal({ code: "XX000", message: "boom" }), null);
});
