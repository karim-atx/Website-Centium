import { test } from "node:test";
import assert from "node:assert/strict";
import { isAlreadySaved, isUuid, newRequestId, requestColumn } from "./requestId.ts";

test("a new queue id is a uuid", () => {
  for (let i = 0; i < 20; i++) assert.ok(isUuid(newRequestId()));
});

test("an older queue id is sent without client_request_id", () => {
  assert.deepEqual(requestColumn("1730000000000-3fa9c1"), {});
  assert.deepEqual(requestColumn(undefined), {});
  const id = "2f1b6c3e-8a4d-4c1e-9b7a-0d2e5f6a7b8c";
  assert.deepEqual(requestColumn(id), { client_request_id: id });
});

test("only the client_request unique violation means already saved", () => {
  assert.equal(isAlreadySaved({ code: "23505", message: 'duplicate key value violates unique constraint "food_log_entries_client_request_unique"' }), true);
  assert.equal(isAlreadySaved({ code: "23505", message: "dup", details: "habit_completions_client_request_unique" }), true);
  assert.equal(isAlreadySaved({ code: "23505", message: 'duplicate key value violates unique constraint "habit_completions_pkey"' }), false);
  assert.equal(isAlreadySaved({ code: "ATXA5", message: "client_request_unique" }), false);
  assert.equal(isAlreadySaved(null), false);
});
