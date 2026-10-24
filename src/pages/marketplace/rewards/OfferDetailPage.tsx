import React, { useCallback, useEffect, useId, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Flag } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { useBack } from "../../../hooks/useBack";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { textPx, linePx } from "../../../theme/textSize";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { SEGMENT_STEPS, marketPalette, tierRank, tierStyle } from "../../../theme/marketTokens";
import { PinnedSlot } from "../../../components/ui/PinnedCta";
import { PointsFigure } from "../../../components/market/PointsFigure";
import { MarketEmptyCard, MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { hexAlpha, liftInk } from "../../../components/market/marketColor";
import { formatPoints } from "../../../components/market/pointsModel";
import { FOCUS_CSS, usePress } from "../../../components/market/usePress";
import { DIVIDER } from "../../../components/market/SegmentedTicketStrip";
import { fetchOfferDetail, type OfferDetail } from "../../../services/offers";
import { recordListingEvent, recordProfessionalEvent } from "../../../services/marketplace/listingEvents";
import type { MarketResult } from "../../../services/market/rpc";
import { offerCells, redeemGate } from "./rewardsModel";
import { BackRow, OwnerTile } from "./rewardsParts";
import { RedeemSheet } from "./RedeemDialogs";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { ReviewReportForm } from "../../../components/professionals/ReviewForms";
import { OFFER_REPORT_NOTE_MAX, OFFER_REPORT_REASONS, hasReportedOffer, reportOffer } from "../../../services/offers/report";

// Market + Share 3.0 · W2 · C-MO.4.4.2 Offer detail (`offer`, `offerLocked`)
// at /app/marketplace/rewards/:offerId. Literal values, Client Explore
// Screens lines 451–484 and the script's `offer` / `offerRows`:
// - back + the "OFFER" eyebrow; (margin-top 8, gap 12) the 44 owner tile and
//   the owner 13 / 700 --accent (a link to its showcase or profile);
// - the headline (margin-top 12) 24 / 30 800;
// - the cost block (margin-top 12) in the client's TIER colours: radius 18,
//   the tier fill, 0.5px the tier border, padding 14 16, baseline
//   space-between: the cost 28 / 700 tabular + the 20 leaf (gap 4), "You have
//   1,240" 12 / 700 in the tier's TEXT ink (W2 Q1);
// - the 2 × 2 grid (margin-top 12, radius 16, overflow hidden): cells
//   min-height 108, padding 14 12, a centred column (gap 5): the 18 icon
//   (stroke 1.9) in the step ink, the key 11 / 14 600 0.08em caps #6B6680,
//   the value 16 / 20 700 #17142A (text-wrap balance); the tints #EEEAF8 /
//   #ECEFF5 / #EBF2F4 / #E6F1EF, inks #7D67D9 / #667BB1 / #5A859E / #4F8F8A;
//   1.5px dashed rgba(36,31,27,0.16) dividers (left on the right column, top
//   on the second row); four 14 corner notches in the page colour;
// - Terms (margin-top 10): 50 tall, radius 16, 0.5px --hair, padding 0 14,
//   13.5 / 700 + the 16 chevron --faint; it expands the offer's terms (ours:
//   the board draws it closed);
// - "This discount is provided and honoured by {owner}." (margin-top 8)
//   11.5 / 17 --faint;
// - pinned (gap 8): when the balance is short "You need 1,760 more points"
//   12 / 600 --ink2 centred, and "Redeem for 900 points" 52 tall radius 16
//   --fill 15 / 800 (opacity 0.4 and inert when locked).
// The offer is offer_detail(p_offer_id) (fetchOfferDetail, Database PR #40):
// no row (gone, or not live by offer_is_live()) → the not-found card.
// Opening a live offer records offer_view (record_listing_event for a
// business, record_professional_event for a professional; Database PR #39).
//
// Ours (the board draws no report affordance): "Report this offer" under the
// honoured-by line opens the app's member report sheet (ReviewReportForm, as
// on professional reviews and shared cards) with report_offer's 300-character
// note. One report per member per offer: once the member's own offer_reports
// row exists (read back, or just sent) the row reads "You reported this
// offer." Hidden on a professional's own offer.

const ICONS: React.ReactNode[] = [
  <>
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </>,
  <>
    <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0" />
    <circle cx="12" cy="10" r="3" />
  </>,
  <>
    <circle cx="12" cy="8" r="5" />
    <path d="M20 21a8 8 0 0 0-16 0" />
  </>,
  <>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </>,
];

type Load = { state: "loading" } | { state: "done"; result: MarketResult<OfferDetail | null> };

export default function OfferDetailPage() {
  const { offerId = "" } = useParams<{ offerId: string }>();
  const { pointsSummary, pointTiers, refreshAchievements, authUserId } = useApp();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const back = useBack("/app/marketplace?tab=rewards");
  const reduce = useReducedMotion();
  const press = usePress();
  const termsId = useId();
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [termsOpen, setTermsOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  // Whether this member has reported the offer, keyed by the offer it was read for.
  const [reportedFor, setReportedFor] = useState<{ id: string; v: boolean | null } | null>(null);
  const reported = reportedFor?.id === offerId ? reportedFor.v : null;

  const fetchIt = useCallback(() => {
    let live = true;
    setLoad({ state: "loading" });
    void fetchOfferDetail(offerId).then((result) => live && setLoad({ state: "done", result }));
    return () => {
      live = false;
    };
  }, [offerId]);
  useEffect(() => fetchIt(), [fetchIt]);
  // DB5: an offer seen is offer_view with the offer as the item (once per
  // session here, once a day per viewer on the server, never the owner's own look).
  const seen = load.state === "done" && load.result.ok ? load.result.value : null;
  const seenId = seen?.offerId ?? null;
  const seenOwner = seen ? `${seen.ownerType}:${seen.ownerId}` : null;
  useEffect(() => {
    if (!seenId || !seenOwner) return;
    const [kind, ownerId] = seenOwner.split(":");
    if (!ownerId) return;
    if (kind === "business") recordListingEvent({ businessId: ownerId, kind: "offer_view", source: "direct", itemId: seenId });
    else recordProfessionalEvent({ professionalId: ownerId, kind: "offer_view", source: "direct", itemId: seenId });
  }, [seenId, seenOwner]);
  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void hasReportedOffer(offerId).then((v) => live && setReportedFor({ id: offerId, v }));
    return () => {
      live = false;
    };
  }, [offerId, authUserId]);
  // Opened straight from a link, the balance may not have been read yet:
  // the app's one points read (it re-reads my_points_summary).
  const summaryKnown = !!pointsSummary;
  useEffect(() => {
    if (!summaryKnown) refreshAchievements();
  }, [summaryKnown, refreshAchievements]);

  const shell = (content: React.ReactNode) => (
    <div style={{ paddingBottom: 32 }}>
      <BackRow onBack={back} eyebrow="Offer" />
      <div style={{ marginTop: 8 }}>{content}</div>
    </div>
  );

  if (load.state === "loading") return shell(<MarketSkeleton radius={18} count={3} rows={3} label="Loading this offer" />);
  const r = load.result;
  if (!r.ok) {
    return shell(<MarketError thing="this offer" onRetry={fetchIt} />);
  }
  const o = r.value;
  if (!o) return shell(<MarketEmptyCard title="This offer isn't available" body="It may have ended, sold out or been removed. Other rewards are on Explore." />);

  const balance = pointsSummary?.balance ?? 0;
  const tier = tierStyle(tierRank(pointTiers, pointsSummary?.tierName), dark);
  const gate = summaryKnown ? redeemGate(o, balance) : { locked: true, line: null };
  const cells = offerCells(o);
  const ownOffer = o.ownerType === "professional" && !!authUserId && o.ownerId === authUserId;
  const ownerHref = o.ownerType === "business" ? (o.ownerId ? `/app/marketplace/business?id=${encodeURIComponent(o.ownerId)}` : null) : o.ownerId ? `/app/professionals/${encodeURIComponent(o.ownerId)}` : null;
  const notch: React.CSSProperties = { position: "absolute", width: 14, height: 14, borderRadius: 999, background: m.page, pointerEvents: "none" };
  const divider = dark ? "1.5px dashed rgba(245,243,250,0.16)" : DIVIDER;

  return (
    <div style={{ paddingBottom: 172, lineHeight: "normal", color: m.ink }}>
      <style>{FOCUS_CSS}</style>
      <BackRow onBack={back} eyebrow="Offer" />

      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12 }}>
        <OwnerTile name={o.ownerName} logoUrl={o.ownerLogoUrl} size={44} />
        {ownerHref ? (
          <Link to={ownerHref} className="market-focus hit" style={{ fontSize: textPx(13), fontWeight: 700, color: m.accent, textDecoration: "none", minWidth: 0 }}>
            {o.ownerSubtitle}
          </Link>
        ) : (
          <span style={{ fontSize: textPx(13), fontWeight: 700, color: m.accent, minWidth: 0 }}>{o.ownerSubtitle}</span>
        )}
      </div>

      <h1 style={{ margin: "12px 0 0", fontSize: textPx(24), lineHeight: linePx(30), fontWeight: 800 }}>{o.headline}</h1>

      {/* The cost, in the client's tier colours */}
      <div style={{ marginTop: 12, borderRadius: 18, background: tier.fill, border: `0.5px solid ${tier.border}`, padding: "14px 16px", display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <PointsFigure value={o.pointsCost} mark="leaf" size={28} />
        {summaryKnown ? <span style={{ fontSize: textPx(12), fontWeight: 700, color: tier.text, whiteSpace: "nowrap" }}>You have {formatPoints(balance)}</span> : null}
      </div>

      {/* Valid · Where to use · Limit · Voucher expires */}
      <div style={{ marginTop: 12, position: "relative", display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", borderRadius: 16, overflow: "hidden" }}>
        {cells.map((c) => {
          const [bg, ink] = SEGMENT_STEPS[c.i];
          return (
            <div
              key={c.key}
              style={{
                minHeight: 108,
                boxSizing: "border-box",
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                textAlign: "center",
                background: dark ? hexAlpha(ink, 0.16) : bg,
                borderLeft: c.i % 2 ? divider : 0,
                borderTop: c.i > 1 ? divider : 0,
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={dark ? liftInk(ink) : ink} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ display: "block", ...NO_ICON_SCALE }}>
                {ICONS[c.i]}
              </svg>
              <span style={{ fontSize: textPx(11), lineHeight: linePx(14), fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: dark ? m.ink2 : "#6B6680" }}>{c.key}</span>
              <span style={{ fontSize: textPx(16), lineHeight: linePx(20), fontWeight: 700, color: dark ? m.ink : "#17142A", textWrap: "balance" } as React.CSSProperties}>{c.value}</span>
            </div>
          );
        })}
        <span aria-hidden style={{ ...notch, left: -7, top: -7 }} />
        <span aria-hidden style={{ ...notch, right: -7, top: -7 }} />
        <span aria-hidden style={{ ...notch, left: -7, bottom: -7 }} />
        <span aria-hidden style={{ ...notch, right: -7, bottom: -7 }} />
      </div>

      {/* Terms */}
      <div style={{ marginTop: 10, borderRadius: 16, border: `0.5px solid ${m.hair}` }}>
        <button
          type="button"
          aria-expanded={termsOpen}
          aria-controls={termsId}
          onClick={() => setTermsOpen((t) => !t)}
          className="market-focus"
          style={{ width: "100%", height: 50, padding: "0 14px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: 0, borderRadius: 16, font: "inherit", fontSize: textPx(13.5), fontWeight: 700, color: m.ink, cursor: "pointer" }}
        >
          Terms
          <svg
            width={16}
            height={16}
            viewBox="0 0 24 24"
            fill="none"
            stroke={m.faint}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            style={{ ...NO_ICON_SCALE, transform: termsOpen ? "rotate(180deg)" : undefined, transition: reduce ? undefined : "transform 140ms ease" }}
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        {termsOpen ? (
          <div id={termsId} style={{ padding: "0 14px 14px", fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2, whiteSpace: "pre-line" }}>
            {o.terms ?? "No extra terms for this offer."}
          </div>
        ) : null}
      </div>

      <p style={{ margin: "8px 0 0", fontSize: textPx(11.5), lineHeight: linePx(17), color: m.faint }}>This discount is provided and honoured by {o.ownerName}.</p>

      {authUserId && !ownOffer ? (
        reported ? (
          <p role="status" style={{ margin: "4px 0 0", minHeight: 44, display: "flex", alignItems: "center", gap: 6, fontSize: textPx(13), fontWeight: 700, color: m.ink2 }}>
            <Flag size={14} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} /> You reported this offer.
          </p>
        ) : (
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="market-focus"
            style={{ marginTop: 4, minHeight: 44, padding: 0, display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: 0, font: "inherit", fontSize: textPx(13), fontWeight: 700, color: m.ink2, cursor: "pointer" }}
          >
            <Flag size={14} strokeWidth={2} aria-hidden style={NO_ICON_SCALE} /> Report this offer
          </button>
        )
      ) : null}

      <PinnedSlot>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, lineHeight: "normal" }}>
          {gate.line ? (
            <div id="offer-locked-line" style={{ textAlign: "center", fontSize: textPx(12), fontWeight: 600, color: m.ink2 }}>
              {gate.line}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => !gate.locked && setSheetOpen(true)}
            aria-disabled={gate.locked || undefined}
            aria-describedby={gate.line ? "offer-locked-line" : undefined}
            className="market-focus"
            {...press.handlers}
            style={{
              height: 52,
              borderRadius: 16,
              border: 0,
              background: m.fill,
              color: m.onfill,
              font: "inherit",
              fontSize: textPx(15),
              fontWeight: 800,
              opacity: gate.locked ? 0.4 : 1,
              cursor: gate.locked ? "default" : "pointer",
              ...(gate.locked ? {} : press.style),
            }}
          >
            Redeem for {formatPoints(o.pointsCost)} points
          </button>
        </div>
      </PinnedSlot>

      <BottomSheet open={reportOpen} onClose={() => setReportOpen(false)} title="Report this offer">
        {reportOpen && (
          <ReviewReportForm
            reasons={OFFER_REPORT_REASONS}
            detailMax={OFFER_REPORT_NOTE_MAX}
            onSend={async (reason, detail) => {
              const r = await reportOffer(o.offerId, reason, detail);
              if (r.ok) setReportedFor({ id: o.offerId, v: true });
              return r.ok ? null : r.message;
            }}
          />
        )}
      </BottomSheet>

      <RedeemSheet open={sheetOpen} onClose={() => setSheetOpen(false)} offerId={o.offerId} headline={o.headline} owner={o.ownerSubtitle} cost={o.pointsCost} balance={balance} />
    </div>
  );
}
