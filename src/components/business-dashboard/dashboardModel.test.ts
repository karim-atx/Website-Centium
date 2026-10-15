import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classGlance, dateKicker, gaugeModels, greeting, kindOf, setupSteps, shortHour, toGlance, todayBlock } from "./dashboardModel";
import type { DashRaw } from "./dashboardTypes";

const raw = (over: Partial<DashRaw> = {}): DashRaw => ({
  business: { id: "b", name: "Studio", type: "gym", active: true },
  classes: [],
  bookings: [],
  members: [],
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
  store: null,
  glance: null,
  glanceLastWeek: null,
  attention: null,
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

describe("store Today block (DA1-011, B11)", () => {
  const now = new Date(2026, 9, 15, 12, 0);
  const at = (h: number, day = 15) => new Date(2026, 9, day, h, 0).toISOString();
  const store = (orders: NonNullable<DashRaw["store"]>["orders"], total = orders.length) => ({
    totalOrders: total,
    orders,
    lowStock: [
      { id: "p1", name: "Whey Protein 2 kg", stock: 3, category: "Protein" },
      { id: "p2", name: "Shaker", stock: 0, category: null },
    ],
  });

  it("keeps the No orders yet card until the first order (and while B11 is missing)", () => {
    assert.equal(todayBlock("store", raw(), now).kind, "empty");
    assert.equal(todayBlock("store", raw({ store: store([]) }), now).kind, "empty");
  });

  it("counts today, open orders and low stock; lists open orders with the server label", () => {
    const b = todayBlock(
      "store",
      raw({
        store: store([
          { id: "o3", number: 1042, fulfilment: "pickup", itemCount: 2, label: "Member #0042", status: "ready_for_pickup", placedAt: at(10) },
          { id: "o2", number: 1041, fulfilment: "delivery", itemCount: 1, label: "Jane", status: "placed", placedAt: at(9) },
          { id: "o1", number: 1040, fulfilment: "delivery", itemCount: 3, label: "Guest", status: "completed", placedAt: at(9, 14) },
        ], 12),
        glance: toGlance([
          { metric: "orders_today", value: "2", early: false },
          { metric: "low_stock", value: 2, early: false },
        ]),
      }),
      now
    );
    assert.equal(b.kind, "store");
    if (b.kind !== "store") return;
    assert.deepEqual(b.boxes.map((x) => [x.value, x.label]), [["2", "Orders today"], ["2", "To pack or deliver"], ["2", "Low stock"]]);
    assert.equal(b.boxes[2].delta, "Under 5 left");
    assert.deepEqual(b.orders.map((o) => [o.title, o.detail, o.pill.text]), [
      ["Order #1042", "Pickup · 2 items · Member #0042", "Ready"],
      ["Order #1041", "Delivery · 1 item · Jane", "To pack"],
    ]);
    assert.deepEqual(b.low.map((l) => [l.title, l.detail, l.value]), [["Whey Protein 2 kg", "Protein", "3 left"], ["Shaker", "Other", "0 left"]]);
    assert.equal(b.tip, null);
  });

  it("shows the early tip only when the glance says early, and the setup step closes on the first order", () => {
    const one = [{ id: "o1", number: 1, fulfilment: "pickup" as const, itemCount: 1, label: "Guest", status: "placed" as const, placedAt: at(9) }];
    const r = raw({ store: store(one), glance: toGlance([{ metric: "orders_open", value: 1, early: true }]) });
    const b = todayBlock("store", r, now);
    assert.equal(b.kind === "store" ? b.tip : null, "Early days: not enough history yet");
    assert.equal(setupSteps("store", r).find((s) => s.key === "order")?.done, true);
    // Few orders in total but history the server counts as enough: no tip.
    const settled = todayBlock("store", raw({ store: store(one), glance: toGlance([{ metric: "orders_open", value: 1, early: false }]) }), now);
    assert.equal(settled.kind === "store" ? settled.tip : "x", null);
  });

  it("To pack or deliver is the glance's orders_open (placed to ready), else the list's open count", () => {
    const one = [{ id: "o1", number: 1, fulfilment: "pickup" as const, itemCount: 1, label: "Guest", status: "placed" as const, placedAt: at(9) }];
    const b = todayBlock("store", raw({ store: store(one), glance: toGlance([{ metric: "orders_open", value: 7, early: false }, { metric: "orders_to_pack", value: 5, early: false }]) }), now);
    assert.equal(b.kind === "store" ? b.boxes.find((x) => x.label === "To pack or deliver")?.value : null, "7");
  });
});

describe("B15 glance (business_glance)", () => {
  it("draws the class boxes from the glance, with the delta against last week's glance", () => {
    const g = classGlance({
      glance: toGlance([
        { metric: "classes_today", value: 4, early: false },
        { metric: "average_fill_pct", value: "72.4", early: false },
        { metric: "on_waitlists", value: 3, early: false },
        { metric: "appointments_today", value: 1, early: false },
      ]),
      glanceLastWeek: toGlance([{ metric: "average_fill_pct", value: 66, early: false }]),
    });
    assert.deepEqual(g.boxes.map((b) => [b.value, b.label, b.delta]), [
      ["4", "Classes today", undefined],
      ["72%", "Average fill", "+6% vs last week"],
      ["3", "On waitlists", undefined],
    ]);
    assert.equal(g.early, false);
  });

  it("early: no delta, and the tip", () => {
    const g = classGlance({
      glance: toGlance([{ metric: "classes_today", value: 1, early: true }, { metric: "average_fill_pct", value: 40, early: true }]),
      glanceLastWeek: toGlance([{ metric: "average_fill_pct", value: 10, early: true }]),
    });
    assert.equal(g.boxes[1].delta, undefined);
    assert.equal(g.early, true);
  });

  it("no permission: no box; failed read: pending, never 0", () => {
    assert.deepEqual(classGlance({ glance: {}, glanceLastWeek: null }).boxes, []);
    assert.deepEqual(classGlance({ glance: null, glanceLastWeek: null }).boxes.map((b) => b.value), ["–", "–", "–"]);
    assert.equal(classGlance({ glance: toGlance([{ metric: "average_fill_pct", value: null, early: true }]), glanceLastWeek: null }).boxes[0].value, "–");
  });

  it("store boxes leave out what the glance does not return", () => {
    const r = raw({
      store: { totalOrders: 1, orders: [{ id: "o", number: 1, fulfilment: "pickup", itemCount: 1, label: "Guest", status: "placed", placedAt: "2026-10-15T10:00:00Z" }], lowStock: [] },
      glance: toGlance([{ metric: "orders_today", value: 0, early: true }]),
    });
    const b = todayBlock("store", r, new Date(2026, 9, 15, 12));
    assert.deepEqual(b.kind === "store" ? b.boxes.map((x) => x.label) : [], ["Orders today", "To pack or deliver"]);
  });
});
