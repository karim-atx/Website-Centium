import { strict as assert } from "node:assert";
import { test } from "node:test";
import { customerRows, exportFileName, memberRows, presetExportRange, toCsv, type ExportPerson } from "./exportModel.ts";
import type { VenueMember } from "../../services/venues/consoleLogic.ts";
import type { StoreOrder } from "../../services/store/types.ts";

test("presets: last 30 days includes today; this year starts 1 Jan", () => {
  assert.deepEqual(presetExportRange("30d", "2026-10-15"), { from: "2026-09-16", to: "2026-10-15" });
  assert.deepEqual(presetExportRange("year", "2026-10-15"), { from: "2026-01-01", to: "2026-10-15" });
});

test("names the file by kind and range", () => {
  assert.equal(exportFileName("transactions", { from: "2026-09-16", to: "2026-10-15" }), "centium-transactions-2026-09-16-to-2026-10-15.csv");
});

test("members: only memberships that ran in the range, with the server's label", () => {
  const base = { label: "Member #0042", isMinor: true, personId: "p", memberNumber: 42, planName: "Monthly", status: "active", paymentMethod: "cash", paymentStatus: "paid", priceAgreed: 30, joinedAt: "2026-01-02T10:00:00Z", venue: "Hamra" };
  const rows = memberRows(
    [
      { ...base, startedOn: "2026-10-01", expiresOn: null } as unknown as VenueMember & { venue: string },
      { ...base, startedOn: "2026-01-01", expiresOn: "2026-02-01" } as unknown as VenueMember & { venue: string },
    ],
    { from: "2026-09-16", to: "2026-10-15" }
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], "Member #0042");
  assert.equal(rows[1][2], "Yes");
});

test("customers: counts orders in range per person", () => {
  const people: ExportPerson[] = [{ personId: "a", label: "Sara", memberNumber: 7, isMinor: false, firstSeen: "2026-09-01", lastSeen: "2026-10-10" }];
  const orders = [
    { customerId: "a", placedAt: "2026-10-01T09:00:00Z" },
    { customerId: "a", placedAt: "2026-08-01T09:00:00Z" },
  ] as StoreOrder[];
  assert.deepEqual(customerRows(people, orders, { from: "2026-09-16", to: "2026-10-15" })[1], ["Sara", 7, "No", "2026-09-01", "2026-10-10", 1]);
});

test("quotes cells and leaves nulls empty", () => {
  assert.equal(toCsv([['a"b', null, 3]]), '"a""b",,"3"');
});
