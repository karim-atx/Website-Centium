import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { uploadPrivateFile, validateFileFor } from "../storage";
import type { PostgrestError } from "@supabase/supabase-js";

// Two-party messaging, against the real tables.
//
// REPLACES A LOCALSTORAGE MOCK THAT NEVER LEFT THE BROWSER. `professionalMessages`
// was `usePersistentState`, keyed by client id with a `from: "professional" |
// "client"` discriminator and no thread concept at all. Nothing here is a
// rewiring of that shape — the database models a thread between two profile
// ids, which is symmetric, and the mock's model could not express a
// conversation with someone who is not on a roster.
//
// EVERYTHING IS SCOPED BY RLS RATHER THAN BY FILTER. `messages_select_participant`
// and `message_threads_select_participant` restrict every read to threads the
// caller is in, so none of the queries below carry a `.eq("participant…")`
// guard. Adding one would look safer and would be the kind of belt-and-braces
// that quietly diverges from the policy it duplicates.
//
// NO DELETE, ANYWHERE. The schema grants none — a sent message is as permanent
// as the thread carrying it, matching `messages` having no DELETE policy. There
// is deliberately no unsend here to imply otherwise.

/**
 * What a conversation IS, as the database classifies it.
 *
 * "peer" is every thread anyone opened by messaging someone: the default, the
 * shape the whole feature was built around, and what every existing thread
 * still is. "official_support" is a thread Centium started with the user
 * through the admin console, where the other side is an official identity
 * rather than a person the user chose to talk to.
 *
 * WHY THE CLIENT IS TOLD AT ALL. The recipient did not ask for the official
 * thread and did not pick who is in it. Arriving as an unexplained stranger
 * who happens to be called "Centium Support" is exactly the shape of a
 * phishing message, so the app has to be able to say which threads it
 * genuinely opened itself. The view projects the column for this reason; see
 * its comment in Database 20260915210000.
 */
export type ThreadKind = "peer" | "official_support";

export interface MessageThread {
  id: string;
  /**
   * The OTHER participant. `thread_participant_summary` never returns the
   * caller.
   *
   * GENUINELY NULLABLE SINCE Database migration 20260911200000, which changed
   * the view's INNER JOIN to a LEFT JOIN. Before that a thread with no
   * resolvable counterpart simply vanished from the view, so this could be
   * asserted; now the row comes back with a null identity instead.
   *
   * NOTHING HERE INTERPRETS THE NULL. Deciding what it means — and what to
   * render for it — is deferred to a Database-side signal rather than guessed
   * at in the client. The type is corrected so the null cannot be laundered
   * into a `string` by an assertion; that is all.
   */
  participantId: string | null;
  participantName: string;
  participantAvatarUrl: string | null;
  /**
   * Peer unless the database says otherwise, and deliberately narrowed rather
   * than passed through.
   *
   * The view widens every column to nullable, and the enum can gain values
   * this build has never heard of. Both fall to "peer", so an unrecognised
   * thread renders exactly as every thread renders today rather than as a
   * half-applied official treatment — the failure mode of a wrong guess here
   * is claiming something is official when it is not.
   */
  kind: ThreadKind;
  /**
   * One line describing the newest message, for the list.
   *
   * NULL MEANS THE THREAD IS GENUINELY EMPTY, and nothing else. This used to
   * be the raw `text` column, which was fine until a message could carry an
   * attachment instead: an image-only message has `text: null`, so the list
   * rendered "No messages yet" over a conversation with five messages in it —
   * an absence stated as a fact about a thread that had content. Describing
   * the message here rather than in the component keeps that decision next to
   * the row shape it depends on.
   */
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  /** The latest message's id and sender, for the list's "You:" and its tick. */
  lastMessageId: string | null;
  lastMessageSenderId: string | null;
  /** Received and not yet read, from the caller's private read mark. */
  unreadCount: number;
  /** When the caller last read this thread, or null if never. */
  lastReadAt: string | null;
}

