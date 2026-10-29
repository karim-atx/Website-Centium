import { test } from "node:test";
import assert from "node:assert/strict";
import { errorPanelKind, isChunkLoadError } from "./errorPanel.ts";

test("offline is always the connection panel, whatever the error", () => {
  assert.equal(errorPanelKind(new Error("anything"), false), "connection");
  assert.equal(errorPanelKind(undefined, false), "connection");
});

test("a failed chunk download is the connection panel even while online", () => {
  const chrome = new TypeError("Failed to fetch dynamically imported module: https://x/assets/NearbyMap-abc.js");
  const safari = new TypeError("Importing a module script failed.");
  const firefox = new TypeError("error loading dynamically imported module");
  for (const e of [chrome, safari, firefox]) {
    assert.equal(isChunkLoadError(e), true);
    assert.equal(errorPanelKind(e, true), "connection");
  }
});

test("a request that never reached the server is the connection panel", () => {
  assert.equal(errorPanelKind(new TypeError("Failed to fetch"), true), "connection");
  assert.equal(errorPanelKind({ message: "Load failed" }, true), "connection");
});

test("an ordinary TypeError while online is a crash, not a network fault", () => {
  const e = new TypeError("Cannot read properties of undefined (reading 'x')");
  assert.equal(isChunkLoadError(e), false);
  assert.equal(errorPanelKind(e, true), "crash");
  assert.equal(errorPanelKind("boom", true), "crash");
});
