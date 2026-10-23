// Market + Share 3.0 W5: live assigned classes vs hired events on the calendar (P-CA, D-40).
import { test } from "node:test";
import assert from "node:assert/strict";
import { classBadge, dayDots, liveInfo, mergeClasses, type LiveClass } from "./classModel";
import { CLASS_PALETTE, parseMyCalendar } from "../../../services/calendar-sync/model";

const live = (o: Partial<LiveClass> = {}): LiveClass => ({ id: "s1", title: "HIIT 30", date: "2026-11-02", startTime: "07:00", endTime: "07:30", notes: null, seriesId: "cs1", businessName: "Gym A", ...o });

test("a live assigned class: the class look in a palette colour, and no hire claims", () => {
  const all = [live(), live({ id: "s2", date: "2026-11-04" })];
  const i = liveInfo(all[0], all);
  assert.equal(i.hired, false);
  assert.equal(i.pay, null);
  assert.equal(i.booked, null);
  assert.equal(i.hireId, null);
  assert.ok((CLASS_PALETTE as readonly string[]).includes(i.colour));
  assert.equal(i.recurrence, "Every Mon and Wed");
  assert.equal(liveInfo(live({ seriesId: null }), []).recurrence, null);
});

test("my_calendar events replace the live row of the same session: no duplicates", () => {
  const hired = parseMyCalendar([{ class_id: "s1", class_series_id: "cs1", hire_id: "h1", business_name: "Gym A", title: "HIIT 30", event_date: "2026-11-02", start_time: "07:00", end_time: "07:30", pay_per_session: 70 }]);
  const out = mergeClasses([live(), live({ id: "s9" })], hired);
  assert.deepEqual(out.map((c) => [c.sessionId, c.hired]).sort(), [["s1", true], ["s9", false]]);
  assert.equal(out.find((c) => c.sessionId === "s1")?.pay, 70);
  // my_calendar carries no colour (D-40 not in the contract): the series' palette colour.
  assert.ok((CLASS_PALETTE as readonly string[]).includes(out.find((c) => c.sessionId === "s1")?.colour ?? ""));
});

test("an event without a hire never says Hired", () => {
  const out = mergeClasses([], parseMyCalendar([{ class_id: "s1", business_name: "Gym A", title: "HIIT 30", event_date: "2026-11-02", start_time: "07:00" }]));
  assert.equal(out[0].hired, false);
});

test("badges: cancelled, completed, updated", () => {
  assert.equal(classBadge({ status: "cancelled", updated: true }), "cancelled");
  assert.equal(classBadge({ status: "completed", updated: false }), "completed");
  assert.equal(classBadge({ status: "scheduled", updated: true }), "updated");
  assert.equal(classBadge({ status: "scheduled", updated: false }), null);
});

test("month dots: own sessions and classes apart; requests, declines and cancelled classes don't count", () => {
  assert.deepEqual(dayDots([{ kind: "request", badge: "request" }, { kind: "invite", badge: "declined" }]), { own: false, cls: false });
  assert.deepEqual(dayDots([{ kind: "session", badge: null }, { kind: "class", badge: "cancelled", cls: { status: "cancelled" } }]), { own: true, cls: false });
  assert.deepEqual(dayDots([{ kind: "class", badge: null, cls: { status: "scheduled" } }]), { own: false, cls: true });
});