export interface Message {
  id: string;
  threadId: string;
  /**
   * Who sent it, or null once they have deleted their account.
   *
   * NULLABLE BECAUSE account_deletion SET NULLs IT, deliberately: a thread
   * survives one participant leaving, and the departed side's messages stay so
   * the survivor keeps their whole conversation rather than half of it.
   *
   * SAFE TO COMPARE, NEVER TO DEREFERENCE. Every reader asks only
   * `senderId === authUserId`, and null is never equal to a signed-in user's
   * id — so a departed sender's message falls to the "not mine" side and
   * renders as received, which is exactly what it is.
   */
  senderId: string | null;
  text: string | null;
  createdAt: string;
  readAt: string | null;
  /** Object path in `message-attachments`, not a URL. Null on a text message. */
  attachmentPath: string | null;
  /**
   * Set when the uploader's account was purged: the file is gone and
   * `attachmentPath` is null, but the message row survives because it belongs
   * to the conversation rather than solely to the departed user.
   *
   * A POSITIVE SIGNAL, not an inference. Both columns being null could equally
   * mean "never had an attachment"; this says one existed and was deliberately
   * removed, which is the difference between rendering "Attachment removed"
   * and rendering nothing at all.
   */
  attachmentPurgedAt: string | null;
  /**
   * Set when an admin removed this message's content through
   * `admin_redact_message`.
   *
   * IT DOES NOT MEAN THE TEXT IS GONE, and that is the trap worth naming. The
   * function takes `clear_text` and `clear_attachment` as INDEPENDENT booleans
   * and stamps `redacted_at = now()` whichever ran — an attachment-only
   * redaction leaves the text intact and still sets this. So it says "a
   * moderator acted here", not "this message is empty", and anything rendering
   * a removal notice has to check what is actually absent rather than trust
   * this flag alone.
   *
   * Distinct from `attachmentPurgedAt`, which means the SENDER's account was
   * deleted and their file swept. The difference is what a dispute about a
   * takedown turns on, which is why the schema keeps two columns.
   */
  redactedAt: string | null;
  /**
   * Duration in whole seconds when this message is a voice note.
   *
   * Present TOGETHER with `attachmentPath`, never alone — that pairing is what
   * distinguishes a voice note from a photo, since both occupy the same
   * column. Nullable because the column is, and because a row could predate
   * this feature; the player says "Voice note" rather than printing 0:00 when
   * it is missing.
   */
  voiceNoteSeconds: number | null;
  /**
   * The message this one replies to, in the same thread. Null on an ordinary
   * message.
   *
   * AN ID, NOT A COPY OF THE QUOTED TEXT. The preview is rendered by finding
   * the parent among the messages already loaded, so a parent whose attachment
   * is later purged stops quoting a file that no longer exists — where an
   * inlined copy would keep showing it forever. The trade is that a reply to
   * something outside the loaded window has nothing to render, which the UI
   * states plainly rather than papering over.
   */
  replyToId: string | null;
  /**
   * True when this message was passed along rather than written.
   *
   * PROVENANCE, NOT PLUMBING. Mechanically a forward is an ordinary message;
   * this exists so the recipient knows the words are second-hand. That matters
   * more here than in a general chat app — advice about a dose or a symptom
   * reads differently depending on whether the person you hired wrote it or
   * relayed it, and without this the two are indistinguishable.
   *
   * IT CARRIES NO LINK TO THE ORIGINAL, deliberately. A pointer would name a
   * message in a thread the recipient is not in, which they could not read and
   * should not learn the existence of.
   */
  forwarded: boolean;
  /**
   * When the recipient's device received it (Database 20261002020000). Stored
   * only when both people allow read receipts, exactly like readAt; the
   * recipient always sees their own.
   */
  deliveredAt: string | null;
  /**
   * Everything a client needs about an attachment before it has the bytes
   * (Database 20261002030000-040000). The kind is derived by the database from
   * the file type, so it cannot disagree with the file. Name, size and type
   * are what the sender's device reported; pixel size lets a photo be laid out
   * before it loads; the waveform was measured when the note was recorded. All
   * null on a message without an attachment, and on older attachments whose
   * details were never recorded.
   */
  attachmentKind: "image" | "voice" | "file" | null;
  attachmentName: string | null;
  attachmentBytes: number | null;
  attachmentMime: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  voiceWaveform: number[] | null;
  /**
   * EDIT AND UNSEND (Database 20261002060000). The sender may change the text
   * or unsend within fifteen minutes of sending; the database owns the window
   * (ATX40) and keeps the original for moderators only. An unsent message has
   * no content left on the row, and both people see "This message was deleted".
   */
  editedAt: string | null;
  deletedAt: string | null;
}

/** How long after sending a message can be edited or unsent. Enforced server-side. */
export const EDIT_WINDOW_MS = 15 * 60_000;

/** Milliseconds left to edit or unsend, or 0. The server's check is the rule. */
export function editTimeLeft(m: Pick<Message, "createdAt" | "deletedAt">, now = Date.now()): number {
  if (m.deletedAt) return 0;
  return Math.max(0, new Date(m.createdAt).getTime() + EDIT_WINDOW_MS - now);
}

/**
 * One line describing a message, for anywhere it appears as a reference
 * rather than in full.
 *
 * ONE FUNCTION SO THE THREAD LIST AND THE QUOTED PREVIEW CANNOT DISAGREE.
 * These are the same question asked twice — "what is this message, in a few
 * words" — and two implementations would drift the moment a content type is
 * added. Voice note is tested before photo because both carry attachmentPath
 * and only the duration distinguishes them.
 */
export function describeMessage(m: {
  text: string | null;
  attachmentPath: string | null;
  attachmentPurgedAt: string | null;
  redactedAt: string | null;
  voiceNoteSeconds: number | null;
  /** When known, a document reads as its name rather than as a photo. */
  attachmentKind?: "image" | "voice" | "file" | null;
  attachmentName?: string | null;
  deletedAt?: string | null;
}): string {
  return (
    m.text?.trim() ||
    (m.attachmentPath && m.voiceNoteSeconds ? "Voice note" : "") ||
    (m.attachmentPath && m.attachmentKind === "file" ? m.attachmentName || "File" : "") ||
    (m.attachmentPath ? "Photo" : "") ||
    describeRemoval(m) ||
    "Message"
  );
}

/**
 * What was taken off this message, as one sentence, or null when nothing was.
 *
 * DERIVED FROM WHAT IS ABSENT, NEVER FROM THE FLAG ALONE. `redactedAt` is
 * stamped whenever an admin acted, including an attachment-only redaction that
 * leaves the text in place — so keying "Message removed" off the flag would
 * accuse a still-readable message of being gone. The test is redacted AND no
 * text left.
 *
 * ONE LINE FOR THE COMBINED CASE. Both can be true at once: an admin clearing
 * text and attachment together, or clearing text on a message whose sender was
 * later purged. Two stacked notices would read as two separate events rather
 * than one, so they collapse into a single sentence.
 *
 * SHARED WITH ThreadView on purpose, for the reason describeMessage's own
 * comment already gives about itself: two implementations of the same sentence
 * drift the moment a case is added, and the list preview and the bubble must
 * not disagree about whether a message still exists.
 */
export function describeRemoval(m: {
  text: string | null;
  attachmentPurgedAt: string | null;
  redactedAt: string | null;
  /** Unsent by its sender: nothing else about it matters any more. */
  deletedAt?: string | null;
}): string | null {
  if (m.deletedAt) return "This message was deleted";
  const textRemoved = m.redactedAt !== null && !m.text?.trim();
  const attachmentRemoved = m.attachmentPurgedAt !== null;

  if (textRemoved && attachmentRemoved) return "Message and attachment removed";
  if (textRemoved) return "Message removed";
  if (attachmentRemoved) return "Attachment removed";
  return null;
}

export type ThreadsResult =
  | { ok: true; threads: MessageThread[] }
  | { ok: false; message: string };
export type MessagesResult = { ok: true; messages: Message[] } | { ok: false; message: string };
export type SendResult = { ok: true; message: Message } | { ok: false; message: string };
export type StartThreadResult = { ok: true; threadId: string } | { ok: false; message: string };

