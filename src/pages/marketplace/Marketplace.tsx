import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Gift, Ticket } from "lucide-react";
import { useWebLayout, WEB_CONTENT_MAX } from "../../components/web/useWebLayout";
import Discover from "./Discover";
import { useApp } from "../../context/AppContext";
import { FixedHeader } from "../../components/ui/FixedHeader";
import BusinessDashboard from "./BusinessDashboard";
import ProfessionalExplore from "./ProfessionalExplore";
import { useBack } from "../../hooks/useBack";
import { useIsDark } from "../../hooks/useIsDark";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { PointsFigure } from "../../components/market/PointsFigure";
import { FOCUS_CSS, usePress } from "../../components/market/usePress";
import { PointsHero } from "./PointsHero";
import { appLocale } from "../../i18n/format";
import { t, tn } from "../../i18n/core";

// Market + Share 3.0 · W2 · client Explore (C-MO.4.1 Marketplace Home; HANDOVER
// §4 Client Marketplace; Client Explore Screens lines 26–81).
// - The header (lines 28–31): back 36, "Explore" 27 / 40.5 700 −0.6, "Gyms,
//   classes and rewards" 13 / 19.5 --faint, on the shared FixedHeader (the
//   live two-step pin: the header pins, then Discover's search and tracks pin
//   under it, Larger text's 40% rule). On Rewards the header carries the
//   balance with the leaf at its right (line 365, 17 / 700 + the 12 leaf).
//   The board draws the Gyms / Classes / Rewards lists under a compact 22 / 800
//   "Explore" header with no hero (C-MO.4.2 / 4.3 / 4.4): that is this same
//   page scrolled, with the hero gone under the pinned header.
// - The points hero (PointsHero), 16 under the header.
// - My bookings · My rewards: a --segtrack track (radius 16, padding 6, gap 5,
//   margin-top 10) of two --segidle / --segink 40-tall buttons (radius 12,
//   13 / 700) that open the two pages.
// - Discover: the search (D-20), the Gyms · Classes · Rewards track and the
//   lists; `?tab=` keeps the tab (gyms is the board's landing tab).
// The `explore_page` milestone is still recorded on mount.

