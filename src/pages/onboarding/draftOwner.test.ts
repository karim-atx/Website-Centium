import { strict as assert } from "node:assert";
import { test } from "node:test";
import { legacyStoredDraft, parseStoredDraft, resolveDraft, type StoredDraft } from "./draftOwner";

type D = { email?: string; firstName?: string; dateOfBirth?: string };
const A = { userId: "aaaaaaaa-0000-0000-0000-000000000001", email: "ana@example.com" };
const B = { userId: "bbbbbbbb-0000-0000-0000-000000000002", email: "ben@example.com" };
const nobody = { userId: null, email: null };
const rec = (owner: string | null, draft: Partial<D>, legacy = false): StoredDraft<D> => ({ owner, legacy, draft, step: "aboutYou" });

test("your own draft resumes; another account's never does", () => {
  const anas = rec(A.userId, { email: A.email, firstName: "Ana", dateOfBirth: "1990-01-01" });
  assert.deepEqual(resolveDraft(anas, A), { use: true, draft: anas.draft, step: "aboutYou", owner: A.userId });
  assert.deepEqual(resolveDraft(anas, B), { use: false });
  assert.deepEqual(resolveDraft(anas, nobody), { use: false });
});

test("answers from before an account carry into the account created next", () => {
  const pre = rec(null, { email: "" });
  assert.equal(resolveDraft(pre, nobody).use, true);
  const adopted = resolveDraft(pre, A);
  assert.equal(adopted.use, true);
  assert.equal(adopted.use && adopted.owner, A.userId);
  // ...unless the pre-account draft names a different email.
  assert.deepEqual(resolveDraft(rec(null, { email: B.email }), A), { use: false });
  assert.equal(resolveDraft(rec(null, { email: "ANA@example.com " }), A).use, true);
});

test("an old ownerless draft is adopted only by the account whose email it carries", () => {
  const old = rec(null, { email: A.email, dateOfBirth: "1990-01-01" }, true);
  assert.equal(resolveDraft(old, A).use, true);
  assert.deepEqual(resolveDraft(old, B), { use: false });
  assert.deepEqual(resolveDraft(old, nobody), { use: false });
  assert.deepEqual(resolveDraft(rec(null, { firstName: "?" }, true), A), { use: false });
});

test("malformed or old-format storage reads safely", () => {
  assert.equal(parseStoredDraft("{broken"), null);
  assert.equal(parseStoredDraft(JSON.stringify({ owner: A.userId, draft: {} })), null);
  const ok = parseStoredDraft<D>(JSON.stringify({ v: 2, owner: A.userId, draft: { firstName: "Ana" }, step: "goal" }));
  assert.deepEqual(ok, { owner: A.userId, legacy: false, draft: { firstName: "Ana" }, step: "goal" });
  assert.deepEqual(legacyStoredDraft<D>(JSON.stringify({ email: A.email }), "4"), {
    owner: null,
    legacy: true,
    draft: { email: A.email },
    step: "4",
  });
  assert.equal(legacyStoredDraft("{broken", null), null);
  assert.equal(resolveDraft(null, A).use, false);
});
