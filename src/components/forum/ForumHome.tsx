import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
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
} from "../../services/forum";
import { filterChips, forumAge, hiddenInRecovery, type ForumCategory } from "../../services/forum/rules";
import { fv } from "./forumColor";
import { useIsDark } from "../../hooks/useIsDark";
import { categoryColours, orderCategories, type CategoryColours } from "./categoryColour";
import { WarningNotice } from "./WarningNotice";
import {
  AuthorInitial,
  AuthorName,
  DangerLine,
  EmptyBlock,
  ForumChip,
  ForumPlaceholder,
  HeartIcon,
  HeldNote,
  RemovedNote,
  ReplyIcon,
} from "./parts";
import { MessagesSquare } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ThemedMark } from "../ui/ThemedMark";

// Design screen 1: the forum list, restyled to mobile v5.1 MO1.3.
//
// LIGHT MODE KEEPS THE FORUM'S OWN COLOURS (the --forum-* palette); the new
// parts are the category colours (the card's edge and its pill, A20), the
// round New post button and tappable likes (A21). Everything the design does
// not draw is kept: the moderator warning, the held section, older posts
// (loaded on scroll since decision 23), photos, recovery-mode hiding and the
// empty state (A25).
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
}: {
  userId: string;
  categories: ForumCategory[];
  nickname: string | null;
  isProfessional: boolean;
  recoveryOn: boolean;
  recoveryPending: boolean;
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
  const { colorTheme } = useApp();

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
        setError({ key, message: r.message });
        setPage({ key, threads: [], more: false });
        return;
      }
      await decorate(r.value);
      if (mine !== seq.current) return;
      setError(null);
      setPage({ key, threads: r.value, more: r.value.length === THREAD_PAGE });
    });
  }, [activeFilter, decorate]);

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
    } else setError({ key, message: r.message });
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
      mark(!next);
      bump(next ? -1 : 1);
      setError({ key: activeFilter, message: r.message });
    }
  };

  const shown = (threads ?? []).filter((t) => !(recoveryOn && hiddenInRecovery(byKey.get(t.categoryKey))));
  const held = shown.filter((t) => t.status === "held");
  const feed = shown.filter((t) => t.status !== "held");

  // MO1.3 #11: a round 56 pt button with a Plus (was an extended "New post"
  // pill); the accessible name is MO1.3 §10's Plus = "Add".
  const fab = (
    <Link
      to="/app/forum/new"
      aria-label="Add"
      className="tap fixed z-30 w-14 h-14 rounded-full flex items-center justify-center no-underline shadow-fab bottom-[calc(env(safe-area-inset-bottom)+104px+var(--active-bar,0px))] right-[calc(var(--app-gutter)+20px)] lg:bottom-8 lg:right-8"
      style={{ background: fv("accent"), color: fv("on-accent") }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </Link>
  );

  return (
    // -mt-0.5: the strip sits 10 under the Forum / Courses tabs (frame check).
    <div className="flex flex-col gap-3 pb-28 -mt-0.5" style={{ color: fv("text") }}>
      <WarningNotice />
      {recoveryPending ? (
        <div className="flex gap-1.5" aria-hidden="true">
          {[44, 92, 92, 100].map((w, i) => (
            <div key={i} className="h-[34px] rounded-full animate-pulse shrink-0" style={{ width: w, background: fv("track") }} />
          ))}
        </div>
      ) : (
        // MO1.3 #3: the strip runs off the right edge. Frame check: radius
        // 12 0 0 12 (measured) and, new since R1, the FO3 track #F4F3F9.
        <div
          className="flex gap-1 overflow-x-auto no-scrollbar -mr-4 p-1 pr-4"
          style={{ background: dark ? fv("track") : "rgb(var(--th-f4f3f9))", borderRadius: "12px 0 0 12px" }}
          role="group"
          aria-label="Categories"
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
      )}

      {!isProfessional && nickname && (
        // Frame check: 16 under the strip, two 18 pt lines (36 tall).
        <div className="mt-1 text-xs leading-[1.5] flex justify-between items-center gap-2" style={{ color: fv("muted") }}>
          <span className="min-w-0">
            Your nickname: <strong style={{ color: fv("text") }}>{nickname}</strong>. You choose nickname or name each
            time you post.
          </span>
          <Link to="/app/forum/nickname" className="font-bold no-underline shrink-0 py-2" style={{ color: fv("link") }}>
            Edit
          </Link>
        </div>
      )}

      {/* MO1.3 #5: the rules, with the Centium mark and a bold lead. Frame
          check: the mark is drawn bare in its own colours, 22 wide (measured),
          no tile — the brand PNG in Centium, the themed C and leaf otherwise;
          10 under the nickname line. */}
      <div
        className={`flex items-start gap-3 text-xs leading-[1.6] rounded-[20px] px-4 py-3.5 border ${!isProfessional && nickname ? "-mt-0.5" : ""}`}
        style={{ background: fv("rules-bg"), color: fv("rules-ink"), borderColor: "rgb(var(--th-aea1dc) / 0.35)" }}
      >
        {colorTheme === "centium" ? (
          <img src="/centium-mark.png" alt="" aria-hidden="true" className="shrink-0 object-contain" style={{ width: (22 * 687) / 648, height: (22 * 713) / 648 }} />
        ) : (
          <ThemedMark width={(22 * 687) / 648} height={(22 * 713) / 648} className="shrink-0" />
        )}
        <span>
          <strong className="font-extrabold">Community rules:</strong> Be kind, share experience rather than medical
          advice, and report anything that worries you. Posts here aren't a substitute for a doctor.
        </span>
      </div>

      {/* Decision 23 (item 73): a plain danger line, no box. */}
      {shownError && <DangerLine>{shownError}</DangerLine>}

      {recoveryPending || threads === null ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          {/* At the frame's card heights (MO1.3 #6–8: 202, 181, 181). */}
          <ForumPlaceholder height={202} />
          <ForumPlaceholder height={181} />
          <ForumPlaceholder height={181} />
        </div>
      ) : (
        <>
          {held.length > 0 && (
            <div className="flex flex-col gap-2.5">
              {/* Decision 23 (item 71): the handover's section label,
                  10.5/700 uppercase at 0.12em on a 14 line (label.section),
                  with the 1.5 pt primary line under it (C-05). */}
              <span className="text-[10.5px] font-bold uppercase leading-[14px] tracking-[0.12em] text-primary-dark pb-[7.5px] border-b-[1.5px] border-primary">
                Your post, waiting for review
              </span>
              {held.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => navigate(`/app/forum/post/${t.id}`)}
                  className="tap text-left rounded-2xl px-[14px] py-3 flex flex-col gap-1.5"
                  style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}
                >
                  <span className="text-[15px] font-extrabold [overflow-wrap:anywhere]">{t.title}</span>
                  <HeldNote />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            {feed.map((t) =>
              t.status === "removed" ? (
                <RemovedNote key={t.id} kind="post" />
              ) : (
                <ThreadCard
                  key={t.id}
                  thread={t}
                  author={authors.get(t.id) ?? UNKNOWN_AUTHOR}
                  categoryName={byKey.get(t.categoryKey)?.name ?? ""}
                  photoUrl={t.photoPath ? photos.get(t.photoPath) ?? null : null}
                  colours={categoryColours(t.categoryKey, dark)}
                  liked={likes.has(t.id)}
                  onLike={() => void toggleLike(t)}
                  onOpen={() => navigate(`/app/forum/post/${t.id}`)}
                />
              )
            )}
            {/* Decision 23 (item 72): Foundations › Empty state. */}
            {feed.length === 0 && held.length === 0 && !shownError && (
              <EmptyBlock icon={<MessagesSquare size={26} strokeWidth={1.75} />} title="No posts here yet" line="Start the conversation." />
            )}
            {/* Decision 23 (item 42): older posts load as the end of the list
                scrolls into view, with no visible control. The sentinel is
                also a button that only shows while focused, so a keyboard
                (or anyone without a scroll wheel) can still ask for them. */}
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
              <p role="status" className="m-0 text-center text-[12px]" style={{ color: fv("muted") }}>
                Loading older posts…
              </p>
            )}
          </div>
        </>
      )}

      {createPortal(fab, document.body)}
    </div>
  );
}

