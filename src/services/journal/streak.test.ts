import { strict as assert } from "node:assert";
import { test } from "node:test";
import { journalStreak } from "./streak";

test("counts back from the local today, on calendar days", () => {
  assert.equal(journalStreak(["2026-09-30", "2026-09-29", "2026-09-28", "2026-09-26"], "2026-09-30"), 3);
  assert.equal(journalStreak(["2026-09-29"], "2026-09-30"), 0);
  assert.equal(journalStreak([], "2026-09-30"), 0);
});

test("crosses month and year boundaries", () => {
  assert.equal(journalStreak(["2026-10-01", "2026-09-30"], "2026-10-01"), 2);
  assert.equal(journalStreak(["2027-01-01", "2026-12-31"], "2027-01-01"), 2);
});

test("independent of the machine's time zone: no UTC conversion anywhere", () => {
  const prev = process.env.TZ;
  process.env.TZ = "Asia/Beirut";
  try {
    assert.equal(journalStreak(["2026-09-30", "2026-09-29"], "2026-09-30"), 2);
  } finally {
    process.env.TZ = prev;
  }
});
