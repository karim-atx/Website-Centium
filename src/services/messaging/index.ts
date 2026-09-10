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

export interface MessageThread {
  id: string;
  /** The OTHER participant. `thread_participant_summary` never returns the caller. */
  participantId: string;
  participantName: string;
  participantAvatarUrl: string | null;
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
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
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
  voiceNoteSeconds: number | null;
}): string {
  return (
    m.text?.trim() ||
    (m.attachmentPath && m.voiceNoteSeconds ? "Voice note" : "") ||
    (m.attachmentPath ? "Photo" : "") ||
    (m.attachmentPurgedAt ? "Attachment removed" : "") ||
    "Message"
  );
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
  return "Something went wrong. Try again.";
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
    return { ok: false, message: describe(error) };
  }
  const thread = data as { id?: string } | null;
  if (!thread?.id) return { ok: false, message: "Could not open that conversation." };
  return { ok: true, threadId: thread.id };
}

/**
 * Every conversation the caller is in, newest activity first.
 *
 * TWO QUERIES, NOT A JOIN. PostgREST cannot join `message_threads` to the
 * identity view, and the last message per thread is a per-group maximum that
 * PostgREST has no syntax for either. Fetching the caller's recent messages and
 * reducing them by thread costs one extra round trip and keeps the shape
 * obvious; a database-side view for this would be worth building only once the
 * volume makes the limit below start truncating.
 */
export async function fetchThreads(): Promise<ThreadsResult> {
  const participants = await supabase
    .from("thread_participant_summary")
    .select("thread_id, participant_id, first_name, avatar_url");

  if (participants.error) {
    console.error("[messaging] Could not load threads:", participants.error.message);
    return { ok: false, message: describe(participants.error) };
  }
  const rows = participants.data ?? [];
  if (rows.length === 0) return { ok: true, threads: [] };

  // Newest-first so the first row seen for a thread is its latest message.
  const recent = await supabase
    .from("messages")
    .select("thread_id, text, created_at, attachment_url, attachment_purged_at, voice_note_seconds")
    .order("created_at", { ascending: false })
    .limit(500);

  if (recent.error) {
    console.error("[messaging] Could not load previews:", recent.error.message);
    return { ok: false, message: describe(recent.error) };
  }

  const latest = new Map<string, { preview: string; created_at: string }>();
  for (const m of recent.data ?? []) {
    if (m.thread_id && !latest.has(m.thread_id)) {
      // Every message describes itself as SOMETHING. A row exists, so the list
      // must never imply it does not — the constraint messages_has_content_check
      // guarantees at least one of these is present (or that it was purged),
      // so the final fallback is unreachable rather than a guess.
      // Through the shared describer, so this list and the quoted preview in
      // a reply always say the same thing about the same message.
      const preview = describeMessage({
        text: m.text,
        attachmentPath: m.attachment_url,
        attachmentPurgedAt: m.attachment_purged_at,
        voiceNoteSeconds: m.voice_note_seconds,
      });
      latest.set(m.thread_id, { preview, created_at: m.created_at });
    }
  }

  const threads: MessageThread[] = rows.map((r) => {
    const last = r.thread_id ? latest.get(r.thread_id) : undefined;
    return {
      id: r.thread_id!,
      participantId: r.participant_id!,
      // A profile with no first_name is possible — onboarding can be
      // incomplete — and "" would render as a nameless row rather than an
      // obviously unfinished one.
      participantName: r.first_name?.trim() || "Someone",
      participantAvatarUrl: r.avatar_url,
      lastMessagePreview: last?.preview ?? null,
      lastMessageAt: last?.created_at ?? null,
    };
  });

  // Threads with no messages sort last: a conversation someone opened and
  // never wrote in is not more recent than one with real activity in it.
  threads.sort((a, b) => (b.lastMessageAt ?? "").localeCompare(a.lastMessageAt ?? ""));
  return { ok: true, threads };
}

