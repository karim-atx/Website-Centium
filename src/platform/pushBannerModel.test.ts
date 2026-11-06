import { strict as assert } from "node:assert";
import { test } from "node:test";
import { bannerFromPush, enqueueBanner, type PushBannerCard } from "./pushBannerModel.ts";

const RID = "5c755543-bee6-48c2-9d7b-c56ef46aedf6";

test("a reminder gets a banner with its own text, link and id", () => {
  const card = bannerFromPush(
    { id: "fcm-1", title: "Likes on your posts", body: "New likes on your posts today: 3.", data: { type: "reminder", notificationId: RID, url: "/app/notifications" } },
    1
  );
  assert.deepEqual(card, { key: RID, title: "Likes on your posts", line: "New likes on your posts today: 3.", path: "/app/notifications", notificationId: RID });
});

test("Arabic text passes through as the server wrote it", () => {
  const card = bannerFromPush({ title: "لم تُسجَّل أي وجبة اليوم", body: "يمكنك تسجيل ما أكلته في قسم الطعام عندما يتسنّى لك ذلك.", data: { type: "reminder", url: "/app" } }, 2);
  assert.equal(card?.title, "لم تُسجَّل أي وجبة اليوم");
  assert.equal(card?.line, "يمكنك تسجيل ما أكلته في قسم الطعام عندما يتسنّى لك ذلك.");
});

test("a call and a message never get a banner", () => {
  assert.equal(bannerFromPush({ title: "Rami is calling", body: "Incoming voice call", data: { type: "incoming_call", callId: "x", url: "/app/calls/x" } }, 1), null);
  assert.equal(bannerFromPush({ title: "New message from Rami", body: "Open Centium to read it.", data: { type: "message", url: "/app/messages?push=1" } }, 1), null);
});

test("a push with no text gets none", () => {
  assert.equal(bannerFromPush({ title: " ", body: "", data: { type: "reminder" } }, 1), null);
  assert.equal(bannerFromPush({ data: { type: "reminder" } }, 1), null);
});

test("a link that isn't an /app path opens Home instead", () => {
  for (const url of ["https://evil.example/app", "//evil.example/app", "/pricing", "javascript:alert(1)", 42, undefined]) {
    assert.equal(bannerFromPush({ title: "T", body: "B", data: { url } }, 1)?.path, "/app", String(url));
  }
  assert.equal(bannerFromPush({ title: "T", body: "B", data: { url: "/app/weekly-review" } }, 1)?.path, "/app/weekly-review");
});

test("no id from the server: the push's own id, else its place in the run; a bad notificationId is ignored", () => {
  assert.equal(bannerFromPush({ id: "fcm-9", title: "T", data: { notificationId: "not-a-uuid" } }, 4)?.key, "fcm-9");
  assert.equal(bannerFromPush({ title: "T", data: { notificationId: "not-a-uuid" } }, 4)?.notificationId, null);
  assert.equal(bannerFromPush({ title: "T" }, 4)?.key, "push-4");
  assert.equal(bannerFromPush({ body: "Only a line" }, 4)?.title, "Centium");
});

const card = (key: string, title = key): PushBannerCard => ({ key, title, line: "", path: "/app", notificationId: null });

test("the queue: in order, the same push replaces its card, the showing card is never pushed out", () => {
  let q: PushBannerCard[] = [];
  for (const k of ["a", "b", "c"]) q = enqueueBanner(q, card(k));
  assert.deepEqual(q.map((c) => c.key), ["a", "b", "c"]);
  q = enqueueBanner(q, card("b", "b again"));
  assert.deepEqual(q.map((c) => c.title), ["a", "b again", "c"]);
  for (const k of ["d", "e", "f"]) q = enqueueBanner(q, card(k));
  assert.deepEqual(q.map((c) => c.key), ["a", "d", "e", "f"]);
});
