import { strict as assert } from "node:assert";
import { test } from "node:test";
import { FOLDER_FAMILIES, FOLDER_SWATCHES, PURPLE, TEAL, contrastRatio, headInk, headInkSoft } from "./folderColors.ts";

// The header ink over a header, with an rgba() ink blended onto it first.
function onHead(ink: string, head: string): number {
  const m = /rgba\((\d+),(\d+),(\d+),([\d.]+)\)/.exec(ink.replace(/\s/g, ""));
  if (!m) return contrastRatio(ink, head);
  const a = Number(m[4]);
  const bg = [1, 3, 5].map((i) => parseInt(head.slice(i, i + 2), 16));
  const mixed = [1, 2, 3].map((k, i) => Math.round(Number(m[k]) * a + bg[i] * (1 - a)));
  return contrastRatio("#" + mixed.map((v) => v.toString(16).padStart(2, "0")).join(""), head);
}

test("every one of the twelve folder headers reads at 4.5:1 or more: name, icons and count", () => {
  for (const { color, name } of FOLDER_SWATCHES) {
    const family = FOLDER_FAMILIES[color];
    assert.ok(family, `${name} has a family`);
    const main = contrastRatio(headInk(family), family.head);
    const soft = onHead(headInkSoft(family), family.head);
    assert.ok(main >= 4.5, `${name}: ${main.toFixed(2)}`);
    assert.ok(soft >= 4.5, `${name} count: ${soft.toFixed(2)}`);
  }
});

test("dark ink on the light headers, white on Black's", () => {
  assert.equal(headInk(TEAL), "#1C1917");
  assert.equal(headInk(PURPLE), "#1C1917");
  assert.equal(headInk(FOLDER_FAMILIES["#241F1B"]), "#FFFFFF");
});
