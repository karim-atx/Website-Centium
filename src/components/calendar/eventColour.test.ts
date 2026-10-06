import { test } from "node:test";
import assert from "node:assert/strict";
import { COLOR_THEMES } from "../../theme/colorThemes";
import { DEFAULT_EVENT_COLOUR, EVENT_SWATCHES, nearestEventSwatch } from "./eventColour";

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
