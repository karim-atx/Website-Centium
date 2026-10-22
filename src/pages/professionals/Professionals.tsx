import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { List, Map as MapIcon, Users } from "lucide-react";
import { DataSharingSummary } from "../../components/professionals/DataSharingSummary";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { FixedHeader } from "../../components/ui/FixedHeader";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { fetchPublicDirectory, type DirectoryListing } from "../../services/directory";
import { useApp } from "../../context/AppContext";
import { fetchLinkedProfessionals } from "../../services/consent";
import type { Enums } from "../../../lib/supabase/database.types";
import { DirectoryCard } from "../../components/professionals/DirectoryCard";
import { SUBTYPE_LABELS } from "../../components/professionals/subtypeLabels";
import { NearbyView } from "../../components/professionals/NearbyView";
import { YourReviewsSection } from "../../components/professionals/YourReviewsSection";
import { VerifiedCheck, VerifiedExplainer } from "../../components/cv/CvBadges";
import { LicencePendingTag } from "../../components/professionals/LicencePendingTag";
import { CvView } from "../../components/cv/CvView";
import { cvIsEmpty, fetchPublicCv, type PublicCv } from "../../services/professional-cv";
import { fetchConnectedProfessional, professionalRole, type ConnectedProfessional } from "../../services/connected-professional";
import { searchDirectory, type DirectoryHit } from "../../services/pro-profile";
import { ProfessionalCard, MarketAvatar } from "../../components/market/ProfessionalCard";
import { MarketError, MarketOffline, MarketSkeleton } from "../../components/market/MarketStates";
import { FOCUS_CSS } from "../../components/market/usePress";
import { useIsDark } from "../../hooks/useIsDark";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { textPx } from "../../theme/textSize";
import { marketPalette } from "../../theme/marketTokens";
import { BackRow, Chevron, EmptyBlock } from "./profile/parts";
import { hitCard, matchesQuery } from "./profile/profileModel";

// Market + Share 3.0 · W5 · C-MO.4.9 `proDir` "Directory · ranked search"
// (Client Professional Screens lines 26–50): the back row with "Professionals"
// 22 / 800; the search field (margin-top 10, 48 tall, radius 14, 1.5px
// --fill, padding 0 14, gap 10, the 17 search icon in --faint, the text
// 14 / 600); "Best match first: Centium work history, reviews and distance."
// 11.5 / 16 --faint (margin-top 10); the cards (margin-top 12, gap 10): the
// shared ProfessionalCard (one identity everywhere).
//
// RANKING (D-44, DB10): only search_directory ranks (work history 40%,
// reviews 40%, distance 20%, server side). Until it answers the list is the
// live public_professional_directory (alphabetical), with NO ranking line and
// no hired line on the cards; the search field filters it on the device.
//
// KEPT LIVE FEATURES (PLAN §3.2), restyled in the handover chrome:
// - List / Map under the search field (NearbyView / NearbyMap: area picker,
//   location prompt, swipe strip, screen-reader list), and the subtype rail;
// - "Your professional" row (a listed one opens their profile, an unlisted
//   one the profile + CV sheet), the Verified check and the licence-pending
//   tag; "New" until 3 reviews (on the cards);
// - "Your reviews" (YourReviewsSection) and Data sharing (DataSharingSummary)
//   under the list.
// The header block stays one fixed area (FixedHeader) so it also sits over the
// map, as before.

type Subtype = Enums<"professional_subtype">;
const subtypeLabels: Record<Subtype, string> = SUBTYPE_LABELS;

type Ranked = { query: string; hits: DirectoryHit[] } | null;

