import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// Messaging phase 2A on the client (Database 20261002000000-030000): per-person
// chat settings (mute, pin, archive), reactions, and the reads the chat list,
// the starred screen and the chat-info gallery need.
//
// EVERYTHING HERE IS PER PERSON. Muting, pinning or archiving a chat changes it
// for the caller only; the other participant's list is untouched.

type Fail = { ok: false; message: string };

// ---------------------------------------------------------------------------
// Chat settings
// ---------------------------------------------------------------------------

export interface ThreadSettings {
  mutedAlways: boolean;
  mutedUntil: string | null;
  archivedAt: string | null;
  pinnedAt: string | null;
}

export const NO_SETTINGS: ThreadSettings = { mutedAlways: false, mutedUntil: null, archivedAt: null, pinnedAt: null };

/** Whether notifications are muted right now. */
export function isMuted(s: ThreadSettings | undefined, now = Date.now()): boolean {
  if (!s) return false;
  return s.mutedAlways || (!!s.mutedUntil && new Date(s.mutedUntil).getTime() > now);
}

/** The caller's settings for every chat that has any, keyed by thread id. */
export async function fetchThreadSettings(): Promise<Record<string, ThreadSettings>> {
  const { data, error } = await supabase
    .from("thread_user_settings")
    .select("thread_id, muted_always, muted_until, archived_at, pinned_at");
  if (error) {
    console.error("[chat] Could not load chat settings:", error.message);
    return {};
  }
  const out: Record<string, ThreadSettings> = {};
  for (const r of data ?? []) {
    out[r.thread_id] = {
      mutedAlways: r.muted_always,
      mutedUntil: r.muted_until,
      archivedAt: r.archived_at,
      pinnedAt: r.pinned_at,
    };
  }
  return out;
}

type SettingsPatch = Partial<{
  muted_always: boolean;
  muted_until: string | null;
  archived_at: string | null;
  pinned_at: string | null;
}>;

/**
 * Changes one chat's settings for the caller.
 *
 * UPDATE THEN INSERT, never upsert: the UPDATE grant is column-scoped and
 * excludes thread_id and user_id, and an upsert's conflict path would be
 * refused the moment a row existed. ATX38 is the pin cap.
 */
export async function saveThreadSettings(
  threadId: string,
  userId: string,
  patch: SettingsPatch
): Promise<{ ok: true } | Fail> {
  const updated = await supabase
    .from("thread_user_settings")
    .update(patch)
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .select("thread_id");
  if (updated.error) return fail(updated.error);
  if (updated.data && updated.data.length > 0) return { ok: true };
  const inserted = await supabase
    .from("thread_user_settings")
    .insert({ thread_id: threadId, user_id: userId, ...patch });
  if (inserted.error && inserted.error.code === "23505") {
    return saveThreadSettings(threadId, userId, patch);
  }
  return inserted.error ? fail(inserted.error) : { ok: true };
}

export type MuteChoice = "1h" | "8h" | "1w" | "always" | "off";

export const MUTE_CHOICES: { value: MuteChoice; label: string }[] = [
  { value: "1h", label: "1 hour" },
  { value: "8h", label: "8 hours" },
  { value: "1w", label: "1 week" },
  { value: "always", label: "Always" },
];

export function mutePatch(choice: MuteChoice, now = Date.now()): SettingsPatch {
  const hours = { "1h": 1, "8h": 8, "1w": 24 * 7 } as const;
  if (choice === "off") return { muted_always: false, muted_until: null };
  if (choice === "always") return { muted_always: true, muted_until: null };
  return { muted_always: false, muted_until: new Date(now + hours[choice] * 3600_000).toISOString() };
}

function fail(error: { code?: string; message?: string }): Fail {
  console.error("[chat] Could not save:", error.message);
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "ATX38") return { ok: false, message: "You can pin up to 5 chats. Unpin one to pin this." };
  return { ok: false, message: "Couldn't save that. Try again." };
}

// ---------------------------------------------------------------------------
// Reactions: one per person per message.
// ---------------------------------------------------------------------------

export interface Reaction {
  userId: string;
  emoji: string;
}

/** The quick reactions offered first, as in the design. */
export const QUICK_REACTIONS = ["👍", "❤️", "💪", "👏", "😂"];
/** Behind "More reactions". */
export const MORE_REACTIONS = ["🙏", "🎉", "😮", "😢", "🔥", "✅", "🥗", "🏃", "😅", "🤔", "👀", "💯"];

export async function fetchReactions(messageIds: string[]): Promise<Record<string, Reaction[]>> {
  if (messageIds.length === 0) return {};
  const { data, error } = await supabase
    .from("message_reactions")
    .select("message_id, user_id, emoji")
    .in("message_id", messageIds);
  if (error) {
    console.error("[chat] Could not load reactions:", error.message);
    return {};
  }
  const out: Record<string, Reaction[]> = {};
  for (const r of data ?? []) (out[r.message_id] ??= []).push({ userId: r.user_id, emoji: r.emoji });
  return out;
}

