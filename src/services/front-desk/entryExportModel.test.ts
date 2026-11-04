import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { entryExportCsv, entryExportFileName, entryExportRows, type EntryExportRow } from "./entryExportModel.ts";

const row = (o: Partial<EntryExportRow> = {}): EntryExportRow => ({
  membership_id: "m1",
  member_number: 1042,
  member_first_name: "Rami",
  plan_name: "Monthly",
  starts_on: "2026-11-01",
  expires_on: "2026-12-01T00:00:00Z",
  external_id: "CARD-88231",
  enrolled: true,
  change: null,
  ...o,
});

describe("entryExportRows", () => {
  it("writes the header and one row per member, dates as days", () => {
    const out = entryExportRows([row()]);
    assert.deepEqual(out[0], ["Member number", "First name", "Plan", "Starts", "Expires", "External ID", "Enrolled", "Today"]);
    assert.deepEqual(out[1], ["1042", "Rami", "Monthly", "2026-11-01", "2026-12-01", "CARD-88231", "Yes", null]);
  });

  it("names today's change", () => {
    const out = entryExportRows([row({ change: "new", enrolled: false, external_id: null }), row({ change: "renewal" }), row({ change: "ended" })]);
    assert.deepEqual(out.slice(1).map((r) => r[7]), ["Add (new)", "Add (renewal)", "Remove"]);
    assert.equal(out[1][5], null);
    assert.equal(out[1][6], "No");
  });

  it("guards a formula in a name or ID", () => {
    const csv = entryExportCsv([row({ member_first_name: "=HYPERLINK(1)", external_id: "+1" })]);
    assert.doesNotMatch(csv, /,=HYPERLINK/);
    assert.doesNotMatch(csv, /,\+1,/);
  });
});

describe("entryExportFileName", () => {
  it("slugs the venue and adds the day", () => {
    assert.equal(entryExportFileName("Main Street Gym", "2026-11-04"), "centium-entry-system-main-street-gym-2026-11-04.csv");
    assert.equal(entryExportFileName("Café Zone", "2026-11-04"), "centium-entry-system-cafe-zone-2026-11-04.csv");
  });

  it("drops a name with no Latin letters", () => {
    assert.equal(entryExportFileName("نادي الحمرا", "2026-11-04"), "centium-entry-system-2026-11-04.csv");
  });
});
