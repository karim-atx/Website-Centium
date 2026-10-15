import { strict as assert } from "node:assert";
import { test } from "node:test";
import { existingShare, onlyTheseLine, sharedWithLabel, shareRow, sharesCovering, type ResultShare } from "./logic.ts";

const s = (id: string, pro: string, marker: string | null, panel: string | null): ResultShare => ({
  id,
  professionalId: pro,
  bloodMarkerId: marker,
  bloodPanelId: panel,
  note: null,
  sharedAt: "2026-10-09T10:00:00Z",
});

const shares = [s("a", "p1", "m1", null), s("b", "p2", null, "panel1"), s("c", "p1", "m9", null)];

test("sharesCovering: the result itself or its whole test", () => {
  assert.deepEqual(sharesCovering(shares, { resultId: "m1", panelId: "panel1" }).map((x) => x.id), ["a", "b"]);
  assert.deepEqual(sharesCovering(shares, { resultId: "m2", panelId: "panel1" }).map((x) => x.id), ["b"]);
  // A standalone result is never covered by a panel share.
  assert.deepEqual(sharesCovering(shares, { resultId: "m2", panelId: null }).map((x) => x.id), []);
});

test("existingShare matches professional and scope exactly", () => {
  assert.equal(existingShare(shares, "p1", "result", { resultId: "m1", panelId: "panel1" })?.id, "a");
  assert.equal(existingShare(shares, "p1", "panel", { resultId: "m1", panelId: "panel1" }), null);
  assert.equal(existingShare(shares, "p2", "panel", { resultId: "m1", panelId: "panel1" })?.id, "b");
  assert.equal(existingShare(shares, "p2", "panel", { resultId: "m1", panelId: null }), null);
});

test("shareRow: exactly one of marker or panel, note trimmed or null", () => {
  assert.deepEqual(shareRow("me", "p1", "result", { resultId: "m1", panelId: "x" }, "  "), {
    client_id: "me",
    professional_id: "p1",
    blood_marker_id: "m1",
    blood_panel_id: null,
    note: null,
  });
  assert.deepEqual(shareRow("me", "p1", "panel", { resultId: "m1", panelId: "x" }, " Hi "), {
    client_id: "me",
    professional_id: "p1",
    blood_marker_id: null,
    blood_panel_id: "x",
    note: "Hi",
  });
  assert.equal(shareRow("me", "p1", "panel", { resultId: "m1", panelId: null }, ""), null);
  assert.equal(shareRow("me", "p1", "result", { resultId: "m1", panelId: null }, "x".repeat(400))?.note?.length, 280);
});

test("CU21 line", () => {
  assert.equal(onlyTheseLine("Alex", 2), "Lab results as a whole are off for Alex in Data sharing. Only these two are visible.");
  assert.equal(onlyTheseLine("Alex", 1), "Lab results as a whole are off for Alex in Data sharing. Only this one is visible.");
  assert.equal(onlyTheseLine("Alex", 14), "Lab results as a whole are off for Alex in Data sharing. Only these 14 are visible.");
});

test("CU17 banner label", () => {
  assert.equal(sharedWithLabel([]), null);
  assert.equal(sharedWithLabel([{ line: "Alex Morgan, GP", firstName: "Alex" }]), "Shared with Alex Morgan, GP");
  assert.equal(
    sharedWithLabel([
      { line: "a", firstName: "Alex" },
      { line: "b", firstName: "Sara" },
    ]),
    "Shared with Alex and Sara"
  );
  assert.equal(sharedWithLabel([1, 2, 3, 4].map((i) => ({ line: "", firstName: String(i) }))), "Shared with 4 professionals");
});
