import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useBack } from "../../hooks/useBack";
import { ArrowLeft, Ban, ChevronDown, EllipsisVertical, Flag, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import {
  createReply,
  editPost,
  editTimeLeft,
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
import { AuthorInitial, AuthorName, DangerLine, ForumPlaceholder, HeartIcon, HeldNote, ProfessionalBadge, RemovedNote } from "./parts";
import { fv } from "./forumColor";
import { PopupMenu, type PopupMenuOption } from "../ui/PopupMenu";
import { useIsDark } from "../../hooks/useIsDark";
import { categoryColours } from "./categoryColour";

// Design screen 2: one post, its replies, and the reply bar, restyled to
// mobile v5.1 MO1.3.3: a "Post" top bar, the post's header card in its
// category colour (A20), an absolute time, a likes and replies row, icon
// actions, likes on replies (A21) and a "Reply as" chip. Not shown: "Member
// since" (needs the author's join year) and "Replying to" with its connector
// line and reply counts (need threaded replies): both wait on the backend.
// Handover-complete pass (2026-10-07): the ⋮ opens the Foundations dropdown
// menu (Edit / Withdraw on your own post or reply, Report / Block on someone
// else's); replies draw no ⋮ (a long press opens the same menu; the ⋮ stays
// for keyboards, visible only while focused). Safety and moderation pieces
// stay (KEEP-SAFETY): withdraw, report and block, held, removed and locked
// notes, "edited"; a post's photo stays so no uploaded photo is out of reach.
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
  // The ⋮ dropdown (MO1.3.3 #2) and the sheet one of its rows opens.
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [sheet, setSheet] = useState<{ mode: "withdraw" | "report" | "block"; ref: PostRef; kind: "post" | "reply"; label: string } | null>(null);
  // The edit in progress on the reader's own post or reply.
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

  // Batch E (E5): pops back to the forum; opened directly, replaces with it.
  const back = useBack("/app/forum");

  const startEdit = (target: MenuTarget) => {
    if (!thread) return;
    if ("threadId" in target.ref) setEditing({ ref: target.ref, title: thread.title ?? "", body: thread.body ?? "" });
    else {
      const id = target.ref.replyId;
      setEditing({ ref: target.ref, body: replies.find((x) => x.id === id)?.body ?? "" });
    }
    setEditError(null);
  };

  const onMenuPick = (v: MenuOption) => {
    const target = menu;
    if (!target) return;
    if (v === "edit") startEdit(target);
    else setSheet({ mode: v, ref: target.ref, kind: target.kind, label: target.label });
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
        {editError && <DangerLine>{editError}</DangerLine>}
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
  // Frame check: the bar sits at the very top (y 0), so it cancels the page's
  // 24 pt top padding (and the safe area, which its own padding re-adds).
  const topBar = (
    <div
      className="sticky top-0 z-20 -mx-4 -mt-[calc(env(safe-area-inset-top)+24px)] mb-3.5 px-3 pt-[calc(env(safe-area-inset-top)+12px)] flex items-center justify-between"
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
          aria-label="More options"
          aria-haspopup="menu"
          onClick={(e) =>
            setMenu({ anchor: e.currentTarget, ref: { threadId: thread.id }, kind: "post", mine: true, createdAt: thread.createdAt, label: "" })
          }
          className="tap w-11 h-11 flex items-center justify-center"
        >
          <EllipsisVertical size={18} style={{ color: fv("muted") }} aria-hidden />
        </button>
      ) : thread && !hiddenByMode && !recoveryPending && thread.status === "published" && !(authors.get(thread.id)?.isMine ?? false) ? (
        <button
          type="button"
          aria-label="More options"
          aria-haspopup="menu"
          onClick={(e) =>
            setMenu({
              anchor: e.currentTarget,
              ref: { threadId: thread.id },
              kind: "post",
              mine: false,
              createdAt: thread.createdAt,
              label: (authors.get(thread.id) ?? UNKNOWN_AUTHOR).label,
            })
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
              {/* 44 + the hairline = the frame's 46 row (was 4 more). */}
              <div className="flex -mt-3" style={{ borderBottom: `1px solid ${fv("rule")}` }}>
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

      {/* Decision 23 (item 70): plain danger lines, no box (here, in the
          edit fields and over the reply bar). */}
      {error && <DangerLine className="mt-3">{error}</DangerLine>}

      {/* First reply's avatar 12 under the action row (frame check; was 16). */}
      <div className="pt-3 flex flex-col gap-[18px] grow">
        {visibleReplies.map((r) =>
          r.status === "removed" ? (
            <RemovedNote key={r.id} kind="reply" radius={12} />
          ) : (
            <ReplyRow
              key={r.id}
              reply={r}
              author={authors.get(r.id) ?? UNKNOWN_AUTHOR}
              onMenu={(anchor, mine, label) =>
                setMenu({ anchor, ref: { replyId: r.id }, kind: "reply", mine, createdAt: r.createdAt, label })
              }
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
          // Frame check: the pill ends 20 above the navbar (pb 8, was 12).
          className="sticky z-20 bottom-[calc(env(safe-area-inset-bottom)+88px)] lg:bottom-4 mt-4 -mx-3 px-3 pt-2.5 pb-2 flex flex-col gap-2 rounded-2xl"
          style={{ borderTop: `1px solid ${fv("rule")}`, background: fv("card") }}
        >
          {!isProfessional && nickname && (
            // MO1.3.3 #9: "Reply as" 11.5/400, gap 6, and a 26 pt chip at 12/700
            // (12 measured from the frame).
            // Inset 6 from the pill's edge, as drawn (x 23; frame check).
            <span className="pl-1.5 flex items-center gap-1.5 text-[11.5px]" style={{ color: fv("muted") }}>
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
          {replyError && <DangerLine className="pl-1.5">{replyError}</DangerLine>}
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

      {/* MO1.3.3 #2: the ⋮ dropdown menu (Foundations › Dropdown menu: 15 pt
          leading icons, the destructive row in danger). Edit names how long
          is left of edit_forum_post's 30-minute window. */}
      <PopupMenu<MenuOption>
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        options={menu ? menuOptions(menu) : []}
        onSelect={onMenuPick}
      />

      <OwnPostSheet
        open={sheet?.mode === "withdraw"}
        onClose={() => setSheet(null)}
        target={sheet?.ref ?? null}
        kind={sheet?.kind ?? "post"}
        onWithdrawn={() => {
          const kind = sheet?.kind;
          setSheet(null);
          if (kind === "post") back();
          else void load();
        }}
      />

      <ForumSafetySheet
        open={sheet?.mode === "report" || sheet?.mode === "block"}
        mode={sheet?.mode === "block" ? "block" : "report"}
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

type MenuOption = "edit" | "withdraw" | "report" | "block";

type MenuTarget = {
  anchor: HTMLElement;
  ref: PostRef;
  kind: "post" | "reply";
  mine: boolean;
  createdAt: string;
  label: string;
};

/** The ⋮ menu's rows: your own post or reply, or someone else's. */
function menuOptions(t: MenuTarget): PopupMenuOption<MenuOption>[] {
  const noun = t.kind === "post" ? "post" : "reply";
  if (t.mine) {
    const minutes = Math.ceil(editTimeLeft(t.createdAt) / 60_000);
    return [
      {
        value: "edit",
        label: "Edit",
        icon: <Pencil size={15} strokeWidth={1.75} />,
        disabled: minutes <= 0,
        note: minutes > 0 ? `${minutes} ${minutes === 1 ? "minute" : "minutes"} left to edit` : "Editable for 30 minutes after posting",
      },
      { value: "withdraw", label: `Withdraw ${noun}`, icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
    ];
  }
  return [
    { value: "report", label: `Report ${noun}`, icon: <Flag size={15} strokeWidth={1.75} /> },
    { value: "block", label: `Block ${t.label}`, icon: <Ban size={15} strokeWidth={1.75} />, destructive: true },
  ];
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
  onMenu,
  editor,
  liked,
  onLike,
  onReply,
}: {
  reply: ForumReply;
  author: Author;
  /** Opens the ⋮ menu for this reply, anchored to the element given. */
  onMenu: (anchor: HTMLElement, mine: boolean, label: string) => void;
  editor: React.ReactNode;
  liked: boolean;
  onLike: () => void;
  onReply?: () => void;
}) {
  const hasMenu = author.isMine ? reply.status !== "removed" : reply.status === "published";
  const rowRef = useRef<HTMLDivElement>(null);
  const openMenu = (anchor?: HTMLElement | null) => {
    const el = anchor ?? rowRef.current;
    if (el) onMenu(el, author.isMine, author.label);
  };

  // A long press on the reply opens the ⋮ menu (edit / withdraw your own,
  // report / block someone else's), as Messages' bubbles do: 500 ms held,
  // cancelled by 10 px of movement so a scroll never fires it, and a
  // right-click as the mouse's long press. MO1.3.3 draws no ⋮ on a reply, so
  // the ⋮ button is visible only while focused: the keyboard and
  // screen-reader path to the same menu (handover-complete pass).
  const pressTimer = useRef<number | null>(null);
  const pressOrigin = useRef<{ x: number; y: number } | null>(null);
  const fired = useRef(false);
  const clearPress = () => {
    if (pressTimer.current !== null) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  useEffect(() => clearPress, []);
  // Not while the reply is being edited: a held finger there is selecting text.
  const press = hasMenu && !editor
    ? {
        onPointerDown: (e: React.PointerEvent) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          fired.current = false;
          pressOrigin.current = { x: e.clientX, y: e.clientY };
          clearPress();
          pressTimer.current = window.setTimeout(() => {
            fired.current = true;
            openMenu();
          }, 500);
        },
        onPointerMove: (e: React.PointerEvent) => {
          const o = pressOrigin.current;
          if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 10) clearPress();
        },
        onPointerUp: clearPress,
        onPointerCancel: clearPress,
        onPointerLeave: clearPress,
        onContextMenu: (e: React.MouseEvent) => {
          e.preventDefault();
          clearPress();
          if (!fired.current) openMenu();
          fired.current = false;
        },
        // A press that opened the menu must not also tap the like or reply
        // button it started on.
        onClickCapture: (e: React.MouseEvent) => {
          if (fired.current) {
            e.preventDefault();
            e.stopPropagation();
            fired.current = false;
          }
        },
      }
    : {};

  return (
    <div ref={rowRef} className="flex gap-3 [-webkit-touch-callout:none]" {...press}>
      <AuthorInitial author={author} identity={reply.identity} size={40} />
      <div className="flex flex-col gap-1 min-w-0 grow">
        <span className="flex gap-1.5 items-center flex-wrap">
          <AuthorName author={author} size={15} />
          {/* MO1.3.3 #7: age 12.5/400. */}
          <span className="text-[12.5px]" style={{ color: fv("muted") }}>
            · {forumAge(reply.createdAt)}
            {reply.editedAt ? " · edited" : ""}
          </span>
          {hasMenu && (
            <button
              type="button"
              aria-label="More options"
              aria-haspopup="menu"
              onClick={(e) => openMenu(e.currentTarget)}
              className="sr-only focus:not-sr-only focus:ml-auto focus:w-8 focus:h-8 focus:-my-1.5 focus:flex focus:items-center focus:justify-center focus:shrink-0"
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
