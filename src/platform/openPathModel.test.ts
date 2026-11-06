import { strict as assert } from "node:assert";
import { test } from "node:test";
import { appPathFrom } from "./openPathModel.ts";

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
