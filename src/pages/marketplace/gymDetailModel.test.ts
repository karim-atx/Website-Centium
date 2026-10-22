import { strict as assert } from "node:assert";
import { test } from "node:test";
import { addMonthsIso, areaOf, durationText, gymHoursRows, includesText, longDay, planExpiryIso, planRowLine, sheetPlanName, startsToday } from "./gymDetailModel";
import type { HoursRow } from "../../services/venues/hours";

const open = (weekday: number, from: string, to: string): HoursRow => ({ weekday, closed: false, open24h: false, opensAt: `${from}:00`, closesAt: `${to}:00`, wrapsMidnight: false });

test("gymHoursRows groups runs as the board writes them", () => {
  const rows = [1, 2, 3, 4, 5].map((d) => open(d, "06:00", "23:00")).concat([open(6, "08:00", "20:00"), open(7, "08:00", "20:00")]);
  assert.deepEqual(
    gymHoursRows(rows).map((r) => [r.label, r.value]),
    [
      ["Monday to Friday", "6:00 AM to 11:00 PM"],
      ["Saturday and Sunday", "8:00 AM to 8:00 PM"],
    ]
  );
});

test("gymHoursRows: single days in full, closed days named, nothing published is empty", () => {
  const rows = [1, 2, 3, 4, 5].map((d) => open(d, "06:00", "23:00")).concat([open(6, "08:00", "20:00"), { weekday: 7, closed: true, open24h: false, opensAt: null, closesAt: null, wrapsMidnight: false }]);
  assert.deepEqual(
    gymHoursRows(rows).map((r) => r.label + ": " + r.value),
    ["Monday to Friday: 6:00 AM to 11:00 PM", "Saturday: 8:00 AM to 8:00 PM", "Sunday: Closed"]
  );
  assert.deepEqual(gymHoursRows([]), []);
});

test("areaOf keeps the last two parts of a long address", () => {
  assert.equal(areaOf("Makdessi Street, Hamra, Beirut"), "Hamra, Beirut");
  assert.equal(areaOf("Hamra, Beirut"), "Hamra, Beirut");
  assert.equal(areaOf(null), "");
});

test("planExpiryIso mirrors plan_expiry_from", () => {
  assert.equal(planExpiryIso("2026-10-16", null, "monthly"), "2026-11-16");
  assert.equal(planExpiryIso("2026-01-31", null, "monthly"), "2026-02-28");
  assert.equal(planExpiryIso("2026-10-22", null, "daily"), "2026-10-23");
  assert.equal(planExpiryIso("2026-10-16", 90, "monthly"), "2027-01-14");
  assert.equal(planExpiryIso("2026-08-31", null, "semiannually"), "2027-02-28");
  assert.equal(planExpiryIso("2024-02-29", null, "annually"), "2025-02-28");
  assert.equal(addMonthsIso("2026-11-30", 3), "2027-02-28");
});

test("dates read month first (D-02)", () => {
  assert.equal(longDay("2026-11-15"), "Nov 15, 2026");
  assert.equal(startsToday("2026-10-16"), "Today, Oct 16");
});

test("plan lines", () => {
  assert.equal(durationText(30, "monthly"), "30 days");
  assert.equal(durationText(null, "quarterly"), "3 months");
  assert.equal(includesText(["Gym floor", "Lockers", "Showers"], true), "Gym floor, lockers, showers");
  assert.equal(includesText(["Gym floor", "TRX"], false), "gym floor, TRX");
  assert.equal(includesText([], true), null);
  assert.equal(planRowLine({ validForDays: 30, billing: "monthly", includes: ["Gym floor", "Lockers", "Showers"] }), "30 days · gym floor, lockers, showers");
  assert.equal(planRowLine({ billing: "monthly" }), "1 month");
  assert.equal(sheetPlanName("Monthly"), "Monthly membership");
  assert.equal(sheetPlanName("Day pass"), "Day pass");
  assert.equal(sheetPlanName("Annual membership"), "Annual membership");
});
