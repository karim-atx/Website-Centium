import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, EllipsisVertical, MessageCircle, Send } from "lucide-react";
import {
  createReply,
  editPost,
  fetchAuthors,
  fetchMyLikes,
  fetchMyReplyLikes,
  fetchReplies,
  fetchThread,
  likeReply,
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
import { AuthorInitial, AuthorName, ForumPlaceholder, HeartIcon, HeldNote, ProfessionalBadge, RemovedNote } from "./parts";
import { fv } from "./forumColor";
import { PopupMenu } from "../ui/PopupMenu";
import { useIsDark } from "../../hooks/useIsDark";
import { categoryColours } from "./categoryColour";

// Design screen 2: one post, its replies, and the reply bar, restyled to
// mobile v5.1 MO1.3.3: a "Post" top bar, the post's header card in its
// category colour (A20), an absolute time, a likes and replies row, icon
// actions, likes on replies (A21) and a "Reply as" chip. Not shown: "Member
// since" (A19) and "Replying to", which waits for threaded replies (A21).
// Every moderation and safety piece stays (A25): own-post edit and withdraw,
// report and block, held, removed and locked notes, "edited", photos.
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
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [replyMenu, setReplyMenu] = useState(false);
  const [replyAnchor, setReplyAnchor] = useState<HTMLButtonElement | null>(null);
  const replyInput = useRef<HTMLInputElement>(null);
  const dark = useIsDark();
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
    setLikedReplies(d.likedReplies);
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

  // A like on a reply (A21), optimistic like the post's.
  const toggleReplyLike = async (reply: ForumReply) => {
    const next = !likedReplies.has(reply.id);
    const flip = (on: boolean, d: number) => {
      setLikedReplies((prev) => {
        const s2 = new Set(prev);
        if (on) s2.add(reply.id);
        else s2.delete(reply.id);
        return s2;
      });
      setReplies((prev) => prev.map((x) => (x.id === reply.id ? { ...x, reactionCount: Math.max(0, x.reactionCount + d) } : x)));
    };
    flip(next, next ? 1 : -1);
    const res = await likeReply(reply.id, userId, next);
    if (!res.ok) {
      flip(!next, next ? -1 : 1);
      setError(res.message);
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

  // MO1.3.3 #1: a 56 pt bar over the content, full width, padding 12 12 0,
  // gap 10, 94% card fill and a hairline under it; title 17/800, ArrowLeft 19/2.
  const topBar = (
    <div
      className="sticky top-0 z-20 -mx-4 mb-3.5 px-3 pt-[max(env(safe-area-inset-top),12px)] flex items-center justify-between"
      style={{ background: `color-mix(in srgb, ${fv("card")} 94%, transparent)`, borderBottom: `1px solid ${fv("rule")}` }}
    >
      <span className="flex items-center gap-2.5">
        <button type="button" onClick={back} aria-label="Back" className="tap w-11 h-11 flex items-center justify-center">
          <ArrowLeft size={19} strokeWidth={2} style={{ color: fv("text") }} />
        </button>
        <span className="text-[17px] font-extrabold">Post</span>
      </span>
      {thread && !hiddenByMode && !recoveryPending && thread.status !== "removed" && (authors.get(thread.id)?.isMine ?? false) ? (
        <button
          type="button"
          aria-label="Edit or withdraw"
          onClick={() => setOwn({ ref: { threadId: thread.id }, kind: "post", createdAt: thread.createdAt })}
          className="tap w-11 h-11 flex items-center justify-center"
        >
          <EllipsisVertical size={18} style={{ color: fv("muted") }} aria-hidden />
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
          <EllipsisVertical size={18} style={{ color: fv("muted") }} aria-hidden />
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
  const postColours = categoryColours(thread.categoryKey, dark);

  return (
    <div className="flex flex-col" style={{ color: fv("text") }}>
      {topBar}

      {thread.status === "removed" ? (
        <RemovedNote kind="post" />
      ) : (
        <div className="flex flex-col gap-3">
          {/* MO1.3.3 #2: the header card in the category's colour, radius 20,
              padding 16 16 18. */}
          <div
            className="relative overflow-hidden rounded-[20px] px-4 pt-4 pb-[18px] flex flex-col gap-3"
            style={{ background: postColours.strong, color: postColours.onStrong }}
          >
            <span aria-hidden className="absolute -right-10 -top-8 w-40 h-40 rounded-full" style={{ background: "rgba(255,255,255,0.10)" }} />
            <div className="relative flex items-center gap-3">
              {/* MO1.3.3: a 52 pt avatar, measured from the frame (2x, 106 px
                  across), as a 3 pt white ring round 46. */}
              <span className="rounded-full p-[3px] shrink-0" style={{ background: "#FFFFFF" }}>
                <AuthorInitial author={author} identity={thread.identity} size={46} />
              </span>
              <div className="min-w-0 flex flex-col gap-1">
                <span className="flex items-center gap-1.5 flex-wrap min-w-0">
                  {author.professionalId ? (
                    <Link to={`/app/professionals/${author.professionalId}`} className="text-[15.5px] font-extrabold no-underline [overflow-wrap:anywhere]" style={{ color: postColours.onStrong }}>
                      {author.label}
                    </Link>
                  ) : (
                    <span className="text-[15.5px] font-extrabold [overflow-wrap:anywhere]">{author.label}</span>
                  )}
                  {author.professionalId && <ProfessionalBadge />}
                </span>
                <span className="flex items-center gap-2 flex-wrap">
                  {/* MO1.3.3 #2: the tag 10.5/800 in the category colour on white. */}
                  {category && (
                    <span
                      className="inline-flex items-center gap-1 h-5 px-2.5 rounded-full text-[10.5px] font-extrabold"
                      style={{ background: "#FFFFFF", color: categoryColours(thread.categoryKey, false).strong }}
                    >
                      <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: categoryColours(thread.categoryKey, false).strong }} />
                      {category.name}
                    </span>
                  )}
                  {(thread.pinned || thread.editedAt) && (
                    <span className="text-[12px] font-semibold opacity-90">
                      {[thread.pinned ? "Pinned" : null, thread.editedAt ? "Edited" : null].filter(Boolean).join(" · ")}
                    </span>
                  )}
                </span>
              </div>
            </div>
            {!(editing && "threadId" in editing.ref) && (
              <h2 className="relative m-0 text-[21px] font-extrabold leading-tight [overflow-wrap:anywhere] [text-wrap:balance]">{thread.title}</h2>
            )}
          </div>
          {thread.status === "held" && <HeldNote />}
          {editing && "threadId" in editing.ref ? (
            editFields("post")
          ) : (
            <p className="m-0 text-base leading-[1.6] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ color: fv("body") }}>
              {thread.body}
            </p>
          )}
          {thread.photoPath && (
            <div className="rounded-[14px] overflow-hidden" style={{ background: fv("photo-bg"), minHeight: photoUrl ? undefined : 180 }}>
              {photoUrl && <img src={photoUrl} alt="Photo attached to the post" className="w-full max-h-[420px] object-cover" />}
            </div>
          )}
          <p className="m-0 text-[13px]" style={{ color: fv("muted") }}>
            {postTime(thread.createdAt)}
          </p>
          {thread.status === "published" && (
            <>
              <div className="flex gap-[18px] py-3 text-[14px]" style={{ borderTop: `1px solid ${fv("rule")}`, borderBottom: `1px solid ${fv("rule")}`, color: fv("muted") }}>
                <span>
                  <strong className="font-extrabold" style={{ color: fv("text") }}>{thread.reactionCount}</strong>{" "}
                  {thread.reactionCount === 1 ? "Like" : "Likes"}
                </span>
                <span>
                  <strong className="font-extrabold" style={{ color: fv("text") }}>{thread.replyCount}</strong>{" "}
                  {thread.replyCount === 1 ? "Reply" : "Replies"}
                </span>
              </div>
              <div className="flex -mt-3 pb-1" style={{ borderBottom: `1px solid ${fv("rule")}` }}>
                <button
                  type="button"
                  onClick={() => replyInput.current?.focus()}
                  disabled={!canReply}
                  aria-label="Reply"
                  className="tap flex-1 h-11 flex items-center justify-center disabled:opacity-40"
                  style={{ color: fv("accent") }}
                >
                  <MessageCircle size={20} strokeWidth={1.75} />
                </button>
                <button
                  type="button"
                  onClick={() => void toggleLike()}
                  aria-pressed={liked}
                  aria-label={`${liked ? "Unlike" : "Like"}, ${thread.reactionCount} ${thread.reactionCount === 1 ? "like" : "likes"}`}
                  className="tap flex-1 h-11 flex items-center justify-center"
                >
                  <HeartIcon filled={liked} color={fv("accent")} size={20} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}

      <div className="pt-4 flex flex-col gap-[18px] grow">
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
              liked={likedReplies.has(r.id)}
              onLike={() => void toggleReplyLike(r)}
              onReply={canReply ? () => replyInput.current?.focus() : undefined}
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
            // MO1.3.3 #9: "Reply as" 11.5/400, gap 6, and a 26 pt chip at 12/700
            // (12 measured from the frame).
            <span className="flex items-center gap-1.5 text-[11.5px]" style={{ color: fv("muted") }}>
              Reply as
              {/* MO1.3.3: a chip that opens the choice (was a native select). */}
              <button
                ref={setReplyAnchor}
                type="button"
                onClick={() => setReplyMenu(true)}
                aria-haspopup="menu"
                aria-label={`Reply as ${replyAs === "nickname" ? nickname : firstName}`}
                className="tap h-[26px] rounded-full px-3 flex items-center gap-1 text-[12px] font-bold"
                style={{ background: fv("rules-bg"), color: fv("rules-ink") }}
              >
                {replyAs === "nickname" ? nickname : firstName}
                <ChevronDown size={12} />
              </button>
            </span>
          )}
          {replyError && (
            <p role="alert" className="m-0 text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3 py-2">
              {replyError}
            </p>
          )}
          <div className="flex gap-2 items-center">
            {/* MO1.3.3 #10: 49 tall, padding 5 5 5 6, gap 8; the letter 13/700, Send 15. */}
            <label
              className="grow min-w-0 h-[49px] rounded-full flex items-center gap-2 py-[5px] pl-1.5 pr-[5px]"
              style={{ border: `1px solid ${fv("border")}` }}
            >
              <span
                aria-hidden
                className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-bold shrink-0"
                style={{ background: fv("teal-bg"), color: fv("teal-ink") }}
              >
                {((replyAs === "nickname" && nickname ? nickname : firstName) || "?").charAt(0).toUpperCase()}
              </span>
              <input
                ref={replyInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write a reply"
                aria-label="Write a reply"
                maxLength={4000}
                className="border-none outline-none text-sm grow min-w-0 bg-transparent"
                style={{ color: fv("text") }}
              />
              <button
                type="submit"
                aria-label="Send reply"
                disabled={!draft.trim() || sending}
                className="tap w-9 h-9 rounded-full flex items-center justify-center shrink-0 disabled:opacity-50"
                style={{ background: fv("accent"), color: fv("on-accent") }}
              >
                <Send size={15} />
              </button>
            </label>
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

      {!isProfessional && nickname && (
        <PopupMenu<Identity>
          open={replyMenu}
          onClose={() => setReplyMenu(false)}
          anchor={replyAnchor}
          align="left"
          options={[
            { value: "nickname", label: nickname, note: "Your nickname" },
            { value: "real_name", label: firstName, note: "Your first name" },
          ]}
          selected={replyAs}
          onSelect={setReplyAs}
        />
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
  likedReplies: Set<string>;
  photoUrl: string | null;
  error: string | null;
};

/** MO1.3.3's absolute time: "9:14 AM · Aug 24, 2026". */
function postTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  return `${time} · ${date}`;
}

/** Everything the post page shows, fetched the same way whatever the reader's settings. */
async function loadPost(threadId: string): Promise<Loaded> {
  const [t, r] = await Promise.all([fetchThread(threadId), fetchReplies(threadId)]);
  if (!t.ok) return { thread: null, replies: [], authors: new Map(), liked: false, likedReplies: new Set(), photoUrl: null, error: t.message };
  const rs = r.ok ? r.value : [];
  const [a, likes, replyLikes, photos] = await Promise.all([
    fetchAuthors(t.value ? [t.value.id] : [], rs.map((x) => x.id)),
    fetchMyLikes(t.value ? [t.value.id] : []),
    fetchMyReplyLikes(rs.map((x) => x.id)),
    signPhotos(t.value?.photoPath ? [t.value.photoPath] : []),
  ]);
  return {
    thread: t.value,
    replies: rs,
    authors: a,
    liked: !!t.value && likes.has(t.value.id),
    likedReplies: replyLikes,
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
  liked,
  onLike,
  onReply,
}: {
  reply: ForumReply;
  author: Author;
  onSafety: (label: string) => void;
  onOwn: () => void;
  editor: React.ReactNode;
  liked: boolean;
  onLike: () => void;
  onReply?: () => void;
}) {
  return (
    <div className="flex gap-3">
      <AuthorInitial author={author} identity={reply.identity} size={40} />
      <div className="flex flex-col gap-1 min-w-0 grow">
        <span className="flex gap-1.5 items-center flex-wrap">
          <AuthorName author={author} size={15} />
          {/* MO1.3.3 #7: age 12.5/400. */}
          <span className="text-[12.5px]" style={{ color: fv("muted") }}>
            · {forumAge(reply.createdAt)}
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
          <span className="text-[14px] leading-[1.5] whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ color: fv("body") }}>
            {reply.body}
          </span>
        )}
        {reply.status === "published" && !editor && (
          <span className="flex items-center gap-5 mt-1 text-[13px]" style={{ color: fv("muted") }}>
            {onReply && (
              <button type="button" onClick={onReply} aria-label="Reply" className="tap -my-2 py-2">
                <MessageCircle size={15} strokeWidth={1.75} />
              </button>
            )}
            <button
              type="button"
              onClick={onLike}
              aria-pressed={liked}
              aria-label={`${liked ? "Unlike" : "Like"} reply, ${reply.reactionCount} ${reply.reactionCount === 1 ? "like" : "likes"}`}
              className="tap flex items-center gap-1.5 -my-2 py-2"
            >
              <HeartIcon filled={liked} color={liked ? fv("accent") : fv("muted")} size={15} />
              {reply.reactionCount > 0 && <span className="tabular-nums">{reply.reactionCount}</span>}
            </button>
          </span>
        )}
      </div>
    </div>
  );
}