/** Oldest-first, which is the order a conversation is read in. */
export async function fetchMessages(threadId: string): Promise<MessagesResult> {
  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, thread_id, sender_id, text, created_at, read_at, attachment_url, attachment_purged_at, voice_note_seconds, reply_to_id, forwarded"
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[messaging] Could not load messages:", error.message);
    return { ok: false, message: describe(error) };
  }
  return {
    ok: true,
    // sender_id is NOT NULL in the schema; the generated types widen it to
    // nullable, and a row without a sender cannot exist. Dropping any such
    // row rather than asserting keeps the "is this mine" comparison from
    // silently matching on a null.
    //
    // A PURGED ROW IS KEPT, not filtered. sender_id survives the purge — only
    // the content columns are cleared — so these rows still pass the filter,
    // and they must: dropping them would silently shorten a conversation
    // rather than showing that something was there and is gone.
    messages: (data ?? [])
      .filter((m) => !!m.sender_id)
      .map((m) => ({
      id: m.id,
      threadId: m.thread_id,
      senderId: m.sender_id!,
      text: m.text,
      createdAt: m.created_at,
      readAt: m.read_at,
      attachmentPath: m.attachment_url,
      attachmentPurgedAt: m.attachment_purged_at,
      voiceNoteSeconds: m.voice_note_seconds,
      replyToId: m.reply_to_id,
      forwarded: m.forwarded,
    })),
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
}): Promise<SendResult> {
  const { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select(
      "id, thread_id, sender_id, text, created_at, read_at, attachment_url, attachment_purged_at, voice_note_seconds, reply_to_id, forwarded"
    )
    .single();

  if (error) {
    console.error("[messaging] Could not send:", error.message);
    return { ok: false, message: describe(error) };
  }
  return {
    ok: true,
    message: {
      id: data.id,
      threadId: data.thread_id,
      // As above: NOT NULL in the schema, widened by the generated types. This
      // row was just inserted with sender_id set, so it cannot be null here.
      senderId: data.sender_id!,
      text: data.text,
      createdAt: data.created_at,
      readAt: data.read_at,
      attachmentPath: data.attachment_url,
      attachmentPurgedAt: data.attachment_purged_at,
      voiceNoteSeconds: data.voice_note_seconds,
      replyToId: data.reply_to_id,
      forwarded: data.forwarded,
    },
  };
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
  });
  if (!sent.ok) {
    // Named plainly so it is greppable if these ever need sweeping. See the
    // README follow-up; there is no cleanup call that would work here.
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
  seconds: number
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
  });
  if (!sent.ok) {
    console.error(
      `[messaging] ORPHANED OBJECT message-attachments/${upload.path} — upload succeeded, message insert did not.`
    );
  }
  return sent;
}

/**
 * Marks every unread message from the OTHER participant as read.
 *
 * THE SERVER DECIDES THE TIMESTAMP, not this call. `messages_stamp_read_at`
 * ignores whatever value arrives and writes `now()` on the first transition
 * out of null, then freezes it — so the value sent here is a placeholder whose
 * only job is being non-null. A receipt either party could backdate would be
 * worse than no receipt at all, which is why the column is trigger-controlled
 * rather than merely grant-limited.
 *
 * NO `sender_id` FILTER, DELIBERATELY. `messages_mark_read_by_recipient`
 * already requires `auth.uid() <> sender_id`, and duplicating a policy in a
 * filter is how the two quietly drift apart. The `read_at is null` filter is a
 * different thing — it is functional, keeping the update off rows that are
 * already read and making the returned count mean "newly marked".
 *
 * ROW COUNT IS THE RESULT, NOT `error`. Verified against staging: updating a
 * message you sent yourself matches zero rows and returns `error: null`. A
 * caller checking only for an error would read a total refusal as success,
 * which is the same silent-rejection trap this project has hit before.
 */
export async function markThreadRead(threadId: string): Promise<number> {
  const { data, error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .is("read_at", null)
    .select("id");

  if (error) {
    console.error("[messaging] Could not mark read:", error.message);
    return 0;
  }
  return data?.length ?? 0;
}

export interface UnreadCounts {
  /** Unread messages received, keyed by thread id. Threads with none are absent. */
  byThread: Record<string, number>;
  total: number;
}

/**
 * How many messages the caller has received and not read, per thread.
 *
 * ONE QUERY FOR BOTH ANSWERS. Selecting the thread ids of unread rows and
 * counting them here gives the per-thread badge and the nav total together;
 * asking the database for grouped counts is not expressible through PostgREST,
 * and a `head: true` count per thread would be one round trip each for strictly
 * less information.
 *
 * WHAT KEEPS IT CHEAP is that the row set is unread messages, which is small by
 * nature — an inbox nobody has read is a product problem long before it is a
 * query problem. `messages_thread_unread_idx` is a partial index on
 * `(thread_id) where read_at is null`, matching this predicate exactly, and RLS
 * narrows to the caller's own threads before `sender_id` is considered.
 *
 * `sender_id` IS FILTERED HERE, AND THAT IS NOT A DUPLICATED POLICY.
 * `messages_select_participant` deliberately returns both sides of a
 * conversation, so excluding the caller's own messages is a functional
 * requirement — an unread count that included what you had just sent would
 * count your own words back at you.
 *
 * FAILS TO ZERO, NOT TO A GUESS. An error returns empty counts, so a badge
 * disappears rather than freezing at a stale number. Claiming unread messages
 * that cannot be confirmed is worse than showing none.
 */
export async function fetchUnreadCounts(currentUserId: string): Promise<UnreadCounts> {
  const { data, error } = await supabase
    .from("messages")
    .select("thread_id")
    .is("read_at", null)
    .neq("sender_id", currentUserId);

  if (error) {
    console.error("[messaging] Could not count unread:", error.message);
    return { byThread: {}, total: 0 };
  }

  const byThread: Record<string, number> = {};
  for (const row of data ?? []) {
    if (row.thread_id) byThread[row.thread_id] = (byThread[row.thread_id] ?? 0) + 1;
  }
  return { byThread, total: data?.length ?? 0 };
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
