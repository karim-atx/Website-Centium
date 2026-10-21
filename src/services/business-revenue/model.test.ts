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
  byLedgerOrder,
  dayIn,
  describeRefundRefusal,
  figuresFromRecorded,
  figuresFromRecords,
  moneyCents,
  parseRefundAmount,
  readerTotals,
  recordedPlans,
  recordedSeries,
  recordedStreams,
  recordKeyOf,
  refundable,
  txItemFromRow,
  txPill,
  type PlanReaderRow,
  type StreamReaderRow,
  type TxReaderRow,
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
  assert.equal(remindersLine(2, "2026-10-12T09:00:00"), "2, last Oct 12");
  assert.equal(remindersLine(1, null), "1");
});

// ---------- B8 RV-01 / RV-04 ----------

const txRow = (o: Partial<TxReaderRow>): TxReaderRow => ({
  payment_id: o.payment_id ?? "p1",
  recorded_at: "2026-10-01T08:00:00Z",
  paid_at: "2026-10-01T08:00:00Z",
  paid_on: "2026-10-01",
  status: "paid",
  source_kind: "class_booking",
  price_type: "drop_in",
  person_id: "u1",
  member_number: 3,
  label: "Member #0003",
  gym_id: null,
  venue_name: null,
  method: "cash",
  amount: "15.00",
  refunded: "0",
  net: "15.00",
  provider_reference: null,
  total_count: 1,
  ...o,
});

test("recorded revenue: streams are the server's price types at net, with payments, plans and refunds", () => {
  const rows: StreamReaderRow[] = [
    { price_type: "membership", payments: 2, gross: "220.00", refunded: "20.00", net: "200.00" },
    { price_type: "drop_in", payments: "1", gross: "15.00", refunded: "0", net: "15.00" },
  ];
  const plans: PlanReaderRow[] = [
    { plan_id: "a", plan_name: "Monthly", payments: 1, gross: "120", refunded: "20", net: "100" },
    { plan_id: "b", plan_name: null, payments: 1, gross: "100", refunded: "0", net: "100" },
    { plan_id: null, plan_name: null, payments: 1, gross: "15", refunded: "0", net: "15" },
  ];
  const s = recordedStreams(rows, plans);
  assert.deepEqual(
    s.map((r) => [r.key, r.label, r.value]),
    [
      ["membership", "Memberships", 200],
      ["drop_in", "Drop-ins", 15],
    ],
  );
  assert.deepEqual(s[0].details, [
    { label: "Payments", value: "2" },
    { label: "Monthly", value: "$100" },
    { label: "Deleted plan", value: "$100" },
    { label: "Refunded", value: "−$20", bad: true },
  ]);
  assert.deepEqual(s[1].details, [{ label: "Payments", value: "1" }]);
  assert.deepEqual(readerTotals(rows), { net: 215, gross: 235, refunded: 20, payments: 3 });
});

test("recorded revenue: by plan keeps the null plan as Classes and other, and a deleted plan's row", () => {
  const p = recordedPlans([
    { plan_id: "a", plan_name: "Monthly", payments: 3, gross: "300", refunded: "0", net: "300" },
    { plan_id: null, plan_name: null, payments: 2, gross: "30", refunded: "0", net: "30" },
    { plan_id: "gone", plan_name: null, payments: 1, gross: "10", refunded: "0", net: "10" },
  ]);
  assert.deepEqual(
    p.map((r) => [r.key, r.label, r.value, r.n]),
    [
      ["a", "Monthly", 300, 3],
      ["none", "Classes and other", 30, 2],
      ["gone", "Deleted plan", 10, 1],
    ],
  );
  // The plans add up to the revenue: nothing is dropped.
  assert.equal(p.reduce((s, r) => s + r.value, 0), 340);
});

test("recorded revenue: the series uses the server's paid_on and net, and skips unpaid rows", () => {
  const period = { from: "2026-10-01", to: "2026-10-03" };
  const s = recordedSeries(
    [
      txRow({ payment_id: "a", paid_on: "2026-10-01", net: "15.00" }),
      txRow({ payment_id: "b", paid_on: "2026-10-03", price_type: "membership", amount: "120", refunded: "20", net: "100" }),
      txRow({ payment_id: "c", status: "pending", paid_on: null, paid_at: null }),
      txRow({ payment_id: "d", paid_on: "2026-09-30" }),
    ],
    period,
  );
  assert.deepEqual(s.days, ["2026-10-01", "2026-10-02", "2026-10-03"]);
  assert.deepEqual(s.total, [15, 0, 100]);
  assert.deepEqual(s.count, [1, 0, 1]);
  assert.deepEqual(s.byKind.drop_in, [15, 0, 0]);
  assert.deepEqual(s.byKind.membership, [0, 0, 100]);
});

