// Release 3 · DB-7 / CU9: a professional's recommendation card
// (send_recommendation), drawn by ChatCard on both sides; the client adds it
// with add_recommendation. Kept apart from ./cards.ts (the A3 cards) and
// ./shareCards.ts so neither changes.
//
// Payload keys are the database's allowlist (message_card_payload_allowed):
// title, body, category, ref_kind, ref_id, link. The title is required
// (≤ 120), the body an optional note (≤ 1000). Anything unreadable is null,
// and the message's own text (the title) shows instead, as before.
//
// THE BODY AS THE CARD DRAWS IT (CU9 r26 recCard26): its first line is the
// bold line under the title ("Tuesday and Thursday"), every further non-empty
// line a bullet ("Helps recovery before your ski trip"). A one-line note is
// just the bold line.

export interface RecommendationCard {
  kind: "recommendation";
  title: string;
  /** The body's first line, or null. */
  lead: string | null;
  /** The body's further lines. */
  points: string[];
  category: string;
  refKind: string | null;
  refId: string | null;
}

const text = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/** The recommendation on a message, from PostgREST's `message_cards(kind, payload)` (an object or a one-row array). */
export function parseRecommendation(raw: unknown): RecommendationCard | null {
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row || typeof row !== "object") return null;
  const { kind, payload } = row as { kind?: unknown; payload?: unknown };
  if (kind !== "recommendation" || !payload || typeof payload !== "object") return null;
  const p = payload as Record<string, unknown>;
  const title = text(p.title);
  if (!title) return null;
  const lines = (text(p.body) ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/^[-•·]\s*/, ""))
    .filter(Boolean);
  return {
    kind: "recommendation",
    title,
    lead: lines[0] ?? null,
    points: lines.slice(1),
    category: text(p.category) ?? "other",
    refKind: text(p.ref_kind),
    refId: text(p.ref_id),
  };
}
