// Collapsing message notifications from one chat into one ("3 new messages
// from Sarah"). Shared by the service worker (src/sw.ts) and its test; no
// browser or worker globals.
//
// KEYED ON AN OPAQUE CHAT KEY THE SERVER SENDS (`data.group`), never on the
// title. The title carries only a first name, so two different people called
// Sarah would otherwise merge into one notification that opens only one of
// their chats. A push without the key keeps its own notification, as before.

const PREFIX = "New message from ";

/** The tag for a push, or undefined to leave it uncollapsed. */
export function collapseTag(raw: Record<string, unknown>): string | undefined {
  const extra = typeof raw.data === "object" && raw.data !== null ? (raw.data as Record<string, unknown>) : {};
  const group = typeof extra.group === "string" ? extra.group.trim() : "";
  // Opaque and short: letters, digits, dash and underscore only.
  return /^[A-Za-z0-9_-]{8,128}$/.test(group) ? `chat-${group}` : undefined;
}

/**
 * The title and count for a notification replacing `previousCount` earlier
 * ones from the same chat. The server's title is "New message from <name>";
 * anything else keeps its own title and says the count in the body.
 */
export function collapsedText(
  title: string,
  body: string,
  previousCount: number
): { title: string; body: string; count: number } {
  const count = Math.max(0, Math.floor(previousCount)) + 1;
  if (count === 1) return { title, body, count };
  if (title.startsWith(PREFIX) && title.length > PREFIX.length) {
    return { title: `${count} new messages from ${title.slice(PREFIX.length)}`, body, count };
  }
  return { title, body: `${count} new messages`, count };
}
