import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Store, Users } from "lucide-react";
import { Toast } from "../../components/ui/Toast";
import { ClassCard } from "../../components/marketplace/ClassCard";
import { EmptyState } from "../../components/pro/EmptyState";
import { ListSkeleton, OfflineLine, ProError } from "../../components/pro/states";
import { INK } from "../../components/pro/proInk";
import { JoinById } from "../../components/pro/businesses/BusinessParts";
import { AffiliationCard, AskToJoinSheet, BusinessCard, ChipRow, ColleagueRow, ExploreHead, ExploreTabs, type JoinState } from "../../components/pro/businesses/ExploreParts";
import { useBusinesses } from "../../components/pro/businesses/useBusinesses";
import { SUBTYPE_SINGULAR } from "../../components/professionals/subtypeLabels";
import { useApp } from "../../context/AppContext";
import { useBack } from "../../hooks/useBack";
import { useOnline } from "../../hooks/useOnline";
import { textPx } from "../../theme/textSize";
import { fetchMarketplaceClasses, fetchMarketplaceVenues, type MarketplaceClass, type MarketplaceVenue } from "../../services/marketplace";
import { startVenueThread } from "../../services/messaging";
import { requestToJoinById } from "../../services/pro/businesses";
import { fetchLinks, requestLink, searchColleagues, type CareLink, type Colleague } from "../../services/pro/careNetwork";
import { typeLabel } from "./venueTypes";

/**
 * Release 3 · the professional's Explore (/app/explore; MO17 v2 and v3).
 * Client and business Explore are unchanged (Marketplace.tsx).
 *
 * - Head (cHead15) and the points card (my_points_summary answers for every
 *   account, so professionals get it too; the card is Marketplace's own).
 * - Affiliation from the multi-business data (decision 1): one "Affiliated
 *   with" card per team I'm on (my_business_employments, accepted), each
 *   opening its page in Businesses. With none, "Join a business": the
 *   business ID field (request_to_join_business). The legacy single
 *   affiliation (affiliated_business_id, leaveAffiliation) isn't read here any
 *   more (two-phase; the service functions stay).
 * - Businesses: the listed businesses and gyms (marketplace_venues), with
 *   Ask to join (request_to_join_business_by_id) on businesses I'm not on or
 *   asked already ("Request sent"), and Message on gyms (start_venue_thread).
 * - Classes: the listed classes (marketplace_classes), the shared ClassCard.
 * - Colleagues: listed professionals (public_professional_directory) with my
 *   care network links (care_network_links): "In network", "Requested", or
 *   Add (request_care_link); the network itself is in More › Care network.
 * - Job postings: none exist (no table; the old page removed its invented
 *   ones), so there is nothing to keep.
 */

type Tab = "businesses" | "classes" | "colleagues";
const TABS: { key: Tab; label: string }[] = [
  { key: "businesses", label: "Businesses" },
  { key: "classes", label: "Classes" },
  { key: "colleagues", label: "Colleagues" },
];
type Kind = "all" | "dietitians" | "physios" | "doctors" | "coaches";
const KINDS: { key: Kind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "dietitians", label: "Dietitians" },
  { key: "physios", label: "Physios" },
  { key: "doctors", label: "Doctors" },
  { key: "coaches", label: "Coaches" },
];
const kindOf = (type: string | null): Kind | null =>
  type === "dietitian" || type === "nutritionist" ? "dietitians" : type === "physiotherapist" ? "physios" : type === "doctor" ? "doctors" : type === "trainer" || type === "coach_instructor" ? "coaches" : null;

