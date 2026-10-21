import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  monDay,
  planLabel,
  priceBuckets,
  priceSinceLine,
  priceStep,
  sinceDay,
  toPriceChange,
  type PriceMarkerRow,
} from "./priceMarkerLogic.ts";

const row = (o: Partial<PriceMarkerRow>): PriceMarkerRow => ({
  changed_on: "2026-10-22",
  plan_id: "p1",
  plan_name: "Monthly",
  old_price: "40.00",
  new_price: "45.00",
  changed_at: "2026-10-22T09:00:00+00:00",
  ...o,
});

test("a plan_price_markers row becomes a change (numeric text as numbers, blank name as removed)", () => {
  const c = toPriceChange(row({}));
  assert.deepEqual(
    { on: c.on, oldPrice: c.oldPrice, newPrice: c.newPrice, planName: c.planName },
    { on: "2026-10-22", oldPrice: 40, newPrice: 45, planName: "Monthly" },
  );
  assert.equal(toPriceChange(row({ plan_name: null })).planName, null);
  assert.equal(toPriceChange(row({ plan_name: "  " })).planName, null);
});

test("the step uses the app's plan price format (cents only when there are some)", () => {
  assert.equal(priceStep({ oldPrice: 40, newPrice: 45 }), "$40 to $45");
  assert.equal(priceStep({ oldPrice: 39.99, newPrice: 40 }), "$39.99 to $40");
});

test("the tooltip names the plan, and a removed plan neutrally", () => {
  assert.equal(planLabel("Monthly"), "Monthly price");
  assert.equal(planLabel(null), "A removed plan's price");
  assert.equal(planLabel("Unlimited classes, off-peak, students"), "Unlimited classes, of… price");
});

test("changes land on the bucket holding their day; several on one bucket all stay readable", () => {
  const days = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23"];
  const changes = [
    row({ changed_on: "2026-10-22", changed_at: "2026-10-22T12:00:00Z", plan_name: "Yearly", old_price: 400, new_price: 450 }),
    row({ changed_on: "2026-10-22", changed_at: "2026-10-22T09:00:00Z" }),
    row({ changed_on: "2026-10-21", plan_name: null, old_price: "10.00", new_price: "12.50" }),
    row({ changed_on: "2026-10-18" }),
    row({ changed_on: "2026-10-24" }),
  ].map(toPriceChange);
  assert.deepEqual(priceBuckets(changes, days, "2026-10-23"), [
    { i: 2, t: "$10 to $12.50", rows: [{ l: "A removed plan's price", v: "$10 to $12.50" }] },
    {
      i: 3,
      t: "2 price changes",
      rows: [
        { l: "Monthly price", v: "$40 to $45" },
        { l: "Yearly price", v: "$400 to $450" },
      ],
    },
  ]);
  // A store's weeks: the bucket is the week holding the day, up to `last`.
  const weeks = ["2026-10-12", "2026-10-19"];
  assert.deepEqual(
    priceBuckets(changes, weeks, "2026-10-25").map((b) => [b.i, b.t]),
    [[0, "$40 to $45"], [1, "4 price changes"]],
  );
  assert.deepEqual(priceBuckets(changes, [], "2026-10-25"), []);
});

test("the since line always names the start, and says earlier changes weren't recorded", () => {
  assert.equal(monDay("2026-10-21", "2026-11-02"), "Oct 21");
  assert.equal(monDay("2026-10-21", "2027-01-05"), "Oct 21, 2026");
  assert.equal(
    priceSinceLine("2026-10-21", "2026-10-21", "2026-10-30"),
    "Plan price changes are marked since Oct 21.",
  );
  assert.equal(
    priceSinceLine("2026-10-20", "2026-10-21", "2026-10-30"),
    "Plan price changes are marked since Oct 21. Earlier changes weren't recorded.",
  );
  assert.equal(
    priceSinceLine("2026-07-01", "2026-10-21", "2026-10-30"),
    "Plan price changes are marked since Oct 21. Earlier changes weren't recorded.",
  );
});

test("the since date comes from the server's timestamp; no date means no line", () => {
  // A local-time timestamp so the test reads the same day in any timezone.
  assert.equal(sinceDay(new Date(2026, 9, 21, 11, 45).toISOString()), "2026-10-21");
  assert.equal(sinceDay(null), null);
  assert.equal(sinceDay(undefined), null);
  assert.equal(sinceDay(""), null);
  assert.equal(sinceDay("not a date"), null);
});

test("price tags take a free row: a promotion's bucket and near neighbours push them down", async () => {
  const { tagRows } = await import("./priceMarkerLogic.ts");
  // 28 days: a tag is about 8 buckets wide.
  assert.deepEqual(tagRows([], [3, 22, 27], 28), [0, 0, 1]);
  assert.deepEqual(tagRows([27], [27], 28), [1]);
  assert.deepEqual(tagRows([20], [22, 27], 28), [1, 2]);
  assert.deepEqual(tagRows([20, 30], [22, 27, 28], 40), [1, 2, 0]);
  assert.deepEqual(tagRows([], [0], 1), [0]);
});
