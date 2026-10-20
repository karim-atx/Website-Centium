// Release 3 W9 post-review: Clients "Invites sent" rows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { channelLabel, sentInviteView } from "./sentInvitesModel";

const now = new Date("2026-10-20T12:00:00");
const row = (o: Partial<Parameters<typeof sentInviteView>[0]> = {}) => ({
  id: "i1",
  channel: "email",
  addressHint: "k***@mail.com",
  firstName: "Maya",
  message: "Looking forward to it.",
  createdAt: "2026-10-14T09:30:00",
  ...o,
});

test("sent invite: first name, channel and the short date", () => {
  assert.deepEqual(sentInviteView(row(), now), { id: "i1", name: "Maya", channel: "Email", meta: "Email · Oct 14", message: "Looking forward to it." });
});

test("sent invite: the masked address when there is no first name", () => {
  assert.equal(sentInviteView(row({ firstName: null }), now).name, "k***@mail.com");
  assert.equal(sentInviteView(row({ firstName: "   " }), now).name, "k***@mail.com");
  assert.equal(sentInviteView(row({ channel: "phone", firstName: null, addressHint: "***123" }), now).name, "***123");
});

test("sent invite: phone channel, year shown only in another year", () => {
  assert.equal(sentInviteView(row({ channel: "phone" }), now).meta, "Phone · Oct 14");
  assert.equal(sentInviteView(row({ createdAt: "2025-12-30T10:00:00" }), now).meta, "Email · Dec 30, 2025");
});

test("sent invite: a blank message is no message", () => {
  assert.equal(sentInviteView(row({ message: null }), now).message, null);
  assert.equal(sentInviteView(row({ message: "  " }), now).message, null);
});

test("channel label: phone is Phone, anything else Email", () => {
  assert.equal(channelLabel("phone"), "Phone");
  assert.equal(channelLabel("email"), "Email");
});
