import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { desktopNoticeFor } from "./desktopNoticeModel.ts";

const delivered = {
  id: "m1",
  title: "New message from Sam",
  body: "Open Centium to read it.",
  delivered_at: "2026-11-09T10:00:00Z",
  summarised_into: null,
};

describe("desktopNoticeFor", () => {
  it("shows a delivered message, collapsed per chat, opening Messages", () => {
    assert.deepEqual(desktopNoticeFor("message_push_sends", { ...delivered, chat_group: "abc" }), {
      title: "New message from Sam",
      body: "Open Centium to read it.",
      path: "/app/messages?push=m1",
      tag: "chat-abc",
    });
  });

  it("tags a message without a chat by its own id", () => {
    assert.equal(desktopNoticeFor("message_push_sends", delivered)?.tag, "push-m1");
  });

  it("shows a delivered reminder without a path", () => {
    assert.deepEqual(desktopNoticeFor("reminder_sends", { ...delivered, id: "r1", title: "Your daily reminder" }), {
      title: "Your daily reminder",
      body: "Open Centium to read it.",
      path: null,
      tag: "reminder-r1",
    });
  });

  it("waits for delivery: queued and held rows show nothing", () => {
    assert.equal(desktopNoticeFor("message_push_sends", { ...delivered, delivered_at: null }), null);
    assert.equal(desktopNoticeFor("reminder_sends", { ...delivered, delivered_at: null }), null);
  });

  it("leaves a row folded into a digest to the digest", () => {
    assert.equal(desktopNoticeFor("reminder_sends", { ...delivered, summarised_into: "d1" }), null);
  });

  it("ignores what isn't a row", () => {
    assert.equal(desktopNoticeFor("message_push_sends", null), null);
    assert.equal(desktopNoticeFor("message_push_sends", { id: "x" }), null);
  });

  it("drops an empty body rather than showing a blank line", () => {
    assert.equal(desktopNoticeFor("reminder_sends", { ...delivered, body: "" })?.body, null);
  });
});
