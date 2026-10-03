import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate } from "react-router-dom";
import {
  fetchAuthors,
  fetchThreads,
  signPhotos,
  THREAD_PAGE,
  UNKNOWN_AUTHOR,
  type Author,
  type ForumThread,
} from "../../services/forum";
import { filterChips, forumAge, hiddenInRecovery, type ForumCategory } from "../../services/forum/rules";
import { fv } from "./forumColor";
import {
  AuthorInitial,
  AuthorName,
  ForumChip,
  ForumPlaceholder,
  HeartIcon,
  HeldNote,
  RemovedNote,
  ReplyIcon,
} from "./parts";

// Design screen 1: the forum list.
//
// RECOVERY-SENSITIVE MODE IS APPLIED HERE, ON THE DEVICE. The fetch below is
// the same whether the mode is on or off (every category, the same columns,
// labels and photos for every post fetched); Nutrition and Progress, and
// their posts, are simply not drawn. While the setting is still loading,
// neutral blocks stand where the chips and posts will be, so a post the mode
// would hide is never shown for a moment first.

export function ForumHome({
  categories,
  nickname,
  isProfessional,
  recoveryOn,
  recoveryPending,
}: {
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
  const seq = useRef(0);

  const byKey = useMemo(() => new Map(categories.map((c) => [c.key, c])), [categories]);
  const chips = filterChips(categories, recoveryOn);
  // A chip recovery mode hides can't stay selected once the mode comes on:
  // the list falls back to All.
  const activeFilter = filter && recoveryOn && hiddenInRecovery(byKey.get(filter)) ? null : filter;
  const threads = page && page.key === activeFilter ? page.threads : null;
  const more = !!page && page.key === activeFilter && page.more;
  const shownError = error && error.key === activeFilter ? error.message : null;

  const decorate = useCallback(async (list: ForumThread[]) => {
    const [a, p] = await Promise.all([
      fetchAuthors(list.map((t) => t.id), []),
      signPhotos(list.map((t) => t.photoPath).filter((x): x is string => !!x)),
    ]);
    setAuthors((prev) => new Map([...prev, ...a]));
    setPhotos((prev) => new Map([...prev, ...p]));
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
    if (mine !== seq.current) return;
    if (r.ok) {
      await decorate(r.value);
      const seen = new Set(threads.map((t) => t.id));
      setPage({ key, threads: [...threads, ...r.value.filter((t) => !seen.has(t.id))], more: r.value.length === THREAD_PAGE });
    } else setError({ key, message: r.message });
    setLoadingMore(false);
  };

  const shown = (threads ?? []).filter((t) => !(recoveryOn && hiddenInRecovery(byKey.get(t.categoryKey))));
  const held = shown.filter((t) => t.status === "held");
  const feed = shown.filter((t) => t.status !== "held");

  const fab = (
    <Link
      to="/app/forum/new"
      className="tap fixed z-30 h-14 rounded-[18px] flex items-center gap-2 px-5 text-[15px] font-extrabold no-underline shadow-fab bottom-[calc(env(safe-area-inset-bottom)+104px+var(--active-bar,0px))] right-[calc(var(--app-gutter)+20px)] lg:bottom-8 lg:right-8"
      style={{ background: fv("accent"), color: fv("on-accent") }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14" />
      </svg>
      New post
    </Link>
  );

  return (
    <div className="flex flex-col gap-3 pb-28" style={{ color: fv("text") }}>
      {recoveryPending ? (
        <div className="flex gap-1.5" aria-hidden="true">
          {[44, 92, 92, 100].map((w, i) => (
            <div key={i} className="h-[34px] rounded-full animate-pulse shrink-0" style={{ width: w, background: fv("track") }} />
          ))}
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" role="group" aria-label="Categories">
          <ForumChip active={activeFilter === null} onClick={() => setFilter(null)}>
            All
          </ForumChip>
          {chips.map((c) => (
            <ForumChip key={c.key} active={activeFilter === c.key} onClick={() => setFilter(c.key)}>
              {c.name}
            </ForumChip>
          ))}
        </div>
      )}

      {!isProfessional && nickname && (
        <div className="text-xs flex justify-between items-center gap-2" style={{ color: fv("muted") }}>
          <span className="min-w-0">
            Your nickname: <strong style={{ color: fv("text") }}>{nickname}</strong>. You choose nickname or name each
            time you post.
          </span>
          <Link to="/app/forum/nickname" className="font-bold no-underline shrink-0 py-2" style={{ color: fv("link") }}>
            Edit
          </Link>
        </div>
      )}

      <div className="text-xs leading-[1.5] rounded-2xl px-[14px] py-3" style={{ background: fv("rules-bg"), color: fv("rules-ink") }}>
        Be kind, share experience rather than medical advice, and report anything that worries you. Posts here aren't a
        substitute for a doctor.
      </div>

      {shownError && (
        <p role="alert" className="text-xs font-semibold text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {shownError}
        </p>
      )}

      {recoveryPending || threads === null ? (
        <div className="flex flex-col gap-2.5" aria-busy="true">
          <ForumPlaceholder height={150} />
          <ForumPlaceholder height={120} />
          <ForumPlaceholder height={150} />
        </div>
      ) : (
        <>
          {held.length > 0 && (
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-extrabold tracking-[0.04em]" style={{ color: fv("muted") }}>
                YOUR POST, WAITING FOR REVIEW
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
                  onOpen={() => navigate(`/app/forum/post/${t.id}`)}
                />
              )
            )}
            {feed.length === 0 && held.length === 0 && !shownError && (
              <p className="text-sm text-center py-8" style={{ color: fv("muted") }}>
                No posts here yet. Start the conversation.
              </p>
            )}
            {more && (
              <button
                type="button"
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="tap h-11 rounded-full text-[13px] font-bold disabled:opacity-60"
                style={{ background: fv("card"), border: `1px solid ${fv("border")}`, color: fv("text") }}
              >
                {loadingMore ? "Loading…" : "Show older posts"}
              </button>
            )}
          </div>
        </>
      )}

      {createPortal(fab, document.body)}
    </div>
  );
}

function ThreadCard({
  thread,
  author,
  categoryName,
  photoUrl,
  onOpen,
}: {
  thread: ForumThread;
  author: Author;
  categoryName: string;
  photoUrl: string | null;
  onOpen: () => void;
}) {
  const meta = [categoryName, forumAge(thread.createdAt), thread.pinned ? "pinned" : null].filter(Boolean).join(" · ");
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="tap cursor-pointer rounded-[18px] p-[14px] flex flex-col gap-2"
      style={{ background: fv("card"), border: `1px solid ${fv("border")}` }}
    >
      <div className="flex items-center gap-2.5">
        <AuthorInitial author={author} identity={thread.identity} size={36} />
        <div className="grow min-w-0 flex flex-col gap-0.5">
          <AuthorName author={author} size={14} />
          <span className="text-xs" style={{ color: fv("muted") }}>
            {meta}
          </span>
        </div>
      </div>
      <div className="text-base font-extrabold [overflow-wrap:anywhere]">{thread.title}</div>
      {thread.body && (
        <div className="text-[13px] leading-[1.5] line-clamp-2 [overflow-wrap:anywhere]" style={{ color: fv("muted") }}>
          {thread.body}
        </div>
      )}
      {thread.photoPath && (
        <div className="h-[120px] rounded-xl overflow-hidden" style={{ background: fv("photo-bg") }}>
          {photoUrl && <img src={photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />}
        </div>
      )}
      <div className="flex gap-4 text-[13px] items-center" style={{ color: fv("muted") }}>
        <span className="flex gap-[5px] items-center" aria-label={`${thread.reactionCount} ${thread.reactionCount === 1 ? "like" : "likes"}`}>
          <HeartIcon color={fv("muted")} /> {thread.reactionCount}
        </span>
        <span className="flex gap-[5px] items-center">
          <ReplyIcon color={fv("muted")} /> {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
        </span>
      </div>
    </div>
  );
}
