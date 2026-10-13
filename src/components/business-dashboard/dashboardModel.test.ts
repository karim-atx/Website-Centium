import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { dateKicker, gaugeModels, greeting, kindOf, maskedMember, setupSteps, shortHour } from "./dashboardModel";
import type { DashRaw } from "./dashboardData";

const raw = (over: Partial<DashRaw> = {}): DashRaw => ({
  business: { id: "b", name: "Studio", type: "gym", active: true, perk: null },
  classes: [],
  bookings: [],
  members: [],
  planNames: {},
  codes: [],
  plansCount: 0,
  productsCount: 0,
  discountsCount: 0,
  seats: null,
  team: {},
  events: [],
  accessQr: false,
  storeDeliveryOrPickup: false,
  dismissed: false,
  waitlists: {},
  renewalsDue: null,
  partial: [],
  ...over,
});

describe("business dashboard model", () => {
  it("picks the per-type set (V6-52)", () => {
    assert.equal(kindOf("supplement_store", false), "store");
    assert.equal(kindOf("gym", false), "gym");
    assert.equal(kindOf("gym", true), "classes");
    assert.equal(kindOf("studio", false), "classes");
  });

  it("writes the header in the drawn formats", () => {
    const d = new Date(2026, 9, 5, 18, 30);
    assert.equal(dateKicker(d), "Monday, 5 October");
    assert.equal(greeting(d), "Good evening");
    assert.equal(greeting(new Date(2026, 9, 5, 9)), "Good morning");
    assert.equal(shortHour("18:00"), "6p");
    assert.equal(maskedMember("4f2a0000-0000-4000-8000-000000000001"), "Member #4F2A");
  });

  it("shows unlit gauges with no data, never zeros as data", () => {
    const g = gaugeModels("classes", raw(), new Date(2026, 9, 13, 12));
    assert.deepEqual(g.map((x) => x.empty), [true, true, true, true]);
    assert.deepEqual(g.map((x) => x.sub), ["No classes yet", "No bookings yet", "No members yet", "No seat blocks"]);
  });

  it("counts seats and net members from rows", () => {
    const now = new Date(2026, 9, 13, 12);
    const g = gaugeModels(
      "classes",
      raw({
        seats: { blocks: 2, perUnit: 5, capacity: 10, used: 7 },
        members: [
          { id: "1", memberId: "m1", planId: null, invitedAt: "2026-10-02T10:00:00Z", respondedAt: "2026-10-02T10:00:00Z", accepted: true, endedAt: null },
          { id: "2", memberId: "m2", planId: null, invitedAt: "2026-08-02T10:00:00Z", respondedAt: "2026-08-02T10:00:00Z", accepted: true, endedAt: "2026-10-09T10:00:00Z" },
        ],
      }),
      now
    );
    assert.equal(g[2].sub, "1 joined · 1 ended");
    assert.equal(g[2].format(g[2].target ?? 0), "0");
    assert.equal(g[3].sub, "3 free · 2 blocks");
    assert.equal(g[3].unit, "/10");
  });

  it("has five setup steps per type", () => {
    assert.deepEqual(setupSteps("classes", raw()).map((s) => s.label), [
      "Business profile saved",
      "Turn your listing on",
      "Create your first class",
      "Add a membership plan",
      "Get your first member",
    ]);
    assert.ok((setupSteps("gym", raw()).map((s) => s.label)).includes("Set up check-in"));
    assert.equal(setupSteps("store", raw()).filter((s) => s.done).length, 2);
  });
});
