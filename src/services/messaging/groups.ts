import type { PostgrestError } from "@supabase/supabase-js";
import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { t, tk, tn } from "../../i18n/core";
import { stripPrivateExif } from "../storage/exif";
import { stageAndSubmit, withdrawPending } from "../moderation/images";
import { describeDescriptionError, descriptionToSend, GROUP_DESCRIPTION_MAX } from "./groupCardsModel";

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
  /** Round D: the approved photo in the private group-photos bucket (members read it signed). */
  photoPath: string | null;
  /** Round D: the owner's description (up to 500), moderated. */
  description: string | null;
}

/** A refusal, by the database's code, in words. `doing` names the action for the generic case. */
export function describeGroupError(error: { code?: string; message?: string }, doing: string = tk("do that")): string {
  if (isOffline(error as PostgrestError)) return OFFLINE_MESSAGE;
  const msg = error.message ?? "";
  switch (error.code ?? "") {
    case "ATX44":
      if (/professional/i.test(msg)) return t("Only professionals can create groups and broadcast lists.");
      if (/cannot leave|cannot remove themselves/i.test(msg)) return t("As the host you can't leave the group. Close it instead.");
      return t("Only the group's host can do that.");
    case "ATX45":
      return t("This group has been closed.");
    case "ATX46":
      return t("That person isn't in this group any more.");
    case "ATX43":
      return /list/i.test(msg) ? t("That list is full.") : t("This group is full.");
    case "ATX36":
      return /under 18/i.test(msg)
        ? t("Accounts under 18 can't be added to a group.")
        : t("You can only add your own connected clients.");
    case "ATX35":
      return t("This person can't be added.");
    case "ATX02":
      return t("You've done that a lot recently. Try again in a little while.");
    case "ATX08":
      return t("That group isn't available any more.");
    case "22023":
      if (/name/i.test(msg)) return tn(GROUP_NAME_MAX, "Give it a name of up to {n} character.", "Give it a name of up to {n} characters.");
      return t("Couldn't {doing}. Check the details and try again.", { doing: t(doing) });
    default:
      return t("Couldn't {doing}. Try again.", { doing: t(doing) });
  }
}

function fail(error: PostgrestError, doing: string): Fail {
  console.error(`[groups] Could not ${doing}:`, error.code, error.message);
  return { ok: false, message: describeGroupError(error, doing) };
}

/** Creates a group the caller (a professional) owns, and returns its thread id. */
export async function createGroup(name: string): Promise<{ ok: true; threadId: string } | Fail> {
  const { data, error } = await supabase.rpc("create_group", { p_name: name });
  if (error) return fail(error, tk("create the group"));
  const id = (data as { id?: string } | null)?.id;
  return id ? { ok: true, threadId: id } : { ok: false, message: t("Couldn't create the group. Try again.") };
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
  return error ? fail(error, tk("join the group")) : { ok: true };
}

export async function declineInvitation(threadId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("decline_group_invitation", { p_thread_id: threadId });
  return error ? fail(error, tk("decline the invitation")) : { ok: true };
}

export async function leaveGroup(threadId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("leave_group", { p_thread_id: threadId });
  return error ? fail(error, tk("leave the group")) : { ok: true };
}

/** Removes a member, or withdraws an unanswered invitation. Host only. */
export async function removeGroupMember(threadId: string, userId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("remove_group_member", { p_thread_id: threadId, p_user_id: userId });
  return error ? fail(error, tk("remove them")) : { ok: true };
}

export async function renameGroup(threadId: string, name: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("rename_group", { p_thread_id: threadId, p_name: name });
  return error ? fail(error, tk("rename the group")) : { ok: true };
}

/** Closes the group for everyone: it stays readable, and nobody can post. Host only. */
export async function closeGroup(threadId: string): Promise<Ok | Fail> {
  const { error } = await supabase.rpc("close_group", { p_thread_id: threadId });
  return error ? fail(error, tk("close the group")) : { ok: true };
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
      groupName: r.group_name?.trim() || t("Group"),
      invitedById: r.invited_by_id,
      invitedByFirstName: r.invited_by_first_name?.trim() || t("Someone"),
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
    firstName: r.first_name?.trim() || t("Someone"),
    avatarUrl: r.avatar_url,
    role: r.role === "owner" ? "owner" : "member",
    status: r.status,
    joinedAt: r.joined_at,
  }));
}

type ThreadRow = { name: string | null; created_by: string | null; closed_at: string | null; photo_path?: string | null; description?: string | null };
const threadsTable = () =>
  supabase as unknown as {
    from: (t: "message_threads") => {
      select: (c: string) => { eq: (k: string, v: string) => { maybeSingle: () => PromiseLike<{ data: ThreadRow | null; error: PostgrestError | null }> } };
    };
  };

/**
 * The group's name, host, whether it is closed, and (Round D, Database
 * 20261223040000) its photo and description. A database without those two
 * columns yet (42703) still gives the rest.
 */
