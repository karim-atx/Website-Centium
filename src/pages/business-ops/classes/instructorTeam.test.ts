import { test } from "node:test";
import assert from "node:assert/strict";
import type { TeamMember } from "../../../services/hiring/model.ts";

// TeamMember rows as services/hiring fetchMyTeam builds them from my_team (the test's own builder).
type Row = { professional_id: string; name?: string; specialty?: string | null; source: "hire" | "existing_team"; hires?: { id: string; title?: string; type?: "role" | "class_slot"; starts_on?: string }[] };
const parseTeam = (rows: Row[]): TeamMember[] =>
  rows.map((r) => ({
    professional: { id: r.professional_id, name: r.name ?? "", photoUrl: null, specialty: r.specialty ?? null, rating: null, reviewCount: 0, hiredViaCentiumCount: 0, distanceKm: null, onTeam: true, rank: null },
    source: r.source,
    firstAddedAt: null,
    hires: (r.hires ?? []).map((h) => ({ id: h.id, title: h.title ?? "", type: h.type ?? "role", hiredAt: null, startsOn: h.starts_on ?? null })),
    classes: [],
  }));
import { busyDayOf, clashBody, clashRows, clashTitle, firstNameOf, livePeople, teamPeople, teamSubLine, weekLoad } from "./instructorTeam.ts";

const team = parseTeam([
  { professional_id: "p-st", name: "Sami Tannous", specialty: "Boxing and HIIT", source: "hire", hires: [{ id: "h2", title: "Boxing Basics instructor", type: "role" }] },
  { professional_id: "p-nf", name: "Nour Fares", specialty: "Mobility and cycling", source: "hire", hires: [{ id: "h3", title: "Saturday Spin cover", type: "class_slot", starts_on: "2026-10-24" }] },
  { professional_id: "p-rk", name: "Rana Khoury", specialty: "Cycling and HIIT", source: "hire", hires: [{ id: "h1", type: "role" }, { id: "h4", type: "class_slot" }] },
  { professional_id: "p-la", name: "Lara Mansour", specialty: null, source: "existing_team", hires: [] },
  { professional_id: "p-jo", name: "Joe Haddad", specialty: "Yoga", source: "existing_team", hires: [] },
]);

test("Team rows: by name, the board's lines (fPerson)", () => {
  const rows = teamPeople(team);
  assert.deepEqual(
    rows.map((r) => [r.name, r.sub, r.muted]),
    [
      ["Joe Haddad", "Yoga", true],
      ["Lara Mansour", "On your team", true],
      ["Nour Fares", "Class slot · Sat, Oct 24 only", true],
      ["Rana Khoury", "Cycling and HIIT · Hired via Centium", false],
      ["Sami Tannous", "Boxing and HIIT · Hired via Centium", false],
    ],
  );
});

test("a class-slot hire with no date, and a role hire with no specialty", () => {
  const [slot, role] = parseTeam([
    { professional_id: "a", name: "A", source: "hire", hires: [{ id: "x", type: "class_slot" }] },
    { professional_id: "b", name: "B", source: "hire", hires: [{ id: "y", type: "role" }] },
  ]);
  assert.deepEqual(teamSubLine(slot), { sub: "Class slot · one session only", muted: true });
  assert.deepEqual(teamSubLine(role), { sub: "Hired via Centium", muted: false });
});

test("live rows (until my_team answers): first name and this week's load, muted, never 'Hired via Centium'", () => {
  const rows = livePeople([{ professionalId: "x", firstName: "Maya" }, { professionalId: "y", firstName: "Omar" }], (id) => (id === "x" ? 0 : 3));
  assert.deepEqual(
    rows.map((r) => [r.name, r.sub, r.muted]),
    [
      ["Maya", "No classes this week", true],
      ["Omar", "3 classes this week", true],
    ],
  );
  assert.equal(weekLoad(1), "1 class this week");
});

test("clash dialog: title, body without 'Assign anyway' wording, busy times only", () => {
  const series = { title: "Spin 45", date: "2026-11-01", startTime: "10:00", endTime: "10:45", weekdays: [7] };
  assert.equal(clashTitle(firstNameOf("Rana Khoury")), "Rana has a clash");
  assert.equal(clashTitle(""), "This instructor has a clash");
  assert.equal(clashBody(series, "Rana"), "Spin 45 on Sundays at 10:00 AM overlaps a time already busy on Rana's calendar.");
  assert.equal(clashBody(series, "Rana", 3), "Spin 45 on Sundays at 10:00 AM overlaps a time already busy on Rana's calendar. 3 sessions clash.");
  assert.deepEqual(clashRows(series, "Rana", { startTime: "10:00", endTime: "11:00", dayText: null }), [
    { k: "Spin 45", v: "Sun 10:00 to 10:45 AM, from Nov 1" },
    { k: "Rana's calendar", v: "Busy 10:00 to 11:00 AM" },
  ]);
  const once = { title: "Boxing Basics", date: "2026-10-22", startTime: "18:30", endTime: "19:15", weekdays: null };
  assert.equal(clashBody(once, "Sami"), "Boxing Basics on Thu, Oct 22 at 6:30 PM overlaps a time already busy on Sami's calendar.");
  assert.deepEqual(clashRows(once, "Sami", { startTime: null, endTime: null, dayText: "Thu, Oct 22" })[1], { k: "Sami's calendar", v: "Busy on Thu, Oct 22" });
  assert.deepEqual(clashRows(once, "", { startTime: null, endTime: null, dayText: null })[1], { k: "Their calendar", v: "Busy at this time" });
  const twice = { ...series, weekdays: [3, 1] };
  assert.equal(clashRows(twice, "Rana", { startTime: "10:00", endTime: "11:00", dayText: null })[0].v, "Mon and Wed 10:00 to 10:45 AM, from Nov 1");
  assert.equal(clashBody({ ...series, weekdays: [1, 2, 3, 4, 5, 6, 7] }, "Rana"), "Spin 45 every day at 10:00 AM overlaps a time already busy on Rana's calendar.");
});

test("the ATXD9 line's day", () => {
  assert.equal(busyDayOf("That instructor is already teaching at that time on Wed, Oct 21. Choose someone else or another time."), "Wed, Oct 21");
  assert.equal(busyDayOf("That instructor is already teaching at that time. Choose someone else or another time."), null);
});

test("DB9 instructor_not_on_team reads as the picker note, for save, edit and assign", async () => {
  const { refusalMessage } = await import("../../../services/business-classes/scheduleRules.ts");
  for (const action of ["save", "edit", "assign"] as const) {
    assert.equal(refusalMessage(action, { code: "P0001", message: "instructor_not_on_team" }), "Only your Team can be named. Add people through Hiring.");
  }
  assert.match(refusalMessage("assign", { code: "ATXD9", message: "busy (2026-10-21)" }), /already teaching/);
});
