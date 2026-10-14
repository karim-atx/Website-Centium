import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  busiestDay,
  collected,
  dailySeries,
  money,
  owed,
  pctDelta,
  recurringMonthly,
  renewals,
  renewalWeeks,
  sortOwed,
  transactions,
  undatedPaid,
  type PaymentRecord,
} from "./model.ts";

const rec = (o: Partial<PaymentRecord>): PaymentRecord => ({
  key: o.key ?? `class:${Math.random()}`,
  kind: "class",
  id: "x",
  gymId: null,
  amount: 20,
  status: "paid",
  method: "cash",
  paidAt: null,
  paidUndated: false,
  createdAt: "2026-10-01T09:00:00",
  dueOn: null,
  who: "Max",
  isMinor: false,
  item: "Spin 45",
  membershipStatus: null,
  startedOn: null,
  expiresOn: null,
  ...o,
});

test("revenue: formats money like the handover", () => {
  assert.equal(money(18420), "$18,420");
  assert.equal(money(-970), "−$970");
  assert.equal(money(0), "$0");
});

test("revenue: counts only payments with a known paid date in the period", () => {
  const rs = [
    rec({ paidAt: "2026-10-05T10:00:00", amount: 15 }),
    rec({ paidAt: "2026-09-01T10:00:00", amount: 99 }),
    rec({ kind: "membership", paidUndated: true, amount: 120, membershipStatus: "active" }),
    rec({ status: "pending", amount: 30 }),
  ];
  assert.equal(collected(rs, { from: "2026-09-17", to: "2026-10-14" }), 15);
  assert.deepEqual(undatedPaid(rs), { n: 1, amount: 120 });
  const s = dailySeries(rs, { from: "2026-10-04", to: "2026-10-06" });
  assert.deepEqual(s.total, [0, 15, 0]);
  assert.deepEqual(s.count, [0, 1, 0]);
});

test("revenue: gives no percentage without a previous amount", () => {
  assert.equal(pctDelta(100, 0), null);
  assert.equal(pctDelta(109, 100), "+9%");
  assert.equal(pctDelta(90, 100), "−10%");
});

test("revenue: lists money owed with days overdue and sorts both ways", () => {
  const rs = [
    rec({ key: "a", status: "pending", amount: 95, dueOn: "2026-10-05" }),
    rec({ key: "b", status: "pending", amount: 130, dueOn: "2026-10-12" }),
    rec({ key: "c", status: "pending", amount: null, dueOn: "2026-10-01" }),
    rec({ key: "d", kind: "membership", status: "pending", amount: 50, membershipStatus: "cancelled", dueOn: "2026-10-01" }),
  ];
  const o = owed(rs, "2026-10-14");
  assert.deepEqual(
    o.map((x) => x.rec.key),
    ["a", "b"]
  );
  assert.equal(o[0].overdue, 9);
  assert.deepEqual(
    sortOwed(o, "amount").map((x) => x.rec.key),
    ["b", "a"]
  );
  assert.deepEqual(
    sortOwed(o, "overdue").map((x) => x.rec.key),
    ["a", "b"]
  );
});

test("revenue: groups renewals in Monday weeks inside 30 days", () => {
  const m = (key: string, expiresOn: string) => rec({ key, kind: "membership", membershipStatus: "active", expiresOn, startedOn: "2026-09-27", amount: 100 });
  const rs = [m("a", "2026-10-14"), m("b", "2026-10-19"), m("c", "2026-11-12"), m("d", "2026-11-13"), m("e", "2026-10-19")];
  const r = renewals(rs, "2026-10-14");
  assert.deepEqual(
    r.map((x) => x.rec.key),
    ["a", "b", "e", "c"]
  );
  const w = renewalWeeks(r, "2026-10-14");
  assert.equal(w[0].from, "2026-10-12");
  assert.equal(w[0].to, "2026-10-18");
  assert.deepEqual(
    w.map((x) => x.rows.length),
    [1, 2, 0, 0, 1]
  );
  assert.deepEqual(busiestDay(r), { day: "2026-10-19", n: 2 });
});

test("revenue: normalises recurring memberships per month and skips day passes", () => {
  const rs = [
    rec({ kind: "membership", membershipStatus: "active", startedOn: "2026-09-27", expiresOn: "2026-10-27", amount: 120 }),
    rec({ kind: "membership", membershipStatus: "active", startedOn: "2026-10-01", expiresOn: "2027-10-01", amount: 1200 }),
    rec({ kind: "membership", membershipStatus: "active", startedOn: "2026-10-07", expiresOn: "2026-10-08", amount: 15 }),
  ];
  assert.equal(recurringMonthly(rs, "2026-10-14"), 220);
});

test("revenue: lists transactions newest first", () => {
  const rs = [rec({ key: "x", paidAt: "2026-10-03T10:00:00" }), rec({ key: "y", status: "pending", createdAt: "2026-10-05T10:00:00" })];
  assert.deepEqual(
    transactions(rs, { from: "2026-10-01", to: "2026-10-14" }).map((t) => [t.rec.key, t.status]),
    [
      ["y", "Owed"],
      ["x", "Paid"],
    ]
  );
});
