import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Ban, ChevronDown, EllipsisVertical, Flag, Heart, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
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
} from "../../../services/forum";
import { hiddenInRecovery, initialOf, initialsOf, type ForumCategory } from "../../../services/forum/rules";
import { forumAgeText, forumMetaLine } from "../../../components/forum/age";
import { HeldNote, OwnPhotoBadge, RemovedNote } from "../../../components/forum/parts";
import { ForumSafetySheet } from "../../../components/forum/ForumSafetySheet";
import { OwnPostSheet } from "../../../components/forum/OwnPostSheet";
import { GuidelinesLink } from "../../../components/moderation/GuidelinesLink";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { appLocale } from "../../../i18n/format";
import { t, tn, tx } from "../../../i18n/core";
import { MenuWeb, type MenuWebAt, type MenuWebOption } from "./MenuWeb";
import { Initials, ProChip } from "./ForumWeb";
import { coCategory, coDanger } from "./communityWebStyles";

type MenuValue = "edit" | "withdraw" | "report" | "block";
type MenuTarget = { at: MenuWebAt; ref: PostRef; kind: "post" | "reply"; mine: boolean; createdAt: string; label: string };
type Loaded = {
  thread: ForumThread | null;
  replies: ForumReply[];
  authors: Map<string, Author>;
  liked: boolean;
  likedReplies: Set<string>;
  photoUrl: string | null;
  error: string | null;
};

async function loadPost(threadId: string): Promise<Loaded> {
  const [th, r] = await Promise.all([fetchThread(threadId), fetchReplies(threadId)]);
  if (!th.ok) return { thread: null, replies: [], authors: new Map(), liked: false, likedReplies: new Set(), photoUrl: null, error: th.message };
  const rs = r.ok ? r.value : [];
  const [a, likes, replyLikes, photos] = await Promise.all([
    fetchAuthors(th.value ? [th.value.id] : [], rs.map((x) => x.id)),
    fetchMyLikes(th.value ? [th.value.id] : []),
    fetchMyReplyLikes(rs.map((x) => x.id)),
    signPhotos(th.value?.photoPath ? [th.value.photoPath] : []),
  ]);
  return {
    thread: th.value,
    replies: rs,
    authors: a,
    liked: !!th.value && likes.has(th.value.id),
    likedReplies: replyLikes,
    photoUrl: th.value?.photoPath ? photos.get(th.value.photoPath) ?? null : null,
    error: r.ok ? null : r.message,
  };
}

/** "9:14 AM · Aug 24, 2026", the hover title of the age. */
function postTime(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleTimeString(appLocale("en-US"), { hour: "numeric", minute: "2-digit" })} · ${d.toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", year: "numeric" })}`;
}

function menuOptions(m: MenuTarget): MenuWebOption<MenuValue>[] {
  const post = m.kind === "post";
  if (m.mine) {
    const minutes = Math.ceil(editTimeLeft(m.createdAt) / 60_000);
    return [
      {
        value: "edit",
        label: t("Edit"),
        icon: <Pencil size={16} strokeWidth={1.75} />,
        disabled: minutes <= 0,
        note: minutes > 0 ? tn(minutes, "{n} minute left to edit", "{n} minutes left to edit") : t("Editable for 30 minutes after posting"),
      },
      { value: "withdraw", label: post ? t("Withdraw post") : t("Withdraw reply"), icon: <Trash2 size={16} strokeWidth={1.75} />, destructive: true },
    ];
  }
  return [
    { value: "report", label: post ? t("Report post") : t("Report reply"), icon: <Flag size={16} strokeWidth={1.75} /> },
    { value: "block", label: t("Block {name}", { name: m.label }), icon: <Ban size={16} strokeWidth={1.75} />, destructive: true },
  ];
}

const Danger = ({ children }: { children: string }) => (
  <p role="alert" style={coDanger}>
    {children}
    <GuidelinesLink message={children} />
  </p>
);

