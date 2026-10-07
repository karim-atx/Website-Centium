import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  consoleMessage,
  coverObjectPath,
  draftAsHoursRow,
  draftsFromRows,
  draftWrapsMidnight,
  hoursWritePlan,
  logoObjectPath,
  money,
  pageLine,
  passStateTag,
  pickVenue,
  replacedObject,
  reviewsLine,
  splitRoster,
  toHoursWrite,
  toMyVenue,
  toRosterEntry,
  toVenueDashboard,
  toVenueMember,
  totalOf,
  validateDrafts,
  type DayDraft,
  type GymHoursTableRow,
  type MyVenueRow,
  type VenueMemberRow,
} from "./consoleLogic.ts";
import { dayValue } from "./hours.ts";

const UID = "82d9bb42-ee5c-4055-90d3-824c7162af0b";
const GYM = "e1000000-0000-4000-8000-0000000000a1";

const venueRow = (over: Partial<MyVenueRow> = {}): MyVenueRow => ({
  gym_id: GYM,
  business_id: "e1000000-0000-4000-8000-0000000000b1",
  name: "Flex Gym",
  venue_kind: "gym",
  location: "Hamra, Beirut",
  logo_url: null,
  timezone: "Asia/Beirut",
  hidden_at: null,
  is_open_now: null,
  active_members: 2,
  memberships_awaiting_payment: 1,
  upcoming_classes: 3,
  reviews_count: 0,
  reviews_average: null,
  ...over,
});

test("toMyVenue: null average and null open-now stay null (not 0, not closed)", () => {
  const v = toMyVenue(venueRow());
  assert.equal(v.reviewsAverage, null);
  assert.equal(v.isOpenNow, null);
  assert.equal(v.hiddenAt, null);
  assert.equal(v.activeMembers, 2);
});

test("toMyVenue: numeric strings, hidden_at and a missing zone", () => {
  const v = toMyVenue(venueRow({ reviews_average: "4.0", hidden_at: "2026-10-01T10:00:00Z", timezone: null, is_open_now: false }));
  assert.equal(v.reviewsAverage, 4);
  assert.equal(v.hiddenAt, "2026-10-01T10:00:00Z");
  assert.equal(v.timezone, "Asia/Beirut");
  assert.equal(v.isOpenNow, false);
});

test("pickVenue: remembered id wins while it is listed, else the first", () => {
  const a = toMyVenue(venueRow());
  const b = toMyVenue(venueRow({ gym_id: "b", name: "Flex Studio" }));
  assert.equal(pickVenue([a, b], "b")?.gymId, "b");
  assert.equal(pickVenue([a, b], "gone")?.gymId, GYM);
  assert.equal(pickVenue([], "b"), null);
});

test("reviewsLine: null average is 'No reviews yet', never 0.0", () => {
  assert.equal(reviewsLine(null, 0), "No reviews yet");
  assert.equal(reviewsLine(4, 3), "4.0 (3 reviews)");
  assert.equal(reviewsLine(5, 1), "5.0 (1 review)");
});

test("toVenueDashboard: money as numbers, missing counts as 0", () => {
  const d = toVenueDashboard({
    gym_id: GYM,
    name: "Flex Gym",
    is_open_now: true,
    members_total: 2,
    active_members: 2,
    memberships_awaiting_payment: 1,
    amount_awaiting_payment: "15.00",
    amount_marked_paid_this_month: "135",
    classes_this_week: null,
    bookings_this_week: 2,
    waitlist_waiting: 2,
    cancellations_this_week: 0,
    reviews_count: 3,
    reviews_average: "4.0",
  });
  assert.equal(d.amountAwaitingPayment, 15);
  assert.equal(d.amountMarkedPaidThisMonth, 135);
  assert.equal(d.classesThisWeek, 0);
  assert.equal(money(d.amountAwaitingPayment), "$15");
  assert.equal(money(0), "$0");
});

const memberRow = (over: Partial<VenueMemberRow> = {}): VenueMemberRow => ({
  membership_id: "m1",
  member_first_name: "Rana",
  member_is_minor: false,
  plan_name: "Monthly",
  status: "active",
  payment_method: "cash",
  payment_status: "pending",
  price_agreed: "120",
  started_on: "2026-10-01",
  expires_on: "2026-11-01",
  pass_state: "awaiting_payment",
  joined_at: "2026-10-01T09:00:00Z",
  total_count: "3",
  ...over,
});

