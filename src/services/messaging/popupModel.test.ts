import { strict as assert } from "node:assert";
import { test } from "node:test";
import { enqueuePopup, parseMessagePopup, popupLine, popupSuppressedAt, popupTitle, POPUP_QUEUE_MAX, type MessagePopup } from "./popupModel.ts";

const row = (o: Record<string, unknown> = {}) => ({
  message_id: "m1",
  thread_id: "t1",
  thread_kind: "peer",
  thread_name: "Sara",
  sender_label: "Sara",
  preview: "See you at 6",
  has_attachment: false,
  is_voice_note: false,
  is_support: false,
  created_at: "2026-10-29T09:00:00Z",
  ...o,
});
const pop = (o: Record<string, unknown> = {}) => parseMessagePopup([row(o)]) as MessagePopup;

test("message_popup(): one row is a pop-up, no row is none", () => {
  assert.equal(parseMessagePopup([]), null);
  assert.equal(parseMessagePopup(null), null);
  assert.equal(parseMessagePopup([{ thread_id: "t1" }]), null);
  assert.deepEqual(pop(), {
    messageId: "m1", threadId: "t1", threadKind: "peer", threadName: "Sara", senderLabel: "Sara", preview: "See you at 6",
    hasAttachment: false, isVoiceNote: false, isSupport: false, createdAt: "2026-10-29T09:00:00Z",
  });
});

test("title: support is Centium Support, a group names group and sender, else the sender", () => {
  assert.equal(popupTitle(pop()), "Sara");
  assert.equal(popupTitle(pop({ is_support: true, thread_kind: "official_support", sender_label: "Fixture Desk" })), "Centium Support");
  assert.equal(popupTitle(pop({ thread_kind: "group", thread_name: "Run club", sender_label: "Omar" })), "Run club · Omar");
  assert.equal(popupTitle(pop({ thread_kind: "business", thread_name: "Member #0001", sender_label: "Member #0001" })), "Member #0001");
  assert.equal(popupTitle(pop({ sender_label: null, thread_name: null })), "New message");
});

test("line: the preview, else voice note or attachment, else New message (previews off)", () => {
  assert.equal(popupLine(pop()), "See you at 6");
  assert.equal(popupLine(pop({ preview: null })), "New message");
  assert.equal(popupLine(pop({ preview: null, has_attachment: true, is_voice_note: true })), "Voice note");
  assert.equal(popupLine(pop({ preview: null, has_attachment: true })), "Attachment");
});

test("queue: arrivals in one thread group into one card; a burst keeps the showing card and the newest", () => {
  let q = enqueuePopup([], pop());
  q = enqueuePopup(q, pop({ message_id: "m2" }));
  q = enqueuePopup(q, pop({ message_id: "m3" }));
  assert.equal(q.length, 1);
  assert.deepEqual([q[0].count, q[0].line, q[0].stamp], [3, "3 new messages", "m3"]);
  for (let i = 2; i <= 8; i++) q = enqueuePopup(q, pop({ message_id: `x${i}`, thread_id: `t${i}` }));
  assert.equal(q.length, POPUP_QUEUE_MAX + 1);
  assert.equal(q[0].threadId, "t1");
  assert.deepEqual(q.slice(1).map((c) => c.threadId), ["t6", "t7", "t8"]);
});

test("never on the chat itself", () => {
  assert.equal(popupSuppressedAt("/app/messages"), true);
  assert.equal(popupSuppressedAt("/app/messages/abc"), true);
  assert.equal(popupSuppressedAt("/app/messages-archive"), false);
  assert.equal(popupSuppressedAt("/app"), false);
});
