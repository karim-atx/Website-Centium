import { test } from "node:test";
import assert from "node:assert/strict";
import {
  acceptBody,
  acceptRows,
  applicationMeta,
  attachableCredentials,
  availabilityLabel,
  calendarLine,
  clashBody,
  clashTime,
  classTicket,
  countLine,
  dayList,
  expiredBody,
  filterQueries,
  hiredStrip,
  hiredWorkStrip,
  inviteExpired,
  inviteRows,
  inviteTitle,
  mergeOpportunities,
  offerNote,
  offeredCount,
  offersSub,
  openingsSub,
  parseRate,
  payLine,
  postedLine,
  proposalHint,
  ratingDistance,
  roleLine,
  scheduleLine,
  sinceLine,
  workClassRow,
  workSub,
} from "./opportunitiesModel.ts";
import type { MyApplication, Opportunity, OpportunityExtras } from "./opportunitiesModel.ts";

// Local wall-clock instants, so the tests read the same in any time zone.
const at = (y: number, mo: number, d: number, h = 12, mi = 0) => new Date(y, mo - 1, d, h, mi).toISOString();
const NOW = new Date(2026, 9, 21, 12, 0); // Wed, Oct 21, 2026

const opp = (o: Record<string, unknown> = {}) =>
  ({
    id: "o1",
    type: "role",
    title: "Sunday Spin instructor",
    description: null,
    classSeriesIds: [],
    classSessionId: null,
    className: "Spin 45",
    startsAt: at(2026, 11, 1, 10),
    weekdays: [7],
    pay: 80,
    payUnit: "per_class",
    classesPerMonth: 4,
    allowPayProposals: false,
    requirements: [],
    positions: 1,
    status: "open",
    postedAt: at(2026, 10, 21, 9),
    closedAt: null,
    applicantCount: 0,
    newApplicantCount: 0,
    hiredName: null,
    hiredAt: null,
    hiredPath: null,
    businessId: "b1",
    businessName: "Gym A",
    businessRating: 4.8,
    distanceKm: 0.8,
    applied: false,
    ...o,
  }) as unknown as Opportunity & OpportunityExtras;

const app = (o: Record<string, unknown> = {}) =>
  ({ id: "a1", offerId: null, path: "opening", status: "APPLIED", businessId: "b1", businessName: "Gym A", title: "HIIT instructor", type: "role", pay: 70, payUnit: "per_class", classesPerMonth: 8, startsOn: null, note: null, createdAt: at(2026, 10, 12), ...o }) as unknown as MyApplication;

test("filter → the opportunities() calls: one per specialty, one type, the widest distance", () => {
  assert.deepEqual(filterQueries([]), [{ type: null, specialty: null, distanceKm: null }]);
  assert.deepEqual(filterQueries(["Cycling", "Within 5 km"]), [{ type: null, specialty: "Cycling", distanceKm: 5 }]);
  assert.deepEqual(filterQueries(["Class slot · one-off", "Within 2 km", "Within 10 km"]), [{ type: "class_slot", specialty: null, distanceKm: 10 }]);
  assert.deepEqual(filterQueries(["Role · ongoing", "Class slot · one-off"])[0].type, null);
  assert.deepEqual(
    filterQueries(["HIIT", "Boxing"]).map((q) => q.specialty),
    ["HIIT", "Boxing"]
  );
});

test("merged answers: once each, nearest / soonest first; one answer keeps the server order", () => {
  const a = opp({ id: "a", distanceKm: 3, startsAt: at(2026, 10, 25) });
  const b = opp({ id: "b", distanceKm: 1, startsAt: at(2026, 10, 24) });
  const c = opp({ id: "c", distanceKm: null, startsAt: null });
  assert.deepEqual(mergeOpportunities([[a, c, b]], "gyms").map((o) => o.id), ["a", "c", "b"]);
  assert.deepEqual(mergeOpportunities([[a, c], [b, a]], "gyms").map((o) => o.id), ["b", "a", "c"]);
  assert.deepEqual(mergeOpportunities([[a], [b]], "classes").map((o) => o.id), ["b", "a"]);
});

