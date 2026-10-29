// The Database's moderation normalisation, on the device (Round C Release 2,
// HANDOVER "Private messages, on the device"; Database 20261220020000
// moderation_clean / moderation_lat_text / moderation_leet /
// moderation_normalise / moderation_candidates). Pure, so it is tested here
// against the same examples.
//
// ONLY FOR THE SENDER'S OWN SCREEN. Private messages are never scanned on the
// server; this lets the app offer "Get support" to the person typing, and
// nothing about the match is sent anywhere.

// Invisible characters (as the SQL's class): soft hyphen, combining grapheme
// joiner, Arabic letter mark, Hangul fillers, Khmer / Mongolian invisibles,
// zero-width space / joiners, direction marks and overrides, word joiner and
// invisible operators, variation selectors, BOM.
const INVISIBLE = /[­͏؜ᅟᅠ឴឵᠋-᠏​-‏‪-‮⁠-⁯ㅤ︀-️﻿ﾠ]/g;
// eslint-disable-next-line no-control-regex -- control characters are exactly what this removes
const CONTROL = /[\u0001-\u001F\u007F-\u009F]/g;
// Arabic tashkeel (harakat, superscript alef, Quranic marks) and tatweel.
const TASHKEEL = /[ً-ٰٟۖ-ۭـ]/g;

const FROM = "аеёіїјкморсухѕԁӏԛԝүɡαβγεηικνορτυχωϲςأإآٱىة٠١٢٣٤٥٦٧٨٩۰۱۲۳۴۵۶۷۸۹";
const TO = "aeeiijkmopcyxsdlqwygabyenikvoptuxwcsاااايه01234567890123456789";
const MAP = new Map([...FROM].map((c, i) => [c, [...TO][i]]));

/** moderation_clean(): NFKC, invisibles out, lower case, Arabic and look-alikes unified, spaces collapsed. */
export function moderationClean(text: string): string {
  const s = (text ?? "").normalize("NFKC").replace(INVISIBLE, "").replace(CONTROL, " ").toLowerCase().replace(TASHKEEL, "");
  return [...s]
    .map((c) => MAP.get(c) ?? c)
    .join("")
    .replace(/\s+/g, " ")
    .trim();
}

const LETTER = /\p{L}/u;
const isLetter = (c: string | undefined) => !!c && LETTER.test(c);

/** moderation_lat_text(): @ and $ beside a letter (or in a run touching one) read as a and s. */
export function moderationLatText(clean: string): string {
  const swap = (s: string, sym: string, to: string) => {
    const chars = [...s];
    return chars
      .map((c, i) => {
        if (c !== sym) return c;
        const prev = chars[i - 1];
        const next = chars[i + 1];
        return isLetter(prev) || prev === sym || isLetter(next) || next === sym ? to : c;
      })
      .join("");
  };
  return swap(swap(clean, "@", "a"), "$", "s");
}

/** moderation_leet(): in a token holding a letter, 0 1 3 4 5 7 read as o i e a s t. */
export function moderationLeet(token: string, oneAsL = false): string {
  if (!/[^0-9]/.test(token)) return token;
  const to = oneAsL ? "oleast" : "oieast";
  return token.replace(/[013457]/g, (d) => to["013457".indexOf(d)]);
}

/** Tokens: anything that is not a letter or digit separates them. */
export const tokens = (s: string): string[] => s.split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Repeated letters cut to two (3+ → 2), or to one. */
export const cut2 = (t: string) => t.replace(/(.)\1{2,}/gu, "$1$1");
export const cut1 = (t: string) => t.replace(/(.)\1+/gu, "$1");

/** moderation_normalise(text, language, repeats): what a term's stored form is. */
export function moderationNormalise(text: string, language = "en", repeats: 1 | 2 = 2): string {
  const arabizi = language === "arabizi";
  const clean = moderationClean(text);
  return tokens(arabizi ? clean : moderationLatText(clean))
    .map((t) => (arabizi ? t : moderationLeet(t)))
    .map(repeats === 1 ? cut1 : cut2)
    .join(" ");
}

/**
 * The sequences a text is compared by, for one family (Latin readings, or
 * Arabizi as written): every token read as the language reads it, with three
 * or more single characters in a row also read as one word ("s e x"), each in
 * both cuts.
 */
export function readings(text: string, arabizi: boolean): string[][] {
  const clean = moderationClean(text);
  const raw = tokens(arabizi ? clean : moderationLatText(clean));
  const read = (t: string) => (arabizi ? t : moderationLeet(t));
  const base = raw.map(read);
  // Runs of 3+ single characters, merged.
  const merged: string[] = [];
  for (let i = 0; i < raw.length; ) {
    if ([...raw[i]].length !== 1) {
      merged.push(base[i]);
      i++;
      continue;
    }
    let j = i;
    while (j < raw.length && [...raw[j]].length === 1) j++;
    if (j - i >= 3) merged.push(read(raw.slice(i, j).join("")));
    else merged.push(...base.slice(i, j));
    i = j;
  }
  const out = [base.map(cut2), base.map(cut1), merged.map(cut2), merged.map(cut1)];
  // "1" also read as "l" in a token with a letter.
  if (!arabizi && raw.some((t) => t.includes("1") && /[^0-9]/.test(t)))
    out.push(raw.map((t) => cut2(moderationLeet(t, true))), raw.map((t) => cut1(moderationLeet(t, true))));
  return out;
}

const contains = (hay: readonly string[], needle: readonly string[]) => {
  if (!needle.length || needle.length > hay.length) return false;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let k = 0; k < needle.length; k++) if (hay[i + k] !== needle[k]) continue outer;
    return true;
  }
  return false;
};

export interface Phrase {
  /** moderation_normalise()'s form, as self_harm_phrases() returns it. */
  normalised: string;
  language: string;
}

/** Whether the text holds one of the phrases, as whole words. */
export function matchesPhrase(text: string, phrases: readonly Phrase[]): boolean {
  if (!text.trim() || !phrases.length) return false;
  const lat = phrases.some((p) => p.language !== "arabizi") ? readings(text, false) : [];
  const arz = phrases.some((p) => p.language === "arabizi") ? readings(text, true) : [];
  return phrases.some((p) => {
    const words = p.normalised.split(" ").filter(Boolean);
    const forms = [words, words.map(cut1)];
    const seqs = p.language === "arabizi" ? arz : lat;
    return seqs.some((s) => forms.some((f) => contains(s, f)));
  });
}
