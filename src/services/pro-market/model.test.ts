import { strict as assert } from "node:assert";
import { test } from "node:test";
import { THIS_MONTH } from "../business-market/overviewModel.ts";
import {
  aboutRows,
  EMPTY_SUB,
  formatOfLocation,
  initials,
  locationOfFormat,
  overviewView,
  parseProOverview,
  planMeta,
  QUIET,
  ratingLine,
  serviceCards,
  servicesHeader,
  planShowcaseById,
  visibleOf,
  weeklyHours,
  withoutPending,
  type PlanService,
  type SessionService,
} from "./model.ts";
import * as shelfModel from "./model.ts";

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
  assert.deepEqual(v.hero, { value: "1,240", delta: "+9% vs last month", sub: THIS_MONTH, series: [10, 30] });
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

test("overviewView: error, loading and an empty answer are quiet; Active clients comes from the live roster", () => {
  for (const s of [{ status: "error" }, { status: "loading" }, { status: "ok", value: null }] as const) {
    const v = overviewView(s, 3);
    assert.deepEqual(v.hero, { value: QUIET, delta: null, sub: null, series: null });
    assert.deepEqual(
      v.rows.map((r) => r.value),
      [QUIET, QUIET, QUIET, "3", QUIET]
    );
    assert.ok(v.rows.every((r) => r.delta === QUIET));
  }
  assert.equal(overviewView({ status: "error" }, null).rows[3].value, QUIET);
});

test("visibleOf: professional_overview's marketplace_visible; unknown until it answers (D-19)", () => {
  assert.equal(visibleOf({ status: "loading" }), null);
  assert.equal(visibleOf({ status: "error" }), null);
  assert.equal(visibleOf({ status: "ok", value: null }), null);
  assert.equal(visibleOf({ status: "ok", value: parseProOverview({ ...ROW, marketplace_visible: true }) }), true);
  assert.equal(visibleOf({ status: "ok", value: parseProOverview({ ...ROW, marketplace_visible: false }) }), false);
});

const S = (o: Partial<SessionService>): SessionService => ({ id: "s", name: "1:1 strength session", description: null, durationMin: 60, price: 35, currency: "USD", bufferMin: 0, colour: null, locationKind: "in_person", imageUrl: null, visible: true, createdAt: "2026-01-01", ...o });
const P = (o: Partial<PlanService>): PlanService => ({ id: "p", name: "4-session pack", price: 120, billing: "monthly", features: [], active: true, position: 0, sessionCount: 4, createdAt: "2026-01-01", description: null, imageUrl: null, visible: true, format: null, ...o });

test("DB3 showcase fields: hidden services dim with Hidden; Not offered wins; a plan's own description", () => {
  const cards = serviceCards(
    [S({ id: "s1", visible: false })],
    [P({ id: "p1", visible: false }), P({ id: "p2", position: 1, active: false, visible: false }), P({ id: "p3", position: 2, description: "Two sessions a week.", features: ["Ignored"] })]
  );
  assert.deepEqual(cards.map((c) => [c.key, c.dim, c.chip]), [
    ["session:s1", true, "Hidden"],
    ["plan:p1", true, "Hidden"],
    ["plan:p2", true, "Not offered"],
    ["plan:p3", false, null],
  ]);
  assert.equal(cards[3].description, "Two sessions a week.");
});

test("planShowcaseById: the four DB3 plan columns by id, defaults for blanks", () => {
  const m = planShowcaseById([
    { id: "a", description: "  Weekly check-ins ", image_url: "https://x/y.jpg", visible: false, format: "online" },
    { id: "b", description: null, image_url: " ", visible: true, format: "home_visit" },
    { description: "no id" },
  ]);
  assert.deepEqual(m.get("a"), { description: "Weekly check-ins", imageUrl: "https://x/y.jpg", visible: false, format: "online" });
  assert.deepEqual(m.get("b"), { description: null, imageUrl: null, visible: true, format: null });
  assert.equal(m.size, 2);
});

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

// ---------------------------------------------------------------------------
// DB3 wiring (Database 73ea87b): the professional's own shelf and D-19.

const shelfRow = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  title: `Item ${id}`,
  description: null,
  price: "80.00",
  image_url: null,
  format: "in_person",
  duration_label: "6 weeks",
  visible: true,
  hidden_at: null,
  sort: 0,
  created_at: "2026-10-01T10:00:00.000Z",
  ...over,
});

