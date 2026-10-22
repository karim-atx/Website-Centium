import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
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

  useEffect(() => {
    noteFeatureMilestone("explore_page");
  }, [noteFeatureMilestone]);

  if (user.accountType === "business") return <BusinessDashboard />;
  // Release 3 (MO17): a professional's Explore is its own screen, with the same points hero.
  if (user.accountType === "professional") return <ProfessionalExplore pointsCard={<div className="mb-3"><PointsHero /></div>} />;

  return (
    <div>
      <FixedHeader paddingBottom={0} hideHairline={tabsPinned}>
        <div className="flex items-start gap-1.5">
          <button
            onClick={back}
            aria-label="Back"
            className="tap w-9 h-9 mt-0.5 rounded-full flex items-center justify-center text-charcoal-soft shrink-0 -ml-[7px]"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="m-0" style={{ fontSize: textPx(27), lineHeight: linePx(40.5), fontWeight: 700, letterSpacing: "-0.6px" }}>
              <span className="text-charcoal">Explore</span>
            </h1>
            <p className="m-0 text-charcoal-faint" style={{ fontSize: textPx(13), lineHeight: linePx(19.5) }}>
              Gyms, classes and rewards
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
    <span className="shrink-0 self-center" aria-label={`${pointsSummary.balance.toLocaleString("en-US")} points`}>
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
      className="market-focus"
      {...p.handlers}
      style={{ flex: 1, height: 40, borderRadius: 12, border: 0, background: m.segidle, color: m.segink, font: "inherit", fontSize: textPx(13), fontWeight: 700, cursor: "pointer", minWidth: 0, ...p.style }}
    >
      {label}
    </button>
  );
  return (
    <nav aria-label="Your bookings and rewards" style={{ marginTop: 10, display: "flex", gap: 5, padding: 6, borderRadius: 16, background: m.segtrack }}>
      <style>{FOCUS_CSS}</style>
      {item("My bookings", "/app/marketplace/bookings", a)}
      {item("My rewards", "/app/marketplace/rewards/mine", b)}
    </nav>
  );
}
