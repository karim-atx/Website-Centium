import { strict as assert } from "node:assert";
import { test } from "node:test";
import { snippetFor } from "./searchSnippet";

test("the match is found case-insensitively and kept as written", () => {
  const s = snippetFor("Your Appointment is on Monday", "appoint");
  assert.deepEqual(s, { before: "Your ", match: "Appoint", after: "ment is on Monday" });
});

test("a match deep in a long message keeps a little context before it", () => {
  const text = "a".repeat(100) + " protein at breakfast " + "b".repeat(100);
  const s = snippetFor(text, "protein");
  assert.equal(s.match, "protein");
  assert.ok(s.before.startsWith("…"));
  assert.ok(s.after.endsWith("…"));
  assert.ok(s.before.length <= 26);
});

test("percent and underscore are literal", () => {
  assert.equal(snippetFor("down 100% today", "100%").match, "100%");
  assert.equal(snippetFor("file_name.pdf", "_name").match, "_name");
});

test("no match (it matched the file name) returns the start of the text", () => {
  assert.deepEqual(snippetFor("See attached", "report"), { before: "See attached", match: "", after: "" });
});
