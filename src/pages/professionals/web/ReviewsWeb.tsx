import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EllipsisVertical, Flag, LogIn, MessageSquareWarning, Star, UserCheck } from "lucide-react";
import { PopupMenu } from "../../../components/ui/PopupMenu";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ReviewWaitNote } from "../../../components/reviews/ReviewWaitNote";
import { useReviewOpensAt } from "../../../hooks/useReviewOpensAt";
import { ReviewFormSheet, ReviewReportForm } from "../../../components/professionals/ReviewForms";
import { fetchListing, type DirectoryListing } from "../../../services/directory";
import { reportReply, reportReview } from "../../../services/professional-reviews";
import { ratingDistribution, ratingLabel, reviewCountLabel } from "../../../services/professional-reviews/rules";
import { useProfessionalReviews } from "../../../hooks/useProfessionalReviews";
import { MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { typeLabel } from "../profile/profileModel";
import { PrFrameWeb } from "./PrFrameWeb";
import { PrEmpty, PrStars } from "./WebParts";
import { GOLD, HAIR, monthYear, prPrimary } from "./prWebStyles";
import { appLocale } from "../../../i18n/format";
import { t, tk, tx } from "../../../i18n/core";

/**
 * Website viewport v1, WC-PR.3 Reviews (WC-PR Professionals Web v3,
 * `isReviews`): the header with the 36 back button and the line "{name} ·
 * {role}" in #7D6BB5; a 4 : 8 grid: the gold summary card (#FBF3E2, r20,
 * padding 20: the average 40/48 800 and the count 15 600 #9A7424, then the
 * five 8-tall bars) with the 44 "Write a review" under it, beside the reviews
 * (r16 cards, 0.5px, padding 14 16, 10 apart: the name 15 700, the 14 stars,
 * the month 13 #8C8378 and the ⋮; the text 15/22; the reply on #F0EDF9 r12).
 * Write a review and Report this review open the repo's sheets (the 440 side
 * sheet on the web).
 *
 * As the mobile page (ProfessionalReviews): the distribution over the
 * reviews read, the professional's reply, Report and Report reply (⋮), the
 * moderator's note, "A client" for a hidden name, the signed-out gate, "Edit
 * your review" inside the window, and the new-account wait note.
 */
export const ReviewsWeb: React.FC<{ id: string }> = ({ id }) => {
  const navigate = useNavigate();
  const [listing, setListing] = useState<DirectoryListing | null | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [reportingId, setReportingId] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<{ id: string; anchor: HTMLElement } | null>(null);
  const [reportingReplyId, setReportingReplyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchListing(id).then((l) => {
      if (!cancelled) setListing(l && l.profileId === id ? l : null);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const { mine, myStatus, others, error, canReview, signedOut, loading, save, withdraw, reload } = useProfessionalReviews(listing?.profileId ?? null);
  const opensAt = useReviewOpensAt();
  const back = () => navigate(`/app/professionals/${encodeURIComponent(id)}`);

  if (!listing) {
    return (
      <PrFrameWeb title={t("Reviews")} sub="" subInk="#7D6BB5" back={back} lFr={4} rFr={8}>
        {listing === undefined ? (
          <>
            <MarketSkeleton radius={20} rows={5} height={240} label={tk("Loading reviews")} />
            <MarketSkeleton radius={18} rows={3} height={300} label={tk("Loading reviews")} />
          </>
        ) : (
          <div style={{ gridColumn: "1 / -1" }}>
            <PrEmpty icon={<UserCheck size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />} title={t("Professional not found.")}>
              <button type="button" onClick={() => navigate("/app/professionals")} className="pr-web-press" style={{ ...prPrimary, height: 40, padding: "0 16px", marginTop: 12 }}>
                {t("Back")}
              </button>
            </PrEmpty>
          </div>
        )}
      </PrFrameWeb>
    );
  }

  const firstName = listing.name.split(" ")[0];
  const label = ratingLabel(listing.averageRating, listing.reviewCount);
  const ownCounts = !!mine && myStatus !== "withdrawn";
  const dist = ratingDistribution([...others, ...(ownCounts && mine ? [mine] : [])]);
  const total = Math.max(1, dist.reduce((a, b) => a + b, 0));
  const rows = [...others, ...(ownCounts && mine ? [mine] : [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const menuReview = menuFor ? rows.find((r) => r.id === menuFor.id) ?? null : null;
  const canWrite = !signedOut && canReview === true && !mine;
  const canEdit = !!mine && myStatus === "editable";
  const refresh = async () => {
    const found = await fetchListing(listing.profileId);
    if (found && found.profileId === listing.profileId) setListing(found);
  };
  const locale = appLocale("en-US") ?? "en-US";

  return (
    <PrFrameWeb
      title={t("Reviews")}
      sub={`${listing.name} · ${listing.specialty?.trim() || typeLabel(listing.subtype)}`}
      subInk="#7D6BB5"
      back={back}
      lFr={4}
      rFr={8}
    >
      <aside data-pr-rev-aside className="flex flex-col" style={{ minWidth: 0, gap: 16 }} aria-label={t("Rating summary")}>
        <div data-pr-rev-summary className="flex flex-col" style={{ borderRadius: 20, background: GOLD.bg, padding: 20, gap: 12 }}>
          <p className="flex items-baseline" style={{ margin: 0, gap: 8 }}>
            <span style={{ fontSize: 40, lineHeight: "48px", fontWeight: 800, color: "#241F1B" }}>{label.kind === "average" ? label.value : t("New")}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: GOLD.ink }}>{listing.reviewCount > 0 ? reviewCountLabel(listing.reviewCount) : t("No reviews yet")}</span>
          </p>
          <div role="list" aria-label={t("Reviews by stars")} className="flex flex-col" style={{ gap: 12 }}>
            {[5, 4, 3, 2, 1].map((n) => (
              <div key={n} role="listitem" aria-label={tx("{n} stars: {count}", "rating bar", { n, count: dist[n - 1] })} className="flex items-center" style={{ gap: 8 }}>
                <span aria-hidden className="inline-flex items-center" style={{ width: 20, fontSize: 13, fontWeight: 700, color: GOLD.ink }}>
                  {n}★
                </span>
                <span aria-hidden style={{ flex: 1, height: 8, borderRadius: 999, background: "rgba(255,255,255,0.8)", overflow: "hidden" }}>
                  <span style={{ display: "block", height: "100%", width: `${Math.round((dist[n - 1] / total) * 100)}%`, background: GOLD.star, borderRadius: 999 }} />
                </span>
                <span aria-hidden style={{ width: 24, textAlign: "end", fontSize: 13, color: GOLD.ink, fontVariantNumeric: "tabular-nums" }}>
                  {dist[n - 1]}
                </span>
              </div>
            ))}
          </div>
        </div>
        {canWrite && opensAt ? (
          <ReviewWaitNote opensAt={opensAt} boxed />
        ) : (
          (canWrite || canEdit) && (
            <button type="button" data-pr-write onClick={() => setFormOpen(true)} className="pr-web-press" style={{ ...prPrimary, width: "100%" }}>
              {canEdit ? t("Edit your review") : t("Write a review")}
            </button>
          )
        )}
      </aside>

      <div data-pr-rev-list className="pr-web-noscroll flex flex-col" style={{ minWidth: 0, minHeight: 0, overflow: "auto", gap: 10 }}>
        {signedOut ? (
          <PrEmpty icon={<LogIn size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />} title={t("Sign in to read reviews")} body={t("Reviews are from {name}'s clients, and members can read them.", { name: firstName })}>
            <button type="button" onClick={() => navigate("/app/onboarding")} className="pr-web-press" style={{ ...prPrimary, height: 40, padding: "0 16px", marginTop: 12 }}>
              {t("Sign in")}
            </button>
          </PrEmpty>
        ) : loading && rows.length === 0 ? (
          <MarketSkeleton radius={18} rows={4} height={300} label={tk("Loading reviews")} />
        ) : error && rows.length === 0 ? (
          <MarketError thing={tk("reviews")} onRetry={() => void reload()} />
        ) : rows.length === 0 ? (
          <PrEmpty icon={<Star size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />} title={t("No reviews yet")} />
        ) : (
          rows.map((r) => {
            const own = r.id === mine?.id;
            return (
              <article key={r.id} data-pr-review style={{ flex: "none", borderRadius: 16, border: HAIR, padding: "14px 16px" }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#241F1B", minWidth: 0 }}>
                    {own ? t("You") : r.reviewerName ?? t("A client")}
                  </span>
                  <PrStars n={r.rating} />
                  <span style={{ marginInlineStart: "auto", fontSize: 13, color: "#8C8378", whiteSpace: "nowrap" }}>{monthYear(r.createdAt, locale)}</span>
                  {!own && (
                    <button
                      type="button"
                      aria-label={t("Review options")}
                      aria-haspopup="menu"
                      aria-expanded={menuFor?.id === r.id}
                      onClick={(e) => setMenuFor({ id: r.id, anchor: e.currentTarget })}
                      className="pr-web-back grid place-items-center"
                      style={{ width: 28, height: 28, marginBlock: -6, marginInlineEnd: -8, borderRadius: 999, flex: "none" }}
                    >
                      <EllipsisVertical size={16} color="#8C8378" aria-hidden />
                    </button>
                  )}
                </div>
                {r.redactedAt ? (
                  <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: "22px", fontStyle: "italic", color: "#8C8378" }}>{t("A moderator removed this review. It no longer counts toward the rating.")}</p>
                ) : r.body ? (
                  <p style={{ margin: "6px 0 0", fontSize: 15, lineHeight: "22px", color: "#5B5349", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{r.body}</p>
                ) : null}
                {r.reply && (
                  <div data-pr-reply style={{ marginTop: 10, borderRadius: 12, background: "#F0EDF9", padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#5F5093" }}>{t("Reply from {name}", { name: firstName })}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349", whiteSpace: "pre-line", overflowWrap: "anywhere" }}>
                      {r.reply.redactedAt ? t("A moderator removed this reply. Only you can see that it was here.") : r.reply.body}
                    </p>
                  </div>
                )}
              </article>
            );
          })
        )}
        {error && rows.length > 0 && (
          <p role="alert" style={{ margin: 0, textAlign: "center", fontSize: 13, fontWeight: 600, color: "#C0392B" }}>
            {t(error)}
          </p>
        )}
      </div>

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
          { value: "report", label: t("Report"), icon: <Flag size={15} strokeWidth={1.75} /> },
          ...(menuReview?.reply && !menuReview.reply.redactedAt ? [{ value: "report-reply", label: t("Report reply"), icon: <MessageSquareWarning size={15} strokeWidth={1.75} /> }] : []),
        ]}
        onSelect={(value) => {
          if (!menuFor) return;
          if (value === "report-reply") setReportingReplyId(menuFor.id);
          else setReportingId(menuFor.id);
        }}
      />
      <BottomSheet open={!!reportingReplyId} onClose={() => setReportingReplyId(null)} title={t("Report this reply")}>
        {reportingReplyId && (
          <ReviewReportForm
            onSend={async (reason, detail) => {
              const r = await reportReply(reportingReplyId, reason, detail);
              return r.ok ? null : r.message;
            }}
          />
        )}
      </BottomSheet>
      <BottomSheet open={!!reportingId} onClose={() => setReportingId(null)} title={t("Report this review")}>
        {reportingId && (
          <ReviewReportForm
            onSend={async (reason, detail) => {
              const r = await reportReview(reportingId, reason, detail);
              return r.ok ? null : r.message;
            }}
          />
        )}
      </BottomSheet>
    </PrFrameWeb>
  );
};
