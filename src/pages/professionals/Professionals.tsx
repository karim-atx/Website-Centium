import { useEffect, useState } from "react";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataSharingSummary } from "../../components/professionals/DataSharingSummary";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { fetchPublicDirectory, type DirectoryListing } from "../../services/directory";
import { useApp } from "../../context/AppContext";
import { fetchLinkedProfessionals } from "../../services/consent";
import type { ProfessionalType } from "../../types";
import type { Enums } from "../../../lib/supabase/database.types";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { ChevronRight, UserCheck } from "lucide-react";
import ProfessionalDashboard from "./ProfessionalDashboard";
import { VerifiedCheck, VerifiedExplainer } from "../../components/cv/CvBadges";
import { DirectoryCard } from "../../components/professionals/DirectoryCard";
import { initials, typeColours } from "../../components/professionals/typeColour";
import { SUBTYPE_LABELS } from "../../components/professionals/subtypeLabels";
import { NearbyView } from "../../components/professionals/NearbyView";
import { YourReviewsSection } from "../../components/professionals/YourReviewsSection";
import { sortByRating } from "../../services/professional-reviews/rules";
import { List, Map as MapIcon, Users } from "lucide-react";
import { useIsDark } from "../../hooks/useIsDark";
import { CvView } from "../../components/cv/CvView";
import { cvIsEmpty, fetchPublicCv, type PublicCv } from "../../services/professional-cv";
import {
  fetchConnectedProfessional,
  professionalRole,
  type ConnectedProfessional,
} from "../../services/connected-professional";
import { professionalTypeIcon } from "../../utils/icons";

// LINKED_PROFESSIONAL_REVIEW_ID USED TO LIVE HERE, and it was the literal
// string "me": a sentinel key under which a client's review of their linked
// professional was stored in localStorage, and which the professional's own
// Profile read back — from their own device, where no client had ever written
// it. Reviews are professional_reviews rows keyed on the professional's real
// account uuid now, so the sentinel is gone rather than left as an import
// nothing can honour.

const linkedIcon = (subtype?: string) =>
  subtype && subtype in professionalTypeIcon ? professionalTypeIcon[subtype as ProfessionalType] : UserCheck;

// Keyed on the DATABASE enum, not the app's four-value ProfessionalType. The
// two nearly agree, except professional_subtype also has 'other' — a real
// account can hold it, so a directory that only knew four would silently drop
// those professionals from every filter.
type Subtype = Enums<"professional_subtype">;

// The chip labels, shared with the card (SUBTYPE_LABELS).
const subtypeLabels: Record<Subtype, string> = SUBTYPE_LABELS;

/** The old toggle's and chips' light colours, kept on the segmented controls (decision 15). */
const CONTROL_LIGHT = {
  activeFill: "rgb(var(--c-primary-fill))",
  activeInk: "rgb(var(--c-on-primary-fill))",
  idleFill: "rgb(var(--c-cream-card))",
  idleInk: "rgb(var(--c-charcoal-soft))",
};

/** Foundations' FO3 sub-tabs in light: active `primary` / white, idle on the track / #5B5349 (the sort, decision 23). */
const SUBTAB_LIGHT = {
  // primary-fill and its ink: #AEA1DC / white in Centium light, and each
  // theme's own readable pair.
  activeFill: "rgb(var(--c-primary-fill))",
  activeInk: "rgb(var(--c-on-primary-fill))",
  idleFill: "transparent",
  idleInk: "rgb(var(--c-charcoal-soft))",
};