export default function Marketplace() {
  const { user, noteFeatureMilestone } = useApp();
  const back = useBack();
  const [tabsPinned, setTabsPinned] = useState(false);
  const [params] = useSearchParams();
  const { web, rail } = useWebLayout();

  useEffect(() => {
    noteFeatureMilestone("explore_page");
  }, [noteFeatureMilestone]);

  if (user.accountType === "business") return <BusinessDashboard />;
  // Release 3 (MO17): a professional's Explore is its own screen, with the same points hero.
  if (user.accountType === "professional") return <ProfessionalExplore pointsCard={<div className="mb-3"><PointsHero /></div>} />;

  // Addendum A, WC-EX Discover (WC-EX Explore Web v4): a 64 header (Explore 24/32 600, the line beside it; the
  // balance on Rewards), then a 12-column grid (8 on the rail, up to 1600 wide): the points hero 5 (4) beside the
  // My bookings · My rewards tiles 7 (4), then Discover. Mobile keeps its own screen below.
  if (web)
    return (
      <div>
        <header className="flex items-center" style={{ height: 64, boxSizing: "border-box", gap: 14, paddingInline: rail ? 24 : 32, borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
          <h1 className="m-0 whitespace-nowrap text-charcoal" style={{ fontSize: 24, lineHeight: "32px", fontWeight: 600, letterSpacing: "-0.6px" }}>
            {t("Explore")}
          </h1>
          <p className="m-0 flex-1 min-w-0 truncate" style={{ fontSize: 13, lineHeight: "20px", color: "#71685E" }}>
            {t("Gyms, classes and rewards")}
          </p>
          {params.get("tab") === "rewards" ? <HeaderBalance /> : null}
        </header>
        <div className="grid" style={{ maxWidth: WEB_CONTENT_MAX, margin: "0 auto", boxSizing: "border-box", padding: `24px ${rail ? 24 : 32}px`, gridTemplateColumns: `repeat(${rail ? 8 : 12},minmax(0,1fr))`, columnGap: 24, rowGap: 16, alignContent: "start" }}>
          <div className="min-w-0" style={{ gridColumn: `span ${rail ? 4 : 5}` }}>
            <PointsHero />
          </div>
          <ExploreTilesWeb span={rail ? 4 : 7} />
          <div className="min-w-0" style={{ gridColumn: "1 / -1" }}>
            <Discover web />
          </div>
        </div>
      </div>
    );

  return (
    <div>
      <FixedHeader paddingBottom={0} hideHairline={tabsPinned}>
        <div className="flex items-start gap-1.5">
          <button
            onClick={back}
            aria-label={t("Back")}
            className="tap w-9 h-9 mt-0.5 rounded-full flex items-center justify-center text-charcoal-soft shrink-0 -ms-[7px]"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="m-0" style={{ fontSize: textPx(27), lineHeight: linePx(40.5), fontWeight: 700, letterSpacing: "-0.6px" }}>
              <span className="text-charcoal">{t("Explore")}</span>
            </h1>
            <p className="m-0 text-charcoal-faint" style={{ fontSize: textPx(13), lineHeight: linePx(19.5) }}>
              {t("Gyms, classes and rewards")}
            </p>
          </div>
          {params.get("tab") === "rewards" ? <HeaderBalance /> : null}
        </div>
      </FixedHeader>

      <div className="mt-4">
        <PointsHero />
      </div>
      <ExploreLinks />
      <Discover onPinnedChange={setTabsPinned} />
    </div>
  );
}

/** Line 365: the balance + leaf at the header's right on Rewards. */
function HeaderBalance() {
  const { pointsSummary } = useApp();
  if (!pointsSummary) return null;
  return (
    <span className="shrink-0 self-center" aria-label={tn(pointsSummary.balance, "{n} point", "{n} points", { n: pointsSummary.balance.toLocaleString(appLocale("en-US")) })}>
      <PointsFigure value={pointsSummary.balance} mark="leaf" size={17} />
    </span>
  );
}

/** Lines 55–58: My bookings · My rewards. */
function ExploreLinks() {
  const navigate = useNavigate();
  const m = marketPalette(useIsDark());
  const a = usePress();
  const b = usePress();
  const item = (label: string, to: string, p: ReturnType<typeof usePress>) => (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="market-focus hit"
      {...p.handlers}
      style={{ flex: 1, height: 40, borderRadius: 12, border: 0, background: m.segidle, color: m.segink, font: "inherit", fontSize: textPx(13), fontWeight: 700, cursor: "pointer", minWidth: 0, ...p.style }}
    >
      {label}
    </button>
  );
  return (
    <nav aria-label={t("Your bookings and rewards")} style={{ marginTop: 10, display: "flex", gap: 5, padding: 6, borderRadius: 16, background: m.segtrack }}>
      <style>{FOCUS_CSS}</style>
      {item(t("My bookings"), "/app/marketplace/bookings", a)}
      {item(t("My rewards"), "/app/marketplace/rewards/mine", b)}
    </nav>
  );
}

/** WC-EX Explore Web v4 quick tiles: My bookings · My rewards on a #F3F3FD track (pad 8, r20); each tile r14, 16 18, a 44 white tile with the 20 glyph, the label 17/24 700 and a chevron. */
function ExploreTilesWeb({ span }: { span: number }) {
  const navigate = useNavigate();
  const items: [string, string, typeof Ticket][] = [
    [t("My bookings"), "/app/marketplace/bookings", Ticket],
    [t("My rewards"), "/app/marketplace/rewards/mine", Gift],
  ];
  return (
    <nav aria-label={t("Your bookings and rewards")} className="min-w-0 grid" style={{ gridColumn: `span ${span}`, boxSizing: "border-box", gridTemplateColumns: "1fr 1fr", gap: 8, padding: 8, borderRadius: 20, background: "#F3F3FD" }}>
      {items.map(([label, to, Icon]) => (
        <button
          key={to}
          type="button"
          onClick={() => navigate(to)}
          className="min-w-0 flex flex-col justify-between text-start hover:bg-[#EEEBFC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8]"
          style={{ borderRadius: 14, background: "#F5F4FE", border: "1px solid rgba(174,161,220,0.28)", padding: "16px 18px", gap: 16 }}
        >
          <span className="flex items-center justify-center" style={{ width: 44, height: 44, borderRadius: 12, background: "#FFFFFF" }}>
            <Icon size={20} strokeWidth={1.75} aria-hidden style={{ color: "#6D50D3" }} />
          </span>
          <span className="flex items-center" style={{ gap: 8 }}>
            <span className="flex-1 min-w-0" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#6D50D3" }}>
              {label}
            </span>
            <ChevronRight size={20} strokeWidth={1.75} aria-hidden style={{ color: "#6D50D3" }} />
          </span>
        </button>
      ))}
    </nav>
  );
}
