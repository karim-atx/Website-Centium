import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { describeGroupError } from "./groups";

// Broadcast lists (Messages phase 2B, Database 20261003030000).
//
// A professional keeps named lists of their own connected clients and sends a
// message to a list. EACH CLIENT GETS AN ORDINARY MESSAGE in the direct chat
// they already have with the professional: no marker, no list name, and no
// sight of anybody else on the list. Replies come back in that direct chat
// and need no handling here.
//
// Nobody but the owner can see a list; the tables have no client grant, so
// everything is a database function.

type Fail = { ok: false; message: string };

export interface BroadcastList {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
  lastSentAt: string | null;
}

export interface BroadcastPerson {
  userId: string;
  firstName: string;
  avatarUrl: string | null;
}

export interface Broadcast {
  id: string;
  listId: string | null;
  listName: string;
  sentAt: string;
  /** "Sent to N": how many clients received it. */
  sentCount: number;
  /** Refused at send time (e.g. no longer a client); counted, never named. */
  skippedCount: number;
}

function fail(error: PostgrestError, doing: string): Fail {
  console.error(`[broadcasts] Could not ${doing}:`, error.code, error.message);
  if (error.code === "ATX02") return { ok: false, message: "You can send up to 10 broadcasts a day. Try again tomorrow." };
  if (error.code === "ATX43") {
    return {
      ok: false,
      message: /lists/i.test(error.message ?? "")
        ? "You have 20 broadcast lists, which is the most you can keep. Delete one to make another."
        : "A broadcast list can have up to 200 people.",
    };
  }
  if (error.code === "ATX08") return { ok: false, message: "That list isn't available any more." };
  if (error.code === "22023" && /something to say/i.test(error.message ?? "")) {
    return { ok: false, message: "Write a message first." };
  }
  return { ok: false, message: describeGroupError(error, doing) };
}

export async function fetchBroadcastLists(): Promise<BroadcastList[] | null> {
  const { data, error } = await supabase.rpc("my_broadcast_lists");
  if (error) {
    console.error("[broadcasts] Could not load lists:", error.message);
    return null;
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    memberCount: Number(r.member_count ?? 0),
    createdAt: r.created_at,
    lastSentAt: r.last_sent_at,
  }));
}

/** Past broadcasts, newest first. A broadcast keeps its list's name even after the list is deleted. */
export async function fetchBroadcasts(limit = 100): Promise<Broadcast[]> {
  const { data, error } = await supabase.rpc("my_broadcasts", { p_limit: limit });
  if (error) {
    console.error("[broadcasts] Could not load broadcasts:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: r.id,
    listId: r.list_id,
    listName: r.list_name,
    sentAt: r.sent_at,
    sentCount: Number(r.sent_count ?? 0),
    skippedCount: Number(r.skipped_count ?? 0),
  }));
}

export async function fetchListPeople(listId: string): Promise<BroadcastPerson[]> {
  const { data, error } = await supabase.rpc("broadcast_list_people", { p_list_id: listId });
  if (error) {
    console.error("[broadcasts] Could not load the list:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({ userId: r.user_id, firstName: r.first_name?.trim() || "Someone", avatarUrl: r.avatar_url }));
}

export async function createList(name: string): Promise<{ ok: true; listId: string } | Fail> {
  const { data, error } = await supabase.rpc("create_broadcast_list", { p_name: name });
  if (error) return fail(error, "create the list");
  const id = (data as { id?: string } | null)?.id;
  return id ? { ok: true, listId: id } : { ok: false, message: "Couldn't create the list. Try again." };
}

export async function renameList(listId: string, name: string): Promise<{ ok: true } | Fail> {
  const { error } = await supabase.rpc("rename_broadcast_list", { p_list_id: listId, p_name: name });
  return error ? fail(error, "rename the list") : { ok: true };
}

/** Deletes the list. Not an unsend: messages already sent stay with each client. */
export async function deleteList(listId: string): Promise<{ ok: true } | Fail> {
  const { error } = await supabase.rpc("delete_broadcast_list", { p_list_id: listId });
  return error ? fail(error, "delete the list") : { ok: true };
}

/**
 * Brings a list's membership to exactly `wanted`: adds the new ones in one
 * call, removes the dropped ones one by one.
 */
export async function setListPeople(listId: string, current: string[], wanted: string[]): Promise<{ ok: true } | Fail> {
  const add = wanted.filter((id) => !current.includes(id));
  const drop = current.filter((id) => !wanted.includes(id));
  if (add.length > 0) {
    const { error } = await supabase.rpc("add_to_broadcast_list", { p_list_id: listId, p_user_ids: add });
    if (error) return fail(error, "add them");
  }
  for (const id of drop) {
    const { error } = await supabase.rpc("remove_from_broadcast_list", { p_list_id: listId, p_user_id: id });
    if (error) return fail(error, "remove them");
  }
  return { ok: true };
}

/** Sends a text broadcast. Each client receives it in their own chat with you. */
export async function sendBroadcast(listId: string, text: string): Promise<{ ok: true; broadcast: Broadcast } | Fail> {
  const { data, error } = await supabase.rpc("send_broadcast", { p_list_id: listId, p_text: text });
  if (error) return fail(error, "send the broadcast");
  const r = data as { id: string; list_id: string | null; list_name: string; sent_at: string; sent_count: number; skipped_count: number };
  return {
    ok: true,
    broadcast: {
      id: r.id,
      listId: r.list_id,
      listName: r.list_name,
      sentAt: r.sent_at,
      sentCount: Number(r.sent_count ?? 0),
      skippedCount: Number(r.skipped_count ?? 0),
    },
  };
}
