import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { StoreOrder } from "../../../services/store/orders";
import type { Product } from "../../../services/store/products";
import { presetRange } from "../analyticsRange.ts";
import {
  detailLead,
  headlineOf,
  productSeries,
  sortRows,
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
  category: null,
  imagePath: null,
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
      variant: null,
      qty,
      unitPrice: unit,
      lineTotal: qty * unit,
    })),
  }) as StoreOrder;

test("products: sales unknown until B11 answers (null orders), never 0", () => {
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
