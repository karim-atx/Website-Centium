import { strict as assert } from "node:assert";
import { test } from "node:test";
import { appPathFrom, decideHeldPath, HELD_PATH_MAX_MS, type HeldPath } from "./openPathModel.ts";

test("an app path is kept with its query and hash", () => {
  assert.equal(appPathFrom("/app/health/water?log=1"), "/app/health/water?log=1");
  assert.equal(appPathFrom("/app/messages?push=42#latest"), "/app/messages?push=42#latest");
  assert.equal(appPathFrom("/app"), "/app");
  assert.equal(appPathFrom("  /app/mind/habits "), "/app/mind/habits");
});

test("dot segments are resolved, and the result must still be under /app", () => {
  assert.equal(appPathFrom("/app/../app/workout"), "/app/workout");
  assert.equal(appPathFrom("/app/../legal"), null);
});

test("anything that isn't one of the app's own pages opens nothing", () => {
  for (const raw of [
    "https://evil.example/app",
    "//evil.example/app",
    "/\\evil.example/app",
    "javascript:alert(1)",
    "app/health",
    "/application",
    "/apps/x",
    "/",
    "/legal",
    "",
    null,
    42,
  ]) {
    assert.equal(appPathFrom(raw), null, String(raw));
  }
});

const T0 = Date.UTC(2026, 10, 6, 9);
const held = (owner: string | null = "a"): HeldPath => ({ path: "/app/health/water?log=1", heldAt: T0, owner });
const at = (over: Partial<{ ready: boolean; pathname: string; userId: string | null; at: number }> = {}) => ({ ready: true, pathname: "/app", userId: "a", at: T0 + 1000, ...over });

test("a held path opens once the account is ready and off the onboarding pages", () => {
  assert.equal(decideHeldPath(null, at()), "none");
  assert.equal(decideHeldPath(held(), at()), "open");
  assert.equal(decideHeldPath(held(), at({ ready: false, userId: null })), "wait");
  assert.equal(decideHeldPath(held(null), at({ ready: false, userId: null })), "wait");
  // Signed out when it arrived: opens for whoever signs in.
  assert.equal(decideHeldPath(held(null), at({ userId: "b" })), "open");
});

test("it waits while onboarding is still finishing (trial offer, business setup)", () => {
  assert.equal(decideHeldPath(held(), at({ pathname: "/app/onboarding" })), "wait");
  assert.equal(decideHeldPath(held(), at({ pathname: "/app/onboarding/pro" })), "wait");
  assert.equal(decideHeldPath(held(), at({ pathname: "/app/business/setup" })), "wait");
  assert.equal(decideHeldPath(held(), at({ pathname: "/app/business/setups" })), "open");
  assert.equal(decideHeldPath(held(), at({ pathname: "/app/pro" })), "open");
});

test("it is dropped for another account, or once it is over ten minutes old", () => {
  assert.equal(decideHeldPath(held("a"), at({ userId: "b" })), "drop");
  assert.equal(decideHeldPath(held("a"), at({ userId: "b", ready: false })), "drop");
  assert.equal(decideHeldPath(held("a"), at({ at: T0 + HELD_PATH_MAX_MS })), "open");
  assert.equal(decideHeldPath(held("a"), at({ at: T0 + HELD_PATH_MAX_MS + 1 })), "drop");
  assert.equal(decideHeldPath(held("a"), at({ ready: false, userId: null, at: T0 + HELD_PATH_MAX_MS + 1 })), "drop");
});
