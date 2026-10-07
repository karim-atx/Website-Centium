import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataSharingSummary } from "../../components/professionals/DataSharingSummary";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { fetchPublicDirectory, type DirectoryListing } from "../../services/directory";
import { useApp } from "../../context/AppContext";
import type { Enums } from "../../../lib/supabase/database.types";
import ProfessionalDashboard from "./ProfessionalDashboard";
import { DirectoryCard } from "../../components/professionals/DirectoryCard";
import { SUBTYPE_LABELS } from "../../components/professionals/subtypeLabels";
import { NearbyView } from "../../components/professionals/NearbyView";
import { YourReviewsSection } from "../../components/professionals/YourReviewsSection";
import { List, Map as MapIcon, Users } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";

// LINKED_PROFESSIONAL_REVIEW_ID USED TO LIVE HERE, and it was the literal
// string "me": a sentinel key under which a client's review of their linked
// professional was stored in localStorage, and which the professional's own
// Profile read back — from their own device, where no client had ever written
// it. Reviews are professional_reviews rows keyed on the professional's real
// account uuid now, so the sentinel is gone rather than left as an import
// nothing can honour.
//
// HANDOVER-COMPLETE PASS (MO1.2 / MO1.2.2): the page is the header, List / Map,
// the category rail and the cards, as drawn. Removed because the frames don't
// draw them: the "Your professional" card and its profile / CV sheet (a
// connected professional is still reached from Data sharing below, Profile ›
// Connected professionals and, when listed, their card), the Name / Top rated
// sort and the Verified explainer line under the list. Kept under the list:
// "Your reviews" (it is the only way to reach a review of an unlisted or past
// professional, so removing it would strand what the user wrote) and Data
// sharing (privacy controls).

// Keyed on the DATABASE enum, not the app's four-value ProfessionalType. The
// two nearly agree, except professional_subtype also has 'other' — a real
// account can hold it, so a directory that only knew four would silently drop
// those professionals from every filter.
type Subtype = Enums<"professional_subtype">;

// The chip labels, shared with the card (SUBTYPE_LABELS).
const subtypeLabels: Record<Subtype, string> = SUBTYPE_LABELS;

/**
 * The old toggle's and chips' light colours, kept on the segmented controls:
 * both existed before the redesign (4fdc109), so their light colours stay
 * pre-R1 (decision 22). Layout and sizes follow the frame.
 */
const CONTROL_LIGHT = {
  activeFill: "rgb(var(--c-primary-fill))",
  activeInk: "rgb(var(--c-on-primary-fill))",
  idleFill: "rgb(var(--c-cream-card))",
  idleInk: "rgb(var(--c-charcoal-soft))",
};

