import { strict as assert } from "node:assert";
import { test } from "node:test";
import { matchVoiceRow } from "./voiceReview";
import { servingMultiplier } from "../nutrition";
import type { ServingUnit } from "../../types";

// The parts of a voice review row and a saved food this logic touches (the
// real types live beside the recorder and the Supabase client).
interface Food {
  id: string;
  name: string;
  servingLabel: string;
  calories: number;
  protein: number;
}
interface Row {
  spokenName: string;
  quantity: number;
  spokenUnit: string | null;
  unit: ServingUnit | null;
  food: Food | null;
  alternatives: Food[];
  selected: boolean;
}

// What "Check this food" hands back for a picked online result: the member's
// own food, per serving.
const saved: Food = { id: "custom-1", name: "Dragon fruit smoothie", servingLabel: "1 serving (250 g)", calories: 180, protein: 4 };

const rows = (): Row[] => [
  { spokenName: "dragon fruit smoothie", quantity: 2, spokenUnit: "cups", unit: "cup", food: null, alternatives: [], selected: false },
  {
    spokenName: "banana",
    quantity: 1,
    spokenUnit: null,
    unit: null,
    food: { id: "banana", name: "Banana", servingLabel: "1 medium (118 g)", calories: 105, protein: 1.3 },
    alternatives: [],
    selected: true,
  },
];

const multiplierFor = (r: Row) => servingMultiplier(r.food!.servingLabel, r.quantity, r.unit ?? "serving");

test("the saved food becomes the row's match, and the row is ticked", () => {
  const next = matchVoiceRow(rows(), 0, saved);
  assert.equal(next[0].food, saved);
  assert.equal(next[0].selected, true);
});

test("what was said is kept: name, quantity and units", () => {
  const next = matchVoiceRow(rows(), 0, saved);
  assert.equal(next[0].spokenName, "dragon fruit smoothie");
  assert.equal(next[0].quantity, 2);
  assert.equal(next[0].spokenUnit, "cups");
  assert.equal(next[0].unit, "cup");
  assert.deepEqual(next[0].alternatives, []);
});

test("every other row is returned untouched, and the input is not mutated", () => {
  const before = rows();
  const next = matchVoiceRow(before, 0, saved);
  assert.equal(next[1], before[1]);
  assert.equal(before[0].food, null);
  assert.equal(before[0].selected, false);
});

test("an index out of range changes nothing", () => {
  const before = rows();
  assert.deepEqual(matchVoiceRow(before, 5, saved), before);
});

test("the preview scales by the spoken quantity: 2 servings doubles the macros", () => {
  const row = { ...rows()[0], unit: null, spokenUnit: null };
  const [matched] = matchVoiceRow([row], 0, saved);
  assert.equal(multiplierFor(matched), 2);
  assert.equal(Math.round(matched.food!.calories * multiplierFor(matched)), 360);
  assert.equal(Math.round(matched.food!.protein * multiplierFor(matched)), 8);
});

test("a spoken weight scales against the saved food's own serving weight", () => {
  const row: Row = { ...rows()[0], quantity: 125, spokenUnit: "grams", unit: "g" };
  const [matched] = matchVoiceRow([row], 0, saved);
  assert.equal(multiplierFor(matched), 0.5);
  assert.equal(Math.round(matched.food!.calories * multiplierFor(matched)), 90);
});
