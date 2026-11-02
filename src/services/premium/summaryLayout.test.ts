import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutPages, wrap, type LayoutOptions } from "./summaryLayout.ts";

const measure = (s: string) => s.length * 10;

test("lines wrap by words within the width; a very long word is broken", () => {
  assert.deepEqual(wrap("one two three four", 100, measure), ["one two", "three four"]);
  assert.deepEqual(wrap("abcdefghijklmnop", 50, measure), ["abcde", "fghij", "klmno", "p"]);
  assert.deepEqual(wrap("", 100, measure), [""]);
});

test("the summary paginates, and a heading never ends a page alone", () => {
  const o: LayoutOptions = {
    width: 300,
    height: 300,
    margin: 20,
    footer: 20,
    size: { title: 20, subtitle: 10, notice: 10, heading: 20, line: 20, empty: 20 },
    leading: 1,
    before: {},
  };
  // Room for 12 lines of 20 (240 / 20).
  const blocks = [
    ...Array.from({ length: 11 }, (_, i) => ({ kind: "line" as const, text: `l${i}` })),
    { kind: "heading" as const, text: "Section" },
    { kind: "line" as const, text: "first" },
  ];
  const pages = layoutPages(blocks, o, (s) => measure(s));
  assert.equal(pages.length, 2);
  assert.equal(pages[0].length, 11);
  assert.deepEqual(pages[1].map((l) => l.text), ["Section", "first"]);
  assert.ok(pages.flat().every((l) => l.y <= 300 - 20 - 20));
});
