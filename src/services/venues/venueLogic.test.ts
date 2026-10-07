import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  addDaysIso,
  cancellationLine,
  currentMembership,
  dayMonthYear,
  hostedImageUrl,
  isLateCancellation,
  memberTag,
  membershipFromLine,
  planLine,
  planSaving,
  qrModules,
  reviewAge,
  sortPlans,
  stage4Message,
  storagePath,
  validRange,
  type PlanLite,
} from "./venueLogic.ts";

const monthly: PlanLite = { id: "m", name: "Monthly", price: 45, billing: "monthly" };
const yearly: PlanLite = { id: "y", name: "Yearly", price: 420, billing: "annually" };
const day: PlanLite = { id: "d", name: "Day pass", price: 8, billing: "daily" };

test("membershipFromLine prefers the cheapest monthly plan", () => {
  assert.equal(membershipFromLine([yearly, monthly, { ...monthly, id: "m2", price: 60 }, day]), "Membership from $45/month");
});

test("membershipFromLine falls back to the cheapest plan in its own unit", () => {
  assert.equal(membershipFromLine([yearly, day]), "Membership from $8/day");
  assert.equal(membershipFromLine([]), null);
});

test("planSaving matches the frame's yearly saving against 12 months", () => {
  assert.equal(planSaving(yearly, [monthly, yearly]), 22);
  assert.equal(planSaving(monthly, [monthly, yearly]), null);
  assert.equal(planSaving(yearly, [yearly]), null);
  assert.equal(planSaving({ ...yearly, price: 600 }, [monthly]), null);
});

test("sortPlans orders cheapest first", () => {
  assert.deepEqual(sortPlans([yearly, monthly, day]).map((p) => p.id), ["d", "m", "y"]);
});

test("memberTag names each pass_state", () => {
  assert.deepEqual(memberTag("valid"), { label: "Member", tone: "member" });
  assert.deepEqual(memberTag("awaiting_payment"), { label: "Pay on your first visit", tone: "pending" });
  assert.equal(memberTag("expired").tone, "muted");
});

test("currentMembership takes the active row for the venue", () => {
  const rows = [
    { id: "1", gymId: "g", status: "cancelled" },
    { id: "2", gymId: "g", status: "active" },
    { id: "3", gymId: "h", status: "active" },
  ];
  assert.equal(currentMembership(rows, "g")?.id, "2");
  assert.equal(currentMembership(rows, "x"), null);
});

test("dates read as the pass draws them", () => {
  assert.equal(dayMonthYear("2026-10-01"), "1 Oct 2026");
  assert.equal(validRange("2026-10-01", "2027-01-01"), "1 Oct 2026 to 1 Jan 2027");
  assert.equal(validRange("2026-10-01", null), "From 1 Oct 2026");
  assert.equal(addDaysIso("2026-12-29", 6), "2027-01-04");
});

test("planLine adds 'membership' once", () => {
  assert.equal(planLine("Monthly"), "Monthly membership");
  assert.equal(planLine("3-month membership"), "3-month membership");
});

test("qrModules reads 0 as dark", () => {
  assert.deepEqual(qrModules([0, 255, 255, 0], 2, 2), [
    [true, false],
    [false, true],
  ]);
});

test("late cancellation is inside the window", () => {
  const now = new Date("2026-10-07T10:00:00Z");
  assert.equal(isLateCancellation("2026-10-07T20:00:00Z", 12, now), true);
  assert.equal(isLateCancellation("2026-10-08T00:00:00Z", 12, now), false);
  assert.equal(cancellationLine(12), "Free cancellation up to 12 hours before.");
  assert.equal(cancellationLine(1), "Free cancellation up to 1 hour before.");
});

test("stage4Message words the ATX codes and passes ATX02 through", () => {
  assert.equal(stage4Message("ATX83", "x", "f"), "You already have an active membership here.");
  assert.equal(stage4Message("ATX02", "Try again in 5 minutes.", "f"), "Try again in 5 minutes.");
  assert.equal(stage4Message("XX000", "x", "fallback"), "fallback");
});

test("reviewAge reads as the frame's", () => {
  const now = new Date("2026-10-07T12:00:00Z");
  assert.equal(reviewAge("2026-10-07T08:00:00Z", now), "Today");
  assert.equal(reviewAge("2026-10-05T12:00:00Z", now), "2 days ago");
  assert.equal(reviewAge("2026-09-30T12:00:00Z", now), "1 week ago");
  assert.equal(reviewAge("2026-09-16T12:00:00Z", now), "3 weeks ago");
  assert.equal(reviewAge("2026-09-01T12:00:00Z", now), "1 month ago");
});

test("storagePath: an A4 object path is kept; URLs, absolute and traversal paths are not", () => {
  assert.equal(storagePath("0b1c/logo.png"), "0b1c/logo.png");
  assert.equal(storagePath(" 0b1c/e1/cover.jpg "), "0b1c/e1/cover.jpg");
  assert.equal(storagePath(null), null);
  assert.equal(storagePath(""), null);
  assert.equal(storagePath("https://x.test/a.png"), null);
  assert.equal(storagePath("/abs/a.png"), null);
  assert.equal(storagePath("a/../b.png"), null);
  assert.equal(storagePath("javascript:alert(1)"), null);
});

test("hostedImageUrl: gyms.logo_url is drawn only when it is http(s)", () => {
  assert.equal(hostedImageUrl("https://probe.local/fg.png"), "https://probe.local/fg.png");
  assert.equal(hostedImageUrl("javascript:alert(1)"), null);
  assert.equal(hostedImageUrl("0b1c/logo.png"), null);
  assert.equal(hostedImageUrl(null), null);
});
