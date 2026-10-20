import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  DECLINE_UNDO_MS,
  NOT_TAKING_BOOKINGS,
  RETURN_TTL_MS,
  SLOT_TAKEN,
  declineIsFinal,
  declineText,
  describeBookingError,
  inviteView,
  publicReviewRows,
  PUBLIC_REVIEWS_PAGE,
  isPublicReturnPath,
  localDay,
  mondayOf,
  readReturn,
  sessionsThatFit,
  slotsByDay,
  weekDays,
} from "./logic";

test("booking errors use the contract's words", () => {
  assert.equal(describeBookingError("ATXG5"), NOT_TAKING_BOOKINGS);
  assert.equal(NOT_TAKING_BOOKINGS, "This professional isn't taking bookings from you.");
  assert.equal(describeBookingError("ATXG6"), SLOT_TAKEN);
  assert.equal(SLOT_TAKEN, "That time is no longer free.");
  assert.match(describeBookingError(undefined, true), /offline/);
  assert.equal(describeBookingError("XX000"), "Couldn't book this session. Try again.");
});

test("weeks start on Monday", () => {
  // Thursday 15 Oct 2026 -> Monday 12 Oct.
  assert.equal(localDay(mondayOf(new Date(2026, 9, 15, 13))), "2026-10-12");
  // A Sunday belongs to the week that started six days before.
  assert.equal(localDay(mondayOf(new Date(2026, 9, 18, 23))), "2026-10-12");
  // A Monday is its own week's start.
  assert.equal(localDay(mondayOf(new Date(2026, 9, 19, 0, 5))), "2026-10-19");
  const days = weekDays(new Date(2026, 9, 26));
  assert.equal(days.length, 7);
  assert.equal(localDay(days[6]), "2026-11-01");
});

const at = (h: number, m = 0) => new Date(2026, 9, 20, h, m).toISOString();
const slot = (h: number, m: number, mins: number) => ({ startsAt: at(h, m), endsAt: new Date(new Date(at(h, m)).getTime() + mins * 60000).toISOString() });

test("sessions that fit count bookable sessions, not 15-minute starts", () => {
  // 9:00 to 11:00 with a 45-minute session offers 9:00, 9:15, ... 10:15.
  const starts = [0, 15, 30, 45, 60, 75].map((m) => slot(9 + Math.floor(m / 60), m % 60, 45));
  assert.equal(sessionsThatFit(starts), 2);
  assert.equal(sessionsThatFit([]), 0);
  assert.equal(sessionsThatFit([slot(9, 0, 60), slot(14, 0, 60)]), 2);
});

test("slots group by local day in time order", () => {
  const map = slotsByDay([slot(14, 0, 30), slot(9, 0, 30)]);
  assert.deepEqual([...map.keys()], ["2026-10-20"]);
  assert.equal(map.get("2026-10-20")![0].startsAt, at(9));
});

test("invite view: unusable first, then who is looking", () => {
  const p = { usable: true, usableMessage: null, professionalId: "pro" };
  assert.deepEqual(inviteView({ ...p, usable: false, usableMessage: "That invite link has expired." }, { userId: null, accountType: null }), {
    kind: "unusable",
    message: "That invite link has expired.",
  });
  assert.equal(inviteView({ ...p, usable: false }, { userId: "me", accountType: "customer" }).kind, "unusable");
  assert.equal(inviteView(p, { userId: null, accountType: null }).kind, "signed_out");
  assert.equal(inviteView(p, { userId: "pro", accountType: "professional" }).kind, "own");
  assert.equal(inviteView(p, { userId: "me", accountType: "business" }).kind, "not_client");
  assert.equal(inviteView(p, { userId: "me", accountType: "customer" }).kind, "client");
});

test("a decline shows the professional's note, else the reason", () => {
  assert.equal(declineText("Fully booked", "Fully booked until January."), '"Fully booked until January."');
  assert.equal(declineText("Fully booked", "  "), "Fully booked.");
  assert.equal(declineText(null, null), null);
});

test("a decline is final only after the 5-minute undo window", () => {
  const now = Date.UTC(2026, 9, 15, 12);
  assert.equal(declineIsFinal(new Date(now - DECLINE_UNDO_MS + 1000).toISOString(), now), false);
  assert.equal(declineIsFinal(new Date(now - DECLINE_UNDO_MS).toISOString(), now), true);
  assert.equal(declineIsFinal(null, now), false);
});

test("only our public pages are kept as a return path", () => {
  assert.equal(isPublicReturnPath("/i/RAMI-R3COACH1"), true);
  assert.equal(isPublicReturnPath("/p/dana.diet"), true);
  assert.equal(isPublicReturnPath("/p/dana.diet/book?service=abc&slot=2026-10-20T09%3A00%3A00.000Z"), true);
  assert.equal(isPublicReturnPath("/s/0b9f6a52-3c1e-4d55-9a1f-2f7f3c1d2e4b"), true);
  assert.equal(isPublicReturnPath("/s/../app"), false);
  assert.equal(isPublicReturnPath("/app/settings"), false);
  assert.equal(isPublicReturnPath("https://evil.example/i/X"), false);
  assert.equal(isPublicReturnPath("//evil.example"), false);
  assert.equal(isPublicReturnPath(null), false);
});

test("a stored return expires after an hour", () => {
  const now = 1_000_000_000;
  const raw = (path: string, ago: number) => JSON.stringify({ path, at: now - ago });
  assert.equal(readReturn(raw("/i/ABC", 1000), now), "/i/ABC");
  assert.equal(readReturn(raw("/i/ABC", RETURN_TTL_MS + 1), now), null);
  assert.equal(readReturn(raw("/app", 0), now), null);
  assert.equal(readReturn("not json", now), null);
  assert.equal(readReturn(null, now), null);
});

test("public reviews: every reviewer is 'A client', removed reviews and empty replies are not shown", () => {
  const rows = publicReviewRows(
    [
      { id: "a", rating: 5, body: "Great coach", created_at: "2026-10-01T10:00:00Z", edited_at: null, redacted: false, reply_body: "Thank you!", reply_at: "2026-10-02T10:00:00Z" },
      { id: "b", rating: 4, body: "  ", created_at: "2026-09-01T10:00:00Z", edited_at: "2026-09-02T10:00:00Z", redacted: false, reply_body: null, reply_at: null },
      { id: "c", rating: null, body: null, created_at: "2026-08-01T10:00:00Z", edited_at: null, redacted: true, reply_body: null, reply_at: null },
    ],
    "pro-1"
  );
  assert.equal(rows.length, 2);
  for (const r of rows) {
    assert.equal(r.reviewerName, null);
    assert.equal(r.reviewerId, null);
    assert.equal(r.reviewerNameVisible, false);
    assert.equal(r.professionalId, "pro-1");
  }
  assert.equal(rows[0].reply?.body, "Thank you!");
  assert.equal(rows[0].reply?.createdAt, "2026-10-02T10:00:00Z");
  assert.equal(rows[1].body, null);
  assert.equal(rows[1].reply, null);
  assert.equal(PUBLIC_REVIEWS_PAGE, 10);
});
