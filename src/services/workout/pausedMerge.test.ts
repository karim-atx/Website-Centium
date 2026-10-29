import { strict as assert } from "node:assert";
import { test } from "node:test";
import { mergePausedSessions } from "./pausedMerge.ts";
import type { PausedWorkoutSession } from "../../types/index.ts";

const s = (startedAt: string, elapsedSec: number): PausedWorkoutSession => ({ logged: [], elapsedSec, startedAt, started: true });

test("paused workouts: the newer copy wins per routine, and a device-only or newer copy is pushed up", () => {
  const local = {
    a: s("2026-10-29T09:00:00Z", 900), // same start, more logged on the device (offline)
    b: s("2026-10-29T09:00:00Z", 100), // the server has more
    c: s("2026-10-29T10:00:00Z", 60), // paused offline, never reached the server
    d: s("2026-10-28T10:00:00Z", 999), // an older session than the server's
  };
  const remote = {
    a: s("2026-10-29T09:00:00Z", 300),
    b: s("2026-10-29T09:00:00Z", 400),
    d: s("2026-10-29T08:00:00Z", 10),
    e: s("2026-10-29T07:00:00Z", 50), // paused on another device
  };
  const { merged, pushUp } = mergePausedSessions(local, remote);
  assert.equal(merged.a.elapsedSec, 900);
  assert.equal(merged.b.elapsedSec, 400);
  assert.equal(merged.c.elapsedSec, 60);
  assert.equal(merged.d.elapsedSec, 10);
  assert.equal(merged.e.elapsedSec, 50);
  assert.deepEqual(pushUp.sort(), ["a", "c"]);
});