function describe(error: PostgrestError): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  const code = error.code ?? "";
  if (code === "PGRST301" || /jwt|not authenticated/i.test(error.message ?? "")) {
    return "Your session expired. Sign in again to send messages.";
  }
  if (code === "42501") return "You can't post to that conversation.";
  // ATX05: messages_require_relationship_for_attachments. One of the two doors
  // the same rule is enforced at — the other is the Storage policy, which
  // cannot raise a SQLSTATE and is handled in services/storage. Reaching this
  // means the composer offered an attach button it should not have, so the
  // wording explains the rule rather than blaming the file.
  if (code === "ATX05") {
    return "You can only send files to someone you're actively working with.";
  }
  // ATX06: messages_validate_reply_target. The composer only ever offers a
  // message from the open thread as a reply target, so reaching this means the
  // client and the trigger disagree about which thread it is in — worth its
  // own sentence rather than a generic failure, because retrying will not fix
  // it.
  if (code === "ATX06") {
    return "That message isn't part of this conversation any more.";
  }
  // 23514 is messages_has_content_check — an empty message. The composer
  // refuses those first, so reaching this means the two disagree.
  if (code === "23514") return "A message can't be empty.";
  return describeRefusal(error) ?? "Something went wrong. Try again.";
}

/**
 * The phase-1 safety refusals, in words (Database 20261001020000-030000).
 *
 * ATX35 IS THE SAME SENTENCE WHOEVER BLOCKED WHOM. The database raises one
 * code for both directions on purpose — naming the block would tell someone
 * their target is there and reacting — so the app does not name it either.
 */
export function describeRefusal(error: { code?: string; message?: string }): string | null {
  switch (error.code ?? "") {
    case "ATX35":
      return "You can't message this person.";
    case "ATX36":
      return /under 18/i.test(error.message ?? "")
        ? "Accounts under 18 can only message professionals they already work with."
        : "You can't start a conversation with this account. You can message professionals listed in Explore, or the people you already work with.";
    case "ATX02":
      return "You're sending messages too quickly. Wait a minute and try again.";
    case "ATX37":
      return "That name is reserved. Choose a different name.";
    default:
      return null;
  }
}

/**
 * Opens the conversation with someone, creating it only if needed.
 *
 * The RPC is idempotent and race-safe: it normalises the participant pair with
 * least/greatest, returns an existing thread when one is found, and catches the
 * unique violation to re-read when two people open the same conversation at
 * once. So this is safe to call on every "message them" tap — there is no
 * "does a thread already exist" question for a caller to get wrong.
 *
 * IT REQUIRES NO RELATIONSHIP, deliberately. The RPC checks only that the
 * recipient exists, so a client can ask a professional a question before
 * hiring them. `thread_participant_summary` is what makes the receiving side
 * of that usable — without it a cold enquiry arrives from someone whose name
 * cannot be resolved.
 */
export async function startThread(otherUserId: string): Promise<StartThreadResult> {
  const { data, error } = await supabase.rpc("start_message_thread", {
    p_other_user_id: otherUserId,
  });
  if (error) {
    console.error("[messaging] Could not start thread:", error.message);
    // Starting a conversation has its own, hourly allowance (ten an hour),
    // separate from the per-minute limit on sending.
    if (error.code === "ATX02") {
      return {
        ok: false,
        message: "You've started several new conversations recently. Try again in a little while.",
      };
    }
    return { ok: false, message: describe(error) };
  }
  const thread = data as { id?: string } | null;
  if (!thread?.id) return { ok: false, message: "Could not open that conversation." };
  return { ok: true, threadId: thread.id };
}

/**
 * Every conversation the caller is in, newest activity first.
 *
 * ONE CALL, my_conversations() (Database 20261001000000). It returns each
 * thread's LATEST message and the caller's unread count directly. This used to
 * fetch the newest 500 messages across all threads and reduce them here, so a
 * thread whose last message fell outside that window lost its preview and
 * dropped to the bottom of the list.
 *
 * THE UNREAD COUNT IS THE READER'S OWN, from thread_read_marks, not from
 * messages.read_at: read_at is withheld in threads where either person turned
 * read receipts off, so counting its nulls would leave those threads unread for
 * ever.
 */
export async function fetchThreads(): Promise<ThreadsResult> {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) {
    console.error("[messaging] Could not load conversations:", error.message);
    return { ok: false, message: describe(error) };
  }

  const threads: MessageThread[] = (data ?? []).map((r) => ({
    id: r.thread_id,
    // A null id means no profiles row exists, which is a deleted account (the
    // function LEFT JOINs profiles). A present id with no first name is a real
    // person who has not named themselves yet.
    participantId: r.other_participant_id,
    participantName:
      r.other_participant_id === null ? "Deleted account" : r.other_first_name?.trim() || "Someone",
    participantAvatarUrl: r.other_avatar_url,
    // Compared, not cast: only the exact string earns the official treatment.
    kind: r.kind === "official_support" ? "official_support" : "peer",
    // Through the shared describer, so the list and a quoted preview always
    // say the same thing about the same message. The function returns no text
    // for a redacted message, and only whether there was an attachment.
    lastMessagePreview: r.last_message_id
      ? describeMessage({
          text: r.last_message_text,
          attachmentPath: r.last_message_has_attachment ? "attachment" : null,
          attachmentPurgedAt: null,
          redactedAt: r.last_message_redacted ? "redacted" : null,
          voiceNoteSeconds: r.last_message_is_voice_note ? 1 : null,
        })
      : null,
    lastMessageAt: r.last_message_at,
    lastMessageId: r.last_message_id,
    lastMessageSenderId: r.last_message_sender_id,
    unreadCount: Number(r.unread_count ?? 0),
    lastReadAt: r.last_read_at,
  }));
  return { ok: true, threads };
}

const MESSAGE_COLUMNS =
  "id, thread_id, sender_id, text, created_at, read_at, delivered_at, attachment_url, attachment_purged_at, redacted_at, voice_note_seconds, reply_to_id, forwarded, attachment_kind, attachment_name, attachment_bytes, attachment_mime, image_width, image_height, voice_waveform, edited_at, deleted_at";