/**
 * Sets, changes or removes the caller's reaction. One row per person per
 * message, so a change is an UPDATE and a removal a DELETE.
 */
export async function setReaction(
  messageId: string,
  userId: string,
  emoji: string | null,
  had: boolean
): Promise<{ ok: true } | Fail> {
  const q = supabase.from("message_reactions");
  const { error } = emoji === null
    ? await q.delete().eq("message_id", messageId).eq("user_id", userId)
    : had
      ? await q.update({ emoji }).eq("message_id", messageId).eq("user_id", userId)
      : await q.insert({ message_id: messageId, user_id: userId, emoji });
  if (error) {
    if (error.code === "23505") return setReaction(messageId, userId, emoji, true);
    console.error("[chat] Could not react:", error.message);
    if (/ATX35/.test(error.code ?? "")) return { ok: false, message: "You can't react in this conversation." };
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't add that reaction. Try again." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Reads for the list, the starred screen and the gallery
// ---------------------------------------------------------------------------

/**
 * What the list needs about each chat's latest message beyond my_conversations:
 * its read time (for the tick on "You: …") and whether it was unsent, so the
 * preview says "This message was deleted" rather than an empty "Message".
 */
export async function fetchLastMessageState(
  messageIds: string[]
): Promise<{ readAt: Record<string, string | null>; deleted: Set<string>; delivered: Set<string> }> {
  const out = { readAt: {} as Record<string, string | null>, deleted: new Set<string>(), delivered: new Set<string>() };
  if (messageIds.length === 0) return out;
  const { data, error } = await supabase
    .from("messages_visible")
    .select("id, read_at, deleted_at, delivered_at")
    .in("id", messageIds);
  if (error) return out;
  for (const r of data ?? []) {
    if (!r.id) continue;
    out.readAt[r.id] = r.read_at;
    if (r.deleted_at) out.deleted.add(r.id);
    if (r.delivered_at) out.delivered.add(r.id);
  }
  return out;
}

export interface StarredMessage {
  id: string;
  threadId: string;
  senderId: string | null;
  text: string | null;
  createdAt: string;
  attachmentPath: string | null;
  voiceNoteSeconds: number | null;
  attachmentKind: "image" | "voice" | "file" | null;
  attachmentName: string | null;
  starredAt: string;
}

/** Every message the caller starred, newest star first. */
export async function fetchStarredMessages(): Promise<StarredMessage[] | null> {
  const stars = await supabase.from("message_stars").select("message_id, created_at").order("created_at", { ascending: false });
  if (stars.error) return null;
  const ids = (stars.data ?? []).map((s) => s.message_id);
  if (ids.length === 0) return [];
  const msgs = await supabase
    .from("messages_visible")
    .select("id, thread_id, sender_id, text, created_at, attachment_url, voice_note_seconds, attachment_kind, attachment_name")
    .in("id", ids);
  if (msgs.error) return null;
  const byId = new Map((msgs.data ?? []).map((m) => [m.id, m]));
  return (stars.data ?? [])
    .map((s) => {
      const m = byId.get(s.message_id);
      // A starred message hidden with "delete for me" is not returned by the
      // view, so it drops out here too.
      if (!m?.id || !m.thread_id || !m.created_at) return null;
      return {
        id: m.id,
        threadId: m.thread_id,
        senderId: m.sender_id,
        text: m.text,
        createdAt: m.created_at,
        attachmentPath: m.attachment_url,
        voiceNoteSeconds: m.voice_note_seconds,
        attachmentKind: m.attachment_kind,
        attachmentName: m.attachment_name,
        starredAt: s.created_at,
      };
    })
    .filter((m): m is StarredMessage => m !== null);
}

export type GalleryKind = "media" | "files" | "voice";

export interface GalleryItem {
  id: string;
  path: string;
  createdAt: string;
  voiceNoteSeconds: number | null;
  name: string | null;
  bytes: number | null;
  mime: string | null;
  width: number | null;
  height: number | null;
  waveform: number[] | null;
}

const KIND: Record<GalleryKind, "image" | "file" | "voice"> = { media: "image", files: "file", voice: "voice" };

const GALLERY_PAGE = 30;

/**
 * One chat's photos, files or voice notes, newest first, a page at a time
 * (Database 20261002100000, gallery_attachments). The database leaves out what
 * the reader hid, unsent and redacted messages, and files already purged from
 * storage, so every tile can actually be opened. Pass the last item back as
 * `after` for the next page.
 */
export async function fetchGallery(
  threadId: string,
  kind: GalleryKind,
  after?: GalleryItem
): Promise<{ items: GalleryItem[]; hasMore: boolean } | null> {
  const { data, error } = await supabase.rpc("gallery_attachments", {
    p_thread_id: threadId,
    p_kind: KIND[kind],
    p_before: after?.createdAt,
    p_before_id: after?.id,
    p_limit: GALLERY_PAGE,
  });
  if (error) {
    console.error("[chat] Could not load the gallery:", error.message);
    return null;
  }
  const items = (data ?? []).map((r) => ({
    id: r.message_id,
    path: r.attachment_url,
    createdAt: r.created_at,
    voiceNoteSeconds: r.voice_note_seconds,
    name: r.attachment_name,
    bytes: r.attachment_bytes,
    mime: r.attachment_mime,
    width: r.image_width,
    height: r.image_height,
    waveform: r.voice_waveform,
  }));
  return { items, hasMore: items.length === GALLERY_PAGE };
}

/**
 * Marks messages that reached this device as delivered (Database 20261002020000).
 *
 * The database stamps its own time and keeps the first one; it stores nothing
 * where either person turned read receipts off. Because those rows stay empty
 * for ever, only messages newer than this device's last pass are asked about,
 * so each is attempted about once rather than rewritten on every refresh (a
 * rewrite would also fire a realtime update at the other person each time).
 */
export async function markDelivered(userId: string): Promise<void> {
  const key = `centium-state:u:${userId}:deliveredSince`;
  let since: string;
  try {
    since = localStorage.getItem(key) ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
  } catch {
    since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  }
  const startedAt = new Date().toISOString();
  // Not rows already read: the database keeps delivered no later than read
  // (messages_delivered_before_read_check), so stamping "now" on one would
  // fail the whole batch. A read message has no use for a delivered time.
  const { error } = await supabase
    .from("messages")
    .update({ delivered_at: startedAt })
    .is("delivered_at", null)
    .is("read_at", null)
    .neq("sender_id", userId)
    .gt("created_at", since);
  if (error) {
    console.error("[chat] Could not mark delivered:", error.message);
    return;
  }
  try {
    localStorage.setItem(key, startedAt);
  } catch {
    /* next pass re-asks the last week, which is harmless */
  }
}

// ---------------------------------------------------------------------------
// Search (Database 20261002070000)
// ---------------------------------------------------------------------------

export interface SearchHit {
  messageId: string;
  threadId: string;
  senderId: string | null;
  text: string | null;
  createdAt: string;
  attachmentName: string | null;
  /** Which field matched: the message text, or a document's file name. */
  matchedIn: "text" | "attachment_name";
}

export type SearchResult = { ok: true; hits: SearchHit[]; hasMore: boolean } | Fail;

/** A search outside one chat needs at least this many characters. */
export const MIN_GLOBAL_QUERY = 2;
const PAGE = 30;

/**
 * Searches the caller's own messages, newest first: every chat, or one chat
 * when threadId is given. The database applies the same visibility as the
 * conversation itself (hidden, unsent and redacted messages never match), so
 * nothing is filtered again here. Pass the last hit back as `after` for more.
 */
export async function searchMessages(
  query: string,
  opts: { threadId?: string; after?: SearchHit } = {}
): Promise<SearchResult> {
  const { data, error } = await supabase.rpc("search_messages", {
    p_query: query,
    p_thread_id: opts.threadId,
    p_before: opts.after?.createdAt,
    p_before_id: opts.after?.messageId,
    p_limit: PAGE,
  });
  if (error) {
    console.error("[chat] Search failed:", error.message);
    return {
      ok: false,
      message: isOffline(error)
        ? OFFLINE_MESSAGE
        : error.code === "22023"
          ? `Type at least ${MIN_GLOBAL_QUERY} characters to search all chats.`
          : "Couldn't search right now. Try again.",
    };
  }
  const hits = (data ?? []).map((r) => ({
    messageId: r.message_id,
    threadId: r.thread_id,
    senderId: r.sender_id,
    text: r.text,
    createdAt: r.created_at,
    attachmentName: r.attachment_name,
    matchedIn: r.matched_in === "attachment_name" ? ("attachment_name" as const) : ("text" as const),
  }));
  return { ok: true, hits, hasMore: hits.length === PAGE };
}

// ---------------------------------------------------------------------------
// "Show when I'm online" (Database 20261002110000, profiles.shares_presence)
// ---------------------------------------------------------------------------

/** Whether the caller shares their online status. Off by default; null if unreadable. */
export async function fetchSharesPresence(userId: string): Promise<boolean | null> {
  const { data, error } = await supabase.from("profiles").select("shares_presence").eq("id", userId).maybeSingle();
  if (error) {
    console.error("[chat] Could not read the online setting:", error.message);
    return null;
  }
  return data?.shares_presence ?? false;
}

/**
 * Turns sharing your online status on or off, for every chat at once. Mutual:
 * it only shows anything where the other person has it on too.
 */
export async function setSharesPresence(userId: string, on: boolean): Promise<{ ok: true } | Fail> {
  const { error } = await supabase.from("profiles").update({ shares_presence: on }).eq("id", userId);
  if (error) {
    console.error("[chat] Could not save the online setting:", error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't save that. Try again." };
  }
  return { ok: true };
}