const RulesCard = () => (
  <div data-co-rules className="flex items-start" style={{ gap: 12, borderRadius: 20, padding: "14px 16px", background: "#F5F3FC", border: "0.5px solid rgba(174,161,220,0.35)" }}>
    <span style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
      <b style={{ color: "#5F5093" }}>{t("Community rules:")}</b>{" "}
      {t("Be kind, share experience rather than medical advice, and report anything that worries you. Posts here aren't a substitute for a doctor.")}
    </span>
  </div>
);

/**
 * Website viewport v1, WC-CO.1 Post (WC-CO Community Web v3, "post",
 * literal): an 8 : 4 grid (1 : 1 with the rail). Left: the header card in the
 * category colour (r20, padding 18 20, white: the 36 initial on white 20%,
 * the name 15/700 over "Category · age" 13 at 80%, the ⋮ 18; the title
 * 24/32 700 14 under), the body 17/28, the likes and replies 15/700 #7D6BB5
 * (16 icons), then the replies over a divider (32 initials, a #F7F7F8 r14
 * bubble: the name 13/700 with "· age" 500 #8C8378, the text 15/22) and the
 * reply bar (r16, 1px rgba(36,31,27,0.1), padding 6 6 6 12: the "Reply as"
 * chip 32 #F0EDF9 #5F5093 13/700, the field 15, Send 40 r12 #9A8CD6). Right:
 * the rules card. Same behaviour as mobile: likes on the post and on replies,
 * the ⋮ (Report / Block, or Edit for 30 minutes and Withdraw on your own),
 * a right-click on a reply for the same menu, held, removed and locked
 * notes, the photo.
 */
