import { test } from "node:test";
import assert from "node:assert/strict";
import { mailtoHref, safeHref, telHref } from "./safeHref";

test("safeHref keeps http and https only", () => {
  assert.equal(safeHref("https://verify.example.org/cert/123"), "https://verify.example.org/cert/123");
  assert.equal(safeHref(" HTTP://Example.com "), "http://example.com/");
  assert.equal(safeHref("javascript:alert(document.cookie)"), null);
  assert.equal(safeHref(" JavaScript:alert(1)"), null);
  assert.equal(safeHref("data:text/html,<script>alert(1)</script>"), null);
  assert.equal(safeHref("vbscript:x"), null);
  assert.equal(safeHref("//evil.example"), null);
  assert.equal(safeHref("https://"), null);
  assert.equal(safeHref(""), null);
});

test("mailtoHref takes one plain address and nothing else", () => {
  assert.equal(mailtoHref(" hello@gym.example "), "mailto:hello@gym.example");
  assert.equal(mailtoHref("hello@gym.example?body=Click%20this"), null);
  assert.equal(mailtoHref("a@b.example,c@d.example"), null);
  assert.equal(mailtoHref("a@b.example&cc=x@y.example"), null);
  assert.equal(mailtoHref("not an email"), null);
  assert.equal(mailtoHref("javascript:alert(1)//@x.example"), null);
});

test("telHref keeps the digits and a leading plus", () => {
  assert.equal(telHref("+961 1 234 567"), "tel:+9611234567");
  assert.equal(telHref("01-234-567"), "tel:01234567");
  assert.equal(telHref("12;ext=javascript:alert(1)"), "tel:121");
  assert.equal(telHref("--"), null);
});
