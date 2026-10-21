import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  ANY_AVAILABLE,
  apptChip,
  apptWords,
  bookErrorMessage,
  bookForErrorMessage,
  freeStretches,
  isUpcoming,
  minutesBetween,
  payWords,
  refreshesTimes,
  slotTimes,
  staffChoices,
  staffLabel,
  toDiaryAppt,
  toMyAppt,
  toService,
  toSlot,
  toStaffHours,
  waiverPending,
  type Slot,
} from "./model";

test("toService reads appointment_services (numeric price as a string)", () => {
  assert.deepEqual(toService({ id: "s1", name: "Sports massage", description: "  ", duration_min: 45, price: "35.00", active: true }), {
    id: "s1",
    name: "Sports massage",
    description: null,
    durationMin: 45,
    price: 35,
    active: true,
  });
  assert.equal(toService({ id: "s2", name: "x", duration_min: 30, price: 0, active: false }).active, false);
});

test("toDiaryAppt keeps the server's masked label and derives the duration", () => {
  const a = toDiaryAppt({
    appointment_id: "a1",
    starts_at: "2026-10-20T07:00:00+00:00",
    ends_at: "2026-10-20T07:45:00+00:00",
    status: "booked",
    service_name: "Sports massage",
    staff_id: "p1",
    staff_first_name: "Rana",
    client_id: "c1",
    client_label: "Member #0042",
    client_is_minor: false,
    price_agreed: "35.00",
    payment_status: "pending",
    gym_id: null,
  });
  assert.equal(a.id, "a1");
  assert.equal(a.clientLabel, "Member #0042");
  assert.equal(a.durationMin, 45);
  assert.equal(a.price, 35);
  assert.equal(a.paymentStatus, "pending");
  assert.equal(a.staffFirstName, "Rana");
  assert.equal(toDiaryAppt({ appointment_id: "a2", starts_at: "x", ends_at: "x", status: "weird", payment_status: "paid" }).status, "booked");
  assert.equal(toDiaryAppt({ appointment_id: "a2", starts_at: "x", ends_at: "x", payment_status: "paid" }).paymentStatus, "paid");
});

test("toMyAppt reads my_appointments with can_cancel", () => {
  const a = toMyAppt({
    appointment_id: "a1",
    business_id: "b1",
    business_name: "Calm Rooms",
    service_name: "Facial",
    starts_at: "2026-10-20T07:00:00Z",
    ends_at: "2026-10-20T08:00:00Z",
    status: "cancelled",
    price_agreed: 20,
    payment_status: "refunded",
    can_cancel: false,
  });
  assert.equal(a.durationMin, 60);
  assert.equal(a.status, "cancelled");
  assert.equal(a.paymentStatus, "refunded");
  assert.equal(a.canCancel, false);
  assert.equal(a.businessName, "Calm Rooms");
});

test("minutesBetween falls back to 60 on unreadable rows", () => {
  assert.equal(minutesBetween("2026-10-20T07:00:00Z", "2026-10-20T07:30:00Z"), 30);
  assert.equal(minutesBetween("nope", "nope"), 60);
});

test("isUpcoming: booked and not over", () => {
  const now = Date.parse("2026-10-20T07:30:00Z");
  assert.equal(isUpcoming({ status: "booked", endsAt: "2026-10-20T08:00:00Z" }, now), true);
  assert.equal(isUpcoming({ status: "booked", endsAt: "2026-10-20T07:00:00Z" }, now), false);
  assert.equal(isUpcoming({ status: "cancelled", endsAt: "2026-10-21T08:00:00Z" }, now), false);
});

const slot = (staffId: string, staffName: string | null, startsAt: string): Slot => ({ staffId, staffName, startsAt, endsAt: startsAt });

test("toSlot and staffLabel: a hidden professional is Any available", () => {
  const s = toSlot({ staff_id: "p1", staff_name: null, starts_at: "a", ends_at: "b" });
  assert.equal(s.staffName, null);
  assert.equal(staffLabel(s.staffName), ANY_AVAILABLE);
  assert.equal(staffLabel("Rana"), "Rana");
});

test("slotTimes keeps one slot per start time, in order", () => {
  const out = slotTimes([slot("p2", null, "2026-10-20T09:15:00Z"), slot("p1", "Rana", "2026-10-20T09:00:00Z"), slot("p2", null, "2026-10-20T09:00:00Z")]);
  assert.deepEqual(
    out.map((s) => s.startsAt),
    ["2026-10-20T09:00:00Z", "2026-10-20T09:15:00Z"]
  );
});

test("staffChoices: named people first, one Any available for the unlisted", () => {
  const t = "2026-10-20T09:00:00Z";
  const slots = [slot("p3", null, t), slot("p1", "Rana", t), slot("p2", "Ali", t), slot("p4", null, t), slot("p5", "Zed", "other")];
  assert.deepEqual(staffChoices(slots, t), [
    { staffId: "p2", label: "Ali" },
    { staffId: "p1", label: "Rana" },
    { staffId: "p3", label: ANY_AVAILABLE },
  ]);
  assert.deepEqual(staffChoices([slot("p3", null, t)], t), [{ staffId: "p3", label: ANY_AVAILABLE }]);
  assert.deepEqual(staffChoices(slots, "none"), []);
});

test("freeStretches merges overlapping and touching free spans after `from`", () => {
  const s = (a: string, b: string) => ({ startsAt: `2026-10-20T${a}:00.000Z`, endsAt: `2026-10-20T${b}:00.000Z` });
  const out = freeStretches([s("09:15", "10:15"), s("09:00", "10:00"), s("10:15", "11:15"), s("13:00", "14:00"), s("07:00", "08:00")], Date.parse("2026-10-20T08:30:00Z"));
  assert.deepEqual(out, [s("09:00", "11:15"), s("13:00", "14:00")]);
  assert.deepEqual(freeStretches([]), []);
});