export default function ProfessionalExplore({ pointsCard }: { pointsCard?: React.ReactNode }) {
  const { authUserId } = useApp();
  const navigate = useNavigate();
  const back = useBack("/app/more");
  const online = useOnline();
  const biz = useBusinesses();
  const [tab, setTab] = useState<Tab>("businesses");
  const [venues, setVenues] = useState<MarketplaceVenue[] | null>(null);
  const [classes, setClasses] = useState<MarketplaceClass[] | null>(null);
  const [colleagues, setColleagues] = useState<Colleague[] | null>(null);
  const [links, setLinks] = useState<CareLink[]>([]);
  const [failed, setFailed] = useState<Tab | null>(null);
  const [reload, setReload] = useState(0);
  const [type, setType] = useState<string>("all");
  const [kind, setKind] = useState<Kind>("all");
  const [asking, setAsking] = useState<MarketplaceVenue | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [askError, setAskError] = useState<string | null>(null);
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setFailed(null);
    if (tab === "businesses" && !venues)
      void fetchMarketplaceVenues().then((r) => !cancelled && (r.ok ? setVenues(r.venues) : setFailed("businesses")));
    if (tab === "classes" && !classes)
      void fetchMarketplaceClasses().then((r) => !cancelled && (r.ok ? setClasses(r.classes) : setFailed("classes")));
    if (tab === "colleagues" && !colleagues && authUserId)
      void Promise.all([searchColleagues(authUserId, ""), fetchLinks(authUserId)]).then(([c, l]) => {
        if (cancelled) return;
        if (!c.ok) return setFailed("colleagues");
        setColleagues(c.data);
        setLinks(l.ok ? l.data : []);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, venues, classes, colleagues, authUserId, reload]);

  const teams = (biz.data?.employments ?? []).filter((e) => e.acceptedAt);
  const onTeam = new Set((biz.data?.employments ?? []).map((e) => e.businessId));
  const pending = new Set([...(biz.data?.requests ?? []).filter((r) => r.status === "pending").map((r) => r.businessId), ...sentIds]);
  const joinOf = (v: MarketplaceVenue): JoinState => (v.kind !== "business" ? "none" : onTeam.has(v.venueId) ? "member" : pending.has(v.venueId) ? "sent" : "ask");

  const typeChips = useMemo(() => {
    const seen = [...new Set((venues ?? []).map((v) => v.venueType).filter(Boolean))];
    return [{ key: "all", label: "All" }, ...seen.map((t) => ({ key: t, label: typeLabel(t) }))];
  }, [venues]);
  const shownVenues = (venues ?? []).filter((v) => type === "all" || v.venueType === type);
  const lineOf = (v: MarketplaceVenue) => [typeLabel(v.venueType), v.location].filter(Boolean).join(" · ");

  const linkOf = (id: string) => links.find((l) => l.other === id) ?? null;
  const shownColleagues = (colleagues ?? []).filter((c) => kind === "all" || kindOf(c.type) === kind).sort((a, b) => Number(!!linkOf(b.id)) - Number(!!linkOf(a.id)));

  const message = async (v: MarketplaceVenue) => {
    setBusy(v.venueId);
    const r = await startVenueThread(v.venueId);
    setBusy(null);
    if (!r.ok) return setToast(r.message);
    navigate("/app/messages", { state: { threadId: r.threadId } });
  };
  const ask = async () => {
    if (!asking) return;
    setBusy(asking.venueId);
    setAskError(null);
    const r = await requestToJoinById(asking.venueId);
    setBusy(null);
    if (!r.ok) return setAskError(r.message);
    setSentIds((s) => new Set([...s, asking.venueId]));
    setToast(`Request sent to ${asking.name}. They check your credentials and reply here.`);
    setAsking(null);
    biz.reload();
  };
  const add = async (c: Colleague) => {
    setBusy(c.id);
    const r = await requestLink(c.id);
    setBusy(null);
    if (!r.ok) return setToast(r.message);
    setToast("Care network request sent.");
    if (authUserId) {
      const l = await fetchLinks(authUserId);
      if (l.ok) setLinks(l.data);
    }
  };

  const retry = () => {
    if (failed === "businesses") setVenues(null);
    if (failed === "classes") setClasses(null);
    if (failed === "colleagues") setColleagues(null);
    setReload((x) => x + 1);
  };

  return (
    <div data-pro-explore="">
      <ExploreHead onBack={back} />
      {!online && <OfflineLine />}
      {pointsCard}

      {biz.data &&
        (teams.length > 0 ? (
          teams.map((e) => <AffiliationCard key={e.businessId} name={e.businessName} onOpen={() => navigate(`/app/more/businesses/${e.businessId}`)} />)
        ) : (
          // joinCard17: r20 card, pad 14, 12 below; the label 11 / 600 caps 0.14em text.faint, 8 under.
          <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: 14, marginBottom: 12 }}>
            <p style={{ fontSize: textPx(11), fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: INK.chF, marginBottom: 8 }}>Join a business</p>
            <JoinById
              hint="Enter the ID the business gave you, or ask to join one below. The business checks your credentials before you appear on its team. A business can also add you from its own account."
              onSent={biz.reload}
              onToast={setToast}
            />
          </div>
        ))}

      <ExploreTabs items={TABS} active={tab} onChange={setTab} />

      {failed === tab ? (
        <ProError onRetry={retry} />
      ) : tab === "businesses" ? (
        !venues ? (
          <ListSkeleton rows={3} />
        ) : (
          <>
            {typeChips.length > 2 && <ChipRow items={typeChips} active={type} onChange={setType} />}
            {shownVenues.length === 0 ? (
              <EmptyState icon={Store} title="No businesses listed yet" />
            ) : (
              shownVenues.map((v) => (
                <BusinessCard
                  key={`${v.kind}-${v.venueId}`}
                  name={v.name}
                  line={lineOf(v)}
                  bio={v.bio}
                  join={joinOf(v)}
                  onOpen={() => navigate(v.kind === "gym" ? `/app/marketplace/gym?id=${encodeURIComponent(v.venueId)}` : `/app/marketplace/business?id=${encodeURIComponent(v.venueId)}`)}
                  onMessage={v.kind === "gym" && busy !== v.venueId ? () => void message(v) : undefined}
                  onAsk={() => {
                    setAskError(null);
                    setAsking(v);
                  }}
                />
              ))
            )}
          </>
        )
      ) : tab === "classes" ? (
        !classes ? (
          <ListSkeleton rows={3} />
        ) : classes.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No classes listed yet" />
        ) : (
          <div className="flex flex-col" style={{ gap: 10 }}>
            {classes.map((c) => (
              <ClassCard key={c.classId} c={c} booked={false} onOpen={(x) => navigate(`/app/marketplace/class?id=${encodeURIComponent(x.classId)}`)} />
            ))}
          </div>
        )
      ) : !colleagues ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <ChipRow items={KINDS} active={kind} onChange={setKind} />
          {shownColleagues.length === 0 ? (
            <EmptyState icon={Users} title="No colleagues listed yet" />
          ) : (
            shownColleagues.map((c) => {
              const l = linkOf(c.id);
              const t = c.type ? (SUBTYPE_SINGULAR as Record<string, string>)[c.type] : null;
              return (
                <ColleagueRow
                  key={c.id}
                  name={c.name ?? "Professional"}
                  type={t ? t.charAt(0).toUpperCase() + t.slice(1) : ""}
                  line={l?.status === "accepted" ? "In your care network" : c.specialty}
                  avatarUrl={c.avatarUrl}
                  state={l?.status === "accepted" ? "network" : l ? "pending" : "add"}
                  busy={busy === c.id}
                  onAdd={() => void add(c)}
                />
              );
            })
          )}
          <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 6 }}>
            Only verified professionals who list themselves publicly appear here. Adding someone sends them a care network request.
          </p>
          <button type="button" onClick={() => navigate("/app/more/care-network")} className="tap min-h-[44px]" style={{ fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}>
            Care network
          </button>
        </>
      )}

      <AskToJoinSheet
        business={asking ? { name: asking.name, line: lineOf(asking) } : null}
        busy={!!asking && busy === asking.venueId}
        error={askError}
        onSend={() => void ask()}
        onClose={() => setAsking(null)}
      />
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </div>
  );
}
