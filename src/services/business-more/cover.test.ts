import { strict as assert } from "node:assert";
import { test } from "node:test";
import { coverBucketFor, coverObjectPath, coverToRemove, coverUrlFor } from "./cover";

const OWNER = "11111111-1111-4111-8111-111111111111";
const MANAGER = "22222222-2222-4222-8222-222222222222";
const url = (bucket: string, path: string) => `https://x/storage/v1/object/public/${bucket}/${path}`;

test("new covers go to business-covers under the owner's uid, never named cover-", () => {
  const p = coverObjectPath(OWNER, "abc");
  assert.equal(p, `${OWNER}/abc.jpg`);
  assert.equal(coverBucketFor(p), "business-covers");
});

test("old business-logos covers keep displaying from where they were written", () => {
  assert.equal(coverUrlFor(`${OWNER}/cover-abc.jpg`, url), url("business-logos", `${OWNER}/cover-abc.jpg`));
  assert.equal(coverUrlFor(`${OWNER}/abc.jpg`, url), url("business-covers", `${OWNER}/abc.jpg`));
  assert.equal(coverUrlFor("https://cdn.example/c.jpg", url), "https://cdn.example/c.jpg");
  assert.equal(coverUrlFor(null, url), null);
  assert.equal(coverUrlFor("../x.jpg", url), null);
});

test("a replaced cover is removed only where the delete policy allows", () => {
  const who = { ownerUid: OWNER, callerUid: MANAGER };
  assert.deepEqual(coverToRemove(`${OWNER}/old.jpg`, who), { bucket: "business-covers", path: `${OWNER}/old.jpg` });
  // business-logos is own-prefix: a manager cannot remove the owner's old cover.
  assert.equal(coverToRemove(`${OWNER}/cover-old.jpg`, who), null);
  assert.deepEqual(coverToRemove(`${OWNER}/cover-old.jpg`, { ownerUid: OWNER, callerUid: OWNER }), { bucket: "business-logos", path: `${OWNER}/cover-old.jpg` });
  assert.equal(coverToRemove(`${MANAGER}/old.jpg`, who), null);
  assert.equal(coverToRemove(`${OWNER}/new.jpg`, who, `${OWNER}/new.jpg`), null);
  assert.equal(coverToRemove(null, who), null);
});
