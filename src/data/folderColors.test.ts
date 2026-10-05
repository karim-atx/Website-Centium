import { strict as assert } from "node:assert";
import { test } from "node:test";
import { DARK_SURFACE, FOLDER_FAMILIES, FOLDER_SWATCHES, PURPLE, TEAL, contrastRatio, headInk, headInkSoft, liftTo, loggerShades, placeholderOpacity, playInk, playText, themedFamily } from "./folderColors.ts";

test("logger placeholders read at 4.5:1 on their field in all twelve folders", () => {
  for (const { color, name } of FOLDER_SWATCHES) {
    const s = loggerShades(FOLDER_FAMILIES[color]);
    const op = placeholderOpacity(s.ink, s.field);
    const a = [1, 3, 5].map((i) => parseInt(s.ink.slice(i, i + 2), 16));
    const b = [1, 3, 5].map((i) => parseInt(s.field.slice(i, i + 2), 16));
    const mixed = "#" + a.map((v, i) => Math.round(v * op + b[i] * (1 - op)).toString(16).padStart(2, "0")).join("");
    assert.ok(contrastRatio(mixed, s.field) >= 4.5, `${name}: ${op}`);
    assert.ok(op < 1, `${name}: still lighter than a typed value`);
  }
});

test("playText carries white text, and reads as text on white, at 4.5:1 in all twelve folders", () => {
  for (const { color, name } of FOLDER_SWATCHES) {
    const family = FOLDER_FAMILIES[color];
    const shade = playText(family);
    assert.ok(contrastRatio("#FFFFFF", shade) >= 4.5, `${name}: ${shade}`);
    // The same hue, only darker: no channel rises.
    const a = [1, 3, 5].map((i) => parseInt(family.play.slice(i, i + 2), 16));
    const b = [1, 3, 5].map((i) => parseInt(shade.slice(i, i + 2), 16));
    assert.ok(b.every((v, i) => v <= a[i]), `${name}: ${shade} is not darker than ${family.play}`);
  }
  // Black's play already passes, so it is returned as is.
  assert.equal(playText(FOLDER_FAMILIES["#241F1B"]), "#45403B");
});

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

test("dark mode: rows and headers turn dark, and their text, bar and ink still read", () => {
  for (const { color, name } of FOLDER_SWATCHES) {
    const base = FOLDER_FAMILIES[color];
    const fam = themedFamily(base, true);
    assert.ok(contrastRatio("#F5F3FA", fam.row) >= 4.5, `${name}: text on row`);
    assert.ok(contrastRatio(headInk(fam), fam.head) >= 4.5, `${name}: header ink`);
    assert.ok(contrastRatio(fam.bar, fam.row) >= 3, `${name}: bar on row`);
    assert.ok(contrastRatio(playInk(base, true), DARK_SURFACE.raised) >= 4.5, `${name}: play as text`);
    const s = loggerShades(base, true);
    assert.ok(contrastRatio(s.ink, s.field) >= 6, `${name}: typed ink on field`);
    assert.ok(placeholderOpacity(s.ink, s.field) < 1, `${name}: placeholder still lighter than a typed value`);
  }
  // Light mode is the family itself.
  assert.equal(themedFamily(TEAL, false), TEAL);
  assert.deepEqual(loggerShades(TEAL, false), loggerShades(TEAL));
});

test("liftTo leaves a passing colour alone and lifts a failing one to the ratio", () => {
  assert.equal(liftTo("#FFFFFF", DARK_SURFACE.card), "#FFFFFF");
  const lifted = liftTo("#45403B", DARK_SURFACE.card);
  assert.ok(contrastRatio(lifted, DARK_SURFACE.card) >= 4.5);
});
