import { strict as assert } from "node:assert";
import { test } from "node:test";
import { hasHtmlTag, parseInline, parseMarkdown, plainText, safeHref } from "./markdown";

test("plain text is one paragraph; a single line break is kept, a blank line splits", () => {
  assert.deepEqual(parseMarkdown("Hello there"), [{ t: "p", c: [{ t: "text", v: "Hello there" }] }]);
  assert.deepEqual(parseMarkdown("one\ntwo"), [{ t: "p", c: [{ t: "text", v: "one" }, { t: "br" }, { t: "text", v: "two" }] }]);
  assert.equal(parseMarkdown("a\n\n\nb").length, 2);
  assert.deepEqual(parseMarkdown(""), []);
  assert.deepEqual(parseMarkdown(null), []);
  assert.deepEqual(parseMarkdown("a\r\n\r\nb").map((b) => b.t), ["p", "p"]);
});

test("headings one to three; four hashes is text", () => {
  assert.deepEqual(parseMarkdown("# Warm up"), [{ t: "heading", level: 1, c: [{ t: "text", v: "Warm up" }] }]);
  assert.deepEqual(parseMarkdown("### Cool down ##")[0], { t: "heading", level: 3, c: [{ t: "text", v: "Cool down" }] });
  assert.equal(parseMarkdown("#### Too deep")[0].t, "p");
  assert.equal(parseMarkdown("#hashtag")[0].t, "p");
});

test("bold and italic, nested; snake_case and lone stars stay text", () => {
  assert.deepEqual(parseInline("a **b** c"), [{ t: "text", v: "a " }, { t: "strong", c: [{ t: "text", v: "b" }] }, { t: "text", v: " c" }]);
  assert.deepEqual(parseInline("__b__"), [{ t: "strong", c: [{ t: "text", v: "b" }] }]);
  assert.deepEqual(parseInline("*i*"), [{ t: "em", c: [{ t: "text", v: "i" }] }]);
  assert.deepEqual(parseInline("**bold *and italic***")[0].t, "strong");
  assert.equal(plainText(parseInline("**bold *and italic***")), "bold and italic");
  assert.deepEqual(parseInline("snake_case_name"), [{ t: "text", v: "snake_case_name" }]);
  assert.deepEqual(parseInline("2 * 3 * 4"), [{ t: "text", v: "2 * 3 * 4" }]);
  assert.deepEqual(parseInline("**unclosed"), [{ t: "text", v: "**unclosed" }]);
  assert.deepEqual(parseInline("\\*not italic\\*"), [{ t: "text", v: "*not italic*" }]);
});

test("lists: bullets and numbers, consecutive lines only", () => {
  assert.deepEqual(parseMarkdown("- one\n- **two**\n\nafter"), [
    { t: "ul", items: [[{ t: "text", v: "one" }], [{ t: "strong", c: [{ t: "text", v: "two" }] }]] },
    { t: "p", c: [{ t: "text", v: "after" }] },
  ]);
  assert.deepEqual(parseMarkdown("3. three\n4. four"), [{ t: "ol", start: 3, items: [[{ t: "text", v: "three" }], [{ t: "text", v: "four" }]] }]);
  assert.deepEqual(parseMarkdown("intro\n* a\n* b").map((b) => b.t), ["p", "ul"]);
  assert.equal(parseMarkdown("- a\n1. b").length, 2);
});

test("links: http and https only; anything else keeps its words and loses the link", () => {
  assert.deepEqual(parseInline("see [the guide](https://example.com/a?b=1)"), [
    { t: "text", v: "see " },
    { t: "link", href: "https://example.com/a?b=1", c: [{ t: "text", v: "the guide" }] },
  ]);
  assert.deepEqual(parseInline("[x](javascript:alert(1))"), [{ t: "text", v: "x)" }]);
  assert.deepEqual(parseInline("[x](/relative)"), [{ t: "text", v: "x" }]);
  assert.deepEqual(parseInline("[x](data:text/html,hi)"), [{ t: "text", v: "x" }]);
  assert.deepEqual(parseInline("[not a link]"), [{ t: "text", v: "[not a link]" }]);
  assert.equal(safeHref(" HTTP://Example.com "), "http://example.com/");
  assert.equal(safeHref("javascript:alert(1)"), null);
  assert.equal(safeHref("https://"), null);
});

test("HTML is never markup: it stays text, and the pre-save check matches the server's", () => {
  assert.deepEqual(parseMarkdown("<b>hi</b>"), [{ t: "p", c: [{ t: "text", v: "<b>hi</b>" }] }]);
  assert.equal(hasHtmlTag("<b>hi</b>"), true);
  assert.equal(hasHtmlTag("<script src=x>"), true);
  assert.equal(hasHtmlTag("<!-- note"), true);
  assert.equal(hasHtmlTag("Aim for < 5 reps and > 3 sets"), false);
  assert.equal(hasHtmlTag("2<3"), false);
});
