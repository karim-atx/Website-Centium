import { strict as assert } from "node:assert";
import { test } from "node:test";
import { reminderFrom, reminderLanding, resolveReminder, withoutReminder, type PushDestinationRpc } from "./pushReminder.ts";
import { appPathFrom, decideHeldPath, type HeldPath } from "../../platform/openPathModel.ts";
import { nativePushTarget } from "../../platform/nativePushTarget.ts";
import { notificationTarget } from "./messagePushUrl.ts";

// Batch D GA (neutral health links) · /app?reminder=<uuid> → push_destination.

const RID = "5C755543-bee6-48c2-9d7b-c56ef46aedf6";
const rid = RID.toLowerCase();

/** A fake push_destination that records what it was asked. */
function fake(answer: Awaited<ReturnType<PushDestinationRpc>> | Error) {
  const asked: string[] = [];
  const rpc: PushDestinationRpc = async (id) => {
    asked.push(id);
    if (answer instanceof Error) throw answer;
    return answer;
  };
  return { asked, rpc };
}

test("parsing ?reminder=: absent, malformed, a uuid (lowercased)", () => {
  assert.equal(reminderFrom(""), null);
  assert.equal(reminderFrom("?tab=x"), null);
  assert.deepEqual(reminderFrom(`?reminder=${RID}`), { id: rid });
  assert.deepEqual(reminderFrom("?reminder="), { id: null });
  assert.deepEqual(reminderFrom("?reminder=pill"), { id: null });
  assert.deepEqual(reminderFrom(`?reminder=${rid}x`), { id: null });
  assert.equal(withoutReminder(`?reminder=${rid}`), "");
  assert.equal(withoutReminder(`?a=1&reminder=${rid}&b=2`), "?a=1&b=2");
});

test("a valid id asks push_destination once and lands on its page (the caller replaces)", async () => {
  for (const page of ["/app/contraception", "/app/health/medications"]) {
    const f = fake({ data: page, error: null });
    assert.equal(await resolveReminder(`?reminder=${RID}`, f.rpc), page);
    assert.deepEqual(f.asked, [rid]);
  }
});

test("null, an error, a missing function or a thrown call: /app with the param stripped", async () => {
  const cases: (Awaited<ReturnType<PushDestinationRpc>> | Error)[] = [
    { data: null, error: null }, // not the caller's, deleted, another kind
    { data: null, error: { code: "PGRST202", message: "Could not find the function" } }, // not on this Database yet (404)
    { data: null, error: { code: "42501", message: "permission denied" } },
    { data: "https://evil.example/app", error: null }, // never leaves the app
    { data: 42, error: null },
    null, // gave up waiting
    new Error("Failed to fetch"),
  ];
  for (const c of cases) {
    const f = fake(c);
    assert.equal(await resolveReminder(`?reminder=${rid}`, f.rpc), "/app", JSON.stringify(c));
    assert.equal(f.asked.length, 1);
  }
  const f = fake({ data: null, error: null });
  assert.equal(await resolveReminder(`?x=1&reminder=${rid}`, f.rpc), "/app?x=1");
  assert.equal(reminderLanding(null), null);
});

test("a malformed id never reaches the server; no ?reminder= does nothing", async () => {
  for (const s of ["?reminder=", "?reminder=pill", "?reminder=../../x", `?reminder=${rid}%20or%201`]) {
    const f = fake({ data: "/app/contraception", error: null });
    assert.equal(await resolveReminder(s, f.rpc), "/app", s);
    assert.deepEqual(f.asked, [], s);
  }
  const f = fake({ data: "/app/contraception", error: null });
  assert.equal(await resolveReminder("", f.rpc), null);
  assert.equal(await resolveReminder("?tab=1", f.rpc), null);
  assert.deepEqual(f.asked, []);
});

test("signed out: the tap is held with its ?reminder= and resolved once signed in", async () => {
  // Native tap and the push banner (data.url), and the web service worker.
  const url = `/app?reminder=${rid}`;
  assert.equal(nativePushTarget({ type: "reminder", url }), url);
  assert.equal(notificationTarget({ type: "reminder", url }, "/app"), url);
  const held: HeldPath = { path: appPathFrom(nativePushTarget({ url }))!, heldAt: 0, owner: null };
  assert.equal(held.path, url);
  assert.equal(decideHeldPath(held, { ready: false, pathname: "/app/onboarding", userId: null, at: 1 }), "wait");
  assert.equal(decideHeldPath(held, { ready: true, pathname: "/app", userId: "u", at: 2 }), "open");
  // Opened at /app{search}: now resolved, as the signed-in member.
  const f = fake({ data: "/app/health/medications", error: null });
  assert.equal(await resolveReminder(new URL(held.path, "https://x.invalid").search, f.rpc), "/app/health/medications");
  assert.deepEqual(f.asked, [rid]);
});
