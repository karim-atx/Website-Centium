// Market + Share 3.0 W5: the calendar sync model (P-CA, DB9 / DB12 shapes).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addedStrip,
  ageText,
  bookedText,
  cancelledStrip,
  classColour,
  CLASS_PALETTE,
  dayDate,
  durationText,
  editedNote,
  isoWeekday,
  parseMyCalendar,
  payText,
  parseNotice,
  pickNotices,
  recurrenceText,
  removedStrip,
  stripOf,
  ticketTones,
  whenText,
  type NotificationLike,
} from "./model";

const row = (o: Record<string, unknown> = {}) => ({
  class_session_id: "s1",
  hire_id: "h1",
  class_series_id: "cs1",
  business_id: "b1",
  business_name: "Gym A",
  title: "HIIT 30",
  location: "Badaro",
  date: "2026-11-02",
  start_time: "07:00:00",
  end_time: "07:30:00",
  weekdays: [1, 3],
  booked_count: 12,
  capacity: 16,
  pay_per_session: 70,
  colour: "#4f8f8a",
  status: "scheduled",
  updated_fields: [],
  ...o,
});

test("my_calendar keeps hired events only, tolerant of the date shapes", () => {
  const out = parseMyCalendar([row(), { id: "own-event", title: "Not a class" }, row({ class_session_id: "s2", date: null, start_time: null, starts_at: "2026-11-04T07:00:00", ends_at: "2026-11-04T07:30:00" })]);
  assert.equal(out.length, 2);
  assert.deepEqual([out[0].date, out[0].start, out[0].end], ["2026-11-02", "07:00", "07:30"]);
  assert.deepEqual([out[1].date, out[1].start, out[1].end], ["2026-11-04", "07:00", "07:30"]);
  assert.deepEqual(out[0].weekdays, [1, 3]);
  assert.equal(out[0].status, "scheduled");
});

test("duration_min fills the end; a bad status reads scheduled; updated_fields are filtered", () => {
  const [e] = parseMyCalendar([row({ end_time: null, duration_min: 45, status: "weird", updated_fields: ["time", "price"] })]);
  assert.equal(e.end, "07:45");
  assert.equal(e.status, "scheduled");
  assert.deepEqual(e.updatedFields, ["time"]);
  assert.deepEqual(parseMyCalendar([row({ updated_fields: "{time,location}" })])[0].updatedFields, ["time", "location"]);
});

test("weekdays are ISO; 0 reads as Sunday", () => {
  assert.equal(isoWeekday(1), 1);
  assert.equal(isoWeekday(0), 7);
  assert.equal(isoWeekday(8), null);
  assert.equal(isoWeekday("x"), null);
});

test("class colour: the server's hex, else a stable palette colour", () => {
  assert.equal(classColour("#667bb1", "x"), "#667BB1");
  const a = classColour(null, "series-1");
  assert.ok((CLASS_PALETTE as readonly string[]).includes(a));
  assert.equal(classColour(null, "series-1"), a);
  assert.equal(classColour("teal", "series-1"), a);
  const seen = new Set(Array.from({ length: 30 }, (_, i) => classColour(null, `k${i}`)));
  assert.equal(seen.size, CLASS_PALETTE.length);
});

