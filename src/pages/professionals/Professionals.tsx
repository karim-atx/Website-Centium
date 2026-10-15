import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "../../components/ui/PageHeader";
import { DataSharingSummary } from "../../components/professionals/DataSharingSummary";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { fetchPublicDirectory, type DirectoryListing } from "../../services/directory";
import { useApp } from "../../context/AppContext";
import { fetchLinkedProfessionals } from "../../services/consent";
import type { ProfessionalType } from "../../types";
import type { Enums } from "../../../lib/supabase/database.types";
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

const linkedIcon = (subtype?: string) =>
  subtype && subtype in professionalTypeIcon ? professionalTypeIcon[subtype as ProfessionalType] : UserCheck;

// Keyed on the DATABASE enum, not the app's four-value ProfessionalType. The
// two nearly agree, except professional_subtype also has 'other' — a real
// account can hold it, so a directory that only knew four would silently drop
// those professionals from every filter.
type Subtype = Enums<"professional_subtype">;

// The chip labels, shared with the card (SUBTYPE_LABELS).
const subtypeLabels: Record<Subtype, string> = SUBTYPE_LABELS;


export default function Professionals() {
  const { user, authUserId, theme, accessibility } = useApp();
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
  // MO1.2 O2 / O4: Retry re-runs the read.
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await fetchPublicDirectory();
      if (cancelled) return;
      if (!result.ok) {
        // O2 / O4 (OURS): our own line, not the raw service message.
        setDirectoryError(
          typeof navigator !== "undefined" && navigator.onLine === false
            ? "You're offline. Try again when you're connected."
            : "Couldn't load professionals."
        );
        setListings((prev) => prev ?? []);
        return;
      }
      setDirectoryError(null);
      setListings(result.listings);
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);
  const hc = !!accessibility.highContrast;

  const filtered = (listings ?? []).filter((l) => (type ? l.subtype === type : true));

  // A LISTED PROFESSIONAL HAS A PAGE (MO1.2.1), so the row opens it; an
  // unlisted one has none, so the row opens the profile and CV sheet, which
  // reads the connected view any connected client may read.
  const linkedListed = !!linkedProfessionalId && (listings ?? []).some((l) => l.profileId === linkedProfessionalId);
  const openLinked = () => {
    if (linkedListed) navigate(`/app/professionals/${linkedProfessionalId}`);
    else setLinkedProfileOpen(true);
  };

  return (
    <div>
      {/* v6 MO1.2 #1 / S5: header, List · Map and the category rail in one
          fixed area (shared FixedHeader: page fill + 1px hairline once the
          list passes under, 120 ms, none under Reduce motion; V6-91 dark
          #121317). 16 under the rail (pad 16), cards start flush under it.
          On the Map tab the same area sits over the map (S6). */}
      <FixedHeader paddingBottom={16}>
        <PageHeader
          title="Professionals"
          subtitle="Trainers, dietitians, physiotherapists & doctors"
          showBack
          // #6: 16 from the header to List / Map.
          bottomGap={16}
        />

        {/* #6-#10: List / Map, 15/22.5 700. Active #A79AD5 white (the
            shared --c-seg-active: #5B48B8 under High contrast, dark #A991FE
            with #0D0B1A); idle #F5F4FE with #5B5349; dark track and idle
            #303141 with #B8B3C7 (darkTone partB). Icon 17, 7 to the label,
            in the label ink (dark too: the drawn white icon on #A991FE is a
            table slip, recommendation recorded). */}
        <SegmentedTabs
          className="mb-2.5"
          items={[
            { key: "list", label: "List", icon: <List size={17} strokeWidth={1.75} aria-hidden /> },
            { key: "map", label: "Map", icon: <MapIcon size={17} strokeWidth={1.75} aria-hidden /> },
          ]}
          activeKey={view}
          onChange={(k) => setView(k as "list" | "map")}
          labelSize={15}
          idleInk="rgb(var(--c-charcoal-soft))"
          darkTone="partB"
          iconGap={7}
        />

        {/* #11-#13: the categories on the #F4F3F9 rail (dark #242730,
            V6-93), r12 on the left, running off the right edge; chips 32,
            r9, 0 14, 4 apart, 12/18. Active #A198DF white (High contrast
            #5B48B8; dark #A991FE with #0D0B1A); idle transparent 600 in
            #5B5349 / #B8B3C7. */}
        <SegmentedTabs
          className="-mr-4"
          scroll
          items={[{ key: "all", label: "All" }, ...(Object.keys(subtypeLabels) as Subtype[]).map((t) => ({ key: t, label: subtypeLabels[t] }))]}
          activeKey={type ?? "all"}
          onChange={(k) => setType(k === "all" ? null : (k as Subtype))}
          labelSize={12}
          tabHeight={32}
          idleWeight={600}
          tabRadius={9}
          scrollTabPadding="0 14px"
          scrollMinWidth={0}
          trackStyle={{
            padding: 4,
            gap: 4,
            borderRadius: "12px 0 0 12px",
            paddingRight: 16,
            background: dark ? "rgb(var(--c-seg-track))" : "rgb(var(--th-f4f3f9))",
          }}
          light={{
            activeFill: hc ? "rgb(var(--c-seg-active))" : "rgb(var(--th-a198df))",
            activeInk: "#FFFFFF",
            idleFill: "transparent",
            idleInk: "rgb(var(--c-charcoal-soft))",
          }}
          idleFillDark="transparent"
          idleInkDark="rgb(var(--c-charcoal-soft))"
        />
      </FixedHeader>

      {/* "YOUR PROFESSIONAL" (K1, restore round 3): not drawn on MO1.2. It
          cannot sit inside the fixed area (Q-P1), so it is the first item
          under the rail, above the list and the map, and scrolls away. Row
          56, r20, 0.5px hairline as #14, the directory card's type colours
          on a 36 avatar (photo, initials, or the type icon with no name). */}
      {hasLinkedProfessional && (
        <button
          type="button"
          onClick={openLinked}
          aria-label={`Your professional, ${linkedName}. Open profile`}
          className="tap mb-3 w-full min-h-[56px] flex items-center gap-3 rounded-[20px] bg-cream-card border-[0.5px] border-hair-08 px-4 py-2.5 text-left animate-fade-slide-up"
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
          <span className="flex-1 min-w-0">
            {/* Foundations `eyebrow`: 9/700 uppercase, 1.2, 0.16em; in the type colour. */}
            <span
              className="block text-[9px] font-bold uppercase tracking-[0.16em] leading-[1.2] mb-0.5"
              style={{ color: linkedColours.main }}
            >
              Your professional
            </span>
            <span className="flex items-center gap-[5px] min-w-0">
              <span className="text-[14px] font-semibold text-charcoal truncate">{linkedName}</span>
              {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={14} />}
            </span>
          </span>
          <ChevronRight size={16} className="shrink-0 text-charcoal-faint" aria-hidden />
        </button>
      )}

      {view === "map" && (
        <NearbyView authUserId={authUserId} dark={theme === "dark"} subtype={type} />
      )}

      {/* #14: cards 12 apart. */}
      <div className={`space-y-3 ${view === "map" ? "hidden" : ""}`}>
        {filtered.map((p) => (
          <DirectoryCard key={p.profileId} listing={p} />
        ))}

        {/* O1 (OURS): three 224 skeletons at the cards' radius in the
            skeleton fill (#F5F5F6 / #242730), pulse 1.2 s, static under
            Reduce motion (X-32). */}
        {listings === null && !directoryError && (
          <>
            {[0, 1, 2].map((i) => (
              <div key={i} aria-hidden className="h-[224px] rounded-[20px] bg-cream-soft animate-skeleton-pulse" />
            ))}
            <span className="sr-only">Loading professionals…</span>
          </>
        )}
        {/* O2 / O4 (OURS): 12.5/18.8 500 #C0392B / #F09A8E and a Retry text
            button (#7D6BB5 / #C3B3FB, 44 target). Anything already loaded
            stays listed above it. */}
        {directoryError && (
          <p role="alert" className="flex flex-wrap items-center justify-center gap-x-2 text-[12.5px] leading-[18.8px] font-medium text-status-high text-center py-2">
            <span>{directoryError}</span>
            <button
              type="button"
              onClick={() => {
                setDirectoryError(null);
                setListings((prev) => (prev && prev.length > 0 ? prev : null));
                setReload((n) => n + 1);
              }}
              className="tap font-bold text-th-7d6bb5 dark:text-th-c3b3fb"
            >
              Retry
            </button>
          </p>
        )}
        {/* O3 (OURS): Foundations empty block: 56 tile r16 #F0EDF9 / #303141
            with Users 26 #7D6BB5 / #C3B3FB, title 15/700, one line 12.5/500.
            Category empty takes the handover's line as its title. */}
        {listings !== null && !directoryError && filtered.length === 0 && (
          <div className="flex flex-col items-center text-center py-8">
            <span className="w-14 h-14 rounded-2xl bg-th-f0edf9 dark:bg-th-303141 flex items-center justify-center text-th-7d6bb5 dark:text-th-c3b3fb">
              <Users size={26} strokeWidth={1.5} aria-hidden />
            </span>
            <p className="text-[15px] font-bold text-charcoal mt-3">
              {listings.length === 0 ? "No professionals listed yet" : "No professionals in this category yet"}
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
