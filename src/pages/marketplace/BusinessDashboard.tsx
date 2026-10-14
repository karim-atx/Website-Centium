import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgePercent, CalendarPlus, ChevronRight, IdCard, MailPlus, Package, PackagePlus, ScanLine, Store, Ticket } from "lucide-react";
import { DobPromptCard } from "../../components/profile/DobPromptCard";
import { useApp } from "../../context/AppContext";
import { useMyVenues } from "../../hooks/useMyVenues";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { usePoll } from "../../hooks/usePoll";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useBackCloses } from "../../hooks/useBackCloses";
import { localDayOf } from "../../utils/date";
import { dayMonthYear } from "../../services/venues/venueLogic";
import { dashPalette } from "../../components/business-dashboard/palette";
import { GaugeCluster, type ClusterControl, type ClusterGauge } from "../../components/business-dashboard/GaugeCluster";
import { dismissSetup, loadDashboard, saveListingActive, type DashRaw } from "../../components/business-dashboard/dashboardData";
import {
  activityEvents,
  attentionItems,
  dateKicker,
  gaugeModels,
  greeting,
  kindOf,
  setupSteps,
  todayBlock,
  toneColour,
  weekItems,
  weekTotals,
  type AttentionItem,
  type SetupStep,
} from "../../components/business-dashboard/dashboardModel";
import { DashLabel, ErrorRow, KitList } from "../../components/business-dashboard/parts";
import { AttentionPanel, DashHeader, ListingSheet, SetupCard, VenueChip } from "../../components/business-dashboard/HeaderParts";
import { TodayBlock, VenueBoxes } from "../../components/business-dashboard/TodayBlock";
import { ScheduleBlock } from "../../components/business-dashboard/ScheduleBlock";
import { ActivityScreen, RecentActivityCard } from "../../components/business-dashboard/RecentActivity";
import { textPx } from "../../theme/textSize";

// v6 Business Dashboard (Release 2 · Batch 3): DA1 / DA2 / DA3, decisions
// V6-52 (BizSummaryV27 gauge cluster as drawn + the per-type BizTypeKit
// "Today" block underneath; a gym without classes gets the OURS gauge set),
// V6-53 (Store quick actions per COPY / D12), V6-71 (no prototype notice),
// V6-88 (the perk editor left for MA1 "Offers on your listing", Batch 5),
// V6-106 (motion from the source), V6-107 (week strip at 360 as drawn),
// V6-108 (quick actions navigate; press state and long-press name kept),
// V6-127 (Members reached dropped).
//
// REPLACES the whole earlier page (HANDOVER §1: the old dashboard must not
// exist). Kept live features, restyled (OURS-DA-kept-features): the listing
// switch (now the real business_profiles.active, where the old page only
// wrote this device's storage; the perk moved to Marketplace › Promotions),
// DobPromptCard, the venue switcher, the venue figures and the Venue console
// link.
//
// ONLY REAL NUMBERS. Every figure is computed from rows on the local stack;
// a figure whose table does not exist yet (check-ins, orders, renewals
// linkage, payments: BU4-04..07) shows its drawn empty / unlit state.

const POLL_MS = 2 * 60 * 1000;

