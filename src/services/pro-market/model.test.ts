import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  aboutRows,
  EMPTY_SUB,
  formatOfLocation,
  initials,
  LAST_30,
  locationOfFormat,
  overviewView,
  parseProOverview,
  planMeta,
  QUIET,
  ratingLine,
  serviceCards,
  servicesHeader,
  visibleFrom,
  weeklyHours,
  withoutPending,
  type PlanService,
  type SessionService,
} from "./model.ts";

const ROW = {
  clients_reached: 1240,
  clients_reached_delta_pct: 9,
  sparkline: [
    { date: "2026-10-02", value: 30 },
    { date: "2026-10-01", value: 10 },
  ],
  active_offers: 2,
  redemptions_this_month: 14,
  points_redeemed: 9800,
  active_clients: 18,
  gyms_working_with: 1,
  marketplace_visible: true,
};

test("parseProOverview reads the DB5 row, sorts the sparkline by date and keeps unsaid fields null", () => {
  const v = parseProOverview([ROW])!;
  assert.equal(v.clientsReached, 1240);
  assert.deepEqual(v.sparkline, [10, 30]);
  assert.equal(v.activeOffersDelta, null);
  assert.equal(v.marketplaceVisible, true);
  assert.equal(parseProOverview({ ...ROW, marketplace_visible: undefined, active_offers: "3" })?.activeOffers, 3);
  const { marketplace_visible: _drop, ...noFlag } = ROW;
  void _drop;
  assert.equal(parseProOverview(noFlag)?.marketplaceVisible, null);
  assert.equal(parseProOverview([]), null);
  assert.equal(parseProOverview(null), null);
  assert.deepEqual(parseProOverview({ ...ROW, sparkline: [1, 2, "x", 3] })?.sparkline, [1, 2, 3]);
});

test("overviewView: answered figures (ovVisible)", () => {
  const v = overviewView({ status: "ok", value: parseProOverview({ ...ROW, active_offers_delta: 1, redemptions_delta_pct: -3 }) }, 4);
  assert.equal(v.empty, false);
  assert.deepEqual(v.hero, { value: "1,240", delta: "+9% vs last month", sub: LAST_30, series: [10, 30] });
  assert.deepEqual(
    v.rows.map((r) => [r.label, r.value, r.delta, !!r.leaf]),
    [
      ["Active offers", "2", "+1", false],
      ["Redemptions this month", "14", "−3%", false],
      ["Points redeemed", "9,800", QUIET, true],
      ["Active clients", "18", QUIET, false],
      ["Gyms working with", "1", QUIET, false],
    ]
  );
});

test("overviewView: nobody reached yet is ovEmpty (zeros, no change, the empty line, no series)", () => {
  const v = overviewView({ status: "ok", value: parseProOverview({ ...ROW, clients_reached: 0, clients_reached_delta_pct: 0, active_offers: 0, active_offers_delta: 0, sparkline: [] }) }, 0);
  assert.equal(v.empty, true);
  assert.deepEqual(v.hero, { value: "0", delta: null, sub: EMPTY_SUB, series: null });
  assert.ok(v.rows.every((r) => r.delta === QUIET));
  assert.equal(v.rows[0].value, "0");
});

test("overviewView: pending, error, loading and an empty answer are quiet; Active clients comes from the live roster", () => {
  for (const s of [{ status: "pending" }, { status: "error" }, { status: "loading" }, { status: "ok", value: null }] as const) {
    const v = overviewView(s, 3);
    assert.deepEqual(v.hero, { value: QUIET, delta: null, sub: null, series: null });
    assert.deepEqual(
      v.rows.map((r) => r.value),
      [QUIET, QUIET, QUIET, "3", QUIET]
    );
    assert.ok(v.rows.every((r) => r.delta === QUIET));
  }
  assert.equal(overviewView({ status: "pending" }, null).rows[3].value, QUIET);
});

test("visibleFrom: visible unless the overview says hidden (D-19)", () => {
  assert.equal(visibleFrom({ status: "pending" }), true);
  assert.equal(visibleFrom({ status: "ok", value: parseProOverview(ROW) }), true);
  assert.equal(visibleFrom({ status: "ok", value: parseProOverview({ ...ROW, marketplace_visible: false }) }), false);
});

const S = (o: Partial<SessionService>): SessionService => ({ id: "s", name: "1:1 strength session", description: null, durationMin: 60, price: 35, currency: "USD", bufferMin: 0, colour: null, locationKind: "in_person", createdAt: "2026-01-01", ...o });
const P = (o: Partial<PlanService>): PlanService => ({ id: "p", name: "4-session pack", price: 120, billing: "monthly", features: [], active: true, position: 0, sessionCount: 4, createdAt: "2026-01-01", ...o });

