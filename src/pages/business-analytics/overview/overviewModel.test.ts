import { test } from "node:test";
import assert from "node:assert/strict";
import { buildClock, f12, type ClockColours, type ClockInput, type ClockItem } from "./clockModel.ts";
import { headline, headlineSize, insights, outcomes, revenueInsight, shareBody, type OvRaw } from "./overviewModel.ts";
import { owed, type PaymentRecord } from "../../../services/business-revenue/model.ts";

const C: ClockColours = {
  dark: false,
  hc: false,
  ink: "#241F1B",
  inkSoft: "#5B5349",
  faint: "#8C8378",
  tert: "#A79E93",
  divider: "rgba(36,31,27,0.06)",
  soft: "#F5F5F6",
  pale: "#F0EDF9",
  pDark: "#7D6BB5",
  good: "#3F9165",
  cls: "#8E7FD0",
  evc: "#6F9993",
  tabCls: "#5F5093",
  tabEv: "#3E6B67",
};
const item = (key: string, ss: string, es: string, t: string, bk = 5, cap = 10, ev = false): ClockItem => {
  const h = (s: string) => Number(s.slice(0, 2)) + Number(s.slice(3)) / 60;
  return { key, s: h(ss), e: h(es), ss, es, t, who: "John", bk, cap, ev, loc: ev ? "Front desk" : null };
};
const base = (over: Partial<ClockInput>): ClockInput => ({
  items: [],
  now: 18 + 5 / 60,
  c: C,
  is24: false,
  blend: 0,
  halfPM: null,
  cyc: 0,
  selKey: null,
  swX: 0,
  anim: false,
  dir: 1,
  panelOpen: false,
  ts: 1,
  isStore: false,
  isEmpty: false,
  emptyNext: "",
  reducedMotion: false,
  ...over,
});

test("f12 matches the source (18:00 → 6:00 PM, 00:30 → 12:30 AM)", () => {
  assert.equal(f12("18:00"), "6:00 PM");
  assert.equal(f12("00:30"), "12:30 AM");
  assert.equal(f12("12:00"), "12:00 PM");
});

test("hour hand angles (AN1-001 / 003 / 005 / 007 / 009) and minute hand", () => {
  const at = (h: number, m: number) => buildClock(base({ now: h + m / 60 }));
  assert.equal(at(15, 15).handDeg, 97.5);
  assert.equal(at(15, 15).minDeg, 90);
  assert.equal(at(12, 0).handDeg, 0);
  assert.equal(at(21, 45).handDeg, 292.5);
  assert.equal(at(21, 45).minDeg, 270);
  assert.equal(at(17, 30).handDeg, 165);
  // True 24-hour face: one turn a day (AN1-011).
  assert.equal(buildClock(base({ now: 9.75, is24: true, blend: 1 })).handDeg, 146.25);
});

test("12-hour face: 60 ticks, 12 numbers, cardinals 17/800; 24-hour: 48 ticks, cardinals 16", () => {
  const m = buildClock(base({}));
  assert.equal(m.ticks.length, 60);
  assert.deepEqual(m.nums.map((n) => n.t), ["12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11"]);
  assert.equal(m.nums[0].fs, 17);
  assert.equal(m.nums[1].fs, 11.5);
  const d = buildClock(base({ is24: true, blend: 1 }));
  assert.equal(d.ticks.length, 48);
  assert.equal(d.nums[3].t, "6");
  assert.equal(d.nums[3].fs, 16);
  assert.equal(d.half, false);
  assert.equal(d.halfNote, "Now · 00:00 to 24:00");
});

test("bezel main 3 (D-BU4-5), clear zone 63, lanes 92 / 81 / 70", () => {
  const m = buildClock(base({ items: [item("a", "18:00", "19:00", "Spin 45")] }));
  assert.equal(m.bzW, 3);
  assert.equal(m.bzR, 141.9);
  assert.equal(m.czU, 63);
  assert.deepEqual(m.lanes, [92]);
});

