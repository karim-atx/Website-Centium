import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  busiestDay,
  collected,
  dailySeries,
  describePaymentRefusal,
  isOwed,
  labelIsName,
  markTarget,
  owedFromRecords,
  owedItemFromRow,
  owedServerFilter,
  remindersLine,
  serverSentence,
  type MoneyOwedRow,
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

test("revenue: isOwed is pending with an agreed price above zero", () => {
  assert.equal(isOwed(rec({ status: "pending", amount: 15 })), true);
  assert.equal(isOwed(rec({ status: "pending", amount: null })), false);
  assert.equal(isOwed(rec({ status: "pending", amount: 0 })), false);
  assert.equal(isOwed(rec({ status: "paid", amount: 15 })), false);
  assert.equal(isOwed(rec({ kind: "membership", status: "pending", amount: 30, membershipStatus: "cancelled" })), false);
  assert.equal(isOwed(rec({ kind: "membership", status: "pending", amount: 30, membershipStatus: "active" })), true);
});

// ---------- B8 RV-02: money_owed ----------

const row = (o: Partial<MoneyOwedRow>): MoneyOwedRow => ({
  payment_id: "p1",
  source_kind: "membership",
  source_id: "m1",
  person_id: "u1",
  member_number: 3,
  label: "Member #0003",
  is_minor: false,
  gym_id: "g1",
  venue_name: "Flex Gym",
  price_type: "membership",
  amount: "120.00",
  method: "cash",
  due_on: "2026-10-07",
  days_overdue: 7,
  reminders_sent: "2",
  last_reminder_at: "2026-10-12T09:00:00Z",
  total_count: "3",
  ...o,
});

test("money owed: a masked label is never treated as a name", () => {
  assert.equal(labelIsName("Member #0003", 3), false);
  assert.equal(labelIsName("Member #0042", null), false);
  assert.equal(labelIsName("Member", null), false);
  assert.equal(labelIsName("Guest", null), false);
  assert.equal(labelIsName("Max", 3), true);
});

test("money owed: maps a server row, keeping its label, overdue days and reminders", () => {
  const recs = [rec({ key: "membership:m1", kind: "membership", id: "m1", item: "Monthly", startedOn: "2025-03-01" })];
  const i = owedItemFromRow(row({}), recs);
  assert.equal(i.key, "p1");
  assert.equal(i.paymentId, "p1");
  assert.equal(i.label, "Member #0003");
  assert.equal(i.who, null);
  assert.equal(i.amount, 120);
  assert.equal(i.overdue, 7);
  assert.equal(i.remindersSent, 2);
  assert.equal(i.item, "Monthly");
  assert.equal(i.startedOn, "2025-03-01");
  // A shared name gives initials; a guest has no account and no name.
  assert.equal(owedItemFromRow(row({ label: "Max" }), recs).who, "Max");
  const guest = owedItemFromRow(row({ label: "Guest", person_id: null, member_number: null }), []);
  assert.equal(guest.personId, null);
  assert.equal(guest.who, null);
  // No record for it: the price type's word.
  assert.equal(owedItemFromRow(row({ source_kind: "class_pack", price_type: "class_pack" }), []).item, "Class pack");
  assert.equal(owedItemFromRow(row({ days_overdue: 0 }), []).overdue, 0);
});

test("money owed: Item type as the server filter, and which kinds can be marked paid", () => {
  assert.equal(owedServerFilter("all"), "all");
  assert.equal(owedServerFilter("membership"), "memberships");
  assert.equal(owedServerFilter("class"), "classes");
  assert.deepEqual(markTarget({ sourceKind: "membership", sourceId: "m1" }), { kind: "membership", id: "m1" });
  assert.deepEqual(markTarget({ sourceKind: "class_booking", sourceId: "b1" }), { kind: "class", id: "b1" });
  assert.equal(markTarget({ sourceKind: "class_pack", sourceId: "k1" }), null);
});

test("money owed: before B8 the list comes from the records, filtered by item type", () => {
  const rs = [
    rec({ key: "a", kind: "class", status: "pending", amount: 20, dueOn: "2026-10-10" }),
    rec({ key: "b", kind: "membership", status: "pending", amount: 95, dueOn: "2026-10-01", membershipStatus: "active" }),
  ];
  assert.deepEqual(owedFromRecords(rs, "2026-10-14", "amount", "all").map((i) => i.key), ["b", "a"]);
  assert.deepEqual(owedFromRecords(rs, "2026-10-14", "amount", "class").map((i) => i.key), ["a"]);
  const b = owedFromRecords(rs, "2026-10-14", "overdue", "membership")[0];
  assert.equal(b.paymentId, null);
  assert.equal(b.overdue, 13);
});

test("money owed: reminder and undo refusals in the app's words", () => {
  assert.equal(
    describePaymentRefusal({ code: "ATX08", message: "this payment has no account to remind" }, "remind"),
    "They don't have a Centium account, so there's no one to message.",
  );
  assert.equal(describePaymentRefusal({ code: "ATX08", message: "no such payment" }, "remind"), "That payment isn't there any more.");
  assert.equal(describePaymentRefusal({ code: "ATX96", message: "x" }, "remind"), "They've blocked messages from your business.");
  assert.equal(
    describePaymentRefusal({ code: "22023", message: "that payment is not marked paid (it is pending)" }, "unmark"),
    "That payment is not marked paid (it is pending).",
  );
  assert.equal(
    describePaymentRefusal({ code: "ATX02" }, "remind"),
    "You've sent a lot of reminders in the last hour. Try again later.",
  );
  assert.equal(describePaymentRefusal({ code: "XX000" }, "remind"), "Couldn't send the reminder. Try again.");
  assert.equal(describePaymentRefusal({ code: "XX000" }, "unmark"), "Couldn't undo that. Try again.");
  assert.equal(serverSentence("", "Fallback."), "Fallback.");
  assert.equal(serverSentence("done!", "x"), "Done!");
});

test("money owed: reminders sent reads none yet, or the count and the last day", () => {
  assert.equal(remindersLine(0, null), "None yet");
  assert.equal(remindersLine(2, "2026-10-12T09:00:00"), "2, last 12 Oct");
  assert.equal(remindersLine(1, null), "1");
});
