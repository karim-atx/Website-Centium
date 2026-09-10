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
  /** Duration of a voice note. Nothing sends these yet — see 6c. */
  voiceNoteSeconds: number | null;
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
    .select("thread_id, text, created_at, attachment_url, attachment_purged_at")
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
      const preview =
        m.text?.trim() ||
        (m.attachment_url ? "Photo" : "") ||
        (m.attachment_purged_at ? "Attachment removed" : "") ||
        "Message";
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
      "id, thread_id, sender_id, text, created_at, read_at, attachment_url, attachment_purged_at, voice_note_seconds"
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
  text: string
): Promise<SendResult> {
  const body = text.trim();
  if (!body) return { ok: false, message: "A message can't be empty." };

  return insertMessage({ thread_id: threadId, sender_id: senderId, text: body });
}

/** The one place a message row is written, so every path returns the same shape. */
async function insertMessage(row: {
  thread_id: string;
  sender_id: string;
  text?: string | null;
  attachment_url?: string | null;
}): Promise<SendResult> {
  const { data, error } = await supabase
    .from("messages")
    .insert(row)
    .select(
      "id, thread_id, sender_id, text, created_at, read_at, attachment_url, attachment_purged_at, voice_note_seconds"
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
