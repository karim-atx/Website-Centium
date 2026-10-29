import { test } from "node:test";
import assert from "node:assert/strict";
import { offlineBannerDetail, offlineBannerText } from "./offlineBannerText.ts";

test("the default names everything the outbox keeps (Round D D22)", () => {
  assert.equal(
    offlineBannerText(),
    "You're offline. Water, weight and blood pressure logs, food entries, habit ticks, finished workouts and messages save when you reconnect. Other changes need a connection.",
  );
});

test("the list follows what is queued", () => {
  assert.equal(
    offlineBannerText(["water logs", "food entries"]),
    "You're offline. Water logs and food entries save when you reconnect. Other changes need a connection.",
  );
  assert.equal(offlineBannerDetail(["messages"]), "Messages save when you reconnect. Other changes need a connection.");
  assert.equal(offlineBannerText([]), "You're offline. Changes need a connection.");
});
