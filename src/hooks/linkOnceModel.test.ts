import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { withoutParam } from "./linkOnceModel.ts";

describe("withoutParam", () => {
  it("takes off only the one-time parameter", () => {
    assert.equal(withoutParam("?log=1", "log").toString(), "");
    assert.equal(withoutParam("tab=memberships&pass=1", "pass").toString(), "tab=memberships");
    assert.equal(withoutParam(new URLSearchParams("start=today&tab=routines"), "start").toString(), "tab=routines");
    assert.equal(withoutParam("tab=history", "start").toString(), "tab=history");
  });
});