test("count line (op.count)", () => {
  assert.equal(countLine("gyms", 6, false), "6 openings near you · sorted by distance");
  assert.equal(countLine("gyms", 2, true), "2 openings · sorted by distance");
  assert.equal(countLine("gyms", 1, false), "1 opening near you · sorted by distance");
  assert.equal(countLine("classes", 4, false), "4 class slots near you · soonest first");
  assert.equal(countLine("gyms", 0, true), "0 openings");
  assert.equal(countLine("classes", 0, false), "0 class slots");
});

test("gym card rows: rating · distance, pay, schedule, posted", () => {
  assert.deepEqual(ratingDistance({ businessRating: 4.8, distanceKm: 0.8 }), { rating: "4.8", distance: "0.8 km" });
  assert.deepEqual(ratingDistance({ businessRating: null, distanceKm: 12.4 }), { rating: null, distance: "12 km" });
  assert.equal(payLine({ pay: 80, payUnit: "per_class", allowPayProposals: false }), "$80 per class · set by the gym");
  assert.equal(payLine({ pay: 70, payUnit: "per_class", allowPayProposals: true }), "$70 per class · open to proposals");
  assert.equal(payLine({ pay: null, payUnit: "per_class", allowPayProposals: true }), "Open to proposals");
  assert.equal(scheduleLine(opp()), "Sun 10:00 AM · 4 classes a month");
  assert.equal(scheduleLine(opp({ weekdays: [4, 2], startsAt: at(2026, 10, 27, 19), classesPerMonth: 8 })), "Tue and Thu 7:00 PM · 8 classes a month");
  assert.equal(scheduleLine(opp({ type: "class_slot", startsAt: at(2026, 10, 24, 9) })), "Sat, Oct 24 · 9:00 AM");
  assert.equal(scheduleLine(opp({ weekdays: [], startsAt: null, classesPerMonth: null })), null);
  assert.equal(postedLine(at(2026, 10, 21, 8), 1, NOW), "Posted today · 1 position");
  assert.equal(postedLine(at(2026, 10, 20, 8), 2, NOW), "Posted yesterday · 2 positions");
  assert.equal(postedLine(at(2026, 10, 17, 8), 2, NOW), "Posted 4 days ago · 2 positions");
  assert.equal(postedLine(at(2026, 10, 2, 8), 1, NOW), "Posted Oct 2 · 1 position");
  assert.equal(dayList([1, 3, 5]), "Mon, Wed and Fri");
  assert.equal(dayList([7], true), "Sundays");
});

test("class ticket (classOpen): 12-hour time, place, slot line, pay stub; undocumented fields only when sent", () => {
  const t = classTicket(opp({ type: "class_slot", title: "Saturday Spin cover", startsAt: at(2026, 10, 24, 9), pay: 60, payUnit: "per_slot" }));
  assert.deepEqual(t.time, { time: "9:00", meridiem: "AM" });
  assert.equal(t.dur, null);
  assert.equal(t.eyebrow, "Spin 45");
  assert.equal(t.place, "Gym A · Sat, Oct 24");
  assert.equal(t.spots, "Class slot · one-off");
  assert.equal(t.pay, "$60");
  const u = classTicket(opp({ type: "class_slot", startsAt: at(2026, 10, 24, 19, 30), durationMin: 45, specialty: "Cycling", capacity: 20 }));
  assert.deepEqual(u.time, { time: "7:30", meridiem: "PM" });
  assert.equal(u.dur, "45 min");
  assert.equal(u.eyebrow, "Cycling");
  assert.equal(u.spots, "Class slot · 20 spots · one-off");
});

