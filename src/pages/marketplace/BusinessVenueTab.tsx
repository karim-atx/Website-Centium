import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarClock, CalendarX, Clock, Image as ImageIcon, MessageCircle, Plus, Star, Store, TriangleAlert, WifiOff } from "lucide-react";
import { VenueSwitcher, VenueHiddenNotice, venuePill } from "../../components/marketplace/VenueSwitcher";
import { VenueFigures } from "../../components/marketplace/VenueFigures";
import { VenueHoursCard } from "../../components/marketplace/VenueHoursCard";
import { VenueImagesCard } from "../../components/marketplace/VenueImagesCard";
import { VenueMembersRoster } from "../../components/marketplace/VenueMembersRoster";
import { ClassRosterSheet, weekdayDayMonth } from "../../components/marketplace/ClassRosterSheet";
import { VenueImage } from "../../components/marketplace/VenueImage";
import {
  VActionTiles,
  VAttentionBand,
  VAvatar,
  VBackRow,
  VBar,
  VCardError,
  VChevron,
  VDetailCard,
  VDetailHead,
  VDetailRow,
  VEmptyCard,
  VFooterLink,
  VOfflineLine,
  VPickButton,
  VPill,
  VSkeletonRows,
  useOpsToast,
} from "../../components/marketplace/VenueKit";
import { initials } from "../../components/professionals/typeColour";
import { useMyVenues } from "../../hooks/useMyVenues";
import { useOnline } from "../../hooks/useOnline";
import { useBack } from "../../hooks/useBack";
import { useApp } from "../../context/AppContext";
import { useBusiness } from "../../components/business-more/useBusiness";
import { fetchVenueClasses, type VenueClassLite } from "../../services/venues/console";
import { reviewsLine } from "../../services/venues/consoleLogic";
import { hostedImageUrl } from "../../services/venues/venueLogic";
import { fetchThreads } from "../../services/messaging";
import { range12 } from "../../utils/time12";

// The venue console (backend stage A4, BU2-21), restyled per
// OURS-OP1-venue-console-page as an OpsTabsV4 detail page about one venue:
// back row (K2), venue head (K3: logo, name, open / hidden pill, location,
// reviews), the switcher for 2+ venues (K7), the hidden notice (K12), action
// tiles (K4), then Figures, Members (capped 3), Upcoming classes (capped 3),
// Opening hours and, owner only, Logo and cover. my_venues() →
// venue_dashboard(id) → venue_members(id), venue_class_roster(class_id) per
// class, the hours and the logo / cover.
//
// WHO SEES IT (V6-54): the owner from Business Profile › Locations and hours
// (a business OR a professional account: the seeded Flex Fitness owner is a
// coach), staff (professionals the business employs) from More › Venues,
// read-only except what B7 lets them change: opening hours with 'schedule',
// the time zone with 'venues'. Logo and cover stay the owner's. Never for stores: a store owner's
// location keeps only its hours and photos here.
//
// /app/business/venue/members is the full roster ("See all"), the same one
// roster component (V6-163, Q-R1).

