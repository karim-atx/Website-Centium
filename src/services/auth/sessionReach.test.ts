import test from "node:test";
import assert from "node:assert/strict";
import {
  onSessionReach,
  refreshFailure,
  retryDelayMs,
  sessionStanding,
  sessionUnreachable,
  setSessionUnreachable,
  unverifiedSessionFetch,
} from "../../../lib/supabase/sessionReach";

const ME = "a3000000-0000-4000-8000-000000000012";

// The errors auth-js 2.115.0 hands back from getSession() after a refresh.
const NETWORK = { name: "AuthRetryableFetchError", status: 0, message: "Failed to fetch" };
const GATEWAY = { name: "AuthRetryableFetchError", status: 503, message: "Service Unavailable" };
const REFUSED = { name: "AuthApiError", status: 400, message: "Invalid Refresh Token: Refresh Token Not Found" };
const UNAUTHORISED = { name: "AuthApiError", status: 401, message: "Unauthorized" };

test("a refresh that never reached the server is a network failure", () => {
  assert.equal(refreshFailure(NETWORK, true), "network");
  assert.equal(refreshFailure(GATEWAY, true), "network");
  assert.equal(refreshFailure({ status: 0 }, true), "network");
  // The browser saying it is offline outranks whatever the error says.
  assert.equal(refreshFailure(REFUSED, false), "network");
});

test("a refresh the server answered with a refusal is a refusal", () => {
  assert.equal(refreshFailure(REFUSED, true), "refused");
  assert.equal(refreshFailure(UNAUTHORISED, true), "refused");
  const invalidGrant = { name: "AuthApiError", status: 400, message: "invalid_grant" };
  assert.equal(refreshFailure(invalidGrant, true), "refused");
});

test("no error, no failure", () => {
  assert.equal(refreshFailure(null, true), null);
  assert.equal(refreshFailure(undefined, false), null);
});

test("network failure with a stored session: stay, offline", () => {
  assert.equal(sessionStanding({ sessionUserId: null, stored: true, failure: "network" }), "unreachable");
});

test("refused: the session ended", () => {
  assert.equal(sessionStanding({ sessionUserId: null, stored: true, failure: "refused" }), "ended");
  // auth-js has removed it by the time the answer arrives.
  assert.equal(sessionStanding({ sessionUserId: null, stored: false, failure: "refused" }), "ended");
});

test("no stored session: signed out", () => {
  assert.equal(sessionStanding({ sessionUserId: null, stored: false, failure: null }), "signedOut");
});

test("network failure without a stored session: signed out, nothing to come back to", () => {
  assert.equal(sessionStanding({ sessionUserId: null, stored: false, failure: "network" }), "signedOut");
});

test("retry success: signed in", () => {
  assert.equal(sessionStanding({ sessionUserId: ME, stored: true, failure: null }), "signedIn");
});

test("retry refused: the session ended", () => {
  assert.equal(sessionStanding({ sessionUserId: null, stored: false, failure: refreshFailure(REFUSED, true) }), "ended");
});

test("retry on the network again: still unreachable", () => {
  assert.equal(sessionStanding({ sessionUserId: null, stored: true, failure: refreshFailure(NETWORK, true) }), "unreachable");
});

test("the backstop timer: 5 s, 10 s, 20 s, then every 30 s", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 10].map(retryDelayMs), [5_000, 10_000, 20_000, 30_000, 30_000, 30_000]);
});

test("the tab's state notifies its subscribers on a change only", () => {
  const seen: boolean[] = [];
  const stop = onSessionReach(() => seen.push(sessionUnreachable()));
  try {
    setSessionUnreachable(true);
    setSessionUnreachable(true);
    setSessionUnreachable(false);
    assert.deepEqual(seen, [true, false]);
  } finally {
    stop();
    setSessionUnreachable(false);
  }
});

test("while unreachable, data requests fail as offline and never leave; auth requests pass", async () => {
  const sent: string[] = [];
  const inner = (async (input: string | URL | Request) => {
    sent.push(String(input));
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  let locked = false;
  const f = unverifiedSessionFetch(inner, () => locked);
  try {
    setSessionUnreachable(true);
    for (const url of ["http://x/rest/v1/profiles", "http://x/storage/v1/object/a", "http://x/functions/v1/f"]) {
      await assert.rejects(f(url), (e: Error) => e.name === "AbortError" && /failed to fetch/i.test(e.message));
    }
    await f("http://x/auth/v1/token?grant_type=refresh_token", { method: "POST" });
    // A locked tab keeps the identity guard's own answer.
    locked = true;
    await f("http://x/rest/v1/profiles");
    locked = false;
    setSessionUnreachable(false);
    await f("http://x/rest/v1/profiles");
    assert.deepEqual(sent, ["http://x/auth/v1/token?grant_type=refresh_token", "http://x/rest/v1/profiles", "http://x/rest/v1/profiles"]);
  } finally {
    setSessionUnreachable(false);
  }
});
