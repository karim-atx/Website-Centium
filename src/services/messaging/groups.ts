import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";

// Groups (Messages phase 2B, Database 20261003000000-040000).
//
// A professional makes a group, invites their own connected clients, and runs
// it: rename, add, remove, close. A client sees an invitation first and only
// becomes a member by accepting. Everything here is a database function; the
// membership table itself has no client grant at all.
//
// WHAT MEMBERS SEE OF EACH OTHER is a first name and an avatar, through
// group_members(), and nothing else. An invitee sees only the invitation.

type Fail = { ok: false; message: string };
type Ok<T = undefined> = T extends undefined ? { ok: true } : { ok: true; value: T };

/** The longest group or list name the database accepts. */
export const GROUP_NAME_MAX = 80;

export interface GroupMember {
  userId: string;
  firstName: string;
  avatarUrl: string | null;
  role: "owner" | "member";
  status: "invited" | "joined" | "declined" | "left" | "removed";
  joinedAt: string | null;
}

export interface GroupInvitation {
  threadId: string;
  groupName: string;
  invitedById: string | null;
  invitedByFirstName: string;
  invitedByAvatarUrl: string | null;
  memberCount: number;
  invitedAt: string;
}

export interface GroupState {
  name: string;
  ownerId: string | null;
  closedAt: string | null;
}

/** A refusal, by the database's code, in words. `doing` names the action for the generic case. */
export function describeGroupError(error: { code?: string; message?: string }, doing = "do that"): string {
  if (isOffline(error as PostgrestError)) return OFFLINE_MESSAGE;
  const msg = error.message ?? "";
  switch (error.code ?? "") {
    case "ATX44":
      if (/professional/i.test(msg)) return "Only professionals can create groups and broadcast lists.";
      if (/cannot leave|cannot remove themselves/i.test(msg)) return "As the host you can't leave the group. Close it instead.";
      return "Only the group's host can do that.";
    case "ATX45":
      return "This group has been closed.";
    case "ATX46":
      return "That person isn't in this group any more.";
    case "ATX43":
      return /list/i.test(msg) ? "That list is full." : "This group is full.";
    case "ATX36":
      return /under 18/i.test(msg)
        ? "Accounts under 18 can't be added to a group."
        : "You can only add your own connected clients.";
    case "ATX35":
      return "This person can't be added.";
    case "ATX02":
      return "You've done that a lot recently. Try again in a little while.";
    case "ATX08":
      return "That group isn't available any more.";
    case "22023":
      if (/name/i.test(msg)) return `Give it a name of up to ${GROUP_NAME_MAX} characters.`;
      return `Couldn't ${doing}. Check the details and try again.`;
    default:
      return `Couldn't ${doing}. Try again.`;
  }
}

function fail(error: PostgrestError, doing: string): Fail {
  console.error(`[groups] Could not ${doing}:`, error.code, error.message);
  return { ok: false, message: describeGroupError(error, doing) };
}

/** Creates a group the caller (a professional) owns, and returns its thread id. */
export async function createGroup(name: string): Promise<{ ok: true; threadId: string } | Fail> {
  const { data, error } = await supabase.rpc("create_group", { p_name: name });
  if (error) return fail(error, "create the group");
  const id = (data as { id?: string } | null)?.id;
  return id ? { ok: true, threadId: id } : { ok: false, message: "Couldn't create the group. Try again." };
}

/**
 * Invites people ONE AT A TIME, so one refusal (somebody under 18, somebody
 * no longer a client) does not stop the rest, and each refusal can be named.
 * Somebody already invited or already in is skipped by the database, not an
 * error, so this can be retried with the same list.
 */
export async function inviteToGroup(
  threadId: string,
  people: { userId: string; name: string }[]
): Promise<{ sent: number; refused: { name: string; reason: string }[] }> {
  let sent = 0;
  const refused: { name: string; reason: string }[] = [];
  for (const p of people) {
    const { data, error } = await supabase.rpc("invite_to_group", { p_thread_id: threadId, p_user_ids: [p.userId] });
    if (error) {
      console.error("[groups] Invite refused:", error.code);
      refused.push({ name: p.name, reason: describeGroupError(error, "invite them") });
      // A closed group, a full group or a rate limit refuses everyone after.
      if (["ATX45", "ATX43", "ATX02", "ATX44", "ATX08"].includes(error.code ?? "")) {
        for (const rest of people.slice(people.indexOf(p) + 1)) refused.push({ name: rest.name, reason: describeGroupError(error, "invite them") });
        break;
      }
      continue;
    }
    sent += Number(data ?? 0);
  }
  return { sent, refused };
}

