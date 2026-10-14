// v6 Batch 1 (F1): the token-level decisions, checked against index.css and
// the generated theme palette (npm run gen:themes).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const SRC = path.join(process.cwd(), "src");
const strip = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, "");
function blocks(file: string): [string, Record<string, string>][] {
  const out: [string, Record<string, string>][] = [];
  for (const m of strip(fs.readFileSync(path.join(SRC, file), "utf8")).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const o: Record<string, string> = {};
    for (const d of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) o[d[1]] = d[2].trim();
    out.push([m[1].trim(), o]);
  }
  return out;
}
const index = blocks("index.css");
const palette = blocks("styles/theme-palette.css");
const merged = (list: [string, Record<string, string>][], sel: string) =>
  Object.assign({}, ...list.filter(([s]) => s === sel).map(([, o]) => o)) as Record<string, string>;
const root = merged(index, ":root");
const dark = merged(index, ".dark");

const FIXED_METRICS = ["water", "steps", "sleep", "calories", "heart-rate", "blood-pressure", "cycle"];

test("Health metric colours are fixed: literal triplets, never set by a theme (V6-60)", () => {
  for (const m of FIXED_METRICS) {
    for (const k of ["main", "tint", "accent", "ink", "pattern"]) {
      const n = `--metric-${m}-${k}`;
      assert.match(root[n], /^\d+ \d+ \d+$/, `${n} light`);
      assert.match(dark[n], /^\d+ \d+ \d+$/, `${n} dark`);
      for (const [sel, o] of palette) assert.ok(!(n in o), `${n} set by ${sel}`);
    }
  }
  assert.equal(root["--metric-heart-rate-main"], "194 78 78");
  assert.equal(dark["--metric-cycle-main"], "232 169 191");
});

test("Weight trend follows the theme through th- variables", () => {
  assert.equal(root["--metric-weight-main"], "var(--th-9a8cd6)");
  assert.equal(root["--metric-weight-ink"], "var(--thi-5f5093)");
  const sky = merged(palette, '[data-accent="sky"]');
  assert.ok(sky["--th-9a8cd6"] && sky["--th-9a8cd6"] !== "154 140 214");
});

test("filled controls take the handover fills, #5B48B8 under High contrast (V6-01)", () => {
  assert.equal(root["--c-fill-pinned"], "154 140 214");
  assert.equal(root["--c-seg-active"], "167 154 213");
  assert.equal(root["--c-on-primary-fill"], "255 255 255");
  assert.equal(dark["--c-fill-pinned"], "var(--c-primary-fill)");
  assert.equal(dark["--c-on-primary-fill"], "13 11 26");
  const hc = merged(index, 'html.high-contrast[data-accent="centium"]:not(.dark)');
  assert.equal(hc["--c-fill-pinned"], "91 72 184");
  assert.equal(hc["--c-seg-active"], "91 72 184");
});

test("dark ink on light fills (X-11) and the scrim in both modes (X-07)", () => {
  assert.equal(dark["--c-on-destructive"], "13 11 26");
  assert.equal(root["--backdrop-dim"], "rgba(36, 31, 27, 0.4)");
  assert.ok(!("--backdrop-dim" in dark));
});

test("business sheet outline and wheel band (X-05, X-18); client values unchanged", () => {
  assert.equal(dark["--sheet-border-business"], "#9976f7");
  assert.equal(dark["--sheet-border"], "#a991fe");
  assert.equal(dark["--wheel-band-business"], "#2b2c3a");
  assert.equal(dark["--wheel-band"], "#242730");
});

test("hairlines go to 30% of ink under High contrast (X-09)", () => {
  const hc = merged(index, "html.high-contrast");
  const hcDark = merged(index, "html.high-contrast.dark");
  for (const n of ["--hair-08", "--hair-10", "--hair-11", "--list-rule"]) {
    assert.equal(hc[n], "rgb(17 17 17 / 0.3)");
    assert.equal(hcDark[n], "rgb(245 243 250 / 0.3)");
  }
});

test("in-app mark #8F68F6 + #8AC4BA in Centium, the pair in the other themes (X-24)", () => {
  assert.equal(root["--c-brand-c"], "143 104 246");
  assert.equal(root["--c-brand-leaf"], "138 196 186");
  assert.equal(merged(palette, '[data-accent="rose"]')["--c-brand-c"], "226 77 127");
});

test("navbar accent follows the theme (X-23)", () => {
  assert.notEqual(merged(palette, '[data-accent="sky"]')["--c-team-nav-accent"], root["--c-team-nav-accent"]);
});
