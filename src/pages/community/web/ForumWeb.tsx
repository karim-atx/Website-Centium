import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertCircle, Ban, EllipsisVertical, Flag, Heart, MessageCircle, Pencil, Trash2 } from "lucide-react";
import {
  fetchAuthors,
  fetchMyLikes,
  fetchThreads,
  likeThread,
  signPhotos,
  THREAD_PAGE,
  UNKNOWN_AUTHOR,
  type Author,
  type ForumThread,
} from "../../../services/forum";
import { composeChips, filterChips, hiddenInRecovery, initialOf, initialsOf, type ForumCategory } from "../../../services/forum/rules";
import { mentionsSelfHarm } from "../../../services/moderation/phrases";
import { orderCategories } from "../../../components/forum/categoryColour";
import { forumMetaLine } from "../../../components/forum/age";
import { OwnPhotoBadge } from "../../../components/forum/parts";
import { WarningNotice } from "../../../components/forum/WarningNotice";
import { ForumSafetySheet } from "../../../components/forum/ForumSafetySheet";
import { OwnPostSheet } from "../../../components/forum/OwnPostSheet";
import { CentiumMark } from "../../../components/icons/CentiumMark";
import { Toast } from "../../../components/ui/Toast";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { t, tn } from "../../../i18n/core";
import { MenuWeb, type MenuWebAt, type MenuWebOption } from "./MenuWeb";
import { coCaps, coCategory, coDanger, coEmptyBox, coEmptyTile } from "./communityWebStyles";

type MenuValue = "edit" | "withdraw" | "report" | "block";
const offlineOr = (message: string) =>
  typeof navigator !== "undefined" && navigator.onLine === false ? t("You're offline. Try again when you're connected.") : message;

/** The initials circle (36 #E7E2F6 #5F5093 15/700; a verified professional #E7F2F0 #3C6B65): one letter for a nickname, two for a name. */
export function Initials({ author, nickname, size }: { author: Author; nickname: boolean; size: 32 | 36 }) {
  const pro = !!author.professionalId;
  return (
    <span
      aria-hidden
      className="grid place-items-center shrink-0"
      style={{ width: size, height: size, borderRadius: 999, background: pro ? "#E7F2F0" : "#E7E2F6", color: pro ? "#3C6B65" : "#5F5093", fontSize: size === 36 ? 15 : 13, fontWeight: 700 }}
    >
      {nickname ? initialOf(author.label) : initialsOf(author.label)}
    </span>
  );
}

/** A verified professional's chip beside their name (r6, padding 1 6, #E7F2F0 #3C6B65 11/700). */
export function ProChip() {
  return (
    <span className="shrink-0" style={{ borderRadius: 6, padding: "1px 6px", background: "#E7F2F0", color: "#3C6B65", fontSize: 11, lineHeight: "16px", fontWeight: 700 }}>
      {t("Professional")}
    </span>
  );
}

/** The author's own held post's line: the gentle words when it mentions self-harm (decided on this device, as on mobile). */
function HeldLine({ text }: { text: string }) {
  const [gentle, setGentle] = useState(false);
  useEffect(() => {
    let live = true;
    void mentionsSelfHarm(text).then((m) => live && setGentle(m));
    return () => {
      live = false;
    };
  }, [text]);
  return (
    <p style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
      {gentle ? `${t("Only you can see this for now.")} ${t("If you're going through something hard, you don't have to face it alone.")}` : `${t("Held for review.")} ${t("Only you can see this until our team checks it.")}`}
    </p>
  );
}

/**
 * Website viewport v1, WC-CO Forum (WC-CO Community Web v3, screen "forum",
 * literal): an 8 : 4 grid (1 : 1 with the rail), 24 apart. Left: the
 * category chips (a 5 r14 #F4F3F9 track of equal-width 30 r10 chips, 15/24
 * 600; selected #A198DF white) and the posts, 10 apart (r20, padding 16,
 * 0.5px rgba(36,31,27,0.08) with the 2.7 inline-start edge in the category
 * colour, hover #FAFAFB): the 36 initials, the name 15/20 700, the category
 * pill and the age pill (24, 13/20), the title 17/24 700, two lines of the
 * body 15/22 #5B5349 and the likes and replies 13/700 #7D6BB5 with 15 icons.
 * Right: the nickname card, the rules card with the C mark, the author's
 * posts waiting for review and the Categories card (#FAF9FD, 44 tinted
 * tiles). Same data and rules as mobile: recovery mode hides Nutrition and
 * Progress, older posts load on scroll, likes are optimistic, a right-click
 * or the ⋮ (shown on hover) opens Report / Block (Edit / Withdraw on your
 * own post).
 */