export function ForumPostWeb({
  threadId,
  userId,
  firstName,
  nickname,
  categories,
  recoveryOn,
  recoveryPending,
  onGone,
  onTitle,
}: {
  threadId: string;
  userId: string;
  firstName: string;
  nickname: string | null;
  categories: ForumCategory[];
  recoveryOn: boolean;
  recoveryPending: boolean;
  /** After the post is withdrawn or its author blocked: back to the forum. */
  onGone: () => void;
  /** The header's title: the post's category once it has loaded. */
  onTitle: (title: string | null) => void;
}) {
  const { rail } = useWebLayout();
  const [thread, setThread] = useState<ForumThread | null | undefined>(undefined);
  const [replies, setReplies] = useState<ForumReply[]>([]);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [liked, setLiked] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  const [likedReplies, setLikedReplies] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [replyAs, setReplyAs] = useState<Identity>(nickname ? "nickname" : "real_name");
  const [replyMenu, setReplyMenu] = useState<MenuWebAt | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [menu, setMenu] = useState<MenuTarget | null>(null);
  const [sheet, setSheet] = useState<{ mode: "withdraw" | "report" | "block"; ref: PostRef; kind: "post" | "reply"; label: string } | null>(null);
  const [editing, setEditing] = useState<{ ref: PostRef; title?: string; body: string } | null>(null);
  const [editBusy, setEditBusy] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const replyInput = useRef<HTMLInputElement>(null);

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
  const titleName = thread && !hiddenByMode && !recoveryPending ? category?.name ?? null : null;
  useEffect(() => {
    onTitle(titleName);
  }, [titleName, onTitle]);

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
  const toggleReplyLike = async (reply: ForumReply) => {
    const next = !likedReplies.has(reply.id);
    const flip = (on: boolean, d: number) => {
      setLikedReplies((prev) => {
        const s = new Set(prev);
        if (on) s.add(reply.id);
        else s.delete(reply.id);
        return s;
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
    const r = await createReply({ userId, threadId: thread.id, identity: replyAs, body });
    setSending(false);
    if (!r.ok) {
      setReplyError(r.message);
      return;
    }
    setDraft("");
    const a = await fetchAuthors([], [r.value.id]);
    setAuthors((prev) => new Map([...prev, ...a]));
    setReplies((prev) => [...prev, r.value]);
    if (r.value.status === "published") setThread((x) => (x ? { ...x, replyCount: x.replyCount + 1 } : x));
  };

  const startEdit = (target: MenuTarget) => {
    if (!thread) return;
    if ("threadId" in target.ref) setEditing({ ref: target.ref, title: thread.title ?? "", body: thread.body ?? "" });
    else {
      const id = target.ref.replyId;
      setEditing({ ref: target.ref, body: replies.find((x) => x.id === id)?.body ?? "" });
    }
    setEditError(null);
  };
  const saveEdit = async () => {
    if (!editing || editBusy) return;
    const body = editing.body.trim();
    const title = editing.title?.trim();
    if (title !== undefined && title.length < 3) {
      setEditError(t("Give your post a title of at least 3 characters."));
      return;
    }
    if (!body) {
      setEditError(t("It can't be empty."));
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
    await load();
  };

  const editFields = (kind: "post" | "reply") =>
    editing && (
      <div className="flex flex-col" style={{ gap: 8 }} data-co-edit>
        {kind === "post" && editing.title !== undefined && (
          <input
            value={editing.title}
            onChange={(e) => setEditing({ ...editing, title: e.target.value })}
            maxLength={140}
            aria-label={t("Title")}
            style={{ minHeight: 48, borderRadius: 12, background: "#F5F5F6", padding: "12px 14px", fontSize: 17, lineHeight: "24px", fontWeight: 700, outline: "none", border: "none", color: "#241F1B" }}
          />
        )}
        <textarea
          value={editing.body}
          onChange={(e) => setEditing({ ...editing, body: e.target.value })}
          maxLength={kind === "post" ? 8000 : 4000}
          aria-label={kind === "post" ? t("Post") : t("Reply")}
          style={{ height: kind === "post" ? 160 : 96, borderRadius: 12, background: "#F5F5F6", padding: "12px 14px", fontSize: 15, lineHeight: "22px", resize: "none", outline: "none", border: "none", color: "#241F1B" }}
        />
        {editError && <Danger>{editError}</Danger>}
        <div className="flex justify-end" style={{ gap: 8 }}>
          <button type="button" onClick={() => setEditing(null)} disabled={editBusy} className="co-web-press" style={{ height: 40, padding: "0 16px", borderRadius: 12, background: "#F5F4FE", color: "#5B5349", fontSize: 15, lineHeight: "24px", fontWeight: 600 }}>
            {t("Cancel")}
          </button>
          <button type="button" onClick={() => void saveEdit()} disabled={editBusy} className="co-web-press" style={{ height: 40, padding: "0 16px", borderRadius: 12, background: "#9A8CD6", color: "#FFFFFF", fontSize: 15, lineHeight: "24px", fontWeight: 600, opacity: editBusy ? 0.6 : 1 }}>
            {editBusy ? t("Saving…") : t("Save")}
          </button>
        </div>
      </div>
    );

  const grid = { display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24, alignItems: "start" } as const;

  if (thread === undefined || recoveryPending) {
    return (
      <div style={grid} aria-busy="true">
        <div className="flex flex-col" style={{ gap: 12 }}>
          {[130, 84, 200].map((h, i) => (
            <div key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: h, borderRadius: 20 }} />
          ))}
        </div>
        <RulesCard />
      </div>
    );
  }
  if (thread === null || thread.withdrawn || hiddenByMode) {
    return (
      <div style={grid}>
        <p data-co-unavailable style={{ margin: 0, padding: "32px 0", textAlign: "center", fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>
          {error ?? t("This post isn't available.")}
        </p>
        <RulesCard />
      </div>
    );
  }

  const author = authors.get(thread.id) ?? UNKNOWN_AUTHOR;
  const mine = author.isMine;
  const canReply = thread.status === "published" && !thread.locked;
  const hasMenu = mine ? thread.status !== "removed" : thread.status === "published";
  const col = coCategory(thread.categoryKey);
  const replyName = (replyAs === "nickname" && nickname ? nickname : firstName) || "";

  return (
    <div style={grid} data-co-post>
      {/* The column fills the window under the header (64 + 24 + 24), so the reply bar sits at its foot as drawn; longer threads scroll the page with the bar pinned 24 above the bottom. */}
      <div className="flex flex-col" style={{ minWidth: 0, gap: 12, minHeight: "calc(100dvh - 112px)" }}>
        {thread.status === "removed" ? (
          <RemovedNote kind="post" />
        ) : (
          <>
            <div data-co-post-head style={{ flex: "none", borderRadius: 20, background: col.strong, color: "#FFFFFF", padding: "18px 20px" }}>
              <div className="flex items-center" style={{ gap: 10 }}>
                <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(255,255,255,0.2)", fontWeight: 700 }}>
                  {thread.identity === "nickname" ? initialOf(author.label) : initialsOf(author.label)}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="flex items-center" style={{ gap: 6, fontSize: 15, lineHeight: "20px", fontWeight: 700 }}>
                    {author.professionalId ? (
                      <Link to={`/app/professionals/${author.professionalId}`} className="truncate no-underline" style={{ color: "#FFFFFF" }}>
                        {author.label}
                      </Link>
                    ) : (
                      <span className="truncate">{author.label}</span>
                    )}
                    {author.professionalId && <ProChip />}
                  </span>
                  <span className="block" title={postTime(thread.createdAt)} style={{ fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.8)" }}>
                    {[category?.name, forumMetaLine(thread.createdAt, thread.pinned, true), thread.editedAt ? t("Edited") : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                {hasMenu && (
                  <button
                    type="button"
                    aria-label={t("More options")}
                    aria-haspopup="menu"
                    aria-expanded={menu?.kind === "post"}
                    onClick={(e) => setMenu({ at: { anchor: e.currentTarget }, ref: { threadId: thread.id }, kind: "post", mine, createdAt: thread.createdAt, label: author.label })}
                    className="co-web-focus grid place-items-center shrink-0"
                    style={{ width: 32, height: 32, borderRadius: 999, marginInlineEnd: -6 }}
                  >
                    <EllipsisVertical size={18} color="#FFFFFF" aria-hidden />
                  </button>
                )}
              </div>
              {!(editing && "threadId" in editing.ref) && (
                <p className="[overflow-wrap:anywhere]" style={{ margin: "14px 0 0", fontSize: 24, lineHeight: "32px", fontWeight: 700 }}>{thread.title}</p>
              )}
            </div>
            {thread.status === "held" && <HeldNote text={[thread.title ?? "", thread.body ?? ""].join("\n")} />}
            {editing && "threadId" in editing.ref ? (
              editFields("post")
            ) : (
              <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: 0, fontSize: 17, lineHeight: "28px", color: "#241F1B" }}>{thread.body}</p>
            )}
            {thread.photoPath && (photoUrl || mine) && (
              <div className="relative overflow-hidden bg-cream-soft" style={{ borderRadius: 14, minHeight: photoUrl ? undefined : 180 }}>
                {photoUrl && <img src={photoUrl} alt={t("Photo attached to the post")} className="w-full object-cover" style={{ maxHeight: 420 }} />}
                {mine && <OwnPhotoBadge threadId={thread.id} />}
              </div>
            )}
            {thread.status === "published" && (
              <div className="flex" style={{ gap: 16, fontSize: 15, lineHeight: "24px", fontWeight: 700, color: "#7D6BB5" }} data-co-counts>
                <button
                  type="button"
                  onClick={() => void toggleLike()}
                  aria-pressed={liked}
                  aria-label={`${liked ? t("Unlike") : t("Like")}, ${tn(thread.reactionCount, "{n} like", "{n} likes")}`}
                  className="co-web-focus flex items-center"
                  style={{ gap: 6, borderRadius: 6 }}
                >
                  <Heart size={16} strokeWidth={1.75} color="#9A8CD6" fill={liked ? "#9A8CD6" : "none"} aria-hidden />
                  {thread.reactionCount}
                </button>
                <button type="button" onClick={() => replyInput.current?.focus()} disabled={!canReply} className="co-web-focus flex items-center" style={{ gap: 6, borderRadius: 6 }}>
                  <MessageCircle size={16} strokeWidth={1.75} color="#9A8CD6" aria-hidden />
                  {tn(thread.replyCount, "{n} reply", "{n} replies")}
                </button>
              </div>
            )}
          </>
        )}

        {error && <Danger>{error}</Danger>}

        <div className="flex flex-col" style={{ flex: 1, gap: 10, borderTop: "1px solid rgba(36,31,27,0.06)", paddingTop: 12 }} data-co-replies>
          {replies.map((r) =>
            r.status === "removed" ? (
              <RemovedNote key={r.id} kind="reply" radius={14} />
            ) : (
              <ReplyRow
                key={r.id}
                reply={r}
                author={authors.get(r.id) ?? UNKNOWN_AUTHOR}
                liked={likedReplies.has(r.id)}
                onLike={() => void toggleReplyLike(r)}
                menuOpen={menu?.kind === "reply" && "replyId" in menu.ref && menu.ref.replyId === r.id}
                onMenu={(at, isMine, label) => setMenu({ at, ref: { replyId: r.id }, kind: "reply", mine: isMine, createdAt: r.createdAt, label })}
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
            className="flex flex-col"
            style={{ position: "sticky", bottom: 24, gap: 6, background: "#FFFFFF", zIndex: 5 }}
          >
            {replyError && <Danger>{replyError}</Danger>}
            <div data-co-replybar className="flex items-center" style={{ gap: 8, borderRadius: 16, border: "1px solid rgba(36,31,27,0.1)", padding: "6px 6px 6px 12px", paddingInlineStart: 12, paddingInlineEnd: 6, background: "#FFFFFF" }}>
              {nickname && (
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={!!replyMenu}
                  onClick={(e) => setReplyMenu({ anchor: e.currentTarget })}
                  className="co-web-focus flex items-center whitespace-nowrap shrink-0"
                  style={{ height: 32, padding: "0 10px", borderRadius: 999, background: "#F0EDF9", color: "#5F5093", fontSize: 13, lineHeight: "20px", fontWeight: 700, gap: 4 }}
                >
                  {t("Reply as {name}", { name: replyName })}
                  <ChevronDown size={14} aria-hidden />
                </button>
              )}
              <input
                ref={replyInput}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("Write a reply")}
                aria-label={t("Write a reply")}
                maxLength={4000}
                className="placeholder:text-[#8C8378]"
                style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 15, lineHeight: "24px", color: "#241F1B" }}
              />
              <button
                type="submit"
                aria-label={t("Send reply")}
                disabled={!draft.trim() || sending}
                className="co-web-press grid place-items-center shrink-0"
                style={{ width: 40, height: 40, borderRadius: 12, background: "#9A8CD6", opacity: !draft.trim() || sending ? 0.5 : 1 }}
              >
                <Send size={16} color="#FFFFFF" aria-hidden />
              </button>
            </div>
          </form>
        ) : (
          thread.locked &&
          thread.status === "published" && (
            <p style={{ margin: 0, textAlign: "center", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>{t("This post isn't taking new replies.")}</p>
          )
        )}
      </div>

      <aside className="flex flex-col" style={{ minWidth: 0, gap: 12, position: "sticky", top: 88 }}>
        <RulesCard />
      </aside>

      {nickname && (
        <MenuWeb<Identity>
          at={replyMenu}
          label={t("Reply as")}
          options={[
            { value: "nickname", label: nickname, note: t("Your nickname") },
            { value: "real_name", label: firstName, note: t("Your first name") },
          ]}
          selected={replyAs}
          onSelect={setReplyAs}
          onClose={() => setReplyMenu(null)}
        />
      )}
      <MenuWeb<MenuValue>
        at={menu?.at ?? null}
        label={t("More options")}
        options={menu ? menuOptions(menu) : []}
        onClose={() => setMenu(null)}
        onSelect={(v) => {
          const m = menu;
          if (!m) return;
          if (v === "edit") startEdit(m);
          else setSheet({ mode: v, ref: m.ref, kind: m.kind, label: m.label });
        }}
      />
      <OwnPostSheet
        open={sheet?.mode === "withdraw"}
        onClose={() => setSheet(null)}
        target={sheet?.ref ?? null}
        kind={sheet?.kind ?? "post"}
        onWithdrawn={() => {
          const kind = sheet?.kind;
          setSheet(null);
          if (kind === "post") onGone();
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
          if (kind === "post") onGone();
          else void load();
        }}
      />
    </div>
  );
}

function ReplyRow({
  reply,
  author,
  liked,
  onLike,
  menuOpen,
  onMenu,
  editor,
}: {
  reply: ForumReply;
  author: Author;
  liked: boolean;
  onLike: () => void;
  menuOpen: boolean;
  onMenu: (at: MenuWebAt, mine: boolean, label: string) => void;
  editor: React.ReactNode;
}) {
  const hasMenu = author.isMine ? reply.status !== "removed" : reply.status === "published";
  const moreRef = useRef<HTMLButtonElement>(null);
  return (
    <div
      className="co-web-reply flex"
      style={{ gap: 10 }}
      data-co-reply
      onContextMenu={
        hasMenu && !editor
          ? (e) => {
              e.preventDefault();
              if (moreRef.current) onMenu({ x: e.clientX, y: e.clientY, anchor: moreRef.current }, author.isMine, author.label);
            }
          : undefined
      }
    >
      <Initials author={author} nickname={reply.identity === "nickname"} size={32} />
      <div className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <div className="relative" style={{ borderRadius: 14, background: "#F7F7F8", padding: "10px 12px" }}>
          <p className="flex items-center flex-wrap" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, gap: 4, paddingInlineEnd: hasMenu ? 28 : 0 }}>
            {author.professionalId ? (
              <Link to={`/app/professionals/${author.professionalId}`} className="no-underline" style={{ color: "#241F1B" }}>
                {author.label}
              </Link>
            ) : (
              <span>{author.label}</span>
            )}
            {author.professionalId && <ProChip />}
            <span style={{ fontWeight: 500, color: "#8C8378" }}>
              · {forumAgeText(reply.createdAt)}
              {reply.editedAt ? ` · ${tx("edited", "forum reply")}` : ""}
            </span>
          </p>
          {hasMenu && (
            <button
              ref={moreRef}
              type="button"
              aria-label={t("More options")}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={(e) => onMenu({ anchor: e.currentTarget }, author.isMine, author.label)}
              className="co-web-more co-web-back absolute grid place-items-center"
              style={{ top: 6, insetInlineEnd: 6, width: 28, height: 28, borderRadius: 999 }}
            >
              <EllipsisVertical size={16} color="#8C8378" aria-hidden />
            </button>
          )}
          {reply.status === "held" && (
            <div style={{ marginTop: 6 }}>
              <HeldNote text={reply.body ?? ""} />
            </div>
          )}
          {editor ?? (
            <p className="whitespace-pre-wrap [overflow-wrap:anywhere]" style={{ margin: "2px 0 0", fontSize: 15, lineHeight: "22px", color: "#241F1B" }}>{reply.body}</p>
          )}
        </div>
        {reply.status === "published" && !editor && (
          <button
            type="button"
            onClick={onLike}
            aria-pressed={liked}
            aria-label={`${liked ? t("Unlike reply") : t("Like reply")}, ${tn(reply.reactionCount, "{n} like", "{n} likes")}`}
            className="co-web-focus self-start flex items-center"
            style={{ gap: 5, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#7D6BB5", borderRadius: 6, marginInlineStart: 12 }}
          >
            <Heart size={15} strokeWidth={1.75} color="#9A8CD6" fill={liked ? "#9A8CD6" : "none"} aria-hidden />
            {reply.reactionCount > 0 && <span className="tabular-nums">{reply.reactionCount}</span>}
          </button>
        )}
      </div>
    </div>
  );
}
