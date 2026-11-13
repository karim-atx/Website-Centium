import { test } from "node:test";
import assert from "node:assert/strict";
import { alertRetryTarget, keepAlertResult } from "./repeatAlertRetry.ts";

const ev = (id: string, date: string) => ({ id, date, alert: "none" });
const ALERT_FAILED = "Your event is saved, but its alert couldn't be set. Try again.";

test("a failed alert keeps its message and the saved row (every scope goes through this)", () => {
  const saved = ev("s1", "2026-11-20");
  assert.deepEqual(keepAlertResult({ ok: true, event: saved, alertMessage: ALERT_FAILED }), { ok: true, alertMessage: ALERT_FAILED, event: saved });
});

test("a clean save is just ok, and a failed save keeps its message", () => {
  assert.deepEqual(keepAlertResult({ ok: true, event: ev("s1", "2026-11-20") }), { ok: true });
  assert.deepEqual(keepAlertResult({ ok: false, message: "Couldn't save your changes. Try again." }), { ok: false, message: "Couldn't save your changes. Try again." });
});

test("all: the sheet stays on the same series and the tapped day", () => {
  assert.deepEqual(alertRetryTarget("s1", "2026-11-27", ev("s1", "2026-11-20")), { id: "s1", occurrence: "2026-11-27" });
});

test("following / one: the sheet moves to the new row, from its own first date", () => {
  assert.deepEqual(alertRetryTarget("s1", "2026-11-27", ev("s2", "2026-11-27")), { id: "s2", occurrence: "2026-11-27" });
  assert.deepEqual(alertRetryTarget("s1", "2026-11-27", ev("o1", "2026-11-28")), { id: "o1", occurrence: "2026-11-28" });
});

test("the retry's draft takes the saved row's repeat, keeping the chosen alert", async () => {
  const { alertRetryDraft } = await import("./repeatAlertRetry.ts");
  const draft = { title: "Weekly run", repeat: "weekly", repeatUntil: null as string | null, alert: "min_15" };
  assert.deepEqual(alertRetryDraft(draft, { repeat: "none", repeatUntil: undefined }), { title: "Weekly run", repeat: "none", repeatUntil: null, alert: "min_15" });
  assert.deepEqual(alertRetryDraft(draft, { repeat: "weekly", repeatUntil: "2026-12-31" }), { title: "Weekly run", repeat: "weekly", repeatUntil: "2026-12-31", alert: "min_15" });
});