export default function Professionals() {
  const { user, authUserId, theme } = useApp();
  const dark = useIsDark();
  /**
   * LIST OR MAP. The list is the directory, unchanged and open to everyone;
   * the map needs an account (the database's search is signed-in only) and
   * asks for a location only once it is chosen. The category chips filter both.
   */
  const [view, setView] = useState<"list" | "map">("list");
  const [type, setType] = useState<Subtype | null>(null);
  const [linkedProfileOpen, setLinkedProfileOpen] = useState(false);
  /** The list's order: as the directory returns it (by name), or top rated first. */
  const [sort, setSort] = useState<"name" | "rating">("name");

  // THE CARD NEEDS AN ACCOUNT, NOT A CODE. It is rendered from
  // `user.linkedProfessionalCode`, local onboarding state — fine for showing a
  // name, but the profile and CV hang off the real relationship from
  // professional_clients via fetchLinkedProfessionals.
  const [linkedProfessionalId, setLinkedProfessionalId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchLinkedProfessionals().then((result) => {
      if (cancelled || result.status !== "ok") return;
      // One card, one professional: this surface has only ever shown a single
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

  // The profile is read as soon as the relationship is known — the card shows
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

  // THE CARD FOLLOWS THE REAL RELATIONSHIP. It used to render only from
  // `user.linkedProfessionalCode`, which is set when a code is redeemed during
  // onboarding on this device — so a client connected any other way (an
  // accepted hire request, another device) never saw it at all.
  const hasLinkedProfessional = !!linkedProfessionalId || !!user.linkedProfessionalCode;
  const linkedName = linkedDetail?.firstName ?? user.linkedProfessionalName ?? "Your professional";
  const linkedSubtype = linkedDetail?.subtype ?? user.linkedProfessionalSubtype;
  /** The linked card's type colours, as the directory card's (B3). */
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

  const byType = (listings ?? []).filter((l) => (type ? l.subtype === type : true));
  const filtered = sort === "rating" ? sortByRating(byType) : byType;

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
          rail sits 10 under it as drawn (decision 23, kept-list 38: the
          account sections moved below the list). */}
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
        <NearbyView authUserId={authUserId} dark={theme === "dark"} subtype={type} directory={listings ?? []} />
      )}

      <div className={`space-y-3 ${view === "map" ? "hidden" : ""}`}>
        {/* V7 (QA 7.0): a professional who added this client via a client code
            shows up here automatically — a separate identity from the browse
            directory, since it's not one of those listings. Decision 23
            (kept-list 63): a directory-style card (type-pill avatar, "Your
            professional" eyebrow) pinned above the list, replacing the
            gradient hero; a tap still opens the profile and CV sheet. */}
        {hasLinkedProfessional && (
          <div
            onClick={() => setLinkedProfileOpen(true)}
            className="cursor-pointer rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-4 animate-fade-slide-up"
          >
            <div className="flex items-center gap-3.5">
              <span
                className="w-[52px] h-[52px] rounded-full flex items-center justify-center shrink-0 overflow-hidden text-[18px] font-bold"
                style={{ background: linkedColours.pill, color: linkedColours.deep }}
              >
                {linkedDetail?.avatarUrl ? (
                  <img src={linkedDetail.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : linkedDetail?.firstName || user.linkedProfessionalName ? (
                  initials(linkedName)
                ) : (
                  (() => {
                    const Icon = linkedIcon(linkedSubtype);
                    return <Icon size={22} aria-hidden />;
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
                  <span className="text-[15px] font-bold truncate" style={{ color: linkedColours.deep }}>
                    {linkedName}
                  </span>
                  {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={16} />}
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
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setLinkedProfileOpen(true);
              }}
              // The directory card's View Profile (MO1.2: 40 tall, r12, 13.5/700, Chevron 14).
              className="tap mt-3.5 w-full h-10 rounded-xl flex items-center justify-center gap-1 text-[13.5px] font-bold"
              style={{ background: linkedColours.pill, color: linkedColours.deep }}
            >
              View Profile <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        )}
        {/* Decision 23 (kept-list 249): the sort as FO3 sub-tabs, #F4F3F9
            track r12 p4 gap 4, 32 items r9, 12 either side, 12/700 active on
            primary, 12/600 #5B5349 idle on the track. Dark keeps the
            SegmentedTabs dark colours. */}
        {(listings?.length ?? 0) > 1 && (
          <div role="group" aria-label="Sort" className="flex items-center gap-2">
            <span className="text-xs font-semibold text-charcoal-soft">Sort</span>
            <SegmentedTabs
              scroll
              items={[
                { key: "name", label: "Name" },
                { key: "rating", label: "Top rated" },
              ]}
              activeKey={sort}
              onChange={(k) => setSort(k as "name" | "rating")}
              labelSize={12}
              tabHeight={32}
              idleWeight={600}
              scrollTabPadding="0 12px"
              scrollMinWidth={0}
              tabRadius={9}
              trackStyle={{ padding: 4, gap: 4, borderRadius: 12, ...(dark ? {} : { background: "rgb(var(--th-f4f3f9))" }) }}
              light={SUBTAB_LIGHT}
            />
          </div>
        )}
        {filtered.map((p) => (
          <DirectoryCard key={p.profileId} listing={p} />
        ))}

        {/* The check's meaning, said once under the list rather than on
            every card — and only when a card actually carries one. */}
        {filtered.some((p) => p.hasVerifiedLicence) && <VerifiedExplainer />}

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

      {/* Account management under the list or map (decision 23, kept-list
          38–39), so the rail sits 10 under List / Map as drawn.

          "Your reviews (N)": one row for every professional this client may
          review (current and past, listed or not), which expands in place
          to the same review cards and sheets. A listed professional's review
          is also on their profile page (MO1.2.1 "My review"); an unlisted one
          has no page, so this row is where that right is reached. */}
      <div className="mt-6">
        <YourReviewsSection authUserId={authUserId} />

        {/* Real data-sharing controls. These hang off the client's actual
            relationships, not the browse directory above — appearing in the
            directory is a professional advertising themselves, which grants
            them nothing until a client redeems their code. Summarised rather
            than inline; see DataSharingSummary. */}
        <DataSharingSummary />
      </div>

      {/* THE CONNECTED PROFESSIONAL'S REAL PROFILE AND CV. This sheet used to
          read a certification, bio, phone, website and socials from fields on
          this device that nothing ever wrote, so it always said "No
          certification uploaded yet." It now reads connected_professional_summary
          and the public CV views, which a connected client may always read —
          the same CV and Verified marks the public profile shows. The document
          itself is never shown to clients; the badge is what a client gets. */}
      <BottomSheet open={linkedProfileOpen} onClose={() => setLinkedProfileOpen(false)} title={linkedName} size="tall">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
              {linkedDetail?.avatarUrl ? (
                <img src={linkedDetail.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                (() => {
                  const Icon = linkedIcon(linkedSubtype);
                  return <Icon size={22} className="text-primary-dark" />;
                })()
              )}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5">
                <span className="font-display font-semibold text-lg text-charcoal truncate">
                  {linkedName}
                </span>
                {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={18} />}
              </p>
              {linkedDetail?.headline && (
                <p className="text-[13px] font-semibold text-primary-deep-text break-words">{linkedDetail.headline}</p>
              )}
              <p className="text-xs text-charcoal-soft">
                {[linkedDetail ? professionalRole(linkedDetail) : null, linkedDetail?.location].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>

          {linkedError && <p className="text-sm text-status-high">{linkedError}</p>}
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
            <CvView cv={linkedCv} skills={linkedDetail?.skills ?? []} />
          ))}
          {linkedDetail?.hasVerifiedLicence && <VerifiedExplainer />}
        </div>
      </BottomSheet>
    </div>
  );
}
