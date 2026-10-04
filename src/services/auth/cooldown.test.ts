import { strict as assert } from "node:assert";
import { test } from "node:test";
import { AUTH_COOLDOWN_SECONDS, cooldownMessage, formatCountdown, secondsLeft } from "./cooldown.ts";

test("countdown formatting", () => {
  assert.equal(formatCountdown(45), "0:45");
  assert.equal(formatCountdown(60), "1:00");
  assert.equal(formatCountdown(5), "0:05");
  assert.equal(formatCountdown(0), "0:00");
  assert.equal(formatCountdown(44.2), "0:45");
  assert.equal(cooldownMessage(45), "Too many attempts. Try again in 0:45.");
  assert.equal(AUTH_COOLDOWN_SECONDS, 60);
});

test("seconds left never goes negative and rounds up", () => {
  assert.equal(secondsLeft(10_000, 0), 10);
  assert.equal(secondsLeft(10_000, 9_001), 1);
  assert.equal(secondsLeft(10_000, 12_000), 0);
});
