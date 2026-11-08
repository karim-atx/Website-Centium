import { strict as assert } from "node:assert";
import { test } from "node:test";
import { journalMessage } from "./biometricsModel.ts";

test("the signed message is exactly what the server rebuilds (DB-Z8)", () => {
  assert.equal(
    journalMessage("unlock", "0b5f6e1c-1111-4c0e-9a2b-3c4d5e6f7a8b", "9f8e7d6c-2222-4b1a-8c3d-4e5f6a7b8c9d", "n0nce"),
    "centium-journal:v1:unlock:0b5f6e1c-1111-4c0e-9a2b-3c4d5e6f7a8b:9f8e7d6c-2222-4b1a-8c3d-4e5f6a7b8c9d:n0nce",
  );
  assert.ok(journalMessage("remove", "f", "d", "n").startsWith("centium-journal:v1:remove:"));
});
