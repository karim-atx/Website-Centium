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
import * as sharedbiz from "./ar/sharedbiz.ts";
import * as sharedmember from "./ar/sharedmember.ts";
import * as sharedfood from "./ar/sharedfood.ts";
import * as sharedhealth from "./ar/sharedhealth.ts";
import * as sharedpro from "./ar/sharedpro.ts";

// Round F (AV): the translated areas (F7) stay translated. For every source
// file an area lists, every t/tn/tk key has Arabic, every Arabic entry keeps
// the English placeholders, no English is left as bare JSX text or a bare
// text attribute, and a key used by two areas has one Arabic.

const AREAS = { landing, legal, auth, settings, plans, messages, notifications, services, shared, programmes, safety, venues, certificates, sharedbiz, sharedmember, sharedfood, sharedhealth, sharedpro };
const SRC = join(import.meta.dirname, "..");

// Words that are the same in both languages (names, never translated).
const SAME = /^(Centium|Atraxia|Centium Premium|Apple|Google|Google Play|App Store|English|العربية|OK|AI|PDF|QR|ID|×|·|•|—|–|\/|&|\+|%|kg|lb|cm|kcal)$/;
const TEXT_ATTRS = new Set(["placeholder", "title", "aria-label", "alt", "label", "aria-description", "aria-placeholder"]);
const IGNORE = /i18n-ignore/;

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
    if (ts.isJsxAttribute(node) && TEXT_ATTRS.has(node.name.getText(sf)) && node.initializer) {
      const v = ts.isStringLiteral(node.initializer) ? node.initializer.text : ts.isJsxExpression(node.initializer) ? lit(node.initializer.expression) : null;
      if (v && /[A-Za-z]/.test(v) && !SAME.test(v.trim()) && !ignored(node.getStart(sf))) found.bare.push({ text: `${node.name.getText(sf)}="${v}"`, line: lineOf(node) });
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return found;
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