const todayLocal = () => {
  // Today on this device's calendar (not UTC's), so tonight's classes stay listed.
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

export default function BusinessVenueTab() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const online = useOnline();
  const { user } = useApp();
  const businessAccount = user.accountType === "business";
  const { kind, kindKnown } = useBusiness();
  const store = businessAccount && kindKnown && kind === "store";
  const { venues, selected, select, isOwner, can, loading, error, reload } = useMyVenues();
  // B7: opening hours need 'schedule', the venue's details (time zone) need
  // 'venues'; the logo and cover stay the owner's.
  const canHours = can("schedule");
  const canVenue = can("venues");
  const [toast, showToast] = useOpsToast();
  const [classes, setClasses] = useState<{ gymId: string; value: VenueClassLite[] } | null>(null);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [classesTick, setClassesTick] = useState(0);
  const [allClasses, setAllClasses] = useState(false);
  const [roster, setRoster] = useState<VenueClassLite | null>(null);
  const [figuresKey, setFiguresKey] = useState(0);
  const [hoursSignal, setHoursSignal] = useState(0);
  const [hasVenueThreads, setHasVenueThreads] = useState<Set<string>>(new Set());
  const gymId = selected?.gymId ?? null;
  const membersPage = /\/members\/?$/.test(pathname);
  const back = useBack(businessAccount ? "/app/business/profile" : "/app/more");

  useEffect(() => {
    if (!gymId || store) return;
    let cancelled = false;
    void (async () => {
      const r = await fetchVenueClasses(gymId, todayLocal());
      if (cancelled) return;
      if (!r.ok) {
        setClassesError(r.message);
        return;
      }
      setClassesError(null);
      setClasses({ gymId, value: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [gymId, store, classesTick]);

  // The Message tile opens the venue's conversations in Messages; shown only
  // when the account has one for this venue (member-started threads; no
  // business-started messages before B7, V6-26).
  useEffect(() => {
    let cancelled = false;
    void fetchThreads().then((r) => {
      if (cancelled || !r.ok) return;
      setHasVenueThreads(new Set(r.threads.flatMap((t) => (t.venue && !t.venue.memberSide ? [t.venue.id] : []))));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const venueClasses = classes?.gymId === gymId ? classes.value : null;
  const shownClasses = useMemo(() => (venueClasses ? (allClasses ? venueClasses : venueClasses.slice(0, 3)) : null), [venueClasses, allClasses]);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ block: "start", behavior: "smooth" });

  // --- Full members page ----------------------------------------------------
  if (membersPage) {
    return (
      <div className="pb-6">
        <VBackRow label={selected?.name ?? "Venue"} onBack={() => navigate("/app/business/venue", { replace: true })} />
        {selected ? (
          <>
            <div className="mb-[16px]">
              <h1 className="text-[22px] leading-[27px] font-extrabold tracking-[-0.02em] text-charcoal">Members</h1>
              <p className="text-[13px] leading-[18px] text-charcoal-soft mt-[3px]">{selected.name}</p>
              <p className="text-[12px] leading-[16px] text-charcoal-faint">First names only. Members under 18 are marked.</p>
            </div>
            <VenueMembersRoster gymId={selected.gymId} mode="page" onToast={showToast} />
          </>
        ) : loading ? (
          <VSkeletonRows rows={6} pill />
        ) : (
          <VEmptyCard icon={Store} title="No venues yet" body="You don't run or work at a venue on Centium yet." />
        )}
        {toast}
      </div>
    );
  }

  // --- Console --------------------------------------------------------------
  const pill = selected ? venuePill(selected) : null;
  const tiles = selected
    ? [
        { icon: Clock, label: "Hours", onClick: () => (scrollTo("venue-hours"), canHours && setHoursSignal((s) => s + 1)) },
        ...(isOwner ? [{ icon: ImageIcon, label: "Photos", onClick: () => scrollTo("venue-photos") }] : []),
        ...(hasVenueThreads.has(selected.gymId) ? [{ icon: MessageCircle, label: "Message", onClick: () => navigate("/app/messages") }] : []),
      ]
    : [];

  return (
    <div className="pb-6">
      <VBackRow label={businessAccount ? "Business Profile" : "More"} onBack={back} />

      {error && venues.length === 0 && (
        <VAttentionBand icon={online ? TriangleAlert : WifiOff} title="Couldn't load your venues" sub={error}>
          <div className="bg-cream-card" style={{ padding: "10px 16px 14px" }}>
            <VPickButton label="Retry" onClick={reload} />
          </div>
        </VAttentionBand>
      )}


      {!loading && venues.length === 0 && !error && (
        <VEmptyCard
          icon={Store}
          title="No venues yet"
          body={
            <>
              You don't run or work at a venue on Centium yet.
              {businessAccount && !store && " Add a location in Business Profile."}
            </>
          }
        >
          {businessAccount && !store && <VPickButton label="Add a location" icon={Plus} onClick={() => navigate("/app/business/more/locations?add=1")} className="mt-[12px]" />}
        </VEmptyCard>
      )}

      <VenueSwitcher venues={venues} selected={selected} onSelect={select} loading={loading} />
      {loading && venues.length === 0 && !error && (
        <div role="status" aria-label="Loading" className="flex items-start gap-[14px]">
          <VBar w={60} h={60} r={16} className="!bg-primary-pale" />
          <span className="space-y-[8px] pt-[4px]">
            <VBar w={160} h={20} />
            <VBar w={120} h={10} />
          </span>
        </div>
      )}

      {selected && (
        <>
          <VDetailHead
            id="venue-head"
            tile={<VenueImage srcs={[hostedImageUrl(selected.logoUrl)]} className="absolute inset-0 w-full h-full" fallback={initials(selected.name)} />}
            title={selected.name}
            pill={pill && <VPill tone={pill.tone} label={pill.label} size="head" />}
            sub={`${selected.location ? `${selected.location} · ` : ""}${selected.kind === "studio" ? "Studio" : "Gym"}`}
            sub2={
              selected.reviewsAverage !== null && selected.reviewsCount > 0 ? (
                <span className="inline-flex items-center gap-[4px]">
                  <Star size={13} strokeWidth={2.4} aria-hidden className="text-primary-dark" />
                  <span className="text-[11.5px] font-bold text-charcoal">{selected.reviewsAverage.toFixed(1)}</span>
                  <span>{selected.reviewsCount === 1 ? "1 review" : `${selected.reviewsCount} reviews`}</span>
                </span>
              ) : (
                reviewsLine(selected.reviewsAverage, selected.reviewsCount)
              )
            }
          />
          {!online && <VOfflineLine className="mt-[10px]" />}
          <VenueHiddenNotice venue={selected} onContact={() => navigate(businessAccount ? "/app/business/more/help" : "/app/messages")} />
          {!isOwner && (
            <p className="text-[11px] leading-[15px] text-charcoal-faint text-center mt-[10px]">
              {canHours || canVenue
                ? `You're staff at this venue. You can change its ${canHours && canVenue ? "opening hours and time zone" : canHours ? "opening hours" : "time zone"}. The owner changes the rest.`
                : "You're staff at this venue, so you can view it but only the owner can change it."}
            </p>
          )}
          {tiles.length > 0 && <VActionTiles items={tiles} />}

          {!store && <VenueFigures gymId={selected.gymId} timezone={selected.timezone} refreshKey={figuresKey} />}

          {!store && (
            <VenueMembersRoster
              gymId={selected.gymId}
              onSeeAll={() => navigate("/app/business/venue/members")}
              onToast={showToast}
              onChanged={() => setFiguresKey((k) => k + 1)}
              refreshKey={figuresKey}
            />
          )}

          {!store && (
            <VDetailCard
              title="Upcoming classes"
              right={venueClasses ? `${venueClasses.length} from today` : undefined}
              footer={venueClasses && venueClasses.length > 3 && !allClasses ? <VFooterLink label={`See all ${venueClasses.length}`} onClick={() => setAllClasses(true)} /> : null}
            >
              {!venueClasses && !classesError && <VSkeletonRows rows={3} />}
              {classesError && !venueClasses && <VCardError title="Couldn't load classes" message={classesError} onRetry={() => setClassesTick((t) => t + 1)} />}
              {venueClasses && venueClasses.length === 0 && <VDetailRow avatar={<VAvatar icon={CalendarX} />} title="No upcoming classes at this venue." />}
              {shownClasses?.map((c) => (
                <VDetailRow
                  key={c.id}
                  avatar={<VAvatar icon={CalendarClock} />}
                  title={c.title}
                  sub={`${weekdayDayMonth(c.date)} · ${range12(c.startTime, c.endTime)} · Up to ${c.maxCapacity}`}
                  right={<VChevron size={16} />}
                  onClick={() => setRoster(c)}
                  ariaLabel={`${c.title}, ${weekdayDayMonth(c.date)}. Open the roster`}
                />
              ))}
            </VDetailCard>
          )}

          <VenueHoursCard
            id="venue-hours"
            gymId={selected.gymId}
            timezone={selected.timezone}
            isOwner={canHours}
            canEditZone={canVenue}
            onTimezoneSaved={reload}
            onToast={showToast}
            openSignal={hoursSignal}
          />
          {isOwner && <VenueImagesCard id="venue-photos" gymId={selected.gymId} businessId={selected.businessId} venueName={selected.name} onToast={showToast} />}
        </>
      )}

      <ClassRosterSheet
        classId={roster?.id ?? null}
        title={roster?.title ?? ""}
        session={roster ? { date: roster.date, startTime: roster.startTime, endTime: roster.endTime, maxCapacity: roster.maxCapacity } : null}
        onClose={() => setRoster(null)}
        onMarkedPaid={() => showToast("Marked as paid.")}
      />
      {toast}
    </div>
  );
}
