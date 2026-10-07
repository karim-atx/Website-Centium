import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataSharingSummary } from "../../components/professionals/DataSharingSummary";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { fetchPublicDirectory, type DirectoryListing } from "../../services/directory";
import { useApp } from "../../context/AppContext";
import { fetchLinkedProfessionals } from "../../services/consent";
import type { ProfessionalType } from "../../types";
import type { Enums } from "../../../lib/supabase/database.types";
import ProfessionalDashboard from "./ProfessionalDashboard";
import { DirectoryCard } from "../../components/professionals/DirectoryCard";
import { SUBTYPE_LABELS } from "../../components/professionals/subtypeLabels";
import { NearbyView } from "../../components/professionals/NearbyView";
import { YourReviewsSection } from "../../components/professionals/YourReviewsSection";
import { initials, typeColours } from "../../components/professionals/typeColour";
import { VerifiedCheck, VerifiedExplainer } from "../../components/cv/CvBadges";
import { CvView } from "../../components/cv/CvView";
import { cvIsEmpty, fetchPublicCv, type PublicCv } from "../../services/professional-cv";
import {
  fetchConnectedProfessional,
  professionalRole,
  type ConnectedProfessional,
} from "../../services/connected-professional";
import { professionalTypeIcon } from "../../utils/icons";
import { ChevronRight, List, Map as MapIcon, UserCheck, Users } from "lucide-react";
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
// draw them: the Name / Top rated sort and the Verified explainer line under
// the list. Kept under the list: "Your reviews" (it is the only way to reach a
// review of an unlisted or past professional, so removing it would strand what
// the user wrote) and Data sharing (privacy controls).
//
// RESTORE ROUND (user, 2026-10-07): "Your professional" is back, as a slim row
// above List / Map (the full card is gone). A listed professional opens their
// profile page; an unlisted one opens the profile and CV sheet as before.
// Restore round 2 (user, 2026-10-07): the row carries main's headline, role
// line and View Profile again.

