import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { Product, StoreOrder } from "../../../services/store/types";
import { presetRange } from "../analyticsRange.ts";
import {
  detailLead,
  headlineOf,
  productSeries,
  sortRows,
  withServerSales,
} from "./productsModel.ts";

const TODAY = "2026-10-14";
const range = presetRange("4w", TODAY);
const prod = (
  id: string,
  name: string,
  price: number,
  visible = true,
): Product => ({
  id,
  name,
  price,
  description: "",
  marketCategory: "supplements",
  stock: null,
  visible,
  categoryId: null,
  category: null,
  categoryGlyph: null,
  imageUrl: null,
});
const order = (
  day: string,
  items: [string, number, number][],
  status: StoreOrder["status"] = "completed",
): StoreOrder =>
  ({
    status,
    placedAt: `${day}T10:00:00Z`,
    items: items.map(([id, qty, unit], i) => ({
      id: "i" + i,
      offeringId: id,
      name: id,
      qty,
      unitPrice: unit,
      lineTotal: qty * unit,
    })),
  }) as StoreOrder;

test("products: sales unknown until the orders read answers (null orders), never 0", () => {
  const h = headlineOf([prod("a", "Whey", 58)], null, range, TODAY);
  assert.equal(h.live, 1);
  assert.equal(h.sold, null);
  assert.equal(h.sales, null);
  assert.equal(h.top.length, 0);
});

test("products: units, sales, top sellers; cancelled orders do not count", () => {
  const products = [
    prod("a", "Whey", 58),
    prod("b", "Bars", 24),
    prod("c", "Shaker", 8, false),
  ];
  const orders = [
    order("2026-08-01", [["a", 1, 58]]),
    order("2026-10-10", [
      ["a", 2, 58],
      ["b", 1, 24],
    ]),
    order("2026-10-11", [["b", 5, 24]], "cancelled"),
  ];
  const h = headlineOf(products, orders, range, TODAY);
  assert.equal(h.live, 2);
  assert.equal(h.sold, 3);
  assert.equal(h.sales, 140);
  assert.equal(h.top[0].product.name, "Whey");
  assert.equal(h.early, false);
});

test("products: early data under 4 weeks hides deltas", () => {
  const h = headlineOf(
    [prod("a", "Whey", 58)],
    [order("2026-10-10", [["a", 1, 58]])],
    range,
    TODAY,
  );
  assert.equal(h.early, true);
  assert.equal(h.soldDelta, null);
});

test("products: detail series is 8 Monday weeks and the lead is numbers only", () => {
  const s = productSeries(
    "a",
    [order("2026-10-13", [["a", 3, 10]])],
    range,
    TODAY,
  );
  assert.equal(s.labels.length, 8);
  assert.equal(s.labels[7], "Week of 12 Oct");
  assert.equal(s.units[7], 3);
  assert.equal(detailLead(true, s), "Selling steadily, about 1 a week.");
  assert.equal(detailLead(false, s), "Hidden from Explore, so no new sales.");
});

test("products: sort by price and newest", () => {
  const rows = headlineOf(
    [prod("a", "A", 30), prod("b", "B", 10)],
    [],
    range,
    TODAY,
  ).rows;
  assert.deepEqual(
    sortRows(rows, "price", new Map()).map((r) => r.product.id),
    ["b", "a"],
  );
  assert.deepEqual(
    sortRows(
      rows,
      "new",
      new Map([
        ["a", 1],
        ["b", 0],
      ]),
    ).map((r) => r.product.id),
    ["b", "a"],
  );
});

test("products: B11's summary and top products win for the headline and What's selling", () => {
  const products = [prod("a", "Whey", 58), prod("b", "Bars", 24)];
  const orders = [order("2026-08-01", [["a", 1, 58]]), order("2026-10-10", [["a", 2, 58]])];
  const h = headlineOf(products, orders, range, TODAY);
  const s = withServerSales(
    h,
    {
      now: { units: 7, sales: 300 },
      prev: { units: 5, sales: 200 },
      top: [
        { offeringId: "b", units: 4, sales: 96 },
        { offeringId: null, units: 3, sales: 30 },
        { offeringId: "a", units: 2, sales: 116 },
      ],
    },
    range,
  );
  assert.equal(s.sold, 7);
  assert.equal(s.sales, 300);
  assert.equal(s.soldDelta, 2);
  assert.equal(s.salesDeltaPct, 50);
  // A deleted product (offering_id null) has no row to open, so it is skipped.
  assert.deepEqual(s.top.map((r) => [r.product.id, r.units, r.revenue]), [
    ["b", 4, 96],
    ["a", 2, 116],
  ]);
  // Pending stays pending: no server figures turn "–" into numbers.
  const pending = headlineOf(products, null, range, TODAY);
  assert.equal(withServerSales(pending, { now: { units: 1, sales: 1 }, prev: null, top: [] }, range).sold, null);
});

