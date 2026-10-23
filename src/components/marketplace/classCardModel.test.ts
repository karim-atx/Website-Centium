import { test } from "node:test";
import assert from "node:assert/strict";
import {
  NOT_LISTED,
  classCardLines,
  doneBody,
  doneWhen,
  durationMinutes,
  durationText,
  farOff,
  longDate,
  paymentLine,
  seatLayout,
  seatTone,
  sheetPlace,
  sheetWhen,
  shortName,
} from "./classCardModel.ts";

const base = {
  date: "2026-10-23",
  startTime: "18:30:00",
  endTime: "19:15:00",
  title: "Spin 45",
  businessName: "Hamra Strength",
  venueName: "Hamra Strength Club",
  instructorName: "Rana Khoury",
  maxCapacity: 20,
  bookedCount: 14,
  spotsRemaining: 6,
  isFull: false,
  price: "$12",
  priceValue: 12,
};
const now = new Date(2026, 9, 22, 10);

test("duration: minutes always, wrapping past midnight, unknown is empty", () => {
  assert.equal(durationText("18:30", "19:15"), "45 min");
  assert.equal(durationText("12:30:00", "13:30:00"), "60 min");
  assert.equal(durationMinutes("23:30", "00:15"), 45);
  assert.equal(durationText("18:30", null), "");
  assert.equal(durationText("18:30", "18:30"), "");
});

test("short names", () => {
  assert.equal(shortName("Rana Khoury"), "Rana K.");
  assert.equal(shortName("Rana"), "Rana");
  assert.equal(shortName("  "), "");
  assert.equal(shortName("Lea de souza"), "Lea S.");
});

test("far off: 7 days or more from today", () => {
  assert.equal(farOff("2026-10-28", now), false);
  assert.equal(farOff("2026-10-29", now), true);
});

test("card lines: the board's class card", () => {
  const l = classCardLines(base, { booked: false, now });
  assert.deepEqual(l.time, { time: "6:30", meridiem: "PM" });
  assert.equal(l.dur, "45 min");
  assert.equal(l.sub, "Hamra Strength Club · Rana K.");
  assert.equal(l.booked, "14 of 20 booked");
  assert.equal(l.pct, 70);
  assert.equal(l.stub, "price");
  assert.equal(l.price, "$12");
  assert.equal(l.extra, null);
});

test("card lines: unlisted, free, gym tab, far date", () => {
  const l = classCardLines({ ...base, instructorName: null, venueName: null, priceValue: null, price: "", date: "2026-11-02" }, { booked: false, hideVenue: true, now });
  assert.equal(l.sub, NOT_LISTED);
  assert.equal(l.price, "Free");
  assert.equal(l.booked, "Nov 2 · 14 of 20 booked");
  assert.equal(classCardLines({ ...base, venueName: " " }, { booked: false, now }).sub, "Hamra Strength · Rana K.");
});

test("card lines: booked, full and the viewer's own limit", () => {
  assert.equal(classCardLines(base, { booked: true, now }).stub, "booked");
  const full = classCardLines({ ...base, spotsRemaining: 0, isFull: true }, { booked: false, now });
  assert.equal(full.stub, "full");
  assert.equal(full.extra, "Full");
  // Booked wins over full (the member holds a place).
  assert.equal(classCardLines({ ...base, spotsRemaining: 0, isFull: true }, { booked: true, now }).stub, "booked");
  // A non-member capped at 2 Centium spots while the class has 6 left.
  assert.equal(classCardLines({ ...base, spotsRemaining: 2 }, { booked: false, now }).extra, "2 spots left");
  assert.equal(classCardLines({ ...base, spotsRemaining: 1 }, { booked: false, now }).extra, "1 spot left");
  assert.equal(classCardLines({ ...base, maxCapacity: 0, bookedCount: 0, spotsRemaining: 0 }, { booked: false, now }).pct, 0);
});

test("seat panel tone: almost at 3 or fewer, full at none", () => {
  assert.equal(seatTone(6), "open");
  assert.equal(seatTone(4), "open");
  assert.equal(seatTone(3), "almost");
  assert.equal(seatTone(1), "almost");
  assert.equal(seatTone(0), "full");
});

test("seat layout: the board's seatCols and the bar past 36", () => {
  const a = seatLayout(20, 14);
  assert.equal(a.kind, "dots");
  assert.equal(a.cols, 10);
  assert.equal(a.seats.length, 20);
  assert.equal(a.seats.filter(Boolean).length, 14);
  assert.equal(a.seats[13], true);
  assert.equal(a.seats[14], false);
  assert.equal(seatLayout(12, 7).cols, 12);
  assert.equal(seatLayout(8, 1).cols, 8);
  assert.equal(seatLayout(36, 0).cols, 12);
  assert.equal(seatLayout(25, 0).cols, 9);
  const bar = seatLayout(40, 41);
  assert.equal(bar.kind, "bar");
  assert.equal(bar.seats.filter(Boolean).length, 40);
  assert.equal(seatLayout(0, 0).seats.length, 0);
});

test("dates and booking lines: month first, 12-hour", () => {
  assert.equal(longDate("2026-10-16"), "Friday, October 16");
  assert.equal(sheetWhen({ date: "2026-10-16", startTime: "18:30", endTime: "19:15" }), "Fri, Oct 16 · 6:30 PM · 45 min");
  assert.equal(doneWhen({ date: "2026-10-16", startTime: "18:30" }), "Fri, Oct 16, 6:30 PM");
  assert.equal(sheetPlace(base), "Hamra Strength Club · Rana K.");
  assert.equal(sheetPlace({ ...base, instructorName: null }), "Hamra Strength Club");
  assert.equal(paymentLine("$12", false), "$12 · Cash before class");
  assert.equal(paymentLine("", true), "Free");
  assert.equal(doneBody("Spin 45", null), "Spin 45 is in your bookings.");
  assert.equal(doneBody("Spin 45", " Arrive 10 minutes early. "), "Spin 45 is in your bookings. Arrive 10 minutes early.");
});
