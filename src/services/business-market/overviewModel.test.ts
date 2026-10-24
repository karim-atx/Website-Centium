import { strict as assert } from "node:assert";
import { test } from "node:test";
import { classesLine, countDelta, heroDelta, heroView, ledgerRows, THIS_MONTH, membershipsLine, parseOverview, pctDelta, QUIET, sparkValues } from "./overviewModel.ts";

test("parseOverview reads the row (array or object), the measured reach and its sparkline, and keeps null deltas", () => {
  const row = {
    clients_reached: 3480,
    clients_reached_delta_pct: 12.4,
    sparkline: [
      { date: "2026-10-24", value: 7 },
      { date: "2026-10-23", value: 5 },
    ],
    active_offers: 2,
    active_offers_delta: 1,
    redemptions_this_month: 46,
    redemptions_delta_pct: 15,
    points_redeemed: 32600,
    points_redeemed_delta_pct: null,
  };
  assert.deepEqual(parseOverview([row]), {
    clientsReached: 3480,
    clientsReachedDeltaPct: 12.4,
    sparkline: [5, 7],
    activeOffers: 2,
    activeOffersDelta: 1,
    redemptionsThisMonth: 46,
    redemptionsDeltaPct: 15,
    pointsRedeemed: 32600,
    pointsRedeemedDeltaPct: null,
  });
  assert.equal(parseOverview(row)?.pointsRedeemed, 32600);
  assert.equal(parseOverview([]), null);
  assert.equal(parseOverview(null), null);
  assert.equal(parseOverview([{ active_offers: "3" }])?.activeOffers, 3);
  // A row without the reach columns: zero, no change, no series.
  assert.deepEqual([parseOverview([{}])?.clientsReached, parseOverview([{}])?.clientsReachedDeltaPct, parseOverview([{}])?.sparkline], [0, null, []]);
  assert.deepEqual(sparkValues([1, "2", null, { value: 3 }]), [1, 2, 3]);
});

test("hero: the measured clients_reached with its change, This month so far and the series; quiet when not answered", () => {
  const base = { clientsReached: 3480, clientsReachedDeltaPct: 12, sparkline: [1, 2, 3], activeOffers: 0, activeOffersDelta: null, redemptionsThisMonth: 0, redemptionsDeltaPct: null, pointsRedeemed: 0, pointsRedeemedDeltaPct: null };
  assert.deepEqual(heroView({ status: "ok", value: base }), { value: "3,480", delta: "+12% vs last month", sub: THIS_MONTH, series: [1, 2, 3] });
  // Last month had nobody: no change line (null from the server), never "+0%".
  assert.equal(heroView({ status: "ok", value: { ...base, clientsReachedDeltaPct: null } }).delta, null);
  assert.equal(heroView({ status: "ok", value: { ...base, clientsReachedDeltaPct: -3.4 } }).delta, "−3% vs last month");
  for (const s of [{ status: "loading" }, { status: "none" }, { status: "error" }, { status: "ok", value: null }] as const) {
    assert.deepEqual(heroView(s), { value: QUIET, delta: null, sub: null, series: null });
  }
});

test("deltas are written as the board does: +, U+2212 minus, quiet dash for none", () => {
  assert.equal(countDelta(1), "+1");
  assert.equal(countDelta(-2), "−2");
  assert.equal(countDelta(0), "0");
  assert.equal(countDelta(null), QUIET);
  assert.equal(pctDelta(15), "+15%");
  assert.equal(pctDelta(-3.4), "−3%");
  assert.equal(pctDelta(0), "0%");
  assert.equal(pctDelta(undefined), QUIET);
  assert.equal(heroDelta(12), "+12% vs last month");
  assert.equal(heroDelta(null), null);
});

test("ledger: not asked (no marketing), loading or failed shows the quiet value, never a number", () => {
  const rowsPending = ledgerRows({ status: "none" }, null);
  assert.deepEqual(
    rowsPending.map((r) => [r.label, r.value, r.delta]),
    [
      ["Active offers", QUIET, QUIET],
      ["Redemptions this month", QUIET, QUIET],
      ["Points redeemed", QUIET, QUIET],
    ]
  );
  assert.equal(ledgerRows({ status: "error" }, null)[0].value, QUIET);
  assert.equal(ledgerRows({ status: "loading" }, null)[2].value, QUIET);
});

test("ledger: the stage's figures, and a gym's two live rows with no change", () => {
  const ok = ledgerRows(
    { status: "ok", value: { clientsReached: 0, clientsReachedDeltaPct: null, sparkline: [], activeOffers: 1, activeOffersDelta: 1, redemptionsThisMonth: 12, redemptionsDeltaPct: 20, pointsRedeemed: 7200, pointsRedeemedDeltaPct: 14 } },
    { activeMemberships: 182, classBookingsThisWeek: 264, sessionsThisWeek: 38, plans: 4 }
  );
  assert.deepEqual(
    ok.map((r) => [r.label, r.value, r.delta]),
    [
      ["Active offers", "1", "+1"],
      ["Redemptions this month", "12", "+20%"],
      ["Points redeemed", "7,200", "+14%"],
      ["Active memberships", "182", QUIET],
      ["Class bookings this week", "264", QUIET],
    ]
  );
  const unknown = ledgerRows({ status: "ok", value: null }, { activeMemberships: null, classBookingsThisWeek: 0, sessionsThisWeek: null, plans: null });
  assert.equal(unknown[0].value, "0");
  assert.equal(unknown[3].value, QUIET);
  assert.equal(unknown[4].value, "0");
});

test("gym card lines leave out what isn't known", () => {
  assert.equal(membershipsLine(4, 182), "4 plans and passes · 182 active");
  assert.equal(membershipsLine(1, 0), "1 plan or pass · 0 active");
  assert.equal(membershipsLine(2, null), "2 plans and passes");
  assert.equal(classesLine(38, 264), "38 sessions this week · 264 booked");
  assert.equal(classesLine(1, null), "1 session this week");
  assert.equal(classesLine(null, null), "");
});