test("toVenueMember: carries a first name and a minor flag, nothing more", () => {
  const m = toVenueMember(memberRow({ member_is_minor: true }));
  assert.deepEqual(Object.keys(m).sort(), [
    "expiresOn",
    "firstName",
    "isMinor",
    "joinedAt",
    "membershipId",
    "passState",
    "paymentMethod",
    "paymentStatus",
    "planName",
    "priceAgreed",
    "startedOn",
    "status",
  ]);
  assert.equal(m.isMinor, true);
  assert.equal(m.priceAgreed, 120);
  assert.equal(toVenueMember(memberRow({ member_first_name: null })).firstName, "Member");
});

test("totalOf / pageLine: the unpaginated total rides on every row", () => {
  assert.equal(totalOf([memberRow(), memberRow()]), 3);
  assert.equal(totalOf([]), 0);
  assert.equal(pageLine(0, 50, 120), "1–50 of 120");
  assert.equal(pageLine(100, 20, 120), "101–120 of 120");
  assert.equal(pageLine(0, 0, 0), "");
});

test("passStateTag: the desk's wording for awaiting payment and valid", () => {
  assert.deepEqual(passStateTag("awaiting_payment"), { label: "Awaiting payment", tone: "pending" });
  assert.deepEqual(passStateTag("valid"), { label: "Valid", tone: "member" });
  assert.equal(passStateTag("expired").tone, "muted");
});

test("roster: mapping and the booked / waitlist split", () => {
  const entries = [
    toRosterEntry({ entry_kind: "booked", client_first_name: "Sam", client_is_minor: false, payment_method: "cash", payment_status: "pending", price_agreed: "20", at: "t1", waitlist_position: null }),
    toRosterEntry({ entry_kind: "waitlist", client_first_name: "Lea", client_is_minor: true, payment_method: null, payment_status: null, price_agreed: null, at: "t2", waitlist_position: 1 }),
    toRosterEntry({ entry_kind: "waitlist", client_first_name: null, client_is_minor: null, payment_method: null, payment_status: null, price_agreed: null, at: "t3", waitlist_position: 2 }),
  ];
  const { booked, waitlist } = splitRoster(entries);
  assert.equal(booked.length, 1);
  assert.equal(booked[0].priceAgreed, 20);
  assert.equal(waitlist.length, 2);
  assert.equal(waitlist[0].isMinor, true);
  assert.equal(waitlist[1].firstName, "Client");
  assert.equal(waitlist[1].isMinor, false);
});

// ---- hours editor

const tableRow = (weekday: number, over: Partial<GymHoursTableRow> = {}): GymHoursTableRow => ({
  id: `h${weekday}`,
  weekday,
  closed: false,
  open_24h: false,
  opens_at: "16:00:00",
  closes_at: "02:00:00",
  ...over,
});

// Flex Studio as seeded: Mon–Thu 16:00–02:00, Fri 24h, Sat 10–18, Sun closed.
const studio: GymHoursTableRow[] = [
  tableRow(1),
  tableRow(2),
  tableRow(3),
  tableRow(4),
  tableRow(5, { open_24h: true, opens_at: null, closes_at: null }),
  tableRow(6, { opens_at: "10:00:00", closes_at: "18:00:00" }),
  tableRow(7, { closed: true, opens_at: null, closes_at: null }),
];

test("draftsFromRows: seven days, the three shapes, missing days unset", () => {
  const d = draftsFromRows(studio);
  assert.equal(d.length, 7);
  assert.deepEqual(d.map((x) => x.shape), ["range", "range", "range", "range", "open24h", "range", "closed"]);
  assert.equal(d[0].opensAt, "16:00");
  assert.equal(d[0].closesAt, "02:00");
  const partial = draftsFromRows([tableRow(1)]);
  assert.equal(partial[6].shape, null);
});

test("wraps midnight: closes at or before opens, labelled by the venue page's helper", () => {
  const d = draftsFromRows(studio);
  assert.equal(draftWrapsMidnight(d[0]), true);
  assert.equal(draftWrapsMidnight(d[5]), false);
  assert.equal(dayValue(draftAsHoursRow(d[0])), "16:00 to 02:00 (next day)");
  assert.equal(dayValue(draftAsHoursRow(d[4])), "Open 24 hours");
  assert.equal(dayValue(draftAsHoursRow(d[6])), "Closed");
  assert.equal(dayValue(draftAsHoursRow({ weekday: 1, shape: null, opensAt: "", closesAt: "" })), "Not published");
});

