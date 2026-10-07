import { supabase } from "../../../lib/supabase/client";
import { isOffline, OFFLINE_MESSAGE } from "../network-error";
import { describeForumError, type ForumAction, type ForumCategory, type ReportReasonKey } from "./rules";

// The shared forum (Database 630f2cd, 27141fa, df67bd8).
//
// NO CLIENT EVER HOLDS AN AUTHOR'S ID, and nothing here asks for one. Posts
// are read through forum_threads_readable / forum_replies_readable, which
// carry no author column; who wrote each one comes from forum_author_labels,
// keyed on POST ids, which answers with a label, the badge flags, whether it
// is mine, and (only for a verified professional, whose name and CV are
// already public) professional_id for the directory link. Blocking, likewise,
// names a post and the server finds the author.
//
// RECOVERY-SENSITIVE MODE NEVER REACHES THIS FILE. The requests below are the
// same whether the mode is on or off: the screens fetch every category and
// hide Nutrition and Progress on the device. A category filter in a query
// would tell the server the mode was on.

export type Result<T> = { ok: true; value: T } | { ok: false; message: string; code?: string };

const GENERIC = "Something went wrong. Try again.";

function fail(error: { code?: string; message?: string }, action: ForumAction): { ok: false; message: string; code?: string } {
  if (isOffline(error)) return { ok: false, message: OFFLINE_MESSAGE };
  return { ok: false, message: describeForumError(error, action) ?? GENERIC, code: error.code };
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Identity = "nickname" | "real_name";
export type PostStatus = "published" | "held" | "removed";

export interface Author {
  label: string;
  isProfessional: boolean;
  isVerified: boolean;
  isMine: boolean;
  /** Set only for a verified professional: their directory page id. */
  professionalId: string | null;
}

export interface ForumThread {
  id: string;
  categoryKey: string;
  identity: Identity;
  title: string | null;
  body: string | null;
  photoPath: string | null;
  status: PostStatus;
  pinned: boolean;
  locked: boolean;
  editedAt: string | null;
  createdAt: string;
  withdrawn: boolean;
  reactionCount: number;
  replyCount: number;
}

export interface ForumReply {
  id: string;
  threadId: string;
  identity: Identity;
  body: string | null;
  status: PostStatus;
  editedAt: string | null;
  createdAt: string;
  withdrawn: boolean;
  /** Likes on the reply (MO1.3.3, A21). */
  reactionCount: number;
}

/** The label a post shows when the resolver gave no row (a deleted or unknown author). */
export const UNKNOWN_AUTHOR: Author = {
  label: "Member",
  isProfessional: false,
  isVerified: false,
  isMine: false,
  professionalId: null,
};

const THREAD_COLUMNS =
  "id, category_key, identity, title, body, photo_path, status, pinned, locked, edited_at, created_at, withdrawn, reaction_count, reply_count";
const REPLY_COLUMNS = "id, thread_id, identity, body, status, edited_at, created_at, withdrawn, reaction_count";

type ThreadRow = {
  id: string;
  category_key: string;
  identity: Identity;
  title: string | null;
  body: string | null;
  photo_path: string | null;
  status: PostStatus;
  pinned: boolean;
  locked: boolean;
  edited_at: string | null;
  created_at: string;
  withdrawn: boolean;
  reaction_count: number;
  reply_count: number;
};

function toThread(r: ThreadRow): ForumThread {
  return {
    id: r.id,
    categoryKey: r.category_key,
    identity: r.identity,
    title: r.title,
    body: r.body,
    photoPath: r.photo_path,
    status: r.status,
    pinned: r.pinned,
    locked: r.locked,
    editedAt: r.edited_at,
    createdAt: r.created_at,
    withdrawn: r.withdrawn,
    reactionCount: Number(r.reaction_count) || 0,
    replyCount: Number(r.reply_count) || 0,
  };
}

type ReplyRow = {
  id: string;
  thread_id: string;
  identity: Identity;
  body: string | null;
  status: PostStatus;
  edited_at: string | null;
  created_at: string;
  withdrawn: boolean;
  reaction_count: number | null;
};

function toReply(r: ReplyRow): ForumReply {
  return {
    id: r.id,
    threadId: r.thread_id,
    identity: r.identity,
    body: r.body,
    status: r.status,
    editedAt: r.edited_at,
    createdAt: r.created_at,
    withdrawn: r.withdrawn,
    reactionCount: Number(r.reaction_count) || 0,
  };
}

// ---------------------------------------------------------------------------
// Categories, nicknames
// ---------------------------------------------------------------------------

export async function fetchCategories(): Promise<Result<ForumCategory[]>> {
  const { data, error } = await supabase
    .from("forum_categories")
    .select("key, name, sensitivity, sort_order")
    .order("sort_order");
  if (error) return fail(error, "read");
  return {
    ok: true,
    value: (data ?? []).map((c) => ({
      key: c.key as string,
      name: c.name as string,
      sensitivity: c.sensitivity as string,
      sortOrder: c.sort_order as number,
    })),
  };
}

/** The caller's own nickname, or null when they have not chosen one. */
export async function fetchMyNickname(userId: string): Promise<Result<string | null>> {
  const { data, error } = await supabase
    .from("forum_nicknames")
    .select("nickname")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return fail(error, "read");
  return { ok: true, value: (data?.nickname as string | undefined) ?? null };
}

export async function fetchReservedNicknames(): Promise<Set<string>> {
  const { data } = await supabase.from("forum_reserved_nicknames").select("term");
  return new Set((data ?? []).map((r) => String(r.term).toLowerCase()));
}

export async function setNickname(nickname: string): Promise<Result<null>> {
  const { error } = await supabase.rpc("set_forum_nickname", { p_nickname: nickname.trim() });
  if (error) return fail(error, "nickname");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export const THREAD_PAGE = 30;
const PHOTO_URL_SECONDS = 10 * 60;

/**
 * A page of threads, newest first with pinned ones leading. Withdrawn posts
 * are left out (only their author can still read them, and the design has no
 * state for one); removed ones stay, as the design's placeholder.
 */
export async function fetchThreads(opts: {
  categoryKey: string | null;
  before?: string | null;
}): Promise<Result<ForumThread[]>> {
  let q = supabase
    .from("forum_threads_readable")
    .select(THREAD_COLUMNS)
    .eq("withdrawn", false)
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(THREAD_PAGE);
  if (opts.categoryKey) q = q.eq("category_key", opts.categoryKey);
  // Every pinned thread is on the first page; later pages are the unpinned
  // ones older than the last one shown, so nothing appears twice.
  if (opts.before) q = q.eq("pinned", false).lt("created_at", opts.before);
  const { data, error } = await q;
  if (error) return fail(error, "read");
  return { ok: true, value: ((data ?? []) as ThreadRow[]).map(toThread) };
}

export async function fetchThread(id: string): Promise<Result<ForumThread | null>> {
  const { data, error } = await supabase.from("forum_threads_readable").select(THREAD_COLUMNS).eq("id", id).maybeSingle();
  if (error) return fail(error, "read");
  return { ok: true, value: data ? toThread(data as ThreadRow) : null };
}

export async function fetchReplies(threadId: string): Promise<Result<ForumReply[]>> {
  const { data, error } = await supabase
    .from("forum_replies_readable")
    .select(REPLY_COLUMNS)
    .eq("thread_id", threadId)
    .eq("withdrawn", false)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error) return fail(error, "read");
  return { ok: true, value: ((data ?? []) as ReplyRow[]).map(toReply) };
}

/** Labels for a set of posts, keyed by post id. A post with no row has no visible author (blocked or gone). */
export async function fetchAuthors(threadIds: string[], replyIds: string[]): Promise<Map<string, Author>> {
  const out = new Map<string, Author>();
  if (threadIds.length === 0 && replyIds.length === 0) return out;
  const { data } = await supabase.rpc("forum_author_labels", { p_thread_ids: threadIds, p_reply_ids: replyIds });
  for (const r of (data ?? []) as {
    post_id: string;
    label: string;
    is_professional: boolean;
    is_verified: boolean;
    is_mine: boolean;
    professional_id: string | null;
  }[]) {
    out.set(r.post_id, {
      label: r.label,
      isProfessional: r.is_professional,
      isVerified: r.is_verified,
      isMine: r.is_mine,
      professionalId: r.professional_id ?? null,
    });
  }
  return out;
}

/** Which of these threads the caller has liked. */
export async function fetchMyLikes(threadIds: string[]): Promise<Set<string>> {
  if (threadIds.length === 0) return new Set();
  const { data } = await supabase.rpc("forum_my_reactions", { p_thread_ids: threadIds, p_reply_ids: [] });
  return new Set(((data ?? []) as { post_id: string; post_kind: string }[]).filter((r) => r.post_kind === "thread").map((r) => r.post_id));
}

/** Which of these replies the caller has liked (MO1.3.3, A21). */
export async function fetchMyReplyLikes(replyIds: string[]): Promise<Set<string>> {
  if (replyIds.length === 0) return new Set();
  const { data } = await supabase.rpc("forum_my_reactions", { p_thread_ids: [], p_reply_ids: replyIds });
  return new Set(((data ?? []) as { post_id: string; post_kind: string }[]).filter((r) => r.post_kind === "reply").map((r) => r.post_id));
}

/**
 * Short-lived signed URLs for the photos on these posts. TEN MINUTES, not an
 * hour: a signed URL keeps working until it expires even after its post is
 * withdrawn or removed, so the lifetime is how long a link someone already
 * loaded can outlive the post. Every screen signs afresh when it loads.
 */
export async function signPhotos(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const unique = [...new Set(paths)];
  if (unique.length === 0) return out;
  const { data } = await supabase.storage.from("forum-photos").createSignedUrls(unique, PHOTO_URL_SECONDS);
  for (const r of data ?? []) if (r.path && r.signedUrl) out.set(r.path, r.signedUrl);
  return out;
}

// ---------------------------------------------------------------------------
// Writing
// ---------------------------------------------------------------------------

export async function likeThread(threadId: string, userId: string, liked: boolean): Promise<Result<null>> {
  // Unliking deletes by thread alone: user_id is not selectable, so it cannot
  // be filtered on, and the delete policy already limits it to the caller's row.
  const { error } = liked
    ? await supabase.from("forum_reactions").insert({ thread_id: threadId, user_id: userId })
    : await supabase.from("forum_reactions").delete().eq("thread_id", threadId);
  // Liking twice is the same like (a double tap on a slow connection).
  if (error && error.code !== "23505") return fail(error, "like");
  return { ok: true, value: null };
}

/** Likes or unlikes a reply; the same rules as a thread like (one per person, delete limited to your own). */
export async function likeReply(replyId: string, userId: string, liked: boolean): Promise<Result<null>> {
  const { error } = liked
    ? await supabase.from("forum_reactions").insert({ reply_id: replyId, user_id: userId })
    : await supabase.from("forum_reactions").delete().eq("reply_id", replyId);
  if (error && error.code !== "23505") return fail(error, "like");
  return { ok: true, value: null };
}

export async function createThread(input: {
  userId: string;
  categoryKey: string;
  identity: Identity;
  title: string;
  body: string;
  photoPath: string | null;
}): Promise<Result<{ id: string; held: boolean }>> {
  const { data, error } = await supabase
    .from("forum_threads")
    .insert({
      author_id: input.userId,
      category_key: input.categoryKey,
      identity: input.identity,
      title: input.title.trim(),
      body: input.body.trim(),
      photo_path: input.photoPath,
    })
    .select("id, status")
    .single();
  if (error) return fail(error, "post");
  return { ok: true, value: { id: data.id as string, held: data.status === "held" } };
}

export async function createReply(input: {
  userId: string;
  threadId: string;
  identity: Identity;
  body: string;
}): Promise<Result<ForumReply>> {
  const { data, error } = await supabase
    .from("forum_replies")
    .insert({ author_id: input.userId, thread_id: input.threadId, identity: input.identity, body: input.body.trim() })
    .select("id, thread_id, identity, body, status, edited_at, created_at")
    .single();
  if (error) {
    // The insert policy refuses a reply to a locked, removed or withdrawn thread.
    if (error.code === "42501") return { ok: false, message: "This post isn't taking new replies.", code: error.code };
    return fail(error, "reply");
  }
  return { ok: true, value: toReply({ ...(data as Omit<ReplyRow, "withdrawn">), withdrawn: false }) };
}

export type PostRef = { threadId: string } | { replyId: string };

/** One of the two post ids; the other is left out, which the functions read as null. */
function refArgs(ref: PostRef): { p_thread_id: string } | { p_reply_id: string } {
  return "threadId" in ref ? { p_thread_id: ref.threadId } : { p_reply_id: ref.replyId };
}

export async function reportPost(ref: PostRef, reason: ReportReasonKey): Promise<Result<null>> {
  const { error } = await supabase.rpc("report_forum_post", { ...refArgs(ref), p_reason: reason });
  if (error) return fail(error, "report");
  return { ok: true, value: null };
}

/** Blocks the author of a post. The same block as messaging's, so it applies everywhere. */
export async function blockAuthor(ref: PostRef): Promise<Result<null>> {
  const { error } = await supabase.rpc("block_forum_author", refArgs(ref));
  if (error) return fail(error, "block");
  return { ok: true, value: null };
}

export interface ForumBlock {
  ref: string;
  label: string;
  blockedAt: string;
}

export async function fetchMyForumBlocks(): Promise<Result<ForumBlock[]>> {
  const { data, error } = await supabase.rpc("my_forum_blocks");
  if (error) return fail(error, "read");
  return {
    ok: true,
    value: ((data ?? []) as { block_ref: string; label: string; blocked_at: string }[]).map((b) => ({
      ref: b.block_ref,
      label: b.label,
      blockedAt: b.blocked_at,
    })),
  };
}

export async function unblockForumBlock(ref: string): Promise<Result<null>> {
  const { error } = await supabase.rpc("unblock_forum_block", { p_block_ref: ref });
  // ATX65 here means it is already lifted, which is what the person wanted.
  if (error && error.code !== "ATX65") return fail(error, "block");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Editing and withdrawing your own posts
// ---------------------------------------------------------------------------

/** How long after posting the author may still edit (edit_forum_post's own window). */
export const EDIT_WINDOW_MS = 30 * 60_000;

export function editTimeLeft(createdAt: string, now = Date.now()): number {
  return Math.max(0, new Date(createdAt).getTime() + EDIT_WINDOW_MS - now);
}

/**
 * Edits a post or reply. The title is for a post only. An edit that adds a
 * link puts the post back in the moderator's queue, so callers re-read the
 * post afterwards rather than assuming it is still published.
 */
export async function editPost(ref: PostRef, body: string, title?: string): Promise<Result<null>> {
  const { error } = await supabase.rpc("edit_forum_post", {
    ...refArgs(ref),
    p_body: body.trim(),
    ...(title !== undefined ? { p_title: title.trim() } : {}),
  });
  if (error) return fail(error, "edit");
  return { ok: true, value: null };
}

/** Withdraws a post or reply, at any time. */
export async function withdrawPost(ref: PostRef): Promise<Result<null>> {
  const { error } = await supabase.rpc("delete_forum_post", refArgs(ref));
  if (error) return fail(error, "withdraw");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Moderator warnings
// ---------------------------------------------------------------------------

export interface ForumWarning {
  id: string;
  body: string;
  createdAt: string;
}

/** The caller's warnings not yet acknowledged, newest first. */
export async function fetchUnseenWarnings(): Promise<ForumWarning[]> {
  const { data } = await supabase.rpc("my_forum_warnings");
  return ((data ?? []) as { id: string; body: string; created_at: string; seen_at: string | null }[])
    .filter((w) => !w.seen_at)
    .map((w) => ({ id: w.id, body: w.body, createdAt: w.created_at }));
}

export async function acknowledgeWarning(id: string): Promise<Result<null>> {
  const { error } = await supabase.rpc("acknowledge_forum_warning", { p_warning_id: id });
  if (error) return fail(error, "read");
  return { ok: true, value: null };
}
