import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { BadgeCheck, ChevronRight, MapPin, UserCheck, Users, Wallet } from "lucide-react";
import type { Enums } from "../../../../lib/supabase/database.types";
import type { DirectoryListing } from "../../../services/directory";
import { professionalRole, type ConnectedProfessional } from "../../../services/connected-professional";
import { cvIsEmpty, fetchPublicCv, type PublicCv } from "../../../services/professional-cv";
import { placeOf } from "../../../components/market/peopleModel";
import { MarketAvatar } from "../../../components/market/ProfessionalCard";
import { MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { CvView } from "../../../components/cv/CvView";
import { VerifiedCheck, VerifiedExplainer } from "../../../components/cv/CvBadges";
import { LicencePendingTag } from "../../../components/professionals/LicencePendingTag";
import { YourReviewsSection } from "../../../components/professionals/YourReviewsSection";
import { DataSharingSummary } from "../../../components/professionals/DataSharingSummary";
import { useApp } from "../../../context/AppContext";
import { typeLabel } from "../profile/profileModel";
import type { DirectoryWeb } from "./useDirectoryWeb";
import { ProfilePaneWeb } from "./ProfilePaneWeb";
import { GoldStar, PrAvatar, PrEmpty, PrPill } from "./WebParts";
import { famOf, GOLD, HAIR, pricePill, ratingText, type Fam } from "./prWebStyles";
import { t, tk } from "../../../i18n/core";

type Subtype = Enums<"professional_subtype">;

interface Item {
  id: string;
  name: string;
  photoUrl: string | null;
  fam: Fam;
  hl: string | null;
  typeLine: string;
  loc: string | null;
  rating: string;
  price: string | null;
  bio: string | null;
  verified: boolean;
}

const fromListing = (l: DirectoryListing, loc?: string | null): Item => ({
  id: l.profileId,
  name: l.name,
  photoUrl: l.avatarUrl,
  fam: famOf(l.subtype),
  hl: l.headline?.trim() || l.specialty?.trim() || null,
  typeLine: typeLabel(l.subtype),
  loc: loc !== undefined ? loc : l.location?.trim() || null,
  rating: ratingText(l.averageRating, l.reviewCount),
  price: pricePill(l.monthlyRate, l.consultationRate),
  bio: l.bio?.trim() || null,
  verified: l.hasVerifiedLicence,
});

/**
 * Website viewport v1, WC-PR (WC-PR Professionals Web v3, `isList`): the list
 * column's cards (r20, padding 16; the selected one 1.5px in its family's main
 * on #FAF9FD, the others 0.5px on white; the 52 avatar, the name 17/22 700
 * with its check, the headline 13/18 600 and the type 13/18 500, the 26 pills
 * (area, the gold rating, price) 12 under, the bio 13/20 on two lines) and the
 * profile beside them; the empty card (#F5F5F6) with "Already work with
 * someone?" in the profile's place.
 *
 * As the mobile list: the live directory (alphabetical) or, with a point, the
 * ranked one (measured, cut and sorted on the device; the card's area then
 * reads its distance or "Online"), the category on the server or the device,
 * the loading, offline, error and filter-aware empty states, and "Your reviews"
 * and Data sharing under the list.
 */
export const DirectoryListWeb: React.FC<{
  top: React.ReactNode;
  dir: DirectoryWeb;
  type: Subtype | null;
  selected: string | null;
  filtering: boolean;
  maxKm: number | null;
}> = ({ top, dir, type, selected, filtering, maxKm }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { authUserId } = useApp();
  const byId = useMemo(() => new Map((dir.listings ?? []).map((l) => [l.profileId, l])), [dir.listings]);
  const isRanked = !!dir.ranked;

  const items: Item[] = useMemo(() => {
    if (isRanked) {
      return dir.shownHits.map((h) => {
        const l = byId.get(h.id);
        const loc = placeOf(h);
        if (l) return fromListing(l, loc);
        return {
          id: h.id,
          name: h.name,
          photoUrl: h.photoUrl,
          fam: famOf(null),
          hl: h.specialty?.trim() || null,
          typeLine: typeLabel(null),
          loc,
          rating: ratingText(h.rating, h.reviewCount),
          price: h.fromPriceValue != null && h.fromPriceValue > 0 ? pricePill(null, h.fromPriceValue) : null,
          bio: null,
          verified: false,
        };
      });
    }
    return (dir.listings ?? []).filter((l) => (type ? l.subtype === type : true)).map((l) => fromListing(l));
  }, [isRanked, dir.shownHits, dir.listings, byId, type]);

  const loading = dir.listings === null && !dir.directoryError && !isRanked;
  const failed = dir.directoryError && !isRanked;
  const selectedId = selected ?? items[0]?.id ?? null;
  const known = selectedId ? byId.get(selectedId) ?? null : null;

  const open = (id: string) => {
    const next = new URLSearchParams();
    const tp = params.get("type");
    if (tp) next.set("type", tp);
    const q = next.toString();
    navigate(`/app/professionals/${encodeURIComponent(id)}${q ? `?${q}` : ""}`);
  };

  // The selected card stays in view (a deep link, or the linked card's profile).
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!selectedId || !listRef.current) return;
    listRef.current.querySelector(`[data-pr-card="${CSS.escape(selectedId)}"]`)?.scrollIntoView({ block: "nearest" });
  }, [selectedId, items.length]);

  const emptyTitle = filtering ? (type ? t("No professionals in this category yet") : maxKm != null ? t("No professionals within {km} km", { km: maxKm }) : t("No professionals match these filters")) : t("No professionals listed yet");
  const emptyBody = filtering
    ? type
      ? t("Try a different category.")
      : maxKm != null
        ? t("Try a wider distance.")
        : t("Try another filter.")
    : t("Professionals choose whether to appear here. If you already work with one, ask them for their client code to connect.");

  return (
    <>
      <div data-pr-list-col className="flex flex-col" style={{ minWidth: 0, minHeight: 0, gap: 12 }}>
        {top}
        <div ref={listRef} data-pr-list className="pr-web-noscroll flex flex-col" style={{ flex: 1, minHeight: 0, overflow: "auto", gap: 12 }}>
          {dir.listings !== null && <MarketOffline loaded />}
          {items.map((p) => {
            const on = p.id === selectedId;
            return (
              <button
                key={p.id}
                type="button"
                data-pr-card={p.id}
                aria-current={on ? "true" : undefined}
                onClick={() => open(p.id)}
                className={on ? "pr-web-focus text-start" : "pr-web-hover text-start"}
                style={{ flex: "none", display: "block", width: "100%", borderRadius: 20, padding: 16, boxSizing: "border-box", border: on ? `1.5px solid ${p.fam.main}` : HAIR, background: on ? "#FAF9FD" : "#FFFFFF" }}
              >
                <span className="flex items-start" style={{ gap: 13 }}>
                  <PrAvatar name={p.name} photoUrl={p.photoUrl} fam={p.fam} size={52} fontSize={18} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span className="flex items-center" style={{ gap: 5, minWidth: 0 }}>
                      <span className="truncate" style={{ fontSize: 17, lineHeight: "22px", fontWeight: 700, color: p.fam.deep, minWidth: 0 }}>
                        {p.name}
                      </span>
                      {p.verified && <BadgeCheck size={16} color={p.fam.main} strokeWidth={2} role="img" aria-label={t("Verified credentials")} style={{ flex: "none" }} />}
                    </span>
                    {p.hl ? <span className="block truncate" style={{ fontSize: 13, lineHeight: "18px", fontWeight: 600, color: p.fam.main }}>{p.hl}</span> : null}
                    <span className="block truncate" style={{ fontSize: 13, lineHeight: "18px", fontWeight: 500, color: p.fam.main, opacity: 0.9 }}>
                      {p.typeLine}
                    </span>
                  </span>
                </span>
                <span className="flex flex-wrap" style={{ gap: 6, marginTop: 12 }}>
                  {p.loc && (
                    <PrPill height={26} bg={p.fam.pill} ink={p.fam.deep} icon={<MapPin size={13} color={p.fam.main} aria-hidden style={{ flex: "none" }} />}>
                      {p.loc}
                    </PrPill>
                  )}
                  <span className="inline-flex items-center whitespace-nowrap" style={{ height: 26, padding: "0 10px", borderRadius: 999, boxSizing: "border-box", gap: 5, fontSize: 13, fontWeight: 700, background: GOLD.bg, border: `1px solid ${GOLD.border}`, color: GOLD.ink }}>
                    <GoldStar />
                    {p.rating}
                  </span>
                  {p.price && (
                    <PrPill height={26} bg={p.fam.pill} ink={p.fam.deep} icon={<Wallet size={13} color={p.fam.main} aria-hidden style={{ flex: "none" }} />}>
                      {p.price}
                    </PrPill>
                  )}
                </span>
                {p.bio ? (
                  <span className="pr-web-clamp2" style={{ margin: "10px 0 0", fontSize: 13, lineHeight: "20px", color: "#5B5349" }}>
                    {p.bio}
                  </span>
                ) : null}
              </button>
            );
          })}
          {loading && <MarketSkeleton radius={20} rows={3} height={170} count={3} gap={12} label={tk("Loading professionals")} />}
          {failed && <MarketError thing={tk("professionals")} onRetry={dir.retry} />}
          {!loading && !failed && items.length === 0 && (
            <PrEmpty icon={<Users size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />} title={emptyTitle} body={emptyBody} />
          )}
          {/* Kept under the list (mobile): "Your reviews" and the Data sharing summary. */}
          <div style={{ flex: "none", marginTop: 12 }}>
            <YourReviewsSection authUserId={authUserId} />
            <DataSharingSummary />
          </div>
        </div>
      </div>

      <section data-pr-right className="flex flex-col" style={{ minWidth: 0, minHeight: 0, gap: 16 }}>
        {selectedId ? (
          <ProfilePaneWeb key={selectedId} id={selectedId} known={known} onListingChanged={dir.patchListing} />
        ) : loading ? (
          <div aria-hidden style={{ flex: 1, minHeight: 0, borderRadius: 20, border: HAIR, padding: 24 }}>
            <MarketSkeleton radius={18} rows={4} height={240} />
          </div>
        ) : (
          <PrEmpty
            icon={<UserCheck size={26} strokeWidth={1.5} color="#7D6BB5" aria-hidden />}
            title={t("Already work with someone?")}
            body={t("Ask them for their client code and enter it in Profile to connect and choose what they can see.")}
            bg="#FFFFFF"
            border={HAIR}
            maxW={340}
            gapTitle={16}
          />
        )}
      </section>
    </>
  );
};

