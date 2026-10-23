import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { EllipsisVertical, Flag, LogIn, MessageSquareWarning, Pencil } from "lucide-react";
import { PopupMenu } from "../../components/ui/PopupMenu";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { PinnedCta } from "../../components/ui/PinnedCta";
import { ReviewItem } from "../../components/professionals/ReviewItem";
import { ReviewFormSheet, ReviewReportForm } from "../../components/professionals/ReviewForms";
import { fetchListing, type DirectoryListing } from "../../services/directory";
import { reportReply, reportReview } from "../../services/professional-reviews";
import { ratingDistribution, ratingLabel, reviewCountLabel } from "../../services/professional-reviews/rules";
import { useProfessionalReviews } from "../../hooks/useProfessionalReviews";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { MarketError, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS } from "../../components/market/usePress";
import { BackRow, Caps, EmptyBlock, PressButton } from "./profile/parts";
import { typeLabel } from "./profile/profileModel";

// Market + Share 3.0 · W5 · the full Reviews page (/app/professionals/:id/
// reviews), reached from the profile's Reviews tab ("See all reviews"). Not
// a board frame: kept (PLAN §3.2) and restyled in the C-MO.4.9 Reviews chrome
// (Client Professional Screens lines 134–148): the back row with the title
// 22 / 800; the summary card (radius 18, --card, 0.5px --hair, padding 14 16:
// the average 30 / 34 800, five 13 stars in --gold, the count 11.5 --faint)
// with the kept distribution bars (5 tall, --pale track, --accent fill, the
// counts 11 --faint); "All reviews" in the caps label; the rows in one card
// (padding 12 16, 0.5px --div rules).
// Kept live features: the distribution (each bar its share of all reviews),
// the professional's reply, Report / Report reply (⋮ menu, safety), the
// moderator's note on a removed review, "A client" for a hidden name, the
// signed-out gate (review text has no anon grant), and the pinned "Write a
// review" / "Edit your review" for someone who may review.

