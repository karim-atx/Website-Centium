import { useEffect, useRef } from "react";

/**
 * Load-on-scroll for a list whose frame draws no "Show more" / "More results"
 * button (MO1.2.1.3.1's gallery, MO1.2.1.3.2's results; handover-complete
 * pass). The next page loads as the list's end nears the screen (300 px
 * ahead). The button stays as the keyboard and screen-reader path to the same
 * action, visually hidden until it takes focus.
 *
 * `count` is how many items are loaded: a load that adds nothing (it failed)
 * stops the automatic loading, so a failing request is not retried in a
 * loop; the button still works.
 */
export const LoadMoreSentinel: React.FC<{ busy: boolean; count: number; onMore: () => void; label: string }> = ({
  busy,
  count,
  onMore,
  label,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const firedAt = useRef<number | null>(null);
  const latest = useRef({ onMore, count });
  useEffect(() => {
    latest.current = { onMore, count };
  });
  // Re-observed after each load, so a page that leaves the end still in view
  // loads the next one too (a new observer reports its current state).
  useEffect(() => {
    const el = ref.current;
    if (busy || !el || !("IntersectionObserver" in window)) return;
    if (firedAt.current !== null && firedAt.current === count) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        firedAt.current = latest.current.count;
        latest.current.onMore();
      },
      { rootMargin: "0px 0px 300px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [busy, count]);
  return (
    <div ref={ref}>
      <button
        type="button"
        onClick={onMore}
        disabled={busy}
        className="tap sr-only focus:not-sr-only min-h-[44px] w-full text-[13px] font-semibold text-primary-deep-text disabled:opacity-50"
      >
        {busy ? "Loading…" : label}
      </button>
    </div>
  );
};
