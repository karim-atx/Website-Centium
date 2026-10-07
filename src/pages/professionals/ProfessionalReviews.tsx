import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EllipsisVertical, Flag, LogIn, Pencil, Star } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { Button } from "../../components/ui/Button";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { ReviewItem } from "../../components/professionals/ReviewItem";
import { ReviewFormSheet, ReviewReportForm } from "../../components/professionals/ReviewForms";
import { SUBTYPE_SINGULAR } from "../../components/professionals/subtypeLabels";
import { typeColours } from "../../components/professionals/typeColour";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { reportReview } from "../../services/professional-reviews";
import { ratingDistribution, ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx } from "../../theme/textSize";

// MO1.2.1.1 · Profile · Reviews, as a page (B9) where it used to be a sheet on
// the profile. The summary card's breakdown is counted from the rows this
// reader already has, so it needs no backend; the average and count are the
// directory view's (professional_rating_summary), the same numbers the
// profile shows. Handover-complete pass: kept, though not drawn, only what
// is safety or privacy: Report (⋮ menu), the moderator's note on a removed
// review, the professional's reply (their right of reply to a public review
// about them) and "A client" for a reviewer who didn't share their name. The
// reader's own review is no longer pinned first and the "Edited" tags are
// gone. The pinned action is "Write a review", or "Edit your review" once
// there is one, and is absent for anyone who cannot review (B11).

const typeName = (s: DirectoryListing["subtype"]) =>
  s ? SUBTYPE_SINGULAR[s].replace(/\b\w/g, (c) => c.toUpperCase()) : "Professional";

