import { strict as assert } from "node:assert";
import { afterEach, test } from "node:test";
import { resetTurnOn, setTurnOn, subscribeTurnOn, turnOnFor, turnOnSnapshot } from "./turnOnStore";

const auth = { method: "password" as const, email: "a@example.com" };

afterEach(() => resetTurnOn());

test("turn on: a pending re-authentication stays for the same account (survives a remount)", () => {
  setTurnOn("u1", { busy: true });
  setTurnOn("u1", { pending: { publicKey: "pk", auth }, busy: false });
  const s = turnOnFor(turnOnSnapshot(), "u1");
  assert.equal(s.pending?.publicKey, "pk");
  assert.equal(s.busy, false);
});

test("turn on: another account sees none of it", () => {
  setTurnOn("u1", { pending: { publicKey: "pk", auth }, error: "x" });
  const s = turnOnFor(turnOnSnapshot(), "u2");
  assert.equal(s.pending, null);
  assert.equal(s.error, null);
});

test("turn on: another account's write drops the old state", () => {
  setTurnOn("u1", { pending: { publicKey: "pk", auth }, added: 3 });
  setTurnOn("u2", { busy: true });
  const s = turnOnSnapshot();
  assert.equal(s.owner, "u2");
  assert.equal(s.busy, true);
  assert.equal(s.pending, null);
  assert.equal(s.added, 0);
});

test("turn on: subscribers hear every write until they leave", () => {
  let calls = 0;
  const off = subscribeTurnOn(() => calls++);
  setTurnOn("u1", { error: "e" });
  setTurnOn("u1", { error: null });
  off();
  setTurnOn("u1", { busy: true });
  assert.equal(calls, 2);
});
