import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  alreadyInView,
  barHeights,
  checkInView,
  dayPassPlans,
  daysBetween,
  deniedLine,
  deskMessage,
  deskMoney,
  entrySub,
  hourBins,
  hourCounts,
  isDeskMethod,
  isoWeekday,
  mondayOf,
  peakHour,
  rightNowLabel,
  toBusyGrid,
  toCheckIn,
  toDeskSale,
  toDeskSummary,
  toEntry,
  weekSales,
  type CheckInRow,
  type DeskSaleRow,
  type EntryRow,
  type PlanRow,
  hourShort,
  normalizePassToken,
  membershipActionMessage,
  renewalRateLabel,
  renewalSub,
  sortRenewals,
  toChase,
  toRenewalDue,
  toRenewalStats,
  scanResultView,
  toPassCheck,
  type Entry,
  type RenewalDueRow,
} from "./frontDeskLogic";

test("pass tokens: 32 hex, any case, trimmed; anything else refused", () => {
  assert.equal(normalizePassToken(" ED9B7FEC01069937F316FC421E7046D4\n"), "ed9b7fec01069937f316fc421e7046d4");
  assert.equal(normalizePassToken("https://example.com"), null);
  assert.equal(normalizePassToken("abc"), null);
});

test("verify rows map to a pass check; an unknown state is unknown", () => {
  const c = toPassCheck({ valid: true, pass_state: "valid", membership_id: "m", gym_id: "g", member_first_name: " Jo ", member_is_minor: true, expires_on: "2026-10-27" });
  assert.equal(c.valid, true);
  assert.equal(c.firstName, "Jo");
  assert.equal(c.isMinor, true);
  assert.equal(toPassCheck({ valid: false, pass_state: "weird", membership_id: null, gym_id: null, member_first_name: null, member_is_minor: null, expires_on: null }).state, "unavailable");
  assert.equal(toPassCheck(null).state, "unknown");
});

test("valid before B10 never says checked in (R2); with plan name (V6-159) the body names it", () => {
  const c = toPassCheck({ valid: true, pass_state: "valid", membership_id: "m", gym_id: "g", member_first_name: "Mina", member_is_minor: false, expires_on: "2026-10-27" });
  const v = scanResultView(c, { checkInsLive: false, sellsDayPass: false });
  assert.equal(v.title, "Mina's pass is valid");
  assert.equal(v.body, "Valid until 27 Oct 2026");
  assert.equal(scanResultView(c, { checkInsLive: true, sellsDayPass: false }).title, "Mina is checked in");
  assert.equal(scanResultView({ ...c, planName: "Monthly" }, { checkInsLive: true, sellsDayPass: false }).body, "Monthly · valid until 27 Oct 2026");
});

test("payment due offers Mark as paid; expired offers a day pass only when sold; unknown names nobody", () => {
  const base = { valid: false, membership_id: "m", gym_id: "g", member_first_name: "Lina", member_is_minor: true, expires_on: "2026-10-08" };
  const pay = scanResultView(toPassCheck({ ...base, pass_state: "awaiting_payment" }), { checkInsLive: false, sellsDayPass: false });
  assert.equal(pay.primary, "mark-paid");
  assert.equal(pay.title, "Payment due");
  assert.equal(pay.minor, true);
  const exp = toPassCheck({ ...base, pass_state: "expired" });
  assert.equal(scanResultView(exp, { checkInsLive: false, sellsDayPass: false }).secondaryLabel, "Done");
  assert.equal(scanResultView(exp, { checkInsLive: false, sellsDayPass: true }).secondaryLabel, "Sell a day pass");
  assert.equal(scanResultView(exp, { checkInsLive: false, sellsDayPass: false }).body, "Lina's pass ended on 8 Oct 2026. They can renew in the app.");
  const unk = scanResultView(toPassCheck({ ...base, membership_id: null, gym_id: null, member_first_name: null, pass_state: "unknown" }), { checkInsLive: false, sellsDayPass: false });
  assert.equal(unk.title, "Pass not recognised");
  assert.equal(unk.minor, false);
});

