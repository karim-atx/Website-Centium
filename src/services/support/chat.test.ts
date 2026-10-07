import { strict as assert } from "node:assert";
import { test } from "node:test";
import { describeSupportError, parseSupportThread, supportEntryValue, supportUnreadBadge } from "./chat";
import { OFFLINE_MESSAGE } from "../network-error";

const row = {
  thread_id: "b1500000-0000-4000-8000-000000000001",
  created_at: "2026-10-01T10:00:00Z",
  messages_total: 2,
  unread_count: 1,
  last_message_at: "2026-10-02T17:34:34Z",
  last_from_support: true,
};

test("zero rows from my_support_thread is no thread, not an error", () => {
  assert.equal(parseSupportThread([]), null);
  assert.equal(parseSupportThread(null), null);
  assert.equal(parseSupportThread([{ thread_id: null }]), null);
});

test("one row is read in full", () => {
  assert.deepEqual(parseSupportThread([row]), {
    threadId: row.thread_id,
    createdAt: row.created_at,
    messagesTotal: 2,
    unreadCount: 1,
    lastMessageAt: row.last_message_at,
    lastFromSupport: true,
  });
});

test("an empty thread has no last message and no last speaker", () => {
  const t = parseSupportThread([{ ...row, messages_total: 0, unread_count: 0, last_message_at: null, last_from_support: null }]);
  assert.ok(t);
  assert.equal(t.lastMessageAt, null);
  assert.equal(t.lastFromSupport, null);
  assert.equal(supportEntryValue(t, () => "x"), "Start a chat");
});

test("the row value says who spoke last", () => {
  const fmt = () => "Mon";
  assert.equal(supportEntryValue(null, fmt), "Start a chat");
  assert.equal(supportEntryValue(parseSupportThread([row]), fmt), "Centium replied · Mon");
  assert.equal(supportEntryValue(parseSupportThread([{ ...row, last_from_support: false }]), fmt), "Sent · Mon");
});

test("the unread badge is hidden at zero and capped at 99+", () => {
  assert.equal(supportUnreadBadge(null), null);
  assert.equal(supportUnreadBadge(parseSupportThread([{ ...row, unread_count: 0 }])), null);
  assert.equal(supportUnreadBadge(parseSupportThread([row])), "1");
  assert.equal(supportUnreadBadge(parseSupportThread([{ ...row, unread_count: 250 }])), "99+");
  assert.equal(supportUnreadBadge(parseSupportThread([{ ...row, unread_count: "3" }])), "3");
});

test("refusals map to sentences", () => {
  assert.equal(describeSupportError({ message: "Failed to fetch" }), OFFLINE_MESSAGE);
  assert.match(describeSupportError({ code: "ATX01", message: "authentication required" }), /Sign in again/);
  assert.match(describeSupportError({ code: "22023", message: "the support identity cannot open a thread with itself" }), /itself/);
  assert.match(
    describeSupportError({ code: "P0001", message: "the support identity is not provisioned -- no system_identities row" }),
    /Email us/
  );
  assert.match(describeSupportError({ code: "XX000", message: "boom" }), /Try again/);
});
