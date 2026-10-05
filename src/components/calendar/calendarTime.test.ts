import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fieldTime, fmt12, fromParts, linkLabel, minuteOptions, normaliseLink, range12, toParts } from "./calendarTime.ts";

test("12-hour display covers midnight, noon and the afternoon", () => {
  assert.equal(fmt12("00:05"), "12:05 AM");
  assert.equal(fmt12("12:00"), "12:00 PM");
  assert.equal(fmt12("18:30"), "6:30 PM");
  assert.equal(range12("18:00", "19:00"), "6:00 PM – 7:00 PM");
});

test("the sheet's field pads the hour", () => {
  assert.equal(fieldTime("09:00"), "09:00 AM");
  assert.equal(fieldTime("22:15"), "10:15 PM");
});

test("wheel parts round-trip", () => {
  for (const t of ["00:00", "07:05", "12:00", "12:55", "13:10", "23:55", "18:07"]) assert.equal(fromParts(toParts(t)), t);
  assert.deepEqual(toParts("00:30"), { hour: 12, minute: 30, meridiem: "AM" });
});

test("an odd minute stays on the wheel", () => {
  assert.equal(minuteOptions(10).length, 12);
  assert.deepEqual(minuteOptions(7).slice(0, 3), [0, 5, 7]);
});

test("links: bare hosts get https, other schemes are refused", () => {
  assert.equal(normaliseLink("zoom.us/j/123"), "https://zoom.us/j/123");
  assert.equal(normaliseLink("http://example.com"), "http://example.com/");
  assert.equal(normaliseLink("javascript:alert(1)"), null);
  assert.equal(normaliseLink("mailto:a@b.co"), null);
  assert.equal(normaliseLink("not a link"), null);
  assert.equal(normaliseLink("  "), null);
  assert.equal(linkLabel("https://meet.example.com/noor"), "meet.example.com/noor");
});