/**
 * The linked professional (WC-PR "Your professional", min 60, r20, 0.5px,
 * padding 8 16: the 40 avatar in their family's pill and deep ink, the caps
 * 13/20 700 .16em and the name 15 600 with its check, the 16 chevron; hover
 * #FAFAFB). A listed one opens their profile; an unlisted one the mobile
 * profile + CV sheet (the 440 side sheet on the web).
 */
export const LinkedCardWeb: React.FC<{
  id: string | null;
  detail: ConnectedProfessional | null;
  error: string | null;
  sheetOpen: boolean;
  onOpen: () => void;
  onCloseSheet: () => void;
}> = ({ id, detail, error, sheetOpen, onOpen, onCloseSheet }) => {
  const { user } = useApp();
  const name = detail?.firstName ?? user.linkedProfessionalName ?? t("Your professional");
  const fam = famOf(detail?.subtype ?? null);
  const [cv, setCv] = useState<PublicCv | null>(null);
  const [cvError, setCvError] = useState<string | null>(null);
  useEffect(() => {
    if (!sheetOpen || !id) return;
    let cancelled = false;
    void fetchPublicCv(id).then((r) => {
      if (cancelled) return;
      if (!r.ok) return setCvError(r.message);
      setCvError(null);
      setCv(r.cv);
    });
    return () => {
      cancelled = true;
    };
  }, [sheetOpen, id]);
  const shownError = cvError ?? error;

  return (
    <>
      <button
        type="button"
        data-pr-linked
        onClick={onOpen}
        aria-label={t("Your professional, {name}. Open profile", { name })}
        className="pr-web-hover flex items-center text-start"
        style={{ flex: "none", width: "100%", gap: 12, minHeight: 60, borderRadius: 20, border: HAIR, padding: "8px 16px", boxSizing: "border-box", background: "#FFFFFF" }}
      >
        <PrAvatar name={name} photoUrl={detail?.avatarUrl ?? null} fam={fam} size={40} fontSize={15} ground={fam.pill} ink={fam.deep} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="block" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, letterSpacing: ".16em", textTransform: "uppercase", color: fam.main }}>
            {t("Your professional")}
          </span>
          <span className="flex items-center" style={{ gap: 5, fontSize: 15, fontWeight: 600, color: "#241F1B", minWidth: 0 }}>
            <span className="truncate">{name}</span>
            {detail?.hasVerifiedLicence && <BadgeCheck size={15} color={fam.main} strokeWidth={2} role="img" aria-label={t("Verified credentials")} style={{ flex: "none" }} />}
          </span>
          {detail?.licenceVerified === false && <LicencePendingTag className="mt-0.5" size={13} />}
        </span>
        <ChevronRight size={16} color="#8C8378" aria-hidden style={{ flex: "none" }} />
      </button>

      {/* The connected professional's profile and CV, for one not in the directory (as on mobile). */}
      <BottomSheet open={sheetOpen} onClose={onCloseSheet} title={name} size="tall">
        <div className="space-y-4" style={{ lineHeight: "normal" }}>
          <div className="flex items-center" style={{ gap: 12 }}>
            <MarketAvatar id={id ?? "linked"} name={name} photoUrl={detail?.avatarUrl ?? null} size={52} fontSize={16} />
            <div style={{ minWidth: 0 }}>
              <p className="flex items-center" style={{ margin: 0, gap: 6 }}>
                <span style={{ fontSize: 15, fontWeight: 800, color: "#241F1B" }}>{name}</span>
                {detail?.hasVerifiedLicence && <VerifiedCheck size={16} />}
              </p>
              {detail?.headline && <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: fam.main }}>{detail.headline}</p>}
              <p style={{ margin: 0, fontSize: 13, color: "#5B5349" }}>{[detail ? t(professionalRole(detail) ?? "") || null : null, detail?.location].filter(Boolean).join(" · ")}</p>
              {detail?.licenceVerified === false && <LicencePendingTag className="mt-0.5" />}
            </div>
          </div>
          {shownError && (
            <p role="alert" style={{ margin: 0, fontSize: 13, fontWeight: 600, color: "#C0392B" }}>
              {t(shownError)}
            </p>
          )}
          {!shownError && !cv && id && <MarketSkeleton radius={18} rows={3} label={tk("Loading")} />}
          {detail?.bio && <p style={{ margin: 0, fontSize: 15, lineHeight: "24px", color: "#5B5349", whiteSpace: "pre-line" }}>{detail.bio}</p>}
          {cv &&
            (cvIsEmpty(cv, detail?.skills ?? []) ? (
              <p style={{ margin: 0, fontSize: 13, color: "#8C8378" }}>{t("{name} hasn't added a CV yet.", { name: name.split(" ")[0] })}</p>
            ) : (
              <CvView cv={cv} skills={detail?.skills ?? []} accent={{ label: "#8C8378", pillBg: "#F0EDF9", pillInk: "#5F5093" }} />
            ))}
          {detail?.hasVerifiedLicence && <VerifiedExplainer />}
        </div>
      </BottomSheet>
    </>
  );
};