test("ticket tones: the drawn pair for Cedar, a derived pair otherwise", () => {
  assert.deepEqual(ticketTones("#4F8F8A"), { bg: "#E6F1EF", ink: "#2F5F58" });
  const t = ticketTones("#5A859E");
  assert.match(t.bg, /^#[0-9A-F]{6}$/);
  assert.match(t.ink, /^#[0-9A-F]{6}$/);
});

test("words: month-first dates, 12-hour times, the sheet rows", () => {
  assert.equal(dayDate("2026-11-02"), "Mon, Nov 2");
  assert.equal(whenText("2026-11-02", "07:00", "07:30"), "Mon, Nov 2 · 7:00 to 7:30 AM");
  assert.equal(whenText("2026-11-06", "18:30", "19:15"), "Fri, Nov 6 · 6:30 to 7:15 PM");
  assert.equal(durationText("07:00", "07:30"), "30 min");
  assert.equal(durationText("07:00", "07:00"), null);
  assert.equal(recurrenceText(null, [3, 1]), "Every Mon and Wed");
  assert.equal(recurrenceText(null, [1, 3, 5]), "Every Mon, Wed and Fri");
  assert.equal(recurrenceText("Every weekday", [1]), "Every weekday");
  assert.equal(recurrenceText(null, []), null);
  assert.equal(bookedText(12, 16), "12 of 16");
  assert.equal(bookedText(null, 16), null);
  assert.equal(payText(70), "$70 · as agreed");
  assert.equal(payText(null), null);
});

// Local wall-clock instants (no zone suffix): the notices read times on the device's clock.
const n = (o: Partial<NotificationLike>): NotificationLike => ({ id: "n", kind: "x", subjectType: null, subjectId: null, payload: {}, readAt: null, createdAt: "2026-11-01T10:00:00Z", ...o });

test("notices: unread member-inbox sync kinds only; the latest strip and the latest edit", () => {
  const p = pickNotices([
    n({ id: "a", kind: "classes_added", createdAt: "2026-11-01T09:00:00Z" }),
    n({ id: "b", kind: "class_cancelled", createdAt: "2026-11-01T11:00:00Z" }),
    n({ id: "c", kind: "class_changed" }),
    n({ id: "d", kind: "removed_from_team", readAt: "2026-11-01T12:00:00Z", createdAt: "2026-11-01T12:00:00Z" }),
    n({ id: "e", kind: "application_received" }),
    // the old guessed title keys on another kind no longer count
    n({ id: "f", kind: "hired", subjectType: "classes_added", createdAt: "2026-11-01T13:00:00Z" }),
  ]);
  assert.equal(p.strip?.id, "b");
  assert.equal(p.note?.id, "c");
});

test("notices: the documented subject and payload keys (20261210600000)", () => {
  const added = parseNotice(n({ kind: "classes_added", subjectType: "hire", subjectId: "h1", payload: { business_name: "Gym A", role_title: "HIIT instructor", session_count: 3, first_starts_at: "2026-11-02T07:00:00" } }))!;
  assert.deepEqual([added.kind, added.hireId, added.businessName, added.count, added.startsOn], ["added", "h1", "Gym A", 3, "2026-11-02"]);
  const changed = parseNotice(n({ kind: "class_changed", subjectType: "class_series", subjectId: "cs1", payload: { business_name: "Gym A", class_title: "HIIT 30", starts_at: "2026-11-04T07:30:00", ends_at: "2026-11-04T08:00:00", previous_starts_at: "2026-11-04T07:00:00" } }))!;
  assert.deepEqual([changed.seriesId, changed.weekday, changed.fromTime, changed.toTime, changed.sessionId], ["cs1", 3, "07:00", "07:30", null]);
  const cancelled = parseNotice(n({ kind: "class_cancelled", subjectType: "class_session", subjectId: "s2", payload: { business_name: "Gym A", class_title: "Core 20", starts_at: "2026-11-06T18:00:00", reason: "Coach ill" } }))!;
  assert.deepEqual([cancelled.sessionId, cancelled.date, cancelled.classTitle], ["s2", "2026-11-06", "Core 20"]);
  const removed = parseNotice(n({ kind: "removed_from_team", subjectType: "business", subjectId: "b1", payload: { business_name: "Gym B", role_title: "Coach", ended_on: "2026-11-01" } }))!;
  assert.deepEqual([removed.businessName, removed.hireId, removed.sessionId], ["Gym B", null, null]);
  // a subject id of another type is never read as a hire / session / series
  assert.equal(parseNotice(n({ kind: "classes_added", subjectType: "business", subjectId: "b1" }))!.hireId, null);
  assert.equal(parseNotice(n({ kind: "classes_added", payload: { session_count: 0 } }))!.count, null);
});

test("strips: payload first, then what the events say; never invented", () => {
  const events = parseMyCalendar([row(), row({ class_session_id: "s2", class_series_id: "cs2", date: "2026-11-06" })]);
  const added = pickNotices([n({ kind: "classes_added", subjectType: "hire", subjectId: "h1" })]).strip!;
  assert.deepEqual(stripOf(added, events, "2026-11-01"), { text: "2 classes added to your calendar · Gym A, from Mon, Nov 2", tone: "success", action: "View", jumpTo: "2026-11-02" });
  const fromPayload = pickNotices([n({ kind: "classes_added", subjectType: "hire", subjectId: "zz", payload: { business_name: "Gym C", session_count: 4, first_starts_at: "2026-11-09T07:00:00" } })]).strip!;
  assert.equal(stripOf(fromPayload, [], "2026-11-01")?.text, "4 classes added to your calendar · Gym C, from Mon, Nov 9");
  const unknown = pickNotices([n({ kind: "classes_added", subjectType: "hire", subjectId: "zz" })]).strip!;
  assert.equal(stripOf(unknown, events, "2026-11-01"), null);
  const cancelled = pickNotices([n({ kind: "class_cancelled", subjectType: "class_session", subjectId: "s2" })]).strip!;
  assert.equal(stripOf(cancelled, events, "2026-11-01")?.text, "Gym A cancelled HIIT 30 on Fri, Nov 6");
  const removed = pickNotices([n({ kind: "removed_from_team", subjectType: "business", payload: { business_name: "Gym B" } })]).strip!;
  assert.deepEqual(stripOf(removed, [], "2026-11-01"), { text: removedStrip("Gym B"), tone: "neutral", action: "OK", jumpTo: null });
  assert.equal(addedStrip(1, "Gym A", null), "1 class added to your calendar · Gym A");
  assert.equal(cancelledStrip("Gym A", "Core 20", null), "Gym A cancelled Core 20");
});

test("the edit card: times from previous_starts_at → starts_at, else a plain line", () => {
  const timed = pickNotices([n({ kind: "class_changed", subjectType: "class_series", subjectId: "cs9", payload: { business_name: "Gym A", class_title: "HIIT 30", starts_at: "2026-11-04T07:30:00", previous_starts_at: "2026-11-04T07:00:00" } })]).note!;
  assert.deepEqual(editedNote(timed, []), { title: "Class time changed", body: "Gym A moved HIIT 30 on Wednesdays from 7:00 to 7:30 AM. Your calendar is updated." });
  const plain = pickNotices([n({ kind: "class_changed", payload: { business_name: "Gym A", class_title: "HIIT 30" } })]).note!;
  assert.equal(editedNote(plain, [])?.title, "Class changed");
  // the series' own events fill the names when the payload lacks them
  const events = parseMyCalendar([row()]);
  const bySeries = pickNotices([n({ kind: "class_changed", subjectType: "class_series", subjectId: "cs1" })]).note!;
  assert.deepEqual(editedNote(bySeries, events), { title: "Class changed", body: "Gym A changed HIIT 30. Your calendar is updated." });
  const bare = pickNotices([n({ kind: "class_changed" })]).note!;
  assert.equal(editedNote(bare, []), null);
});

test("age: now, minutes, hours, then the date", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  assert.equal(ageText("2026-11-02T11:59:30Z", now), "now");
  assert.equal(ageText("2026-11-02T11:55:00Z", now), "5 min");
  assert.equal(ageText("2026-11-02T09:00:00Z", now), "3 h");
  assert.match(ageText("2026-10-21T09:00:00Z", now), /^Oct 21$/);
});
