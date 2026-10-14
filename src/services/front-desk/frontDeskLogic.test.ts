import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  barHeights,
  daysBetween,
  entryFigures,
  entrySub,
  hourShort,
  normalizePassToken,
  renewals,
  renewalSub,
  scanResultView,
  toPassCheck,
  type Entry,
  type FrontDeskMember,
} from "./frontDeskLogic";

const member = (over: Partial<FrontDeskMember>): FrontDeskMember => ({
  membershipId: "m1",
  gymId: "g1",
  firstName: "Mina",
  isMinor: false,
  planName: "Monthly",
  status: "active",
  paymentMethod: "cash",
  paymentStatus: "paid",
  priceAgreed: 100,
  paidAt: null,
  markedPaidBy: null,
  startedOn: "2026-09-01",
  expiresOn: "2026-10-20",
  passState: "valid",
  joinedAt: "2026-09-01T10:00:00Z",
  ...over,
});

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
  assert.equal(toPassCheck({ valid: false, pass_state: "weird", membership_id: null, gym_id: null, member_first_name: null, member_is_minor: null, expires_on: null }).state, "unknown");
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
  const unk = scanResultView(toPassCheck({ ...base, member_first_name: null, pass_state: "unknown" }), { checkInsLive: false, sellsDayPass: false });
  assert.equal(unk.title, "Pass not recognised");
  assert.equal(unk.minor, false);
});

test("renewals: due within 7 days first (soonest), then expired within 7 days; cancelled and refunded left out", () => {
  const list = renewals(
    [
      member({ membershipId: "a", expiresOn: "2026-10-20" }),
      member({ membershipId: "b", expiresOn: "2026-10-15" }),
      member({ membershipId: "c", expiresOn: "2026-10-30" }),
      member({ membershipId: "d", expiresOn: "2026-10-08", status: "expired", passState: "expired" }),
      member({ membershipId: "e", expiresOn: "2026-10-13", passState: "expired" }),
      member({ membershipId: "f", expiresOn: "2026-10-16", status: "cancelled", passState: "cancelled" }),
      member({ membershipId: "g", expiresOn: "2026-10-01", status: "expired" }),
    ],
    "2026-10-14"
  );
  assert.deepEqual(
    list.map((r) => [r.membershipId, r.kind, r.days]),
    [
      ["b", "due", 1],
      ["a", "due", 6],
      ["e", "expired", -1],
      ["d", "expired", -6],
    ]
  );
  assert.equal(renewalSub(list[0]), "Monthly · renews tomorrow");
  assert.equal(renewalSub(list[1]), "Monthly · renews in 6 days");
  assert.equal(renewalSub(list[2]), "Monthly · Expired yesterday");
  assert.equal(renewalSub(list[3]), "Monthly · Expired 6 days ago");
  assert.equal(renewals([member({ expiresOn: "2026-10-30" })], "2026-10-14", 30).length, 1);
});

test("entries: today, in now (90 min, V6-29), denied; subs are 12-hour", () => {
  const now = new Date(2026, 9, 14, 18, 0);
  const at = (h: number, m: number) => new Date(2026, 9, 14, h, m).toISOString();
  const entries: Entry[] = [
    { id: "1", at: at(17, 0), method: "qr", result: "in", reason: null, memberLabel: "Mina" },
    { id: "2", at: at(16, 0), method: "desk", result: "in", reason: null, memberLabel: "Member #4F2A" },
    { id: "3", at: at(17, 30), method: "qr", result: "denied", reason: "expired", memberLabel: "Lina" },
    { id: "4", at: new Date(2026, 9, 13, 23, 0).toISOString(), method: "qr", result: "in", reason: null, memberLabel: "x" },
  ];
  assert.deepEqual(entryFigures(entries, now), { today: 2, inNow: 1, denied: 1 });
  assert.equal(entrySub(entries[0]), "QR pass · 5:00 PM");
  assert.equal(entrySub(entries[1]), "Checked in at desk · 4:00 PM");
  assert.equal(entrySub(entries[2]), "Expired · 5:30 PM");
});

test("bars are proportional to the busiest hour (D1) and hours read 6a / 12p", () => {
  assert.deepEqual(barHeights([0, 5, 10]), [0, 40.5, 81]);
  assert.deepEqual(barHeights([0, 0]), [0, 0]);
  assert.deepEqual([6, 12, 18, 0].map(hourShort), ["6a", "12p", "6p", "12a"]);
  assert.equal(daysBetween("2026-10-14", "2026-10-13"), -1);
});
