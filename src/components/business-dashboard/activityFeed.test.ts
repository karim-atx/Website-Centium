import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activityEvent, activityEvents, freshIds, mergeActivity, toActivityRow, weekTotals } from "./activityFeed";
import type { ActivityRow, DashClass } from "./dashboardTypes";

const cls: DashClass = { id: "k1", title: "Spin 45", date: "2026-10-15", start: "18:00", end: "18:45", cap: 20, professionalId: null, createdAt: "2026-10-14T09:00:00Z" };
const ctx = { classes: [cls], booked: { k1: 18 }, venueNames: { g1: "Hamra" }, today: "2026-10-15" };
const row = (over: Partial<ActivityRow>): ActivityRow => ({ id: 1, kind: "booking", label: "Member #0042", isMinor: false, refKind: "class", refId: "k1", summary: "Spin 45", at: "2026-10-15T09:00:00Z", ...over });

describe("B15 activity feed", () => {
  it("reads a row and drops unknown kinds or broken payloads", () => {
    const r = toActivityRow({ id: "7", kind: "check_in", label: "Guest", is_minor: null, ref_kind: "venue", ref_id: "g1", summary: "Guest", at: "2026-10-15T09:00:00Z" });
    assert.equal(r?.id, 7);
    assert.equal(r?.kind, "check_in");
    assert.equal(toActivityRow({ id: 1, kind: "teleport", label: "x", at: "2026-10-15T09:00:00Z" }), null);
    assert.equal(toActivityRow({ kind: "join" }), null);
  });

  it("renders labels as given, with the drawn title patterns", () => {
    const b = activityEvent(row({}), ctx);
    assert.deepEqual([b.title, b.sub], ["Member #0042 booked Spin 45", "Today 6:00 PM · 18 of 20 now booked"]);
    assert.equal(activityEvent(row({ kind: "join", label: "Jane", summary: "Monthly" }), ctx).title, "Jane joined");
    assert.equal(activityEvent(row({ kind: "join", summary: null }), ctx).sub, "No plan");
    assert.equal(activityEvent(row({ kind: "end" }), ctx).title, "Member #0042 ended their membership");
    const ci = activityEvent(row({ kind: "check_in", label: "Guest", refId: "g1" }), ctx);
    assert.deepEqual([ci.title, ci.sub], ["Guest checked in", "Hamra"]);
    assert.equal(activityEvent(row({ kind: "order", summary: "Order #12" }), ctx).title, "Member #0042 placed Order #12");
    assert.equal(activityEvent(row({ kind: "payment", summary: "$40.00" }), ctx).title, "Member #0042 paid $40.00");
    assert.equal(activityEvent(row({ kind: "review", summary: "4 stars" }), ctx).sub, "4 stars");
    assert.equal(activityEvent(row({ isMinor: true }), ctx).isMinor, true);
  });

  it("merges by id, newest first, and marks only unseen ids as new", () => {
    const a = row({ id: 1, at: "2026-10-15T09:00:00Z" });
    const b = row({ id: 2, at: "2026-10-15T10:00:00Z" });
    assert.deepEqual(mergeActivity([a], [b, a]).map((r) => r.id), [2, 1]);
    assert.deepEqual(freshIds(null, [a, b]), []);
    assert.deepEqual(freshIds(new Set([1]), [a, b]), [2]);
  });

  it("keeps the last 30 days", () => {
    const now = new Date(2026, 9, 15, 12);
    assert.equal(activityEvents([row({ at: "2026-08-01T09:00:00Z" }), row({ id: 2 })], ctx, now).length, 1);
  });

  it("totals this week against last week (Monday first)", () => {
    const now = new Date(2026, 9, 15, 12); // a Thursday
    const t = weekTotals(
      true,
      [
        { kind: "join", at: new Date(2026, 9, 13, 10).toISOString() },
        { kind: "join", at: new Date(2026, 9, 6, 10).toISOString() },
        { kind: "join", at: new Date(2026, 9, 7, 10).toISOString() },
        { kind: "booking", at: new Date(2026, 9, 15, 9).toISOString() },
      ],
      [{ ...cls, createdAt: new Date(2026, 9, 14, 9).toISOString() }],
      now
    );
    assert.deepEqual(t.map((x) => [x.label, x.n, x.prev]), [["Joined", 1, 2], ["Ended", 0, 0], ["Booked", 1, 0], ["Classes", 1, 0]]);
    assert.equal(weekTotals(false, [], [], now).length, 2);
  });
});
