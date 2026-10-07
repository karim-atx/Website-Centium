import { strict as assert } from "node:assert";
import { test } from "node:test";
import { cardAllows, cardDate, cardPriceLine, parseCard, planButtonState } from "./cards";

const offer = {
  kind: "plans_offer",
  payload: {
    plans: [
      { plan_id: "p1", name: "Single session", price: 40, billing: "daily", features: ["One hour, in person or online"] },
      { plan_id: "p2", name: "Monthly coaching", price: "180", billing: "monthly", features: ["Custom training program", " ", 7] },
    ],
  },
};

test("a plans offer reads every plan from the snapshot, prices as numbers", () => {
  const card = parseCard(offer);
  assert.ok(card && card.kind === "plans_offer");
  assert.equal(card.plans.length, 2);
  assert.deepEqual(card.plans[1], {
    planId: "p2",
    name: "Monthly coaching",
    price: 180,
    billing: "monthly",
    features: ["Custom training program"],
  });
});

test("PostgREST's embed may arrive as an object, an array, or null", () => {
  assert.ok(parseCard([offer]));
  assert.equal(parseCard(null), null);
  assert.equal(parseCard([]), null);
  assert.equal(parseCard(undefined), null);
});

test("a plan missing a field is dropped; an offer with none left falls back to the text", () => {
  const partial = parseCard({
    kind: "plans_offer",
    payload: { plans: [{ plan_id: "p1", name: "X", price: 10, billing: "weekly" }, offer.payload.plans[0]] },
  });
  assert.ok(partial && partial.kind === "plans_offer");
  assert.deepEqual(partial.plans.map((p) => p.planId), ["p1"]);
  assert.equal(partial.plans[0].name, "Single session");
  assert.equal(parseCard({ kind: "plans_offer", payload: { plans: [{ name: "No id", price: 1, billing: "daily" }] } }), null);
  assert.equal(parseCard({ kind: "plans_offer", payload: {} }), null);
});

test("a confirmation reads its snapshot, with or without an end date", () => {
  const card = parseCard({
    kind: "hire_confirmed",
    payload: { hire_id: "h1", plan_name: "Full year", price: 1800, billing: "annually", expires_on: "2027-10-07" },
  });
  assert.deepEqual(card, {
    kind: "hire_confirmed",
    hireId: "h1",
    planName: "Full year",
    price: 1800,
    billing: "annually",
    expiresOn: "2027-10-07",
  });
  const open = parseCard({
    kind: "hire_confirmed",
    payload: { hire_id: "h1", plan_name: "Full year", price: 1800, billing: "annually", expires_on: null },
  });
  assert.ok(open && open.kind === "hire_confirmed" && open.expiresOn === null);
});

test("an unknown kind from a newer database is no card (the text shows)", () => {
  assert.equal(parseCard({ kind: "gift_card", payload: { plans: [] } }), null);
  assert.equal(parseCard({ kind: "hire_confirmed", payload: { plan_name: "No hire id", price: 1, billing: "daily" } }), null);
});

test("prices and dates are written as the app writes them elsewhere", () => {
  assert.equal(cardPriceLine(120, "monthly"), "$120/mo");
  assert.equal(cardPriceLine(40, "daily"), "$40/day");
  assert.equal(cardPriceLine(12.5, "annually"), "$12.50/yr");
  assert.equal(cardDate("2026-10-01"), "Thu, Oct 1, 2026");
});

test("card messages: no copy, forward or edit; only an offer can be unsent", () => {
  const o = parseCard(offer)!;
  assert.deepEqual(cardAllows(o), { copy: false, forward: false, edit: false, unsend: true });
  const c = parseCard({ kind: "hire_confirmed", payload: { hire_id: "h", plan_name: "P", price: 1, billing: "daily" } })!;
  assert.equal(cardAllows(c).unsend, false);
});

test("the held plan is Selected and the others are disabled; nothing held, all Choose", () => {
  assert.equal(planButtonState("p1", new Set()), "choose");
  assert.equal(planButtonState("p1", new Set(["p1"])), "selected");
  assert.equal(planButtonState("p2", new Set(["p1"])), "disabled");
});
