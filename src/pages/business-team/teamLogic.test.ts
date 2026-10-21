import { strict as assert } from "node:assert";
import { test } from "node:test";
import type { ClassSession, TeamPerson } from "../../services/business-team/types";
import { professionLabel } from "../../services/business-team/seats";
import { clashOf, initials, inviteState, inviteWhen, isWithdrawn, onTeam, seatHolders, withdrawnPeople, invitedWord, lowerFirst, shortDay, jobRow, noSeatPeople, profileLink, requestLine, roleAndProfession, roleOptions, roleShort, seatBlocks, seatCounts, seatHint, seatLine, specialtySub, teamBoxes, weekRange, yearsOfExperience } from "./teamLogic";

const person = (id: string, name: string, accepted: boolean, invitedAt = "2026-09-01T10:00:00Z", role: TeamPerson["role"] = "instructor"): TeamPerson => ({
  employmentId: "e-" + id,
  payRate: null,
  inviteMessage: null,
  subtype: null,
  otherDiscipline: null,
  closestGroup: null,
  usesSeat: null,
  professionalId: id,
  name,
  avatarUrl: null,
  role,
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
  assert.equal(teamBoxes("gym", [], [], 5, "2026-10-14", now).line, "Invite the people who work with you. Instructors and trainers use a seat.");
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

test("seats count instructors and trainers only (B6 follow-up, role_uses_seat)", () => {
  const people = [
    person("a", "John", true),
    person("b", "Desk", true, "2026-09-01T10:00:00Z", "front_desk"),
    person("c", "Boss", false, "2026-09-01T10:00:00Z", "manager"),
    person("d", "Taylor", false, "2026-09-01T10:00:00Z", "trainer"),
  ];
  assert.deepEqual(seatCounts(people, 5), { used: 1, invited: 1, total: 5, free: 3 });
  assert.deepEqual(noSeatPeople(people).map((p) => p.name), ["Desk", "Boss"]);
  assert.equal(seatBlocks(people, 5, 5)[0].filter((s) => s.kind === "person").length, 2);
  // The server's numbers win when loaded.
  assert.deepEqual(seatCounts(people, 5, { used: 2, invited: 0 }), { used: 2, invited: 0, total: 5, free: 3 });
  // Batch 2 CO: seats_invited counts live invitations only, so the server's number is taken as it is.
  assert.deepEqual(seatCounts(people.slice(0, 3), 5, { used: 1, invited: 1 }), { used: 1, invited: 1, total: 5, free: 3 });
  // Active team counts everybody accepted, seat or not.
  assert.equal(teamBoxes("gym", people, [], 5, "2026-10-14", Date.parse("2026-10-14T12:00:00Z")).boxes[0].value, "2");
});

test("profession next to the role; the server's seat answer wins (B6 follow-up)", () => {
  const p = { ...person("a", "Rami", true, "2026-09-01T10:00:00Z", "staff"), subtype: "physiotherapist" };
  assert.equal(roleAndProfession(p), "Staff · Physiotherapist");
  assert.equal(professionLabel({ subtype: "other", otherDiscipline: "Pilates teacher", closestGroup: "fitness" }), "Pilates teacher");
  assert.equal(professionLabel({ subtype: "other", otherDiscipline: null, closestGroup: "clinical" }), "Clinical");
  assert.equal(professionLabel({ subtype: null, otherDiscipline: null, closestGroup: null }), null);
  assert.equal(roleAndProfession(person("b", "John", true)), "Instructor");
  // A server answer of false keeps an instructor out of the seat grid.
  assert.deepEqual(seatCounts([{ ...person("c", "C", true), usesSeat: false }], 5), { used: 0, invited: 0, total: 5, free: 5 });
});

test("public profile rows (OP1-132 C1, C2, C6; OP1-124 9c)", () => {
  const d = {
    subtype: "trainer",
    specialty: "Spin and strength",
    bio: null,
    website: "karimtrains.com",
    instagram: "@john.trains",
    x: "https://x.com/karimtrains",
    experience: [
      { title: "Head coach", organisation: "Northside Fitness", startMonth: "2023-01", endMonth: null },
      { title: "Personal trainer", organisation: "Pulse Gym", startMonth: "2019-09", endMonth: "2023-01" },
    ],
  };
  assert.equal(yearsOfExperience(d, "2026-10-15"), 7);
  assert.equal(specialtySub(d, "2026-10-15"), "Spin and strength · 7 years' experience");
  assert.deepEqual(jobRow(d.experience[0]), { title: "Head coach, Northside Fitness", sub: "2023 to now" });
  assert.deepEqual(jobRow(d.experience[1]), { title: "Personal trainer, Pulse Gym", sub: "2019 to 2023" });
  assert.deepEqual(profileLink("website", d.website), { text: "karimtrains.com", href: "https://karimtrains.com/" });
  assert.equal(profileLink("website", "javascript:alert(1)").href, null);
  assert.deepEqual(profileLink("instagram", d.instagram), { text: "@john.trains", href: "https://www.instagram.com/john.trains/" });
  assert.deepEqual(profileLink("x", d.x), { text: "@karimtrains", href: "https://x.com/karimtrains" });
  assert.equal(requestLine(d, "2026-10-15"), "Personal trainer · Spin and strength");
  assert.equal(requestLine({ ...d, subtype: null, specialty: null }, "2026-10-15"), "7 years' experience");
  assert.equal(requestLine(null, "2026-10-15"), null);
});

test("Batch 2 CO: an invitation's window reads as pending, expired or withdrawn, and unknown shows nothing", () => {
  const now = new Date(2026, 9, 21, 12, 0);
  const p = person("b", "Taylor H", false);
  const win = (expiresAt: string | null, revokedAt: string | null = null) => ({ ...p, invite: { expiresAt, revokedAt, sentAt: null, resentCount: 0 } });
  const in9 = new Date(2026, 9, 30, 9, 0).toISOString();
  const ago7 = new Date(2026, 9, 14, 9, 0).toISOString();
  const revoked = new Date(2026, 9, 20, 9, 0).toISOString();
  // Unknown (the window wasn't read): no state, no line, the plain word.
  assert.equal(inviteState(p, now), "unknown");
  assert.equal(inviteWhen(p, now), null);
  assert.equal(invitedWord(p, now), "Invited");
  // Accepted people never carry an invite state.
  assert.equal(inviteState({ ...win(ago7), acceptedAt: "2026-10-01T00:00:00Z" }, now), "unknown");
  assert.equal(inviteState(win(in9), now), "pending");
  assert.equal(inviteWhen(win(in9), now), "Expires Oct 30");
  assert.equal(invitedWord(win(in9), now), "Invited");
  assert.equal(inviteState(win(ago7), now), "expired");
  assert.equal(inviteWhen(win(ago7), now), "Expired Oct 14");
  assert.equal(invitedWord(win(ago7), now), "Expired");
  // No window at all is not "forever" (team_invite_is_acceptable).
  assert.equal(inviteState(win(null), now), "expired");
  assert.equal(inviteWhen(win(null), now), "Expired");
  // Withdrawn wins over a live window.
  assert.equal(inviteState(win(in9, revoked), now), "withdrawn");
  assert.equal(inviteWhen(win(in9, revoked), now), "Withdrawn Oct 20");
  // Exactly at expiry it has lapsed (expires_at > now() is the rule).
  assert.equal(inviteState(win(now.toISOString()), now), "expired");
});

test("Batch 2 CO: short dates are 'Oct 14', with the year only when it isn't this year", () => {
  const now = new Date(2026, 9, 21);
  assert.equal(shortDay(new Date(2026, 9, 14, 10).toISOString(), now), "Oct 14");
  assert.equal(shortDay(new Date(2027, 0, 3, 10).toISOString(), now), "Jan 3, 2027");
  assert.equal(shortDay("not a date", now), "");
  assert.equal(lowerFirst("Expires Oct 30"), "expires Oct 30");
});

test("a withdrawn invitation is listed apart and counts for nothing (Batch 2 CO)", () => {
  const win = (revokedAt: string | null) => ({ expiresAt: "2026-11-01T00:00:00Z", revokedAt, sentAt: null, resentCount: 0 });
  const a = person("a", "Rami", true);
  const open = { ...person("b", "Taylor H", false), invite: win(null) };
  const gone1 = { ...person("c", "Nour", false), invite: win("2026-10-20T09:00:00Z") };
  const gone2 = { ...person("d", "Lea", false, undefined, "manager"), invite: win("2026-10-21T09:00:00Z") };
  const unknown = person("e", "Sami", false); // the window read failed: never treated as withdrawn
  const people = [a, open, gone1, gone2, unknown];
  assert.equal(isWithdrawn(gone1), true);
  assert.equal(isWithdrawn(open), false);
  assert.equal(isWithdrawn(unknown), false);
  assert.deepEqual(onTeam(people).map((p) => p.professionalId), ["a", "b", "e"]);
  assert.deepEqual(withdrawnPeople(people).map((p) => p.professionalId), ["d", "c"]);
  assert.deepEqual(seatHolders(people).map((p) => p.professionalId), ["a", "b", "e"]);
  assert.deepEqual(noSeatPeople(people).map((p) => p.professionalId), []);
  const now = new Date("2026-10-21T12:00:00Z");
  assert.deepEqual(seatCounts(people, 5, null, now), { used: 1, invited: 2, total: 5, free: 2 });
  // An expired invitation is still on the board but holds no seat (seats_invited agrees).
  const lapsed = { ...person("f", "Omar", false), invite: { ...win(null), expiresAt: "2026-10-14T00:00:00Z" } };
  assert.deepEqual(seatCounts([...people, lapsed], 5, null, now), { used: 1, invited: 2, total: 5, free: 2 });
  assert.equal(inviteWhen(gone1, now), "Withdrawn Oct 20");
});
