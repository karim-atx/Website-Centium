import { strict as assert } from "node:assert";
import { test } from "node:test";
import { MAX_VOICE_ITEMS, MAX_VOICE_NAME_LENGTH, rateLimitedText } from "./voiceLimits.ts";

test("voice caps match parse-voice-food (Round C DK): 20 items, names up to 80 characters", () => {
  assert.equal(MAX_VOICE_ITEMS, 20);
  assert.equal(MAX_VOICE_NAME_LENGTH, 80);
});

test("a rate-limit wait reads in seconds up to 90, then in minutes; no time reads as shortly", () => {
  assert.equal(rateLimitedText(null), "Voice logging is busy right now. Try again shortly, or add the food manually.");
  assert.equal(rateLimitedText(0), "Voice logging is busy right now. Try again shortly, or add the food manually.");
  assert.equal(rateLimitedText(45), "Voice logging is busy. Try again in about 45s, or add the food manually.");
  assert.equal(rateLimitedText(3600), "Voice logging is busy. Try again in about 60 minutes, or add the food manually.");
  assert.equal(rateLimitedText(121), "Voice logging is busy. Try again in about 3 minutes, or add the food manually.");
});
