import { strict as assert } from "node:assert";
import { test } from "node:test";
import { FAIL_OPEN, parseAppConfig } from "./appConfigModel.ts";
import { jwtSessionId } from "./sessionClaims.ts";

const row = {
  min_version: "1.0.0",
  latest_version: "1.2.0",
  must_update: false,
  update_available: true,
  store_url: "https://play.google.com/store/apps/details?id=org.atraxia.centium",
  features: { health_sync: true, purchases: false, siri: "off" },
  notice_key: null,
};

test("app config: app_config's one row, as PostgREST returns it", () => {
  const c = parseAppConfig([row], "1.1.0");
  assert.equal(c.appVersion, "1.1.0");
  assert.equal(c.mustUpdate, false);
  assert.equal(c.updateAvailable, true);
  assert.equal(c.latestVersion, "1.2.0");
  assert.equal(c.storeUrl, row.store_url);
  // Only an explicit false switches a feature off.
  assert.deepEqual(c.features, { purchases: false });
});

test("app config: anything unreadable fails open", () => {
  for (const data of [null, undefined, [], "nope", 42]) {
    assert.deepEqual(parseAppConfig(data, "1.0.0"), { ...FAIL_OPEN, appVersion: "1.0.0" });
  }
});

test("app config: no update is forced without a store to send people to", () => {
  assert.equal(parseAppConfig([{ ...row, must_update: true, store_url: null }], "0.9.0").mustUpdate, false);
  assert.equal(parseAppConfig([{ ...row, must_update: true }], "0.9.0").mustUpdate, true);
  // Only an https store link is followed.
  assert.equal(parseAppConfig([{ ...row, store_url: "javascript:alert(1)" }], "1.0.0").storeUrl, null);
});

test("session claims: session_id from an access token, null otherwise", () => {
  const b64url = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const token = `${b64url({ alg: "HS256" })}.${b64url({ sub: "u1", session_id: "s-1" })}.sig`;
  assert.equal(jwtSessionId(token), "s-1");
  assert.equal(jwtSessionId(`${b64url({})}.${b64url({ sub: "u1" })}.sig`), null);
  assert.equal(jwtSessionId("not-a-token"), null);
  assert.equal(jwtSessionId(null), null);
});
