import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import type { Catalogue, CatalogueEntry } from "./core.ts";
import ar from "./ar/index.ts";
import core from "./ar/core.ts";
import * as landing from "./ar/landing.ts";
import * as legal from "./ar/legal.ts";
import * as auth from "./ar/auth.ts";
import * as settings from "./ar/settings.ts";
import * as plans from "./ar/plans.ts";
import * as messages from "./ar/messages.ts";
import * as notifications from "./ar/notifications.ts";
import * as services from "./ar/services.ts";
import * as shared from "./ar/shared.ts";
import * as programmes from "./ar/programmes.ts";
import * as certificates from "./ar/certificates.ts";
import * as safety from "./ar/safety.ts";
import * as venues from "./ar/venues.ts";
import * as marketplace from "./ar/marketplace.ts";
import * as market from "./ar/market.ts";
import * as share from "./ar/share.ts";
import * as member from "./ar/member.ts";
import * as community from "./ar/community.ts";
import * as findpros from "./ar/findpros.ts";
import * as misc from "./ar/misc.ts";
import * as health from "./ar/health.ts";
import * as cycle from "./ar/cycle.ts";
import * as food from "./ar/food.ts";
import * as workout from "./ar/workout.ts";
import * as mind from "./ar/mind.ts";
import * as business from "./ar/business.ts";
import * as bizanalytics from "./ar/bizanalytics.ts";
import * as bizrevenue from "./ar/bizrevenue.ts";
import * as bizops from "./ar/bizops.ts";
import * as bizmarket from "./ar/bizmarket.ts";
import * as bizteam from "./ar/bizteam.ts";
import * as sharedbiz from "./ar/sharedbiz.ts";
import * as sharedmember from "./ar/sharedmember.ts";
import * as sharedfood from "./ar/sharedfood.ts";
import * as sharedhealth from "./ar/sharedhealth.ts";
import * as sharedpro from "./ar/sharedpro.ts";
import * as pro from "./ar/pro.ts";
import * as proclients from "./ar/proclients.ts";
import * as proprofile from "./ar/proprofile.ts";
import * as procalendar from "./ar/procalendar.ts";
import * as promessages from "./ar/promessages.ts";
import * as prolibrary from "./ar/prolibrary.ts";
import * as pronutrition from "./ar/pronutrition.ts";
import * as proforms from "./ar/proforms.ts";
import * as proinsights from "./ar/proinsights.ts";
import * as provitals from "./ar/provitals.ts";
import * as procourses from "./ar/procourses.ts";
import * as pronetwork from "./ar/pronetwork.ts";
import * as promarket from "./ar/promarket.ts";
import * as premium from "./ar/premium.ts";
import * as premium2 from "./ar/premium2.ts";
import * as premium3 from "./ar/premium3.ts";
import * as premium4 from "./ar/premium4.ts";

// Round F (AV): the translated areas (F7) stay translated. For every source
// file an area lists, every t/tn/tk key has Arabic, every Arabic entry keeps
// the English placeholders, no English is left as bare JSX text or a bare
// text attribute, and a key used by two areas has one Arabic.

const AREAS = { landing, legal, auth, settings, plans, messages, notifications, services, shared, programmes, safety, venues, certificates, marketplace, market, share, member, community, findpros, misc, health, cycle, food, workout, mind, business, bizanalytics, bizrevenue, bizops, bizmarket, bizteam, sharedbiz, sharedmember, sharedfood, sharedhealth, sharedpro, pro, proclients, proprofile, procalendar, promessages, prolibrary, pronutrition, proforms, proinsights, provitals, procourses, pronetwork, promarket, premium, premium2, premium3, premium4 };
const SRC = join(import.meta.dirname, "..");

