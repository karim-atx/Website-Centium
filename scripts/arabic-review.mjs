// Round F (AV): writes the Arabic review file, one row per catalogue string,
// from the catalogues themselves (src/i18n/ar/*.ts), so the review always
// matches what ships.
//
//   node scripts/arabic-review.mjs <out-dir>
//
// writes <out-dir>/ARABIC_REVIEW.md and <out-dir>/ARABIC_REVIEW.csv.
// In a catalogue file, a line comment "// == Screen name ==" starts a screen,
// and a "// note: …" comment on an entry's line (or the line above it) is
// carried into the Notes column.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/arabic-review.mjs <out-dir>");
const DIR = join(import.meta.dirname, "..", "src", "i18n", "ar");
const AREAS = [
  ["core", "Earlier strings (navigation, Settings, Home)"],
  ["landing", "Landing and marketing pages"],
  ["legal", "Legal pages and summaries"],
  ["auth", "Sign-up, sign-in and onboarding"],
  ["settings", "Navigation, Settings and Help"],
  ["plans", "Plans and subscriptions"],
  ["messages", "Messages"],
  ["notifications", "Notifications and errors"],
  ["services", "Service messages (errors, validation, notices)"],
  ["shared", "Shared popups, sheets and components"],
  ["programmes", "Programmes: week notes, skip and move, check-in trend"],
  ["safety", "Referrals, vouchers, reviews and first messages"],
  ["venues", "Class no-shows, gym pass and member codes"],
  ["certificates", "Your certificates (Courses)"],
  ["pro", "Professional tools: Home, notifications and shared parts"],
  ["proclients", "Professional tools: Clients and a client's page"],
  ["proprofile", "Professional tools: More, profile, services and credentials"],
  ["procalendar", "Professional tools: Calendar"],
  ["promessages", "Professional tools: Messages"],
];

const rows = [];
for (const [area, title] of AREAS) {
  const file = join(DIR, `${area}.ts`);
  const src = readFileSync(file, "utf8");
  const lines = src.split("\n");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const kind = area === "legal" ? "legal" : area === "notifications" || area === "services" ? "notification / error" : "UI";
  const visit = (node) => {
    if (ts.isVariableDeclaration(node) && node.name.getText(sf) === area && node.initializer && ts.isObjectLiteralExpression(node.initializer)) {
      for (const p of node.initializer.properties) {
        if (!ts.isPropertyAssignment(p)) continue;
        const key = ts.isIdentifier(p.name) ? p.name.text : p.name.text;
        const line = sf.getLineAndCharacterOfPosition(p.getStart(sf)).line;
        let screen = "";
        for (let i = line; i >= 0; i--) {
          const m = /^\s*\/\/\s*==\s*(.+?)\s*==\s*$/.exec(lines[i]);
          if (m) { screen = m[1]; break; }
        }
        const endLine = sf.getLineAndCharacterOfPosition(p.getEnd()).line;
        const noteLines = [lines[line - 1] ?? "", ...lines.slice(line, endLine + 2)];
        const note = noteLines.map((l) => /\/\/\s*note:\s*(.+)$/.exec(l)?.[1]).find(Boolean) ?? "";
        const init = p.initializer;
        let arabic;
        if (ts.isObjectLiteralExpression(init)) {
          arabic = init.properties.filter(ts.isPropertyAssignment).map((f) => `${f.name.getText(sf)}: ${f.initializer.text}`).join(" | ");
        } else arabic = init.text;
        const flags = [];
        if (ts.isObjectLiteralExpression(init)) flags.push("plural");
        if (/\{\w+\}/.test(key)) flags.push("variable");
        rows.push({ area: title, kind, screen, key, arabic, flags: flags.join(", "), note });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
}

// The long legal documents are Arabic files with the English file's shape
// (their own tests check it), not catalogue keys: pair the two files' strings
// export by export, in order.
const LEGAL_DOCS = [
  ["marketing/legal/text.ts", "marketing/legal/text.ar.ts", "Legal page (Terms, Privacy, Health)"],
  ["marketing/legal/guidelines.ts", "marketing/legal/guidelines.ar.ts", "Community guidelines"],
  ["pages/settings/legalCopy.ts", "pages/settings/legalCopy.ar.ts", "In-app Terms and Privacy summaries"],
];
const SRC = join(import.meta.dirname, "..", "src");
function exportStrings(path) {
  const src = readFileSync(join(SRC, path), "utf8");
  const sf = ts.createSourceFile(path, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out = new Map();
  for (const st of sf.statements) {
    if (!ts.isVariableStatement(st) || !st.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
    for (const d of st.declarationList.declarations) {
      const list = [];
      const walk = (n) => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) list.push({ text: n.text, key: ts.isPropertyAssignment(n.parent) && n.parent.initializer === n ? n.parent.name.getText(sf) : "" });
        ts.forEachChild(n, walk);
      };
      if (d.initializer) walk(d.initializer);
      out.set(d.name.getText(sf), list);
    }
  }
  return out;
}
const ARABIC = /[؀-ۿ]/;
for (const [enPath, arPath, screen] of LEGAL_DOCS) {
  const en = exportStrings(enPath);
  const ar = exportStrings(arPath);
  for (const [name, arList] of ar) {
    const enList = en.get(name) ?? [];
    const aligned = enList.length === arList.length;
    arList.forEach((a, i) => {
      if (!ARABIC.test(a.text)) return;
      const english = aligned ? enList[i].text : "";
      rows.push({ area: "Legal pages and summaries", kind: "legal (lawyer to confirm)", screen: `${screen} › ${name}`, key: english || `(${name}, item ${i + 1})`, arabic: a.text, flags: "", note: aligned ? "" : "English not paired automatically; compare with the English file" });
    });
  }
}

const md = (s) => String(s).replace(/\|/g, "\\|").replace(/\n/g, " ");
const csv = (s) => `"${String(s).replace(/"/g, '""')}"`;
mkdirSync(out, { recursive: true });
writeFileSync(
  join(out, "ARABIC_REVIEW.csv"),
  "﻿" + ["Area,Kind,Screen,English,Arabic,Flags,Notes", ...rows.map((r) => [r.area, r.kind, r.screen, r.key, r.arabic, r.flags, r.note].map(csv).join(","))].join("\r\n"),
);

const head = readFileSync(join(import.meta.dirname, "arabic-review-head.md"), "utf8");
const parts = [head.trim(), "", `**${rows.length} strings.** Generated from \`src/i18n/ar/*.ts\` by \`scripts/arabic-review.mjs\`.`, ""];
for (const [, title] of AREAS) {
  const inArea = rows.filter((r) => r.area === title);
  if (!inArea.length) continue;
  parts.push(`## ${title} (${inArea.length})`, "");
  let screen = null;
  for (const r of inArea) {
    if (r.screen !== screen) {
      if (screen !== null) parts.push("");
      screen = r.screen;
      parts.push(`### ${screen || "General"}`, "", "| English | Arabic | Flags | Notes |", "|---|---|---|---|");
    }
    parts.push(`| ${md(r.key)} | <span dir="rtl">${md(r.arabic)}</span> | ${md(r.flags)} | ${md(r.note)} |`);
  }
  parts.push("");
}
writeFileSync(join(out, "ARABIC_REVIEW.md"), parts.join("\n"));
console.log(`${rows.length} strings`);
