import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette, tierRank, tierStyle } from "../../theme/marketTokens";
import { tierProgress } from "../../services/achievements";
import { PointsFigure } from "../../components/market/PointsFigure";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";
import { expiringLine, nextRewardLine, todayLine } from "../../services/points";
import { fetchRewardCatalog, forAge, type CatalogOffer } from "../../services/offers";
import { forumAccess } from "../../services/forum/rules";
import { appLocale } from "../../i18n/format";

// Market + Share 3.0 · W2 · the points hero (C-MO.4.1 homeBronze / home /
// homeGold / homeExpiring / homeCap; HANDOVER §4 "Points hero"; Client Explore
// Screens lines 32–54, script `TV`, `todayLine`). Replaces the old PointsCard
// (Marketplace.tsx) for clients and professionals (ProfessionalExplore).
// Literal values: radius 20, padding 14 16, the tier fill and a 0.5px tier
// border; "Points" 10 / 15 800 1.4px caps and the day line 11 / 16 700, both
// in the tier's TEXT ink (W1 Q1); the balance 44 / 52 700 tabular with the 30
// tier icon (gap 8, margin-top 2); the next-reward row (margin-top 6, gap 12,
// 12 / 17: lead 700 --ink, detail --faint); the 5-tall bar (margin-top 8,
// tier track, tier ink fill); the expiring row (margin-top 10, radius 12,
// padding 8 10, --cautionbg, a 6 --caution dot, 11.5 / 16 700 --caution);
// the How to earn / History pills (margin-top 12, two columns gap 8; 36
// tall, radius 10, tier pill fill, 0.5px tier border, 12.5 / 700 tier TEXT
// ink). Every figure is the server's: my_points_summary (balance, tier,
// earned_today of daily_cap, expiring_soon on expiring_soon_date) and
// the cheapest live offers (the next reward, offer_catalogue(); no
// supplement offers for an under-18: the reader's rule, and forAge as the
// second guard).
//
// Kept from the old card (PLAN §3.1): the by-source breakdown moved to Points
// history, the tier disc rail to How to earn "Tiers", the tap-through to
// Achievements to How to earn "All achievements". The old "Rewards for your
// points are coming soon." line is gone (no longer true).

export function PointsHero() {
  const { pointsSummary, pointTiers, user } = useApp();
  const adult = forumAccess(user.dateOfBirth) === "adult";
  const navigate = useNavigate();
  const dark = useIsDark();
  const reduced = useReducedMotion();
  const m = marketPalette(dark);
  const [offers, setOffers] = useState<CatalogOffer[] | null>(null);
  // The skeleton shows while the summary loads, not for ever (the old card's 6 s).
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    if (pointsSummary) return;
    const id = window.setTimeout(() => setGaveUp(true), 6000);
    return () => window.clearTimeout(id);
  }, [pointsSummary]);
  useEffect(() => {
    let cancelled = false;
    // The live offers (offer_catalogue); a failed read falls back to tier progress.
    void fetchRewardCatalog("all").then((r) => {
      if (!cancelled) setOffers(r.ok ? r.value : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  const howPress = usePress();
  const histPress = usePress();

  if (!pointsSummary) {
    return gaveUp ? null : <div aria-hidden className="animate-skeleton-pulse" style={{ height: 186, borderRadius: 20, background: m.soft }} />;
  }
  const rank = tierRank(pointTiers, pointsSummary.tierName);
  const t = tierStyle(rank, dark);
  const extras = pointsSummary.extras ?? null;
  const next = nextRewardLine(pointsSummary.balance, offers ? forAge(offers, adult) : null, {
    nextTierName: pointsSummary.nextTierName,
    pointsToNextTier: pointsSummary.pointsToNextTier,
    progress: tierProgress(pointsSummary),
  });
  const expiring = expiringLine(extras);
  const pill = (label: string, to: string, press: ReturnType<typeof usePress>) => (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="market-focus hit"
      {...press.handlers}
      style={{
        height: 36,
        // The board's span has no box-sizing reset: 36 plus the 0.5px border.
        boxSizing: "content-box",
        padding: 0,
        borderRadius: 10,
        background: t.pill,
        border: `0.5px solid ${t.border}`,
        color: t.text,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        font: "inherit",
        fontSize: textPx(12.5),
        fontWeight: 700,
        cursor: "pointer",
        ...press.style,
      }}
    >
      {label}
    </button>
  );
  return (
    <section
      aria-label={`${pointsSummary.tierName} tier, ${pointsSummary.balance.toLocaleString(appLocale("en-US"))} points`}
      data-points-hero=""
      style={{ borderRadius: 20, padding: "14px 16px", background: t.fill, border: `0.5px solid ${t.border}`, color: m.ink, lineHeight: "normal" }}
    >
      <style>{FOCUS_CSS}</style>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span style={{ fontSize: textPx(10), lineHeight: linePx(15), fontWeight: 800, textTransform: "uppercase", letterSpacing: "1.4px", color: t.text }}>Points</span>
        {extras ? <span style={{ fontSize: textPx(11), lineHeight: linePx(16), fontWeight: 700, color: t.text }}>{todayLine(extras)}</span> : null}
      </div>
      <div style={{ marginTop: 2 }}>
        <PointsFigure value={pointsSummary.balance} mark="tier" rank={rank} tierName={pointsSummary.tierName} />
      </div>
      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 12, fontSize: textPx(12), lineHeight: linePx(17) }}>
        <span style={{ fontWeight: 700, flexShrink: 0 }}>{next.lead}</span>
        {next.detail ? <span style={{ color: m.faint, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{next.detail}</span> : null}
      </div>
      <div aria-hidden style={{ height: 5, borderRadius: 999, overflow: "hidden", marginTop: 8, background: t.track }}>
        <div style={{ height: "100%", width: `${next.pct}%`, borderRadius: 999, background: t.ink, transition: reduced ? "none" : "width 0.7s cubic-bezier(0.22,1,0.36,1)" }} />
      </div>
      {expiring ? (
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, borderRadius: 12, padding: "8px 10px", background: m.cautionbg }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: m.caution, flexShrink: 0 }} />
          <span style={{ fontSize: textPx(11.5), lineHeight: linePx(16), fontWeight: 700, color: m.caution }}>{expiring}</span>
        </div>
      ) : null}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {pill("How to earn", "/app/marketplace/points/earn", howPress)}
        {pill("History", "/app/marketplace/points/history", histPress)}
      </div>
    </section>
  );
}
