import React from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx, linePx } from "../../../theme/textSize";
import { marketPalette } from "../../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../../components/pro/proInk";
import { MarketError, MarketSkeleton } from "../../../components/market/MarketStates";
import { FOCUS_CSS } from "../../../components/market/usePress";
import { EmptyBlock, PressButton, TextAction } from "./parts";
import type { ReviewLine } from "./profileModel";
import { t, tk } from "../../../i18n/core";

// Market + Share 3.0 · W5 · C-MO.4.9 `proReviews` / `proReviewsEmpty`
// (Client Professional Screens lines 134–156). Literal values: the card
// (margin-top 14, radius 18, --card, 0.5px --hair, overflow hidden); the
// summary row (padding 14 16, gap 12): the average 30 / 34 800, five 13 stars
// in --gold (gap 2) and the count line 11.5 --faint (margin-top 2); the rows
// (padding 12 16, 0.5px --div rule): the first name 12.5 / 800 and the date
// 12.5 --faint (space-between, gap 8), the class and gym 11.5 / 600 --accent
// (margin-top 1), the text 12.5 / 18 --ink2 (margin-top 4).
//
// Data (D-43): the live client reviews (professional_reviews through
// useProfessionalReviews) and, once DB10 answers, the class reviews with the
// gym's name, one list newest first. Kept (PLAN §3.2): the signed-out gate
// (review text has no anon grant), "See all reviews" to the full Reviews page
// (distribution bars, the professional's reply, Report / Report reply), and
// the reader's own review card with Edit (passed in as `mine`).

const StarRow: React.FC<{ filled: number }> = ({ filled }) => {
  const m = marketPalette(useIsDark());
  return (
    <span role="img" aria-label={t("{n} out of 5 stars", { n: filled })} style={{ display: "flex", gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} width={13} height={13} viewBox="0 0 24 24" fill={i < filled ? m.gold : "none"} stroke={i < filled ? m.gold : m.border} strokeWidth={1.5} strokeLinejoin="round" aria-hidden style={{ display: "block", ...NO_ICON_SCALE }}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </span>
  );
};

export const ReviewsTab: React.FC<{
  signedOut: boolean;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
  lines: ReviewLine[];
  /** "4.8" or "New". */
  figure: string;
  /** The average for the stars (0 when New). */
  stars: number;
  /** "38 reviews from class clients" / "12 reviews" / "No reviews yet". */
  countLine: string;
  firstName: string;
  /** The full Reviews page (distribution, reply, report), when there are client reviews. */
  onSeeAll?: () => void;
  mine?: React.ReactNode;
}> = ({ signedOut, loading, error, onRetry, lines, figure, stars, countLine, firstName, onSeeAll, mine }) => {
  const m = marketPalette(useIsDark());
  const navigate = useNavigate();
  const who = firstName || t("this professional");
  const summary = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
      <span style={{ fontSize: textPx(30), lineHeight: linePx(34), fontWeight: 800, color: m.ink }}>{t(figure)}</span>
      <div>
        <StarRow filled={stars} />
        <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 2 }}>{countLine}</div>
      </div>
    </div>
  );
  const card: React.CSSProperties = { marginTop: 14, borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, overflow: "hidden", color: m.ink };

  let content: React.ReactNode;
  if (signedOut) {
    content = (
      <>
        <div style={card}>{summary}</div>
        <EmptyBlock icon={<LogIn size={24} strokeWidth={1.75} aria-hidden style={NO_ICON_SCALE} />} title={t("Sign in to read reviews")} body={firstName ? t("Reviews are from {name}'s clients, and members can read them.", { name: firstName }) : t("Reviews are from their clients, and members can read them.")}>
          <PressButton onClick={() => navigate("/app/onboarding")} style={{ height: 44, padding: "0 18px", borderRadius: 14, border: 0, background: m.fill, color: m.onfill, font: "inherit", fontSize: textPx(14), fontWeight: 800, cursor: "pointer" }}>
            {t("Sign in")}
          </PressButton>
        </EmptyBlock>
      </>
    );
  } else if (loading) {
    content = <MarketSkeleton radius={18} rows={4} height={200} label={tk("Loading reviews")} style={{ marginTop: 14 }} />;
  } else if (error && lines.length === 0) {
    content = <MarketError thing={tk("reviews")} onRetry={onRetry} style={{ marginTop: 14 }} />;
  } else if (lines.length === 0) {
    content = <EmptyBlock title={t("No reviews yet")} body={t("Clients can review {name} after a class they teach at a gym on Centium.", { name: who })} />;
  } else {
    content = (
      <>
        <div style={card}>
          {summary}
          <ul aria-label={t("Reviews")} style={{ margin: 0, padding: 0, listStyle: "none" }}>
            {lines.map((r) => (
              <li key={r.id} style={{ padding: "12px 16px", borderTop: `0.5px solid ${m.div}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: textPx(12.5) }}>
                  <span style={{ fontWeight: 800 }}>{r.who}</span>
                  <span style={{ color: m.faint, whiteSpace: "nowrap" }}>{r.when}</span>
                </div>
                {r.context ? <div style={{ fontSize: textPx(11.5), fontWeight: 600, color: m.accent, marginTop: 1 }}>{r.context}</div> : null}
                <div style={{ fontSize: textPx(12.5), lineHeight: linePx(18), color: m.ink2, marginTop: 4, whiteSpace: "pre-line", overflowWrap: "anywhere" }}>{r.text ?? t("Rated {n} out of 5.", { n: r.rating })}</div>
              </li>
            ))}
          </ul>
        </div>
        {error ? (
          <p role="alert" style={{ margin: "8px 0 0", fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>
            {t(error)}
          </p>
        ) : null}
      </>
    );
  }

  return (
    <div style={{ lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      {content}
      {onSeeAll && !signedOut ? (
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <TextAction onClick={onSeeAll}>{t("See all reviews")}</TextAction>
        </div>
      ) : null}
      {mine ? <div style={{ marginTop: 18 }}>{mine}</div> : null}
    </div>
  );
};
