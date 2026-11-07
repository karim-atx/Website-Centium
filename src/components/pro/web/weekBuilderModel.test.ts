import { test } from "node:test";
import assert from "node:assert/strict";
import { convertUnit, unitOptions } from "./weekBuilderModel";

const facts = (servingLabel: string) => ({ servingLabel, per: { kcal: 100, p: 1, c: 1, f: 1 } });

test("week builder unit menu: grams only when the food states its gram weight", () => {
  assert.deepEqual(unitOptions({ kind: "food", facts: facts("1 cup (156 g)") } as never), ["g", "serving"]);
  assert.deepEqual(unitOptions({ kind: "food", facts: facts("1 slice") } as never), ["serving"]);
  assert.deepEqual(unitOptions({ kind: "recipe", facts: null } as never), ["serving"]);
});

test("week builder unit menu: the same portion in the other unit", () => {
  const f = facts("1 cup (156 g)");
  assert.deepEqual(convertUnit({ grams: null, servings: 2, facts: f } as never, "g"), { grams: 312, servings: null });
  assert.deepEqual(convertUnit({ grams: 78, servings: null, facts: f } as never, "serving"), { grams: null, servings: 0.5 });
  assert.deepEqual(convertUnit({ grams: 60, servings: null, facts: f } as never, "g"), { grams: 60, servings: null });
});
