import { test } from "node:test";
import assert from "node:assert/strict";
import {
  bringList,
  busyDateOf,
  cancelBody,
  cancelledToast,
  classCoverPath,
  effectiveRules,
  hoursBefore,
  isoWeekday,
  minutesBefore,
  nextLine,
  policyFor,
  policyValueOk,
  refusalMessage,
  refusalOf,
  repeatLine,
  repeatsSentence,
  repeatSummary,
  seriesDates,
  seriesToast,
  toldTail,
  type BookingPolicy,
} from "./scheduleRules";

test("B9 refusal codes map to one meaning each", () => {
  assert.equal(refusalOf({ code: "ATXD9" }), "busy");
  assert.equal(refusalOf({ code: "ATXE0" }), "cancelled");
  assert.equal(refusalOf({ code: "ATXE1" }), "booked");
  assert.equal(refusalOf({ code: "ATX86" }), "started");
  assert.equal(refusalOf({ code: "ATX76" }), "not_team");
  assert.equal(refusalOf({ code: "ATX13" }), "capacity");
  assert.equal(refusalOf({ code: "ATX03" }), "denied");
  assert.equal(refusalOf({ code: "42501" }), "denied");
  assert.equal(refusalOf({ code: "ATX08" }), "gone");
  assert.equal(refusalOf({ code: "22023" }), "invalid");
  assert.equal(refusalOf({ code: "08006" }), "network");
  assert.equal(refusalOf(null), "network");
});

test("an ATXD9 names the date, never the place", () => {
  const e = { code: "ATXD9", message: "that instructor is already teaching at that time (2026-10-21)" };
  assert.equal(busyDateOf(e.message), "Wed, Oct 21");
  assert.equal(refusalMessage("save", e), "That instructor is already teaching at that time on Wed, Oct 21. Choose someone else or another time.");
  assert.equal(refusalMessage("cancel", { code: "ATXE0" }), "This class was cancelled, so it can't be changed.");
  assert.match(refusalMessage("delete", { code: "ATXE1" }, "clients"), /Cancel it instead and the booked clients are told\.$/);
  assert.equal(refusalMessage("cancel", { code: "08006" }), "Couldn't cancel the session. Check your connection and try again.");
  assert.equal(refusalMessage("move", { code: "22023" }), "Pick a time from now on, with the end after the start.");
});

test("series dates follow class_series_dates(): weeks from the Monday of the start week", () => {
  // 2026-10-07 is a Wednesday.
  assert.equal(isoWeekday("2026-10-07"), 3);
  assert.equal(isoWeekday("2026-10-11"), 7);
  const weekly = { weekdays: [3, 5], intervalWeeks: 1, startsOn: "2026-10-07", untilOn: null, count: null };
  assert.deepEqual(seriesDates(weekly, 4), ["2026-10-07", "2026-10-09", "2026-10-14", "2026-10-16"]);
  assert.equal(nextLine(weekly), "Wed, Oct 7 · Fri, Oct 9 · Wed, Oct 14");
  // Every 2 weeks on Tue from a Wednesday: the Tuesday of week 0 is before the start, so the next is week 2.
  const fortnight = { weekdays: [2], intervalWeeks: 2, startsOn: "2026-10-07", untilOn: null, count: 6 };
  assert.deepEqual(seriesDates(fortnight, 3), ["2026-10-20", "2026-11-03", "2026-11-17"]);
  // A count stops it; an end date stops it.
  assert.equal(seriesDates({ ...weekly, count: 3 }, 50).length, 3);
  assert.deepEqual(seriesDates({ ...weekly, untilOn: "2026-10-09" }, 50), ["2026-10-07", "2026-10-09"]);
  assert.deepEqual(seriesDates({ ...weekly, weekdays: [] }, 5), []);
});

test("the repeat words (AN3-043 / 045 / 047 / 048, OP1-083 row 6, OP1-085 row 5)", () => {
  const base = { weekdays: [2, 4], intervalWeeks: 1, untilOn: null, count: null };
  assert.equal(repeatSummary(base, "07:00"), "Every Tue and Thu at 7:00 AM");
  assert.equal(repeatSummary({ ...base, untilOn: "2026-11-30" }, "07:00"), "Every Tue and Thu at 7:00 AM, until Nov 30");
  assert.equal(repeatSummary({ ...base, count: 10 }, "07:00"), "Every Tue and Thu at 7:00 AM, 10 sessions");
  assert.equal(repeatSummary({ weekdays: [2], intervalWeeks: 2, untilOn: null, count: 6 }, "07:00"), "Every 2 weeks on Tue at 7:00 AM, 6 sessions");
  assert.equal(repeatSummary({ ...base, weekdays: [1, 2, 3, 4, 5, 6, 7] }, "07:00"), "Every day at 7:00 AM");
  assert.equal(repeatLine({ weekdays: [5, 1, 2, 3, 4], intervalWeeks: 1, untilOn: null }, "18:00"), "Every Mon, Tue, Wed, Thu, Fri at 6:00 PM");
  assert.equal(repeatsSentence({ weekdays: [1, 2, 3, 4, 5], intervalWeeks: 1 }, "18:00"), "This class repeats every weekday at 6:00 PM.");
  assert.equal(repeatsSentence({ weekdays: [2, 4], intervalWeeks: 1 }, "07:00"), "This class repeats every Tue and Thu at 7:00 AM.");
});

