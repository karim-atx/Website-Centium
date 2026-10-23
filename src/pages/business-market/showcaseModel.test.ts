import { strict as assert } from "node:assert";
import { test } from "node:test";
import { dropIndex, groupByCategory, itemsHeader, mergeSectionOrder, moveTo, priceLine, priceText } from "./showcaseModel.ts";

test("caps header and prices as the board writes them", () => {
  assert.equal(itemsHeader(5), "5 items · drag to reorder");
  assert.equal(itemsHeader(1), "1 item · drag to reorder");
  assert.equal(priceText(48), "$48");
  assert.equal(priceText(12.5), "$12.50");
  assert.equal(priceText(null), "");
  assert.equal(priceLine({ price: 48, stock: null }, false), "$48");
  assert.equal(priceLine({ price: null, stock: null }, false), "");
  assert.equal(priceLine({ price: 48, stock: 12 }, true), "$48 · 12 left");
  assert.equal(priceLine({ price: null, stock: 3 }, true), "No price · 3 left");
  assert.equal(priceLine({ price: 48, stock: 12 }, false), "$48");
});

test("store sections: alphabetical, Other last, list order kept", () => {
  const g = groupByCategory([
    { id: "a", category: "Tops" },
    { id: "b", category: null },
    { id: "c", category: "Bottoms" },
    { id: "d", category: "Tops" },
  ]);
  assert.deepEqual(
    g.map((s) => [s.name, s.list.map((x) => x.id)]),
    [
      ["Bottoms", ["c"]],
      ["Tops", ["a", "d"]],
      ["Other", ["b"]],
    ]
  );
});

test("moveTo clamps and leaves the list alone for a no-op", () => {
  assert.deepEqual(moveTo(["a", "b", "c"], "a", 2), ["b", "c", "a"]);
  assert.deepEqual(moveTo(["a", "b", "c"], "c", -5), ["c", "a", "b"]);
  const same = ["a", "b"];
  assert.equal(moveTo(same, "a", 0), same);
  assert.equal(moveTo(same, "z", 1), same);
});

test("dropIndex counts the midpoints above the pointer, skipping the dragged row", () => {
  const mids = [36, 109, 182, 255];
  assert.equal(dropIndex(mids, 10, 0), 0);
  assert.equal(dropIndex(mids, 120, 0), 1);
  assert.equal(dropIndex(mids, 300, 0), 3);
  assert.equal(dropIndex(mids, 120, 3), 2);
  assert.equal(dropIndex(mids, 0, 3), 0);
});

test("a section's reordered slice merges into the whole order", () => {
  const all = ["t1", "o1", "t2", "t3", "t4", "o2"];
  const tops = ["t1", "t2", "t3", "t4"];
  // The section shows its first three; t3 is dragged to the top.
  assert.deepEqual(mergeSectionOrder(all, tops, ["t3", "t1", "t2"]), ["t3", "o1", "t1", "t2", "t4", "o2"]);
  assert.deepEqual(mergeSectionOrder(all, tops, tops), all);
});
