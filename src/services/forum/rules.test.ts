import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  composeChips,
  describeForumError,
  filterChips,
  forumAccess,
  forumAge,
  initialOf,
  initialsOf,
  nicknameNextChange,
  nicknameProblem,
  type ForumCategory,
} from "./rules.ts";
import { jpegCarriesMetadata, stripEncoderSegments } from "./photoBytes.ts";
import { detailDate } from "../../utils/date.ts";

const cats: ForumCategory[] = [
  { key: "general", name: "General", sensitivity: "general", sortOrder: 50 },
  { key: "progress", name: "Progress", sensitivity: "weight", sortOrder: 40 },
  { key: "workouts", name: "Workouts", sensitivity: "general", sortOrder: 10 },
  { key: "nutrition", name: "Nutrition", sensitivity: "diet", sortOrder: 20 },
  { key: "motivation", name: "Motivation", sensitivity: "general", sortOrder: 30 },
];

test("main chips: no General, sort order; recovery hides diet and weight", () => {
  assert.deepEqual(filterChips(cats, false).map((c) => c.key), ["workouts", "nutrition", "motivation", "progress"]);
  assert.deepEqual(filterChips(cats, true).map((c) => c.key), ["workouts", "motivation"]);
});

test("composer chips keep General", () => {
  assert.deepEqual(composeChips(cats, false).map((c) => c.key), ["workouts", "nutrition", "motivation", "progress", "general"]);
  assert.deepEqual(composeChips(cats, true).map((c) => c.key), ["workouts", "motivation", "general"]);
});

test("age gate", () => {
  assert.equal(forumAccess("1990-01-01"), "adult");
  const y = new Date().getUTCFullYear() - 10;
  assert.equal(forumAccess(`${y}-01-01`), "minor");
  assert.equal(forumAccess(undefined), "unknown-age");
});

test("nickname checks", () => {
  const reserved = new Set(["doctor", "support"]);
  assert.equal(nicknameProblem("ab", reserved, []), "format");
  assert.equal(nicknameProblem("has space", reserved, []), "format");
  assert.equal(nicknameProblem("a".repeat(21), reserved, []), "format");
  assert.equal(nicknameProblem("Doctor", reserved, []), "reserved");
  // Exact match only, like the server: containing a reserved word is fine.
  assert.equal(nicknameProblem("DoctorWho", reserved, []), null);
  assert.equal(nicknameProblem("Lina_Runs", reserved, ["Lina"]), "real-name");
  assert.equal(nicknameProblem("RunnerMaya", reserved, ["Lina"]), null);
  assert.equal(nicknameProblem("MaryRuns", reserved, ["Mary Ann"]), "real-name");
  // A two-letter name is not a basis for refusing.
  assert.equal(nicknameProblem("Alpha", reserved, ["Al"]), null);
});

test("refusal wording", () => {
  assert.equal(
    describeForumError({ code: "ATX57", message: "your access to the community forum is paused until Friday 09 Oct" }, "post"),
    "Your access to the community forum is paused until Friday 09 Oct."
  );
  assert.match(describeForumError({ code: "ATX02" }, "post")!, /5 posts an hour/);
  assert.match(describeForumError({ code: "ATX02" }, "reply")!, /20 replies an hour/);
  assert.equal(describeForumError({ code: "XX000" }, "post"), null);
});

test("initials", () => {
  assert.equal(initialOf("runnerMaya"), "R");
  assert.equal(initialOf(""), "?");
  assert.equal(initialsOf("Elie S."), "ES");
  assert.equal(initialsOf("Rami"), "R");
  assert.equal(initialsOf(""), "?");
});

test("forum age: day counts past a week (MO1.3)", () => {
  const now = Date.parse("2026-10-06T12:00:00Z");
  assert.equal(forumAge("2026-10-06T10:00:00Z", now), "2h");
  assert.equal(forumAge("2026-10-05T11:00:00Z", now), "Yesterday");
  assert.equal(forumAge("2026-08-29T12:00:00Z", now), "38d");
});