type MessageRow = {
  id: string | null;
  thread_id: string | null;
  sender_id: string | null;
  text: string | null;
  created_at: string | null;
  read_at: string | null;
  attachment_url: string | null;
  attachment_purged_at: string | null;
  redacted_at: string | null;
  voice_note_seconds: number | null;
  reply_to_id: string | null;
  forwarded: boolean | null;
  delivered_at?: string | null;
  attachment_kind?: "image" | "voice" | "file" | null;
  attachment_name?: string | null;
  attachment_bytes?: number | null;
  attachment_mime?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  voice_waveform?: number[] | null;
  edited_at?: string | null;
  deleted_at?: string | null;
};

// READ THROUGH messages_visible, so a message this viewer hid is simply
// absent. The other participant is unaffected -- the view filters on
// auth.uid(), and the row itself is untouched.
//
// EVERY COLUMN OF A VIEW IS TYPED NULLABLE, because Postgres cannot promise
// a view's output is NOT NULL even when its source column is. The asserted
// ones below are NOT NULL on public.messages and cannot arrive null; the
// same widening is why thread_participant_summary needs `!` on thread_id.
//
// sender_id IS KEPT WHEN NULL, AND USED TO BE DROPPED. The filter here read
// `.filter((m) => !!m.sender_id)`, on the reasoning that a row without a
// sender would make the "is this mine" comparison match on a null. It does
// not: `null === authUserId` is false for any signed-in user, so such a row
// simply renders as received, which is correct.
//
// What the filter actually did was delete the departed participant's half
// of the conversation from the survivor's screen. account_deletion SET
// NULLs sender_id precisely so those messages survive, and
// 20260911200000 then made the thread reachable again — and this line threw
// the contents away after both. Verified against a real local deletion: the
// view returned two messages, and the client rendered none.
//
// A PURGED ROW IS KEPT for a different reason — sender_id survives an
// attachment purge, only the content columns are cleared — and it must be,
// since dropping it would shorten a conversation rather than showing that
// something was there and is gone. Same principle, two causes.
const toMessage = (m: MessageRow): Message => ({
  id: m.id!,
  threadId: m.thread_id!,
  senderId: m.sender_id,
  text: m.text,
  createdAt: m.created_at!,
  readAt: m.read_at,
  attachmentPath: m.attachment_url,
  attachmentPurgedAt: m.attachment_purged_at,
  redactedAt: m.redacted_at,
  voiceNoteSeconds: m.voice_note_seconds,
  replyToId: m.reply_to_id,
  forwarded: m.forwarded ?? false,
  deliveredAt: m.delivered_at ?? null,
  attachmentKind: m.attachment_kind ?? null,
  attachmentName: m.attachment_name ?? null,
  attachmentBytes: m.attachment_bytes ?? null,
  attachmentMime: m.attachment_mime ?? null,
  imageWidth: m.image_width ?? null,
  imageHeight: m.image_height ?? null,
  voiceWaveform: m.voice_waveform ?? null,
  editedAt: m.edited_at ?? null,
  deletedAt: m.deleted_at ?? null,
});

/** Messages per page. A thread opens on its newest page; scrolling up loads the next. */
export const MESSAGE_PAGE = 40;

export type MessagePage =
  | { ok: true; messages: Message[]; hasOlder: boolean }
  | { ok: false; message: string };

/**
 * One page of a thread, oldest-first for reading: the newest page when
 * `before` is omitted, otherwise the page just older than `before`.
 *
 * KEYSET, NOT OFFSET. An offset shifts every time a message arrives, so the
 * second page would repeat or skip messages in a live conversation. The key is
 * (created_at, id): two messages can share a timestamp, and the id breaks the
 * tie so none is skipped or repeated at a page boundary.
 *
 * One extra row is asked for, to know whether an older page exists without a
 * second query.
 */