test("1 live: readout, ring, summary, panel row (AN1-034)", () => {
  const items = [item("a", "06:30", "07:30", "Morning Mobility", 12, 12), item("b", "18:00", "19:00", "Spin 45", 18, 20), item("c", "19:30", "20:30", "Strength Basics", 6, 14)];
  const m = buildClock(base({ items }));
  assert.equal(m.live, true);
  assert.equal(m.layers[0].lines.map((l) => l.t).join(" "), "Spin 45");
  assert.equal(m.layers[0].sub, "18 / 20 booked");
  assert.equal(m.summary, "1 class left today · 6 of 14 booked");
  assert.equal(m.rows[0].st, "In progress");
  assert.equal(m.rows[0].when, "6:00 PM to 7:00 PM · Class with John");
  assert.equal(m.rows[0].bk, "18 of 20 booked");
  assert.equal(m.indicator.kind, "none");
  assert.equal(m.halfNote, "Now · noon to midnight");
});

test("2 live: c. Arc indicator with 2 segments; over 8 live: the counter", () => {
  const two = buildClock(base({ items: [item("a", "18:00", "19:00", "Spin 45"), item("b", "18:00", "19:15", "Open gym induction")] }));
  assert.equal(two.indicator.kind, "arc");
  assert.equal(two.indicator.kind === "arc" && two.indicator.segs.length, 2);
  assert.equal(two.panelHead, "2 at the same time");
  const many = Array.from({ length: 12 }, (_, i) => item(`k${i}`, "18:00", "19:00", `Class ${i}`));
  const m = buildClock(base({ items: many }));
  assert.equal(m.indicator.kind, "count");
  // Only 3 lanes: the rest become one "+9" tab.
  assert.equal(m.badges.length, 1);
  assert.equal(m.badges[0].t, "+9");
});

test("nothing live: next up, all finished, nothing scheduled (AN1-052 / 163 / 060)", () => {
  const items = [item("a", "18:00", "19:00", "Yoga Flow")];
  assert.equal(buildClock(base({ items, now: 17 + 40 / 60 })).layers[0].sub, "Next · in 20 min");
  const done = buildClock(base({ items, now: 23 + 50 / 60 }));
  assert.equal(done.layers[0].lines.map((l) => l.t).join(" "), "All finished");
  assert.equal(done.layers[0].sub, "1 today");
  const none = buildClock(base({ items: [], isEmpty: true }));
  assert.equal(none.layers[0].lines.map((l) => l.t).join(" "), "Nothing scheduled");
  assert.equal(none.summary, "Create a class and it appears on the dial.");
});

test("half-day view: AM while PM is now, count of the other half, hand hidden (AN1-139)", () => {
  const items = [item("a", "07:00", "08:00", "Morning"), item("b", "18:00", "19:00", "Spin")];
  const m = buildClock(base({ items, halfPM: false }));
  assert.equal(m.halfNote, "Viewing · midnight to noon");
  assert.equal(m.otherHalf, 1);
  assert.equal(m.showHand, false);
  assert.equal(m.arcs.length, 1);
});

test("headline size formula (AN1-034 #9b)", () => {
  assert.equal(headlineSize("128"), 36);
  assert.equal(headlineSize("1,234"), 36);
  assert.equal(headlineSize("12345"), 33);
  assert.equal(headlineSize("–"), 36);
});

const raw = (over: Partial<OvRaw>): OvRaw => ({
  business: { id: "b", type: "gym", active: true, createdAt: "2026-01-01T00:00:00Z" },
  classes: [],
  anyClass: false,
  nextClass: null,
  firstClassDate: null,
  bookings: [],
  members: [],
  productsCount: 0,
  discountsCount: 0,
  team: {},
  eventsToday: [],
  reviews: null,
  ...over,
});

