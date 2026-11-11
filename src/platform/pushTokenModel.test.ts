import { strict as assert } from "node:assert";
import { test } from "node:test";
import { serverPushToken } from "./pushTokenModel.ts";

test("push token: an iPhone's APNs token is kept lowercase, as the server stores it", () => {
  assert.equal(serverPushToken("ios", "8A1B2C3D4E5F60718293A4B5C6D7E8F90A1B2C3D4E5F60718293A4B5C6D7E8F9"), "8a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f9");
  assert.equal(serverPushToken("ios", " abc "), "abc");
});

test("push token: an FCM token is case-sensitive and stays as it is", () => {
  const fcm = "dQw4w9WgXcQ:APA91bH-Example_TOKEN.Value";
  assert.equal(serverPushToken("android", fcm), fcm);
});
