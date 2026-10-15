import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dashEntryDetail, gymEntriesGauge, gymHasEntries, gymTodayModel, usualSoFar, type DashGym } from "./gymToday";
import type { DeskSummary, Entry } from "../../services/front-desk/frontDeskLogic";

const summary = (o: Partial<DeskSummary> = {}): DeskSummary => ({
  entriesToday: 5,
  deniedToday: 1,
  inNow: 3,
  lastHour: 2,
  typicalHour: 2,
  rightNow: "steady",
  dayPassesThisWeek: 0,
  guestPassesThisMonth: 0,
  ...o,
});
const entry = (o: Partial<Entry>): Entry => ({
  id: "e",
  at: new Date(2026, 9, 14, 18, 42).toISOString(),
  method: "qr",
  result: "in",
  reason: null,
  personId: "p1",
  title: "Mina",
  hostName: null,
  isGuest: false,
  isDayPass: false,
  planName: "Monthly unlimited",
  ...o,
});
const grid = (wd: number, values: Record<number, number>) => {
  const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
  for (const [h, v] of Object.entries(values)) g[wd - 1][Number(h)] = v;
  return g;
};

test("gym today (DA1-007): masked titles, plan · time details, vs usual, peak, bars per opening hour", () => {
  const now = new Date(2026, 9, 14, 19, 30); // a Wednesday (ISO 3)
  const g: DashGym = {
    summary: summary({ entriesToday: 12 }),
    entries: [
      entry({ id: "1" }),
      entry({ id: "2", personId: null, title: "Rae", isDayPass: true, at: new Date(2026, 9, 14, 18, 31).toISOString() }),
      entry({ id: "3", result: "denied", reason: "expired", personId: "p2", title: "Lina", at: new Date(2026, 9, 14, 18, 20).toISOString() }),
    ],
    busy: grid(3, { 6: 2, 18: 4, 19: 2 }),
    days: {},
    todayHours: { closed: false, open_24h: false, opens_at: "06:00:00", closes_at: "22:00:00" },
  };
  const m = gymTodayModel(g, 2, (id) => (id === "p1" ? "Member #0042" : null), now);
  assert.deepEqual(
    m.recent.map((r) => [r.title, r.detail, r.pill.text]),
    [
      ["Member #0042", "Monthly unlimited · 6:42 PM", "In"],
      ["Guest", "Day pass · 6:31 PM", "In"],
      ["Member", "Membership expired · 6:20 PM", "Denied"],
    ]
  );
  // usual by 7:30 PM: 2 + 4 + half of 2 = 7; 12 − 7 = +5.
  assert.equal(usualSoFar(g.busy, now), 7);
  assert.equal(m.boxes[0].delta, "+5 vs usual");
  assert.deepEqual([m.boxes[1].value, m.boxes[1].delta], ["Steady", "Peak at 6 PM"]);
  assert.equal(m.boxes[2].value, "2");
  assert.equal(m.bars.length, 16);
  assert.equal(m.bars[m.hi].label, "");
  assert.equal(m.hi, 13); // 7 PM is the 14th bar from 6 AM
  assert.equal(m.bars[12].h, 100); // 6 PM had the entries
  assert.equal(m.tip, null);
});

test("gym today early (DA1-009): no deltas, Right now is '–' with 'Not enough data yet', the tip", () => {
  const g: DashGym = { summary: summary({ rightNow: null, typicalHour: null, entriesToday: 4 }), entries: [entry({})], busy: grid(1, {}), days: {}, todayHours: null };
  const m = gymTodayModel(g, null, () => null, new Date(2026, 9, 14, 19, 0));
  assert.equal(m.boxes[0].delta, undefined);
  assert.deepEqual([m.boxes[1].value, m.boxes[1].delta, m.boxes[1].tone], ["–", "Not enough data yet", "faint"]);
  assert.equal(m.boxes[2].value, "–");
  assert.equal(m.tip, "Busy times sharpen after two weeks of entries.");
});

test("gym gauge: petals per day, ghost last week, '{word} now'; nothing ever is not 'has entries'", () => {
  const week = ["2026-10-12", "2026-10-13", "2026-10-14", "2026-10-15", "2026-10-16", "2026-10-17", "2026-10-18"];
  const last = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
  const g: DashGym = { summary: summary({ rightNow: "busy" }), entries: [], busy: grid(1, {}), days: { "2026-10-12": 3, "2026-10-14": 5, "2026-10-06": 4 }, todayHours: null };
  const gauge = gymEntriesGauge(g, week, last, "2026-10-14");
  assert.deepEqual(gauge.spec.vals, [3, 0, 5, 0, 0, 0, 0]);
  assert.deepEqual(gauge.spec.last, [0, 4, 0, 0, 0, 0, 0]);
  assert.equal(gauge.target, 8);
  assert.equal(gauge.sub, "Busy now");
  assert.equal(gymHasEntries(g), true);
  assert.equal(gymHasEntries({ ...g, days: {} }), false);
  assert.equal(dashEntryDetail(entry({ personId: null, isGuest: true })), "Guest · 6:42 PM");
});
