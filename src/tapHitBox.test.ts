// Batch D GO: a .tap / .hit control takes its 44x44 hit box from index.css.
//
// That global ::after sets `width`, `height`, `left: 50%` and
// `transform: translate(-50%, -50%)`. An own `after:inset-*` / `after:-inset-*`
// on the same control replaces only left/top/right/bottom, so the box ends up
// translated by half its width away from the control; in Arabic (RTL) the
// browser keeps `right` instead of `left`, and on the Journal tab the box
// stuck 19px out of the page, which then scrolled sideways. So no class list
// that has `tap` or `hit` also positions the ::after itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC = join(process.cwd(), "src");

function sources(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) sources(p, out);
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(p);
  }
  return out;
}

test("no .tap / .hit control positions its own ::after hit box", () => {
  const found: string[] = [];
  for (const p of sources(SRC)) {
    readFileSync(p, "utf8")
      .split(/\r?\n/)
      .forEach((l, i) => {
        // Class strings on one line: a quoted string holding `tap` or `hit` as a
        // class and an after: inset utility.
        for (const m of l.matchAll(/["'`]([^"'`]*)["'`]/g)) {
          const cls = m[1].split(/\s+/);
          if (cls.some((c) => c === "tap" || c === "hit") && cls.some((c) => /^after:-?inset/.test(c)))
            found.push(`${p.slice(SRC.length + 1)}:${i + 1}`);
        }
      });
  }
  assert.deepEqual(found, [], "drop the after:inset classes: index.css already centres a 44x44 box on .tap / .hit");
});