test("renewals (MB-05): server rows map; to chase first, then ending, then renewed; subs say what was decided", () => {
  const row = (id: string, days: number, over: Partial<RenewalDueRow> = {}): RenewalDueRow => ({
    membership_id: id, member_label: "Mina", member_is_minor: false, plan_name: "Monthly", expires_on: "2026-10-20",
    days_left: days, cancel_at_period_end: false, payment_status: "paid", already_renewed: false, total_count: 3, ...over,
  });
  const list = sortRenewals([
    toRenewalDue(row("r", 1, { already_renewed: true }), "g"),
    toRenewalDue(row("e", 2, { cancel_at_period_end: true }), "g"),
    toRenewalDue(row("b", 6), "g"),
    toRenewalDue(row("a", 0), "g"),
  ]);
  assert.deepEqual(list.map((r) => r.membershipId), ["a", "b", "e", "r"]);
  assert.deepEqual(toChase(list).map((r) => r.membershipId), ["a", "b"]);
  assert.equal(renewalSub(list[0]), "Monthly · renews today");
  assert.equal(renewalSub(list[1]), "Monthly · renews in 6 days");
  assert.equal(renewalSub(list[2]), "Monthly · ends 20 Oct 2026");
  assert.equal(renewalSub(list[3]), "Monthly · renewed, next period from 20 Oct 2026");
  assert.equal(toRenewalDue(row("x", 1, { member_label: null, plan_name: null }), "g").planName, "Membership");
});

test("renewal rate: NULL is \"–\" with \"No renewals were due\", never 0% or 100%", () => {
  const s = toRenewalStats({ period_from: "2026-09-14", period_to: "2026-10-14", due: 0, renewed: 0, lapsed: 0, cancelled: 0, renewal_rate: null });
  assert.deepEqual(renewalRateLabel(s), { value: "–", note: "No renewals were due" });
  assert.deepEqual(renewalRateLabel(toRenewalStats({ period_from: "a", period_to: "b", due: 4, renewed: 3, lapsed: 0, cancelled: 1, renewal_rate: "0.7500" })), { value: "75%", note: null });
});

test("renew / end refusals have copy (ATX10, ATX25, ATX09)", () => {
  assert.equal(membershipActionMessage("ATX10", "renew"), "This membership has already been renewed.");
  assert.equal(membershipActionMessage("ATX25", "renew"), "This plan has been archived. Move the member to a current plan first.");
  assert.equal(membershipActionMessage("ATX10", "end"), "This membership has already ended.");
  assert.equal(membershipActionMessage("ATXC5", "renew"), "This membership is set to end, so it can't be renewed.");
  assert.equal(membershipActionMessage(undefined, "end"), "Couldn't end the membership. Try again.");
});

test("pass_state 'upcoming' is not in force; 'unknown' for a membership and valid/valid-false disagreements are unavailable, never valid", () => {
  const row = { valid: false, membership_id: "m", gym_id: "g", member_first_name: "Jo", member_is_minor: false, expires_on: "2026-12-01" };
  const err = console.error;
  console.error = () => undefined;
  assert.equal(toPassCheck({ ...row, pass_state: "unknown" }).state, "unavailable");
  assert.equal(toPassCheck({ ...row, pass_state: "valid" }).state, "unavailable");
  assert.equal(toPassCheck({ ...row, pass_state: "weird" }).state, "unavailable");
  console.error = err;
  assert.equal(toPassCheck({ ...row, membership_id: null, pass_state: "unknown" }).state, "unknown");
  assert.equal(scanResultView(toPassCheck({ ...row, pass_state: "unknown", membership_id: "m" }), { checkInsLive: false, sellsDayPass: false }).title, "Status unavailable");
  const c = toPassCheck({ ...row, pass_state: "upcoming" });
  assert.equal(c.state, "upcoming");
  assert.equal(c.valid, false);
  assert.equal(scanResultView(c, { checkInsLive: false, sellsDayPass: false }).title, "Pass not active yet");
});