test("new business: four '–' cells (AN1-061)", () => {
  const cells = headline("gym", raw({}), { from: "2026-09-17", to: "2026-10-14", compare: true }, "2026-10-14");
  assert.deepEqual(
    cells.map((c) => [c.label, c.value, c.delta]),
    [
      ["Active members", "–", "No data yet"],
      ["Booked spots", "–", "No data yet"],
      ["Class fill rate", "–", "No classes yet"],
      ["Net members", "–", "No data yet"],
    ],
  );
});

test("fill rate, booked spots and net members from rows", () => {
  const classes = [
    { id: "k1", title: "Spin", date: "2026-10-01", start: "18:00", end: "19:00", cap: 10, professionalId: null },
    { id: "k0", title: "Spin", date: "2026-09-01", start: "18:00", end: "19:00", cap: 10, professionalId: null },
  ];
  const bookings = [
    ...Array.from({ length: 8 }, (_, i) => ({ classId: "k1", clientId: `c${i}`, createdAt: "2026-09-30T10:00:00Z", paymentStatus: null, priceAgreed: null })),
    ...Array.from({ length: 4 }, (_, i) => ({ classId: "k0", clientId: `c${i}`, createdAt: "2026-08-30T10:00:00Z", paymentStatus: null, priceAgreed: null })),
  ];
  const members = [
    { accepted: true, invitedAt: "2026-08-01T10:00:00Z", respondedAt: "2026-08-01T10:00:00Z", endedAt: null },
    { accepted: true, invitedAt: "2026-10-02T10:00:00Z", respondedAt: "2026-10-02T10:00:00Z", endedAt: null },
  ];
  const cells = headline("classes", raw({ classes, bookings, members, anyClass: true, firstClassDate: "2026-08-01" }), { from: "2026-09-17", to: "2026-10-14", compare: true }, "2026-10-14");
  assert.equal(cells[0].value, "2");
  assert.equal(cells[0].delta, "+1 vs prev.");
  assert.equal(cells[1].value, "8");
  assert.equal(cells[1].delta, "+100% vs prev.");
  assert.equal(cells[2].value, "80%");
  assert.equal(cells[2].delta, "+40 pts vs prev.");
  assert.equal(cells[3].value, "+1");
  assert.equal(cells[3].delta, "1 joined, 0 ended");
});

test("client outcomes: 21-day rule and payment owed, masked", () => {
  const classes = [
    { id: "old", title: "Spin", date: "2026-09-01", start: "18:00", end: "19:00", cap: 10, professionalId: null },
    { id: "new", title: "Spin", date: "2026-10-10", start: "18:00", end: "19:00", cap: 10, professionalId: null },
  ];
  const bookings = [
    { classId: "old", clientId: "aaaa1111-0000", createdAt: "x", paymentStatus: null, priceAgreed: null },
    { classId: "new", clientId: "bbbb2222-0000", createdAt: "x", paymentStatus: "pending", priceAgreed: 15 },
    // M4: pending with no price agreed (or a free class) is not money owed, as Revenue says.
    { classId: "new", clientId: "cccc3333-0000", createdAt: "x", paymentStatus: "pending", priceAgreed: null },
    { classId: "new", clientId: "dddd4444-0000", createdAt: "x", paymentStatus: "pending", priceAgreed: 0 },
  ];
  const m = outcomes(raw({ classes, bookings, firstClassDate: "2026-09-01", anyClass: true }), { from: "2026-09-17", to: "2026-10-14", compare: true }, "2026-10-14");
  assert.equal(m.needCheckIn, 1);
  assert.deepEqual(
    m.review.map((r) => [r.label, r.detail, r.pill.text]),
    [
      ["Client #BBBB", "Payment owed", "Payment"],
      ["Client #AAAA", "No booking in 21 days", "Check in"],
    ],
  );
});

