/**
 * Cross-checks every Supabase `.update()` payload in src/ against the
 * column-level UPDATE grant its table actually holds.
 *
 * WHY THIS EXISTS. No table in this schema has a table-level UPDATE grant —
 * all of them are column-scoped — and a column-level grant is checked at PLAN
 * time. So naming one ungranted column does not quietly drop that field: it
 * fails the whole statement with 42501, every time, for every user. Nothing in
 * the type system can see it, because the generated Row types describe columns
 * and say nothing about privileges. It is invisible until it runs.
 *
 * That is how `recipes.updated_at` reached production and broke recipe editing
 * outright. This script is the check that would have caught it in a second.
 *
 * NEEDS A DATABASE CONNECTION, which is why it is NOT part of `npm test`.
 * Grants are read live rather than parsed out of the migrations, because the
 * migrations live in another repository and a copy here would go stale exactly
 * when it mattered.
 *
 *     npm run audit:grants
 *
 * DATABASE_URL points it somewhere; it defaults to the local Supabase stack.
 * A read-only role is enough — it only reads information_schema.
 *
 *     DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
 *
 * EXIT CODES. 1 when a payload names a column outside its grant, 0 otherwise.
 * Payloads it cannot resolve are printed under "needs a human" and do NOT fail
 * the run — they are a gap in this script rather than a proven bug, and failing
 * on them would train people to ignore the output. They are counted out loud
 * for the same reason: a checker that silently skips what it cannot parse is
 * worse than no checker at all.
 *
 * WHAT IT IS NOT. A heuristic reader, not a TypeScript compiler. It is written
 * to be WRONG IN ONE DIRECTION ONLY: anything it is not certain about becomes
 * "needs a human", never a violation. A false violation would be read once and
 * then the whole tool ignored.
 */

// Loaded before anything reads process.env, for the reason given at the top of
// import-fdc-nutrients.ts: the constants below are evaluated at module load.
import dotenv from "dotenv";
dotenv.config({ path: [".env.local", ".env"], quiet: true });

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Client } from "pg";

const SRC = "src";
const DEFAULT_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";
const ROLE = "authenticated";
const SPREAD = "…spread:"; // marks a spread entry inside keysOf's output

// ---------------------------------------------------------------------------
// Reading the source
// ---------------------------------------------------------------------------

/**
 * Blanks comments and string contents, keeping every byte's offset.
 *
 * THE FIRST VERSION DID NOT DO THIS and read words inside a `// comment` in an
 * object literal as payload keys, reporting columns that were never sent.
 * Offsets are preserved so reported line numbers still point at real source.
 */
function blankNoise(src: string): string {
  const out = src.split("");
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const next = src[i + 1];
    if (c === "/" && next === "/") {
      while (i < src.length && src[i] !== "\n") out[i++] = " ";
    } else if (c === "/" && next === "*") {
      out[i++] = " ";
      out[i++] = " ";
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) {
        if (src[i] !== "\n") out[i] = " ";
        i++;
      }
      if (i < src.length) {
        out[i++] = " ";
        out[i++] = " ";
      }
    } else if (c === '"' || c === "'" || c === "`") {
      const quote = c;
      i++;
      while (i < src.length && src[i] !== quote) {
        if (src[i] === "\\") {
          out[i] = " ";
          i++;
        }
        if (i < src.length && src[i] !== "\n") out[i] = " ";
        i++;
      }
      i++;
    } else {
      i++;
    }
  }
  return out.join("");
}

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) yield* sourceFiles(full);
    else if (/\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry)) yield full;
  }
}

/** The balanced `{…}` starting at `start`, or null. */
function objectAt(src: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(start, i + 1);
  }
  return null;
}

