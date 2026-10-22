import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addCta,
  addTitle,
  addedDuringWindow,
  addedStrip,
  classLine,
  classTile,
  countdownParts,
  feeRoleLine,
  firstName,
  fullDate,
  hireLine,
  hiringRowLine,
  inviteIdentifierKind,
  inviteNote,
  isEmailOrPhone,
  removeConfirmBody,
  removeSentence,
  shortDate,
  windowPct,
} from "./teamModel.ts";
import { windowUsed, type TeamMember } from "../../../services/hiring/model.ts";

const NOW = new Date(2026, 9, 22);

test("dates are month first; the current year drops off the short form", () => {
  assert.equal(fullDate("2026-03-02"), "Mar 2, 2026");
  assert.equal(fullDate(null), "");
  assert.equal(shortDate("2026-10-18", NOW), "Oct 18");
  assert.equal(shortDate("2025-10-18", NOW), "Oct 18, 2025");
});

test("hire line: first hire with the year, the latest as rehired, class slot", () => {
  assert.equal(hireLine([], NOW), null);
  assert.equal(hireLine([{ id: "a", title: "", type: "role", hiredAt: "2026-09-14", startsOn: null }], NOW), "Hired via Centium · Sep 14, 2026");
  assert.equal(
    hireLine(
      [
        { id: "b", title: "", type: "role", hiredAt: "2026-10-18", startsOn: null },
        { id: "a", title: "", type: "role", hiredAt: "2026-03-02", startsOn: null },
      ],
      NOW,
    ),
    "Hired via Centium · Mar 2, 2026 · rehired Oct 18",
  );
  assert.equal(hireLine([{ id: "c", title: "", type: "class_slot", hiredAt: "2026-10-18", startsOn: null }], NOW), "Hired via Centium · Oct 18, 2026 · class slot");
});

test("class tile and line are 12-hour with the day", () => {
  assert.deepEqual(classTile({ weekday: 5, startTime: "18:30" }), { time: "6:30", day: "FRI · PM" });
  assert.deepEqual(classTile({ weekday: 7, startTime: "10:00:00" }), { time: "10:00", day: "SUN · AM" });
  assert.deepEqual(classTile({ weekday: 6, startTime: "00:15" }), { time: "12:15", day: "SAT · AM" });
  assert.deepEqual(classTile({ weekday: null, startTime: null }), { time: "", day: "" });
  assert.equal(classLine({ weekday: 4, label: null }), "Every Thursday");
  assert.equal(classLine({ weekday: 4, label: "Every Thursday · Boxing" }), "Every Thursday · Boxing");
  assert.equal(classLine({ weekday: null, label: null }), "");
});

test("remove dialog: first name and the class sentence", () => {
  assert.equal(firstName("Sami Tannous"), "Sami");
  assert.equal(removeSentence([]), null);
  assert.equal(removeSentence([{ title: "Boxing Basics" }]), "Boxing Basics will show Instructor not listed to clients until you name someone else.");
  assert.equal(removeSentence([{ title: "Spin 45" }, { title: "Spin 45" }]), "Spin 45 will show Instructor not listed to clients until you name someone else.");
  assert.equal(removeSentence([{ title: "A" }, { title: "B" }, { title: "C" }]), "A, B and C will show Instructor not listed to clients until you name someone else.");
});

test("fee role line", () => {
  assert.equal(feeRoleLine("Sunday Spin instructor", "role", "2026-10-18"), "Sunday Spin instructor · Role · hired Oct 18, 2026");
  assert.equal(feeRoleLine("Saturday Spin cover", "class_slot", null), "Saturday Spin cover · Class slot");
});

test("existing team: countdown, bar, CTA words, note", () => {
  assert.deepEqual(countdownParts(24), { figure: "24", unit: "days left" });
  assert.deepEqual(countdownParts(1), { figure: "1", unit: "day left" });
  assert.deepEqual(countdownParts(0), { figure: "Last day", unit: "" });
  assert.equal(windowPct(windowUsed(24)), "20%");
  assert.equal(windowPct(windowUsed(30)), "0%");
  assert.equal(windowPct(windowUsed(0)), "100%");
  assert.equal(addCta(3), "Add 3 professionals · free");
  assert.equal(addCta(1), "Add 1 professional · free");
  assert.equal(addTitle(3), "Add 3 professionals to your team?");
  assert.equal(addedStrip(3), "3 professionals added to your team · free");
  assert.equal(inviteNote("2026-11-14"), "Free · existing team. No hiring fee. The invite must be accepted by Nov 14, 2026.");
  assert.equal(inviteNote(null), "Free · existing team. No hiring fee.");
});

test("email or phone", () => {
  assert.ok(isEmailOrPhone("lara.mansour@email.com"));
  assert.ok(isEmailOrPhone("+961 3 123 456"));
  assert.ok(!isEmailOrPhone("12345"));
  assert.ok(!isEmailOrPhone("lara"));
  assert.ok(!isEmailOrPhone(""));
});

test("added during the window = existing_team source", () => {
  const base = { professional: { id: "x", name: "", photoUrl: null, specialty: null, rating: null, reviewCount: 0, hiredViaCentiumCount: 0, distanceKm: null, onTeam: true, rank: null }, firstAddedAt: null, hires: [], classes: [] };
  const team: TeamMember[] = [
    { ...base, source: "hire" },
    { ...base, source: "existing_team" },
  ];
  assert.equal(addedDuringWindow(team).length, 1);
});

test("employee invite identifier: email, code, neither", () => {
  assert.equal(inviteIdentifierKind("joe.abinader@email.com"), "email");
  assert.equal(inviteIdentifierKind(" RKHO-7Q2M "), "code");
  assert.equal(inviteIdentifierKind("joe"), "other");
  assert.equal(inviteIdentifierKind("joe abinader"), "other");
  assert.equal(inviteIdentifierKind("ABCD"), "other");
});

test("Gym card Hiring line", () => {
  assert.equal(hiringRowLine(3, 3, 3), "3 openings · 3 new applicants · Team of 3");
  assert.equal(hiringRowLine(1, 1, 0), "1 opening · 1 new applicant · Team of 0");
});

test("remove step 2: the fee line only when a fee was charged (W4 lead decision)", () => {
  const fee = "This can't be undone. The hiring fee already charged isn't refunded.";
  assert.equal(removeConfirmBody({ source: "hire", hires: [{}] }), fee);
  assert.equal(removeConfirmBody({ source: "existing_team", hires: [{}] }), fee, "an existing-team member later hired again");
  assert.equal(removeConfirmBody({ source: "existing_team", hires: [] }), "This can't be undone.");
});
