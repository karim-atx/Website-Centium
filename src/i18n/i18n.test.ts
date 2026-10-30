import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { addCatalogue, fill, setActiveLanguage, t, tn } from "./core.ts";
import { appLocale, ARABIC_LOCALE } from "./format.ts";
import { isNumberField, normaliseDigits } from "./digits.ts";
import { settleLanguage } from "./settle.ts";

// Round F (AV): the string system, the app locale, Arabic digits typed into
// number fields, and which language wins on sign-in.

addCatalogue("ar", {
  Save: "حفظ",
  "{n} friends joined": { zero: "لم ينضم أحد", one: "انضم صديق واحد", two: "انضم صديقان", few: "انضم {n} أصدقاء", many: "انضم {n} صديقًا", other: "انضم {n} صديق" },
  "Hello {name}": "مرحبًا {name}",
});

afterEach(() => setActiveLanguage("en"));

describe("t and tn", () => {
  it("English is the key and is returned unchanged", () => {
    assert.equal(t("Save"), "Save");
    assert.equal(t("Hello {name}", { name: "Rami" }), "Hello Rami");
    assert.equal(tn(1, "{n} friend joined", "{n} friends joined"), "1 friend joined");
    assert.equal(tn(3, "{n} friend joined", "{n} friends joined"), "3 friends joined");
  });

  it("Arabic reads the catalogue and falls back to English", () => {
    setActiveLanguage("ar");
    assert.equal(t("Save"), "حفظ");
    assert.equal(t("Hello {name}", { name: "Rami" }), "مرحبًا Rami");
    assert.equal(t("Not translated yet"), "Not translated yet");
  });

  it("Arabic plurals use all six forms", () => {
    setActiveLanguage("ar");
    const s = (n: number) => tn(n, "{n} friend joined", "{n} friends joined");
    assert.equal(s(0), "لم ينضم أحد");
    assert.equal(s(1), "انضم صديق واحد");
    assert.equal(s(2), "انضم صديقان");
    assert.equal(s(5), "انضم 5 أصدقاء");
    assert.equal(s(11), "انضم 11 صديقًا");
    assert.equal(s(100), "انضم 100 صديق");
  });

  it("fills a placeholder once, never a value's own braces", () => {
    assert.equal(fill("{a} and {b}", { a: "{b}", b: "x" }), "{b} and x");
    assert.equal(fill("{missing}", {}), "{missing}");
  });
});

describe("appLocale", () => {
  it("is the named English locale in English, Lebanese Arabic with Western digits in Arabic", () => {
    assert.equal(appLocale("en-US"), "en-US");
    assert.equal(appLocale(), undefined);
    setActiveLanguage("ar");
    assert.equal(appLocale("en-GB"), ARABIC_LOCALE);
    const d = new Date(Date.UTC(2026, 9, 31));
    const text = d.toLocaleDateString(appLocale("en-US"), { day: "numeric", month: "long", timeZone: "UTC" });
    assert.match(text, /31/);
    assert.match(text, /تشرين/);
  });
});

describe("digits", () => {
  it("turns Arabic-Indic and Persian digits and marks into ASCII", () => {
    assert.equal(normaliseDigits("٧٢٫٥"), "72.5");
    assert.equal(normaliseDigits("۱۲۳"), "123");
    assert.equal(normaliseDigits("١٬٢٠٠"), "1,200");
    assert.equal(normaliseDigits("abc 12"), "abc 12");
  });

  it("only number fields are rewritten", () => {
    const f = (attrs: Record<string, string>, tagName = "INPUT", type = "text") => ({ tagName, type, inputMode: attrs.inputmode ?? "", getAttribute: (n: string) => attrs[n] ?? null });
    assert.equal(isNumberField(f({ inputmode: "decimal" })), true);
    assert.equal(isNumberField(f({ inputmode: "numeric" })), true);
    assert.equal(isNumberField(f({}, "INPUT", "number")), true);
    assert.equal(isNumberField(f({}, "INPUT", "tel")), true);
    assert.equal(isNumberField(f({})), false);
    assert.equal(isNumberField(f({}, "TEXTAREA")), false);
  });
});

describe("settleLanguage", () => {
  it("the account's language wins once onboarded", () => {
    assert.deepEqual(settleLanguage("en", "ar", true), { use: "ar", write: false });
    assert.deepEqual(settleLanguage("ar", "en", true), { use: "en", write: false });
  });
  it("while onboarding, the choice just made is kept and written", () => {
    assert.deepEqual(settleLanguage("ar", "en", false), { use: "ar", write: true });
  });
  it("no row: keep the device's, writing only a non-default", () => {
    assert.deepEqual(settleLanguage("ar", null, true), { use: "ar", write: true });
    assert.deepEqual(settleLanguage("en", null, true), { use: "en", write: false });
  });
});