test("toStaffHours keeps weekday 1 = Monday and trims the seconds", () => {
  assert.deepEqual(toStaffHours({ id: "h1", professional_id: "p1", weekday: 1, starts_at: "09:00:00", ends_at: "17:30:00" }), {
    id: "h1",
    staffId: "p1",
    weekday: 1,
    starts: "09:00",
    ends: "17:30",
  });
});

test("chips and words", () => {
  assert.deepEqual(apptChip("no_show"), { label: "No-show", tone: "warn" });
  assert.deepEqual(apptChip("completed"), { label: "Done", tone: "soft" });
  const now = Date.parse("2026-10-20T07:30:00Z");
  assert.equal(apptWords({ status: "no_show", startsAt: "2026-10-20T07:00:00Z" }, now).label, "Missed");
  assert.equal(apptWords({ status: "booked", startsAt: "2026-10-20T08:00:00Z" }, now).tone, "good");
  assert.equal(apptWords({ status: "booked", startsAt: "2026-10-20T07:00:00Z" }, now).tone, "soft");
  assert.equal(payWords("paid"), "Paid");
  assert.equal(payWords("refunded"), "Refunded");
  assert.equal(payWords("pending"), null);
});

test("bookForErrorMessage words the desk booking refusals", () => {
  assert.equal(bookForErrorMessage("ATX96", "", "f"), "You can book for your own clients only: people seen in the last 90 days.");
  assert.equal(bookForErrorMessage("ATXF2", "", "f"), "That time is outside their hours. Pick another.");
  assert.equal(bookForErrorMessage("ATXF3", "", "f"), "That time is no longer free. Pick another.");
  assert.equal(bookForErrorMessage("ATXF4", "", "f"), "That service isn't available. Check it's shown for booking.");
  assert.equal(bookForErrorMessage(undefined, "", "Couldn't add the appointment. Try again."), "Couldn't add the appointment. Try again.");
});

test("waiverPending mirrors book_appointment_for's waiver_pending", () => {
  const docs = [
    { id: "d1", kind: "appointment_waiver", currentVersion: 2 },
    { id: "d2", kind: "returns", currentVersion: 1 },
  ];
  const v = (id: string, version: number, published = true, requiresReacceptance = false) => ({ id, documentId: "d1", version, published, requiresReacceptance });
  assert.equal(waiverPending(docs, [v("v1", 1), v("v2", 2)], new Set()), true);
  assert.equal(waiverPending(docs, [v("v1", 1), v("v2", 2)], new Set(["v2"])), false);
  // An older acceptance stands unless the current version asks again.
  assert.equal(waiverPending(docs, [v("v1", 1), v("v2", 2)], new Set(["v1"])), false);
  assert.equal(waiverPending(docs, [v("v1", 1), v("v2", 2, true, true)], new Set(["v1"])), true);
  // An unpublished current version, or only other kinds: nothing pending.
  assert.equal(waiverPending(docs, [v("v2", 2, false)], new Set()), false);
  assert.equal(waiverPending([{ id: "d2", kind: "returns", currentVersion: 1 }], [], new Set()), false);
});

test("bookErrorMessage words the B12 refusals", () => {
  assert.equal(bookErrorMessage("ATXF2", "", "f"), "That time is outside their hours. Pick another.");
  assert.equal(bookErrorMessage("ATXF3", "", "f"), "That time was just booked. Pick another.");
  assert.equal(bookErrorMessage("ATXF4", "", "f"), "This service isn't available any more.");
  assert.equal(bookErrorMessage("ATXE2", "bookings open 14 days ahead", "f"), "Bookings open 14 days ahead.");
  assert.equal(bookErrorMessage("ATXE2", "bookings open 1 days ahead", "f"), "Bookings open 1 day ahead.");
  assert.equal(bookErrorMessage("ATXE2", "", "f"), "Bookings for that day aren't open yet.");
  assert.equal(bookErrorMessage("ATXE3", "", "f"), "Bookings for that time have closed. Pick a later one.");
  assert.equal(bookErrorMessage("ATXE4", "", "f"), "Accept this place's terms before booking.");
  assert.equal(bookErrorMessage(undefined, "", "Couldn't book. Try again."), "Couldn't book. Try again.");
  assert.equal(refreshesTimes("ATXF3"), true);
  assert.equal(refreshesTimes("ATXE4"), false);
});

test("a booking past midnight (ATXAA) reads the same for the client and the desk", () => {
  const words = "A session cannot run past midnight. Choose a start time that lets it finish on the same day, or book it as two sessions.";
  assert.equal(bookErrorMessage("ATXAA", "server text", "f"), words);
  assert.equal(bookForErrorMessage("ATXAA", "server text", "f"), words);
});

test("a closed or paused business (ATXAB) in the client's and the desk's words", () => {
  const closed = "This business is closed and is not taking new activity. Existing records are unaffected.";
  const paused = "This business is paused and is not taking new activity. Existing records are unaffected.";
  assert.equal(bookErrorMessage("ATXAB", closed, "f"), "This business has closed and isn't taking new bookings.");
  assert.equal(bookErrorMessage("ATXAB", paused, "f"), "This business isn't taking bookings right now.");
  assert.equal(bookForErrorMessage("ATXAB", closed, "f"), "This business is closed, so it can't take new appointments. Existing records are unaffected.");
  assert.equal(bookForErrorMessage("ATXAB", paused, "f"), "This business is deactivated, so it can't take new appointments until it's reactivated.");
});
