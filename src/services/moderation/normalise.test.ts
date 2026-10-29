import { strict as assert } from "node:assert";
import { test } from "node:test";
import { matchesPhrase, moderationNormalise } from "./normalise.ts";

// Expected values read from the Database's own moderation_normalise() (local stack, 20261220020000).
const SQL: [string, string, string][] = [
  ["I want to END   it ALL!!!", "i want to end it all", "i want to end it al"],
  ["Cut myseeeelf", "cut myseelf", "cut myself"],
  ["k1ll mys3lf", "kill myself", "kil myself"],
  ["Ａｒｅ you ok", "are you ok", "are you ok"],
  ["h@te $100 a$$", "hate 100 ass", "hate 10 as"],
  ["أنا مُتعـب جداً", "انا متعب جدا", "انا متعب جدا"],
  ["ٱلسلام ىة ٣٤", "السلام يه 34", "السلام يه 34"],
  ["ѕаd аnd аlоnе", "sad and alone", "sad and alone"],
  ["zero​width", "zerowidth", "zerowidth"],
  ["2024 is 4ever", "2024 is aever", "2024 is aever"],
];

test("normalisation matches the database's moderation_normalise()", () => {
  for (const [text, two, one] of SQL) {
    assert.equal(moderationNormalise(text, "en", 2), two, text);
    assert.equal(moderationNormalise(text, "en", 1), one, text);
  }
});

const PHRASES = [
  { normalised: "end it all", language: "en" },
  { normalised: "cut myself", language: "en" },
  { normalised: "suicide", language: "en" },
  { normalised: "better off dead", language: "en" },
];

test("phrases match as whole words, through spelling tricks", () => {
  assert.equal(matchesPhrase("Sometimes I just want to END IT ALLLL", PHRASES), true);
  assert.equal(matchesPhrase("I c u t  myseeelf yesterday", PHRASES), false); // "c u t" is only three letters spaced: read as "cut"
  assert.equal(matchesPhrase("I keep wanting to cut mys3lf", PHRASES), true);
  assert.equal(matchesPhrase("thinking about s u i c i d e", PHRASES), true);
  assert.equal(matchesPhrase("b3tter 0ff d3ad", PHRASES), true);
});

test("no match in ordinary text, or inside other words", () => {
  assert.equal(matchesPhrase("Let's send it all tomorrow", PHRASES), false);
  assert.equal(matchesPhrase("I cut my sugar this week", PHRASES), false);
  assert.equal(matchesPhrase("", PHRASES), false);
  assert.equal(matchesPhrase("end it all", []), false);
});
