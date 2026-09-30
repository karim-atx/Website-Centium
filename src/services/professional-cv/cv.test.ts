import { strict as assert } from "node:assert";
import { test } from "node:test";
import { byRecency, formatMonth, formatRange, toDbDate, toMonth } from "./cvDates";
import { licenceStatus, type LicenceReviewRow } from "./licenceStatus";
import { checkRange, checkText, checkUrl } from "./validate";

test("month values round-trip between the table's date and the view's text", () => {
  assert.equal(toMonth("2022-03-01"), "2022-03");
  assert.equal(toMonth("2022-03"), "2022-03");
  assert.equal(toMonth("2022-13"), null);
  assert.equal(toMonth(null), null);
  assert.equal(toDbDate("2022-03"), "2022-03-01");
  assert.equal(toDbDate("2022-3"), null);
});

test("dates show month and year only", () => {
  assert.equal(formatMonth("2023-09"), "Sep 2023");
  assert.equal(formatRange("2023-09", null, true), "Sep 2023 – Present");
  assert.equal(formatRange("2017-09", "2021-06", false), "Sep 2017 – Jun 2021");
  assert.equal(formatRange("2017-09", null, false), "Sep 2017");
  assert.equal(formatRange(null, "2021-06", false), "Jun 2021");
  assert.equal(formatRange(null, null, true), "");
});

test("timelines read newest first, current roles on top", () => {
  const rows = [
    { id: "a", start: "2019-01", end: "2021-05" },
    { id: "b", start: "2021-06", end: null },
    { id: "c", start: "2021-06", end: "2023-08" },
  ];
  assert.deepEqual(byRecency(rows, true).map((r) => r.id), ["b", "c", "a"]);
});

const review = (over: Partial<LicenceReviewRow>): LicenceReviewRow => ({
  id: "r1",
  licenceId: "l1",
  documentPath: "u/doc.pdf",
  submittedAt: "2026-09-30T10:00:00Z",
  approvedAt: null,
  rejectedAt: null,
  rejectionReason: null,
  ...over,
});

test("a licence without a document has no status", () => {
  assert.deepEqual(licenceStatus({ id: "l1", documentPath: null }, [review({})]), { kind: "none" });
});

test("pending until decided, and a fresh document waits for its review row", () => {
  assert.deepEqual(licenceStatus({ id: "l1", documentPath: "u/doc.pdf" }, [review({})]), { kind: "pending" });
  assert.deepEqual(licenceStatus({ id: "l1", documentPath: "u/doc.pdf" }, []), { kind: "pending" });
});

test("verified only by an approval of the CURRENT document", () => {
  const approvedOld = review({ documentPath: "u/old.pdf", approvedAt: "2026-09-01T00:00:00Z" });
  assert.deepEqual(licenceStatus({ id: "l1", documentPath: "u/old.pdf" }, [approvedOld]), { kind: "verified" });
  // Replacing the file un-verifies it, with nothing to reset.
  assert.deepEqual(
    licenceStatus({ id: "l1", documentPath: "u/new.pdf" }, [approvedOld, review({ documentPath: "u/new.pdf" })]),
    { kind: "pending" }
  );
});

test("an approval stands even when a later duplicate review of the same file is pending", () => {
  const rows = [
    review({ id: "r1", approvedAt: "2026-09-30T11:00:00Z" }),
    review({ id: "r2", submittedAt: "2026-09-30T12:00:00Z" }),
  ];
  assert.deepEqual(licenceStatus({ id: "l1", documentPath: "u/doc.pdf" }, rows), { kind: "verified" });
});

test("rejected carries the newest reason, and another licence's rows never count", () => {
  const rows = [
    review({ id: "r1", rejectedAt: "2026-09-30T11:00:00Z", rejectionReason: "Unreadable." }),
    review({ id: "r2", licenceId: "other", approvedAt: "2026-09-30T11:00:00Z" }),
  ];
  assert.deepEqual(licenceStatus({ id: "l1", documentPath: "u/doc.pdf" }, rows), {
    kind: "rejected",
    reason: "Unreadable.",
  });
});

test("validation mirrors the tables' checks", () => {
  assert.equal(checkText("Title", "  ", 2, 200, true), "Add title.");
  assert.equal(checkText("Issuer", "", 2, 200, false), null);
  assert.equal(checkText("Title", "A", 2, 200, true), "Title needs at least 2 characters.");
  assert.equal(checkUrl("Credential link", "http://example.org/x", false), "Credential link must start with https://");
  assert.equal(checkUrl("Credential link", "javascript:alert(1)", false), "Credential link must start with https://");
  assert.equal(checkUrl("Link", "https://example.org", true), null);
  assert.equal(checkRange("2022-03", "2021-01"), "The end date can't be before the start date.");
  assert.equal(checkRange("2022-03", null), null);
});
