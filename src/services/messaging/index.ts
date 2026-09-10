import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
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
  /** Newest message in the thread, for the list preview. Null on an empty thread. */
  lastMessageText: string | null;
  lastMessageAt: string | null;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string;
  text: string | null;
  createdAt: string;
  readAt: string | null;
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
    .select("thread_id, text, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (recent.error) {
    console.error("[messaging] Could not load previews:", recent.error.message);
    return { ok: false, message: describe(recent.error) };
  }

  const latest = new Map<string, { text: string | null; created_at: string }>();
  for (const m of recent.data ?? []) {
    if (m.thread_id && !latest.has(m.thread_id)) {
      latest.set(m.thread_id, { text: m.text, created_at: m.created_at });
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
      lastMessageText: last?.text ?? null,
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
    .select("id, thread_id, sender_id, text, created_at, read_at")
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
    messages: (data ?? [])
      .filter((m) => !!m.sender_id)
      .map((m) => ({
      id: m.id,
      threadId: m.thread_id,
      senderId: m.sender_id!,
      text: m.text,
      createdAt: m.created_at,
      readAt: m.read_at,
    })),
  };
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

  const { data, error } = await supabase
    .from("messages")
    .insert({ thread_id: threadId, sender_id: senderId, text: body })
    .select("id, thread_id, sender_id, text, created_at, read_at")
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
    },
  };
}
