import { strict as assert } from "node:assert";
import { test } from "node:test";
import { COULDNT_SIGN_OUT_ALL, SIGN_OUT_SCOPE, signOutEveryDevice, signOutWithScope, type SignOutAuth, type SignOutScope } from "./signOutScope.ts";

/** A stand-in for supabase.auth that records the scope it was asked for. */
function fakeAuth(error: { name: string; message: string; status?: number } | null = null) {
  const scopes: SignOutScope[] = [];
  const auth: SignOutAuth = {
    signOut: async ({ scope }) => {
      scopes.push(scope);
      return { error };
    },
  };
  return { auth, scopes };
}

test("Sign out ends this device's session only", async () => {
  assert.equal(SIGN_OUT_SCOPE.signOut, "local");
  const { auth, scopes } = fakeAuth();
  await signOutWithScope(auth, SIGN_OUT_SCOPE.signOut);
  assert.deepEqual(scopes, ["local"]);
});

test("deleting the account still ends every device's session", async () => {
  assert.equal(SIGN_OUT_SCOPE.deleteAccount, "global");
  const { auth, scopes } = fakeAuth();
  await signOutWithScope(auth, SIGN_OUT_SCOPE.deleteAccount);
  assert.deepEqual(scopes, ["global"]);
});

test("a failed sign-out is reported, not thrown", async () => {
  const { auth } = fakeAuth({ name: "AuthRetryableFetchError", message: "Failed to fetch", status: 0 });
  const error = await signOutWithScope(auth, "local");
  assert.equal(error?.message, "Failed to fetch");
});

function recorder(opts: { othersError?: boolean; pushThrows?: boolean } = {}) {
  const calls: string[] = [];
  const { auth } = fakeAuth(opts.othersError ? { name: "AuthRetryableFetchError", message: "Failed to fetch", status: 0 } : null);
  return {
    calls,
    steps: {
      revokeOthers: async () => {
        calls.push("others");
        return signOutWithScope(auth, "others");
      },
      removeOtherPush: async () => {
        calls.push("push");
        if (opts.pushThrows) throw new Error("push_subscriptions 42501");
      },
      signOutHere: async () => {
        calls.push("local");
      },
    },
  };
}

test("all devices: the others first, then their push rows, then this device", async () => {
  const { calls, steps } = recorder();
  assert.deepEqual(await signOutEveryDevice(steps), { ok: true });
  assert.deepEqual(calls, ["others", "push", "local"]);
});

test("all devices: if the others can't be signed out, nothing else happens and it says so", async () => {
  const { calls, steps } = recorder({ othersError: true });
  assert.deepEqual(await signOutEveryDevice(steps), { ok: false, message: COULDNT_SIGN_OUT_ALL });
  assert.deepEqual(calls, ["others"]);
});

test("all devices: a push clean-up failure still signs this device out", async (t) => {
  const logged = t.mock.method(console, "error", () => {});
  const { calls, steps } = recorder({ pushThrows: true });
  assert.deepEqual(await signOutEveryDevice(steps), { ok: true });
  assert.deepEqual(calls, ["others", "push", "local"]);
  assert.equal(logged.mock.callCount(), 1);
});

test("all devices revokes with the scope that keeps this session on a failure", async () => {
  const scopes: SignOutScope[] = [];
  const auth: SignOutAuth = { signOut: async ({ scope }) => (scopes.push(scope), { error: null }) };
  await signOutEveryDevice({ revokeOthers: () => signOutWithScope(auth, "others"), removeOtherPush: async () => {}, signOutHere: async () => void (await signOutWithScope(auth, SIGN_OUT_SCOPE.signOut)) });
  assert.deepEqual(scopes, ["others", "local"]);
});