export async function fetchGroupState(threadId: string): Promise<GroupState | null> {
  const read = (cols: string) => threadsTable().from("message_threads").select(cols).eq("id", threadId).maybeSingle();
  let { data, error } = await read("name, created_by, closed_at, photo_path, description");
  if (error?.code === "42703") ({ data, error } = await read("name, created_by, closed_at"));
  if (error || !data) return null;
  return {
    name: data.name?.trim() || t("Group"),
    ownerId: data.created_by,
    closedAt: data.closed_at,
    photoPath: data.photo_path?.trim() || null,
    description: data.description?.trim() || null,
  };
}

// ---------------------------------------------------------------------------
// Round D · the group's photo and description (owner only)
// ---------------------------------------------------------------------------

type Rpc = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: PostgrestError | null }> };
const untyped = () => supabase as unknown as Rpc;

export { GROUP_DESCRIPTION_MAX };

/** set_group_description: up to 500, '' clears; moderated (ATX60 refuses a blocked word). */
export async function setGroupDescription(threadId: string, text: string): Promise<Ok | Fail> {
  const desc = descriptionToSend(text);
  if (desc === null) return { ok: false, message: describeDescriptionError({ code: "22023" }) };
  const { error } = await untyped().rpc("set_group_description", { p_thread_id: threadId, p_description: desc });
  if (error) {
    console.error("[groups] Could not set the description:", error.code, error.message);
    return { ok: false, message: describeDescriptionError(error) };
  }
  return { ok: true };
}

const PHOTO_BUCKET = "group-photos";
const PHOTO_SIGN_SECONDS = 60 * 60;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
const PHOTO_EDGE_PX = 800;
/** The `accept` attribute for a group photo picker. */
export const GROUP_PHOTO_ACCEPT = [...PHOTO_TYPES, ".jpg", ".jpeg", ".png", ".webp"].join(",");

const photoUrls = new Map<string, { url: string; until: number }>();

/**
 * A signed URL for the group's approved photo (private bucket group-photos;
 * the group's joined members may read it). Cached until shortly before it
 * expires, so the header and Chat info share one. Null when it can't be signed.
 */
export async function groupPhotoUrl(path: string): Promise<string | null> {
  const hit = photoUrls.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  try {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, PHOTO_SIGN_SECONDS);
    if (error || !data?.signedUrl) return null;
    photoUrls.set(path, { url: data.signedUrl, until: Date.now() + (PHOTO_SIGN_SECONDS - 120) * 1000 });
    return data.signedUrl;
  } catch {
    return null;
  }
}

/** At most PHOTO_EDGE_PX on the long edge, as JPEG. Never throws: the original goes on a decode failure. */
async function downscale(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, PHOTO_EDGE_PX / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.type === "image/jpeg") {
      bitmap.close();
      return file;
    }
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    return blob ? new File([blob], "group.jpg", { type: "image/jpeg" }) : file;
  } catch (e) {
    console.warn("[groups] Could not resize the photo, uploading as picked:", e);
    return file;
  }
}

/**
 * Sends a new group photo for approval (submit_image 'group_photo', the
 * record being the thread): staged in image-staging, then copied into
 * group-photos and written to message_threads.photo_path by the Database
 * once an admin approves it. The owner sees it with "Waiting for approval"
 * until then (useOwnImage); members keep the previous photo, or none.
 */
export async function submitGroupPhoto(me: string, threadId: string, file: File): Promise<Ok | Fail> {
  if (!PHOTO_TYPES.includes(file.type)) return { ok: false, message: t("Group photos need to be a JPEG, PNG or WebP.") };
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, message: t("That image is too large. Pick one under 5 MB.") };
  try {
    const stripped = await stripPrivateExif(await downscale(file));
    const r = await stageAndSubmit(me, "group_photo", threadId, stripped);
    return r.ok ? { ok: true } : { ok: false, message: r.message };
  } catch (e) {
    console.error("[groups] Could not send the photo:", e);
    return { ok: false, message: isOffline(e) ? OFFLINE_MESSAGE : t("That photo couldn't be uploaded. Check your connection and try again.") };
  }
}

/** Takes back a photo still waiting for approval. */
export async function withdrawGroupPhoto(threadId: string): Promise<Ok | Fail> {
  const r = await withdrawPending("group_photo", threadId);
  return r.ok ? { ok: true } : { ok: false, message: r.message };
}

/**
 * Removes the approved photo at once (Database 20261223060000,
 * remove_group_photo); members can no longer read the file. Errors as
 * rename_group (ATX08 / ATX44 / ATX45).
 */
export async function removeGroupPhoto(threadId: string): Promise<Ok | Fail> {
  const { error } = await untyped().rpc("remove_group_photo", { p_thread_id: threadId });
  return error ? fail(error, tk("remove the photo")) : { ok: true };
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
  return (data ?? []).map((r) => ({ userId: r.user_id, firstName: r.first_name?.trim() || t("Someone"), readAt: r.read_at }));
}