test("apply sheet: availability, proposal hint, rate", () => {
  assert.equal(availabilityLabel(opp()), "I'm available Sundays at 10:00 AM");
  assert.equal(availabilityLabel(opp({ weekdays: [6, 7], startsAt: at(2026, 10, 24, 9) })), "I'm available Sat and Sun at 9:00 AM");
  assert.equal(availabilityLabel(opp({ type: "class_slot", startsAt: at(2026, 10, 24, 9) })), "I'm available Sat, Oct 24 at 9:00 AM");
  assert.equal(availabilityLabel(opp({ weekdays: [], startsAt: null })), "I'm available for this schedule");
  assert.equal(proposalHint({ pay: 70, payUnit: "per_class" }), "This gym takes proposals. Their posted pay is $70 per class.");
  assert.equal(parseRate("75"), 75);
  assert.equal(parseRate("$37.50"), 37.5);
  assert.equal(parseRate("0"), null);
  assert.equal(parseRate("7.555"), null);
  assert.equal(parseRate("abc"), null);
  assert.deepEqual(
    attachableCredentials(
      [
        { id: "l1", name: "Level 2 Indoor Cycling", expires: "2027-01", noExpiry: false, showWhenExpired: false },
        { id: "l2", name: "Old cert", expires: "2025-01", noExpiry: false, showWhenExpired: false },
        { id: "l3", name: "First aid", expires: "2025-01", noExpiry: false, showWhenExpired: true },
        { id: "l4", name: "  ", expires: null, noExpiry: true, showWhenExpired: false },
      ],
      "2026-10"
    ),
    [
      { id: "l1", label: "Level 2 Indoor Cycling" },
      { id: "l3", label: "First aid" },
    ]
  );
});

test("my applications: meta per status and path, note, badge count", () => {
  assert.equal(roleLine(app()), "HIIT instructor · Role");
  assert.equal(applicationMeta(app(), NOW), "Applied Oct 12 · $70 per class");
  assert.equal(applicationMeta(app({ createdAt: at(2026, 10, 21, 8) }), NOW), "Applied today · $70 per class");
  assert.equal(applicationMeta(app({ type: "class_slot", startsOn: "2026-10-25", pay: 45, payUnit: "per_slot" }), NOW), "Applied Oct 12 · Sun, Oct 25 · $45 for the slot");
  assert.equal(applicationMeta(app({ status: "OFFERED" }), NOW), "Offer after your application · $70 per class");
  assert.equal(applicationMeta(app({ status: "OFFERED", path: "direct", startsOn: "2026-11-02" }), NOW), "Direct offer · $70 per class · from Mon, Nov 2");
  assert.equal(applicationMeta(app({ status: "HIRED", startsOn: "2026-11-02" }), NOW), "Hired · starts Mon, Nov 2");
  assert.equal(applicationMeta(app({ status: "HIRED", startsOn: "2026-03-02" }), NOW), "Hired · in My work");
  assert.equal(applicationMeta(app({ status: "DECLINED" }), NOW), "Applied Oct 12 · closed");
  assert.equal(offerNote(app({ status: "OFFERED", startsOn: "2026-11-01", classesPerMonth: 4, note: "Sundays at ten." })), "Starts Sun, Nov 1. 4 classes a month. Sundays at ten.");
  assert.equal(offeredCount([app({ status: "OFFERED" }), app({ status: "APPLIED" }), app({ status: "OFFERED" })]), 2);
});

test("accept dialog, hired strip, clash copy", () => {
  assert.deepEqual(acceptRows(app({ status: "OFFERED", startsOn: "2026-11-02" })), [
    ["Gym", "Gym A"],
    ["Role", "HIIT instructor"],
    ["Pay", "$70 per class"],
    ["Starts", "Mon, Nov 2, 2026"],
    ["Schedule", "8 classes a month"],
  ]);
  assert.equal(acceptBody("Gym A"), "Pay is arranged between you and Gym A. Centium charges you nothing.");
  assert.equal(hiredStrip({ businessName: "Gym A", title: "HIIT instructor" }), "You're hired · Gym A, HIIT instructor");
  assert.equal(clashBody({ businessName: "Gym A", title: "HIIT 30" }, 2), "HIIT 30 at Gym A clashes with 2 sessions you already have.");
  assert.equal(clashTime(at(2026, 11, 2, 7), at(2026, 11, 2, 8)), "Mon 7:00 to 8:00 AM");
  assert.equal(clashTime(at(2026, 11, 2, 11, 30), at(2026, 11, 2, 12, 15)), "Mon 11:30 AM to 12:15 PM");
});