export default function Professionals() {
  const { user, authUserId, theme, accessibility } = useApp();
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const hc = !!accessibility.highContrast;

  const [view, setView] = useState<"list" | "map">("list");
  const [type, setType] = useState<Subtype | null>(null);
  const [query, setQuery] = useState("");
  const [linkedProfileOpen, setLinkedProfileOpen] = useState(false);

  // THE ROW NEEDS AN ACCOUNT, NOT A CODE: the relationship from
  // professional_clients (fetchLinkedProfessionals); the local
  // linkedProfessionalCode only names it until that answers.
  const [linkedProfessionalId, setLinkedProfessionalId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    void fetchLinkedProfessionals().then((result) => {
      if (cancelled || result.status !== "ok") return;
      setLinkedProfessionalId(result.professionals[0]?.professionalId ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [linkedDetail, setLinkedDetail] = useState<ConnectedProfessional | null>(null);
  const [linkedCv, setLinkedCv] = useState<PublicCv | null>(null);
  const [linkedError, setLinkedError] = useState<string | null>(null);
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

  const hasLinkedProfessional = !!linkedProfessionalId || !!user.linkedProfessionalCode;
  const linkedName = linkedDetail?.firstName ?? user.linkedProfessionalName ?? "Your professional";

  // The live directory (public_professional_directory): no contact columns
  // are selected (services/directory LISTING_COLUMNS; D-27).
  const [listings, setListings] = useState<DirectoryListing[] | null>(null);
  const [directoryError, setDirectoryError] = useState(false);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void fetchPublicDirectory().then((result) => {
      if (cancelled) return;
      if (!result.ok) {
        setDirectoryError(true);
        setListings((prev) => prev ?? []);
        return;
      }
      setDirectoryError(false);
      setListings(result.listings);
    });
    return () => {
      cancelled = true;
    };
  }, [reload]);

  // The ranked search (DB10). Debounced; a pending, failed or offline answer
  // keeps the live list (the quiet state), never an error over it.
  const [ranked, setRanked] = useState<Ranked>(null);
  useEffect(() => {
    let live = true;
    const q = query.trim();
    const t = window.setTimeout(() => {
      // awaiting DB stage DB10
      void searchDirectory({ query: q || null, specialty: null, lat: null, lng: null }).then((r) => {
        if (!live) return;
        setRanked(r.ok ? { query: q, hits: r.value } : null);
      });
    }, q ? 300 : 0);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [query]);

  const byId = useMemo(() => new Map((listings ?? []).map((l) => [l.profileId, l])), [listings]);
  const isRanked = !!ranked;
  const shownListings = (listings ?? []).filter((l) => (type ? l.subtype === type : true) && matchesQuery(l, query));
  // A ranked hit filtered by the rail through the live listing's subtype (the
  // hit carries none); one that isn't in the live directory shows under All only.
  const shownHits = (ranked?.hits ?? []).filter((h) => (type ? byId.get(h.id)?.subtype === type : true));
  const count = isRanked ? shownHits.length : shownListings.length;

  const linkedListed = !!linkedProfessionalId && (listings ?? []).some((l) => l.profileId === linkedProfessionalId);
  const openLinked = () => {
    if (linkedListed) navigate(`/app/professionals/${linkedProfessionalId}`);
    else setLinkedProfileOpen(true);
  };

  const loading = listings === null && !directoryError && !isRanked;
  const filtering = !!query.trim() || !!type;

  return (
    <div style={{ lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <FixedHeader paddingBottom={12}>
        <BackRow title="Professionals" />

        <label
          style={{ marginTop: 10, height: 48, boxSizing: "border-box", borderRadius: 14, border: `1.5px solid ${m.fill}`, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", cursor: "text" }}
        >
          <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ flex: "none", ...NO_ICON_SCALE }}>
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search professionals"
            aria-label="Search professionals"
            className="placeholder:text-charcoal-faint"
            style={{ flex: 1, minWidth: 0, height: "100%", border: 0, outline: "none", background: "transparent", font: "inherit", fontSize: textPx(14), fontWeight: 600, color: m.ink }}
          />
        </label>

        {isRanked && view === "list" ? (
          <p style={{ margin: "10px 0 0", fontSize: textPx(11.5), lineHeight: "16px", color: m.faint }}>Best match first: Centium work history, reviews and distance.</p>
        ) : null}

        {/* Kept: List / Map (the live segmented track, in the handover's
            idle ink) and the subtype rail. */}
        <SegmentedTabs
          className="mb-2.5"
          items={[
            { key: "list", label: "List", icon: <List size={17} strokeWidth={1.75} aria-hidden /> },
            { key: "map", label: "Map", icon: <MapIcon size={17} strokeWidth={1.75} aria-hidden /> },
          ]}
          activeKey={view}
          onChange={(k) => setView(k as "list" | "map")}
          labelSize={15}
          idleInk={hc ? "rgb(var(--c-charcoal-soft))" : m.segink}
          darkTone="partB"
          iconGap={7}
          trackStyle={{ marginTop: 12 }}
        />
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

      {/* "Your professional" (kept, not drawn): the first item under the
          header, in the card chrome (radius 18, --card, 0.5px --hair,
          padding 12 16, gap 12): the 36 avatar, the caps eyebrow, the name
          14 / 800 with the Verified check, the licence-pending tag. */}
      {hasLinkedProfessional && (
        <button
          type="button"
          onClick={openLinked}
          aria-label={`Your professional, ${linkedName}. Open profile`}
          className="market-focus"
          style={{ width: "100%", marginBottom: 10, minHeight: 56, display: "flex", alignItems: "center", gap: 12, borderRadius: 18, background: m.card, border: `0.5px solid ${m.hair}`, padding: "10px 16px", textAlign: "left", font: "inherit", color: m.ink, cursor: "pointer" }}
        >
          <MarketAvatar id={linkedProfessionalId ?? "linked"} name={linkedName} photoUrl={linkedDetail?.avatarUrl ?? null} size={36} fontSize={13} />
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: m.faint }}>Your professional</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
              <span style={{ fontSize: textPx(14), fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{linkedName}</span>
              {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={14} />}
            </span>
            {linkedDetail?.licenceVerified === false && <LicencePendingTag className="mt-0.5" size={11} />}
          </span>
          <Chevron color={m.faint} />
        </button>
      )}

      {view === "map" && <NearbyView authUserId={authUserId} dark={theme === "dark"} subtype={type} />}

      <div style={{ display: view === "map" ? "none" : "flex", flexDirection: "column", gap: 10 }}>
        {listings !== null && <MarketOffline loaded />}
        {isRanked
          ? shownHits.map((h, i) => {
              const l = byId.get(h.id);
              return (
                <ProfessionalCard
                  key={h.id}
                  pro={hitCard(h, l?.avatarUrl)}
                  rank={i + 1}
                  nameAdornment={l?.hasVerifiedLicence ? <VerifiedCheck size={15} /> : undefined}
                  onPress={() => navigate(`/app/professionals/${h.id}`)}
                />
              );
            })
          : shownListings.map((p) => <DirectoryCard key={p.profileId} listing={p} />)}

        {loading && <MarketSkeleton radius={18} rows={3} height={121} count={3} label="Loading professionals" />}
        {directoryError && !isRanked && <MarketError thing="professionals" onRetry={() => { setDirectoryError(false); setListings((prev) => (prev && prev.length > 0 ? prev : null)); setReload((n) => n + 1); }} />}
        {!loading && !(directoryError && !isRanked) && count === 0 && (
          <EmptyBlock
            icon={<Users size={24} strokeWidth={1.75} aria-hidden style={NO_ICON_SCALE} />}
            title={filtering ? (query.trim() ? "No professionals match" : "No professionals in this category yet") : "No professionals listed yet"}
            body={
              filtering
                ? query.trim()
                  ? "Try another search."
                  : "Try a different category."
                : "Professionals choose whether to appear here. If you already work with one, ask them for their client code to connect."
            }
            style={{ paddingTop: 24, paddingBottom: 8 }}
          />
        )}
      </div>

      {/* Kept under the list or map: "Your reviews (N)" (the way to reach a
          review of an unlisted or past professional) and Data sharing (privacy
          controls, off the client's real relationships). */}
      <div className="mt-6">
        <YourReviewsSection authUserId={authUserId} />
        <DataSharingSummary />
      </div>

      {/* The connected professional's profile and CV, for one who is not in
          the directory (connected_professional_summary + the public CV views,
          which a connected client may always read). */}
      <BottomSheet open={linkedProfileOpen} onClose={() => setLinkedProfileOpen(false)} title={linkedName} size="tall">
        <div className="space-y-4" style={{ lineHeight: "normal" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MarketAvatar id={linkedProfessionalId ?? "linked"} name={linkedName} photoUrl={linkedDetail?.avatarUrl ?? null} size={52} fontSize={16} />
            <div style={{ minWidth: 0 }}>
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: textPx(15), fontWeight: 800, color: m.ink }}>{linkedName}</span>
                {linkedDetail?.hasVerifiedLicence && <VerifiedCheck size={16} />}
              </p>
              {linkedDetail?.headline && <p style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: m.accent }}>{linkedDetail.headline}</p>}
              <p style={{ margin: 0, fontSize: textPx(12), color: m.ink2 }}>
                {[linkedDetail ? professionalRole(linkedDetail) : null, linkedDetail?.location].filter(Boolean).join(" · ")}
              </p>
              {linkedDetail?.licenceVerified === false && <LicencePendingTag className="mt-0.5" />}
            </div>
          </div>

          {linkedError && <p role="alert" style={{ margin: 0, fontSize: textPx(12.5), fontWeight: 600, color: m.high }}>{linkedError}</p>}
          {!linkedError && !linkedCv && linkedProfessionalId && <MarketSkeleton radius={18} rows={3} label="Loading" />}

          {linkedDetail?.bio && (
            <p style={{ margin: 0, fontSize: textPx(13), lineHeight: "19.5px", color: m.ink2, whiteSpace: "pre-line" }}>{linkedDetail.bio}</p>
          )}

          {linkedCv &&
            (cvIsEmpty(linkedCv, linkedDetail?.skills ?? []) ? (
              <p style={{ margin: 0, fontSize: textPx(13), color: m.faint }}>{linkedName.split(" ")[0]} hasn't added a CV yet.</p>
            ) : (
              <CvView cv={linkedCv} skills={linkedDetail?.skills ?? []} accent={{ label: m.faint, pillBg: m.pale, pillInk: m.pdark }} />
            ))}
          {linkedDetail?.hasVerifiedLicence && <VerifiedExplainer />}
        </div>
      </BottomSheet>
    </div>
  );
}