export async function fetchMessagePage(
  threadId: string,
  before?: { createdAt: string; id: string },
  limit = MESSAGE_PAGE
): Promise<MessagePage> {
  let q = supabase
    .from("messages_visible")
    .select(MESSAGE_COLUMNS)
    .eq("thread_id", threadId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(limit + 1);
  if (before) {
    // Quoted: a timestamp carries ':' and '+', which PostgREST's or() grammar
    // would otherwise read as syntax.
    q = q.or(`created_at.lt."${before.createdAt}",and(created_at.eq."${before.createdAt}",id.lt.${before.id})`);
  }
  const { data, error } = await q;
  if (error) {
    console.error("[messaging] Could not load messages:", error.message);
    return { ok: false, message: describe(error) };
  }
  const rows = (data ?? []) as MessageRow[];
  return {
    ok: true,
    hasOlder: rows.length > limit,
    messages: rows.slice(0, limit).reverse().map(toMessage),
  };
}

/**
 * Whether this thread's participants may exchange files.
 *
 * CALLS THE SERVER'S OWN FUNCTION rather than re-deriving the rule. The
 * migration deliberately routes both enforcement points —
 * `messages_require_relationship_for_attachments` and the Storage insert
 * policy — through `thread_allows_attachments()` so they cannot drift apart.
 * A client that reimplemented the check would be a third copy, and it would
 * already be wrong: the rule also admits `business_employees`, so an
 * `active_professional_clients`-only check would hide the attach button on a
 * legitimate employment thread the server would happily accept.
 *
 * FAILS CLOSED. An error means "no button", never "assume yes" — the server
 * refuses either way, and offering an affordance that is about to be rejected
 * is worse than not offering it.
 */
export async function threadAllowsAttachments(threadId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("thread_allows_attachments", {
    p_thread_id: threadId,
  });
  if (error) {
    console.error("[messaging] Could not check attachment eligibility:", error.message);
    return false;
  }
  return data === true;
}

/**
 * Sends one message and returns the row the database actually stored.
 *
 * RETURNS THE ROW RATHER THAN ECHOING THE DRAFT, so the id and timestamp come
 * from Postgres. A caller appending its own optimistic object would invent an
 * id, and the next poll would then either duplicate the message or have no way
 * to recognise it — which is the dual-id-space problem the food diary spent
 * this whole project removing.
 *
 * `sender_id` is sent because the insert grant is column-scoped and requires
 * it; `messages_insert_by_sender` is what checks it against auth.uid(), so a
 * client cannot post as someone else by changing this argument.
 */
export async function sendMessage(
  threadId: string,
  senderId: string,
  text: string,
  /**
   * The message being replied to, when this is a reply.
   *
   * NOT VALIDATED HERE. `messages_validate_reply_target` checks it belongs to
   * the same thread and raises ATX06 otherwise; repeating that client-side
   * would be a second copy of a rule that already has one authority, and the
   * copy is what goes stale. The composer only offers targets from the open
   * thread, so this is a defence against a bug rather than a user.
   */
  replyToId?: string | null
): Promise<SendResult> {
  const body = text.trim();
  if (!body) return { ok: false, message: "A message can't be empty." };

  return insertMessage({
    thread_id: threadId,
    sender_id: senderId,
    text: body,
    reply_to_id: replyToId ?? null,
  });
}

/** The one place a message row is written, so every path returns the same shape. */
async function insertMessage(row: {
  thread_id: string;
  sender_id: string;
  text?: string | null;
  attachment_url?: string | null;
  voice_note_seconds?: number | null;
  reply_to_id?: string | null;
  forwarded?: boolean;
} & AttachmentMeta): Promise<SendResult> {
  const { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select(MESSAGE_COLUMNS)
    .single();

  if (error) {
    console.error("[messaging] Could not send:", error.message);
    return { ok: false, message: describe(error) };
  }
  return { ok: true, message: toMessage(data as MessageRow) };
}

/**
 * What the sender can tell the database about an attachment before anyone
 * loads it (Database 20261002030000): its name, size and type, and for a photo
 * its pixel size, so it can be laid out before the bytes arrive. The kind is
 * derived server-side from the type and is never sent.
 */
type AttachmentMeta = {
  attachment_name?: string | null;
  attachment_bytes?: number | null;
  attachment_mime?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  voice_waveform?: number[] | null;
};

async function attachmentMeta(file: File): Promise<AttachmentMeta> {
  const name = file.name?.trim().slice(0, 300) || null;
  const meta: AttachmentMeta = {
    attachment_name: name,
    attachment_bytes: file.size > 0 ? file.size : null,
    attachment_mime: file.type || null,
  };
  if (file.type.startsWith("image/") && typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      meta.image_width = bitmap.width;
      meta.image_height = bitmap.height;
      bitmap.close();
    } catch {
      /* no dimensions: the photo is laid out once it loads, as before */
    }
  }
  return meta;
}

/** A photo or a document (PDF, Office, text): the same upload, the same row. */
export async function sendFileAttachment(threadId: string, senderId: string, file: File): Promise<SendResult> {
  return sendImageAttachment(threadId, senderId, file);
}

/**
 * Uploads an image and sends it as a message.
 *
 * TWO WRITES, AND THE ORDER IS FORCED. The object has to exist before a row
 * can point at it, and there is no way round that: the client UPDATE grant on
 * `messages` is `read_at` alone, so a row cannot be created first and pointed
 * at the file afterwards.
 *
 * WHICH MEANS A FAILED INSERT ORPHANS THE OBJECT, PERMANENTLY. Every other
 * upload path in this app compensates by deleting the object when the row
 * write fails; `message-attachments` has no DELETE policy, so that is
 * impossible here and `deletePrivateFile` will not even accept the bucket.
 * The orphan is unreferenced and readable only by people already in the
 * thread, which is why it is accepted rather than solved — but it is logged,
 * and the caller is told the send failed. Reporting success because the upload
 * half worked would be the one genuinely bad option: nothing would be on
 * screen and nothing would be retried.
 *
 * BOTH REFUSAL SHAPES END UP HERE. The Storage policy and the messages trigger
 * enforce the same rule at two doors, and only one of them can raise a
 * SQLSTATE. `uploadPrivateFile` classifies its own failure as `refused`;
 * `describe()` maps ATX05 on the insert. Neither is allowed to surface as
 * "check your connection".
 */
export async function sendImageAttachment(
  threadId: string,
  senderId: string,
  file: File
): Promise<SendResult> {
  const check = validateFileFor("message-attachments", file);
  if (!check.ok) return { ok: false, message: check.message ?? "That file can't be sent." };
  // Read before the upload strips metadata, from the file the person chose.
  const meta = await attachmentMeta(file);

  // EXIF stripping happens inside this call, not here — see 6a. An image sent
  // to someone carries the same GPS coordinates as one filed as a medical
  // record, and the reasoning for removing them does not weaken because the
  // recipient is a person rather than a bucket.
  const upload = await uploadPrivateFile({
    bucket: "message-attachments",
    userId: senderId,
    file,
    threadId,
  });
  if (!upload.ok || !upload.path) {
    if (upload.reason === "refused") {
      return {
        ok: false,
        message: "You can only send files to someone you're actively working with.",
      };
    }
    return { ok: false, message: upload.message ?? "That file couldn't be sent." };
  }

  const sent = await insertMessage({
    thread_id: threadId,
    sender_id: senderId,
    attachment_url: upload.path,
    ...meta,
  });
  if (!sent.ok) {
    // Named plainly so it is greppable if these ever need sweeping. See the
    // README follow-up; there is no cleanup call that would work here.
    //
    // IT UNDERCOUNTS, AND MUST NOT BE READ AS A TALLY. This fires only when the
    // insert RETURNS a failure. The likelier way an object is orphaned leaves no
    // line at all: a dropped connection, a closed tab, an aborted request — the
    // await never resolves, so nothing below it runs. Counting these logs
    // therefore measures the rarest cause and misses the common one.
    //
    // The relationship race this was first written for is close to impossible
    // now anyway: the Storage INSERT policy and the messages trigger both call
    // thread_allows_attachments(), one function rather than two equivalent
    // predicates, so passing at upload and failing at insert needs the
    // relationship revoked inside that window. Transport is what is left.
    console.error(
      `[messaging] ORPHANED OBJECT message-attachments/${upload.path} — upload succeeded, message insert did not.`
    );
  }
  return sent;
}

/**
 * Uploads a recording and sends it as a voice note.
 *
 * THE SAME SHAPE AS sendImageAttachment, DELIBERATELY, because it is the same
 * two writes with the same forced ordering and the same unreclaimable orphan
 * if the second one fails. Everything said there applies here; what differs is
 * one column.
 *
 * BOTH COLUMNS ARE SET TOGETHER. `attachment_url` alone would render as a
 * photo, and `voice_note_seconds` alone would be a duration pointing at
 * nothing — and would still satisfy messages_has_content_check, so the
 * database would accept a message that no surface can display. The pair is
 * what makes the row mean "voice note".
 *
 * The duration is the recorder's wall-clock count, clamped to at least one
 * second by the hook, which is what messages_voice_note_seconds_check requires.
 */
export async function sendVoiceNote(
  threadId: string,
  senderId: string,
  file: File,
  seconds: number,
  /** 0..100 levels drawn as the waveform; computed at record time, never by the server. */
  waveform?: number[] | null
): Promise<SendResult> {
  const check = validateFileFor("message-attachments", file);
  if (!check.ok) return { ok: false, message: check.message ?? "That recording can't be sent." };

  const upload = await uploadPrivateFile({
    bucket: "message-attachments",
    userId: senderId,
    file,
    threadId,
  });
  if (!upload.ok || !upload.path) {
    if (upload.reason === "refused") {
      return {
        ok: false,
        message: "You can only send voice notes to someone you're actively working with.",
      };
    }
    return { ok: false, message: upload.message ?? "That recording couldn't be sent." };
  }

  const sent = await insertMessage({
    thread_id: threadId,
    sender_id: senderId,
    attachment_url: upload.path,
    voice_note_seconds: Math.max(1, Math.round(seconds)),
    attachment_bytes: file.size > 0 ? file.size : null,
    attachment_mime: file.type || null,
    voice_waveform: waveform && waveform.length > 0 ? waveform.slice(0, 100) : null,
  });
  if (!sent.ok) {
    // Same undercount as the image path — see the note there. This line is not
    // a count of orphans, only of the orphans that reported themselves.
    console.error(
      `[messaging] ORPHANED OBJECT message-attachments/${upload.path} — upload succeeded, message insert did not.`
    );
  }
  return sent;
}

/**
 * Marks everything in one thread read for the caller.
 *
 * ONE CALL PER THREAD, mark_thread_read (Database 20261001000000). It advances
 * the caller's private read mark, which is what unread counts come from, and
 * stamps read receipts on the messages only when the thread allows them — so an
 * opted-out reader's badge still clears while the sender sees no read time.
 * This replaced one UPDATE per message id, which wrote read_at even where the
 * opt-out said it should not exist.
 *
 * Returns the server's read time, or null on failure.
 */
export async function markThreadRead(threadId: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("mark_thread_read", { p_thread_id: threadId });
  if (error) {
    console.error("[messaging] Could not mark read:", error.message);
    return null;
  }
  return (data as string | null) ?? null;
}

export interface UnreadCounts {
  /** Unread messages received, keyed by thread id. Threads with none are absent. */
  byThread: Record<string, number>;
  total: number;
}

/**
 * How many messages the caller has received and not read, per thread.
 *
 * FROM my_conversations(), the same call the list uses, so the badge and the
 * list can never disagree. It counts against the caller's own read mark rather
 * than read_at: read_at is withheld wherever read receipts are off, and counting
 * its nulls would leave those threads unread for ever.
 *
 * FAILS TO ZERO, NOT TO A GUESS: a badge disappears rather than freezing at a
 * stale number.
 */
export async function fetchUnreadCounts(): Promise<UnreadCounts> {
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) {
    console.error("[messaging] Could not count unread:", error.message);
    return { byThread: {}, total: 0 };
  }
  const byThread: Record<string, number> = {};
  let total = 0;
  for (const row of data ?? []) {
    const n = Number(row.unread_count ?? 0);
    if (n > 0) {
      byThread[row.thread_id] = n;
      total += n;
    }
  }
  return { byThread, total };
}

