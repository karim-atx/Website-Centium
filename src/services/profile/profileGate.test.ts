import { strict as assert } from "node:assert";
import { test } from "node:test";
import {
  OFFLINE_CACHE_LETS_IN,
  classifyProfileRead,
  isSessionRefusal,
  profileCacheSaysOnboarded,
  profileGate,
  sessionVerdict,
  type ClientSession,
  type ProfileReadOutcome,
  type ReadError,
} from "./profileGate.ts";
import { isOffline } from "../network-error.ts";

// Karim, 2026-11-09: a profile that can't be loaded never shows onboarding;
// only a read confirmed as this account with no row means a new account.

const ME = "11111111-1111-4111-8111-111111111111";
const SOMEONE_ELSE = "22222222-2222-4222-8222-222222222222";
const mine: ClientSession = { kind: "user", userId: ME };

/** The read as fetchProfile classifies it, then the gate on top. */
function decide(read: {
  error?: ReadError | null;
  hasRow?: boolean;
  session?: ClientSession;
  onboarded?: boolean;
  cachedOnboarded?: boolean;
}) {
  const outcome = classifyProfileRead({
    userId: ME,
    error: read.error ?? null,
    hasRow: read.hasRow ?? false,
    session: read.session,
    offline: isOffline,
  });
  return profileGate({ outcome, onboarded: read.onboarded ?? false, cachedOnboarded: read.cachedOnboarded ?? false });
}

test("ok and onboarded goes into the app", () => {
  assert.equal(decide({ hasRow: true, onboarded: true }), "app");
});

test("ok and not onboarded goes to onboarding", () => {
  assert.equal(decide({ hasRow: true, onboarded: false }), "onboarding");
});

test("no row, read as this account: a new account, onboarding", () => {
  assert.equal(decide({ hasRow: false, session: mine }), "onboarding");
  // Even if a stale cache claimed otherwise: hydration sets onboarded false
  // for a confirmed missing row, and nothing then lets the cache back in.
  assert.deepEqual(classifyProfileRead({ userId: ME, error: null, hasRow: false, session: mine, offline: isOffline }), {
    status: "missing",
  });
});

test("no row with no client session: the signed-out read, an error", () => {
  assert.equal(decide({ hasRow: false, session: { kind: "none" } }), "error");
  assert.equal(decide({ hasRow: false, session: undefined }), "error");
  assert.deepEqual(classifyProfileRead({ userId: ME, error: null, hasRow: false, session: { kind: "none" }, offline: isOffline }), {
    status: "error",
    reason: "session",
  });
});

test("no row with another account's session: an error, never onboarding", () => {
  assert.equal(decide({ hasRow: false, session: { kind: "user", userId: SOMEONE_ELSE } }), "error");
  // A cached onboarded:true does not rescue a session error.
  assert.equal(decide({ hasRow: false, session: { kind: "user", userId: SOMEONE_ELSE }, cachedOnboarded: true }), "error");
});

test("offline with this account's own onboarded cache goes into the app", () => {
  assert.equal(OFFLINE_CACHE_LETS_IN, true);
  assert.equal(decide({ error: { message: "TypeError: Failed to fetch" }, cachedOnboarded: true, onboarded: true }), "app");
  // getSession() failing for want of a connection, after an empty answer.
  assert.equal(decide({ hasRow: false, session: { kind: "unreadable", offline: true }, cachedOnboarded: true, onboarded: true }), "app");
});

test("offline with no trustworthy cache is the error screen", () => {
  assert.equal(decide({ error: { message: "Load failed" }, cachedOnboarded: false }), "error");
  assert.deepEqual(classifyProfileRead({ userId: ME, error: { message: "Failed to fetch" }, hasRow: false, offline: isOffline }), {
    status: "error",
    reason: "offline",
  });
});

test("a session error is always the error screen", () => {
  for (const error of [{ status: 401, code: "PGRST301" }, { code: "PGRST303" }, { code: "42501", message: "permission denied for table profiles" }]) {
    assert.equal(decide({ error, cachedOnboarded: true, onboarded: true }), "error", JSON.stringify(error));
    assert.deepEqual(classifyProfileRead({ userId: ME, error, hasRow: false, offline: isOffline }), { status: "error", reason: "session" });
  }
  // getSession() itself refused (not the connection): a session error too.
  assert.equal(decide({ hasRow: false, session: { kind: "unreadable", offline: false }, cachedOnboarded: true }), "error");
});

test("any other failure is the error screen", () => {
  const error = { code: "PGRST000", message: "Could not connect to the database", status: 503 };
  assert.deepEqual(classifyProfileRead({ userId: ME, error, hasRow: false, offline: isOffline }), { status: "error", reason: "failed" });
  assert.equal(decide({ error, cachedOnboarded: true, onboarded: true }), "error");
  assert.equal(decide({ error: { code: "XX000", message: "boom", status: 500 } }), "error");
});

test("a returned row wins whatever the session check would say", () => {
  assert.deepEqual(classifyProfileRead({ userId: ME, error: null, hasRow: true, offline: isOffline }), { status: "ok" });
});

test("the gate follows onboarded live, so finishing onboarding lets them in", () => {
  const ok: ProfileReadOutcome = { status: "ok" };
  const missing: ProfileReadOutcome = { status: "missing" };
  assert.equal(profileGate({ outcome: ok, onboarded: true, cachedOnboarded: false }), "app");
  assert.equal(profileGate({ outcome: missing, onboarded: true, cachedOnboarded: false }), "app");
});

test("session refusals", () => {
  assert.equal(isSessionRefusal({ status: 401 }), true);
  assert.equal(isSessionRefusal({ code: "PGRST301" }), true);
  assert.equal(isSessionRefusal({ code: "PGRST303" }), true);
  assert.equal(isSessionRefusal({ code: "42501" }), true);
  assert.equal(isSessionRefusal({ code: "23505", status: 409 }), false);
  assert.equal(isSessionRefusal({ code: "ATXG1", status: 400 }), false);
  assert.equal(isSessionRefusal(null), false);
});

test("the client session against the account", () => {
  assert.equal(sessionVerdict(ME, mine), "match");
  assert.equal(sessionVerdict(ME, { kind: "user", userId: SOMEONE_ELSE }), "mismatch");
  assert.equal(sessionVerdict(ME, { kind: "none" }), "mismatch");
  assert.equal(sessionVerdict(ME, { kind: "unreadable", offline: true }), "offline");
  assert.equal(sessionVerdict(ME, { kind: "unreadable", offline: false }), "mismatch");
});

test("only this account's own cache counts as onboarded", () => {
  assert.equal(profileCacheSaysOnboarded(ME, ME, { id: ME, onboarded: true }), true);
  assert.equal(profileCacheSaysOnboarded(ME, ME, { id: ME, onboarded: false }), false);
  // Another account's cache, or one with no id (the seeded default).
  assert.equal(profileCacheSaysOnboarded(ME, ME, { id: SOMEONE_ELSE, onboarded: true }), false);
  assert.equal(profileCacheSaysOnboarded(ME, ME, { onboarded: true }), false);
  // A tab bound to another account (or signed out) holds another namespace.
  assert.equal(profileCacheSaysOnboarded(ME, SOMEONE_ELSE, { id: ME, onboarded: true }), false);
  assert.equal(profileCacheSaysOnboarded(ME, null, { id: ME, onboarded: true }), false);
  assert.equal(profileCacheSaysOnboarded(ME, ME, null), false);
});
