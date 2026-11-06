import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildWidgetSnapshot, snapshotKey, WIDGET_HABITS_MAX, type SnapshotInput } from "./snapshotModel.ts";

const NOW = new Date(Date.UTC(2026, 10, 6, 9, 30));
const base: SnapshotInput = {
  language: "en",
  hideNumbers: false,
  now: NOW,
  steps: { manual: null, synced: 8123, goal: 10000 },
  water: { todayMl: 750, goalMl: 2500 },
  habits: [{ name: "Read", done: true }],
  workout: { kind: "session", title: "Upper body", week: 2, day: 3 },
  dayLabel: (w, d) => `Week ${w} · Day ${d}`,
};

describe("buildWidgetSnapshot", () => {
  it("carries every part it knows, with the time as ISO", () => {
    assert.deepEqual(buildWidgetSnapshot(base), {
      language: "en",
      hideNumbers: false,
      updatedAt: "2026-11-06T09:30:00.000Z",
      steps: { today: 8123, goal: 10000 },
      water: { todayMl: 750, goalMl: 2500 },
      habits: [{ name: "Read", done: true }],
      workout: { title: "Upper body", subtitle: "Week 2 · Day 3" },
    });
  });

  it("leaves out what isn't known, and says none for an empty day", () => {
    const unknown = buildWidgetSnapshot({ ...base, steps: null, water: null, habits: null, workout: { kind: "unknown" } });
    assert.deepEqual(Object.keys(unknown).sort(), ["hideNumbers", "language", "updatedAt"]);
    assert.equal(buildWidgetSnapshot({ ...base, steps: { manual: null, synced: null, goal: 10000 } }).steps, undefined);
    const empty = buildWidgetSnapshot({ ...base, habits: [], workout: { kind: "none" }, water: { todayMl: 0, goalMl: 2500 } });
    assert.deepEqual(empty.habits, []);
    assert.equal(empty.workout, null);
    assert.ok("workout" in empty);
    assert.deepEqual(empty.water, { todayMl: 0, goalMl: 2500 });
  });

  it("steps: the hand-logged reading wins on a day with both; else the synced day", () => {
    assert.deepEqual(buildWidgetSnapshot({ ...base, steps: { manual: 5000, synced: 8123, goal: 10000 } }).steps, { today: 5000, goal: 10000 });
    assert.deepEqual(buildWidgetSnapshot({ ...base, steps: { manual: null, synced: 8123, goal: 10000 } }).steps, { today: 8123, goal: 10000 });
    assert.deepEqual(buildWidgetSnapshot({ ...base, steps: { manual: 5000, synced: null, goal: 10000 } }).steps, { today: 5000, goal: 10000 });
  });

  it("sends the first six habits only", () => {
    const many = Array.from({ length: 9 }, (_, n) => ({ name: `H${n}`, done: n % 2 === 0 }));
    const s = buildWidgetSnapshot({ ...base, habits: many });
    assert.equal(WIDGET_HABITS_MAX, 6);
    assert.deepEqual(s.habits?.map((h) => h.name), ["H0", "H1", "H2", "H3", "H4", "H5"]);
  });

  it("hideNumbers: no workout subtitle; the phone hides the figures", () => {
    const s = buildWidgetSnapshot({ ...base, hideNumbers: true });
    assert.equal(s.hideNumbers, true);
    assert.deepEqual(s.workout, { title: "Upper body", subtitle: null });
    assert.deepEqual(s.steps, { today: 8123, goal: 10000 });
  });

  it("the workout subtitle is only its day: never volume or kcal", () => {
    const s = buildWidgetSnapshot(base);
    const sub = s.workout?.subtitle ?? "";
    assert.equal(sub, "Week 2 · Day 3");
    assert.doesNotMatch(sub, /kg|kcal|cal|lb|volume|set|rep/i);
    assert.deepEqual(Object.keys(s.workout ?? {}).sort(), ["subtitle", "title"]);
  });

  it("snapshotKey ignores the time only", () => {
    const a = buildWidgetSnapshot(base);
    const b = buildWidgetSnapshot({ ...base, now: new Date(NOW.getTime() + 60_000) });
    assert.equal(snapshotKey(a), snapshotKey(b));
    assert.notEqual(snapshotKey(a), snapshotKey(buildWidgetSnapshot({ ...base, water: { todayMl: 1000, goalMl: 2500 } })));
    assert.notEqual(snapshotKey(a), snapshotKey(buildWidgetSnapshot({ ...base, language: "ar" })));
  });
});