test("entries (desk_entries): first names, guests, day passes; subs are 12-hour", () => {
  const at = (h: number, m: number) => new Date(2026, 9, 14, h, m).toISOString();
  const row = (o: Partial<EntryRow>): EntryRow => ({
    check_in_id: "x",
    at: at(17, 0),
    result: "in",
    deny_reason: null,
    method: "qr",
    person_id: "p",
    member_first_name: "Mina",
    member_is_minor: false,
    guest_label: null,
    host_first_name: null,
    plan_name: "Monthly",
    is_day_pass: false,
    total_count: 1,
    ...o,
  });
  assert.equal(entrySub(toEntry(row({}))), "QR pass · 5:00 PM");
  assert.equal(entrySub(toEntry(row({ method: "manual", at: at(16, 0) }))), "Checked in at desk · 4:00 PM");
  const denied = toEntry(row({ result: "denied", deny_reason: "expired", at: at(17, 30) }));
  assert.equal(denied.reason, "expired");
  assert.equal(entrySub(denied), "Expired · 5:30 PM");
  const guest = toEntry(row({ person_id: null, member_first_name: null, guest_label: "Sam K", host_first_name: "Mina", method: "manual" }));
  assert.equal(guest.title, "Sam K");
  assert.equal(entrySub(guest), "Guest of Mina · 5:00 PM");
  const walkIn = toEntry(row({ person_id: null, member_first_name: null, guest_label: "Rae", is_day_pass: true, method: "manual" }));
  assert.equal(walkIn.isGuest, false);
  assert.equal(entrySub(walkIn), "Day pass · 5:00 PM");
  const unknown = toEntry(row({ person_id: null, member_first_name: null, result: "denied", deny_reason: null }));
  assert.equal(unknown.title, "Unknown pass");
  assert.equal(entrySub(unknown), "Not recognised · 5:00 PM");
  assert.equal(isDeskMethod("manual"), true);
  assert.equal(isDeskMethod("nfc"), false);
});

test("check-in rows: recorded in says checked in (R1); denials pick their pop-up; already in writes nothing (R9)", () => {
  const base: CheckInRow = {
    check_in_id: "c",
    result: "in",
    deny_reason: null,
    already_in: false,
    membership_id: "m",
    member_first_name: " Mina ",
    member_is_minor: false,
    plan_name: "Monthly",
    expires_on: "2026-12-01",
    pass_state: "valid",
  };
  const v = (o: Partial<CheckInRow>, sells = false) => checkInView(toCheckIn({ ...base, ...o })!, { sellsDayPass: sells });
  assert.equal(v({}).title, "Mina is checked in");
  assert.equal(v({ result: "denied", deny_reason: "expired", pass_state: "expired" }, true).secondaryLabel, "Sell a day pass");
  assert.equal(v({ result: "denied", deny_reason: "unpaid", pass_state: "awaiting_payment" }).primary, "mark-paid");
  assert.equal(v({ result: "denied", deny_reason: "unpaid", pass_state: "refunded" }).title, "Pass refunded");
  assert.equal(v({ result: "denied", deny_reason: "not_started", pass_state: "upcoming" }).title, "Pass not active yet");
  assert.equal(v({ result: "denied", deny_reason: "no_pass", pass_state: "cancelled" }).title, "Membership cancelled");
  const unknown = v({ result: "denied", deny_reason: "no_pass", membership_id: null, member_first_name: null, pass_state: "unknown" });
  assert.equal(unknown.title, "Pass not recognised");
  assert.equal(unknown.body.includes("Mina"), false);
  assert.equal(v({ result: "denied", deny_reason: "other_venue" }).title, "Pass for another venue");
  assert.equal(v({ result: "denied", deny_reason: "under_min_age", member_is_minor: true }).minor, false);
  // A row that doesn't say exactly "in" is never admitted.
  assert.equal(toCheckIn({ ...base, result: "weird" as "in" })!.result, "denied");
  const again = checkInView(toCheckIn({ ...base, already_in: true })!, { sellsDayPass: false, alreadyAt: new Date(2026, 9, 14, 18, 5).toISOString() });
  assert.equal(again.title, "Already checked in");
  assert.equal(again.body, "Mina came in at 6:05 PM.");
  assert.equal(again.secondaryLabel, "Done");
  assert.equal(alreadyInView(null, null).body, "This member came in within the last 4 hours.");
  assert.equal(deniedLine("guest_limit"), "Not checked in: no guest passes left this month.");
});

test("desk summary: numbers coerced; right_now null is 'Not enough data yet', never Quiet", () => {
  const s = toDeskSummary({ entries_today: "12", denied_today: 1, in_now: 4, last_hour: 3, typical_hour: null, right_now: null, day_passes_this_week: 2, guest_passes_this_month: "0" });
  assert.equal(s.entriesToday, 12);
  assert.equal(s.rightNow, null);
  assert.equal(s.typicalHour, null);
  assert.equal(rightNowLabel(s.rightNow), "Not enough data yet");
  assert.equal(rightNowLabel(toDeskSummary({ ...{ entries_today: 0, denied_today: 0, in_now: 0, last_hour: 0, typical_hour: "2.5", day_passes_this_week: 0, guest_passes_this_month: 0 }, right_now: "busy" }).rightNow), "Busy");
  assert.equal(toDeskSummary(null).entriesToday, 0);
});