// ---------------------------------------------------------------------------
// Blocking and reporting (Database 20261001020000)
// ---------------------------------------------------------------------------

export interface BlockState {
  /** The caller blocked this person, and can undo it. */
  iBlocked: boolean;
  /** Either side blocked the other: nothing can be sent or called. */
  blocked: boolean;
}

/**
 * Whether a block stands between the caller and this person.
 *
 * TWO QUESTIONS, because the caller may only see their own blocks: whether
 * THEY blocked comes from their user_blocks rows, and whether anything blocks
 * the conversation comes from am_i_blocked_with(), which is direction-free but
 * can only be asked about a pair the caller is in (Database 20261001080000).
 * It replaced users_are_blocked(a, b), which let anyone ask about two OTHER
 * people. The difference is shown only as "you blocked them" versus "you
 * can't message this person" — the app never says the other side blocked the
 * caller.
 */
export async function fetchBlockState(me: string, other: string): Promise<BlockState> {
  const [mine, either] = await Promise.all([
    supabase.from("user_blocks").select("blocked_id").eq("blocker_id", me).eq("blocked_id", other).maybeSingle(),
    supabase.rpc("am_i_blocked_with", { p_other: other }),
  ]);
  const iBlocked = !mine.error && !!mine.data;
  const blocked = iBlocked || (!either.error && either.data === true);
  return { iBlocked, blocked };
}

export async function blockUser(me: string, other: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: me, blocked_id: other });
  // Already blocked is success: the state the person asked for is the state.
  if (error && error.code !== "23505") {
    console.error("[messaging] Could not block:", error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't block this person. Try again." };
  }
  return { ok: true };
}