export default function Professionals() {
  const { user, authUserId, theme } = useApp();
  const dark = useIsDark();
  /**
   * LIST OR MAP. The list is the directory, unchanged and open to everyone;
   * the map needs an account (the database's search is signed-in only) and
   * asks for a location only once it is chosen. The category rail filters both.
   */
  const [view, setView] = useState<"list" | "map">("list");
  const [type, setType] = useState<Subtype | null>(null);

  // The real directory, replacing the static mockProfessionals array this
  // page browsed until now. Those entries were not accounts — their ids
  // ("pr1") could never hold a relationship — so every listing was a
  // dead end dressed as a profile. See services/directory.
  const [listings, setListings] = useState<DirectoryListing[] | null>(null);
  const [directoryError, setDirectoryError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchPublicDirectory();
      if (cancelled) return;
      if (!result.ok) {
        setDirectoryError(result.message);
        setListings([]);
        return;
      }
      setDirectoryError(null);
      setListings(result.listings);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = (listings ?? []).filter((l) => (type ? l.subtype === type : true));

  // Professionals get an entirely different dashboard here (client roster,
  // not a directory to browse) — separate UI per QA, not just a banner.
  if (user.accountType === "professional") {
    return <ProfessionalDashboard />;
  }

  return (
    <div>
      <PageHeader
        title="Professionals"
        subtitle="Trainers, dietitians, physiotherapists & doctors"
        showBack
        // MO1.2: 16 from the header to List / Map (91 → 107 on the frame).
        bottomGap={16}
      />

      {/* MO1.2: List / Map as full-width segmented tabs under the header; the
          rail sits 10 under it as drawn. */}
      <SegmentedTabs
        className="mb-2.5"
        items={[
          { key: "list", label: "List", icon: <List size={17} strokeWidth={1.75} aria-hidden /> },
          { key: "map", label: "Map", icon: <MapIcon size={17} strokeWidth={1.75} aria-hidden /> },
        ]}
        activeKey={view}
        onChange={(k) => setView(k as "list" | "map")}
        labelSize={15}
        light={CONTROL_LIGHT}
      />

      {/* MO1.2: the categories in a tinted rail that runs off the right edge.
          Idle labels 12/600; tabs at their natural width, 14 either side of
          the label (measured on the frame: "All" is 43 wide). */}
      <SegmentedTabs
        className="mb-4 -mr-4"
        scroll
        items={[{ key: "all", label: "All" }, ...(Object.keys(subtypeLabels) as Subtype[]).map((t) => ({ key: t, label: subtypeLabels[t] }))]}
        activeKey={type ?? "all"}
        onChange={(k) => setType(k === "all" ? null : (k as Subtype))}
        labelSize={12}
        tabHeight={32}
        idleWeight={600}
        scrollTabPadding="0 14px"
        scrollMinWidth={0}
        // The rail's track is the FO3 sub-tab container (#F4F3F9, measured on
        // the frame), new in the redesign so it takes the handover's colour
        // (decision 22); dark keeps SegmentedTabs' own track.
        trackStyle={{
          padding: 4,
          borderRadius: "16px 0 0 16px",
          paddingRight: 16,
          ...(dark ? {} : { background: "rgb(var(--th-f4f3f9))" }),
        }}
        light={CONTROL_LIGHT}
      />

      {view === "map" && (
        <NearbyView authUserId={authUserId} dark={theme === "dark"} subtype={type} />
      )}

      <div className={`space-y-3 ${view === "map" ? "hidden" : ""}`}>
        {filtered.map((p) => (
          <DirectoryCard key={p.profileId} listing={p} />
        ))}

        {/* Three outcomes, deliberately distinct. An empty directory is the
            expected steady state until professionals opt in, and saying so
            plainly beats a blank screen; a failed request is not the same
            thing and must not borrow that wording. */}
        {/* MO1.2 States, Loading: skeleton blocks at the cards' positions
            (surface.soft, the card's radius 20, 224 tall as drawn). */}
        {listings === null && !directoryError && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} aria-hidden className="h-[224px] rounded-[20px] bg-cream-soft" />
            ))}
            <span className="sr-only">Loading professionals…</span>
          </>
        )}
        {/* States, Error: an inline line in danger. */}
        {directoryError && (
          <p role="alert" className="text-[12.5px] font-medium text-status-high text-center py-2">
            {directoryError}
          </p>
        )}
        {/* States, Empty: Foundations › Empty state (56 primary.tint tile with
            a 26 thin-stroke icon in primary.accent, title 15/700, one line
            12.5/500 muted, max width 260). */}
        {listings !== null && !directoryError && filtered.length === 0 && (
          <div className="flex flex-col items-center text-center py-8">
            <span className="w-14 h-14 rounded-2xl bg-th-f0edf9 dark:bg-primary/15 flex items-center justify-center text-th-7d67d9 dark:text-primary-accent">
              <Users size={26} strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-[15px] font-bold text-charcoal mt-3">
              {listings.length === 0 ? "No professionals listed yet" : "None in this category"}
            </p>
            <p className="text-[12.5px] font-medium text-charcoal-faint mt-1 leading-relaxed max-w-[260px]">
              {listings.length === 0
                ? "Professionals choose whether to appear here. If you already work with one, ask them for their client code to connect."
                : "Try a different category."}
            </p>
          </div>
        )}
      </div>

      {/* Under the list or map, not drawn but kept (handover-complete pass):

          "Your reviews (N)": one row for every professional this client may
          review (current and past, listed or not), which expands in place
          to the same review cards and sheets. A listed professional's review
          is also on their profile page (MO1.2.1 "My review"); an unlisted one
          has no page, so this row is where that review is reached.

          Data sharing: privacy controls. These hang off the client's actual
          relationships, not the browse directory above — appearing in the
          directory is a professional advertising themselves, which grants
          them nothing until a client redeems their code. */}
      <div className="mt-6">
        <YourReviewsSection authUserId={authUserId} />
        <DataSharingSummary />
      </div>
    </div>
  );
}
