// Round G2 · EG phase 2: the directory reads only through the counted
// functions, and a function's error is the reader's error (no view read).
import { test } from "node:test";
import assert from "node:assert/strict";
import { BY_ID_LIMIT, callDirectory, readProfessionalsByIds, type DirErr, type Rpc } from "./directoryRead";
import { directoryLimitText } from "../premium/g2";

const VIEWS = [
  "public_professional_directory",
  "public_professional_licences",
  "public_professional_experience",
  "public_professional_education",
  "public_professional_languages",
  "public_professional_awards",
  "public_professional_publications",
  "public_professional_volunteering",
  "public_professional_links",
  "marketplace_venues",
  "marketplace_classes",
];

/** A fake rpc that records every call and answers with `answer`. */
function fakeRpc(answer: (fn: string, args?: Record<string, unknown>) => { data: unknown; error: DirErr | null }) {
  const calls: { fn: string; args?: Record<string, unknown> }[] = [];
  const rpc: Rpc = (fn, args) => {
    calls.push({ fn, args });
    return Promise.resolve(answer(fn, args));
  };
  return { rpc, calls };
}

test("a refused function's error is the reader's error, with no view read", async () => {
  const refused: DirErr = { code: "42501", message: "permission denied for function count_directory_read" };
  const { rpc, calls } = fakeRpc(() => ({ data: null, error: refused }));
  const r = await callDirectory(rpc, "directory_professionals", { p_profile_id: null });
  assert.deepEqual(r, { data: null, error: refused });
  assert.deepEqual(calls.map((c) => c.fn), ["directory_professionals"]);
  for (const c of calls) assert.ok(!VIEWS.includes(c.fn));
});

test("ATX02 comes back as is, for the reader to word calmly", async () => {
  const limit: DirErr = { code: "ATX02", message: "too many directory requests -- try again in 12 minutes" };
  const { rpc, calls } = fakeRpc(() => ({ data: null, error: limit }));
  const r = await callDirectory(rpc, "directory_classes", { p_business_id: null, p_gym_id: null });
  assert.equal(r.error?.code, "ATX02");
  assert.equal(calls.length, 1);
  assert.match(directoryLimitText(r.error?.message), /12/);
});

test("a thrown call (offline) is an error, not a view read", async () => {
  const rpc: Rpc = () => Promise.reject(new Error("Failed to fetch"));
  const r = await callDirectory(rpc, "directory_venues", { p_kind: "gym" });
  assert.deepEqual(r, { data: null, error: { message: "Failed to fetch" } });
});

test("by ids: one call each for a few, the first error returned", async () => {
  const { rpc, calls } = fakeRpc((_fn, args) =>
    args?.p_profile_id === "b" ? { data: null, error: { code: "ATX02", message: "too many directory requests" } } : { data: [{ profile_id: args?.p_profile_id }], error: null }
  );
  const ok = await readProfessionalsByIds(rpc, ["a", "a", "c", ""]);
  assert.deepEqual(ok, { data: [{ profile_id: "a" }, { profile_id: "c" }], error: null });
  assert.equal(calls.length, 2);
  const bad = await readProfessionalsByIds(rpc, ["a", "b"]);
  assert.equal(bad.error?.code, "ATX02");
  for (const c of calls) assert.equal(c.fn, "directory_professionals");
});

test("by ids: many ids are one call for the whole directory, filtered here", async () => {
  const ids = Array.from({ length: BY_ID_LIMIT + 1 }, (_, i) => `p${i}`);
  const { rpc, calls } = fakeRpc(() => ({ data: [...ids, "other"].map((profile_id) => ({ profile_id })), error: null }));
  const r = await readProfessionalsByIds(rpc, ids);
  assert.deepEqual(calls, [{ fn: "directory_professionals", args: { p_profile_id: null } }]);
  assert.deepEqual((r.data ?? []).map((x) => x.profile_id), ids);
  assert.deepEqual(await readProfessionalsByIds(rpc, []), { data: [], error: null });
  assert.equal(calls.length, 1);
});
