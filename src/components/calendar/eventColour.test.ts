import { test } from "node:test";
import assert from "node:assert/strict";
import { COLOR_THEMES } from "../../theme/colorThemes";
import { DEFAULT_EVENT_COLOUR, EVENT_DARK, EVENT_SWATCHES, eventColours, nearestEventSwatch } from "./eventColour";
import { contrastRatio } from "../../data/folderColors";

test("light: the tint is the colour at 16% and the bar the colour itself", () => {
  assert.deepEqual(eventColours("#6F9993", false), { tint: "#6F999329", bar: "#6F9993" });
});

test("dark: the handover's two literal shades, and every swatch has one at 5:1 or more", () => {
  assert.deepEqual(eventColours("#6F9993", true), { tint: "#4F8F8A29", bar: "#4F8F8A" });
  assert.deepEqual(eventColours("#7d6bb5", true), { tint: "#C3B3FB29", bar: "#C3B3FB" });
  for (const s of EVENT_SWATCHES) {
    assert.ok(EVENT_DARK[s], s);
    assert.ok(contrastRatio(EVENT_DARK[s], "#121317") >= 4.95, s);
  }
  // A saved hex outside the twelve is lifted at run time.
  assert.ok(contrastRatio(eventColours("#202020", true).bar, "#121317") >= 5);
});

const primary = (v: string) => COLOR_THEMES.find((t) => t.value === v)!.primary;

test("a new event in Centium keeps today's default swatch", () => {
  assert.equal(nearestEventSwatch(primary("centium")), DEFAULT_EVENT_COLOUR);
});

test("every theme's primary lands on one of the offered swatches", () => {
  for (const t of COLOR_THEMES) assert.ok((EVENT_SWATCHES as readonly string[]).includes(nearestEventSwatch(t.primary)));
  assert.equal(nearestEventSwatch(primary("gold")), "#D9A441");
});

test("anything that is not a hex colour falls back to the default", () => {
  assert.equal(nearestEventSwatch("rgb(1,2,3)"), DEFAULT_EVENT_COLOUR);
});
