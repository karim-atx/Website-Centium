import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { activeAt, funnel, mondayOf, noShowShare, ratingsByMonth, retentionCurve, rosterByMonth, rosterInsight, sessionsByWeek, stageAt, type StageChange } from "./practiceModel";
import { canDispute, canWithdraw, matchesFilter, receivedChip, sentChip, typeLabel } from "../../care/careModel";

const h = (clientId: string, toStage: StageChange["toStage"], changedAt: string): StageChange => ({ clientId, toStage, changedAt });

describe("practice insights", () => {
  const history = [h("a", "onboarding", "2026-01-05T10:00:00Z"), h("a", "active", "2026-01-10T10:00:00Z"), h("b", "active", "2026-03-01T10:00:00Z"), h("b", "completed", "2026-05-20T10:00:00Z")];

  it("reads a client's stage at a moment", () => {
    assert.equal(stageAt(history, "a", "2026-01-07T00:00:00Z"), "onboarding");
    assert.equal(stageAt(history, "b", "2026-06-01T00:00:00Z"), "completed");
    assert.equal(stageAt(history, "b", "2026-02-01T00:00:00Z"), null);
    assert.equal(activeAt(history, "2026-04-01T00:00:00Z"), 2);
    assert.equal(activeAt(history, "2026-06-01T00:00:00Z"), 1);
  });

  it("counts the roster by month", () => {
    const m = rosterByMonth(history, "2026-06-15", 6, "2026-06-15T12:00:00Z");
    assert.deepEqual(m.map((x) => x.label), ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]);
    assert.deepEqual(m.map((x) => x.added), [1, 0, 1, 0, 0, 0]);
    assert.deepEqual(m.map((x) => x.completed), [0, 0, 0, 0, 1, 0]);
    assert.equal(rosterInsight(m), "0.3 new clients a month, 0.2 finishing.");
  });

  it("hides retention below 5 clients", () => {
    const c = retentionCurve(history, "2026-10-01T00:00:00Z");
    assert.equal(c.every((p) => p.pct === null), true);
    const many = Array.from({ length: 5 }, (_, i) => h(`c${i}`, "active", "2026-01-01T00:00:00Z")).concat([h("c0", "paused", "2026-02-15T00:00:00Z")]);
    const r = retentionCurve(many, "2026-10-01T00:00:00Z", [1, 3]);
    assert.deepEqual(r, [
      { months: 1, of: 5, kept: 5, pct: 100 },
      { months: 3, of: 5, kept: 4, pct: 80 },
    ]);
  });

  it("buckets sessions by Monday-first week with no-show and late-cancel rates", () => {
    assert.equal(mondayOf("2026-10-18"), "2026-10-12");
    const w = sessionsByWeek(
      [
        { date: "2026-10-12", outcome: "completed" },
        { date: "2026-10-13", outcome: "no_show" },
        { date: "2026-10-14", outcome: null },
        { date: "2026-10-15", outcome: "late_cancel" },
      ],
      "2026-10-15",
      2
    );
    assert.deepEqual(w[1], { start: "2026-10-12", delivered: 2, noShowPct: 25, lateCancelPct: 25 });
    assert.equal(w[0].noShowPct, null);
    assert.equal(noShowShare([{ outcome: "no_show" }, { outcome: null }]), 50);
    assert.equal(noShowShare([]), null);
  });

  it("builds the enquiry funnel", () => {
    const f = funnel(
      [
        { clientId: "a", status: "accepted", requestedAt: "2026-01-01T00:00:00Z", resolvedAt: "2026-01-02T00:00:00Z" },
        { clientId: "x", status: "rejected", requestedAt: "2026-01-01T00:00:00Z", resolvedAt: "2026-01-02T00:00:00Z" },
        { clientId: "y", status: "pending", requestedAt: "2026-09-01T00:00:00Z", resolvedAt: null },
      ],
      [h("a", "active", "2026-01-02T00:00:00Z")],
      "2026-10-01T00:00:00Z"
    );
    assert.deepEqual(f, { enquiries: 3, hired: 1, hirePct: 33, stayed: 1, stayedOf: 1 });
  });

  it("averages ratings by month", () => {
    const r = ratingsByMonth(
      [
        { rating: 5, createdAt: "2026-10-02T00:00:00Z" },
        { rating: 4, createdAt: "2026-10-03T00:00:00Z" },
      ],
      "2026-10-15",
      2
    );
    assert.deepEqual(r, [
      { label: "Sep", long: "September", average: null, count: 0 },
      { label: "Oct", long: "October", average: 4.5, count: 2 },
    ]);
  });
});

describe("care network", () => {
  it("says honestly where a referral is", () => {
    assert.deepEqual(sentChip("awaiting_client", "John", "Maya"), { label: "Waiting for John", tone: "req" });
    assert.equal(sentChip("declined_by_client", "John", "Maya").label, "John said no");
    assert.equal(receivedChip("sent").label, "New");
    assert.equal(receivedChip("disputed").label, "With support");
    assert.equal(canWithdraw("sent"), true);
    assert.equal(canWithdraw("accepted"), false);
    assert.equal(canDispute("accepted"), true);
    assert.equal(canDispute("awaiting_client"), false);
    assert.equal(typeLabel("physiotherapist"), "Physiotherapist");
    assert.equal(typeLabel(null), "Health professional");
    assert.equal(matchesFilter("nutritionist", "dietitians"), true);
    assert.equal(matchesFilter("doctor", "physios"), false);
  });
});
