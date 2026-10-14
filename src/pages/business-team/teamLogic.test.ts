import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ClassSession, TeamPerson } from "../../services/business-team/team";
import { clashOf, initials, roleOptions, roleShort, seatBlocks, seatCounts, seatHint, seatLine, teamBoxes, weekRange } from "./teamLogic";

const person = (id: string, name: string, accepted: boolean, invitedAt = "2026-09-01T10:00:00Z"): TeamPerson => ({
  professionalId: id,
  name,
  avatarUrl: null,
  role: "instructor",
  permissions: [],
  invitedAt,
  acceptedAt: accepted ? invitedAt : null,
});

test("an invitation holds no seat: used counts accepted people only (B0)", () => {
  const c = seatCounts([person("a", "John N", true), person("b", "Taylor H", false)], 5);
  assert.deepEqual(c, { used: 1, invited: 1, total: 5, free: 3 });
  assert.equal(seatLine(c), "1 of 5 seats used · 1 invited · 3 free");
  assert.equal(seatLine(seatCounts([person("a", "A", true)], 1)), "1 of 1 seats used");
});

test("seat hint covers free, full and no seats at all", () => {
  assert.match(seatHint({ used: 1, invited: 0, total: 5, free: 4 }, 5), /Tap a seat/);
  assert.match(seatHint({ used: 5, invited: 0, total: 5, free: 0 }, 5), /All seats are taken/);
  assert.equal(seatHint({ used: 0, invited: 0, total: 0, free: 0 }, 5), "You have no seats yet. Add a block of 5 seats to invite people.");
});

test("seat blocks: accepted first, then invited, then free, in blocks of five", () => {
  const blocks = seatBlocks([person("b", "Taylor", false), person("a", "John", true)], 10, 5);
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0][0].kind === "person" && blocks[0][0].person.name, "John");
  assert.equal(blocks[0][1].kind === "person" && blocks[0][1].person.name, "Taylor");
  assert.equal(blocks[1].every((s) => s.kind === "free"), true);
  // More invitations than seats: the grid grows a block instead of hiding them.
  assert.equal(seatBlocks([person("a", "A", false), person("b", "B", false)], 0, 5).length, 1);
  assert.equal(seatBlocks([], 0, 5).length, 0);
});

test("initials and short roles", () => {
  assert.equal(initials("John Nader"), "JN");
  assert.equal(initials("Yusuf"), "Y");
  assert.equal(initials("Unnamed"), "?");
  assert.equal(roleShort("trainer"), "Trainer");
  assert.equal(roleShort("shop_assistant"), "Assistant");
  assert.deepEqual(roleOptions("store").map((r) => r.value), ["shop_assistant", "front_desk", "manager"]);
  assert.deepEqual(roleOptions("gym").map((r) => r.value), ["instructor", "trainer", "front_desk", "manager"]);
});

test("weeks start on Monday", () => {
  assert.deepEqual(weekRange("2026-10-14"), { from: "2026-10-12", to: "2026-10-18" });
  assert.deepEqual(weekRange("2026-10-14", 1), { from: "2026-10-19", to: "2026-10-25" });
});

const cls = (id: string, date: string, start: string, end: string, pro = "a"): ClassSession => ({
  id,
  title: id,
  date,
  start,
  end,
  capacity: 20,
  professionalId: pro,
});

test("clash: same person, same day, overlapping times", () => {
  const all = [cls("spin", "2026-10-14", "18:00:00", "18:45:00"), cls("yoga", "2026-10-14", "18:00:00", "19:00:00"), cls("late", "2026-10-14", "19:00:00", "20:00:00")];
  assert.equal(clashOf(all[0], all)?.id, "yoga");
  assert.equal(clashOf(all[2], all), null);
});

test("number boxes: empty, early and store wording; deltas hidden while early", () => {
  const now = Date.parse("2026-10-14T12:00:00Z");
  assert.equal(teamBoxes("gym", [], [], 5, "2026-10-14", now).line, "Invite the people who work with you. Each one uses a seat.");
  const fresh = [person("a", "Rami", true, "2026-10-10T10:00:00Z")];
  const early = teamBoxes("gym", fresh, [], 5, "2026-10-14", now);
  assert.equal(early.line, "1 team member so far. Seats left: 4.");
  assert.equal(early.boxes[0].delta, "");
  const store = teamBoxes("store", [person("a", "Max", true), person("b", "Taylor", false)], [], 5, "2026-10-14", now);
  assert.equal(store.boxes[1].label, "Open invites");
  assert.equal(store.line, "1 of 5 seats used. Taylor hasn't accepted their invite yet.");
  const old = [person("a", "John", true, "2026-08-01T10:00:00Z")];
  const busy = teamBoxes("classes", old, [cls("s1", "2026-10-13", "18:00:00", "19:00:00"), cls("s2", "2026-10-14", "18:00:00", "19:00:00")], 5, "2026-10-14", now);
  assert.equal(busy.line, "John teaches the most: 2 sessions this week.");
  assert.equal(busy.boxes[1].value, "2");
  assert.equal(busy.boxes[1].delta, "+2");
});
