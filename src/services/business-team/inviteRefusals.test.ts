import { strict as assert } from "node:assert";
import { test } from "node:test";
import { acceptRefusal, reinviteRefusal, resendRefusal, retryIn, revokeRefusal } from "./inviteRefusals";

// The documented errors of resend_team_invite, revoke_team_invite,
// reinvite_revoked_team_member and accept_business_employment (migration
// 20261201000000), each worded.

const offline = { message: "TypeError: Failed to fetch" };

test("resend: every documented refusal has its own words", () => {
  assert.deepEqual(resendRefusal(offline), { message: "Couldn't resend the invite. Check your connection and try again.", refresh: false });
  assert.deepEqual(resendRefusal({ code: "42501", message: "you cannot manage this business team" }), { message: "You can't manage this team's invites.", refresh: false });
  assert.equal(resendRefusal({ code: "42501", message: "authentication required" }).message, "You can't manage this team's invites.");
  assert.deepEqual(resendRefusal({ code: "ATXA3", message: "no such invitation" }), { message: "This invite isn't there any more. They may have declined it.", refresh: true });
  assert.deepEqual(resendRefusal({ code: "ATXA3", message: "that invitation was already accepted" }), { message: "They already accepted, so they're on your team now.", refresh: true });
  assert.deepEqual(resendRefusal({ code: "ATXA3", message: "that invitation was withdrawn" }), { message: "This invite was withdrawn, so it can't be resent.", refresh: true });
  assert.deepEqual(resendRefusal({ code: "ATX02", message: "Too many resend_team_invite attempts. Please try again in 12 minute(s)." }), {
    message: "You've resent a lot of invites in the last hour. Try again in 12 minutes.",
    refresh: false,
  });
  assert.equal(resendRefusal({ code: "ATX02", message: "Too many attempts." }).message, "You've resent a lot of invites in the last hour. Try again in an hour.");
  assert.deepEqual(resendRefusal({ code: "XX000", message: "boom" }), { message: "Couldn't resend the invite. Try again.", refresh: false });
  assert.equal(resendRefusal({ code: "ATXA3", message: "something new" }).message, "Couldn't resend the invite. Try again.");
});

test("revoke: every documented refusal has its own words", () => {
  assert.equal(revokeRefusal(offline).message, "Couldn't withdraw the invite. Check your connection and try again.");
  assert.equal(revokeRefusal({ code: "42501", message: "you cannot manage this business team" }).message, "You can't manage this team's invites.");
  assert.deepEqual(revokeRefusal({ code: "ATXA3", message: "no such invitation" }), { message: "This invite isn't there any more. They may have declined it.", refresh: true });
  assert.deepEqual(revokeRefusal({ code: "ATXA3", message: "that person already works here -- end their employment instead of revoking an invitation" }), {
    message: "They already accepted, so they're on your team. To end that, use Remove from team.",
    refresh: true,
  });
  assert.deepEqual(revokeRefusal({ code: "XX000", message: "boom" }), { message: "Couldn't withdraw the invite. Try again.", refresh: false });
  assert.equal(revokeRefusal({ code: "ATXAB", message: "This business is closed and is not taking new activity." }).message, "Your business is closed, so its invites can't be changed.");
});

test("invite again: every refusal reinvite_revoked_team_member raises has its own words", () => {
  assert.equal(reinviteRefusal(offline).message, "Couldn't invite them again. Check your connection and try again.");
  assert.equal(reinviteRefusal({ code: "42501", message: "authentication required" }).message, "You can't manage this team's invites.");
  assert.equal(reinviteRefusal({ code: "42501", message: "you cannot manage this business team" }).message, "You can't manage this team's invites.");
  assert.deepEqual(reinviteRefusal({ code: "ATX02", message: "Too many reinvite_revoked_team_member attempts. Please try again in 7 minute(s)." }), {
    message: "You've sent a lot of invites in the last hour. Try again in 7 minutes.",
    refresh: false,
  });
  assert.deepEqual(reinviteRefusal({ code: "ATXA3", message: "no previous invitation for that person -- invite them instead" }), {
    message: "This invite isn't there any more. Add them again to send a new one.",
    refresh: true,
  });
  assert.deepEqual(reinviteRefusal({ code: "ATXA3", message: "that person already works here" }), { message: "They already accepted, so they're on your team now.", refresh: true });
  assert.equal(reinviteRefusal({ code: "ATXAB", message: "This business is closed and is not taking new activity." }).message, "Your business is closed, so its invites can't be changed.");
  assert.deepEqual(reinviteRefusal({ code: "XX000", message: "boom" }), { message: "Couldn't invite them again. Try again.", refresh: false });
  // 251ab70: the seat check, as raised (23514, "ATXC0: ..." in the message).
  assert.deepEqual(reinviteRefusal({ code: "23514", message: "ATXC0: no free seats (5 of 5 used) -- buy a seat block or remove somebody first" }), {
    message: "All seats are in use. Add a seat block or free a seat, then invite them again.",
    refresh: true,
    noSeats: true,
  });
});

test("accept: ATXA3's three meanings are worded apart, nothing else is claimed", () => {
  assert.deepEqual(acceptRefusal({ code: "ATXA3", message: "no invitation from that business" }), {
    kind: "gone",
    message: "This invitation isn't there any more. The business may have removed it.",
  });
  assert.deepEqual(acceptRefusal({ code: "ATXA3", message: "that invitation was withdrawn" }), { kind: "withdrawn", message: "This invitation was withdrawn." });
  assert.deepEqual(acceptRefusal({ code: "ATXA3", message: "that invitation has expired" }), {
    kind: "expired",
    message: "This invitation has expired. Ask the business to send it again.",
  });
  assert.deepEqual(acceptRefusal({ code: "ATXA3", message: "?" }), { kind: null, message: "This invitation can't be accepted any more." });
  assert.equal(acceptRefusal({ code: "23514", message: "ATXC0" }), null);
  assert.equal(acceptRefusal(null), null);
});

test("retryIn reads check_rate_limit's minutes", () => {
  assert.equal(retryIn({ message: "Please try again in 1 minute(s)." }), "Try again in 1 minute.");
  assert.equal(retryIn({ message: "" }), "Try again in an hour.");
});

test("no copy carries an em dash, curly quotes or the server's double hyphen", () => {
  const all = [
    resendRefusal(offline),
    resendRefusal({ code: "42501" }),
    resendRefusal({ code: "ATX02" }),
    resendRefusal({ code: "ATXA3", message: "no such invitation" }),
    resendRefusal({ code: "ATXA3", message: "that invitation was already accepted" }),
    resendRefusal({ code: "ATXA3", message: "that invitation was withdrawn" }),
    revokeRefusal({ code: "ATXA3", message: "that person already works here -- x" }),
    revokeRefusal({ code: "ATXAB" }),
    reinviteRefusal({ code: "ATXA3", message: "no previous invitation for that person -- invite them instead" }),
    reinviteRefusal({ code: "ATX02" }),
    reinviteRefusal({ code: "23514", message: "ATXC0: no free seats (5 of 5 used) -- buy a seat block or remove somebody first" }),
  ].map((r) => r.message);
  for (const m of all) assert.ok(!/—|--|‘|’/.test(m), m);
});
