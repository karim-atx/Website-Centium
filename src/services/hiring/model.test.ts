import { test } from "node:test";
import assert from "node:assert/strict";
import {
  applicationStatus,
  hiringErrorOf,
  parseApplications,
  parseHiringFee,
  parseOpening,
  parseProCard,
  parseTeam,
  parseWindow,
  windowUsed,
} from "./model.ts";

test("opening rows: defaults by type, status, counts", () => {
  const o = parseOpening({ id: "o1", type: "class_slot", title: "Saturday Spin cover", pay: "60", status: "open", applicant_count: 1 });
  assert.equal(o.type, "class_slot");
  assert.equal(o.payUnit, "per_slot");
  assert.equal(o.pay, 60);
  assert.equal(o.applicantCount, 1);
  assert.equal(o.newApplicantCount, 0);
  assert.equal(parseOpening({ id: "o2", status: "weird" }).status, "open");
  assert.equal(parseOpening({ id: "o3" }).payUnit, "per_class");
});

test("ProfessionalCard: flat or nested, never contact fields", () => {
  const flat = parseProCard({ professional_id: "p1", name: "A B", rating: 4.8, review_count: 38, hired_via_centium_count: 2, on_team: true, phone: "x", email: "y" });
  assert.equal(flat.id, "p1");
  assert.equal(flat.onTeam, true);
  assert.equal("phone" in flat, false);
  assert.equal("email" in flat, false);
  const nested = parseProCard({ id: "a1", professional: { id: "p2", name: "C D" } });
  assert.equal(nested.id, "p2");
});

test("applications: status labels, attachments", () => {
  const [a] = parseApplications([{ id: "a1", opening_id: "o1", professional_id: "p1", name: "N", status: "shortlisted", attachments: [{ kind: "credential", label: "Spin certification" }, { label: "" }, 3] }]);
  assert.equal(a.status, "SHORTLISTED");
  assert.equal(a.attachments.length, 1);
  assert.equal(applicationStatus("nope"), "APPLIED");
});

test("hiring fee rows: server values win, mirror fills the gaps", () => {
  const f = parseHiringFee({ id: "f1", type: "role", base: 240, status: "paid" });
  assert.equal(f.quote.fee, 25);
  assert.equal(f.quote.percentAmount, 19.2);
  assert.equal(f.quote.minimumApplied, true);
  assert.equal(f.status, "PAID");
  const g = parseHiringFee({ id: "f2", type: "class_slot", base: 37.5, percent_amount: 3, fee: 3, minimum: 3, minimum_applied: false });
  assert.equal(g.quote.minimumApplied, false);
  assert.equal(g.status, "DUE");
});

test("team rows", () => {
  const [m] = parseTeam([{ professional_id: "p1", name: "R K", source: "existing_team", classes: [{ title: "Spin 45", weekday: 5, start_time: "18:30" }, {}], hires: [{ id: "h1", title: "Spin instructor" }, {}] }]);
  assert.equal(m.source, "existing_team");
  assert.equal(m.classes.length, 1);
  assert.equal(m.hires.length, 1);
});

test("existing-team window (D-31)", () => {
  assert.equal(parseWindow([]), null);
  const w = parseWindow([{ days_left: 24, closes_at: "2026-11-14T00:00:00Z" }]);
  assert.equal(w?.open, true);
  assert.equal(parseWindow([{ days_left: 0 }])?.open, false);
  assert.equal(windowUsed(24), 0.2);
  assert.equal(windowUsed(30), 0);
  assert.equal(windowUsed(-3), 1);
});

test("error names map by name", () => {
  assert.equal(hiringErrorOf({ code: "P0001", message: "window_closed" }), "window_closed");
  assert.equal(hiringErrorOf({ message: "conflict_warning: 1" }), "conflict_warning");
  assert.equal(hiringErrorOf({ message: "conflicts" }), "conflicts");
  assert.equal(hiringErrorOf({ message: "something else" }), null);
  assert.equal(hiringErrorOf(null), null);
});
