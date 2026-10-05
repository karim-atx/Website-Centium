import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Pencil, Star } from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader";
import { Card } from "../../components/ui/Card";
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

// MO1.2.1.1 · Profile · Reviews, as a page (B9) where it used to be a sheet on
// the profile. The summary card's breakdown is counted from the rows this
// reader already has, so it needs no backend; the average and count are the
// directory view's (professional_rating_summary), the same numbers the
// profile shows. Everything the sheet carried stays (B12): the reader's own
// review first, Report on each other review, the professional's reply, the
// "Edited" tag and the moderator's note. The pinned action is "Write a
// review", or "Edit your review" once there is one, and is absent for anyone
// who cannot review (B11).

const typeName = (s: DirectoryListing["subtype"]) =>
  s ? SUBTYPE_SINGULAR[s].replace(/\b\w/g, (c) => c.toUpperCase()) : "Professional";

export default function ProfessionalReviews() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dark = useIsDark();
  const [listing, setListing] = useState<DirectoryListing | null | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);

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

  if (listing === undefined) return <p className="text-center py-20 text-charcoal-soft">Loading…</p>;
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
  const most = Math.max(1, ...dist);

  const refresh = async () => {
    const found = await fetchListing(listing.profileId);
    if (found) setListing(found);
  };

  const canWrite = !signedOut && canReview === true && !mine;
  const canEdit = !!mine && myStatus === "editable";

  return (
    <div className={canWrite || canEdit ? "pb-[172px]" : ""}>
      <PageHeader title="Reviews" subtitle={`${listing.name} · ${typeName(listing.subtype)}`} subtitleColor={t.main} showBack />

      {/* The summary: the average (or "New" under three reviews, B7), the
          count, and the five bars. */}
      <section
        aria-label="Rating summary"
        className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] p-4 mb-5 flex items-center gap-5"
      >
        <div className="flex flex-col items-center gap-1 w-[104px] shrink-0">
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
              <span className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: t.pill }}>
                <span className="block h-full rounded-full" style={{ width: `${(dist[n - 1] / most) * 100}%`, background: t.main }} />
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
        <Card className="text-center py-8">
          <p className="text-sm font-semibold text-charcoal">Sign in to read reviews</p>
          <p className="text-xs text-charcoal-faint mt-1 leading-relaxed">
            Reviews are from {firstName}'s clients, and members can read them.
          </p>
          <Button size="sm" className="mt-3" onClick={() => navigate("/app/onboarding")}>
            Sign in
          </Button>
        </Card>
      ) : (
        <div className="rounded-[18px] bg-cream-card border border-charcoal/[0.08] px-4">
          {mine && myStatus !== "withdrawn" && (
            <div className="py-3.5 border-b border-charcoal/[0.06] last:border-b-0">
              <ReviewItem review={mine} layout="row" showName={false} replyLabel={`Reply from ${firstName}`} />
            </div>
          )}
          {others.map((r) => (
            <div key={r.id} className="py-3.5 border-b border-charcoal/[0.06] last:border-b-0">
              <ReviewItem
                review={r}
                layout="row"
                replyLabel={`Reply from ${firstName}`}
                actions={
                  <button
                    type="button"
                    onClick={() => setReportingId(r.id)}
                    className="tap min-h-[44px] text-xs font-semibold text-charcoal-faint"
                  >
                    Report
                  </button>
                }
              />
            </div>
          ))}
          {error && <p className="py-4 text-xs font-semibold text-status-high text-center">{error}</p>}
          {!error && others.length === 0 && !(mine && myStatus !== "withdrawn") && (
            <p className="py-8 text-sm text-charcoal-faint text-center">No reviews yet.</p>
          )}
        </div>
      )}

      {(canWrite || canEdit) && (
        <PinnedCta
          primary={{
            label: canEdit ? "Edit your review" : "Write a review",
            icon: <Pencil size={15} />,
            onClick: () => setFormOpen(true),
            // The professional's type colour, as on the profile's actions.
            style: { background: t.main, color: t.onMain },
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