export default function BusinessDashboard() {
  const { user, authUserId, profileReady, accessibility } = useApp();
  const navigate = useNavigate();
  const dark = useIsDark();
  const c = useMemo(() => dashPalette(dark, !!accessibility.highContrast), [dark, accessibility.highContrast]);
  const reducedMotion = useReducedMotion();
  const online = useOnline();
  const { venues, selected, select, isOwner } = useMyVenues();
  const gymId = selected?.gymId ?? null;

  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [raw, setRaw] = useState<DashRaw | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const seenKeys = useRef<Set<string> | null>(null);

  const load = useCallback(async () => {
    if (!authUserId) return;
    setRefreshing(true);
    const r = await loadDashboard(authUserId, gymId);
    setRefreshing(false);
    if (!r.ok) {
      // A failed read keeps what is on screen (OURS-DA-states #3); only a first load shows the error.
      setError(r.message);
      return;
    }
    setError(null);
    setRaw(r.raw);
    setUpdatedAt(Date.now());
    // OURS-DA-states #4: rows that arrived since the last read get the New tag for this session.
    const keys = new Set(activityEvents(r.raw, new Date(), 7).map((e) => e.key));
    if (seenKeys.current) {
      const fresh = [...keys].filter((k) => !seenKeys.current?.has(k));
      if (fresh.length) setNewKeys((prev) => new Set([...prev, ...fresh]));
    }
    seenKeys.current = keys;
  }, [authUserId, gymId]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    // Defer the first read past the effect body (react-hooks: no synchronous setState in an effect).
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [profileReady, authUserId, load]);
  // D2: a 2-minute poll while the page is visible (realtime is BU4-09, not on the stack).
  usePoll(() => void load(), POLL_MS, !!raw && online);

  const kind = kindOf(raw?.business?.type ?? user.businessType ?? null, (raw?.classes.length ?? 0) > 0);
  const today = localDayOf(now);
  const gauges = useMemo(() => (raw ? gaugeModels(kind, raw, now) : null), [kind, raw, now]);
  const attention = useMemo(() => (raw ? attentionItems(raw, now) : []), [raw, now]);
  const steps = useMemo(() => (raw ? setupSteps(kind, raw) : []), [kind, raw]);
  const allActivity = useMemo(() => (raw ? activityEvents(raw, now, 30) : []), [raw, now]);
  const weekActivity = useMemo(() => allActivity.filter((e) => e.day >= localDayOf(new Date(now.getTime() - 6 * 86_400_000))), [allActivity, now]);
  const totals = useMemo(() => (raw ? weekTotals(kind, raw, now) : []), [kind, raw, now]);
  const schedule = useMemo(() => (raw ? weekItems(raw, now) : null), [raw, now]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [setupHidden, setSetupHidden] = useState(false);
  const [bell, setBell] = useState<HTMLButtonElement | null>(null);
  useBackCloses(activityOpen, () => setActivityOpen(false));

  const business = raw?.business ?? null;
  const listed = raw ? !!business?.active : null;

  const go = (to: string) => navigate(to);
  const openListing = () => (business ? setSheetOpen(true) : go("/app/business/profile"));

  const onToggleListing = async (v: boolean) => {
    if (!business || !raw) return "Couldn't change your listing. Try again.";
    setRaw({ ...raw, business: { ...business, active: v } });
    const r = await saveListingActive(business.id, v);
    if (!r.ok) {
      setRaw((prev) => (prev && prev.business ? { ...prev, business: { ...prev.business, active: !v } } : prev));
      return r.message ?? null;
    }
    return null;
  };

  const onAttention = (a: AttentionItem) => {
    setPanelOpen(false);
    if (a.to === "listing") openListing();
    else go(a.to === "members" ? "/app/business/members" : a.to === "classes" ? "/app/business/classes" : "/app/business/employees");
  };
  const onStep = (s: SetupStep) => {
    const to: Record<SetupStep["to"], string> = {
      profile: "/app/business/profile",
      listing: "",
      classes: "/app/business/classes",
      plans: "/app/business/gym",
      members: "/app/business/members",
      checkin: "/app/business/operations",
      products: "/app/business/products",
      delivery: "/app/business/profile",
      orders: "/app/business/operations",
    };
    if (s.to === "listing") openListing();
    else go(to[s.to]);
  };

  // Quick actions (DA1-015 #18-#19; Store per V6-53; gym without classes per OURS-DA-gym-gauges #5).
  const controls: ClusterControl[] =
    kind === "store"
      ? [
          { key: "product", Icon: PackagePlus, name: "Add product", onActivate: () => go("/app/business/products") },
          { key: "orders", Icon: Package, name: "View orders", onActivate: () => go("/app/business/operations") },
          { key: "discount", Icon: BadgePercent, name: "Add discount", onActivate: () => go("/app/business/products?tab=promotions&offer=new") },
        ]
      : kind === "gym"
        ? [
            { key: "checkin", Icon: ScanLine, name: "Check someone in", onActivate: () => go("/app/business/operations") },
            { key: "daypass", Icon: Ticket, name: "Sell a day pass", onActivate: () => go("/app/business/gym") },
            { key: "invite", Icon: MailPlus, name: "Invite member", onActivate: () => go("/app/business/members") },
            { key: "discount", Icon: BadgePercent, name: "Add discount", onActivate: () => go("/app/business/marketplace?tab=promo&offer=new") },
            { key: "employee", Icon: IdCard, name: "Add employee", onActivate: () => go("/app/business/employees") },
          ]
        : [
            { key: "class", Icon: CalendarPlus, name: "Create class", onActivate: () => go("/app/business/classes") },
            { key: "invite", Icon: MailPlus, name: "Invite member", onActivate: () => go("/app/business/members") },
            { key: "offering", Icon: PackagePlus, name: "Add offering", onActivate: () => go("/app/business/marketplace") },
            { key: "discount", Icon: BadgePercent, name: "Add discount", onActivate: () => go("/app/business/marketplace?tab=promo&offer=new") },
            { key: "employee", Icon: IdCard, name: "Add employee", onActivate: () => go("/app/business/employees") },
          ];

  // Loading (OURS-DA-states #1): the unlit gauges without "–" or subs.
  const LOADING_LABELS = kind === "store" ? ["Net members", "New members", "Live listings", "Live discounts"] : kind === "gym" ? ["Entries", "Renewals due", "Net members", "Seats used"] : ["Fill rate", "Booked", "Net members", "Seats used"];
  const clusterGauges: ClusterGauge[] = gauges
    ? gauges.map((g) => ({ spec: g.spec, empty: g.empty, label: g.label, sub: g.sub, subColor: toneColour(c, g.subTone), target: g.target, format: g.format, display: "–", unit: g.unit }))
    : LOADING_LABELS.map((l) => ({ spec: { kind: "blank" }, empty: true, label: l, sub: "", subColor: c.faint, target: null, format: String, display: "" }));

  const classBased = kind === "classes";
  const hasEvents = !!schedule && schedule.items.some((d) => d.some((x) => x.ev));
  const showSchedule = classBased || hasEvents;
  const showSetup = !!raw && !raw.dismissed && !setupHidden && steps.some((s) => !s.done);

  if (activityOpen && raw) {
    return (
      <div style={{ color: c.ink }}>
        <ActivityScreen c={c} events={allActivity} now={now} today={today} onBack={() => setActivityOpen(false)} classBased={classBased} />
      </div>
    );
  }

  return (
    <div data-business-dashboard style={{ color: c.ink, maxWidth: 430, margin: "0 auto" }}>
      <DobPromptCard setup className="mb-5" />
      <DashHeader
        c={c}
        kicker={dateKicker(now)}
        greeting={greeting(now)}
        name={business?.name || user.businessName || "Your business"}
        listed={listed}
        attentionCount={attention.length}
        panelOpen={panelOpen}
        onBell={() => setPanelOpen(true)}
        onChip={openListing}
        bellRef={setBell}
        venueChip={<VenueChip c={c} venues={venues} selected={selected} onSelect={select} />}
      />
      <AttentionPanel c={c} open={panelOpen} items={attention} anchor={bell} onClose={() => setPanelOpen(false)} onAction={onAttention} />

      {error && !raw && <ErrorRow c={c} text={error} onRetry={() => void load()} />}

      {/* Kept from the venue switcher (VenueSwitcher): a hidden venue is explained, and staff are told they can only view. */}
      {selected?.hiddenAt && (
        <p role="note" style={{ fontSize: textPx(12), lineHeight: 1.5, color: c.high, background: c.highBg, borderRadius: 16, padding: "12px 14px", marginBottom: 20 }}>
          {`${selected.name} is hidden from Explore. Centium hid this venue on ${dayMonthYear(selected.hiddenAt.slice(0, 10))}, so people can't find it on Explore or open its page. You can still see it here. Contact Centium support to find out why.`}
        </p>
      )}

      {showSetup && (
        <SetupCard
          c={c}
          steps={steps}
          onStep={onStep}
          onDismiss={() => {
            setSetupHidden(true);
            if (business) void dismissSetup(business.id);
          }}
        />
      )}

      <DashLabel c={c} label="At a glance" link="View analytics" onLink={() => go("/app/business/analytics")} mb={8} />
      <GaugeCluster c={c} gauges={clusterGauges} controls={controls} onGaugeTap={(label) => navigate("/app/business/analytics", { state: { section: label } })} ready={!!raw} reducedMotion={reducedMotion} />

      {raw && <TodayBlock c={c} model={todayBlock(kind, raw, now)} onSeeAll={() => go("/app/business/classes")} onOpenClass={() => go("/app/business/classes")} />}
      {gymId && <VenueBoxes c={c} gymId={gymId} />}

      {showSchedule && schedule && (
        <ScheduleBlock
          key={today}
          c={c}
          dates={schedule.dates}
          items={schedule.items}
          today={today}
          now={now}
          noClassesEver={(raw?.classes.length ?? 0) === 0}
          classBased={classBased}
          onCalendar={() => go("/app/business/calendar")}
          onCreateClass={() => go("/app/business/classes")}
        />
      )}

      {raw && (
        <RecentActivityCard
          c={c}
          week={weekActivity}
          totals={totals}
          now={now}
          today={today}
          updatedAt={updatedAt}
          online={online}
          refreshing={refreshing}
          onRefresh={() => void load()}
          onSeeAll={() => setActivityOpen(true)}
          newKeys={newKeys}
        />
      )}

      {selected && (
        <KitList
          c={c}
          rows={[
            {
              key: "venue",
              Icon: Store,
              title: "Venue console",
              detail: "Members, class rosters, opening hours, logo and cover",
              onClick: () => go("/app/business/venue"),
              trailing: <ChevronRight size={16} color={c.faint} aria-hidden />,
            },
          ]}
        />
      )}
      {selected && !isOwner && (
        <p style={{ fontSize: textPx(11), color: c.faint, textAlign: "center", marginTop: 0 }}>You're staff at this venue, so you can view it but only the owner can change it.</p>
      )}

      <ListingSheet c={c} open={sheetOpen} onClose={() => setSheetOpen(false)} active={!!business?.active} onToggle={onToggleListing} />
    </div>
  );
}