export async function unblockUser(me: string, other: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", me).eq("blocked_id", other);
  if (error) {
    console.error("[messaging] Could not unblock:", error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't unblock this person. Try again." };
  }
  return { ok: true };
}

export type ReportReason = "harassment" | "spam" | "inappropriate_content" | "impersonation" | "safety_concern";

/** The database's report_reason enum, in the order and words the report sheet offers them. */
export const REPORT_REASONS: { value: ReportReason; label: string; hint: string }[] = [
  { value: "safety_concern", label: "Safety concern", hint: "Someone may be at risk of harm" },
  { value: "harassment", label: "Harassment", hint: "Bullying, threats or unwanted contact" },
  { value: "inappropriate_content", label: "Inappropriate content", hint: "Sexual, violent or offensive material" },
  { value: "impersonation", label: "Impersonation", hint: "Pretending to be someone else, or Centium" },
  { value: "spam", label: "Spam", hint: "Advertising, scams or repeated unwanted messages" },
];

/**
 * Reports one message to Centium's team.
 *
 * APPEND-ONLY: a report cannot be edited or withdrawn, and only an admin sets
 * its status. One per person per message, by unique index — a second report of
 * the same message is answered as already reported rather than as an error.
 */
export async function reportMessage(input: {
  reporterId: string;
  messageId: string;
  reportedId: string | null;
  reason: ReportReason;
  detail?: string;
}): Promise<{ ok: true } | { ok: false; message: string; already?: boolean }> {
  const detail = input.detail?.trim();
  const { error } = await supabase.from("message_reports").insert({
    reporter_id: input.reporterId,
    message_id: input.messageId,
    reported_id: input.reportedId,
    reason: input.reason,
    detail: detail ? detail.slice(0, 2000) : null,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, already: true, message: "You've already reported this message. Our team has it." };
    }
    console.error("[messaging] Could not report:", error.message);
    return { ok: false, message: isOffline(error) ? OFFLINE_MESSAGE : "Couldn't send your report. Try again." };
  }
  return { ok: true };
}

/**
 * Whether the caller may still open this attachment.
 *
 * The storage policy's own predicate (Database 20261001040000): a professional
 * whose engagement with a client has ended can no longer open what that client
 * sent. Asked only when signing a URL fails, to tell "no longer available" apart
 * from a network or file problem. Null when the question itself failed.
 */
export async function mayOpenAttachment(path: string): Promise<boolean | null> {
  const { data, error } = await supabase.rpc("may_open_message_attachment", { p_name: path });
  if (error) return null;
  return data === true;
}

/**
 * The conversation a message notification was about, from its push id.
 *
 * The notification carries only that id, never who wrote or what. The
 * recipient may read their own message_push_sends rows, and the message's
 * thread comes through messages_visible like any other read.
 */
export async function threadForPush(pushId: string): Promise<string | null> {
  const push = await supabase.from("message_push_sends").select("message_id").eq("id", pushId).maybeSingle();
  if (push.error || !push.data) return null;
  const msg = await supabase.from("messages_visible").select("thread_id").eq("id", push.data.message_id).maybeSingle();
  if (msg.error || !msg.data?.thread_id) return null;
  return msg.data.thread_id;
}

/**
 * Sends the text of one message into a different conversation.
 *
 * ROUTES THROUGH THE ORDINARY SEND PATH, which for text is all that is needed.
 * `messages_require_relationship_for_attachments` returns early when
 * attachment_url and voice_note_seconds are both null, so a text forward is
 * ungated — there is no guard here to inherit or to bypass, only the normal
 * insert. Attachments are a different matter and are deliberately not
 * forwardable yet: the row would point at the ORIGINAL object path, and the
 * Storage policy grants read by the ORIGINAL thread's participants, so the
 * recipient would receive a tile they cannot open. Doing it properly means
 * re-uploading a copy into the destination, which is its own task.
 *
 * A GENUINELY NEW MESSAGE, not a reference. New id, new timestamp, sent by
 * whoever forwarded it. The only thing carried across is the text.
 *
 * reply_to_id IS NOT CARRIED, and the database would refuse it anyway.
 * `messages_validate_reply_target` raises ATX06 when the target is outside the
 * destination thread, which is exactly what an inherited pointer would be — so
 * dropping it is not politeness, it is the only shape that inserts at all.
 */
/** The refusals edit and unsend can meet, in words. */
function describeEditRefusal(error: PostgrestError, verb: "edit" | "unsend"): string {
  if (isOffline(error)) return OFFLINE_MESSAGE;
  if (error.code === "ATX40") {
    return verb === "edit"
      ? "You can only edit a message within 15 minutes of sending it."
      : "You can only delete a message for everyone within 15 minutes of sending it.";
  }
  if (error.code === "22023") return "A message can't be empty. To remove it, delete it for everyone.";
  if (error.code === "ATX08") return "That message isn't available any more.";
  return describeRefusal(error) ?? "Couldn't save that. Try again.";
}

/**
 * Changes the text of your own message, within fifteen minutes of sending it.
 * The database keeps the previous version for moderators and stamps edited_at.
 */
export async function editMessage(messageId: string, text: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("edit_message", { p_message_id: messageId, p_text: text });
  if (error) {
    console.error("[messaging] Could not edit:", error.message);
    return { ok: false, message: describeEditRefusal(error, "edit") };
  }
  return { ok: true };
}

/**
 * Unsends your own message for both people, within fifteen minutes of sending
 * it. Its content is cleared from the row; both see "This message was deleted".
 */
export async function deleteForEveryone(messageId: string): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await supabase.rpc("delete_message_for_everyone", { p_message_id: messageId });
  if (error) {
    console.error("[messaging] Could not unsend:", error.message);
    return { ok: false, message: describeEditRefusal(error, "unsend") };
  }
  return { ok: true };
}

export async function forwardMessage(
  destinationThreadId: string,
  senderId: string,
  source: Message
): Promise<SendResult> {
  const body = source.text?.trim();
  if (!body) {
    return { ok: false, message: "Only text messages can be forwarded for now." };
  }
  return insertMessage({
    thread_id: destinationThreadId,
    sender_id: senderId,
    text: body,
    forwarded: true,
  });
}

