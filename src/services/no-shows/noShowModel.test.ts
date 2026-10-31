import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  attendanceOpen,
  canUndo,
  classStart,
  noShowMessage,
  noShowsLine,
  parseMemberPauses,
  parseMyPauses,
  pauseAt,
  pausedChip,
  pausedSentence,
  warningSentence,
} from "./noShowModel.ts";

const now = new Date(2026, 10, 7, 18, 30);

test("the marks open once the class has started (device clock); unknown opens them", () => {
  assert.equal(attendanceOpen({ date: "2026-11-07", startTime: "18:00:00" }, now), true);
  assert.equal(attendanceOpen({ date: "2026-11-07", startTime: "18:30" }, now), true);
  assert.equal(attendanceOpen({ date: "2026-11-07", startTime: "19:00" }, now), false);
  assert.equal(attendanceOpen({ date: "2026-11-08", startTime: "07:00" }, now), false);
  assert.equal(attendanceOpen(null, now), true);
  assert.equal(classStart("bad", "18:00"), null);
});

test("Undo within 24 hours of the mark; an unknown mark time keeps it", () => {
  assert.equal(canUndo(new Date(now.getTime() - 23 * 3_600_000).toISOString(), now), true);
  assert.equal(canUndo(new Date(now.getTime() - 25 * 3_600_000).toISOString(), now), false);
  assert.equal(canUndo(null, now), true);
});

test("the F2 codes in words, ATXS0 with its DETAIL", () => {
  assert.match(noShowMessage("book", "ATXS0", "2026-11-14T18:30:00Z", "x"), /^Your new class bookings here are paused until Nov 14, /);
  assert.equal(noShowMessage("book", "ATXS0", null, "x"), "Your new class bookings here are paused for now.");
  assert.equal(noShowMessage("mark", "ATXS1", null, "x"), "Attendance can be marked once the class starts.");
  assert.equal(noShowMessage("mark", "ATXS2", null, "x"), "A mark can only be undone within 24 hours.");
  assert.equal(noShowMessage("mark", "ATX09", null, "x"), "Marking attendance needs Schedule or Front desk access. Ask the owner.");
  assert.equal(noShowMessage("policy", "ATX09", null, "x"), "Only staff who manage the schedule can change this.");
  assert.equal(noShowMessage("lift", "ATX09", null, "x"), "Lifting a pause needs Members access. Ask the owner.");
  assert.equal(noShowMessage("lift", "XXXXX", null, "fallback"), "fallback");
});

test("the member's sentences (PLAN AB4)", () => {
  assert.match(pausedSentence("Pulse Gym", "2026-11-14T18:30:00Z"), /^You missed 3 classes at Pulse Gym in 30 days, so new bookings there are paused until Nov 14, .+\. Your existing bookings are kept\.$/);
  assert.equal(pausedSentence("Pulse Gym", null), "You missed 3 classes at Pulse Gym in 30 days, so new bookings there are paused for 7 days. Your existing bookings are kept.");
  assert.equal(warningSentence("Pulse Gym"), "You missed 2 classes at Pulse Gym in the last 30 days. After 3, new bookings there pause for 7 days.");
  assert.match(pausedChip("2026-11-14T18:30:00Z"), /^Paused until Nov 14, /);
  assert.equal(pausedChip("nope"), "Bookings paused");
  assert.equal(noShowsLine(1), "1 no-show in 30 days");
  assert.equal(noShowsLine(3), "3 no-shows in 30 days");
});

test("the readers' rows", () => {
  const mine = parseMyPauses([{ business_id: "b1", business_name: " Pulse ", paused_until: "2026-11-14T18:30:00Z" }, { business_id: null }]);
  assert.deepEqual(mine, [{ businessId: "b1", businessName: "Pulse", pausedUntil: "2026-11-14T18:30:00Z" }]);
  assert.equal(pauseAt(mine, "b1", now)?.businessName, "Pulse");
  assert.equal(pauseAt(mine, "b2", now), null);
  assert.equal(pauseAt(mine, "b1", new Date("2026-11-15T00:00:00Z")), null);
  const staff = parseMemberPauses([
    { member_id: "m2", member_label: "Rana", paused_until: "2026-11-15T00:00:00Z", no_shows: 4 },
    { member_id: "m1", member_label: null, paused_until: "2026-11-14T00:00:00Z", no_shows: "3" },
  ]);
  assert.deepEqual(staff.map((p) => [p.memberId, p.label, p.noShows]), [["m1", "Member", 3], ["m2", "Rana", 4]]);
  assert.deepEqual(parseMyPauses(null), []);
});
