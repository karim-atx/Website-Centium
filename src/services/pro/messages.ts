// Release 3 · W6 Messages for professionals (MO22 v5, MO22 v2, MO27): the
// readers and writers the professional's Messages adds on top of
// services/messaging (which stays the one source for threads, settings,
// search, groups and broadcasts).
//
// - the newest message's card kind, for an enquiry's "Plans sent" line
//   (message_cards, readable with the message);
// - joined member counts for group rows (group_members());
// - send_group_card(p_thread_id, p_kind, p_ref_id, p_note) (DB-7): a
//   programme_share (one of my own workout_templates) or a session_share
//   (one of my own calendar_events). The database builds the payload; the note
//   is at most 300 characters (22023); ATX08 when the thread or the item isn't
//   mine to post; ATX09 for a non-professional;
// - an announcement: an ordinary message pinned to the top (sendMessage +
//   setPin, the chat's own pin).

import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { fetchGroupMembers } from "../messaging/groups";
import { sendMessage, setPin } from "../messaging";
import { rpc } from "./rpc";

export type Write = { ok: true } | { ok: false; message: string };
export type Read<T> = { ok: true; data: T } | { ok: false; offline: boolean };

/** The card kind (if any) on each of these messages. */
export async function fetchCardKinds(messageIds: string[]): Promise<Record<string, string>> {
  if (messageIds.length === 0) return {};
  const { data, error } = await (supabase as unknown as {
    from: (t: string) => { select: (c: string) => { in: (k: string, v: string[]) => PromiseLike<{ data: unknown; error: unknown }> } };
  })
    .from("message_cards")
    .select("message_id, kind")
    .in("message_id", messageIds);
  if (error) return {};
  const out: Record<string, string> = {};
  for (const r of (data ?? []) as { message_id: string; kind: string }[]) out[r.message_id] = r.kind;
  return out;
}

/** Joined members per group (the host counts). */
export async function fetchMemberCounts(threadIds: string[]): Promise<Record<string, number>> {
  const pairs = await Promise.all(
    threadIds.slice(0, 30).map(async (id) => [id, (await fetchGroupMembers(id)).filter((m) => m.status === "joined").length] as const)
  );
  return Object.fromEntries(pairs.filter(([, n]) => n > 0));
}

export interface ShareableProgramme {
  id: string;
  name: string;
  durationWeeks: number | null;
}
export interface ShareableSession {
  id: string;
  title: string;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
}

/** My own programmes (templates), for "A programme". */
export async function fetchShareableProgrammes(me: string): Promise<Read<ShareableProgramme[]>> {
  const { data, error } = await supabase
    .from("workout_templates")
    .select("id, name, duration_weeks")
    .eq("owner_id", me)
    .order("name", { ascending: true })
    .limit(100);
  if (error) return { ok: false, offline: isOffline(error) };
  const rows = (data ?? []) as unknown as { id: string; name: string; duration_weeks: number | null }[];
  return { ok: true, data: rows.map((r) => ({ id: r.id, name: r.name, durationWeeks: r.duration_weeks })) };
}

/** My own sessions from today on, for "A group session". */
export async function fetchShareableSessions(me: string, today: string): Promise<Read<ShareableSession[]>> {
  const { data, error } = await supabase
    .from("calendar_events")
    .select("id, title, event_date, start_time, end_time, location")
    .eq("owner_id", me)
    .gte("event_date", today)
    .order("event_date", { ascending: true })
    .limit(50);
  if (error) return { ok: false, offline: isOffline(error) };
  const rows = (data ?? []) as unknown as { id: string; title: string; event_date: string; start_time: string | null; end_time: string | null; location: string | null }[];
  return {
    ok: true,
    data: rows.map((r) => ({ id: r.id, title: r.title, date: r.event_date, startTime: r.start_time, endTime: r.end_time, location: r.location })),
  };
}

/** send_group_card: the card goes in as a message of mine. */
export async function sendGroupCard(threadId: string, kind: "programme_share" | "session_share", refId: string, note: string | null): Promise<Write> {
  const { error } = await rpc("send_group_card", { p_thread_id: threadId, p_kind: kind, p_ref_id: refId, p_note: note?.trim() ? note.trim() : null });
  if (!error) return { ok: true };
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  if (error.code === "22023") return { ok: false, message: "The note is at most 300 characters." };
  return { ok: false, message: "Couldn't share that. Try again." };
}

/** An announcement: my message, pinned to the top of the chat. */
export async function sendAnnouncement(threadId: string, me: string, text: string): Promise<Write> {
  const sent = await sendMessage(threadId, me, text.trim());
  if (!sent.ok) return { ok: false, message: sent.message };
  const pinned = await setPin(threadId, sent.message.id, me);
  return pinned ? { ok: true } : { ok: false, message: "Sent, but couldn't pin it. Pin it from the message." };
}
