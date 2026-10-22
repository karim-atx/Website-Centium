import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";
import { holdsWritten, saveToTable, type PresentationTable } from "./save";
import { APP_DEFAULT, presentationToRow, type PresentationRow } from "./mapping";

// saveToTable through the real supabase-js client, against a fake server, so
// every answer is parsed exactly as the app parses it. The case this guards:
// usePresentationSync's flush saves again for as long as the row it gets back
// differs from the device, so a save that reports "ok" without the write
// having landed sent it round without end (seen as tens of thousands of
// PATCH/POST pairs when a test fetch guard answered every write with 200 []).

type Answer = (method: string, body: Record<string, unknown>) => Response | Promise<Response>;

const json = (status: number, body: string) =>
  new Response(body, { status, headers: { "content-type": "application/json" } });

const ROW: PresentationRow = presentationToRow(APP_DEFAULT);
const DARK: PresentationRow = { ...ROW, theme: "dark" };

function server(answer: Answer) {
  const writes: string[] = [];
  const client = createClient("http://fake.local", "anon", {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: async (_input: string | URL | Request, init: RequestInit = {}) => {
        const method = (init.method ?? "GET").toUpperCase();
        writes.push(method);
        if (writes.length > 20) throw new Error("runaway");
        return answer(method, init.body ? JSON.parse(String(init.body)) : {});
      },
    },
  });
  const table = () => client.from("device_presentation_settings") as unknown as PresentationTable;
  return { writes, save: (changed: Partial<PresentationRow>) => saveToTable(table, "u1", changed, DARK) };
}

/** A faithful PostgREST: PATCH merges into the row, POST creates it. */
function faithful(row: PresentationRow | null): Answer {
  return (method, body) => {
    if (method === "PATCH") {
      if (!row) return json(200, "[]");
      row = { ...row, ...body };
      return json(200, JSON.stringify([row]));
    }
    if (row) return json(409, JSON.stringify({ code: "23505", message: "duplicate key value" }));
    const { owner_id: _o, platform: _p, ...rest } = body;
    row = { ...ROW, ...rest } as PresentationRow;
    return json(201, JSON.stringify(row));
  };
}

const quiet = <T>(fn: () => Promise<T>) => async () => {
  const error = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = error;
  }
};

test(
  "a save that lands is ok: an update, an insert, and the insert race",
  quiet(async () => {
    const updated = server(faithful({ ...ROW }));
    assert.deepEqual(await updated.save({ theme: "dark" }), { status: "ok", settings: { ...APP_DEFAULT, theme: "dark" } });
    assert.deepEqual(updated.writes, ["PATCH"]);

    const inserted = server(faithful(null));
    assert.equal((await inserted.save({ theme: "dark" })).status, "ok");
    assert.deepEqual(inserted.writes, ["PATCH", "POST"]);

    // No row read, but another tab has just created one.
    const raced = server(faithful({ ...ROW }));
    assert.equal((await raced.save({})).status, "ok");
    assert.deepEqual(raced.writes, ["POST", "PATCH"]);
  })
);

test(
  "a refused, failed or unreachable save is an error, after one attempt; only a refusal is a permission error",
  quiet(async () => {
    const cases: [string, Answer, string, boolean][] = [
      ["403", () => json(403, JSON.stringify({ code: "42501", message: "permission denied" })), "Your session expired. Sign in again to save this.", true],
      ["500", () => json(500, JSON.stringify({ code: "XX000", message: "internal error" })), "Couldn't save your display settings. Try again.", false],
      ["503 text", () => new Response("upstream unavailable", { status: 503 }), "Couldn't save your display settings. Try again.", false],
      ["network", () => Promise.reject(new TypeError("Failed to fetch")), "Couldn't reach the server.", false],
    ];
    for (const [name, answer, message, permission] of cases) {
      const s = server(answer);
      const result = await s.save({ theme: "dark" });
      assert.equal(result.status, "error", name);
      assert.ok(result.status === "error" && result.message.startsWith(message), `${name}: ${JSON.stringify(result)}`);
      assert.ok(result.status === "error" && result.permission === permission, `${name}: permission`);
      assert.deepEqual(s.writes, ["PATCH"], name);
    }
  })
);

test(
  "a success-shaped answer without the write in it is an error, never ok",
  quiet(async () => {
    const cases: [string, Answer][] = [
      ["200 empty body", () => new Response("", { status: 200 })],
      ["200 null", () => json(200, "null")],
      ["201 empty body", () => new Response("", { status: 201 })],
      // The fetch guard's answer: [] parses as "no row updated", then as the inserted row.
      ["200 []", () => json(200, "[]")],
      ["200 {}", () => json(200, "{}")],
      ["a row without the new value", () => json(200, JSON.stringify([ROW]))],
    ];
    for (const [name, answer] of cases) {
      const s = server(answer);
      for (const changed of [{ theme: "dark" as const }, {}]) {
        const result = await s.save(changed);
        assert.equal(result.status, "error", `${name}, ${JSON.stringify(changed)}: ${JSON.stringify(result)}`);
      }
      assert.ok(s.writes.length <= 4, `${name}: ${s.writes.join(" ")}`);
    }
  })
);

test("holdsWritten: one row holding every written value", () => {
  assert.equal(holdsWritten(DARK, { theme: "dark" }), true);
  assert.equal(holdsWritten(DARK, DARK), true);
  assert.equal(holdsWritten({ ...DARK, larger_text: true }, { theme: "dark" }), true);
  assert.equal(holdsWritten(ROW, { theme: "dark" }), false);
  assert.equal(holdsWritten({}, { theme: "dark" }), false);
  assert.equal(holdsWritten([DARK], { theme: "dark" }), false);
  assert.equal(holdsWritten(null, {}), false);
});