test("discount views: ends soon, unused, scheduled, ended, days-left words", async () => {
  const { discountView, discountLead, sortDiscounts, weekBars, weeklyUses, weekStarts } = await import("./productsModel.ts");
  const base = { endedAt: null, useLimit: null, showOnListing: true, audience: "everyone" as const };
  const soon = discountView({ ...base, status: "live", startsOn: "2026-09-15", endsOn: "2026-10-21", uses: 11 }, TODAY, "2026-10-12", "2026-06-29");
  assert.equal(soon.soon, true);
  assert.equal(soon.daysLeft, "7 days left");
  assert.equal(soon.dlTone, "soon");
  assert.equal(soon.marker, true);
  assert.equal(soon.use, "11 used · no limit");
  assert.equal(soon.usePct, 100);
  const unused = discountView({ ...base, status: "live", startsOn: "2026-09-01", endsOn: "2026-11-30", uses: 0 }, TODAY, null, "2026-06-29");
  assert.equal(unused.unused, true);
  assert.equal(unused.idleDays, 43);
  assert.equal(unused.dlTone, "normal");
  assert.equal(discountLead({ ...base, status: "live", startsOn: "2026-09-01", endsOn: "2026-11-30", uses: 0, audience: "new" }, unused, TODAY, "New customers only"), "No one has used it yet. It shows on your listing to new customers only.");
  const young = discountView({ ...base, status: "live", startsOn: "2026-10-01", endsOn: null, uses: 0 }, TODAY, null, "2026-06-29");
  assert.equal(young.unused, false);
  assert.equal(young.daysLeft, "No end date");
  assert.equal(young.marker, false);
  const sch = discountView({ ...base, status: "scheduled", startsOn: "2026-10-24", endsOn: "2026-11-15", uses: 0 }, TODAY, null, "2026-06-29");
  assert.equal(sch.daysLeft, "Starts in 10 days");
  assert.equal(sch.elapsed, 0);
  assert.equal(sch.marker, false);
  const ended = discountView({ ...base, status: "ended", startsOn: "2026-07-01", endsOn: "2026-12-31", endedAt: "2026-09-30T12:00:00", uses: 18, useLimit: 20 }, TODAY, "2026-09-29", "2026-06-29");
  assert.equal(ended.daysLeft, "Ended 30 Sep");
  assert.equal(ended.elapsed, 100);
  assert.equal(ended.useTone, "ended");
  assert.equal(ended.use, "18 of 20 used");
  assert.equal(discountLead({ ...base, status: "ended", startsOn: "2026-07-01", endsOn: "2026-12-31", endedAt: "2026-09-30T12:00:00", uses: 18, useLimit: 20 }, ended, TODAY, "x"), "It ended on 30 Sep. Duplicate it to run it again.");
  assert.equal(discountLead({ ...base, status: "live", startsOn: "2026-09-16", endsOn: "2026-10-21", uses: 20 }, soon, TODAY, "x"), "It ends in 7 days and is used about 5 times a week.");
  const order = sortDiscounts([
    { id: "e", f: { status: "ended" as const, startsOn: "2026-07-01", endsOn: "2026-09-30", endedAt: null } },
    { id: "s", f: { status: "scheduled" as const, startsOn: "2026-10-24", endsOn: null, endedAt: null } },
    { id: "l2", f: { status: "live" as const, startsOn: "2026-09-01", endsOn: null, endedAt: null } },
    { id: "l1", f: { status: "live" as const, startsOn: "2026-09-01", endsOn: "2026-10-21", endedAt: null } },
  ]).map((x) => x.id);
  assert.deepEqual(order, ["l1", "l2", "s", "e"]);
  const weeks = weekStarts(TODAY, 8);
  assert.equal(weeks[7], "2026-10-12");
  assert.equal(weeks[0], "2026-08-24");
  assert.deepEqual(weeklyUses(["2026-10-12", "2026-10-14", "2026-10-11", "2026-01-01"], weeks).slice(6), [1, 2]);
  const b = weekBars([3, 4, 4, 5, 3, 5, 4, 6], [2, 3, 3, 4, 3, 3, 4, 4]);
  assert.equal(b.ymax, 6);
  assert.equal(b.ymid, 3);
  assert.deepEqual(b.bars[0], { x: 31.6, y: 55, w: 19.3, h: 45, last: false });
  assert.equal(b.bars[7].last, true);
  assert.ok(b.ghost.startsWith("M41.3,70.0 L"));
});
