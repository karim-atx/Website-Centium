import { test } from "node:test";
import assert from "node:assert/strict";
import { enquiryStatus, summarise, tabOf, type ThreadLike as MessageThread } from "./messagesModel";

const me = "me";
const base: MessageThread = {
  id: "t",
  participantId: "p",
  participantName: "Chris",
  kind: "peer",
  lastMessagePreview: "Hi",
  lastMessageAt: "2026-10-15T10:00:00Z",
  lastMessageId: "m",
  lastMessageSenderId: "p",
  unreadCount: 0,
  venue: null,
  otherRole: null,
};
const t = (o: Partial<MessageThread>): MessageThread => ({ ...base, ...o });

test("tabs: clients, enquiries, groups, businesses", () => {
  const clients = new Set(["c1"]);
  assert.equal(tabOf(t({ participantId: "c1" }), clients), "clients");
  assert.equal(tabOf(t({ participantId: "x" }), clients), "enquiries");
  assert.equal(tabOf(t({ kind: "group", participantId: null }), clients), "groups");
  assert.equal(tabOf(t({ kind: "business" }), clients), "businesses");
  assert.equal(tabOf(t({ venue: { memberSide: true } }), clients), "businesses");
  assert.equal(tabOf(t({ kind: "official_support" }), clients), "clients");
  assert.equal(tabOf(t({ otherRole: "dietitian" }), clients), "clients");
  assert.equal(tabOf(t({ participantId: null }), clients), "clients");
});

test("enquiry status: New while unread, Plans sent after my plans card, Replied otherwise", () => {
  assert.deepEqual(enquiryStatus(t({ unreadCount: 1 }), me, {}), { label: "New", dot: "gold" });
  assert.deepEqual(enquiryStatus(t({ lastMessageSenderId: me }), me, { m: "plans_offer" }), { label: "Plans sent", dot: "prDark" });
  assert.deepEqual(enquiryStatus(t({ lastMessageSenderId: me }), me, {}), { label: "Replied", dot: "chF" });
  assert.equal(enquiryStatus(t({}), me, {}), null);
});

test("summary: unread total, enquiries waiting, newest incoming client or enquiry message", () => {
  const s = summarise(
    [
      t({ id: "a", participantId: "c1", unreadCount: 2, lastMessageAt: "2026-10-15T09:00:00Z", participantName: "Maya", lastMessagePreview: "Done" }),
      t({ id: "b", participantId: "x", unreadCount: 1, lastMessageAt: "2026-10-15T08:00:00Z" }),
      t({ id: "c", kind: "group", participantId: null, unreadCount: 3, lastMessageAt: "2026-10-15T11:00:00Z" }),
      t({ id: "d", participantId: "c1", lastMessageSenderId: me, lastMessageAt: "2026-10-15T12:00:00Z" }),
    ],
    new Set(["c1"]),
    me
  );
  assert.equal(s.unread, 6);
  assert.equal(s.newEnquiries, 1);
  assert.deepEqual(s.latest, { name: "Maya", preview: "Done", at: "2026-10-15T09:00:00Z", unread: true });
  assert.equal(s.hasAny, true);
  assert.deepEqual(summarise([], new Set(), me), { unread: 0, newEnquiries: 0, latest: null, hasAny: false });
});