test("recorded revenue: figures from the readers (totals, early rule input, per booking, denied)", () => {
  const p = { from: "2026-10-01", to: "2026-10-07" };
  const prev = { from: "2026-09-24", to: "2026-09-30" };
  const f = figuresFromRecorded(
    {
      denied: false,
      streams: [{ price_type: "drop_in", payments: 2, gross: "30", refunded: "0", net: "30" }],
      prevStreams: [{ price_type: "drop_in", payments: 1, gross: "15", refunded: "0", net: "15" }],
      plans: [],
      paid: [
        txRow({ payment_id: "a", paid_on: "2026-10-02" }),
        txRow({ payment_id: "b", paid_on: "2026-10-03" }),
        txRow({ payment_id: "c", paid_on: "2026-09-25" }),
        txRow({ payment_id: "m", paid_on: "2026-10-03", source_kind: "membership", price_type: "membership", net: "99" }),
      ],
      first: "2026-08-01",
    },
    p,
    prev,
  );
  assert.equal(f.live, true);
  assert.equal(f.tot, 30);
  assert.equal(f.totP, 15);
  assert.equal(f.anyPaid, true);
  assert.deepEqual(f.undated, { n: 0, amount: 0 });
  assert.deepEqual(f.bookings, { n: 2, amount: 30, nP: 1, amountP: 15 });
  const none = figuresFromRecorded({ denied: true, streams: [], prevStreams: [], plans: [], paid: [], first: null }, p, prev);
  assert.equal(none.denied, true);
  assert.equal(none.anyPaid, false);
  assert.equal(none.tot, 0);
});

test("recorded revenue: before B8 the figures are the records' sums", () => {
  const p = { from: "2026-10-01", to: "2026-10-07" };
  const prev = { from: "2026-09-24", to: "2026-09-30" };
  const f = figuresFromRecords(
    [
      rec({ amount: 15, paidAt: "2026-10-02T10:00:00" }),
      rec({ kind: "membership", amount: 45, paidUndated: true }),
    ],
    p,
    prev,
  );
  assert.equal(f.live, false);
  assert.equal(f.tot, 15);
  assert.deepEqual(f.undated, { n: 1, amount: 45 });
  assert.equal(f.streams[0].details[0].value, "$15");
});

test("transactions: a ledger row keeps its label, masks the avatar, and names part refunds", () => {
  const t = txItemFromRow(txRow({ amount: "15.00", refunded: "5.00", net: "10.00" }), "Spin 45");
  assert.equal(t.key, "p1");
  assert.equal(t.label, "Member #0003");
  assert.equal(t.who, null);
  assert.equal(t.item, "Spin 45");
  assert.equal(t.day, "2026-10-01");
  assert.equal(t.pill, "Part refunded");
  assert.equal(t.refunded, 5);
  const named = txItemFromRow(txRow({ label: "Rana", price_type: "membership" }));
  assert.equal(named.who, "Rana");
  assert.equal(named.item, "Membership");
  assert.equal(txItemFromRow(txRow({ label: "Guest" })).who, null);
  assert.equal(txPill("pending", 0), "Owed");
  assert.equal(txPill("refunded", 15), "Refunded");
  assert.equal(txPill("paid", 0), "Paid");
  assert.equal(recordKeyOf("membership", "x"), "membership:x");
  assert.equal(recordKeyOf("class_booking", "y"), "class:y");
  assert.equal(recordKeyOf("day_pass", "z"), null);
});

test("transactions: merged issue statuses keep the reader's order", () => {
  const rows = [
    txRow({ payment_id: "b", paid_at: null, recorded_at: "2026-10-02T09:00:00Z" }),
    txRow({ payment_id: "a", paid_at: "2026-10-03T09:00:00Z" }),
    txRow({ payment_id: "c", paid_at: "2026-10-02T09:00:00Z" }),
  ].sort(byLedgerOrder);
  assert.deepEqual(rows.map((r) => r.payment_id), ["a", "b", "c"]);
});