const linkedIcon = (subtype?: string) =>
  subtype && subtype in professionalTypeIcon ? professionalTypeIcon[subtype as ProfessionalType] : UserCheck;

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
  const navigate = useNavigate();
  const [linkedProfileOpen, setLinkedProfileOpen] = useState(false);

  // THE ROW NEEDS AN ACCOUNT, NOT A CODE. It is rendered from
  // `user.linkedProfessionalCode`, local onboarding state — fine for showing a
  // name, but the profile and CV hang off the real relationship from
  // professional_clients via fetchLinkedProfessionals.
  const [linkedProfessionalId, setLinkedProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLinkedProfessionals().then((result) => {
      if (cancelled || result.status !== "ok") return;
      // One row, one professional: this surface has only ever shown a single
      // linked professional, so the first active relationship is the subject.
      setLinkedProfessionalId(result.professionals[0]?.professionalId ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The linked professional's profile and CV, read when the sheet opens.
  const [linkedDetail, setLinkedDetail] = useState<ConnectedProfessional | null>(null);
  const [linkedCv, setLinkedCv] = useState<PublicCv | null>(null);
  const [linkedError, setLinkedError] = useState<string | null>(null);

  // The profile is read as soon as the relationship is known — the row shows
  // the real name — and the CV when the sheet opens.
  useEffect(() => {
    if (!linkedProfessionalId) return;
    let cancelled = false;
    void fetchConnectedProfessional(linkedProfessionalId).then((detail) => {
      if (cancelled) return;
      if (!detail.ok) setLinkedError(detail.message);
      else setLinkedDetail(detail.professional);
    });
    return () => {
      cancelled = true;
    };
  }, [linkedProfessionalId]);

  useEffect(() => {
    if (!linkedProfileOpen || !linkedProfessionalId) return;
    let cancelled = false;
    void fetchPublicCv(linkedProfessionalId).then((cv) => {
      if (cancelled) return;
      if (!cv.ok) {
        setLinkedError(cv.message);
        return;
      }
      setLinkedError(null);
      setLinkedCv(cv.cv);
    });
    return () => {
      cancelled = true;
    };
  }, [linkedProfileOpen, linkedProfessionalId]);

  // THE ROW FOLLOWS THE REAL RELATIONSHIP. It used to render only from
  // `user.linkedProfessionalCode`, which is set when a code is redeemed during
  // onboarding on this device — so a client connected any other way (an
  // accepted hire request, another device) never saw it at all.
  const hasLinkedProfessional = !!linkedProfessionalId || !!user.linkedProfessionalCode;
  const linkedName = linkedDetail?.firstName ?? user.linkedProfessionalName ?? "Your professional";
  const linkedSubtype = linkedDetail?.subtype ?? user.linkedProfessionalSubtype;
  /** The row's type colours, as the directory card's (B3). */
  const linkedColours = typeColours(linkedSubtype ?? null, dark);

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

  // A LISTED PROFESSIONAL HAS A PAGE (MO1.2.1), so the row opens it; an
  // unlisted one has none, so the row opens the profile and CV sheet, which
  // reads the connected view any connected client may read.
  const linkedListed = !!linkedProfessionalId && (listings ?? []).some((l) => l.profileId === linkedProfessionalId);
  const openLinked = () => {
    if (linkedListed) navigate(`/app/professionals/${linkedProfessionalId}`);
    else setLinkedProfileOpen(true);
  };

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

      {/* "YOUR PROFESSIONAL" (restore round, user, 2026-10-07): a slim row
          above List / Map, so it is there in both views. Not drawn on MO1.2;
          it takes the page's own row (Your reviews: 56 min, r20, card on the
          option border) with the directory card's type colours on a 36
          avatar (photo or initials) and a Foundations eyebrow.
          Restore round 2 (user, 2026-10-07): the headline, the role line
          ("Linked to your account" when there is none) and View Profile are
          back, as on main's card, in the row: the headline 12.5/600 and the
          role 11.5/500 in the type colours (the directory card's), the name
          14/700 in the type's deep; View Profile on the right as the
          directory card's button (type button tint, r12, 12.5/700, Chevron
          14) at 32 tall in a 44 pt target. As on main, a tap anywhere on the
          row opens the profile and View Profile is the keyboard and
          screen-reader path to the same place. */}
      {hasLinkedProfessional && (
        <div
          onClick={openLinked}
          className="cursor-pointer mb-3 w-full min-h-[56px] flex items-center gap-3 rounded-[20px] bg-cream-card border border-charcoal/[0.08] pl-4 pr-3 py-2.5 animate-fade-slide-up"
        >
          <span
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 overflow-hidden text-[13px] font-bold"
            style={{ background: linkedColours.pill, color: linkedColours.deep }}
            aria-hidden
          >
            {linkedDetail?.avatarUrl ? (
              <img src={linkedDetail.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : linkedDetail?.firstName || user.linkedProfessionalName ? (
              initials(linkedName)
            ) : (
              (() => {
                const Icon = linkedIcon(linkedSubtype);
                return <Icon size={17} strokeWidth={1.75} />;
              })()
            )}
          </span>
          <div className="flex-1 min-w-0">
            {/* Foundations `eyebrow`: 9/700 uppercase, 1.2, 0.16em; in the type colour. */}
            <p
              className="text-[9px] font-bold uppercase tracking-[0.16em] leading-[1.2] mb-0.5"
              style={{ color: linkedColours.main }}
            >
              Your professional
            </p>
            <p className="flex items-center gap-[5px] min-w-0">
              <span className="text-[14px] font-bold truncate" style={{ color: linkedColours.deep }}>
                {linkedName}
              </span>
              {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={14} />}
            </p>
            {linkedDetail?.headline && (
              <p className="text-[12.5px] font-semibold line-clamp-2 break-words" style={{ color: linkedColours.main }}>
                {linkedDetail.headline}
              </p>
            )}
            <p className="text-[11.5px] font-medium truncate" style={{ color: linkedColours.main }}>
              {(linkedDetail ? professionalRole(linkedDetail) : null) ?? "Linked to your account"}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openLinked();
            }}
            className="tap h-11 shrink-0 flex items-center"
          >
            <span
              className="h-8 px-3 rounded-xl flex items-center gap-1 text-[12.5px] font-bold"
              style={{ background: linkedColours.button, color: linkedColours.deep }}
            >
              View Profile <ChevronRight size={14} aria-hidden />
            </span>
          </button>
        </div>
      )}

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

      {/* THE CONNECTED PROFESSIONAL'S REAL PROFILE AND CV, for one who is not
          in the directory (restore round). It reads
          connected_professional_summary and the public CV views, which a
          connected client may always read — the same CV and Verified marks
          the public profile shows. The document itself is never shown to
          clients; the badge is what a client gets. */}
      <BottomSheet open={linkedProfileOpen} onClose={() => setLinkedProfileOpen(false)} title={linkedName} size="tall">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span
              className="w-12 h-12 rounded-full flex items-center justify-center shrink-0 overflow-hidden text-[16px] font-bold"
              style={{ background: linkedColours.pill, color: linkedColours.deep }}
            >
              {linkedDetail?.avatarUrl ? (
                <img src={linkedDetail.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (() => {
                  const Icon = linkedIcon(linkedSubtype);
                  return <Icon size={22} aria-hidden />;
                })()
              )}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold truncate" style={{ color: linkedColours.deep }}>
                  {linkedName}
                </span>
                {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={16} />}
              </p>
              {linkedDetail?.headline && (
                <p className="text-[12.5px] font-semibold break-words" style={{ color: linkedColours.main }}>
                  {linkedDetail.headline}
                </p>
              )}
              <p className="text-[11.5px] font-medium text-charcoal-soft">
                {[linkedDetail ? professionalRole(linkedDetail) : null, linkedDetail?.location].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {linkedError && <p className="text-[12.5px] font-medium text-status-high">{linkedError}</p>}
          {!linkedError && !linkedCv && linkedProfessionalId && <p className="text-sm text-charcoal-faint">Loading…</p>}

          {linkedDetail?.bio && (
            <div>
              <p className="section-label text-charcoal-soft mb-1.5">About</p>
              <p className="text-sm text-charcoal leading-relaxed whitespace-pre-line">{linkedDetail.bio}</p>
            </div>
          )}

          {linkedCv && (cvIsEmpty(linkedCv, linkedDetail?.skills ?? []) ? (
            <p className="text-sm text-charcoal-faint">
              {linkedName.split(" ")[0]} hasn't added a CV yet.
            </p>
          ) : (
            <CvView
              cv={linkedCv}
              skills={linkedDetail?.skills ?? []}
              accent={{ label: linkedColours.main, pillBg: linkedColours.pill, pillInk: linkedColours.deep }}
            />
          ))}
          {linkedDetail?.hasVerifiedLicence && <VerifiedExplainer />}
        </div>
      </BottomSheet>
    </div>
  );
}
