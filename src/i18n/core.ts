// Round F (AV): the app's own string system (F8: no library). English is the
// key: a screen writes t("Save") or t("{n} friends joined", { n }), and the
// Arabic catalogue maps that English to Arabic. Anything not yet translated
// shows its English, so a partly translated release never blanks a screen
// (Arabic is "beta" until every area is in, F7).
//
// Plurals: tn(n, one, other) picks the English form; in Arabic the catalogue
// holds the six CLDR forms under the English "other" form, chosen with
// Intl.PluralRules (Arabic: zero, one, two, few, many, other). French later
// adds a catalogue and nothing else.
//
// Pure module: no React, so services and tests use it too. The provider
// (AppContext) sets the active language once its catalogue has loaded.

export type Language = "en" | "ar";
export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>>;
export type CatalogueEntry = string | PluralForms;
export type Catalogue = Record<string, CatalogueEntry>;
export type Vars = Record<string, string | number>;

let active: Language = "en";
const catalogues: Record<Language, Catalogue> = { en: {}, ar: {} };
const loaded = new Set<Language>(["en"]);
const rules = new Map<Language, Intl.PluralRules>();

export const getLanguage = (): Language => active;
export const setActiveLanguage = (l: Language) => {
  active = l;
};
export const isRtl = (l: Language = active) => l === "ar";
export const isCatalogueLoaded = (l: Language) => loaded.has(l);

export function addCatalogue(l: Language, entries: Catalogue) {
  Object.assign(catalogues[l], entries);
  loaded.add(l);
}

/** "{name}" placeholders, filled once (a value containing "{x}" is never expanded again). */
export function fill(s: string, vars?: Vars): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

/** The text for this English key in the active language, with its placeholders filled. */
export function t(key: string, vars?: Vars): string {
  const e = active === "en" ? undefined : catalogues[active][key];
  return fill(typeof e === "string" ? e : key, vars);
}

function pluralRule(l: Language, n: number): Intl.LDMLPluralRule {
  let r = rules.get(l);
  if (!r) {
    r = new Intl.PluralRules(l);
    rules.set(l, r);
  }
  return r.select(n);
}

/** A count sentence: English one/other; other languages by their plural rule. {n} is the count unless vars say otherwise. */
export function tn(n: number, one: string, other: string, vars?: Vars): string {
  const v: Vars = { n, ...vars };
  if (active === "en") return fill(n === 1 ? one : other, v);
  const e = catalogues[active][other] ?? catalogues[active][one];
  if (typeof e === "string") return fill(e, v);
  if (e) return fill(e[pluralRule(active, n)] ?? e.other ?? other, v);
  return fill(n === 1 ? one : other, v);
}

/** Every key a catalogue holds (the review file and the completeness tests read it). */
export const catalogueKeys = (l: Language) => Object.keys(catalogues[l]);
export const catalogueEntry = (l: Language, key: string) => catalogues[l][key];