test("refunds: what is left, the amount field, and refusals with the server's figures", () => {
  assert.equal(refundable("paid", 15, 5), 10);
  assert.equal(refundable("pending", 15, 0), 0);
  assert.equal(refundable("refunded", 15, 15), 0);
  assert.deepEqual(parseRefundAmount("7.5", 10), { ok: true, value: 7.5 });
  assert.deepEqual(parseRefundAmount("$10", 10), { ok: true, value: 10 });
  assert.deepEqual(parseRefundAmount("", 10), { ok: false, message: "Enter an amount." });
  assert.deepEqual(parseRefundAmount("0", 10), { ok: false, message: "Enter an amount above $0." });
  assert.deepEqual(parseRefundAmount("10.01", 10), { ok: false, message: "You can refund up to $10." });
  assert.deepEqual(parseRefundAmount("1.234", 10), { ok: false, message: "Enter an amount in dollars and cents, like 7.50." });
  assert.equal(moneyCents(7.5), "$7.50");
  assert.equal(moneyCents(1500), "$1,500");
  assert.equal(
    describeRefundRefusal({ code: "22023", message: "that would refund 20.00, more than the 15.00 paid (0.00 already refunded)" }),
    "That would refund $20, more than the $15 paid ($0 already refunded).",
  );
  assert.equal(
    describeRefundRefusal({ code: "22023", message: "that payment has not been paid, so there is nothing to refund (it is pending)" }),
    "That payment has not been paid, so there is nothing to refund (it is pending).",
  );
  assert.equal(describeRefundRefusal({ code: "ATX09" }), "You need the Revenue permission to do this.");
  assert.equal(describeRefundRefusal({ code: "XX000" }), "Couldn't record the refund. Try again.");
  // The business's own day, as the readers date it.
  assert.equal(dayIn("2026-10-05T22:30:00Z", "Asia/Beirut"), "2026-10-06");
  assert.equal(dayIn("2026-10-05T22:30:00Z", "UTC"), "2026-10-05");
});

test("CN: a membership granted by a member code is never revenue, but is still a member and still renews", async () => {
  const { activeMembers } = await import("./model.ts");
  const p = { from: "2026-10-01", to: "2026-10-31" };
  const today = "2026-10-21";
  const sold = rec({ key: "membership:a", id: "a", kind: "membership", amount: 40, paidUndated: true, membershipStatus: "active", startedOn: "2026-10-05", expiresOn: "2026-11-04", createdAt: "2026-10-05T09:00:00" });
  const grant = rec({ key: "membership:g", id: "g", kind: "membership", amount: 0, paidUndated: false, granted: true, membershipStatus: "active", startedOn: "2026-10-10", expiresOn: "2026-11-09", createdAt: "2026-10-10T09:00:00" });
  // Even dated, a grant is no payment.
  const datedGrant = { ...grant, key: "membership:h", id: "h", paidAt: "2026-10-10T09:00:00" };
  const records = [sold, grant, datedGrant];
  assert.deepEqual(undatedPaid(records), { n: 1, amount: 40 });
  assert.deepEqual(transactions(records, p).map((t) => t.rec.id), ["a"]);
  assert.equal(collected(records, p), 0);
  assert.equal(recurringMonthly(records, today), 40);
  assert.equal(figuresFromRecords(records, p, { from: "2026-09-01", to: "2026-09-30" }).anyPaid, true);
  assert.equal(figuresFromRecords([grant], p, { from: "2026-09-01", to: "2026-09-30" }).anyPaid, false);
  assert.equal(activeMembers(records, today), 3);
  assert.deepEqual(renewals([sold, grant], today).map((r) => r.rec.id), ["a", "g"]);
  // Without renewal_price a grant's renewal amount is unknown (never $0).
  assert.deepEqual(renewals([sold, grant], today).map((r) => r.amount), [40, null]);
});

test("251ab70: renewals are expected at venue_renewals_due.renewal_price, a grant at its plan price", async () => {
  const { renewalAmountText } = await import("./model.ts");
  const today = "2026-10-21";
  const sold = rec({ key: "membership:a", id: "a", kind: "membership", amount: 40, membershipStatus: "active", expiresOn: "2026-10-24" });
  const grant = rec({ key: "membership:g", id: "g", kind: "membership", amount: 0, granted: true, membershipStatus: "active", expiresOn: "2026-10-25" });
  const noPrice = rec({ key: "membership:n", id: "n", kind: "membership", amount: 20, membershipStatus: "active", expiresOn: "2026-10-26" });
  const due = [
    { membershipId: "a", cancelAtPeriodEnd: false, renewalPrice: 45 },
    { membershipId: "g", cancelAtPeriodEnd: false, renewalPrice: 29 },
    { membershipId: "n", cancelAtPeriodEnd: false, renewalPrice: null },
  ];
  const r = renewals([sold, grant, noPrice], today, due);
  assert.deepEqual(r.map((x) => x.amount), [45, 29, null]);
  assert.deepEqual(r.map(renewalAmountText), ["$45", "$29", "Not available"]);
  assert.equal(renewalWeeks(r, today)[0].total, 74);
  // An older stack (no renewal_price): the agreed price, and "Plan price" for a grant.
  const old = renewals([sold, grant], today, due.slice(0, 2).map(({ membershipId, cancelAtPeriodEnd }) => ({ membershipId, cancelAtPeriodEnd })));
  assert.deepEqual(old.map(renewalAmountText), ["$40", "Plan price"]);
});
