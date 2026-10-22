import { test } from "node:test";
import assert from "node:assert/strict";
import { workCountLine, workMetaLine } from "./showcaseWork.ts";

const TODAY = "2026-10-22";

test("the head row counts roles (current and ended) and class slots", () => {
  assert.equal(workCountLine([{ type: "role" }, { type: "class_slot" }, { type: "role" }]), "2 roles · 1 class slot");
  assert.equal(workCountLine([{ type: "role" }]), "1 role");
  assert.equal(workCountLine([{ type: "class_slot" }, { type: "class_slot" }]), "2 class slots");
  assert.equal(workCountLine([]), "");
});

test("the date line: month first, an ended role says so", () => {
  assert.equal(workMetaLine({ type: "role", from: "2026-03-02", to: null }, TODAY), "Mar 2026 to now");
  assert.equal(workMetaLine({ type: "role", from: "2025-01-10", to: "2025-06-30" }, TODAY), "Jan to Jun 2025 · ended");
  assert.equal(workMetaLine({ type: "class_slot", from: "2026-09-12", to: "2026-09-12" }, TODAY), "Sep 12, 2026");
});