test("busy times: 168 cells into a 7 × 24 grid; the peak hour; Monday is 1", () => {
  const rows = [];
  for (let d = 1; d <= 7; d++) for (let h = 0; h < 24; h++) rows.push({ weekday: d, hour: h, average_entries: d === 2 && h === 18 ? "3.25" : "0.00" });
  const g = toBusyGrid(rows);
  assert.equal(g.length, 7);
  assert.equal(g[1][18], 3.25);
  assert.equal(peakHour(g[1]), 18);
  assert.equal(peakHour(g[0]), null);
  assert.equal(isoWeekday(new Date(2026, 9, 12)), 1); // a Monday
  assert.equal(isoWeekday(new Date(2026, 9, 18)), 7);
  assert.equal(mondayOf(new Date(2026, 9, 15)), "2026-10-12");
});

test("hour bins: one per opening hour (D3), entries outside still get a bar, no hours runs to now", () => {
  const day = { closed: false, open_24h: false, opens_at: "06:00:00", closes_at: "22:00:00" };
  assert.deepEqual(hourBins(day, [], 9), Array.from({ length: 16 }, (_, i) => 6 + i));
  assert.equal(hourBins(day, [5], 9)[0], 5);
  assert.equal(hourBins({ ...day, closes_at: "00:00:00" }, [], 9).at(-1), 23);
  assert.equal(hourBins({ ...day, open_24h: true }, [], 9).length, 24);
  assert.deepEqual(hourBins(null, [7, 9], 11), [7, 8, 9, 10, 11]);
  assert.deepEqual(hourBins({ ...day, closed: true }, [], 11), []);
  const e = (h: number, result: "in" | "denied" = "in"): Entry => ({ id: String(h) + result, at: new Date(2026, 9, 14, h, 10).toISOString(), method: "qr", result, reason: null, personId: null, title: "x", hostName: null, isGuest: false, isDayPass: false, planName: null });
  assert.deepEqual(hourCounts([e(7), e(7), e(8, "denied")], [7, 8]), [{ hour: 7, count: 2 }, { hour: 8, count: 0 }]);
});

test("day passes: the server's test (day_pass type, daily, or 1 day) and on sale; week sales count all, sum the paid", () => {
  const p = (o: Partial<PlanRow>): PlanRow => ({ id: "x", name: "Plan", price: "15.00", billing: "monthly", plan_type: "membership", status: "active", valid_for_days: null, ...o });
  const plans = dayPassPlans([p({ id: "a", billing: "daily", name: "Day pass" }), p({ id: "b" }), p({ id: "c", plan_type: "day_pass", status: "paused" }), p({ id: "d", valid_for_days: 1, price: 10 })]);
  assert.deepEqual(plans.map((x) => x.id), ["d", "a"]);
  assert.equal(plans[1].price, 15);
  const sale = (paid: boolean, amount: string): DeskSaleRow => ({ id: amount, gym_id: "g", plan_name: "Day pass", person_id: null, guest_label: "Rae", amount, payment_status: paid ? "paid" : "pending", sold_at: "2026-10-14T10:00:00Z", sold_on: "2026-10-14" });
  assert.deepEqual(weekSales([sale(true, "15.00"), sale(false, "15.00"), sale(true, "12.50")].map(toDeskSale)), { sold: 3, revenue: 27.5 });
  assert.equal(deskMoney(465), "$465");
  assert.equal(deskMoney(27.5), "$27.50");
});

test("desk refusals: ATXE6 desk off, ATXE7 under age, ATXC4 paused; others fall back", () => {
  assert.equal(deskMessage("ATXE6", "x"), "Check-in at the desk is turned off for this venue.");
  assert.equal(deskMessage("ATXE7", "x"), "They're under this venue's minimum entry age.");
  assert.equal(deskMessage("ATXC4", "x"), "This day pass is paused, so it can't be sold.");
  assert.equal(deskMessage("PGRST999", "fallback"), "fallback");
});

test("bars are proportional to the busiest hour (D1) and hours read 6a / 12p", () => {
  assert.deepEqual(barHeights([0, 5, 10]), [0, 40.5, 81]);
  assert.deepEqual(barHeights([0, 0]), [0, 0]);
  assert.deepEqual([6, 12, 18, 0].map(hourShort), ["6a", "12p", "6p", "12a"]);
  assert.equal(daysBetween("2026-10-14", "2026-10-13"), -1);
});
