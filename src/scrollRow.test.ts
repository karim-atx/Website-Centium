// Round I (EZ): every horizontal scroller scrolls sideways only.
//
// A row with `overflow-x: auto` alone can also be dragged up and down (its
// chips, focus rings and tap areas are taller than it). So no source file
// uses the `overflow-x-auto` / `overflow-x-scroll` classes: rows use
// `.scroll-row` (index.css), and a style object that scrolls sideways also
// sets overflowY "hidden" on the same line.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.(tsx?|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

const files = sources(SRC).map((p) => ({ p, lines: readFileSync(p, "utf8").split(/\r?\n/) }));
const where = (p: string, i: number) => `${p.slice(SRC.length + 1)}:${i + 1}`;
const isComment = (l: string) => /^\s*(\/\/|\*|\/\*)/.test(l);

test("no horizontal scroller uses the overflow-x-auto or overflow-x-scroll class", () => {
  const found: string[] = [];
  for (const { p, lines } of files)
    lines.forEach((l, i) => {
      // (A mention in backticks, as in a comment, is not a use.)
      if (!isComment(l) && /(?<!`)\boverflow-x-(auto|scroll)\b/.test(l)) found.push(where(p, i));
    });
  assert.deepEqual(found, [], "use the scroll-row class instead");
});

test("a style object that scrolls sideways also hides the vertical axis", () => {
  const found: string[] = [];
  for (const { p, lines } of files)
    lines.forEach((l, i) => {
      if (isComment(l)) return;
      // overflowX: "auto" | "scroll", or a value that can be "auto" (r.esOver, rm ? "auto" : …).
      if (/overflowX:\s*("auto"|"scroll"|[^,}]*\?\s*"auto"|r\.\w+)/.test(l) && !/overflowY:/.test(l + (lines[i + 1] ?? "") + (lines[i + 2] ?? ""))) found.push(where(p, i));
    });
  assert.deepEqual(found, [], "add overflowY: \"hidden\" (or use the scroll-row class)");
});

test(".scroll-row scrolls sideways only and lets the page scroll through it", () => {
  const css = readFileSync(join(SRC, "index.css"), "utf8");
  const rule = css.match(/\.scroll-row\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(rule, /overflow-x:\s*auto/);
  assert.match(rule, /overflow-y:\s*hidden/);
  assert.match(rule, /overscroll-behavior-x:\s*contain/);
  // Vertical pans stay with the browser, so a swipe that starts on a row scrolls the page.
  assert.match(rule, /touch-action:\s*pan-x pan-y/);
});