// Words that are the same in both languages (names, never translated).
const SAME = /^(Centium|Atraxia|Centium Premium|Centium Business|Whish|Apple Health|Health Connect|Apple|Google|Google Play|App Store|English|العربية|OK|AI|PDF|QR|ID|×|·|•|—|–|\/|&|\+|%|kg|lb|cm|kcal)$/;
// Props whose value is text a person reads.
const TEXT_PROPS = new Set(["placeholder", "title", "aria-label", "alt", "label", "aria-description", "aria-placeholder", "subtitle", "sub", "description", "hint", "caption", "heading", "message", "helper", "ariaLabel", "desc"]);
const IGNORE = /i18n-ignore|i18n-ok/;

type Found = { keys: { key: string; plural: boolean; line: number }[]; bare: { text: string; line: number }[] };

function scan(file: string): Found {
  const src = readFileSync(join(SRC, file), "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, file.endsWith("x") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const lines = src.split("\n");
  const ignored = (pos: number) => {
    const l = sf.getLineAndCharacterOfPosition(pos).line;
    return IGNORE.test(lines[l] ?? "") || IGNORE.test(lines[l - 1] ?? "");
  };
  const lineOf = (n: ts.Node) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const lit = (e: ts.Node | undefined) => (e && (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) ? e.text : null);
  const found: Found = { keys: [], bare: [] };
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const callee = ts.isIdentifier(node.expression) ? node.expression.text : ts.isPropertyAccessExpression(node.expression) ? node.expression.name.text : "";
      if (callee === "t" || callee === "tk") {
        const k = lit(node.arguments[0]);
        if (k !== null) found.keys.push({ key: k, plural: false, line: lineOf(node) });
      } else if (callee === "tx") {
        const k = lit(node.arguments[0]);
        const c = lit(node.arguments[1]);
        if (k !== null && c !== null) found.keys.push({ key: `${k}|${c}`, plural: false, line: lineOf(node) });
      } else if (callee === "tn") {
        const other = lit(node.arguments[2]);
        if (other !== null) found.keys.push({ key: other, plural: true, line: lineOf(node) });
      }
    }
    if (ts.isJsxText(node) && /[A-Za-z]/.test(node.text) && !SAME.test(node.text.trim()) && !ignored(node.getStart(sf))) {
      found.bare.push({ text: node.text.trim().replace(/\s+/g, " "), line: lineOf(node) });
    }
    // EH final: English inside a template literal shown as a JSX child or a
    // text prop ({`From ${x}`}, aria-label={`Open ${name}`}), including either
    // branch of a ternary and both sides of ?? / || / &&; also a plain string
    // shown as {"…"} or given to subtitle / sub / hint and the like. Allowed:
    // joins of interpolations and punctuation, URLs and paths, <style> CSS,
    // and lines marked "// i18n-ok: <reason>".
    let shown: Shown[] = [];
    if (ts.isJsxExpression(node) && (ts.isJsxFragment(node.parent) || (ts.isJsxElement(node.parent) && node.parent.openingElement.tagName.getText(sf) !== "style"))) shown = shownIn(node.expression);
    if (ts.isJsxAttribute(node) && TEXT_PROPS.has(node.name.getText(sf)) && node.initializer) {
      shown = ts.isJsxExpression(node.initializer) ? shownIn(node.initializer.expression) : ts.isStringLiteral(node.initializer) ? [node.initializer] : [];
    }
    for (const s of shown) {
      const text = staticText(s);
      if (/[A-Za-z]{3,}/.test(text) && !SAME.test(text.trim()) && !ignored(s.getStart(sf))) found.bare.push({ text: s.getText(sf).replace(/\s+/g, " "), line: lineOf(s) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
}

// The literals an expression shows: itself, the branches of a ternary, and
// both sides of ?? / || / && (never inside a call, so a template passed to t()
// or a helper isn't flagged).
type Shown = ts.TemplateExpression | ts.NoSubstitutionTemplateLiteral | ts.StringLiteral;
function shownIn(e: ts.Expression | undefined): Shown[] {
  if (!e) return [];
  if (ts.isParenthesizedExpression(e)) return shownIn(e.expression);
  if (ts.isTemplateExpression(e) || ts.isNoSubstitutionTemplateLiteral(e) || ts.isStringLiteral(e)) return [e];
  if (ts.isConditionalExpression(e)) return [...shownIn(e.whenTrue), ...shownIn(e.whenFalse)];
  const joins = [ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.BarBarToken, ts.SyntaxKind.AmpersandAmpersandToken];
  if (ts.isBinaryExpression(e) && joins.includes(e.operatorToken.kind)) return [...shownIn(e.left), ...shownIn(e.right)];
  return [];
}

// A literal's text outside ${…}, without URLs, paths and e-mail addresses.
function staticText(s: Shown): string {
  return (ts.isTemplateExpression(s) ? [s.head.text, ...s.templateSpans.map((p) => p.literal.text)] : [s.text])
    .join(" ")
    .replace(/\b(?:https?:\/\/|mailto:|tel:)\S*/g, " ")
    .replace(/(?:^|\s)\/[\w\-./?=&#%]*/g, " ")
    .replace(/[\w.+-]*@[\w.-]+/g, " ");
}

const vars = (s: string) => new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
const forms = (e: CatalogueEntry) => (typeof e === "string" ? [e] : Object.values(e).filter((v): v is string => typeof v === "string"));

describe("Arabic catalogue", () => {
  for (const [area, mod] of Object.entries(AREAS)) {
    describe(area, () => {
      for (const file of mod.FILES) {
        it(file, () => {
          assert.ok(existsSync(join(SRC, file)), `${file} does not exist`);
          const { keys, bare } = scan(file);
          const missing = keys.filter(({ key }) => !(key in ar)).map(({ key, line }) => `  ${line}: ${JSON.stringify(key)}`);
          assert.deepEqual(missing, [], `keys with no Arabic in ${file}:\n${missing.join("\n")}`);
          const pluralAsString = keys.filter(({ key, plural }) => plural && typeof ar[key] === "string" && /\{n\}/.test(key)).map(({ key, line }) => `  ${line}: ${key}`);
          assert.deepEqual(pluralAsString, [], `tn() keys need the plural forms in ${file}:\n${pluralAsString.join("\n")}`);
          const left = bare.map(({ text, line }) => `  ${line}: ${text}`);
          assert.deepEqual(left, [], `English outside t() in ${file}:\n${left.join("\n")}`);
        });
      }
    });
  }

  it("every Arabic entry keeps the English placeholders", () => {
    const bad: string[] = [];
    for (const [key, e] of Object.entries(ar)) {
      const want = vars(key);
      for (const f of forms(e)) {
        const got = vars(f);
        // A plural form may drop {n} ("one friend"), never add a name the key lacks.
        const extra = [...got].filter((v) => !want.has(v) && v !== "n");
        const lost = [...want].filter((v) => !got.has(v) && !(typeof e !== "string" && v === "n"));
        if (extra.length || lost.length) bad.push(`${JSON.stringify(key)} → ${JSON.stringify(f)}`);
      }
    }
    assert.deepEqual(bad, []);
  });

  it("a key in two areas has the same Arabic", () => {
    const seen = new Map<string, { area: string; e: CatalogueEntry }>();
    const clash: string[] = [];
    const all: [string, Catalogue][] = [["core", core], ...Object.entries(AREAS).map(([a, m]) => [a, m.default] as [string, Catalogue])];
    for (const [area, cat] of all) {
      for (const [key, e] of Object.entries(cat)) {
        const prev = seen.get(key);
        if (prev && JSON.stringify(prev.e) !== JSON.stringify(e)) clash.push(`${JSON.stringify(key)}: ${prev.area} vs ${area}`);
        else if (!prev) seen.set(key, { area, e });
      }
    }
    assert.deepEqual(clash, []);
  });

  it("no area lists a file twice", () => {
    const files = Object.values(AREAS).flatMap((m) => m.FILES);
    assert.deepEqual(files.filter((f, i) => files.indexOf(f) !== i), []);
  });
});
