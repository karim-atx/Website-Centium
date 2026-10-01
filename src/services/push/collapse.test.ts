import { strict as assert } from "node:assert";
import { test } from "node:test";
import { collapsedText, collapseTag } from "./collapse";

test("a push with a chat key collapses under that chat's tag", () => {
  assert.equal(collapseTag({ data: { messagePushId: "x", group: "a1b2c3d4e5" } }), "chat-a1b2c3d4e5");
});

test("a push without a usable chat key is not collapsed", () => {
  assert.equal(collapseTag({ data: { messagePushId: "x" } }), undefined);
  assert.equal(collapseTag({ data: { group: "short" } }), undefined);
  assert.equal(collapseTag({ data: { group: "has spaces in it" } }), undefined);
  assert.equal(collapseTag({ title: "New message from Sarah" }), undefined);
});

test("the first message keeps the server's words", () => {
  assert.deepEqual(collapsedText("New message from Sarah", "Open Centium to read it.", 0), {
    title: "New message from Sarah",
    body: "Open Centium to read it.",
    count: 1,
  });
});

test("later messages from the same chat are counted in the title", () => {
  assert.equal(collapsedText("New message from Sarah", "b", 2).title, "3 new messages from Sarah");
});

test("an unexpected title keeps its words and counts in the body", () => {
  assert.deepEqual(collapsedText("Centium", "b", 1), { title: "Centium", body: "2 new messages", count: 2 });
});
