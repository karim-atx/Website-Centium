import { test } from "node:test";
import assert from "node:assert/strict";
import { filterId, filterTimestamp } from "./postgrestFilter";

const id = "82d9bb42-ee5c-4055-90d3-824c7162af0b";
const NIL = "00000000-0000-0000-0000-000000000000";

test("filterId passes a uuid and turns anything else into the nil uuid", () => {
  assert.equal(filterId(id), id);
  assert.equal(filterId(id.toUpperCase()), id.toUpperCase());
  assert.equal(filterId(`${id},is_public.is.true`), NIL);
  assert.equal(filterId("x),or(owner_id.neq.null"), NIL);
  assert.equal(filterId(""), NIL);
});

test("filterTimestamp passes the server's timestamps and nothing else", () => {
  for (const at of ["2026-11-05T09:30:00.123456+00:00", "2026-11-05T09:30:00Z", "2026-11-05 09:30:00+02", "2026-11-05T09:30"])
    assert.equal(filterTimestamp(at), at);
  assert.equal(filterTimestamp('2026-11-05T09:30:00Z",id.gt.0'), "1970-01-01T00:00:00Z");
  assert.equal(filterTimestamp("now"), "1970-01-01T00:00:00Z");
});