/** Splits an object literal's body into its top-level entries. */
function entriesOf(obj: string): string[] {
  const inner = obj.slice(1, -1);
  const out: string[] = [];
  let depth = 0;
  let buf = "";
  for (const c of inner) {
    if (c === "{" || c === "[" || c === "(") depth++;
    else if (c === "}" || c === "]" || c === ")") depth--;
    if (c === "," && depth === 0) {
      if (buf.trim()) out.push(buf.trim());
      buf = "";
      continue;
    }
    buf += c;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Keys of an object literal. A spread becomes `SPREAD<expression>`. */
function keysOf(obj: string): string[] {
  return entriesOf(obj).map((entry) => {
    if (entry.startsWith("...")) return SPREAD + entry.slice(3).trim();
    const m = /^\[?["'`]?([A-Za-z_$][\w$]*)["'`]?\]?\s*(:|$)/.exec(entry);
    return m ? m[1] : "?";
  });
}

/** True when the expression has a `?:` at depth zero (not `?.` or `??`). */
function isTernary(expr: string): boolean {
  let depth = 0;
  for (let i = 0; i < expr.length; i++) {
    const c = expr[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      if (depth === 0) return false; // ran past the end of our expression
      depth--;
    } else if (c === "?" && depth === 0 && expr[i + 1] !== "." && expr[i + 1] !== "?") return true;
  }
  return false;
}

type Payload = { keys: string[] } | { unresolved: string };

/**
 * Resolves the payload an `.update(…)` call sends.
 *
 * Three things here were wrong in the first draft and are worth keeping named,
 * because each produced a confidently incorrect answer:
 *
 *  1. A VARIABLE RESOLVES TO ITS NEAREST PRECEDING DECLARATION, not to every
 *     declaration of that name in the file — which conflated `const row` in
 *     updateJournalEntry with `const row` in updateJournalFolder and judged
 *     each against the other's grant.
 *  2. MEMBER ACCESS READS THAT PROPERTY. `.update(built.row)` resolved `built`
 *     and reported its `{ ok, message }` as the payload: a violation that did
 *     not exist.
 *  3. A TERNARY IS NOT RESOLVED AT ALL. Either arm may be sent, so picking one
 *     is a guess.
 */
function resolvePayload(clean: string, callAt: number, argument: string, depth = 0): Payload {
  if (depth > 5) return { unresolved: "payload nests too deeply to follow" };
  const trimmed = argument.trimStart();

  if (trimmed.startsWith("{")) {
    const obj = objectAt(trimmed, 0);
    if (!obj) return { unresolved: "unbalanced object literal" };
    const keys = new Set<string>();
    for (const k of keysOf(obj)) {
      if (k === "?") return { unresolved: "payload has a computed key" };
      if (!k.startsWith(SPREAD)) {
        keys.add(k);
        continue;
      }
      // A spread. `...(cond && { a })` and `...(cond ? { a } : {})` both
      // appear in this codebase; unwrap to the object being spread.
      let expr = k.slice(SPREAD.length);
      const guarded = /&&\s*(\{[\s\S]*?\})\s*\)?\s*$/.exec(expr);
      if (guarded) expr = guarded[1];
      else if (expr.startsWith("(")) expr = expr.slice(1).replace(/\)\s*$/, "");
      const inner = resolvePayload(clean, callAt, expr, depth + 1);
      if ("unresolved" in inner) {
        return { unresolved: `spread \`...${k.slice(SPREAD.length).slice(0, 34)}\`: ${inner.unresolved}` };
      }
      inner.keys.forEach((x) => keys.add(x));
    }
    return { keys: [...keys] };
  }

  if (isTernary(trimmed)) {
    return { unresolved: "payload is a conditional expression; both arms would need checking" };
  }

  const name = /^([A-Za-z_$][\w$]*)/.exec(trimmed)?.[1];
  if (!name) return { unresolved: `payload is an expression: ${trimmed.slice(0, 44).split("\n")[0]}` };

  // A helper call, e.g. .update(toRow(draft)).
  if (new RegExp(`^${name}\\s*\\(`).test(trimmed)) {
    const fn = new RegExp(
      `(?:function\\s+${name}\\b|(?:const|let)\\s+${name}\\s*(?::[^=]{0,200})?=)[\\s\\S]{0,900}?(?:=>|return)\\s*\\(?\\s*\\{`
    );
    const m = fn.exec(clean);
    if (!m) return { unresolved: `payload built by ${name}(), which is not defined in this file` };
    const obj = objectAt(clean, clean.indexOf("{", m.index + m[0].length - 1));
    if (!obj) return { unresolved: `could not read what ${name}() returns` };
    return resolvePayload(clean, callAt, obj, depth + 1);
  }

  const decl = new RegExp(`(?:const|let|var)\\s+${name}\\b[^=]{0,240}?=\\s*`, "g");
  let found: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = decl.exec(clean)) && m.index < callAt) found = m;
  if (!found) {
    return { unresolved: `\`${name}\` is a parameter, or declared outside this file; its shape is not visible here` };
  }

  const valueAt = found.index + found[0].length;
  const value = clean.slice(valueAt);
  const member = /^[A-Za-z_$][\w$]*((?:\.[A-Za-z_$][\w$]*)+)/.exec(trimmed);

  if (member) {
    const prop = member[1].slice(1);
    const after = value.trimStart();
    const obj = after.startsWith("{") ? objectAt(after, 0) : null;
    if (!obj) return { unresolved: `cannot read \`.${prop}\` of \`${name}\`` };
    const entry = entriesOf(obj).find((e) => new RegExp(`^["'\`]?${prop}["'\`]?\\s*:`).test(e));
    if (!entry) return { unresolved: `\`${name}.${prop}\` is not set to an object literal here` };
    const braceAt = entry.indexOf("{");
    if (braceAt < 0) return { unresolved: `\`${name}.${prop}\` is not an object literal` };
    const sub = objectAt(entry, braceAt);
    if (!sub) return { unresolved: `cannot read \`${name}.${prop}\`` };
    return resolvePayload(clean, callAt, sub, depth + 1);
  }

  const resolved = resolvePayload(clean, found.index, value, depth + 1);
  if ("unresolved" in resolved) return resolved;

  // Assignments between the declaration and the call: row.k = …, row["k"] = …
  const keys = new Set(resolved.keys);
  const between = clean.slice(found.index, callAt);
  for (const a of between.matchAll(new RegExp(`\\b${name}\\.([A-Za-z_$][\\w$]*)\\s*=[^=]`, "g"))) keys.add(a[1]);
  for (const a of between.matchAll(new RegExp(`\\b${name}\\[["'\`]([A-Za-z_$][\\w$]*)["'\`]\\]\\s*=[^=]`, "g"))) keys.add(a[1]);
  return { keys: [...keys] };
}