test("client outcomes and Revenue agree on money owed (M4)", () => {
  const classes = [{ id: "k", title: "Flow", date: "2026-10-10", start: "18:00", end: "19:00", cap: 10, professionalId: null }];
  const bookings = [
    { classId: "k", clientId: "aaaa0000-1", createdAt: "x", paymentStatus: "pending", priceAgreed: null },
    { classId: "k", clientId: "bbbb0000-1", createdAt: "x", paymentStatus: "pending", priceAgreed: 0 },
    { classId: "k", clientId: "cccc0000-1", createdAt: "x", paymentStatus: "paid", priceAgreed: 15 },
  ];
  const m = outcomes(raw({ classes, bookings, firstClassDate: "2026-10-10", anyClass: true }), { from: "2026-10-01", to: "2026-10-14", compare: true }, "2026-10-14");
  assert.deepEqual(m.review, []);
  const recs = bookings.map((b, i): PaymentRecord => ({
    key: `class:${i}`, kind: "class", id: String(i), gymId: null, amount: b.priceAgreed, status: b.paymentStatus as PaymentRecord["status"], method: "cash",
    paidAt: null, paidUndated: false, createdAt: "x", dueOn: "2026-10-10", who: null, isMinor: false, item: "Flow", membershipStatus: null, startedOn: null, expiresOn: null,
  }));
  assert.equal(owed(recs, "2026-10-14").length, 0);
});

const pay = (o: Partial<PaymentRecord>): PaymentRecord => ({
  key: `class:${Math.random()}`, kind: "class", id: "x", gymId: null, amount: 20, status: "paid", method: "cash", paidAt: null, paidUndated: false,
  createdAt: "2026-09-01T09:00:00", dueOn: null, who: null, isMinor: false, item: "Spin", membershipStatus: null, startedOn: null, expiresOn: null, ...o,
});

test("revenue insight reads recorded payments like the Revenue page (M1)", () => {
  const range = { from: "2026-09-17", to: "2026-10-14", compare: true };
  const today = "2026-10-14";
  // Nothing loaded / nothing paid: the drawn empty state.
  assert.equal(revenueInsight(null).sub, "No transactions yet.");
  assert.deepEqual(insights(raw({}), { records: [pay({ status: "pending", amount: 15 })], range, today })[1], { key: "revenue", value: "–", delta: "", sub: "No transactions yet.", up: false });
  // Paid in range and in the period before (first payment over 4 weeks ago): total and delta.
  const recs = [
    pay({ amount: 30, paidAt: "2026-10-02T10:00:00" }),
    pay({ amount: 20, paidAt: "2026-10-12T10:00:00" }),
    pay({ amount: 40, paidAt: "2026-08-25T10:00:00" }),
    pay({ amount: 99, status: "pending" }),
  ];
  assert.deepEqual(revenueInsight({ records: recs, range, today }), { key: "revenue", value: "$50", delta: "+25%", sub: "Collected this period", up: true });
  // A membership marked paid without a readable date: $0 in the period, named as not counted yet.
  const und = [pay({ kind: "membership", amount: 45, paidUndated: true, membershipStatus: "active" })];
  assert.deepEqual(revenueInsight({ records: und, range, today }), { key: "revenue", value: "$0", delta: "", sub: "Collected this period. $45 not counted yet.", up: false });
  // Early (first payment under 4 weeks ago): no delta, as the Revenue page.
  assert.equal(revenueInsight({ records: [pay({ amount: 10, paidAt: "2026-10-01T10:00:00" })], range, today }).delta, "");
});

test("client outcomes: the DI-07 share count leads the empty body, never below the threshold as figures", () => {
  const need = "Outcomes appear once 5 or more clients choose to share their progress with you.";
  assert.equal(shareBody(null), need);
  assert.equal(shareBody(0), need);
  assert.equal(shareBody(1), "1 client shares their progress with you so far. " + need);
  assert.equal(shareBody(3), "3 clients share their progress with you so far. " + need);
  assert.equal(shareBody(7), "7 clients share their progress with you. Their group outcomes are coming soon.");
});
