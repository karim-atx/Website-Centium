import { strict as assert } from "node:assert";
import { test } from "node:test";
import { imageHome, imageNoticeCopy, reasonText, surfaceWord } from "./imageCopy.ts";
import { latestApproval, parseApprovals } from "./imageModel.ts";
import { parsePhrases, supportLines, supportPlace } from "./support.ts";

const row = (o: Record<string, unknown>) => ({
  approval_id: "a1", surface: "avatar", record_id: "u1", staging_bucket: "image-staging", staging_path: "u1/avatar/x.jpg",
  status: "pending", uploaded_at: "2026-10-29T09:00:00Z", decided_at: null, reason_category: null, published_at: null, ...o,
});

test("my_image_approvals rows: parsed, the newest that isn't withdrawn decides", () => {
  assert.deepEqual(parseApprovals(null), []);
  assert.equal(parseApprovals([row({ status: "odd" })]).length, 0);
  const list = parseApprovals([
    row({ approval_id: "old", status: "rejected", reason_category: "low_quality", uploaded_at: "2026-10-28T09:00:00Z" }),
    row({ approval_id: "new", status: "withdrawn", uploaded_at: "2026-10-29T10:00:00Z" }),
  ]);
  assert.equal(latestApproval(list)?.id, "old");
  assert.equal(latestApproval(list)?.reasonCategory, "low_quality");
  // approved but not yet copied: still waiting; published: nothing to show
  assert.equal(latestApproval(parseApprovals([row({ status: "approved", decided_at: "x" })]))?.status, "pending");
  assert.equal(latestApproval(parseApprovals([row({ status: "approved", decided_at: "x", published_at: "y" })])), null);
});

test("notice and reason words", () => {
  assert.equal(surfaceWord("business_logo"), "logo");
  assert.equal(surfaceWord("nope"), "photo");
  assert.match(reasonText("contact_details"), /Use messages/);
  assert.equal(reasonText("???"), reasonText("other"));
  assert.deepEqual(imageNoticeCopy(true, "avatar", null), { title: "Your photo is approved", body: "Your profile photo is approved. Others will see it in a few minutes." });
  assert.match(imageNoticeCopy(false, "venue_photo", "low_quality").body, /^Your venue photo can't be used\. It's too hard to see clearly\. You can upload another\.$/);
  assert.equal(imageHome("nope", "member"), null);
});

test("support lines: Lebanon by country code or Beirut time; elsewhere the local number and the directory", () => {
  assert.equal(supportPlace("LB", null), "lebanon");
  assert.equal(supportPlace("fr", "Asia/Beirut"), "elsewhere");
  assert.equal(supportPlace(null, "Asia/Beirut"), "lebanon");
  assert.equal(supportPlace(null, "Europe/Paris"), "elsewhere");
  assert.deepEqual(supportLines("lebanon").numbers.map((n) => n.number), ["1564", "112", "140"]);
  assert.deepEqual(supportLines("elsewhere"), { numbers: [], local: true, directory: "https://findahelpline.com" });
  assert.deepEqual(parsePhrases([{ normalised: "end it all", language: "en" }, { normalised: " " }, null]), [{ normalised: "end it all", language: "en" }]);
});