test("parseShelfRows: the columns, public_showcase's order (sort, then newest, then id)", () => {
  const list = shelfModel.parseShelfRows([
    shelfRow("c", { sort: 2 }),
    shelfRow("b", { sort: 0, created_at: "2026-10-01T10:00:00.000Z" }),
    shelfRow("a", { sort: 0, created_at: "2026-10-03T10:00:00.000Z", format: "nonsense", price: null, duration_label: "  " }),
    shelfRow("d", { sort: 0, created_at: "2026-10-01T10:00:00.000Z", visible: false, hidden_at: "2026-10-05T00:00:00Z" }),
    { title: "no id" },
  ]);
  assert.deepEqual(
    list.map((x) => x.id),
    ["a", "b", "d", "c"]
  );
  assert.equal(list[0].format, null);
  assert.equal(list[0].price, null);
  assert.equal(list[0].durationLabel, null);
  assert.equal(list[1].price, 80);
  assert.equal(list[2].visible, false);
  assert.equal(list[2].hiddenByCentium, true);
});

test("serviceCards: shelf first with its meta, price and chips; then sessions and plans", () => {
  const shelf = shelfModel.parseShelfRows([
    shelfRow("s1", { sort: 1, format: "online", duration_label: "8 weeks", price: "90" }),
    shelfRow("s2", { sort: 2, visible: false, price: null, format: null, duration_label: null }),
    shelfRow("s3", { sort: 3, hidden_at: "2026-10-05T00:00:00Z" }),
  ]);
  const cards = serviceCards([], [], shelf);
  assert.deepEqual(
    cards.map((c) => c.key),
    ["shelf:s1", "shelf:s2", "shelf:s3"]
  );
  assert.deepEqual([cards[0].meta, cards[0].price, cards[0].dim, cards[0].chip], ["8 weeks · Online", "$90", false, null]);
  assert.deepEqual([cards[1].meta, cards[1].price, cards[1].dim, cards[1].chip], ["", "", true, "Hidden"]);
  assert.deepEqual([cards[2].dim, cards[2].chip], [true, shelfModel.TAKEN_DOWN_CHIP]);
  assert.equal(serviceCards([], []).length, 0);
});

test("shelfMeta / shelfPrice", () => {
  assert.equal(shelfModel.shelfMeta("60 min", "in_person"), "60 min · In person");
  assert.equal(shelfModel.shelfMeta(null, "both"), "In person or online");
  assert.equal(shelfModel.shelfMeta(" 4 x 60 min ", null), "4 x 60 min");
  assert.equal(shelfModel.shelfPrice(null), "");
  assert.equal(shelfModel.shelfPrice(0), "Free");
  assert.equal(shelfModel.shelfPrice(12.5), "$12.50");
});

test("shelfMove: swaps with the neighbour in the shelf's order; null at either end", () => {
  const shelf = shelfModel.parseShelfRows([shelfRow("a", { sort: 1 }), shelfRow("b", { sort: 2 }), shelfRow("c", { sort: 3 })]);
  assert.deepEqual(shelfModel.shelfMove(shelf, "b", -1), ["b", "a", "c"]);
  assert.deepEqual(shelfModel.shelfMove(shelf, "b", 1), ["a", "c", "b"]);
  assert.equal(shelfModel.shelfMove(shelf, "a", -1), null);
  assert.equal(shelfModel.shelfMove(shelf, "c", 1), null);
  assert.equal(shelfModel.shelfMove(shelf, "zz", 1), null);
});

test("visibleRefusal: each set_marketplace_visible code has its own line; others none", () => {
  assert.match(shelfModel.visibleRefusal("ATXC6") ?? "", /licence or certificate is verified/);
  assert.match(shelfModel.visibleRefusal("ATX47") ?? "", /under 18/);
  assert.match(shelfModel.visibleRefusal("ATX48") ?? "", /date of birth/);
  assert.ok(shelfModel.visibleRefusal("ATX09"));
  assert.equal(shelfModel.visibleRefusal("42501"), null);
  assert.equal(shelfModel.visibleRefusal(undefined), null);
});

test("needsHideWarning: only a visible, unverified (or not yet known) professional turning it off", () => {
  assert.equal(shelfModel.needsHideWarning(true, false, false), true);
  assert.equal(shelfModel.needsHideWarning(true, false, null), true);
  assert.equal(shelfModel.needsHideWarning(true, false, true), false);
  assert.equal(shelfModel.needsHideWarning(false, true, false), false);
  assert.equal(shelfModel.needsHideWarning(false, false, false), false);
  assert.equal(shelfModel.needsHideWarning(true, true, false), false);
});
