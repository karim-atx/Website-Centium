import { strict as assert } from "node:assert";
import { test } from "node:test";
import { notificationTarget } from "./messagePushUrl";

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
