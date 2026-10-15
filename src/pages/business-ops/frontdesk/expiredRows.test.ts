import { test } from "node:test";
import assert from "node:assert/strict";
import { expiredRows, expiredSub } from "./expiredRows";
import type { FrontDeskMember } from "../../../services/front-desk/frontDeskLogic";

const M = (o: Partial<FrontDeskMember>): FrontDeskMember =>
  ({ membershipId: Math.random().toString(36), gymId: "g", personId: "p", memberNumber: 1, label: "Member #0001", isMinor: false, planName: "Monthly", status: "expired", paymentMethod: "cash", paymentStatus: "paid", priceAgreed: 0, paidAt: null, markedPaidBy: null, startedOn: "2026-09-01", expiresOn: "2026-10-14", ...o }) as FrontDeskMember;

test("expired rows: lapsed in the last 7 days, not renewed since (OP1-017 row 11)", () => {
  const rows = expiredRows(
    [
      M({ membershipId: "a", personId: "p1", expiresOn: "2026-10-14" }),
      M({ membershipId: "b", personId: "p2", expiresOn: "2026-10-01" }),
      M({ membershipId: "c", personId: "p3", expiresOn: "2026-10-13" }),
      M({ membershipId: "c2", personId: "p3", status: "active", expiresOn: "2026-11-13" }),
      M({ membershipId: "d", personId: "p4", status: "cancelled", expiresOn: "2026-10-14" }),
      M({ membershipId: "e", personId: "p5", expiresOn: "2026-10-08" }),
    ],
    "2026-10-15"
  );
  assert.deepEqual(rows.map((r) => [r.membershipId, r.daysAgo]), [["a", 1], ["e", 7]]);
  assert.equal(expiredSub(1), "Expired yesterday");
  assert.equal(expiredSub(0), "Expired today");
  assert.equal(expiredSub(3), "Expired 3 days ago");
});