test("serviceCards: sessions by creation then plans by position; live lines and prices; a plan not offered is dimmed", () => {
  const cards = serviceCards(
    [S({ id: "b", createdAt: "2026-02-01", locationKind: null }), S({ id: "a", description: " Technique. ", locationKind: "online", price: 0 })],
    [P({ id: "y", position: 1, active: false, sessionCount: null, features: ["Weekly plan", " ", "Check-ins"] }), P({ id: "x", position: 0 })]
  );
  assert.deepEqual(
    cards.map((c) => c.key),
    ["session:a", "session:b", "plan:x", "plan:y"]
  );
  assert.equal(cards[0].meta, "60 min · Online");
  assert.equal(cards[0].description, "Technique.");
  assert.equal(cards[0].price, "Free");
  assert.equal(cards[1].meta, "60 min · In person or online");
  assert.equal(cards[1].price, "$35");
  assert.equal(cards[2].meta, "4 sessions · Monthly");
  assert.equal(cards[2].price, "$120/mo");
  assert.equal(cards[2].dim, false);
  assert.equal(cards[3].dim, true);
  assert.equal(cards[3].chip, "Not offered");
  assert.equal(cards[3].description, "Weekly plan · Check-ins");
  assert.equal(cards[3].meta, "Monthly");
});

test("headers, plan meta and format mapping", () => {
  assert.equal(servicesHeader(5), "5 services");
  assert.equal(servicesHeader(1), "1 service");
  assert.equal(planMeta(1, "annually"), "1 session · Yearly");
  assert.equal(planMeta(null, "weird"), "");
  assert.equal(formatOfLocation(null), "both");
  assert.equal(formatOfLocation("phone"), null);
  assert.equal(locationOfFormat("both", "in_person"), null);
  assert.equal(locationOfFormat(null, "phone"), "phone");
  assert.equal(locationOfFormat("online", null), "online");
});

test("aboutRows: credentials with their status and renewal, languages, and the contact line", () => {
  const lic = (o: Partial<{ id: string; name: string | null; expires: string | null; noExpiry: boolean; documentPath: string | null; showWhenExpired: boolean }>) => ({ id: "l", name: "First aid and CPR", expires: null, noExpiry: true, documentPath: "doc", showWhenExpired: false, ...o });
  const reviews = [{ id: "r", licenceId: "l", documentPath: "doc", submittedAt: "2026-01-01", approvedAt: "2026-01-02", rejectedAt: null, rejectionReason: null }];
  const rows = aboutRows(
    [lic({ expires: "2027-05", noExpiry: false }), lic({ id: "m", name: "Level 2", documentPath: "x" }), lic({ id: "n", name: "Old", expires: "2020-01", noExpiry: false }), lic({ id: "o", name: "  " })],
    reviews,
    ["Arabic", " English "],
    "2026-10"
  );
  assert.deepEqual(rows[0], { title: "First aid and CPR", sub: "Credential · renews May 2027", value: "Verified", tone: "good" });
  assert.deepEqual(rows[1], { title: "Level 2", sub: "Credential", value: "In review", tone: "faint" });
  assert.deepEqual(rows[2], { title: "Arabic, English", sub: "Languages", value: "", tone: "faint" });
  assert.deepEqual(rows[3], { title: "Phone, email and social links", sub: "Share them in Messages if you choose", value: "Not shown", tone: "faint" });
  assert.equal(rows.length, 4);
  assert.equal(aboutRows([], [], [], "2026-10").length, 1);
});

test("ratingLine, initials", () => {
  assert.deepEqual(ratingLine(4.83, 38, "Hamra, Beirut"), { text: "4.8 · 38 reviews · Hamra, Beirut", star: true });
  assert.deepEqual(ratingLine(5, 2, null), { text: "2 reviews", star: false });
  assert.deepEqual(ratingLine(null, 0, " "), { text: "No reviews yet", star: false });
  assert.deepEqual(ratingLine(null, 1, "Beirut"), { text: "1 review · Beirut", star: false });
  assert.equal(initials("Rana Khoury"), "RK");
  assert.equal(initials("rana"), "R");
  assert.equal(initials(""), "");
});

test("weeklyHours: own practice rows, Monday first, sorted and de-duplicated; Off for empty days", () => {
  const fmt = (a: string, b: string) => `${a}-${b}`;
  const w = weeklyHours(
    [
      { weekday: 1, start: "17:00", end: "21:00", businessId: null },
      { weekday: 1, start: "07:00", end: "12:00", businessId: null },
      { weekday: 1, start: "07:00", end: "12:00", businessId: null },
      { weekday: 2, start: "08:00", end: "10:00", businessId: "biz" },
      { weekday: 7, start: "09:00", end: "13:00", businessId: null },
    ],
    fmt
  );
  assert.equal(w.length, 7);
  assert.deepEqual(w[0], { day: "Mon", hours: "07:00-12:00 · 17:00-21:00", off: false });
  assert.deepEqual(w[1], { day: "Tue", hours: "Off", off: true });
  assert.deepEqual(w[6], { day: "Sun", hours: "09:00-13:00", off: false });
});

test("withoutPending hides the cards waiting to be deleted", () => {
  const list = [{ key: "a" }, { key: "b" }];
  assert.deepEqual(withoutPending(list, new Set(["a"])), [{ key: "b" }]);
  assert.equal(withoutPending(list, new Set()), list);
});
