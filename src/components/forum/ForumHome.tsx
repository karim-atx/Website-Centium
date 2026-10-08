import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchAuthors,
  fetchMyLikes,
  signPhotos,
  fetchThreads,
  likeThread,
  THREAD_PAGE,
  UNKNOWN_AUTHOR,
  type Author,
  type ForumThread,
} from "../../services/forum";
import { filterChips, forumAge, hiddenInRecovery, type ForumCategory } from "../../services/forum/rules";
import { fv } from "./forumColor";
import { useIsDark } from "../../hooks/useIsDark";
import { categoryColours, orderCategories, type CategoryColours } from "./categoryColour";
import { WarningNotice } from "./WarningNotice";
import {
  AuthorInitial,
  AuthorName,
  EmptyBlock,
  ForumChip,
  ForumPlaceholder,
  HeartIcon,
  HeldNote,
  ReplyIcon,
} from "./parts";
import { AlertCircle, Ban, Flag, MessagesSquare, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { CentiumMark } from "../icons/CentiumMark";
import { PopupMenu, type PopupMenuOption } from "../ui/PopupMenu";
import { Toast } from "../ui/Toast";
import { ForumSafetySheet } from "./ForumSafetySheet";
import { OwnPostSheet } from "./OwnPostSheet";

// Design screen 1: the forum list, restyled to mobile v5.1 MO1.3.
//
// v6 MO1.3: the handover's own colours on the list (the user's colour rule
// ends decision 22's pre-R1 --forum-* light palette here; other forum
// screens still read it), the strip inside Community's fixed area, the long
// press menu (S7). Kept from A: the category colours (the card's edge and its
// pill, A20), the round New post button and tappable likes (A21). Handover-complete pass
// (2026-10-07): what the design does not draw is gone unless it is safety or
// privacy: the removed-post block is removed; the moderator warning, the held
// section and recovery-mode hiding stay (restyled), and older posts load on
// scroll with no visible control. Restore round (user, 2026-10-07): a post's
// photo is back on its card.
//
// RECOVERY-SENSITIVE MODE IS APPLIED HERE, ON THE DEVICE. The fetch below is
// the same whether the mode is on or off (every category, the same columns,
// labels and photos for every post fetched); Nutrition and Progress, and
// their posts, are simply not drawn. While the setting is still loading,
// neutral blocks stand where the chips and posts will be, so a post the mode
// would hide is never shown for a moment first.

export function ForumHome({
  userId,
  categories,
  nickname,
  isProfessional,
  recoveryOn,
  recoveryPending,
  stripSlot,
}: {
  userId: string;
  categories: ForumCategory[];
  nickname: string | null;
  isProfessional: boolean;
  recoveryOn: boolean;
  recoveryPending: boolean;
  /**
   * v6 MO1.3 #1: where the category strip renders, inside Community's
   * fixed area (a portal). null while that slot mounts (nothing drawn);
   * undefined draws the strip in place.
   */
  stripSlot?: HTMLElement | null;
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string | null>(null);
  // The list as last loaded, and for which filter. While a new filter loads,
  // the old list is not shown: `threads` reads null until `page.key` matches.
  const [page, setPage] = useState<{ key: string | null; threads: ForumThread[]; more: boolean } | null>(null);
  const [authors, setAuthors] = useState<Map<string, Author>>(new Map());
  const [photos, setPhotos] = useState<Map<string, string>>(new Map());
  const [error, setError] = useState<{ key: string | null; message: string } | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [likes, setLikes] = useState<Set<string>>(new Set());
  const seq = useRef(0);
  const dark = useIsDark();
  // S7: the long-press menu and the sheets behind it; O2: the like toast.
  const [menu, setMenu] = useState<{ anchor: HTMLElement; thread: ForumThread; mine: boolean; label: string } | null>(null);
  const [sheet, setSheet] = useState<{ mode: "withdraw" | "report" | "block"; threadId: string; label: string } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  // Bumped by Retry and after a withdraw or block, to re-read the list.
  const [reloadKey, setReloadKey] = useState(0);
  const refresh = () => setReloadKey((n) => n + 1);

  const byKey = useMemo(() => new Map(categories.map((c) => [c.key, c])), [categories]);
  // The design's order (A20): All · Nutrition · Workouts · Progress · Motivation.
  const chips = orderCategories(filterChips(categories, recoveryOn));
  // A chip recovery mode hides can't stay selected once the mode comes on:
  // the list falls back to All.
  const activeFilter = filter && recoveryOn && hiddenInRecovery(byKey.get(filter)) ? null : filter;
  const threads = page && page.key === activeFilter ? page.threads : null;
  const more = !!page && page.key === activeFilter && page.more;
  const shownError = error && error.key === activeFilter ? error.message : null;

  const decorate = useCallback(async (list: ForumThread[]) => {
    const [a, p, l] = await Promise.all([
      fetchAuthors(list.map((t) => t.id), []),
      signPhotos(list.map((t) => t.photoPath).filter((x): x is string => !!x)),
      fetchMyLikes(list.map((t) => t.id)),
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
        // O2 / O4 (OURS): our own line; the raw service message stays out.
        setError({ key, message: offlineOr("Couldn't load the forum.") });
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
    const oldest = [...threads].filter((t) => !t.pinned).pop();
    if (!oldest) return;
    setLoadingMore(true);
    const mine = seq.current;
    const key = activeFilter;
    const r = await fetchThreads({ categoryKey: key, before: oldest.createdAt });
    // A filter change meanwhile: drop the page, but free the loader for the new list.
    if (mine !== seq.current) {
      setLoadingMore(false);
      return;
    }
    if (r.ok) {
      await decorate(r.value);
      const seen = new Set(threads.map((t) => t.id));
      setPage({ key, threads: [...threads, ...r.value.filter((t) => !seen.has(t.id))], more: r.value.length === THREAD_PAGE });
    } else setError({ key, message: offlineOr("Couldn't load the forum.") });
    setLoadingMore(false);
  };

  // Load-on-scroll (decision 23, item 42): when the sentinel under the last
  // post comes within 400 px of the viewport, the next page loads. The ref
  // keeps the observer on the latest loadMore without re-creating it.
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMoreRef = useRef(loadMore);
  useEffect(() => {
    loadMoreRef.current = loadMore;
  });
  useEffect(() => {
    const el = sentinel.current;
    if (!more || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void loadMoreRef.current();
      },
      { rootMargin: "0px 0px 400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [more, threads]);

  // A like on the list (A21), optimistic: the count and the heart change at
  // once and go back if the write fails.
  const toggleLike = async (t: ForumThread) => {
    const next = !likes.has(t.id);
    const bump = (d: number) =>
      setPage((pg) => pg && { ...pg, threads: pg.threads.map((x) => (x.id === t.id ? { ...x, reactionCount: Math.max(0, x.reactionCount + d) } : x)) });
    const mark = (on: boolean) =>
      setLikes((prev) => {
        const s = new Set(prev);
        if (on) s.add(t.id);
        else s.delete(t.id);
        return s;
      });
    mark(next);
    bump(next ? 1 : -1);
    const r = await likeThread(t.id, userId, next);
    if (!r.ok) {
      // O2 (OURS): the heart reverts and a toast says so.
      mark(!next);
      bump(next ? -1 : 1);
      setToast("Couldn't save. Try again.");
    }
  };

  const shown = (threads ?? []).filter((t) => !(recoveryOn && hiddenInRecovery(byKey.get(t.categoryKey))));
  const held = shown.filter((t) => t.status === "held");
  // Handover-complete pass: a post a moderator removed is no longer drawn in
  // the list as a grey "Post removed by a moderator" block (MO1.3 draws none);
  // its page still says so to anyone who opens its link.
  const feed = shown.filter((t) => t.status === "published");

  // v6 MO1.3 #33 / #34: a round 56 button with a Plus; #AEA1DC with the FAB
  // shadow in light, #A991FE with no shadow in dark (--c-primary-fill; High
  // contrast #5B48B8). The Plus is white; in dark it takes #0D0B1A on the
  // light fill (V6-02 / X-11: the drawn white on #A991FE is 2.2:1). The
  // accessible name is MO1.3 §10's Plus = "Add".
  const fab = (
    <Link
      to="/app/forum/new"
      aria-label="Add"
      data-forum-fab=""
      className="tap fixed z-30 w-14 h-14 rounded-full flex items-center justify-center no-underline bg-primary-fill text-on-primary-fill shadow-fab dark:shadow-none bottom-[calc(env(safe-area-inset-bottom)+104px+var(--active-bar,0px))] right-[calc(var(--app-gutter)+20px)] lg:bottom-8 lg:right-8"
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );

  // MO1.3 #9-#11: the category strip, inside the fixed area (Community's
  // slot). Track #F4F3F9 (dark #242730, V6-93), r 12 0 0 12, pad 4, gap 4,
  // running off the right edge. K4: while the recovery setting loads, blocks
  // in the skeleton fill stand where the chips will be (32, r9), so a chip
  // the mode would hide is never shown for a moment first.
  const strip = recoveryPending ? (
    <div
      className="flex gap-1 -mr-4 p-1 pr-4 overflow-hidden bg-th-f4f3f9 dark:bg-cream-soft"
      style={{ borderRadius: "12px 0 0 12px" }}
      aria-hidden="true"
    >
      {[43, 80, 80, 74, 88].map((w, i) => (
        <div key={i} className="h-8 rounded-[9px] animate-skeleton-pulse shrink-0 bg-cream-soft" style={{ width: w }} />
      ))}
    </div>
  ) : (
    <div
      className="flex gap-1 overflow-x-auto no-scrollbar -mr-4 p-1 pr-4 bg-th-f4f3f9 dark:bg-cream-soft"
      style={{ borderRadius: "12px 0 0 12px" }}
      role="group"
      aria-label="Categories"
      data-forum-strip=""
    >
      <ForumChip inStrip active={activeFilter === null} onClick={() => setFilter(null)}>
        All
      </ForumChip>
      {chips.map((c) => (
        <ForumChip inStrip key={c.key} active={activeFilter === c.key} onClick={() => setFilter(c.key)}>
          {c.name}
        </ForumChip>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col gap-3 pb-28" style={{ color: fv("text") }}>
      {stripSlot ? createPortal(strip, stripSlot) : stripSlot === undefined ? strip : null}

      {/* K2 (KEEP-SAFETY): the moderator's warning, now under the fixed area,
          above the nickname line. */}
      <WarningNotice />

      {!isProfessional && nickname && (
        // #12-#14: 12/18 400 #8C8378 / #B8B3C7, the nickname 700 in charcoal,
        // Edit 12/18 700 #7D6BB5 / #C3B3FB 8 to the right (44 target). Flush
        // under the fixed area; scrolls away.
        <div className="text-[12px] leading-[18px] flex justify-between items-center gap-2 text-charcoal-faint" data-forum-nickname="">
          <span className="min-w-0">
            Your nickname: <strong className="font-bold text-charcoal">{nickname}</strong>. You choose nickname or name each
            time you post.
          </span>
          <Link
            to="/app/forum/nickname"
            className="font-bold no-underline shrink-0 py-2 -my-2"
            style={{ color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))" }}
          >
            Edit
          </Link>
        </div>
      )}

      {/* #15-#18: the rules card, pad 14 16, r20, #F5F3FC with 0.5px
          #AEA1DC@35% (dark #303141 with #A991FE@35%: the drawn #F5F3FC* is a
          light leak), 10 under the nickname line, 12 to the first post. The
          Centium mark in a 24 box (CentiumMark replaces the PNG / ThemedMark),
          12 to the text; text 12/19.2 #5B5349 / #B8B3C7 with the lead 700
          #5F5093 / #C3B3FB. Copy unchanged (safety). */}
      <div
        data-forum-rules=""
        className={`flex items-start gap-3 text-[12px] leading-[19.2px] rounded-[20px] px-4 py-3.5 border-[0.5px] text-charcoal-soft bg-th-f5f3fc dark:bg-th-303141 ${!isProfessional && nickname ? "-mt-0.5" : ""}`}
        style={{ borderColor: dark ? "rgb(169 145 254 / 0.35)" : "rgb(var(--th-aea1dc) / 0.35)" }}
      >
        <span className="w-6 h-6 shrink-0 flex items-center justify-center" aria-hidden="true">
          <CentiumMark framing="png" height={24} />
        </span>
        <span>
          <strong className="font-bold" style={{ color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-5f5093))" }}>
            Community rules:
          </strong>{" "}
          Be kind, share experience rather than medical advice, and report anything that worries you. Posts here aren't a
          substitute for a doctor.
        </span>
      </div>

      {/* O2 / O4 (OURS): our own line and a Retry text button. */}
      {shownError && (
        <p role="alert" className="m-0 flex flex-wrap items-center gap-x-2 text-[12.5px] leading-[18.8px] font-medium text-status-high">
          <span>{shownError}</span>
          <button
            type="button"
            onClick={retry}
            className="tap font-bold"
            style={{ color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))" }}
          >
            Retry
          </button>
        </p>
      )}

      {recoveryPending || threads === null ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          {/* O1: at the frame's card heights, in the skeleton fill. */}
          <ForumPlaceholder height={202} />
          <ForumPlaceholder height={181} />
          <ForumPlaceholder height={181} />
        </div>
      ) : (
        <>
          {held.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {/* K3 (KEEP-SAFETY): the handover's label style, 10.5/14 700
                  ls 1.3 uppercase #7D6BB5 / #C3B3FB. */}
              <span
                className="text-[10.5px] font-bold uppercase leading-[14px] tracking-[1.3px] pb-[7.5px] border-b-[1.5px] border-primary"
                style={{ color: dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))" }}
              >
                Your post, waiting for review
              </span>
              {held.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/app/forum/post/${t.id}`)}
                  className="tap text-left rounded-[20px] px-4 py-3 flex flex-col gap-1.5 bg-cream-card border-[0.5px] border-hair-08"
                >
                  <span className="text-[14.5px] leading-[20px] font-bold text-charcoal [overflow-wrap:anywhere]">{t.title}</span>
                  <HeldNote />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {feed.map((t) => {
              const author = authors.get(t.id) ?? UNKNOWN_AUTHOR;
              return (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  author={author}
                  categoryKey={t.categoryKey}
                  categoryName={byKey.get(t.categoryKey)?.name ?? ""}
                  photoUrl={t.photoPath ? photos.get(t.photoPath) ?? null : null}
                  colours={categoryColours(t.categoryKey, dark)}
                  liked={likes.has(t.id)}
                  dark={dark}
                  onLike={() => void toggleLike(t)}
                  onOpen={() => navigate(`/app/forum/post/${t.id}`)}
                  onMenu={(anchor) => setMenu({ anchor, thread: t, mine: author.isMine, label: author.label })}
                />
              );
            })}
            {/* O3 (OURS): Foundations › Empty state, tile r16 (as MO1.7.e). */}
            {feed.length === 0 && held.length === 0 && !shownError && (
              <EmptyBlock partB icon={<MessagesSquare size={26} strokeWidth={1.75} />} title="No posts here yet" line="Start the conversation." />
            )}
            {/* K7: older posts load as the end of the list scrolls into view,
                with no visible control. The sentinel is also a button that
                only shows while focused (keyboard path). */}
            {more && (
              <>
                <div ref={sentinel} aria-hidden="true" className="h-px -mt-2.5" />
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={loadingMore}
                  className="sr-only focus:not-sr-only focus:self-center focus:h-11 focus:px-4 focus:rounded-full text-[13px] font-bold"
                  style={{ color: fv("link") }}
                >
                  Load older posts
                </button>
              </>
            )}
            {loadingMore && (
              <p role="status" className="m-0 text-center text-[12px] text-charcoal-faint">
                Loading older posts…
              </p>
            )}
          </div>
        </>
      )}

      {/* S7 (NEW): long-press, right-click or the focus-only ⋮ on a card opens
          the same Foundations dropdown the post page uses: Report / Block for
          someone else's post, Edit / Withdraw for your own. Edit opens the
          post page (its 30-minute editor lives there). */}
      <PopupMenu<ListMenuOption>
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        options={menu ? listMenuOptions(menu.mine, menu.label) : []}
        onSelect={(v) => {
          const m = menu;
          setMenu(null);
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
          // K5: their posts are hidden server-side from now on; re-read.
          refresh();
        }}
      />

      {/* O2 (OURS): a failed like reverts the heart and says so. */}
      <Toast
        open={!!toast}
        message={toast ?? ""}
        onExpire={() => setToast(null)}
        icon={<AlertCircle size={16} strokeWidth={2} className="text-status-high" aria-hidden />}
      />

      {createPortal(fab, document.body)}
    </div>
  );
}

type ListMenuOption = "edit" | "withdraw" | "report" | "block";

/** S7: the list card's menu rows (the post page's, minus the edit timer). */
function listMenuOptions(mine: boolean, label: string): PopupMenuOption<ListMenuOption>[] {
  if (mine) {
    return [
      { value: "edit", label: "Edit", icon: <Pencil size={15} strokeWidth={1.75} /> },
      { value: "withdraw", label: "Withdraw post", icon: <Trash2 size={15} strokeWidth={1.75} />, destructive: true },
    ];
  }
  return [
    { value: "report", label: "Report post", icon: <Flag size={15} strokeWidth={1.75} /> },
    { value: "block", label: `Block ${label}`, icon: <Ban size={15} strokeWidth={1.75} />, destructive: true },
  ];
}

/** O4 (OURS): the offline wording for a failed read. */
const offlineOr = (message: string) =>
  typeof navigator !== "undefined" && navigator.onLine === false ? "You're offline. Try again when you're connected." : message;

/** "Pinned · 40d" or "38d ago" (MO1.3); "Just now" and "Yesterday" as they are. */
function metaLine(thread: ForumThread): string {
  const age = forumAge(thread.createdAt);
  if (thread.pinned) return `Pinned · ${age}`;
  return /^\d+[mhd]$/.test(age) ? `${age} ago` : age;
}

/**
 * MO1.3 #25: the category pill. Workouts is drawn: #5F5093 on #7D6BB5@12%,
 * dark #C3B3FB on #C3B3FB@12%. The other categories keep their A20 ink on a
 * 12% tint of that ink in light; in dark they keep the derived lifted pair.
 */
function pillColours(key: string, colours: CategoryColours, dark: boolean): { ink: string; pill: string } {
  if (key === "workouts") {
    return dark
      ? { ink: "rgb(var(--th-c3b3fb))", pill: "rgb(var(--th-c3b3fb) / 0.12)" }
      : { ink: "rgb(var(--th-5f5093))", pill: "rgb(var(--th-7d6bb5) / 0.12)" };
  }
  if (dark) return { ink: colours.ink, pill: colours.pill };
  return { ink: colours.ink, pill: `${colours.ink}1F` };
}

const LONG_PRESS_MS = 500;

function ThreadCard({
  thread,
  author,
  categoryKey,
  categoryName,
  photoUrl,
  colours,
  liked,
  dark,
  onLike,
  onOpen,
  onMenu,
}: {
  thread: ForumThread;
  author: Author;
  categoryKey: string;
  categoryName: string;
  photoUrl: string | null;
  colours: CategoryColours;
  liked: boolean;
  dark: boolean;
  onLike: () => void;
  onOpen: () => void;
  onMenu: (anchor: HTMLElement) => void;
}) {
  const replies = `${thread.replyCount} ${thread.replyCount === 1 ? "reply" : "replies"}`;
  const pill = pillColours(categoryKey, colours, dark);
  const cardRef = useRef<HTMLDivElement>(null);
  // S7: a 500 ms press opens the menu and swallows the click that follows.
  const press = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const cancelPress = () => {
    if (press.current) window.clearTimeout(press.current.timer);
  };
  const countInk = dark ? "rgb(var(--thi-c3b3fb))" : "rgb(var(--thi-7d6bb5))";
  const iconInk = dark ? "rgb(var(--c-primary-fill))" : "rgb(var(--th-9a8cd6))";
  return (
    <div
      ref={cardRef}
      role="link"
      tabIndex={0}
      data-forum-card=""
      onClick={() => {
        if (press.current?.fired) {
          press.current = null;
          return;
        }
        onOpen();
      }}
      onKeyDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter") onOpen();
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        if (cardRef.current) onMenu(cardRef.current);
      }}
      onPointerDown={(e) => {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        cancelPress();
        const start = { x: e.clientX, y: e.clientY };
        press.current = {
          ...start,
          fired: false,
          timer: window.setTimeout(() => {
            if (!press.current) return;
            press.current.fired = true;
            if (cardRef.current) onMenu(cardRef.current);
          }, LONG_PRESS_MS),
        };
      }}
      onPointerMove={(e) => {
        const p = press.current;
        if (p && !p.fired && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 8) cancelPress();
      }}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      // #19: pad 16, gap 10, r20, cream-card, 0.5px hairline (#241F1B@8% /
      // #F5F3FA@8%) with the 2.7px left edge in the category colour (A20; the
      // table's hairline-coloured edge is a slip, the PNG draws the colour).
      className="tap relative cursor-pointer rounded-[20px] p-4 flex flex-col gap-2.5 bg-cream-card border-[0.5px] border-hair-08 select-none [-webkit-touch-callout:none]"
      style={{ borderLeft: `2.7px solid ${colours.strong}` }}
    >
      {/* S7 keyboard path: a ⋮ that shows only while focused. */}
      <button
        type="button"
        aria-label="Post options"
        onClick={(e) => {
          e.stopPropagation();
          if (cardRef.current) onMenu(cardRef.current);
        }}
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:right-2 focus:w-11 focus:h-11 focus:rounded-full focus:flex focus:items-center focus:justify-center focus:bg-cream-soft text-charcoal-soft"
      >
        <MoreVertical size={18} strokeWidth={1.75} aria-hidden />
      </button>
      <div className="flex items-center gap-2.5">
        {/* #20 / #21: 36, 10 to the name; real-name posts the person glyph
            on #E7E2F6 (dark #303141), nickname posts their initial. */}
        <AuthorInitial author={author} identity={thread.identity} size={36} glyphForNames />
        <div className="grow min-w-0 flex flex-col gap-[3px]">
          {/* #22: 14/19 700 #241F1B / #F5F3FA, with the badge (#23 / #24). */}
          <AuthorName author={author} size={14} lineHeight={19} color="rgb(var(--c-charcoal))" />
          <span className="flex items-center gap-1.5 flex-wrap">
            {categoryName && (
              // #25: 20 tall, padding 0 8, dot 5 to the label, 10.5/15.8 700.
              <span
                className="inline-flex items-center gap-[5px] h-5 px-2 rounded-full text-[10.5px] leading-[15.8px] font-bold whitespace-nowrap"
                style={{ background: pill.pill, color: pill.ink }}
              >
                <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: pill.ink }} />
                {categoryName}
              </span>
            )}
            {/* #26: 20 tall, 0 8, 10.5/15.8 600 #8C8378 on #F5F5F6 / #B8B3C7
                on #242730; never wraps. */}
            <span className="inline-flex items-center h-5 px-2 rounded-full text-[10.5px] leading-[15.8px] font-semibold whitespace-nowrap bg-cream-soft text-charcoal-faint">
              {metaLine(thread)}
            </span>
          </span>
        </div>
      </div>
      {/* #27: 14.5/20 700, 12 under the header row. */}
      <div className="mt-[2px] text-[14.5px] font-bold leading-[20px] text-charcoal [overflow-wrap:anywhere]">{thread.title}</div>
      {thread.body && (
        // #28: 12.5/20 #5B5349 / #B8B3C7, 4 under the title, two lines.
        <div className="-mt-1.5 text-[12.5px] leading-[20px] line-clamp-2 text-charcoal-soft [overflow-wrap:anywhere]">{thread.body}</div>
      )}
      {/* K1: the post's photo, 120 tall r12; 12 to the counts. */}
      {thread.photoPath && (
        <div className="h-[120px] rounded-xl overflow-hidden bg-cream-soft">
          {photoUrl && <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" draggable={false} />}
        </div>
      )}
      {/* #29-#32: 12 under the body; likes and replies 14 apart, 12/18 700
          #7D6BB5 / #C3B3FB; Heart and MessageCircle 14 #9A8CD6 / #A991FE
          (the heart filled when liked). */}
      <div className="mt-[2px] h-[18px] flex gap-[14px] text-[12px] leading-[18px] font-bold items-center" style={{ color: countInk }}>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          aria-pressed={liked}
          aria-label={`${liked ? "Unlike" : "Like"}, ${thread.reactionCount} ${thread.reactionCount === 1 ? "like" : "likes"}`}
          className="tap flex gap-[5px] items-center -my-2 py-2 pr-1 font-bold"
        >
          <HeartIcon filled={liked} color={iconInk} size={14} /> {thread.reactionCount}
        </button>
        <span className="flex gap-[5px] items-center">
          <ReplyIcon color={iconInk} size={14} /> {replies}
        </span>
      </div>
    </div>
  );
}