test("validateDrafts: all seven must be set; a range needs two different times", () => {
  assert.deepEqual(validateDrafts(draftsFromRows(studio)), {});
  const d = draftsFromRows(studio);
  d[0] = { ...d[0], opensAt: "" };
  d[1] = { ...d[1], opensAt: "09:00", closesAt: "09:00" };
  d[2] = { ...d[2], shape: null };
  d[3] = { ...d[3], closesAt: "25:00" };
  const e = validateDrafts(d);
  assert.deepEqual(Object.keys(e).map(Number).sort(), [1, 2, 3, 4]);
  assert.match(e[2], /Open 24 hours/);
  // Only six days: the seventh is reported missing.
  assert.ok(validateDrafts(draftsFromRows(studio).slice(0, 6))[7]);
  // A duplicate weekday is refused.
  const dup: DayDraft[] = [...draftsFromRows(studio), { weekday: 1, shape: "closed", opensAt: "", closesAt: "" }];
  assert.ok(validateDrafts(dup)[1]);
});

test("toHoursWrite: exactly one shape per row, as the CHECK requires", () => {
  assert.deepEqual(toHoursWrite({ weekday: 7, shape: "closed", opensAt: "06:00", closesAt: "22:00" }), {
    weekday: 7,
    closed: true,
    open_24h: false,
    opens_at: null,
    closes_at: null,
  });
  assert.deepEqual(toHoursWrite({ weekday: 5, shape: "open24h", opensAt: "06:00", closesAt: "22:00" }), {
    weekday: 5,
    closed: false,
    open_24h: true,
    opens_at: null,
    closes_at: null,
  });
  assert.deepEqual(toHoursWrite({ weekday: 1, shape: "range", opensAt: "22:00", closesAt: "04:00" }), {
    weekday: 1,
    closed: false,
    open_24h: false,
    opens_at: "22:00",
    closes_at: "04:00",
  });
});

test("hoursWritePlan: update changed rows by id, insert missing days, skip the unchanged", () => {
  const drafts = draftsFromRows(studio);
  assert.deepEqual(hoursWritePlan(studio, drafts), { updates: [], inserts: [] });
  drafts[6] = { ...drafts[6], shape: "range", opensAt: "10:00", closesAt: "14:00" };
  const plan = hoursWritePlan(studio.slice(0, 6).concat(studio[6]), drafts);
  assert.equal(plan.updates.length, 1);
  assert.equal(plan.updates[0].id, "h7");
  assert.equal(plan.updates[0].row.opens_at, "10:00");
  // No gym_id anywhere in an update: it is outside the UPDATE grant.
  assert.equal("gym_id" in plan.updates[0].row, false);
  const fresh = hoursWritePlan(studio.slice(0, 5), draftsFromRows(studio));
  assert.deepEqual(fresh.inserts.map((r) => r.weekday), [6, 7]);
});

// ---- image paths

test("object paths start with the owner's uid (the purge registry keys on it)", () => {
  assert.equal(logoObjectPath(UID, "f1"), `${UID}/f1.jpg`);
  assert.equal(coverObjectPath(UID, GYM, "f2"), `${UID}/${GYM}/f2.jpg`);
  assert.equal(logoObjectPath(UID, "f1").split("/")[0], UID);
  assert.equal(coverObjectPath(UID, GYM, "f2").split("/")[0], UID);
});

test("replacedObject: only a valid path in the caller's own prefix, never the new one", () => {
  assert.equal(replacedObject(`${UID}/old.jpg`, UID, `${UID}/new.jpg`), `${UID}/old.jpg`);
  assert.equal(replacedObject(`${UID}/new.jpg`, UID, `${UID}/new.jpg`), null);
  assert.equal(replacedObject("someone-else/old.jpg", UID, `${UID}/new.jpg`), null);
  assert.equal(replacedObject("https://cdn.example/logo.png", UID, `${UID}/new.jpg`), null);
  assert.equal(replacedObject(`${UID}/../x.jpg`, UID, `${UID}/new.jpg`), null);
  assert.equal(replacedObject(null, UID, `${UID}/new.jpg`), null);
});

test("consoleMessage: the console's codes, then stage 4's, then the fallback", () => {
  assert.equal(consoleMessage("ATX03", "that venue is not yours", "x"), "You don't manage this venue.");
  assert.equal(consoleMessage("ATX08", "no such venue", "x"), "That venue or class couldn't be found.");
  assert.equal(consoleMessage("42501", "", "x"), "Only the venue's owner can change this.");
  assert.match(consoleMessage("23514", "", "x"), /closed, open 24 hours/);
  assert.equal(consoleMessage("ATX01", "", "x"), "Your session expired. Sign in again.");
  assert.equal(consoleMessage(undefined, "boom", "fallback"), "fallback");
});
