import { strict as assert } from "node:assert";
import { test } from "node:test";
import { CLIENT_KINDS, clientNotificationTarget, notificationCopy, notifLook } from "./notificationsModel.ts";

// Round D · TR22: workout_log_reply (subject workout_session; payload reply_id, routine).
const S = "11111111-1111-4111-8111-111111111111";

test("a reply to a workout reaches the client's bell", () => {
  assert.ok(CLIENT_KINDS.includes("workout_log_reply"));
});

test("the reply notice's lines, with and without the routine", () => {
  const base = { kind: "workout_log_reply", titleKey: "workout_log_reply" };
  assert.deepEqual(notificationCopy({ ...base, payload: { reply_id: "r", routine: "Push day" } }), {
    title: "Your coach replied to your workout",
    body: "About Push day. Read it in your workout history.",
  });
  assert.deepEqual(notificationCopy({ ...base, payload: {} }), {
    title: "Your coach replied to your workout",
    body: "Read it in your workout history.",
  });
});

test("the reply notice opens the session in Workout › History", () => {
  assert.equal(clientNotificationTarget({ kind: "workout_log_reply", subjectType: "workout_session", subjectId: S }), `/app/workout?tab=history&session=${S}`);
  assert.equal(clientNotificationTarget({ kind: "workout_log_reply", subjectType: "workout_session", subjectId: "nope" }), "/app/workout?tab=history");
  assert.deepEqual(notifLook("workout_log_reply"), { tone: "lav", glyph: "user" });
});
