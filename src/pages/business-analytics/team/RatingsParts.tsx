import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, EllipsisVertical, Flag, Star, UserRound } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { Toast } from "../../../components/ui/Toast";
import type { BizReview } from "../../../services/reputation";
import { ago } from "../reputation/reputationModel";
import { ReportSheet } from "../reputation/ReviewSheets";
import { MIN_REVIEWS, sortReviews, type ReviewSort } from "./ratingsModel";
import { Sheet, Stars } from "./parts";
import { t, tk, tn } from "../../../i18n/core";

// AN5 Ratings parts on B14: the rating graphic (AnTeamV6 mkRatG, lg on the
// Ratings page and sm in the scorecard's Ratings box), the scorecard
// snippets (AN5-045 row 11) and the reviews sheet (TeamFlowsV4 rev-emp /
// rev-team: AN5-051, -053, -054, -055, OURS-AN5-ratings-empty R7-R9, R16).
// AN5-051 K1: each review's name line has a ⋮ "Report" menu (decision 23,
// as ProfessionalReviews) opening the Reputation "Report this review" sheet
// (report_review).

/** mkRatG: average, five clipped stars, count; distribution bars when the rows add up. */
export function RatingGraphic({
  avg,
  count,
  countText,
  dist,
  size,
}: {
  avg: number;
  count: number;
  countText: string;
  dist: [number, number, number, number, number] | null;
  size: "lg" | "sm";
}) {
  const mx = Math.max(1, ...(dist ?? [0]));
  return (
    <div className={`an5-ratg${size === "sm" ? " is-sm" : ""}`} role="img" aria-label={tn(count, "{avg} out of 5 from {n} reviews", "{avg} out of 5 from {n} reviews", { avg: avg.toFixed(1) })}>
      <div className="flex flex-col items-start" style={{ gap: 4 }}>
        <span className="an5-rat-avg">{avg.toFixed(1)}</span>
        <Stars avg={avg} size={size === "lg" ? 18 : 15} />
        <span className="an5-rat-cnt" style={{ marginTop: 0 }}>
          {countText}
        </span>
      </div>
      {dist && (
        <div className="an5-dist">
          {dist.map((v, i) => (
            <div key={i} className="an5-dist-row" aria-label={`${5 - i} stars: ${v} reviews`}>
              <span className="an5-dist-l">
                {5 - i}
                <span style={{ display: "flex", color: "var(--an-gold)" }}>
                  <Star size={9} fill="currentColor" stroke="none" aria-hidden />
                </span>
              </span>
              <div className="an5-dist-track">
                <div className="an5-dist-fill" style={{ width: `${((v / mx) * 100).toFixed(1)}%` }} />
              </div>
              <span className="an5-dist-n">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** AN5-045 row 11: the two newest reviews, filled stars up to the rating. */
export function Snippets({ list, onOpen }: { list: BizReview[]; onOpen: (id: string) => void }) {
  const two = list.filter((r) => !r.redacted && r.rating !== null).slice(0, 2);
  if (!two.length) return null;
  return (
    <div className="an5-snips">
      {two.map((r) => (
        <button
          key={r.id}
          type="button"
          className="an5-snip tap"
          aria-label={t("{rating} star review from {name}, {when}", { rating: r.rating ?? "", name: r.label, when: ago(r.createdAt) })}
          onClick={() => onOpen(r.id)}
        >
          <span className="an5-snip-line">
            <span className="an5-snip-stars" aria-hidden>
              {[0, 1, 2, 3, 4].map((j) => (
                <Star key={j} size={11} fill={j < (r.rating ?? 0) ? "currentColor" : "none"} strokeWidth={2} />
              ))}
            </span>
            <span className="an5-snip-who">{r.label}</span>
            <span className="an5-snip-when">{ago(r.createdAt)}</span>
          </span>
          <span className="an5-snip-t block">{r.body}</span>
        </button>
      ))}
    </div>
  );
}

const SORTS: { k: ReviewSort; t: string }[] = [
  { k: "newest", t: tk("Newest") },
  { k: "highest", t: tk("Highest rated") },
  { k: "lowest", t: tk("Lowest rated") },
];
const PAGE = 20;

/**
 * AN5-051 "{name}'s reviews" / AN5-055 "All team reviews": handle sheet, no
 * footer (closes by X, handle or scrim). All time; the summary never changes
 * with the sort; 20 a page with "Show more reviews".
 */
export function ReviewsSheet({
  open,
  onClose,
  title,
  lead,
  list,
  count,
  avg,
  team,
  businessName,
  emptyText,
  focusId,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  lead: string;
  list: BizReview[];
  /** The reader's count (instructor_ratings), the same one the page shows. */
  count: number;
  avg: number | null;
  /** The team sheet names the instructor in each meta line (AN5-055 row 3). */
  team: boolean;
  businessName: string;
  emptyText: string;
  /** Opened from a snippet: scroll to that review and highlight it (AN5-047 row 2). */
  focusId?: string | null;
}) {
  const [sort, setSort] = useState<ReviewSort>("newest");
  const [sortOpen, setSortOpen] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [hl, setHl] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [menuFor, setMenuFor] = useState<{ review: BizReview; anchor: HTMLElement } | null>(null);
  const [report, setReport] = useState<BizReview | null>(null);
  const [reported, setReported] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setSort("newest");
    setSortOpen(false);
    const at = focusId ? list.findIndex((r) => r.id === focusId) : -1;
    setShown(Math.max(PAGE, at + 1));
    setHl(focusId ?? null);
    if (!focusId) return;
    const t1 = window.setTimeout(() => listRef.current?.querySelector(`[data-rev="${focusId}"]`)?.scrollIntoView({ block: "center" }), 120);
    const t2 = window.setTimeout(() => setHl(null), 1400);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [open, focusId, list]);

  useEffect(() => {
    if (!sortOpen) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && setSortOpen(false);
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  }, [sortOpen]);

  const sorted = sortReviews(list, sort);
  const isNew = avg === null || count < MIN_REVIEWS;
  return (
    <Sheet open={open} onClose={onClose} title={title} handle>
      <p className="an5-leadt" style={{ marginBottom: 14 }}>
        {lead}
      </p>
      {list.length === 0 ? (
        <div className="an5-emptyblock">
          <span className="an5-emptyblock-tile">
            <Star size={20} aria-hidden />
          </span>
          <p className="an5-emptyblock-t">{t("No reviews yet")}</p>
          <p className="an5-emptyblock-s">{emptyText}</p>
        </div>
      ) : (
        <>
          <div className="an5-revsum">
            {isNew ? (
              <b className="is-new">{t("New")}</b>
            ) : (
              <>
                <span style={{ display: "flex", color: "var(--an-gold)" }}>
                  <Star size={26} fill="currentColor" stroke="none" aria-hidden />
                </span>
                <b>{avg!.toFixed(1)}</b>
              </>
            )}
            <span>
              {count} {count === 1 ? "review" : "reviews"}
            </span>
            {list.length >= 2 && (
              <div className="an5-sortwrap">
                <button
                  type="button"
                  className="an5-sortbtn tap"
                  aria-haspopup="listbox"
                  aria-expanded={sortOpen}
                  aria-label={t("Sort reviews: {sort}", { sort: t(SORTS.find((x) => x.k === sort)!.t) })}
                  onClick={() => setSortOpen((o) => !o)}
                >
                  {t(SORTS.find((x) => x.k === sort)!.t)}
                  <ChevronDown size={14} aria-hidden />
                </button>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-[4]" aria-hidden onClick={() => setSortOpen(false)} />
                    <div className="an5-sortlist" role="listbox" aria-label={t("Sort by")}>
                      <p className="an5-sortlist-l">{t("Sort by")}</p>
                      {SORTS.map((o) => (
                        <button
                          key={o.k}
                          type="button"
                          role="option"
                          aria-selected={o.k === sort}
                          className="an5-sortopt tap"
                          onClick={() => {
                            setSort(o.k);
                            setSortOpen(false);
                            setShown(PAGE);
                            listRef.current?.scrollIntoView({ block: "start" });
                          }}
                        >
                          {t(o.t)}
                          {o.k === sort && (
                            <span className="an5-sortopt-chk">
                              <Check size={15} strokeWidth={2.6} aria-hidden />
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="an5-revlist" ref={listRef}>
            {sorted.slice(0, shown).map((r) => (
              <div key={r.id} data-rev={r.id} className={`an5-rev${hl === r.id ? " is-hl" : ""}`}>
                <div className="an5-rev-head">
                  <span className="an5-rev-av" aria-hidden>
                    <UserRound size={15} />
                  </span>
                  <span className="min-w-0">
                    <span className="an5-rev-who">{r.label}</span>
                    <span className="an5-rev-meta">{[ago(r.createdAt), team ? r.instructor : r.classTitle].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className="flex items-center" style={{ gap: 2 }}>
                    {!r.redacted && !reported.has(r.id) && (
                      <button
                        type="button"
                        aria-label={t("Options for the review by {name}", { name: r.label })}
                        aria-haspopup="menu"
                        aria-expanded={menuFor?.review.id === r.id}
                        onClick={(e) => setMenuFor({ review: r, anchor: e.currentTarget })}
                        className="tap flex items-center justify-center rounded-full"
                        style={{ width: 44, height: 44, marginBlock: "-14px", marginInline: "-12px -6px", color: "var(--an-faint)" }}
                      >
                        <EllipsisVertical size={16} strokeWidth={1.75} aria-hidden />
                      </button>
                    )}
                    {!r.redacted && r.rating !== null && (
                      <span className="an5-rev-r" aria-label={t("{rating} out of 5 stars", { rating: r.rating ?? "" })}>
                        <span style={{ display: "flex", color: "var(--an-gold)" }}>
                          <Star size={14} fill="currentColor" stroke="none" aria-hidden />
                        </span>
                        <span aria-hidden>{r.rating}</span>
                      </span>
                    )}
                  </span>
                </div>
                {r.redacted ? (
                  <p className="an5-rev-t is-removed">{t("A moderator removed this review. It no longer counts toward the rating.")}</p>
                ) : (
                  <p className="an5-rev-t">{r.body}</p>
                )}
                {/* R10: a reply Centium removed is hidden. */}
                {!r.redacted && r.reply && !r.reply.redacted && (
                  <div className="an5-rev-reply">
                    <p className="an5-rev-reply-l">{t("Reply from {name}", { name: businessName })}</p>
                    <p className="an5-rev-reply-t">{r.reply.body}</p>
                  </div>
                )}
              </div>
            ))}
            {sorted.length > shown && (
              <button type="button" className="an5-more tap" style={{ marginTop: 0 }} onClick={() => setShown((n) => n + PAGE)}>
                {t("Show more reviews")}
                <ChevronRight className="rtl:-scale-x-100" size={14} aria-hidden />
              </button>
            )}
          </div>
        </>
      )}
      <PopupMenu
        open={!!menuFor}
        anchor={menuFor?.anchor ?? null}
        onClose={() => setMenuFor(null)}
        align="right"
        options={[{ value: "report", label: t("Report"), icon: <Flag size={15} strokeWidth={1.75} /> }]}
        onSelect={() => {
          if (menuFor) setReport(menuFor.review);
          setMenuFor(null);
        }}
      />
      <ReportSheet
        open={!!report}
        review={report}
        tag={report ? [report.instructor, report.classTitle].filter(Boolean).join(" · ") || null : null}
        onClose={() => setReport(null)}
        onDone={(msg) => {
          if (report) setReported((s) => new Set(s).add(report.id));
          setReport(null);
          setToast(msg);
        }}
      />
      <Toast open={!!toast} message={toast ?? ""} variant="business" duration={4000} onExpire={() => setToast(null)} />
    </Sheet>
  );
}
