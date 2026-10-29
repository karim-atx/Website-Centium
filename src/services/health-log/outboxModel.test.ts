import { strict as assert } from "node:assert";
import { test } from "node:test";
import { describeQueued, withQueued, type OutboxItem } from "./outboxModel.ts";

type Item = OutboxItem & { done?: boolean };
const habit = (id: string, day: string, done: boolean): Item => ({ id: `${id}${day}${done}`, kind: "habit", habitId: id, day, done });

test("outbox: a later tick of the same habit and day replaces the waiting one; goals keep the latest", () => {
  let q: Item[] = [];
  q = withQueued(q, habit("h1", "2026-10-29", true));
  q = withQueued(q, habit("h1", "2026-10-29", false));
  q = withQueued(q, habit("h1", "2026-10-28", true));
  assert.equal(q.length, 2);
  assert.equal(q.find((x) => x.day === "2026-10-29")?.done, false);
  q = withQueued(q, { id: "g1", kind: "goal", metric: "water" });
  q = withQueued(q, { id: "g2", kind: "goal", metric: "water" });
  q = withQueued(q, { id: "f1", kind: "food" });
  q = withQueued(q, { id: "f2", kind: "food" });
  assert.deepEqual(q.filter((x) => x.kind === "goal").map((x) => x.id), ["g2"]);
  assert.equal(q.filter((x) => x.kind === "food").length, 2);
});

test("outbox: what is waiting, in words", () => {
  const items: Item[] = [{ id: "1", kind: "water" }, { id: "2", kind: "message" }, { id: "3", kind: "message" }, habit("h", "d", true)];
  assert.equal(describeQueued(items), "1 water entry, 1 habit tick and 2 messages");
  assert.equal(describeQueued([items[0]]), "1 water entry");
  assert.equal(describeQueued([]), "");
});
