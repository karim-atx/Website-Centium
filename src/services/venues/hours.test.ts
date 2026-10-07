import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dayValue, hhmm, hoursLines, isoWeekdayIn, NOT_PUBLISHED, openNowTag, type HoursRow } from "./hours.ts";

const range = (weekday: number, opensAt: string, closesAt: string, wrapsMidnight = false): HoursRow => ({
  weekday,
  closed: false,
  open24h: false,
  opensAt,
  closesAt,
  wrapsMidnight,
});
const closed = (weekday: number): HoursRow => ({ weekday, closed: true, open24h: false, opensAt: null, closesAt: null, wrapsMidnight: false });
const allDay = (weekday: number): HoursRow => ({ weekday, closed: false, open24h: true, opensAt: null, closesAt: null, wrapsMidnight: false });

// The seed's two venues (Database seed.sql, A4 "Local testing").
const flexGym: HoursRow[] = [
  range(1, "06:00:00", "23:00:00"),
  range(2, "06:00:00", "23:00:00"),
  range(3, "06:00:00", "23:00:00"),
  range(4, "06:00:00", "23:00:00"),
  range(5, "06:00:00", "23:00:00"),
  range(6, "08:00:00", "20:00:00"),
  closed(7),
];
const flexStudio: HoursRow[] = [
  range(1, "16:00:00", "02:00:00", true),
  range(2, "16:00:00", "02:00:00", true),
  range(3, "16:00:00", "02:00:00", true),
  range(4, "16:00:00", "02:00:00", true),
  allDay(5),
  range(6, "10:00:00", "18:00:00"),
  closed(7),
];

test("hhmm: a time column reads 24-hour HH:MM", () => {
  assert.equal(hhmm("06:00:00"), "06:00");
  assert.equal(hhmm("23:30"), "23:30");
});

test("dayValue: the three shapes, and a missing day is not 'Closed'", () => {
  assert.equal(dayValue(range(1, "06:00:00", "23:00:00")), "06:00 to 23:00");
  assert.equal(dayValue(closed(7)), "Closed");
  assert.equal(dayValue(allDay(5)), "Open 24 hours");
  assert.equal(dayValue(undefined), NOT_PUBLISHED);
  assert.notEqual(dayValue(undefined), "Closed");
});

test("dayValue: the wrap label comes from wraps_midnight, not from comparing the times", () => {
  assert.equal(dayValue(range(1, "16:00:00", "02:00:00", true)), "16:00 to 02:00 (next day)");
  // The flag is the database's answer; the client does not second-guess it.
  assert.equal(dayValue(range(1, "16:00:00", "02:00:00", false)), "16:00 to 02:00");
});

test("dayValue: a range with a missing end is not drawn as hours", () => {
  assert.equal(dayValue({ weekday: 1, closed: false, open24h: false, opensAt: "06:00:00", closesAt: null, wrapsMidnight: false }), NOT_PUBLISHED);
});

test("hoursLines: Flex Gym groups Mon to Fri, as the frame does", () => {
  assert.deepEqual(
    hoursLines(flexGym, null).map((l) => [l.label, l.value, l.today]),
    [
      ["Mon to Fri", "06:00 to 23:00", false],
      ["Saturday", "08:00 to 20:00", false],
      ["Sunday", "Closed", false],
    ]
  );
});

test("hoursLines: today inside a group gets its own highlighted row after it (the frame's Thursday)", () => {
  assert.deepEqual(
    hoursLines(flexGym, 4).map((l) => [l.label, l.value, l.today]),
    [
      ["Mon to Fri", "06:00 to 23:00", false],
      ["Thursday (today)", "06:00 to 23:00", true],
      ["Saturday", "08:00 to 20:00", false],
      ["Sunday", "Closed", false],
    ]
  );
});

test("hoursLines: today on a single-day row highlights that row, without a duplicate", () => {
  const lines = hoursLines(flexGym, 7);
  assert.equal(lines.length, 3);
  assert.deepEqual([lines[2].label, lines[2].today], ["Sunday (today)", true]);
  assert.equal(lines.filter((l) => l.today).length, 1);
});

test("hoursLines: Flex Studio's wrapping nights, its 24-hour day and its closed day", () => {
  assert.deepEqual(
    hoursLines(flexStudio, 5).map((l) => [l.label, l.value, l.today]),
    [
      ["Mon to Thu", "16:00 to 02:00 (next day)", false],
      ["Friday (today)", "Open 24 hours", true],
      ["Saturday", "10:00 to 18:00", false],
      ["Sunday", "Closed", false],
    ]
  );
});

test("hoursLines: no rows at all is an empty list (hours not published), never seven 'Closed'", () => {
  assert.deepEqual(hoursLines([], 3), []);
});

test("hoursLines: a missing day reads Not published and keys stay unique", () => {
  const rows = flexGym.filter((r) => r.weekday !== 3);
  const lines = hoursLines(rows, 3);
  assert.deepEqual(
    lines.map((l) => [l.label, l.value, l.today]),
    [
      ["Mon to Tue", "06:00 to 23:00", false],
      ["Wednesday (today)", NOT_PUBLISHED, true],
      ["Thu to Fri", "06:00 to 23:00", false],
      ["Saturday", "08:00 to 20:00", false],
      ["Sunday", "Closed", false],
    ]
  );
  assert.equal(new Set(lines.map((l) => l.key)).size, lines.length);
});

test("hoursLines: rows in any order are drawn Monday first", () => {
  assert.deepEqual(hoursLines([...flexGym].reverse(), null), hoursLines(flexGym, null));
});

test("isoWeekdayIn: the venue's own day, not the viewer's", () => {
  // 2026-10-05 is a Monday. 22:30 UTC on Monday is already Tuesday 01:30 in Beirut (UTC+3).
  const t = new Date("2026-10-05T22:30:00Z");
  assert.equal(isoWeekdayIn("Asia/Beirut", t), 2);
  assert.equal(isoWeekdayIn("UTC", t), 1);
  assert.equal(isoWeekdayIn("Europe/London", new Date("2026-10-11T12:00:00Z")), 7);
});

test("isoWeekdayIn: an unusable zone is null (nothing highlighted), not a throw", () => {
  assert.equal(isoWeekdayIn("Mars/Olympus_Mons"), null);
});

test("openNowTag: null is no tag, never Closed now", () => {
  assert.deepEqual(openNowTag(true), { label: "Open now", tone: "member" });
  assert.deepEqual(openNowTag(false), { label: "Closed now", tone: "muted" });
  assert.equal(openNowTag(null), null);
});
