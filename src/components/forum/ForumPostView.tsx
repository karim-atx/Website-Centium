import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  createReply,
  editPost,
  fetchAuthors,
  fetchMyLikes,
  fetchReplies,
  fetchThread,
  likeThread,
  signPhotos,
  UNKNOWN_AUTHOR,
  type Author,
  type ForumReply,
  type ForumThread,
  type Identity,
  type PostRef,
} from "../../services/forum";
import { forumAge, hiddenInRecovery, type ForumCategory } from "../../services/forum/rules";
import { ForumSafetySheet } from "./ForumSafetySheet";
import { OwnPostSheet } from "./OwnPostSheet";
import { AuthorInitial, AuthorName, ForumPlaceholder, HeartIcon, HeldNote, RemovedNote } from "./parts";
import { fv } from "./forumColor";

// Design screen 2: one post, its replies, and the reply bar.
//
// "Reply as" is the member's choice per reply, nickname or first name, like
// "Post as" in the composer. A professional has no choice to make: they always
// post under their first name (the server refuses otherwise, ATX59), so the
// select is not shown to them.

export function ForumPostView({
  threadId,
  userId,
  firstName,
  nickname,
  isProfessional,
  categories,
  recoveryOn,
  recoveryPending,
}: {
  threadId: string;
  userId: string;
  firstName: string;
  nickname: string | null;
  isProfessional: boolean;
  categories: ForumCategory[];
  recoveryOn: boolean;
  recoveryPending: boolean;
}) {
  const navigate = useNavigate();
  const [thread, setThread] = useState<ForumThread | null | undefined>(undefined);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replyAs, setReplyAs] = useState<Identity>(!isProfessional && nickname ? "nickname" : "real_name");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ ref: PostRef; kind: "post" | "reply"; label: string } | null>(null);
  // The reader's own post or reply: its menu, and the edit in progress.
  const [own, setOwn] = useState<{ ref: PostRef; kind: "post" | "reply"; createdAt: string } | null>(null);
  const [editing, setEditing] = useState<{ ref: PostRef; title?: string; body: string } | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const apply = useCallback((d: Loaded) => {
    setError(d.error);
    setAuthors(d.authors);
    setLiked(d.liked);
    setPhotoUrl(d.photoUrl);
    setReplies(d.replies);
    setThread(d.thread);
  }, []);

  const load = useCallback(() => loadPost(threadId).then(apply), [threadId, apply]);

  useEffect(() => {
    let live = true;
    void loadPost(threadId).then((d) => live && apply(d));
    return () => {
      live = false;
    };
  }, [threadId, apply]);

  const category = thread ? categories.find((c) => c.key === thread.categoryKey) : undefined;
  const hiddenByMode = recoveryOn && hiddenInRecovery(category);

  const toggleLike = async () => {
    if (!thread || likeBusy) return;
    const next = !liked;
    setLikeBusy(true);
    setLiked(next);
    setThread({ ...thread, reactionCount: Math.max(0, thread.reactionCount + (next ? 1 : -1)) });
    const r = await likeThread(thread.id, userId, next);
    setLikeBusy(false);
    if (!r.ok) {
      setLiked(!next);
      setThread(thread);
      setError(r.message);
    }
  };

  const send = async () => {
    const body = draft.trim();
    if (!thread || !body || sending) return;
    setSending(true);
    setReplyError(null);
    const r = await createReply({ userId, threadId: thread.id, identity: isProfessional ? "real_name" : replyAs, body });
    setSending(false);
    if (!r.ok) {
      setReplyError(r.message);
      return;
    }
    setDraft("");
    const a = await fetchAuthors([], [r.value.id]);
    setAuthors((prev) => new Map([...prev, ...a]));
    setReplies((prev) => [...prev, r.value]);
    if (r.value.status === "published") setThread((t) => (t ? { ...t, replyCount: t.replyCount + 1 } : t));
  };

  const back = () => navigate("/app/forum");

  const startEdit = () => {
    if (!own || !thread) return;
    if ("threadId" in own.ref) setEditing({ ref: own.ref, title: thread.title ?? "", body: thread.body ?? "" });
    else {
      const id = own.ref.replyId;
      setEditing({ ref: own.ref, body: replies.find((x) => x.id === id)?.body ?? "" });
    }
    setEditError(null);
    setOwn(null);
  };

  const saveEdit = async () => {
    if (!editing || editBusy) return;
    const body = editing.body.trim();
    const title = editing.title?.trim();
    if (title !== undefined && title.length < 3) {
      setEditError("A title needs at least 3 characters.");
      return;
    }
    if (!body) {
      setEditError("It can't be empty.");
      return;
    }
    setEditBusy(true);
    setEditError(null);
    const r = await editPost(editing.ref, body, title);
    setEditBusy(false);
    if (!r.ok) {
      setEditError(r.message);
      return;
    }
    setEditing(null);
    // Re-read: an edit that adds a link sends the post back for review.
    await load();
  };

  const editFields = (kind: "post" | "reply") =>
    editing && (
      <div className="flex flex-col gap-2">
        {kind === "post" && editing.title !== undefined && (
          <input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            maxLength={140}
            aria-label="Title"
            className="h-[46px] rounded-xl px-3 text-sm font-semibold outline-none"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          />
        )}
        <textarea
          value={editing.body}
          onChange={(e) => setEditing({ ...editing, body: e.target.value })}
          maxLength={kind === "post" ? 8000 : 4000}
          aria-label={kind === "post" ? "Post" : "Reply"}
          className={`${kind === "post" ? "h-[140px]" : "h-[90px]"} rounded-xl px-3 py-2.5 text-sm resize-none outline-none`}
          style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
        />
        {editError && (
          <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3 py-2">
            {editError}
          </p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => setEditing(null)}
            disabled={editBusy}
            className="tap h-10 rounded-full px-4 text-[13px] font-bold"
            style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void saveEdit()}
            disabled={editBusy}
            className="tap h-10 rounded-full px-4 text-[13px] font-extrabold disabled:opacity-60"
            style={{ background: fv("accent"), color: fv("on-accent") }}
          >
            {editBusy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    );

  const topBar = (
    <div className="flex items-center justify-between -mx-1 pb-2">
      <button type="button" onClick={back} aria-label="Back" className="tap w-11 h-11 flex items-center justify-center">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={fv("text")} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 5l-7 7 7 7" />
        </svg>
      </button>
      <span className="text-[15px] font-extrabold">{recoveryPending || hiddenByMode ? "" : category?.name ?? ""}</span>
      {thread && !hiddenByMode && !recoveryPending && thread.status !== "removed" && (authors.get(thread.id)?.isMine ?? false) ? (
        <button
          type="button"
          aria-label="Edit or withdraw"
          onClick={() => setOwn({ ref: { threadId: thread.id }, kind: "post", createdAt: thread.createdAt })}
          className="tap w-11 h-11 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={fv("muted")} aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      ) : thread && !hiddenByMode && !recoveryPending && thread.status === "published" && !(authors.get(thread.id)?.isMine ?? false) ? (
        <button
          type="button"
          aria-label="Report or block"
          onClick={() =>
            setSheet({ ref: { threadId: thread.id }, kind: "post", label: (authors.get(thread.id) ?? UNKNOWN_AUTHOR).label })
          }
          className="tap w-11 h-11 flex items-center justify-center"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill={fv("muted")} aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      ) : (
        <span className="w-11 h-11" aria-hidden="true" />
      )}
    </div>
  );

  if (thread === undefined || recoveryPending) {
    return (
      <div style={{ color: fv("text") }}>
        {topBar}
        <div className="flex flex-col gap-2.5" aria-busy="true">
          <ForumPlaceholder height={200} />
          <ForumPlaceholder height={80} />
        </div>
      </div>
    );
  }

  if (thread === null || thread.withdrawn || hiddenByMode) {
    return (
      <div style={{ color: fv("text") }}>
        {topBar}
        <p className="text-sm py-8 text-center" style={{ color: fv("muted") }}>
          {error ?? "This post isn't available."}
        </p>
      </div>
    );
  }

  const author = authors.get(thread.id) ?? UNKNOWN_AUTHOR;
  const visibleReplies = replies;
  const canReply = thread.status === "published" && !thread.locked;

  return (
    <div className="flex flex-col" style={{ color: fv("text") }}>
      {topBar}

      {thread.status === "removed" ? (
        <RemovedNote kind="post" />
      ) : (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            <AuthorInitial author={author} identity={thread.identity} size={40} />
            <div className="flex flex-col min-w-0">
              <AuthorName author={author} size={15} />
              <span className="text-xs" style={{ color: fv("muted") }}>
                {forumAge(thread.createdAt)}
                {thread.editedAt ? " · edited" : ""}
                {thread.pinned ? " · pinned" : ""}
              </span>
            </div>
          </div>
          {thread.status === "held" && <HeldNote />}
          {editing && "threadId" in editing.ref ? (
            editFields("post")
          ) : (
            <>
              <h2 className="m-0 text-xl font-extrabold [overflow-wrap:anywhere] [text-wrap:balance]">{thread.title}</h2>
              <p className="m-0 text-sm leading-[1.6] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ color: fv("body") }}>
                {thread.body}
              </p>
            </>
          )}
          {thread.photoPath && (
            <div className="rounded-[14px] overflow-hidden" style={{ background: fv("photo-bg"), minHeight: photoUrl ? undefined : 180 }}>
              {photoUrl && <img src={photoUrl} alt="Photo attached to the post" className="w-full max-h-[420px] object-cover" />}
            </div>
          )}
          {thread.status === "published" && (
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => void toggleLike()}
                aria-pressed={liked}
                aria-label={`${liked ? "Unlike" : "Like"}, ${thread.reactionCount} ${thread.reactionCount === 1 ? "like" : "likes"}`}
                className="tap h-11 rounded-full px-[14px] flex gap-1.5 items-center text-[13px] font-bold"
                style={{ border: `1px solid ${fv("border")}`, background: fv("card"), color: fv("text") }}
              >
                <HeartIcon filled={liked} color={liked ? fv("accent") : fv("muted")} /> {thread.reactionCount}
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}

      <div className="mt-[14px] pt-3 flex flex-col gap-[14px] grow" style={{ borderTop: `1px solid ${fv("rule")}` }}>
        <span className="text-[13px] font-extrabold" style={{ color: fv("muted") }}>
          {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
        </span>
        {visibleReplies.map((r) =>
          r.status === "removed" ? (
            <RemovedNote key={r.id} kind="reply" radius={12} />
          ) : (
            <ReplyRow
              key={r.id}
              reply={r}
              author={authors.get(r.id) ?? UNKNOWN_AUTHOR}
              onSafety={(label) => setSheet({ ref: { replyId: r.id }, kind: "reply", label })}
              onOwn={() => setOwn({ ref: { replyId: r.id }, kind: "reply", createdAt: r.createdAt })}
              editor={editing && "replyId" in editing.ref && editing.ref.replyId === r.id ? editFields("reply") : null}
            />
          )
        )}
      </div>

      {canReply ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="sticky z-20 bottom-[calc(env(safe-area-inset-bottom)+88px)] lg:bottom-4 mt-4 -mx-3 px-3 pt-2.5 pb-3 flex flex-col gap-2 rounded-2xl"
          style={{ borderTop: `1px solid ${fv("rule")}`, background: fv("card") }}
        >
          {!isProfessional && nickname && (
            <label className="flex items-center gap-1.5 text-xs" style={{ color: fv("muted") }}>
              Reply as
              <select
                value={replyAs}
                onChange={(e) => setReplyAs(e.target.value as Identity)}
                className="h-8 rounded-[10px] text-xs font-bold min-w-0 max-w-full px-1"
                style={{ border: `1px solid ${fv("border")}`, color: fv("text"), background: fv("card") }}
              >
                <option value="nickname">{nickname} (nickname)</option>
                <option value="real_name">{firstName} (your name)</option>
              </select>
            </label>
          )}
          {replyError && (
            <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3 py-2">
              {replyError}
            </p>
          )}
          <div className="flex gap-2 items-center">
            <label
              className="grow min-w-0 h-11 rounded-[22px] flex items-center px-[14px]"
              style={{ border: `1px solid ${fv("border")}` }}
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a reply"
                aria-label="Write a reply"
                maxLength={4000}
                className="border-none outline-none text-sm grow min-w-0 bg-transparent"
                style={{ color: fv("text") }}
              />
            </label>
            <button
              type="submit"
              aria-label="Send reply"
              disabled={!draft.trim() || sending}
              className="tap w-11 h-11 rounded-[22px] flex items-center justify-center shrink-0 disabled:opacity-50"
              style={{ background: fv("accent") }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={fv("on-accent")} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
          </div>
        </form>
      ) : (
        thread.locked &&
        thread.status === "published" && (
          <p className="mt-4 text-[13px] text-center" style={{ color: fv("muted") }}>
            This post isn't taking new replies.
          </p>
        )
      )}

      <OwnPostSheet
        open={!!own}
        onClose={() => setOwn(null)}
        target={own?.ref ?? null}
        kind={own?.kind ?? "post"}
        createdAt={own?.createdAt ?? thread.createdAt}
        onEdit={startEdit}
        onWithdrawn={() => {
          const kind = own?.kind;
          setOwn(null);
          if (kind === "post") back();
          else void load();
        }}
      />

      <ForumSafetySheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        target={sheet?.ref ?? null}
        kind={sheet?.kind ?? "post"}
        authorLabel={sheet?.label ?? ""}
        onBlocked={() => {
          const kind = sheet?.kind;
          setSheet(null);
          // Their thread is gone from view; a blocked reply author's replies go too.
          if (kind === "post") back();
          else void load();
        }}
      />
    </div>
  );
}

type Loaded = {
  thread: ForumThread | null;
  replies: ForumReply[];
  authors: Map<string, Author>;
  liked: boolean;
  photoUrl: string | null;
  error: string | null;
};

/** Everything the post page shows, fetched the same way whatever the reader's settings. */
async function loadPost(threadId: string): Promise<Loaded> {
  const [t, r] = await Promise.all([fetchThread(threadId), fetchReplies(threadId)]);
  if (!t.ok) return { thread: null, replies: [], authors: new Map(), liked: false, photoUrl: null, error: t.message };
  const rs = r.ok ? r.value : [];
  const [a, likes, photos] = await Promise.all([
    fetchAuthors(t.value ? [t.value.id] : [], rs.map((x) => x.id)),
    fetchMyLikes(t.value ? [t.value.id] : []),
    signPhotos(t.value?.photoPath ? [t.value.photoPath] : []),
  ]);
  return {
    thread: t.value,
    replies: rs,
    authors: a,
    liked: !!t.value && likes.has(t.value.id),
    photoUrl: t.value?.photoPath ? photos.get(t.value.photoPath) ?? null : null,
    error: r.ok ? null : r.message,
  };
}

function ReplyRow({
  reply,
  author,
  onSafety,
  onOwn,
  editor,
}: {
  reply: ForumReply;
  author: Author;
  onSafety: (label: string) => void;
  onOwn: () => void;
  editor: React.ReactNode;
}) {
  return (
    <div className="flex gap-2.5">
      <AuthorInitial author={author} identity={reply.identity} size={32} />
      <div className="flex flex-col gap-1 min-w-0 grow">
        <span className="flex gap-1.5 items-center flex-wrap">
          <AuthorName author={author} size={13} />
          <span className="text-xs" style={{ color: fv("muted") }}>
            {forumAge(reply.createdAt)}
            {reply.editedAt ? " · edited" : ""}
          </span>
          {(author.isMine ? reply.status !== "removed" : reply.status === "published") && (
            <button
              type="button"
              aria-label={author.isMine ? "Edit or withdraw" : "Report or block"}
              onClick={() => (author.isMine ? onOwn() : onSafety(author.label))}
              className="tap ml-auto w-8 h-8 -my-1.5 flex items-center justify-center shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={fv("muted")} aria-hidden="true">
                <circle cx="5" cy="12" r="1.8" />
                <circle cx="12" cy="12" r="1.8" />
                <circle cx="19" cy="12" r="1.8" />
              </svg>
            </button>
          )}
        </span>
        {reply.status === "held" && <HeldNote />}
        {editor ?? (
          <span className="text-[13px] leading-[1.5] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ color: fv("body") }}>
            {reply.body}
          </span>
        )}
      </div>
    </div>
  );
}
