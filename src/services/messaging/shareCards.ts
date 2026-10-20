// Release 3 · DB-7 chat cards a professional shares into a chat
// (send_group_card): a programme (programme_share) and a session
// (session_share). Kept apart from ./cards.ts on purpose: the client's chat
// does not draw these yet (W7 CU24), so a client keeps seeing the card's
// message text, exactly as before. Only the professional's ThreadView draws
// them (pro prop).
//
// Payload keys are the database's allowlist (message_card_payload_allowed):
// programme_share: template_id, name, duration_weeks, exercise_count, note;
// session_share: title, starts_at, duration_min, location, location_kind, note.
// Anything unreadable is null, and the message's own text shows instead.

export type ShareCard =
  | { kind: "programme_share"; templateId: string | null; name: string; durationWeeks: number | null; exerciseCount: number | null; note: string | null }
  | { kind: "session_share"; title: string; startsAt: string | null; durationMin: number | null; location: string | null; note: string | null };

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/** The share card on a message, from PostgREST's `message_cards(kind, payload)` (an object or a one-row array). */
export function parseShareCard(raw: unknown): ShareCard | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const { kind, payload } = row as { kind?: unknown; payload?: unknown };
  if (!payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  if (kind === "programme_share") {
    const name = text(p.name);
    if (!name) return null;
    return { kind, templateId: text(p.template_id), name, durationWeeks: num(p.duration_weeks), exerciseCount: num(p.exercise_count), note: text(p.note) };
  }
  if (kind === "session_share") {
    const title = text(p.title);
    if (!title) return null;
    return { kind, title, startsAt: text(p.starts_at), durationMin: num(p.duration_min), location: text(p.location), note: text(p.note) };
  }
  return null;
}
