import { strict as assert } from "node:assert";
import { test } from "node:test";
import { callIdFromLink, callLinkStep, notificationTarget } from "./messagePushUrl";

const id = "5e56706c-7843-4ef9-8270-13f494bc2f67";

test("a message notification opens its conversation, from data.messagePushId", () => {
  assert.equal(
    notificationTarget({ title: "New message from Sarah", url: "/app", tag: `push-${id}`, data: { messagePushId: id } }, "/app"),
    `/app/messages?push=${id}`
  );
});

test("the tag is not read: without data.messagePushId it is an ordinary notification", () => {
  assert.equal(notificationTarget({ url: "/app", tag: `push-${id}` }, "/app"), "/app");
});

test("only a uuid is accepted as a push id", () => {
  assert.equal(notificationTarget({ url: "/app", data: { messagePushId: "../../settings" } }, "/app"), "/app");
  assert.equal(notificationTarget({ data: { messagePushId: `${id}&x=1` } }, "/app"), "/app");
});

test("other notifications keep a same-origin path and nothing else", () => {
  assert.equal(notificationTarget({ url: "/app/contraception" }, "/app"), "/app/contraception");
  assert.equal(notificationTarget({ url: "//evil.example/x" }, "/app"), "/app");
  assert.equal(notificationTarget({ url: "https://evil.example" }, "/app"), "/app");
});

test("a call notification opens /app/calls/{callId}, not send-push's /calls path", () => {
  assert.equal(notificationTarget({ type: "incoming_call", callId: id, url: `/calls/${id}` }, "/app"), `/app/calls/${id}`);
  // A malformed id falls back to the url rule, which the /calls redirect catches.
  assert.equal(notificationTarget({ type: "incoming_call", callId: "x/../../settings", url: "/app" }, "/app"), "/app");
  // callId alone, without the call type, is not a call.
  assert.equal(notificationTarget({ callId: id, url: "/app/food" }, "/app"), "/app/food");
});

test("a call link rings only for the callee of a ringing call, and opens the conversation", () => {
  const me = "11111111-1111-4111-8111-111111111111";
  const row = { status: "ringing", callee_id: me, thread_id: id };
  assert.deepEqual(callLinkStep(row, me), { ring: true, threadId: id });
  assert.deepEqual(callLinkStep({ ...row, status: "missed" }, me), { ring: false, threadId: id });
  assert.deepEqual(callLinkStep({ ...row, callee_id: id }, me), { ring: false, threadId: id });
  assert.deepEqual(callLinkStep(null, me), { ring: false, threadId: null });
  assert.deepEqual(callLinkStep(row, null), { ring: false, threadId: null });
});

test("only a uuid is read as a call id from a link", () => {
  assert.equal(callIdFromLink(id), id);
  assert.equal(callIdFromLink("123"), null);
  assert.equal(callIdFromLink(undefined), null);
});