/**
 * The ids this viewer has starred, as a set for O(1) lookup at render.
 *
 * FROM message_stars (Database 20261002010000): stars follow the account and
 * are private — own-row policies only, and not in the realtime publication, so
 * nobody learns which of their messages you keep. The old message_flags
 * 'starred' value is no longer read or written; see migrateLegacyStars.
 *
 * FAILS TO EMPTY: a star that cannot be read renders as un-starred rather than
 * claiming a mark the database did not confirm.
 */
export async function fetchStarred(): Promise<Set<string>> {
  const { data, error } = await supabase.from("message_stars").select("message_id");
  if (error) {
    console.error("[messaging] Could not load stars:", error.message);
    return new Set();
  }
  return new Set((data ?? []).map((r) => r.message_id));
}

/**
 * Adds or removes this viewer's star on one message.
 *
 * ON CONFLICT DO NOTHING on the way in: (message_id, user_id) is the primary
 * key, and a double tap must not raise for doing nothing wrong.
 */
export async function setStarred(messageId: string, userId: string, starred: boolean): Promise<boolean> {
  const { error } = starred
    ? await supabase
        .from("message_stars")
        .upsert({ user_id: userId, message_id: messageId }, { onConflict: "message_id,user_id", ignoreDuplicates: true })
    : await supabase.from("message_stars").delete().eq("user_id", userId).eq("message_id", messageId);
  if (error) {
    console.error(`[messaging] Could not ${starred ? "star" : "unstar"}:`, error.message);
    return false;
  }
  return true;
}

/**
 * A ONE-TIME UPLOAD of stars this account made the old way.
 *
 * Until this build, starring wrote message_flags 'starred'. The database copied
 * those rows into message_stars when the migration ran, but anything starred
 * between that migration and this deploy was written the old way afterwards
 * and the copy never saw it. So, once per account on this device, the old rows
 * are sent to star_messages(), which is idempotent and silently skips any id
 * the caller may no longer star — a retry is free and one stale id cannot fail
 * the rest.
 */
export async function migrateLegacyStars(userId: string): Promise<void> {
  const key = `centium-state:u:${userId}:starsMigrated`;
  try {
    if (localStorage.getItem(key)) return;
  } catch {
    /* no storage: the upload is idempotent, so running again costs nothing */
  }
  const { data, error } = await supabase.from("message_flags").select("message_id").eq("flag", "starred");
  if (error) return;
  const ids = (data ?? []).map((r) => r.message_id);
  if (ids.length > 0) {
    const up = await supabase.rpc("star_messages", { p_message_ids: ids });
    if (up.error) {
      console.error("[messaging] Could not upload old stars:", up.error.message);
      return;
    }
  }
  try {
    localStorage.setItem(key, new Date().toISOString());
  } catch {
    /* see above */
  }
}

/**
 * Hides one message from this viewer, and from nobody else.
 *
 * THIS IS NOT A DELETE, AND THE SCHEMA WILL NOT LET IT BECOME ONE. public
 * .messages has no DELETE grant and no DELETE policy; the row, its text, its
 * read_at and its place in the other participant's conversation are all
 * untouched. What changes is that messages_visible stops returning it to this
 * caller — verified cross-user: the other participant's history, counts and
 * read state were all unchanged after both messages were hidden.
 *
 * IT IS ONE INSERT, so there is nothing a function would add. The unread count
 * following along is not a second write — fetchUnreadCounts reads the same
 * view, so one row changes both answers at once.
 */
export async function hideMessage(messageId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("message_flags")
    .upsert({ user_id: userId, message_id: messageId, flag: "hidden" }, { ignoreDuplicates: true });
  if (error) {
    console.error("[messaging] Could not hide message:", error.message);
    return false;
  }
  return true;
}

/** The pinned message of a thread, or null. Shared by both participants. */
export interface Pin {
  messageId: string;
  pinnedBy: string | null;
}

/**
 * Reads the one pin on a thread.
 *
 * `maybeSingle` RATHER THAN `single`, because no pin is the ordinary case and
 * `single` treats zero rows as an error. A thread with nothing pinned is not a
 * failure to report.
 */
export async function fetchPin(threadId: string): Promise<Pin | null> {
  const { data, error } = await supabase
    .from("pinned_messages")
    .select("message_id, pinned_by")
    .eq("thread_id", threadId)
    .maybeSingle();

  if (error) {
    console.error("[messaging] Could not load pin:", error.message);
    return null;
  }
  if (!data) return null;
  return { messageId: data.message_id, pinnedBy: data.pinned_by };
}

/**
 * Pins a message, replacing whatever was pinned before.
 *
 * ONE UPSERT, NEVER DELETE-THEN-INSERT. thread_id is the primary key, so
 * `on conflict (thread_id) do update` swaps the pin in a single statement —
 * the thread is never briefly pinless and never briefly holds two. Verified
 * concurrently: two sessions pinning different messages at once serialise on
 * the row lock and leave exactly one row, and 24 simultaneous writers produced
 * no errors and never a count other than one.
 *
 * pinned_by IS SENT AND ALSO CHECKED. The policy requires it to equal
 * auth.uid(), so a forged value is refused rather than stored — the column
 * says who, and cannot be made to say someone else.
 */
export async function setPin(
  threadId: string,
  messageId: string,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("pinned_messages")
    .upsert(
      { thread_id: threadId, message_id: messageId, pinned_by: userId },
      { onConflict: "thread_id" }
    );
  if (error) {
    console.error("[messaging] Could not pin:", error.message);
    return false;
  }
  return true;
}

/**
 * Removes a thread's pin, whoever set it.
 *
 * EITHER PARTICIPANT MAY CLEAR IT, which is what makes this shared rather than
 * personal state. The delete policy asks only whether the caller is in the
 * thread, so unpinning someone else's pin is allowed by design — verified both
 * directions, and refused for a non-participant.
 */
export async function clearPin(threadId: string): Promise<boolean> {
  const { error } = await supabase.from("pinned_messages").delete().eq("thread_id", threadId);
  if (error) {
    console.error("[messaging] Could not unpin:", error.message);
    return false;
  }
  return true;
}