export default function ProfessionalReviews() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dark = useIsDark();
  const [listing, setListing] = useState<DirectoryListing | null | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  /** The open ⋮ menu: which review, and the button it anchors to. */
  const [menuFor, setMenuFor] = useState<{ id: string; anchor: HTMLElement } | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void fetchListing(id).then((l) => {
      if (!cancelled) setListing(l);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { mine, myStatus, others, error, canReview, signedOut, save, withdraw } = useProfessionalReviews(listing?.profileId ?? null);

  // MO1.2.1.1 States, Loading: skeleton blocks at the anatomy positions
  // (surface.soft): the 140 summary card and the reviews card, radius 18.
  if (listing === undefined)
    return (
      <div aria-busy="true">
        <PageHeader title="Reviews" showBack bottomGap={16} />
        <span className="sr-only">Loading…</span>
        <div aria-hidden className="h-[140px] rounded-[18px] bg-cream-soft mb-5" />
        <div aria-hidden className="h-[14px] w-24 rounded bg-cream-soft mb-2 ml-1" />
        <div aria-hidden className="h-[336px] rounded-[18px] bg-cream-soft" />
      </div>
    );
  if (listing === null)
    return (
      <div className="text-center py-20 text-charcoal-soft">
        Professional not found.
        <div className="mt-4">
          <Button onClick={() => navigate("/app/professionals")}>Back</Button>
        </div>
      </div>
    );

  const t = typeColours(listing.subtype, dark);
  const firstName = listing.name.split(" ")[0];
  const label = ratingLabel(listing.averageRating, listing.reviewCount);
  const ownCounts = mine && myStatus !== "withdrawn";
  const dist = ratingDistribution([...others, ...(ownCounts ? [mine] : [])]);
  // MO1.2.1.1: each bar is its share of all the reviews (15 of 18 is 83%), not
  // of the largest count.
  const total = Math.max(1, dist.reduce((a, b) => a + b, 0));

  const refresh = async () => {
    const found = await fetchListing(listing.profileId);
    if (found) setListing(found);
  };

  // One list, newest first, as drawn: the reader's own review takes its place
  // by date (handover-complete pass; it used to be pinned first), still
  // labelled "You" since its name may not be shown to others.
  const rows = [...others, ...(ownCounts && mine ? [mine] : [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const canWrite = !signedOut && canReview === true && !mine;
  const canEdit = !!mine && myStatus === "editable";

  return (
    <div className={canWrite || canEdit ? "pb-[172px]" : ""}>
      <PageHeader title="Reviews" subtitle={`${listing.name} · ${typeName(listing.subtype)}`} subtitleColor={t.main} showBack bottomGap={16} />

      {/* The summary: the average (or "New" under three reviews, B7), the
          count, and the five bars. */}
      <section
        aria-label="Rating summary"
        // 18 to the "All reviews" label (card foot 247, label cap 269 on the frame).
        className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] p-4 mb-[18px] flex items-center gap-5"
      >
        {/* 98 wide (measured: stars centred at x 81–82, the bars' digits at x 151). */}
        <div className="flex flex-col items-center gap-1 w-[98px] shrink-0">
          <p className="text-[40px] font-extrabold leading-none" style={{ color: t.deep }}>
            {label.kind === "average" ? label.value : "New"}
          </p>
          {label.kind === "average" && (
            <span className="flex gap-0.5" role="img" aria-label={`${label.value} out of 5`}>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} size={13} className={i < Math.round(Number(label.value)) ? "fill-gold text-gold" : "text-charcoal/15"} aria-hidden />
              ))}
            </span>
          )}
          <p className="text-[11.5px] text-charcoal-faint">{listing.reviewCount > 0 ? reviewCountLabel(listing.reviewCount) : "No reviews yet"}</p>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1.5" aria-label="Reviews by stars">
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} className="flex items-center gap-2 text-[11px]">
              <span className="w-2 font-bold text-charcoal-soft">{n}</span>
              {/* 5 thick (measured on the frame at 2x). */}
              <span className="flex-1 h-[5px] rounded-full overflow-hidden" style={{ background: t.pill }}>
                <span className="block h-full rounded-full" style={{ width: `${(dist[n - 1] / total) * 100}%`, background: t.main }} />
              </span>
              <span className="w-4 text-right text-charcoal-faint tabular-nums">{dist[n - 1]}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="text-[10.5px] font-bold uppercase tracking-[0.12em] px-1 mb-2" style={{ color: t.main }}>
        All reviews
      </p>

      {signedOut ? (
        // The count is public; the words are for members.
        // Decision 23 (kept-list 60): Foundations › Empty state (56 primary.tint
        // tile, 26 thin-stroke icon in primary.accent, title 15/700, one line
        // 12.5/500 muted, max 260), keeping the Sign in button under it.
        <div className="flex flex-col items-center text-center py-8">
          <span className="w-14 h-14 rounded-2xl bg-th-f0edf9 dark:bg-primary/15 flex items-center justify-center text-th-7d67d9 dark:text-primary-accent">
            <LogIn size={26} strokeWidth={1.5} aria-hidden />
          </span>
          <p className="text-[15px] font-bold text-charcoal mt-3">Sign in to read reviews</p>
          <p className="text-[12.5px] font-medium text-charcoal-faint mt-1 leading-relaxed max-w-[260px]">
            Reviews are from {firstName}'s clients, and members can read them.
          </p>
          <Button size="sm" className="mt-3" onClick={() => navigate("/app/onboarding")}>
            Sign in
          </Button>
        </div>
      ) : (
        <div className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] px-4">
          {rows.map((r) =>
            r.id === mine?.id ? (
              <div key={r.id} className="py-3.5 border-b border-charcoal/[0.06] last:border-b-0">
                <ReviewItem review={r} layout="row" showName={false} replyLabel={`Reply from ${firstName}`} />
              </div>
            ) : (
            <div key={r.id} className="py-3.5 border-b border-charcoal/[0.06] last:border-b-0">
              {/* Decision 23 (kept-list 190): Report (safety) in a ⋮ menu
                  (Foundations Dropdown menu) on the name line; 44 tap target
                  held in the row by negative margins (a hidden accessibility
                  path: the drawn row is unchanged). */}
              <ReviewItem
                review={r}
                layout="row"
                replyLabel={`Reply from ${firstName}`}
                menu={
                  <button
                    type="button"
                    aria-label="Review options"
                    aria-haspopup="menu"
                    aria-expanded={menuFor?.id === r.id}
                    onClick={(e) => setMenuFor({ id: r.id, anchor: e.currentTarget })}
                    className="tap w-11 h-11 -my-3.5 -mr-3 rounded-full flex items-center justify-center text-charcoal-faint"
                  >
                    <EllipsisVertical size={16} strokeWidth={1.75} aria-hidden />
                  </button>
                }
              />
            </div>
            )
          )}
          {error && <p role="alert" className="py-4 text-[12.5px] font-medium text-status-high text-center">{error}</p>}
          {!error && rows.length === 0 && (
            // Decision 23 (kept-list 59): Foundations › Empty state with the
            // existing words as its title. The handover gives no copy for the
            // one line under it, so there is none (unspecified).
            <div className="flex flex-col items-center text-center py-8">
              <span className="w-14 h-14 rounded-2xl bg-th-f0edf9 dark:bg-primary/15 flex items-center justify-center text-th-7d67d9 dark:text-primary-accent">
                <Star size={26} strokeWidth={1.5} aria-hidden />
              </span>
              <p className="text-[15px] font-bold text-charcoal mt-3">No reviews yet</p>
            </div>
          )}
        </div>
      )}

      {(canWrite || canEdit) && (
        // MO1.2.1.1 #9: 358 × 44, r12, #9A8CD6 (the type's CTA fill), 13.5/700
        // white, Pencil 15, gap 7. "Edit your review" is the same action once
        // the reader has one (a state the frame doesn't draw).
        <PinnedCta
          size="base"
          primary={{
            label: canEdit ? "Edit your review" : "Write a review",
            icon: <Pencil size={15} />,
            onClick: () => setFormOpen(true),
            style: { background: t.cta, color: t.onMain, fontSize: textPx(13.5) },
          }}
        />
      )}

      <ReviewFormSheet
        open={formOpen}
        onClose={() => setFormOpen(false)}
        firstName={firstName}
        existing={mine}
        onSave={async (rating, body, visible) => {
          const message = await save(rating, body, visible);
          if (!message) await refresh();
          return message;
        }}
        onWithdraw={async () => {
          const message = await withdraw();
          if (!message) await refresh();
          return message;
        }}
      />

      <PopupMenu
        open={!!menuFor}
        anchor={menuFor?.anchor ?? null}
        onClose={() => setMenuFor(null)}
        options={[{ value: "report", label: "Report", icon: <Flag size={15} strokeWidth={1.75} /> }]}
        onSelect={() => {
          if (menuFor) setReportingId(menuFor.id);
        }}
      />

      <BottomSheet open={!!reportingId} onClose={() => setReportingId(null)} title="Report this review">
        {reportingId && (
          <ReviewReportForm
            onSend={async (reason, detail) => {
              const r = await reportReview(reportingId, reason, detail);
              return r.ok ? null : r.message;
            }}
          />
        )}
      </BottomSheet>
    </div>
  );
}