test("photo bytes: a re-drawn JPEG passes, Exif or a comment is refused", () => {
  const sos = [0xff, 0xda, 0x00, 0x02];
  const jfif = [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00];
  assert.equal(jpegCarriesMetadata(new Uint8Array([0xff, 0xd8, ...jfif, ...sos])), false);
  const exif = [0xff, 0xe1, 0x00, 0x04, 0x45, 0x78];
  assert.equal(jpegCarriesMetadata(new Uint8Array([0xff, 0xd8, ...jfif, ...exif, ...sos])), true);
  const comment = [0xff, 0xfe, 0x00, 0x03, 0x41];
  assert.equal(jpegCarriesMetadata(new Uint8Array([0xff, 0xd8, ...comment, ...sos])), true);
  assert.equal(jpegCarriesMetadata(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), true);
  // Chrome's encoder adds an ICC colour profile (APP2): allowed. Any other APP2 is not.
  const icc = [0xff, 0xe2, 0x00, 0x10, ...Array.from("ICC_PROFILE\0", (ch) => ch.charCodeAt(0)), 0x01, 0x01];
  assert.equal(jpegCarriesMetadata(new Uint8Array([0xff, 0xd8, ...jfif, ...icc, ...sos])), false);
  const otherApp2 = [0xff, 0xe2, 0x00, 0x06, 0x46, 0x50, 0x58, 0x52];
  assert.equal(jpegCarriesMetadata(new Uint8Array([0xff, 0xd8, ...otherApp2, ...sos])), true);
});

test("an encoder's own Exif and comments are stripped from a canvas JPEG; the colour profile and pixels stay", () => {
  const sos = [0xff, 0xda, 0x00, 0x02, 0x11, 0x22, 0xff, 0xd9];
  const jfif = [0xff, 0xe0, 0x00, 0x04, 0x00, 0x00];
  const exif = [0xff, 0xe1, 0x00, 0x06, 0x45, 0x78, 0x69, 0x66];
  const icc = [0xff, 0xe2, 0x00, 0x10, ...Array.from("ICC_PROFILE\0", (ch) => ch.charCodeAt(0)), 0x01, 0x01];
  const com = [0xff, 0xfe, 0x00, 0x03, 0x41];
  const dqt = [0xff, 0xdb, 0x00, 0x03, 0x07];
  const input = new Uint8Array([0xff, 0xd8, ...jfif, ...exif, ...icc, ...com, ...dqt, ...sos]);
  assert.equal(jpegCarriesMetadata(input), true);
  const out = stripEncoderSegments(input)!;
  assert.deepEqual([...out], [0xff, 0xd8, ...jfif, ...icc, ...dqt, ...sos]);
  assert.equal(jpegCarriesMetadata(out), false);
  assert.equal(stripEncoderSegments(new Uint8Array([0x89, 0x50, 0x4e, 0x47])), null);
});

test("ATX57 reads the end of the pause from details, month first", () => {
  const until = describeForumError({ code: "ATX57", message: "your access to the community forum is paused until 2026-10-09", details: "2026-10-09" }, "post")!;
  assert.equal(until, `Your access to the community forum is paused until ${detailDate("2026-10-09")}.`);
  // An older server put a formatted date in the message; that still reads.
  assert.equal(
    describeForumError({ code: "ATX57", message: "your access to the community forum is paused until Friday 09 Oct" }, "post"),
    "Your access to the community forum is paused until Friday 09 Oct."
  );
});

test("nickname refusals (Release 1): ATXK1 names the next allowed day, ATXK2 the contact rule", () => {
  const now = new Date(2026, 9, 29);
  // Noon UTC: the same calendar day in every timezone the app is used in.
  assert.equal(nicknameNextChange("2026-11-27T12:00:00Z", now), "Nov 27");
  assert.equal(nicknameNextChange("2027-01-03T12:00:00Z", now), "Jan 3, 2027");
  assert.equal(nicknameNextChange("soon", now), null);
  assert.equal(nicknameNextChange(null, now), null);
  assert.match(describeForumError({ code: "ATXK1", details: "2026-11-27T12:00:00Z" }, "nickname")!, /^You can change your nickname again on Nov 27(, \d{4})?\.$/);
  assert.equal(describeForumError({ code: "ATXK1" }, "nickname"), "You can change your nickname once every 30 days.");
  assert.equal(
    describeForumError({ code: "ATXK2" }, "nickname"),
    "A nickname can't contain a phone number or other contact details."
  );
  assert.equal(describeForumError({ code: "ATX63" }, "nickname"), "That nickname is taken. Choose a different one.");
});