/** "Pinned · 40d" or "38d ago" (MO1.3); "Just now" and "Yesterday" as they are. */
function metaLine(thread: ForumThread): string {
  const age = forumAge(thread.createdAt);
  if (thread.pinned) return `Pinned · ${age}`;
  return /^\d+[mhd]$/.test(age) ? `${age} ago` : age;
}

function ThreadCard({
  thread,
  author,
  categoryName,
  photoUrl,
  colours,
  liked,
  onLike,
  onOpen,
}: {
  thread: ForumThread;
  author: Author;
  categoryName: string;
  photoUrl: string | null;
  colours: CategoryColours;
  liked: boolean;
  onLike: () => void;
  onOpen: () => void;
}) {
  const replies = `${thread.replyCount} ${thread.replyCount === 1 ? "reply" : "replies"}`;
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="tap cursor-pointer rounded-[20px] p-4 flex flex-col gap-2.5"
      // MO1.3 #6–10: the card's left edge in the category's colour (A20).
      style={{ background: fv("card"), border: `1px solid ${fv("border")}`, borderLeft: `3px solid ${colours.strong}` }}
    >
      <div className="flex items-center gap-2.5">
        <AuthorInitial author={author} identity={thread.identity} size={36} />
        {/* Frame check (measured): the name line 20 tall, the pills 18. */}
        <div className="grow min-w-0 flex flex-col gap-1 leading-[20px]">
          <AuthorName author={author} size={14} />
          <span className="flex items-center gap-1.5 flex-wrap">
            {categoryName && (
              <span
                className="inline-flex items-center gap-1 h-[18px] px-2 rounded-full text-[10.5px] font-bold"
                style={{ background: colours.pill, color: colours.ink }}
              >
                <span aria-hidden className="w-1.5 h-1.5 rounded-full" style={{ background: colours.ink }} />
                {categoryName}
              </span>
            )}
            <span className="inline-flex items-center h-[18px] px-2 rounded-full text-[10.5px] font-semibold" style={{ background: fv("track"), color: fv("muted") }}>
              {metaLine(thread)}
            </span>
          </span>
        </div>
      </div>
      {/* Frame check (measured on cards 1 and 2): title lines 21, the body
          3 under the title in 20 pt lines, the counts 14 under the body. */}
      <div className="text-[14.5px] font-bold leading-[21px] [overflow-wrap:anywhere]">{thread.title}</div>
      {thread.body && (
        <div className="-mt-[7px] text-[13px] leading-[20px] line-clamp-2 [overflow-wrap:anywhere]" style={{ color: fv("muted") }}>
          {thread.body}
        </div>
      )}
      {thread.photoPath && (
        <div className="h-[120px] rounded-xl overflow-hidden" style={{ background: fv("photo-bg") }}>
          {photoUrl && <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />}
        </div>
      )}
      <div className="mt-1 h-[17px] flex gap-4 text-[13px] items-center" style={{ color: fv("muted") }}>
        {/* Likes are tappable here now (A21), as on the post. */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          aria-pressed={liked}
          aria-label={`${liked ? "Unlike" : "Like"}, ${thread.reactionCount} ${thread.reactionCount === 1 ? "like" : "likes"}`}
          className="tap flex gap-[5px] items-center -my-2 py-2 pr-1 font-semibold"
        >
          <HeartIcon filled={liked} color={liked ? fv("accent") : fv("muted")} size={14} /> {thread.reactionCount}
        </button>
        <span className="flex gap-[5px] items-center font-semibold">
          <ReplyIcon color={fv("muted")} size={14} /> {replies}
        </span>
      </div>
    </div>
  );
}
