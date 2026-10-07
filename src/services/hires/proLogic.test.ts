import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  cancelledLine,
  describeCancelError,
  describeConfirmError,
  describePlanWriteError,
  hireGate,
  paymentMethodLabel,
  planPriceLine,
  reorderPlans,
  sortByPosition,
  validatePlanDraft,
  type PlanDraft,
} from "./proLogic.ts";

const draft = (over: Partial<PlanDraft> = {}): PlanDraft => ({
  name: "Monthly coaching",
  price: "180",
  billing: "monthly",
  features: ["Weekly check-in call", "  ", "Chat support "],
  active: true,
  ...over,
});

test("validatePlanDraft trims, parses the price and drops blank bullets", () => {
  const r = validatePlanDraft(draft({ name: "  Monthly coaching ", price: "$1,800.50" }));
  assert.deepEqual(r, {
    ok: true,
    row: { name: "Monthly coaching", price: 1800.5, billing: "monthly", features: ["Weekly check-in call", "Chat support"], active: true },
  });
});

test("validatePlanDraft mirrors the table checks", () => {
  assert.equal(validatePlanDraft(draft({ name: "   " })).ok, false);
  assert.equal(validatePlanDraft(draft({ name: "x".repeat(81) })).ok, false);
  assert.equal(validatePlanDraft(draft({ name: "x".repeat(80) })).ok, true);
  assert.equal(validatePlanDraft(draft({ price: "" })).ok, false);
  assert.equal(validatePlanDraft(draft({ price: "-5" })).ok, false);
  assert.equal(validatePlanDraft(draft({ price: "abc" })).ok, false);
  assert.equal(validatePlanDraft(draft({ price: "0" })).ok, true);
  assert.equal(validatePlanDraft(draft({ billing: "weekly" as never })).ok, false);
  assert.equal(validatePlanDraft(draft({ features: Array.from({ length: 10 }, (_, i) => `f${i}`) })).ok, true);
  const eleven = validatePlanDraft(draft({ features: Array.from({ length: 11 }, (_, i) => `f${i}`) }));
  assert.deepEqual(eleven, { ok: false, message: "A plan can list up to 10 features." });
});

test("reorderPlans rewrites positions 0..n-1 and returns only the changed ones", () => {
  const plans = [
    { id: "a", position: 0 },
    { id: "b", position: 0 },
    { id: "c", position: 0 },
  ];
  assert.deepEqual(reorderPlans(plans, "c", "up"), [
    { id: "c", position: 1 },
    { id: "b", position: 2 },
  ]);
  const tidy = [
    { id: "a", position: 0 },
    { id: "b", position: 1 },
  ];
  assert.deepEqual(reorderPlans(tidy, "a", "down"), [
    { id: "b", position: 0 },
    { id: "a", position: 1 },
  ]);
  assert.deepEqual(reorderPlans(tidy, "a", "up"), []);
  assert.deepEqual(reorderPlans(tidy, "b", "down"), []);
  assert.deepEqual(reorderPlans(tidy, "zz", "up"), []);
});

test("sortByPosition breaks ties by creation, like professional_plans_for", () => {
  const sorted = sortByPosition([
    { id: "late", position: 0, createdAt: "2026-10-02T00:00:00Z" },
    { id: "second", position: 1, createdAt: "2026-09-01T00:00:00Z" },
    { id: "early", position: 0, createdAt: "2026-10-01T00:00:00Z" },
  ]);
  assert.deepEqual(sorted.map((p) => p.id), ["early", "late", "second"]);
});

test("hireGate follows professional_can_take_client: free period first, then the cap", () => {
  assert.equal(hireGate({ mayConnectClients: false, maxClients: 1, clientCount: 1 }), "free_period");
  assert.equal(hireGate({ mayConnectClients: true, maxClients: 1, clientCount: 1 }), "tier_cap");
  assert.equal(hireGate({ mayConnectClients: true, maxClients: 5, clientCount: 6 }), "tier_cap");
  assert.equal(hireGate({ mayConnectClients: true, maxClients: 5, clientCount: 4 }), null);
  // Unlimited, and unknown answers, block nothing.
  assert.equal(hireGate({ mayConnectClients: true, maxClients: null, clientCount: 400 }), null);
  assert.equal(hireGate({ mayConnectClients: null, maxClients: undefined, clientCount: 3 }), null);
});

test("confirm errors may name the gate to the professional", () => {
  assert.match(describeConfirmError("ATX49"), /free month has ended/);
  assert.match(describeConfirmError("ATXA0", "Free"), /client limit on your Free plan/);
  assert.match(describeConfirmError("ATXA0"), /client limit on your plan/);
  assert.match(describeConfirmError("ATXA1"), /isn't waiting/);
  assert.match(describeConfirmError("XX000"), /Couldn't confirm/);
  assert.match(describeCancelError("ATXA1"), /already been cancelled/);
});

test("plan write errors", () => {
  assert.match(describePlanWriteError({ code: "23514" }, false), /can't be saved/);
  assert.match(describePlanWriteError(null, true), /connection/i);
  assert.match(describePlanWriteError({ code: "PGRST116" }, false), /isn't there/);
});

test("cancelledLine picks the wording from was_free and names no charge", () => {
  assert.match(cancelledLine("Lea", true), /^Lea's hire is cancelled\. No payment had been confirmed/);
  const after = cancelledLine("Lea", false);
  assert.match(after, /recorded the cancellation/);
  assert.doesNotMatch(after, /\$|fee|charge|refund/i);
  assert.match(cancelledLine("", true), /^The client's hire/);
});

test("labels", () => {
  assert.equal(planPriceLine(180, "monthly"), "$180/month");
  assert.equal(planPriceLine(40.5, "daily"), "$40.50/day");
  assert.equal(planPriceLine(0, "annually"), "$0/year");
  assert.equal(paymentMethodLabel("whish"), "Whish Money");
  assert.equal(paymentMethodLabel("cash"), "Cash");
});