interface Finding {
  file: string;
  line: number;
  table: string | null;
  keys: string[];
  reason?: string;
}

function scan(): { checked: Finding[]; unresolved: Finding[] } {
  const checked: Finding[] = [];
  const unresolved: Finding[] = [];

  for (const file of sourceFiles(SRC)) {
    const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    const clean = blankNoise(raw);
    const rel = relative(".", file).split(sep).join("/");

    for (const m of clean.matchAll(/\.update\(/g)) {
      const at = m.index!;
      const line = raw.slice(0, at).split("\n").length;
      const window = clean.slice(Math.max(0, at - 1500), at);

      // Only Supabase chains. A Map, a ref or a third-party client also has
      // .update(); those are not ours to check.
      if (!/supabase|\.from\(/.test(window)) continue;

      // The table: nearest preceding .from("literal"). Names live in the raw
      // text, since blankNoise emptied every string.
      const froms = [...window.matchAll(/\.from\(\s*["'`]/g)];
      let table: string | null = null;
      if (froms.length) {
        const offset = Math.max(0, at - 1500) + froms[froms.length - 1].index!;
        table = /\.from\(\s*["'`]([A-Za-z_0-9]+)["'`]/.exec(raw.slice(offset, offset + 140))?.[1] ?? null;
      }
      if (!table) {
        unresolved.push({ file: rel, line, table: null, keys: [], reason: "the table is a variable, so it cannot be named here" });
        continue;
      }

      const payload = resolvePayload(clean, at, raw.slice(at + ".update(".length));
      if ("unresolved" in payload) unresolved.push({ file: rel, line, table, keys: [], reason: payload.unresolved });
      else checked.push({ file: rel, line, table, keys: payload.keys });
    }
  }
  return { checked, unresolved };
}

// ---------------------------------------------------------------------------
// Reading the grants
// ---------------------------------------------------------------------------

async function readGrants(): Promise<{ byTable: Map<string, Set<string>>; tableWide: string[] }> {
  const connectionString = process.env.DATABASE_URL || DEFAULT_URL;
  const client = new Client({ connectionString });
  try {
    await client.connect();
  } catch (e) {
    console.error(
      `\nCould not connect to ${connectionString.replace(/:\/\/[^@]*@/, "://***@")}\n` +
        `  ${(e as Error).message}\n\n` +
        `This script needs a database. Start the local stack (\`supabase start\` in the\n` +
        `Database repo), or set DATABASE_URL to another one. A read-only role is enough.\n`
    );
    process.exit(2);
  }

  const columns = await client.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name
       from information_schema.column_privileges
      where table_schema = 'public' and grantee = $1 and privilege_type = 'UPDATE'`,
    [ROLE]
  );
  // A table-level grant makes every column writable and this check moot for
  // that table, so it is reported rather than silently passed.
  const wide = await client.query<{ table_name: string }>(
    `select table_name from information_schema.table_privileges
      where table_schema = 'public' and grantee = $1 and privilege_type = 'UPDATE'`,
    [ROLE]
  );
  await client.end();

  const byTable = new Map<string, Set<string>>();
  for (const r of columns.rows) {
    if (!byTable.has(r.table_name)) byTable.set(r.table_name, new Set());
    byTable.get(r.table_name)!.add(r.column_name);
  }
  return { byTable, tableWide: wide.rows.map((r) => r.table_name) };
}

// ---------------------------------------------------------------------------

async function main() {
  const { byTable, tableWide } = await readGrants();
  const { checked, unresolved } = scan();

  const violations: { f: Finding; bad: string[]; granted: string[] }[] = [];
  let clean = 0;

  for (const f of checked) {
    const granted = byTable.get(f.table!);
    if (!granted) {
      unresolved.push({ ...f, reason: `${ROLE} holds no UPDATE grant on \`${f.table}\` at all` });
      continue;
    }
    const bad = f.keys.filter((k) => !granted.has(k));
    if (bad.length) violations.push({ f, bad, granted: [...granted].sort() });
    else clean++;
  }

  console.log(`\nUPDATE-grant audit  (role: ${ROLE})`);
  console.log(`  ${byTable.size} tables with column-scoped UPDATE grants`);
  if (tableWide.length) console.log(`  ${tableWide.length} with a TABLE-WIDE grant, unchecked: ${tableWide.join(", ")}`);
  console.log(`  ${checked.length + unresolved.length} update payloads found under ${SRC}/\n`);

  for (const { f, bad, granted } of violations) {
    console.log(`VIOLATION  ${f.file}:${f.line}  [${f.table}]`);
    console.log(`           sends:       ${[...f.keys].sort().join(", ")}`);
    console.log(`           granted:     ${granted.join(", ")}`);
    console.log(`           NOT GRANTED: ${bad.join(", ")}\n`);
  }

  if (unresolved.length) {
    console.log(`Needs a human (${unresolved.length}) — read these by hand:`);
    for (const f of unresolved) console.log(`  ${f.file}:${f.line}  [${f.table ?? "?"}]  ${f.reason}`);
    console.log("");
  }

  console.log(
    `${clean} payload${clean === 1 ? "" : "s"} checked and clean, ` +
      `${unresolved.length} need a human, ${violations.length} violation${violations.length === 1 ? "" : "s"}.`
  );

  process.exit(violations.length ? 1 : 0);
}

void main();
