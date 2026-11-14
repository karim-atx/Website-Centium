import { strict as assert } from "node:assert";
import { test } from "node:test";
import { addCatalogue, setActiveLanguage } from "../i18n/core.ts";
import {
  clock12,
  clock12Split,
  clockParts,
  formatMinutes12,
  hourLabel12,
  hourTick12,
  localiseSavedClock,
  minutesOfDay,
  range12,
  rangeClock12,
  rangeMinutes12,
  time12,
  time12En,
  time12Split,
} from "./time12.ts";

test("X-14: uppercase meridiem after a space, hour unpadded", () => {
  assert.equal(time12("08:40"), "8:40 AM");
  assert.equal(time12("18:00"), "6:00 PM");
  assert.equal(time12("06:00:00"), "6:00 AM");
  assert.equal(time12("7:05"), "7:05 AM");
});

test("noon and midnight", () => {
  assert.equal(time12("00:00"), "12:00 AM");
  assert.equal(time12("00:30"), "12:30 AM");
  assert.equal(time12("12:00"), "12:00 PM");
  assert.equal(time12("12:59"), "12:59 PM");
  assert.equal(time12("23:59"), "11:59 PM");
  assert.equal(time12("24:00"), "12:00 AM");
});

test("empty gives empty, unreadable is returned unchanged", () => {
  assert.equal(time12(""), "");
  assert.equal(time12(null), "");
  assert.equal(time12(undefined), "");
  assert.equal(time12("soon"), "soon");
  assert.equal(minutesOfDay("25:00"), null);
  assert.equal(minutesOfDay("10:75"), null);
});

test("ranges name the meridiem once when both ends share it", () => {
  assert.equal(range12("18:00", "19:00"), "6:00 to 7:00 PM");
  assert.equal(range12("06:00:00", "07:30:00"), "6:00 to 7:30 AM");
  assert.equal(range12("11:30", "13:00"), "11:30 AM to 1:00 PM");
  assert.equal(range12("22:00", "01:00"), "10:00 PM to 1:00 AM");
  assert.equal(range12("12:30", "13:00"), "12:30 to 1:00 PM");
});

test("ranges with a missing end", () => {
  assert.equal(range12("09:00", undefined), "9:00 AM");
  assert.equal(range12(undefined, "09:00"), "9:00 AM");
  assert.equal(range12(undefined, undefined), "");
});

test("a custom joiner", () => {
  assert.equal(range12("18:00", "19:00", " – "), "6:00 – 7:00 PM");
  assert.equal(rangeMinutes12(9 * 60, 17 * 60), "9:00 AM to 5:00 PM");
});

test("instants format in local time", () => {
  const d = new Date(2026, 9, 8, 20, 5);
  assert.equal(clock12(d), "8:05 PM");
  assert.equal(clock12(d.getTime()), "8:05 PM");
  assert.equal(clock12(d.toISOString()), "8:05 PM");
  assert.equal(clock12("not a date"), "");
  assert.equal(rangeClock12(new Date(2026, 9, 8, 9, 0), new Date(2026, 9, 8, 9, 45)), "9:00 to 9:45 AM");
});

test("split for the Explore date block (V6-148)", () => {
  assert.deepEqual(time12Split("08:00"), { time: "8:00", meridiem: "AM" });
  assert.deepEqual(time12Split("20:15:00"), { time: "8:15", meridiem: "PM" });
  assert.equal(time12Split(""), null);
  assert.deepEqual(clock12Split(new Date(2026, 0, 1, 0, 7)), { time: "12:07", meridiem: "AM" });
});

test("axis labels and parts", () => {
  assert.equal(hourLabel12(0), "12 AM");
  assert.equal(hourLabel12(6), "6 AM");
  assert.equal(hourLabel12(12), "12 PM");
  assert.equal(hourLabel12(21), "9 PM");
  assert.equal(hourLabel12(24), "12 AM");
  assert.deepEqual(clockParts(13 * 60 + 5), { hour: 1, minute: 5, meridiem: "PM" });
  assert.equal(formatMinutes12(-30), "11:30 PM");
});

test("time12En: saved text keeps the English clock", () => {
  assert.equal(time12En("09:05"), "9:05 AM");
  assert.equal(time12En("18:30:00"), "6:30 PM");
  assert.equal(time12En(""), "");
  assert.equal(time12En("soon"), "soon");
});

// Batch D FY: no English "AM" / "PM" reaches an Arabic reader.
test("hourTick12: the compact chart tick in each language", () => {
  assert.equal(hourTick12(0), "12am");
  assert.equal(hourTick12(6), "6am");
  assert.equal(hourTick12(12), "12pm");
  assert.equal(hourTick12(14), "2pm");
  assert.equal(hourTick12(24), "12am");
  addCatalogue("ar", { AM: "ص", PM: "م" });
  setActiveLanguage("ar");
  try {
    assert.equal(hourTick12(6), "6 ص");
    assert.equal(hourTick12(18), "6 م");
    assert.equal(hourTick12(0), "12 ص");
  } finally {
    setActiveLanguage("en");
  }
});

test("localiseSavedClock: saved English times read in the app's language, the rest as saved", () => {
  const saved = "Spin 45 · Sun, Tue 10:00 AM and HIIT 30 · Mon 7:30 PM";
  assert.equal(localiseSavedClock(saved), saved);
  assert.equal(localiseSavedClock(null), null);
  assert.equal(localiseSavedClock(""), "");
  addCatalogue("ar", { AM: "ص", PM: "م" });
  setActiveLanguage("ar");
  try {
    // Each Arabic clock sits in a right-to-left isolate (RLI … PDI) inside the English text.
    const rtl = (s: string) => `⁧${s}⁩`;
    assert.equal(localiseSavedClock(saved), `Spin 45 · Sun, Tue ${rtl("10:00 ص")} and HIIT 30 · Mon ${rtl("7:30 م")}`);
    assert.equal(localiseSavedClock(`Yoga · Sat, Oct 24, ${time12En("09:00")}`), `Yoga · Sat, Oct 24, ${rtl("9:00 ص")}`);
    // A class title with "AM" in it is not a clock time.
    assert.equal(localiseSavedClock("AM Yoga · Mon 6:15 AM"), `AM Yoga · Mon ${rtl("6:15 ص")}`);
    assert.equal(localiseSavedClock(undefined), undefined);
  } finally {
    setActiveLanguage("en");
  }
});