test("my work: since, calendar link, class rows, pay", () => {
  const w = { type: "role", since: "2026-11-02", sessionsAWeek: 3 } as never;
  assert.equal(sinceLine(w, NOW), "Role · starts Mon, Nov 2");
  assert.equal(sinceLine({ type: "role", since: "2026-03-02" } as never, NOW), "Role · since Mar 2026");
  assert.equal(sinceLine({ type: "class_slot", since: "2026-10-24" } as never, NOW), "Class slot · Sat, Oct 24");
  assert.equal(calendarLine(w), "In your Calendar · 3 sessions a week");
  assert.equal(calendarLine({ type: "role", since: null, sessionsAWeek: 1 } as never), "In your Calendar · 1 session a week");
  assert.equal(calendarLine({ type: "class_slot", since: "2026-10-24", sessionsAWeek: 0 } as never), "In your Calendar · Sat, Oct 24");
  assert.deepEqual(workClassRow({ title: "HIIT 30", weekday: 1, startTime: "07:00:00", label: null }, w), { time: { time: "7:00", meridiem: "AM" }, day: "MON", title: "HIIT 30", sub: "Every Monday" });
  assert.deepEqual(workClassRow({ title: "Spin 45", weekday: null, startTime: "18:30", label: "One session only" }, { type: "class_slot", since: "2026-10-24" } as never), {
    time: { time: "6:30", meridiem: "PM" },
    day: "SAT",
    title: "Spin 45",
    sub: "One session only",
  });
  assert.equal(hiredWorkStrip("Gym A", "2026-11-02", NOW), "You're hired · Gym A starts Mon, Nov 2");
  assert.equal(hiredWorkStrip("Gym A", null, NOW), "You're hired · Gym A");
});

test("overview card subs (ov.links)", () => {
  assert.equal(offersSub([app({ status: "OFFERED", businessName: "Gym A" }), app({ status: "OFFERED", businessName: "Gym B" }), app()]), "2 waiting · Gym A, Gym B");
  assert.equal(offersSub([app()]), "None waiting");
  assert.equal(openingsSub(6), "6 roles and class slots");
  assert.equal(openingsSub(1), "1 role or class slot");
  assert.equal(openingsSub(0), "None near you right now");
  const w = (o: Record<string, unknown>) => ({ hireId: "h", businessId: "b1", businessName: "Gym A", roleTitle: "Spin instructor", type: "role", since: null, tag: "HIRED", classes: [], sessionsAWeek: 2, pay: 80, payUnit: "per_class", ...o }) as never;
  assert.equal(workSub([w({})]), "Gym A · 2 classes a week");
  assert.equal(workSub([w({}), w({ businessId: "b2", businessName: "Gym B", sessionsAWeek: 1 })]), "2 gyms · 3 classes a week");
  assert.equal(workSub([w({ type: "class_slot", sessionsAWeek: 0, roleTitle: "Saturday Spin cover" })]), "Gym A · Saturday Spin cover");
  assert.equal(workSub([]), "When a gym hires you, it shows here");
});

test("existing-team invite: rows, expiry, expired copy", () => {
  const inv = { id: "i1", businessId: "b1", businessName: "Gym A", name: null, professionalType: null, sentAt: at(2026, 10, 21), expiresAt: at(2026, 11, 14, 23, 59), acceptedAt: null };
  assert.equal(inviteTitle("Gym A"), "Join Gym A's team?");
  assert.deepEqual(inviteRows(inv), [
    ["Gym", "Gym A"],
    ["Hiring fee", "None"],
    ["Invited", "Oct 21, 2026"],
    ["Accept by", "Nov 14, 2026"],
  ]);
  assert.equal(inviteExpired(inv, NOW), false);
  assert.equal(inviteExpired(inv, new Date(2026, 10, 15)), true);
  assert.equal(inviteExpired({ expiresAt: null }, NOW), false);
  assert.equal(
    expiredBody(inv),
    "Gym A's free window to add their existing team closed on Nov 14, 2026. You can still work with them through an opening or a direct offer."
  );
});
