import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  NOT_AVAILABLE,
  perMonthText,
  periodSaving,
  noPriceText,
  periodOptions,
  periodPriceText,
  periodSwitchRefusal,
  priceOrNull,
  renewalAfterSwitch,
  renewalDayText,
  switchConfirm,
  switchedText,
  toSubscriptionPeriod,
} from "./period.ts";

const money = (n: number) => `$${n.toFixed(2)}`;

test("a NULL price is 'Not available', never free or $0", () => {
  assert.equal(priceOrNull(null), null);
  assert.equal(priceOrNull(undefined), null);
  assert.equal(priceOrNull(""), null);
  assert.equal(priceOrNull("799.99"), 799.99);
  assert.equal(priceOrNull(0), 0);
  assert.equal(periodPriceText(null, "yearly", money), NOT_AVAILABLE);
  assert.equal(periodPriceText(29, "monthly", money), "$29.00 a month");
  assert.equal(periodPriceText(799.99, "yearly", money), "$799.99 a year");
});

test("billing_period reads only the two values the enum has", () => {
  assert.equal(toSubscriptionPeriod("monthly"), "monthly");
  assert.equal(toSubscriptionPeriod("yearly"), "yearly");
  assert.equal(toSubscriptionPeriod("quarterly"), null);
  assert.equal(toSubscriptionPeriod(null), null);
});

test("a period without a price is not offered, and says why", () => {
  const [m, y] = periodOptions("monthly", { monthly: 29, yearly: null });
  assert.deepEqual(m, { period: "monthly", price: 29, current: true, selectable: false, reason: null });
  assert.equal(y.selectable, false);
  assert.equal(y.reason, "Yearly billing isn't available for your plan yet.");
  const [, y2] = periodOptions("monthly", { monthly: 29, yearly: 799.99 });
  assert.equal(y2.selectable, true);
  assert.equal(y2.reason, null);
  // The current period is current even if its price went missing.
  const [, y3] = periodOptions("yearly", { monthly: 29, yearly: null });
  assert.equal(y3.current, true);
  assert.equal(y3.reason, null);
});

test("renews_at moves from now, the way Postgres adds an interval", () => {
  const d = (y: number, m: number, day: number) => new Date(y, m - 1, day, 10, 30);
  const iso = (x: Date) => `${x.getFullYear()}-${x.getMonth() + 1}-${x.getDate()}`;
  assert.equal(iso(renewalAfterSwitch(d(2026, 10, 21), "yearly")), "2027-10-21");
  assert.equal(iso(renewalAfterSwitch(d(2026, 10, 21), "monthly")), "2026-11-21");
  assert.equal(iso(renewalAfterSwitch(d(2027, 1, 31), "monthly")), "2027-2-28");
  assert.equal(iso(renewalAfterSwitch(d(2028, 1, 31), "monthly")), "2028-2-29");
  assert.equal(iso(renewalAfterSwitch(d(2028, 2, 29), "yearly")), "2029-2-28");
  assert.equal(iso(renewalAfterSwitch(d(2026, 12, 15), "monthly")), "2027-1-15");
  // Time of day is kept.
  assert.equal(renewalAfterSwitch(d(2026, 10, 21), "yearly").getHours(), 10);
});

test("dates read 'Oct 14', with the year only when it isn't this one", () => {
  const now = new Date(2026, 9, 21);
  assert.equal(renewalDayText(new Date(2026, 10, 19), now), "Nov 19");
  assert.equal(renewalDayText(new Date(2027, 9, 21), now), "Oct 21, 2027");
  assert.equal(renewalDayText("not a date", now), "");
});

test("the confirm names the new price, the seat blocks and where the renewal moves, and charges nothing now", () => {
  const now = new Date(2026, 9, 21);
  const c = switchConfirm({ to: "yearly", price: 799.99, seatBlocks: 0, renewal: new Date(2027, 9, 21), now, money });
  assert.equal(c.title, "Switch to yearly billing?");
  assert.equal(c.body, "Your plan will cost $799.99 a year. Your next renewal moves to Oct 21, 2027. Nothing is charged now.");
  assert.equal(c.action, "Switch to yearly");
  const c1 = switchConfirm({ to: "monthly", price: 88.99, seatBlocks: 1, renewal: new Date(2026, 10, 21), now, money });
  assert.equal(c1.body, "Your plan and 1 seat block will cost $88.99 a month. Your next renewal moves to Nov 21. Nothing is charged now.");
  const c2 = switchConfirm({ to: "yearly", price: 1, seatBlocks: 3, renewal: new Date(2027, 9, 21), now, money });
  assert.match(c2.body, /^Your plan and 3 seat blocks will cost/);
  for (const t of [c.title, c.body, c.action, c1.body]) {
    assert.doesNotMatch(t, /—|--|save|free|%/i);
  }
});

test("every documented refusal has its own words", () => {
  assert.deepEqual(periodSwitchRefusal("42501", "authentication required", "yearly"), {
    kind: "signed_out",
    message: "Your session has ended. Sign in again to change how you're billed.",
  });
  assert.deepEqual(periodSwitchRefusal("ATXAD", "you have no subscription to change", "yearly"), {
    kind: "no_subscription",
    message: "You don't have a plan to change yet.",
  });
  assert.deepEqual(periodSwitchRefusal("ATXAD", "that plan has no yearly price yet", "yearly"), {
    kind: "no_price",
    message: "Yearly billing isn't available for your plan yet.",
  });
  // The period named by the server wins over the one asked for.
  assert.equal(periodSwitchRefusal("ATXAD", "that plan has no monthly price yet", "yearly").message, noPriceText("monthly"));
  assert.deepEqual(periodSwitchRefusal("XX000", "boom", "monthly"), { kind: "failed", message: "Couldn't change how you're billed. Try again." });
  assert.equal(periodSwitchRefusal(undefined, undefined, "monthly").kind, "failed");
});

test("after a switch, the new period and renewal", () => {
  const now = new Date(2026, 9, 21);
  assert.equal(switchedText("yearly", new Date(2027, 9, 21).toISOString(), now), "You're now billed yearly. Your next renewal is Oct 21, 2027.");
  assert.equal(switchedText("monthly", null, now), "You're now billed monthly.");
});

test("b93cb12: the yearly saving, from subscription_price_for's two answers", () => {
  const money = (n: number) => `$${n.toFixed(2)}`;
  // Base: 29.00 a month or 289.99 a year (12 x 29 = 348, saves 58.01, 16.6% down to 16).
  assert.deepEqual(periodSaving({ monthly: 29, yearly: 289.99 }), { amount: 58.01, percent: 16 });
  // A seat block alone, and Base with 2 blocks (subscription_price_for(Base, period, 2)).
  assert.deepEqual(periodSaving({ monthly: 59.99, yearly: 599.99 }), { amount: 119.89, percent: 16 });
  assert.deepEqual(periodSaving({ monthly: 148.98, yearly: 1489.97 }), { amount: 297.79, percent: 16 });
  // NULL on either side, or a yearly that isn't cheaper (the old 799.99), is no saving.
  assert.equal(periodSaving({ monthly: 29, yearly: null }), null);
  assert.equal(periodSaving({ monthly: null, yearly: 289.99 }), null);
  assert.equal(periodSaving({ monthly: 29, yearly: 799.99 }), null);
  assert.equal(periodSaving({ monthly: 29, yearly: 348 }), null);
  assert.equal(periodSaving(null), null);
  assert.equal(perMonthText(289.99, money), "$24.17 a month, billed yearly");
});
