import { strict as assert } from "node:assert";
import { test } from "node:test";
import { computeModel, exportRows, sameSlotHistory, slotLabel, type RawData, type RangeIn } from "./classesModel";

const R: RangeIn = { key: "4w", from: "2026-09-17", to: "2026-10-14", compare: true };
const S = (id: string, date: string, start: string, cap = 10, title = "Spin", type: string | null = "Spin", proId: string | null = "p1") => ({
  id,
  title,
  type,
  date,
  start,
  end: "23:00",
  cap,
  proId,
});
const B = (classId: string, clientId: string, createdAt = "2026-09-01T10:00:00Z") => ({ classId, clientId, createdAt });
const raw = (sessions: RawData["sessions"], bookings: RawData["bookings"], firstEver: string | null): RawData => ({
  sessions,
  bookings,
  firstEver,
  names: { p1: "John" },
  analytics: null,
});

test("no sessions in the range is the empty state; only future classes name the first date", () => {
  const m = computeModel(raw([], [], "2026-10-20"), R);
  assert.equal(m.state, "empty");
  assert.equal(m.upcomingFirst, "2026-10-20");
  assert.equal(computeModel(raw([], [], null), R).upcomingFirst, null);
});

test("early rule: under 2 weeks of classes or under 10 sessions; no comparison while early", () => {
  const m = computeModel(raw([S("a", "2026-10-08", "08:00")], [B("a", "c1")], "2026-10-08"), R);
  assert.equal(m.state, "early");
  assert.equal(m.pct, 10);
  assert.equal(m.prevPct, null);
  assert.equal(m.deltaPts, null);
});

test("data state: fill, previous period and delta in points", () => {
  const sessions = Array.from({ length: 12 }, (_, i) => S(`s${i}`, `2026-09-${String(17 + i).padStart(2, "0")}`, "18:00"));
  const prev = S("old", "2026-09-01", "18:00");
  const bookings = [...sessions.slice(0, 6).flatMap((s) => Array.from({ length: 10 }, (_, k) => B(s.id, `c${k}`))), ...Array.from({ length: 2 }, (_, k) => B("old", `c${k}`))];
  const m = computeModel(raw([prev, ...sessions], bookings, "2026-08-01"), R);
  assert.equal(m.state, "data");
  assert.equal(m.pct, 50);
  assert.equal(m.prevPct, 20);
  assert.equal(m.deltaPts, 30);
  assert.equal(m.bands[4].sessions.length, 6);
  assert.equal(m.bands[0].sessions.length, 6);
  // Without class_analytics there is no new / returning split (never a guess).
  assert.equal(m.returningCount, null);
  assert.deepEqual(m.top, []);
  // With it: summed per title, cancellations by members, instructors from the sessions.
  const an = [
    { classType: "Spin", title: "Spin", sessions: 10, averageFillPct: 50, bookings: 50, cancellations: 2, newClients: 8, returningClients: 42, returnRatePct: 50 },
    { classType: "", title: "Spin", sessions: 2, averageFillPct: 50, bookings: 10, cancellations: 1, newClients: 0, returningClients: 10, returnRatePct: null },
  ];
  const m2 = computeModel({ ...raw([prev, ...sessions], bookings, "2026-08-01"), analytics: an }, R);
  assert.deepEqual([m2.newCount, m2.returningCount, m2.cancellations], [8, 52, 3]);
  assert.deepEqual(m2.top, [{ title: "Spin", sub: "12 sessions · John", n: 60 }]);
  const rows = exportRows(m, R);
  assert.deepEqual(rows[2], ["By type", "Sessions", "Booked", "Spots", "Fill %"]);
  assert.deepEqual(rows[3], ["Spin", 12, 60, 120, 50]);
});

test("12-hour slot labels and the same-slot history", () => {
  assert.equal(slotLabel("07:00:00"), "7 AM");
  assert.equal(slotLabel("19:30"), "7:30 PM");
  assert.equal(slotLabel("12:00"), "12 PM");
  const r = raw([S("a", "2026-09-30", "07:00", 10), S("b", "2026-10-07", "07:00", 10)], [B("a", "x")], "2026-09-30");
  assert.equal(sameSlotHistory(r.sessions[1], r, (id) => (id === "a" ? 1 : 0)), "10%");
  assert.equal(sameSlotHistory(r.sessions[0], r, () => 0), "First session");
});
