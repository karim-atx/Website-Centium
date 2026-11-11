import { strict as assert } from "node:assert";
import { test } from "node:test";
import { fieldTime, fromParts, linkLabel, ALL_MINUTES, normaliseLink, toParts } from "./calendarTime.ts";

test("the sheet's field is 12-hour with an unpadded hour (X-14)", () => {
  assert.equal(fieldTime("09:00"), "9:00 AM");
  assert.equal(fieldTime("22:15"), "10:15 PM");
  assert.equal(fieldTime("00:05"), "12:05 AM");
});

test("wheel parts round-trip", () => {
  for (const t of ["00:00", "07:05", "12:00", "12:55", "13:10", "23:55", "18:07"]) assert.equal(fromParts(toParts(t)), t);
  assert.deepEqual(toParts("00:30"), { hour: 12, minute: 30, meridiem: "AM" });
});

test("the minute wheel offers every minute (FV)", () => {
  assert.equal(ALL_MINUTES.length, 60);
  assert.deepEqual([ALL_MINUTES[0], ALL_MINUTES[7], ALL_MINUTES[59]], [0, 7, 59]);
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