export function ForumWeb({
  userId,
  categories,
  nickname,
  recoveryOn,
  recoveryPending,
}: {
  userId: string;
  categories: ForumCategory[];
  nickname: string | null;
  recoveryOn: boolean;
  recoveryPending: boolean;
}) {
  const navigate = useNavigate();
  const { rail } = useWebLayout();
  const [filter, setFilter] = useState<string | null>(null);
  const [page, setPage] = useState<{ key: string | null; threads: ForumThread[]; more: boolean } | null>(null);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [photos, setPhotos] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<{ key: string | null; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const [menu, setMenu] = useState<{ at: MenuWebAt; thread: ForumThread; mine: boolean; label: string } | null>(null);
  const [sheet, setSheet] = useState<{ mode: "withdraw" | "report" | "block"; threadId: string; label: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const seq = useRef(0);
  const refresh = () => setReloadKey((n) => n + 1);

  const byKey = useMemo(() => new Map(categories.map((c) => [c.key, c])), [categories]);
  const chips = orderCategories(filterChips(categories, recoveryOn));
  const legend = orderCategories(composeChips(categories, recoveryOn));
  const activeFilter = filter && recoveryOn && hiddenInRecovery(byKey.get(filter)) ? null : filter;
  const threads = page && page.key === activeFilter ? page.threads : null;
  const more = !!page && page.key === activeFilter && page.more;
  const shownError = error && error.key === activeFilter ? error.message : null;

  const decorate = useCallback(async (list: ForumThread[]) => {
    const [a, p, l] = await Promise.all([
      fetchAuthors(list.map((x) => x.id), []),
      signPhotos(list.map((x) => x.photoPath).filter((x): x is string => !!x)),
      fetchMyLikes(list.map((x) => x.id)),
    ]);
    setAuthors((prev) => new Map([...prev, ...a]));
    setPhotos((prev) => new Map([...prev, ...p]));
    setLikes((prev) => new Set([...prev, ...l]));
  }, []);

  useEffect(() => {
    const mine = ++seq.current;
    const key = activeFilter;
    void fetchThreads({ categoryKey: key }).then(async (r) => {
      if (mine !== seq.current) return;
      if (!r.ok) {
        setError({ key, message: offlineOr(t("Couldn't load the forum.")) });
        setPage({ key, threads: [], more: false });
        return;
      }
      await decorate(r.value);
      if (mine !== seq.current) return;
      setError(null);
      setPage({ key, threads: r.value, more: r.value.length === THREAD_PAGE });
    });
  }, [activeFilter, decorate, reloadKey]);

  const retry = () => {
    setError(null);
    setPage(null);
    refresh();
  };

  const loadMore = async () => {
    if (!threads || loadingMore) return;
    const oldest = [...threads].filter((x) => !x.pinned).pop();
    if (!oldest) return;
    setLoadingMore(true);
    const mine = seq.current;
    const key = activeFilter;
    const r = await fetchThreads({ categoryKey: key, before: oldest.createdAt });
    if (mine !== seq.current) {
      setLoadingMore(false);
      return;
    }
    if (r.ok) {
      await decorate(r.value);
      const seen = new Set(threads.map((x) => x.id));
      setPage({ key, threads: [...threads, ...r.value.filter((x) => !seen.has(x.id))], more: r.value.length === THREAD_PAGE });
    } else setError({ key, message: offlineOr(t("Couldn't load the forum.")) });
    setLoadingMore(false);
  };

  // Older posts load as the end of the list comes within 400px (as mobile).
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const el = sentinel.current;
    if (!more || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) void loadMoreRef.current();
    }, { rootMargin: "0px 0px 400px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [more, threads]);

  const toggleLike = async (th: ForumThread) => {
    const next = !likes.has(th.id);
    const bump = (d: number) =>
      setPage((pg) => pg && { ...pg, threads: pg.threads.map((x) => (x.id === th.id ? { ...x, reactionCount: Math.max(0, x.reactionCount + d) } : x)) });
    const mark = (on: boolean) =>
      setLikes((prev) => {
        const s = new Set(prev);
        if (on) s.add(th.id);
        else s.delete(th.id);
        return s;
      });
    mark(next);
    bump(next ? 1 : -1);
    const r = await likeThread(th.id, userId, next);
    if (!r.ok) {
      mark(!next);
      bump(next ? -1 : 1);
      setToast(t("Couldn't save. Try again."));
    }
  };

  const shown = (threads ?? []).filter((x) => !(recoveryOn && hiddenInRecovery(byKey.get(x.categoryKey))));
  const held = shown.filter((x) => x.status === "held");
  const feed = shown.filter((x) => x.status === "published");
  const loading = recoveryPending || threads === null;

  const menuOptions = (mine: boolean, label: string): MenuWebOption<MenuValue>[] =>
    mine
      ? [
          { value: "edit", label: t("Edit"), icon: <Pencil size={16} strokeWidth={1.75} /> },
          { value: "withdraw", label: t("Withdraw post"), icon: <Trash2 size={16} strokeWidth={1.75} />, destructive: true },
        ]
      : [
          { value: "report", label: t("Report post"), icon: <Flag size={16} strokeWidth={1.75} /> },
          { value: "block", label: t("Block {name}", { name: label }), icon: <Ban size={16} strokeWidth={1.75} />, destructive: true },
        ];

  return (
    <div data-co-forum style={{ display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,8fr) minmax(0,4fr)", gap: 24, alignItems: "start" }}>
      <div className="flex flex-col" style={{ minWidth: 0, gap: 12 }}>
        {/* The chips: equal widths across the column (recovery mode's hidden ones never shown, even while it loads). */}
        <div
          data-row="chips"
          role="group"
          aria-label={t("Categories")}
          className="grid"
          style={{ flex: "none", gridTemplateColumns: `repeat(${recoveryPending ? 5 : chips.length + 1},minmax(0,1fr))`, gap: 5, padding: 5, borderRadius: 14, background: "#F4F3F9" }}
        >
          {recoveryPending
            ? [0, 1, 2, 3, 4].map((i) => <span key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: 30, borderRadius: 10 }} />)
            : [{ key: null as string | null, name: t("All") }, ...chips].map((c) => {
                const on = activeFilter === c.key;
                return (
                  <button
                    key={c.key ?? "all"}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(c.key)}
                    className="co-web-chip whitespace-nowrap"
                    title={c.name}
                    style={{ minWidth: 0, height: 30, padding: "0 8px", borderRadius: 10, fontSize: 15, lineHeight: "24px", fontWeight: 600, background: on ? "#A198DF" : "transparent", color: on ? "#FFFFFF" : "#5B5349" }}
                  >
                    {c.name}
                  </button>
                );
              })}
        </div>

        <WarningNotice />

        {shownError && (
          <p role="alert" className="flex flex-wrap items-center" style={{ ...coDanger, columnGap: 8 }}>
            <span>{shownError}</span>
            <button type="button" onClick={retry} className="co-web-focus" style={{ fontWeight: 700, color: "#7D6BB5" }}>
              {t("Retry")}
            </button>
          </p>
        )}

        {loading ? (
          <div className="flex flex-col" style={{ gap: 10 }} aria-busy="true">
            {[202, 181, 181].map((h, i) => (
              <div key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: h, borderRadius: 20 }} />
            ))}
          </div>
        ) : feed.length === 0 ? (
          !shownError && (
            <div style={coEmptyBox} data-co-empty>
              <span style={coEmptyTile} aria-hidden>
                <MessageCircle size={26} strokeWidth={1.75} />
              </span>
              <p style={{ margin: "10px 0 0", fontSize: 17, lineHeight: "24px", fontWeight: 700 }}>{t("No posts here yet")}</p>
              <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#8C8378" }}>{t("Start the conversation.")}</p>
            </div>
          )
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {feed.map((th) => {
              const author = authors.get(th.id) ?? UNKNOWN_AUTHOR;
              return (
                <PostCard
                  key={th.id}
                  thread={th}
                  author={author}
                  categoryName={byKey.get(th.categoryKey)?.name ?? ""}
                  photoUrl={th.photoPath ? photos.get(th.photoPath) ?? null : null}
                  liked={likes.has(th.id)}
                  menuOpen={menu?.thread.id === th.id}
                  onLike={() => void toggleLike(th)}
                  onOpen={() => navigate(`/app/forum/post/${th.id}`)}
                  onMenu={(at) => setMenu({ at, thread: th, mine: author.isMine, label: author.label })}
                />
              );
            })}
            {more && (
              <>
                <div ref={sentinel} aria-hidden style={{ height: 1, marginTop: -10 }} />
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="sr-only focus:not-sr-only focus:self-center co-web-focus"
                  style={{ fontSize: 13, fontWeight: 700, color: "#7D6BB5" }}
                >
                  {t("Load older posts")}
                </button>
              </>
            )}
            {loadingMore && (
              <p role="status" style={{ margin: 0, textAlign: "center", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                {t("Loading older posts…")}
              </p>
            )}
          </div>
        )}
      </div>

      <aside className="flex flex-col" style={{ minWidth: 0, gap: 12, position: "sticky", top: 88 }}>
        {nickname && (
          <div data-co-nickname className="flex items-start justify-between" style={{ borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.1)", padding: "14px 16px", gap: 10 }}>
            <span style={{ fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
              {t("Your nickname:")} <b style={{ color: "#241F1B" }}>{nickname}</b>. {t("You choose nickname or name each time you post.")}
            </span>
            <Link to="/app/forum/nickname" className="co-web-focus shrink-0 no-underline" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#7D6BB5", borderRadius: 4 }}>
              {t("Edit")}
            </Link>
          </div>
        )}
        <div data-co-rules className="flex items-start" style={{ gap: 12, borderRadius: 20, padding: "14px 16px", background: "#F5F3FC", border: "0.5px solid rgba(174,161,220,0.35)" }}>
          <span aria-hidden className="grid place-items-center shrink-0" style={{ width: 20, height: 20 }}>
            <CentiumMark framing="png" height={20} />
          </span>
          <span style={{ fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
            <b style={{ color: "#5F5093" }}>{t("Community rules:")}</b>{" "}
            {t("Be kind, share experience rather than medical advice, and report anything that worries you. Posts here aren't a substitute for a doctor.")}
          </span>
        </div>
        {!loading && held.length > 0 && (
          <div data-co-held className="flex flex-col" style={{ gap: 8 }}>
            <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: "1.3px", textTransform: "uppercase", color: "#7D6BB5", paddingBottom: 7, borderBottom: "1.5px solid #AEA1DC" }}>
              {t("Your post, waiting for review")}
            </span>
            {held.map((th) => (
              <button
                key={th.id}
                type="button"
                onClick={() => navigate(`/app/forum/post/${th.id}`)}
                className="co-web-card text-start"
                style={{ borderRadius: 20, border: "0.5px solid rgba(36,31,27,0.08)", padding: "12px 16px", background: "#FFFFFF" }}
              >
                <p className="[overflow-wrap:anywhere]" style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700, color: "#241F1B" }}>{th.title}</p>
                <HeldLine text={[th.title ?? "", th.body ?? ""].join("\n")} />
              </button>
            ))}
          </div>
        )}
        <div data-card="categories" className="flex flex-col" style={{ flex: "none", borderRadius: 20, background: "#FAF9FD", padding: 16, gap: 12 }}>
          <p style={coCaps}>{t("Categories")}</p>
          {recoveryPending
            ? [0, 1, 2].map((i) => <span key={i} aria-hidden className="animate-skeleton-pulse bg-cream-soft" style={{ height: 44, borderRadius: 12 }} />)
            : legend.map((c) => {
                const col = coCategory(c.key);
                return (
                  <span
                    key={c.key}
                    data-tile="cat"
                    className="flex items-center"
                    style={{ flex: "none", height: 44, boxSizing: "border-box", borderRadius: 12, padding: "0 14px", gap: 10, fontSize: 15, fontWeight: 600, background: `${col.strong}24`, color: col.strong }}
                  >
                    <span aria-hidden style={{ width: 10, height: 10, borderRadius: 999, flex: "none", background: col.strong }} />
                    <span className="truncate">{c.name}</span>
                  </span>
                );
              })}
        </div>
      </aside>

      <MenuWeb<MenuValue>
        at={menu?.at ?? null}
        label={t("Post options")}
        options={menu ? menuOptions(menu.mine, menu.label) : []}
        onClose={() => setMenu(null)}
        onSelect={(v) => {
          const m = menu;
          if (!m) return;
          if (v === "edit") navigate(`/app/forum/post/${m.thread.id}`);
          else setSheet({ mode: v, threadId: m.thread.id, label: m.label });
        }}
      />
      <OwnPostSheet
        open={sheet?.mode === "withdraw"}
        onClose={() => setSheet(null)}
        target={sheet ? { threadId: sheet.threadId } : null}
        kind="post"
        onWithdrawn={() => {
          setSheet(null);
          refresh();
        }}
      />
      <ForumSafetySheet
        open={sheet?.mode === "report" || sheet?.mode === "block"}
        mode={sheet?.mode === "block" ? "block" : "report"}
        onClose={() => setSheet(null)}
        target={sheet ? { threadId: sheet.threadId } : null}
        kind="post"
        authorLabel={sheet?.label ?? ""}
        onBlocked={() => {
          setSheet(null);
          refresh();
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} icon={<AlertCircle size={16} strokeWidth={2} className="text-status-high" aria-hidden />} />
    </div>
  );
}

function PostCard({
  thread,
  author,
  categoryName,
  photoUrl,
  liked,
  menuOpen,
  onLike,
  onOpen,
  onMenu,
}: {
  thread: ForumThread;
  author: Author;
  categoryName: string;
  photoUrl: string | null;
  liked: boolean;
  menuOpen: boolean;
  onLike: () => void;
  onOpen: () => void;
  onMenu: (at: MenuWebAt) => void;
}) {
  const col = coCategory(thread.categoryKey);
  const moreRef = useRef<HTMLButtonElement>(null);
  return (
    <div
      role="link"
      tabIndex={0}
      data-forum-card=""
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.target === e.currentTarget && e.key === "Enter") onOpen();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (moreRef.current) onMenu({ x: e.clientX, y: e.clientY, anchor: moreRef.current });
      }}
      className="co-web-card relative flex flex-col cursor-pointer"
      style={{ flex: "none", borderRadius: 20, padding: 16, gap: 10, border: "0.5px solid rgba(36,31,27,0.08)", borderInlineStart: `2.7px solid ${col.strong}`, background: "#FFFFFF" }}
    >
      <button
        ref={moreRef}
        type="button"
        aria-label={t("Post options")}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={(e) => {
          e.stopPropagation();
          onMenu({ anchor: e.currentTarget });
        }}
        className="co-web-more co-web-back absolute grid place-items-center"
        style={{ top: 12, insetInlineEnd: 12, width: 32, height: 32, borderRadius: 999 }}
      >
        <EllipsisVertical size={18} color="#8C8378" aria-hidden />
      </button>
      <div className="flex items-center" style={{ gap: 10 }}>
        <Initials author={author} nickname={thread.identity === "nickname"} size={36} />
        <div className="flex flex-col" style={{ flex: 1, minWidth: 0, gap: 3 }}>
          <span className="flex items-center" style={{ gap: 6, fontSize: 15, lineHeight: "20px", fontWeight: 700, whiteSpace: "nowrap", minWidth: 0 }}>
            {author.professionalId ? (
              <Link to={`/app/professionals/${author.professionalId}`} onClick={(e) => e.stopPropagation()} className="truncate no-underline" style={{ color: "#241F1B" }}>
                {author.label}
              </Link>
            ) : (
              <span className="truncate">{author.label}</span>
            )}
            {author.professionalId && <ProChip />}
          </span>
          <span className="flex items-center flex-wrap" style={{ gap: 6 }}>
            {categoryName && (
              <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 5, height: 24, padding: "0 9px", borderRadius: 999, fontSize: 13, lineHeight: "20px", fontWeight: 700, background: `${col.ink}1F`, color: col.ink }}>
                <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: col.ink }} />
                {categoryName}
              </span>
            )}
            <span className="inline-flex items-center whitespace-nowrap" style={{ height: 24, padding: "0 9px", borderRadius: 999, fontSize: 13, lineHeight: "20px", fontWeight: 600, background: "#F5F5F6", color: "#8C8378" }}>
              {forumMetaLine(thread.createdAt, thread.pinned, true)}
            </span>
          </span>
        </div>
      </div>
      <div className="[overflow-wrap:anywhere]" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700 }}>{thread.title}</div>
      {thread.body && (
        <div className="line-clamp-2 [overflow-wrap:anywhere]" style={{ marginTop: -6, fontSize: 15, lineHeight: "22px", color: "#5B5349" }}>
          {thread.body}
        </div>
      )}
      {thread.photoPath && (photoUrl || author.isMine) && (
        <div className="relative overflow-hidden bg-cream-soft" style={{ height: 120, borderRadius: 12 }}>
          {photoUrl && <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />}
          {author.isMine && <OwnPhotoBadge threadId={thread.id} />}
        </div>
      )}
      <div className="flex" style={{ gap: 16, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: "#7D6BB5" }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          aria-pressed={liked}
          aria-label={`${liked ? t("Unlike") : t("Like")}, ${tn(thread.reactionCount, "{n} like", "{n} likes")}`}
          className="co-web-focus flex items-center"
          style={{ gap: 5, borderRadius: 6 }}
        >
          <Heart size={15} strokeWidth={1.75} color="#9A8CD6" fill={liked ? "#9A8CD6" : "none"} aria-hidden />
          {thread.reactionCount}
        </button>
        <span className="flex items-center whitespace-nowrap" style={{ gap: 5 }}>
          <MessageCircle size={15} strokeWidth={1.75} color="#9A8CD6" aria-hidden />
          {tn(thread.replyCount, "{n} reply", "{n} replies")}
        </span>
      </div>
    </div>
  );
}
