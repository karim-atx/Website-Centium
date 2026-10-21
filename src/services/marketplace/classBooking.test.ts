import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  bookingWindowLine,
  classErrorMessage,
  distanceText,
  instructorRole,
  isClassPolicyKind,
  levelLabel,
  sortClassPolicies,
  whatToBringLine,
} from "./classBooking";

test("classErrorMessage words the B9 refusals", () => {
  assert.equal(classErrorMessage("ATXE0", "that class was cancelled", "f"), "This class was cancelled by the venue.");
  assert.equal(
    classErrorMessage("ATXE2", "bookings for this class open 14 days before it starts", "f"),
    "Bookings for this class open 14 days before it starts."
  );
  assert.equal(classErrorMessage("ATXE2", "bookings for this class open 1 days before it starts", "f"), "Bookings for this class open 1 day before it starts.");
  assert.equal(classErrorMessage("ATXE2", "", "f"), "Bookings for this class aren't open yet.");
  assert.equal(classErrorMessage("ATXE3", "x", "f"), "Bookings for this class have closed.");
  assert.equal(classErrorMessage("ATXE4", "x", "f"), "Accept this venue's terms before booking.");
  assert.equal(classErrorMessage("ATXE5", "x", "f"), "The waitlist for this class is full.");
  assert.equal(classErrorMessage("ATXF6", "x", "f"), "No spots left on Centium for this class.");
});

test("classErrorMessage falls through to the stage 4 words and the fallback", () => {
  assert.equal(classErrorMessage("ATX88", "x", "f"), "That class just filled up.");
  assert.equal(classErrorMessage("ATXD9", "x", "f"), "f");
  assert.equal(classErrorMessage(undefined, "x", "f"), "f");
});

test("only the three booking kinds count, waiver first", () => {
  assert.equal(isClassPolicyKind("waiver"), true);
  assert.equal(isClassPolicyKind("house_rules"), true);
  assert.equal(isClassPolicyKind("returns"), false);
  assert.equal(isClassPolicyKind("appointment_waiver"), false);
  assert.deepEqual(
    sortClassPolicies([{ kind: "house_rules" as const }, { kind: "class_terms" as const }, { kind: "waiver" as const }]).map((d) => d.kind),
    ["waiver", "class_terms", "house_rules"]
  );
});

test("bookingWindowLine names the day before the window opens, the rule after", () => {
  const now = new Date("2026-10-15T09:00:00Z");
  assert.equal(bookingWindowLine({ bookingWindowDays: 14 }, "2026-10-20T09:00:00Z", now), "Bookings open 14 days ahead.");
  const far = bookingWindowLine({ bookingWindowDays: 14 }, "2026-11-12T12:00:00Z", now);
  assert.match(far, /^Bookings open \w{3} 29 Oct\.$/);
  assert.equal(bookingWindowLine({ bookingWindowDays: 1 }, null, now), "Bookings open 1 day ahead.");
});

test("level, what to bring, distance and role", () => {
  assert.equal(levelLabel("all_levels"), "All levels");
  assert.equal(levelLabel("advanced"), "Advanced");
  assert.equal(levelLabel(null), null);
  assert.equal(levelLabel("expert"), null);
  assert.equal(whatToBringLine(["Mat", " Water ", "", "Towel"]), "Mat · Water · Towel");
  assert.equal(whatToBringLine([]), null);
  assert.equal(whatToBringLine(null), null);
  assert.equal(distanceText(1.234), "1.2 km");
  assert.equal(distanceText(0.6), "0.6 km");
  assert.equal(distanceText(0), "0.0 km");
  assert.equal(distanceText(12.6), "13 km");
  assert.equal(distanceText(null), null);
  assert.equal(distanceText(Number.NaN), null);
  assert.equal(instructorRole("Yoga instructor", "Physiotherapist"), "Yoga instructor · Physiotherapist");
  assert.equal(instructorRole(null, "Personal Trainer"), "Personal Trainer");
  assert.equal(instructorRole("personal trainer", "Personal Trainer"), "personal trainer");
  assert.equal(instructorRole(" ", null), null);
});

test("a closed or paused business refuses class bookings and waitlists (ATXAB)", () => {
  assert.equal(
    classErrorMessage("ATXAB", "This business is closed and is not taking new activity. Existing records are unaffected.", "f"),
    "This business has closed and isn't taking class bookings."
  );
  assert.equal(
    classErrorMessage("ATXAB", "This business is paused and is not taking new activity. Existing records are unaffected.", "f"),
    "This business isn't taking class bookings right now."
  );
});