export async function acceptInvitation(threadId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("accept_group_invitation", { p_thread_id: threadId });
  return error ? fail(error, "join the group") : { ok: true };
}

export async function declineInvitation(threadId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("decline_group_invitation", { p_thread_id: threadId });
  return error ? fail(error, "decline the invitation") : { ok: true };
}

export async function leaveGroup(threadId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("leave_group", { p_thread_id: threadId });
  return error ? fail(error, "leave the group") : { ok: true };
}

/** Removes a member, or withdraws an unanswered invitation. Host only. */
export async function removeGroupMember(threadId: string, userId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("remove_group_member", { p_thread_id: threadId, p_user_id: userId });
  return error ? fail(error, "remove them") : { ok: true };
}

export async function renameGroup(threadId: string, name: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("rename_group", { p_thread_id: threadId, p_name: name });
  return error ? fail(error, "rename the group") : { ok: true };
}

/** Closes the group for everyone: it stays readable, and nobody can post. Host only. */
export async function closeGroup(threadId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("close_group", { p_thread_id: threadId });
  return error ? fail(error, "close the group") : { ok: true };
}

/** Invitations waiting for the caller's answer, newest first. */
export async function fetchGroupInvitations(): Promise<GroupInvitation[]> {
  const { data, error } = await supabase.rpc("my_group_invitations");
  if (error) {
    console.error("[groups] Could not load invitations:", error.message);
    return [];
  }
  return (data ?? [])
    .map((r) => ({
      threadId: r.thread_id,
      groupName: r.group_name?.trim() || "Group",
      invitedById: r.invited_by_id,
      invitedByFirstName: r.invited_by_first_name?.trim() || "Someone",
      invitedByAvatarUrl: r.invited_by_avatar_url,
      memberCount: Number(r.member_count ?? 0),
      invitedAt: r.invited_at,
    }))
    .sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));
}

/**
 * Who is (or was) in a group: first name and avatar only. A former member
 * sees who was there while they were. Pending invitations are never listed.
 */
export async function fetchGroupMembers(threadId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase.rpc("group_members", { p_thread_id: threadId });
  if (error) {
    console.error("[groups] Could not load members:", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    userId: r.user_id,
    firstName: r.first_name?.trim() || "Someone",
    avatarUrl: r.avatar_url,
    role: r.role === "owner" ? "owner" : "member",
    status: r.status,
    joinedAt: r.joined_at,
  }));
}

/** The group's name, host and whether it is closed. */
export async function fetchGroupState(threadId: string): Promise<GroupState | null> {
  const { data, error } = await supabase
    .from("message_threads")
    .select("name, created_by, closed_at")
    .eq("id", threadId)
    .maybeSingle();
  if (error || !data) return null;
  return { name: data.name?.trim() || "Group", ownerId: data.created_by, closedAt: data.closed_at };
}

/**
 * "Read by N" for your own messages in a group. One timestamp cannot say who
 * read a group message, so the database counts instead; for anybody but the
 * sender it is 0. Asked per message, so callers keep it to recent ones.
 */
export async function fetchGroupReadCounts(messageIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    messageIds.map(async (id) => {
      const { data, error } = await supabase.rpc("group_message_read_count", { p_message_id: id });
      if (!error) out[id] = Number(data ?? 0);
    })
  );
  return out;
}

export interface GroupReader {
  userId: string;
  firstName: string;
  readAt: string;
}

/** Who read your message, by name; only members who allow read receipts are named. */
export async function fetchGroupReaders(messageId: string): Promise<GroupReader[]> {
  const { data, error } = await supabase.rpc("group_message_readers", { p_message_id: messageId });
  if (error) return [];
  return (data ?? []).map((r) => ({ userId: r.user_id, firstName: r.first_name?.trim() || "Someone", readAt: r.read_at }));
}