test("the series toast (AN3-055 row 4, O1 to O3)", () => {
  const r = { weekdays: [3, 5], intervalWeeks: 1, startsOn: "2026-10-07", untilOn: "2026-11-30", count: null };
  assert.equal(seriesToast(r, 12), "12 sessions created, every Wed and Fri until Nov 30");
  assert.equal(seriesToast({ ...r, untilOn: null, count: 10 }, 10), "10 sessions created, every Wed and Fri");
  assert.equal(seriesToast({ ...r, untilOn: null }, 24), "Weekly class created: every Wed and Fri from Wed, Oct 7");
  assert.equal(seriesToast({ ...r, intervalWeeks: 2, weekdays: [3] }, 4), "4 sessions created, every 2 weeks on Wed until Nov 30");
});

test("cancel and assign results (OP1-086 / 087 / 073)", () => {
  assert.equal(cancelBody(18, 0, 0, "members"), "18 booked members get a message and their bookings are released.");
  assert.equal(cancelBody(1, 2, 1, "clients"), "1 booked client gets a message and their bookings are released. 2 on the waitlist are told too. 1 paid booking stays paid. Record any refund in Revenue.");
  assert.equal(cancelBody(0, 0, 0, "clients"), "Nobody has booked yet.");
  assert.equal(cancelledToast("Spin 45", "today", 18, "members"), "Spin 45 today is cancelled. 18 members were told.");
  assert.equal(cancelledToast("Spin 45", "today", 0, "clients"), "Spin 45 today is cancelled.");
  assert.equal(toldTail(1, "clients"), " 1 client was told.");
  assert.equal(toldTail(0, "clients"), "");
});

test("booking rules: type, then default, then venue, then the fallback", () => {
  const row = (classType: string | null, p: Partial<BookingPolicy>): BookingPolicy => ({
    id: classType ?? "def",
    classType,
    cancellationHours: null,
    bookingWindowDays: null,
    closesMinutesBefore: null,
    defaultCapacity: null,
    waitlistCap: null,
    ...p,
  });
  const rows = [row(null, { cancellationHours: 24, waitlistCap: 0 }), row(" Yoga ", { cancellationHours: 6, waitlistCap: 10 })];
  assert.equal(policyFor(rows, "yoga")?.id, " Yoga ");
  assert.equal(policyFor(rows, null)?.id, "def");
  assert.deepEqual(effectiveRules(rows, "YOGA", 12), { cancellationHours: 6, bookingWindowDays: 14, closesMinutesBefore: 30, waitlistCap: 10, defaultCapacity: null });
  assert.equal(effectiveRules(rows, "Spin", 12).cancellationHours, 24);
  assert.equal(effectiveRules(rows, "Spin", 12).waitlistCap, 0);
  assert.equal(effectiveRules([], "Spin", 3).cancellationHours, 3);
  assert.equal(effectiveRules([], "Spin", null).cancellationHours, 12);
  assert.equal(policyValueOk("bookingWindowDays", 0), false);
  assert.equal(policyValueOk("closesMinutesBefore", 1440), true);
  assert.equal(policyValueOk("waitlistCap", 101), false);
  assert.equal(hoursBefore(1), "1 hour before");
  assert.equal(minutesBefore(30), "30 min before");
  assert.equal(minutesBefore(120), "2 hours before");
  assert.equal(minutesBefore(0), "At class time");
});

test("class details: what to bring and the cover path", () => {
  assert.deepEqual(bringList(["  Mat ", "mat", "", "Water"]), ["Mat", "Water"]);
  assert.equal(bringList(Array.from({ length: 14 }, (_, i) => `Item ${i}`)).length, 10);
  assert.equal(bringList(["x".repeat(80)])[0].length, 60);
  assert.equal(classCoverPath("u1", "b1", "f1"), "u1/b1/f1.jpg");
});