export default function ProfessionalReviews() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const [listing, setListing] = useState<DirectoryListing | null | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [reportingReplyId, setReportingReplyId] = useState<string | null>(null);

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

  const { mine, myStatus, others, error, canReview, signedOut, loading, save, withdraw, reload } = useProfessionalReviews(listing?.profileId ?? null);

  if (listing === undefined)
    return (
      <div aria-busy="true" style={{ lineHeight: "normal" }}>
        <BackRow title="Reviews" />
        <MarketSkeleton radius={18} rows={3} height={110} label="Loading reviews" style={{ marginTop: 14 }} />
        <MarketSkeleton radius={18} rows={4} height={240} label="Loading reviews" style={{ marginTop: 18 }} />
      </div>
    );
  if (listing === null)
    return (
      <div style={{ lineHeight: "normal" }}>
        <BackRow title="Reviews" />
        <EmptyBlock title="Professional not found." body={null}>
          <PressButton onClick={() => navigate("/app/professionals")} style={{ height: 44, padding: "0 18px", borderRadius: 14, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: "pointer" }}>
            Back
          </PressButton>
        </EmptyBlock>
      </div>
    );

  const firstName = listing.name.split(" ")[0];
  const label = ratingLabel(listing.averageRating, listing.reviewCount);
  const ownCounts = mine && myStatus !== "withdrawn";
  const dist = ratingDistribution([...others, ...(ownCounts ? [mine] : [])]);
  const total = Math.max(1, dist.reduce((a, b) => a + b, 0));

  const refresh = async () => {
    const found = await fetchListing(listing.profileId);
    if (found) setListing(found);
  };

  const rows = [...others, ...(ownCounts && mine ? [mine] : [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const menuReview = menuFor ? rows.find((r) => r.id === menuFor.id) ?? null : null;
  const canWrite = !signedOut && canReview === true && !mine;
  const canEdit = !!mine && myStatus === "editable";
  const stars = label.kind === "average" ? Math.round(Number(label.value)) : 0;
  const card: React.CSSProperties = { borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, color: m.ink };

  return (
    <div className={canWrite || canEdit ? "pb-[172px]" : ""} style={{ lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      <BackRow title="Reviews" />
      <p style={{ margin: "2px 0 0", fontSize: textPx(13), color: m.ink2 }}>
        {listing.name} · {listing.specialty?.trim() || typeLabel(listing.subtype)}
      </p>

      <section aria-label="Rating summary" style={{ ...card, marginTop: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ flexShrink: 0 }}>
          <div style={{ fontSize: textPx(30), lineHeight: linePx(34), fontWeight: 800 }}>{label.kind === "average" ? label.value : "New"}</div>
          <span role="img" aria-label={`${stars} out of 5 stars`} style={{ display: "flex", gap: 2, marginTop: 2 }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <svg key={i} width={13} height={13} viewBox="0 0 24 24" fill={i < stars ? m.gold : "none"} stroke={i < stars ? m.gold : m.border} strokeWidth={1.5} strokeLinejoin="round" aria-hidden style={{ display: "block", ...NO_ICON_SCALE }}>
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            ))}
          </span>
          <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 2 }}>{listing.reviewCount > 0 ? reviewCountLabel(listing.reviewCount) : "No reviews yet"}</div>
        </div>
        <div aria-label="Reviews by stars" role="list" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} role="listitem" aria-label={`${n} stars: ${dist[n - 1]}`} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: textPx(11) }}>
              <span aria-hidden style={{ width: 8, fontWeight: 700, color: m.ink2 }}>{n}</span>
              <span aria-hidden style={{ flex: 1, height: 5, borderRadius: 999, overflow: "hidden", background: m.pale }}>
                <span style={{ display: "block", height: "100%", borderRadius: 999, width: `${(dist[n - 1] / total) * 100}%`, background: m.accent }} />
              </span>
              <span aria-hidden style={{ width: 16, textAlign: "right", color: m.faint, fontVariantNumeric: "tabular-nums" }}>{dist[n - 1]}</span>
            </div>
          ))}
        </div>
      </section>

      <Caps style={{ marginTop: 18 }}>All reviews</Caps>

      {signedOut ? (
        <EmptyBlock icon={<LogIn size={24} strokeWidth={1.75} aria-hidden style={NO_ICON_SCALE} />} title="Sign in to read reviews" body={`Reviews are from ${firstName}'s clients, and members can read them.`}>
          <PressButton onClick={() => navigate("/app/onboarding")} style={{ height: 44, padding: "0 18px", borderRadius: 14, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: "pointer" }}>
            Sign in
          </PressButton>
        </EmptyBlock>
      ) : loading && rows.length === 0 ? (
        <MarketSkeleton radius={18} rows={4} height={200} label="Loading reviews" style={{ marginTop: 8 }} />
      ) : error && rows.length === 0 ? (
        <MarketError thing="reviews" onRetry={() => void reload()} style={{ marginTop: 8 }} />
      ) : rows.length === 0 ? (
        <EmptyBlock title="No reviews yet" body={null} style={{ paddingTop: 24 }} />
      ) : (
        <div style={{ ...card, marginTop: 8, padding: "0 16px" }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ padding: "12px 0", borderTop: i ? `0.5px solid ${m.div}` : 0 }}>
              {r.id === mine?.id ? (
                <ReviewItem review={r} layout="row" showName={false} replyLabel={`Reply from ${firstName}`} />
              ) : (
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
                      className="tap w-11 h-11 -my-3.5 -mr-3 rounded-full flex items-center justify-center"
                      style={{ color: m.faint }}
                    >
                      <EllipsisVertical size={16} strokeWidth={1.75} aria-hidden />
                    </button>
                  }
                />
              )}
            </div>
          ))}
          {error && (
            <p role="alert" style={{ margin: 0, padding: "12px 0", textAlign: "center", fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
              {error}
            </p>
          )}
        </div>
      )}

      {(canWrite || canEdit) && (
        <PinnedCta
          size="base"
          primary={{
            label: canEdit ? "Edit your review" : "Write a review",
            icon: <Pencil size={15} />,
            onClick: () => setFormOpen(true),
            style: { background: m.fill, color: m.onfill, fontSize: textPx(14), fontWeight: 800 },
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
        options={[
          { value: "report", label: "Report", icon: <Flag size={15} strokeWidth={1.75} /> },
          ...(menuReview?.reply && !menuReview.reply.redactedAt
            ? [{ value: "report-reply", label: "Report reply", icon: <MessageSquareWarning size={15} strokeWidth={1.75} /> }]
            : []),
        ]}
        onSelect={(value) => {
          if (!menuFor) return;
          if (value === "report-reply") setReportingReplyId(menuFor.id);
          else setReportingId(menuFor.id);
        }}
      />

      <BottomSheet open={!!reportingReplyId} onClose={() => setReportingReplyId(null)} title="Report this reply">
        {reportingReplyId && (
          <ReviewReportForm
            onSend={async (reason, detail) => {
              const r = await reportReply(reportingReplyId, reason, detail);
              return r.ok ? null : r.message;
            }}
          />
        )}
      </BottomSheet>

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
