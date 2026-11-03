import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgePercent, ChevronRight, IdCard, MailPlus, ScanLine, Ticket } from "lucide-react";
import BusinessDashboard from "./BusinessDashboard";
import { DobPromptCard } from "../../components/profile/DobPromptCard";
import { useApp } from "../../context/AppContext";
import { useMyVenues } from "../../hooks/useMyVenues";
import { useIsDark } from "../../hooks/useIsDark";
import { useOnline } from "../../hooks/useOnline";
import { usePoll } from "../../hooks/usePoll";
import { useInboxRealtime } from "../../hooks/useInboxRealtime";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { useBackCloses } from "../../hooks/useBackCloses";
import { localDayOf } from "../../utils/date";
import { mondayIndex } from "../../utils/week";
import { dayMonthYear } from "../../services/venues/venueLogic";
import { dashPalette } from "../../components/business-dashboard/palette";
import { GaugeCluster, type ClusterControl, type ClusterGauge } from "../../components/business-dashboard/GaugeCluster";
import { dismissSetup, loadDashboard, type DashRaw } from "../../components/business-dashboard/dashboardData";
import { saveListingActive } from "../../services/business-market";
import { counts, dateKicker, gaugeModels, greeting, kindOf, setupSteps, todayBlock, toneColour, weekItems, type SetupStep } from "../../components/business-dashboard/dashboardModel";
import { attentionItems, type AttentionItem } from "../../components/business-dashboard/attention";
import { activityEvents, weekTotals } from "../../components/business-dashboard/activityFeed";
import { useActivityFeed } from "../../components/business-dashboard/useActivityFeed";
import { ErrorRow } from "../../components/business-dashboard/parts";
import { ScheduleBlock } from "../../components/business-dashboard/ScheduleBlock";
import { ActivityScreen } from "../../components/business-dashboard/RecentActivity";
import { WebAttentionPopover, WebDashActions, WebListingPopup, WebRecentActivity, WebSetupCard, WebTodayGym, WebVenueChip, WebVenueSection } from "../../components/business-dashboard/DashboardParts.web";
import { useWebLayout } from "../../components/web/useWebLayout";
import { BUSINESS_KINDS, fetchUnreadNotificationCount } from "../../services/notifications";
import { BusinessPlanHomeCard } from "../../components/premium/BusinessPlanHomeCard";
import { t } from "../../i18n/core";

// Website viewport v1 · WB-HO · GY Dashboard (WB-HO Dashboard Web v4), from
// 1024px wide. The page header (64: greeting, date, business name, venue chip,
// Listed chip, bell) over a 12-column grid (8 on the rail, gaps 24, page
// padding 32): At a glance (4 / 3 columns, the cluster at most 320 wide),
// Today (the rest), then This venue (7 / 4) beside Recent activity (5 / 4).
// A new gym shows Finish setting up beside At a glance and Today under it.
// Reading, polling, saving and the destinations are the mobile
// BusinessDashboard's, unchanged; the mobile page itself is not touched.
//
// The Classes and Store dashboards (WB-HO · CS / · ST) have their own web
// designs, not built yet: until then those businesses (and a gym that runs
// classes, which the app draws with the class set) see the mobile dashboard
// in the centred column, as every page without a web layout does.

const POLL_MS = 2 * 60 * 1000;
const GAP = 24;

const MobileColumn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-web-frame="mobile" className="max-w-[430px] mx-auto px-4 pt-6 pb-12">
    {children}
  </div>
);

export default function BusinessDashboardWeb() {
  const { user, authUserId, profileReady, accessibility } = useApp();
  const navigate = useNavigate();
  const dark = useIsDark();
  const c = useMemo(() => dashPalette(dark, !!accessibility.highContrast), [dark, accessibility.highContrast]);
  const reducedMotion = useReducedMotion();
  const online = useOnline();
  const { rail } = useWebLayout();
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

  const load = useCallback(async () => {
    if (!authUserId) return;
    setRefreshing(true);
    const r = await loadDashboard(authUserId, gymId);
    setRefreshing(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setError(null);
    setRaw(r.raw);
    setUpdatedAt(Date.now());
  }, [authUserId, gymId]);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [profileReady, authUserId, load]);
  usePoll(() => void load(), POLL_MS, !!raw && online);
  const feed = useActivityFeed(raw?.business?.id ?? null, online);

  const kind = kindOf(raw?.business?.type ?? user.businessType ?? null, (raw?.classes.length ?? 0) > 0);
  const today = localDayOf(now);
  const gauges = useMemo(() => (raw ? gaugeModels(kind, raw, now) : null), [kind, raw, now]);
  const attention = useMemo(() => (raw ? (raw.attention ? attentionItems(raw.attention) : null) : []), [raw]);
  const steps = useMemo(() => (raw ? setupSteps(kind, raw) : []), [kind, raw]);
  const venueNames = useMemo(() => Object.fromEntries(venues.map((v) => [v.gymId, v.name])), [venues]);
  const allActivity = useMemo(
    () => (raw && feed.rows ? activityEvents(feed.rows, { classes: raw.classes, booked: counts(raw, now).booked, venueNames, today: localDayOf(now) }, now, 30) : []),
    [raw, feed.rows, venueNames, now]
  );
  const weekActivity = useMemo(() => allActivity.filter((e) => e.day >= localDayOf(new Date(now.getTime() - 6 * 86_400_000))), [allActivity, now]);
  const totals = useMemo(() => (raw && feed.totals ? weekTotals(kind === "classes", feed.totals, raw.classes, now) : null), [kind, raw, feed.totals, now]);
  const schedule = useMemo(() => (raw ? weekItems(raw, now) : null), [raw, now]);

  const [panelOpen, setPanelOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [setupHidden, setSetupHidden] = useState(false);
  const [bell, setBell] = useState<HTMLButtonElement | null>(null);
  useBackCloses(activityOpen, () => setActivityOpen(false));
  const [notifUnread, setNotifUnread] = useState<number | null>(null);
  const [notifTick, setNotifTick] = useState(0);
  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let live = true;
    void fetchUnreadNotificationCount(BUSINESS_KINDS).then((r) => live && setNotifUnread(r.ok ? r.value : null));
    return () => {
      live = false;
    };
  }, [profileReady, authUserId, panelOpen, notifTick]);
  useInboxRealtime(authUserId, "biz-bell", BUSINESS_KINDS, () => setNotifTick((n) => n + 1));

  // The grid's own width, for the cluster (handover: min(320, 4 or 3 columns)).
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridW, setGridW] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setGridW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, [kind, activityOpen]);

  const business = raw?.business ?? null;
  const listed = raw ? !!business?.active : null;
  const go = (to: string) => navigate(to);
  const openListing = () => (business ? setSheetOpen(true) : go("/app/business/profile"));

  const onToggleListing = async (v: boolean) => {
    if (!business || !raw) return t("Couldn't change your listing. Try again.");
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
    if (a.to === "listing") return openListing();
    const to: Record<Exclude<AttentionItem["to"], "listing">, string> = {
      setup: "/app/business/setup",
      subscription: "/app/business/more/subscription",
      revenue: "/app/business/analytics/revenue",
      classes: "/app/business/classes",
      orders: "/app/business/orders",
      products: "/app/business/products",
      photos: "/app/business/marketplace/photos",
      reputation: "/app/business/analytics/reputation",
      join_requests: "/app/business/employees/requests",
      seats: "/app/business/more/seats",
    };
    go(to[a.to]);
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

  // Not a gym (or a gym that runs classes): the mobile dashboard in the centred column until WB-HO · CS / · ST are built.
  if (kind !== "gym") {
    return (
      <MobileColumn>
        <BusinessDashboard />
      </MobileColumn>
    );
  }

  // WB-HO.6 See all activity (its web design is not built yet): the mobile screen in the centred column.
  if (activityOpen && raw) {
    return (
      <MobileColumn>
        <div style={{ color: c.ink }}>
          <ActivityScreen c={c} events={allActivity} now={now} today={today} onBack={() => setActivityOpen(false)} newIds={feed.newIds} />
        </div>
      </MobileColumn>
    );
  }

  const controls: ClusterControl[] = [
    { key: "checkin", Icon: ScanLine, name: t("Check someone in"), onActivate: () => go("/app/business/operations") },
    { key: "daypass", Icon: Ticket, name: t("Sell a day pass"), onActivate: () => go("/app/business/gym") },
    { key: "invite", Icon: MailPlus, name: t("Invite member"), onActivate: () => go("/app/business/members") },
    { key: "discount", Icon: BadgePercent, name: t("Add discount"), onActivate: () => go("/app/business/marketplace?tab=promo&offer=new") },
    { key: "employee", Icon: IdCard, name: t("Add employee"), onActivate: () => go("/app/business/employees") },
  ];
  const LOADING_LABELS = ["Entries", "Renewals due", "Net members", "Seats used"];
  const clusterGauges: ClusterGauge[] = gauges
    ? gauges.map((g) => ({ spec: g.spec, empty: g.empty, label: g.label, sub: g.sub, subColor: toneColour(c, g.subTone), target: g.target, format: g.format, display: "–", unit: g.unit }))
    : LOADING_LABELS.map((l) => ({ spec: { kind: "blank" }, empty: true, label: t(l), sub: "", subColor: c.faint, target: null, format: String, display: "" }));

  const hasEvents = !!schedule && schedule.items.some((d) => d.some((x) => x.ev));
  const showSetup = !!raw && !raw.dismissed && !setupHidden && steps.some((s) => !s.done);
  const model = raw ? todayBlock("gym", raw, now) : null;

  const cols = rail ? 8 : 12;
  const spanAw = rail ? 3 : 4;
  const col = gridW > 0 ? (gridW - (cols - 1) * GAP) / cols : 0;
  const clusterW = col > 0 ? Math.min(320, Math.floor(spanAw * col + (spanAw - 1) * GAP)) : 320;
  const span = (n: number) => ({ gridColumn: `span ${n}` });

  return (
    <div data-business-dashboard="web" style={{ color: c.ink }}>
      <header style={{ height: 64, boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 32px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", whiteSpace: "nowrap", color: c.ink }}>{greeting(now)}</h1>
          <p data-kicker style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: c.faint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>
            {dateKicker(now)}
          </p>
        </div>
        <WebDashActions
          c={c}
          name={business?.name || user.businessName || t("Your business")}
          venueChip={<WebVenueChip c={c} venues={venues} selected={selected} onSelect={select} />}
          listed={listed}
          attentionCount={attention?.length ?? 0}
          notificationsUnread={notifUnread}
          panelOpen={panelOpen}
          onBell={() => setPanelOpen(true)}
          onChip={openListing}
          bellRef={setBell}
        />
      </header>
      <WebAttentionPopover c={c} open={panelOpen} items={attention} anchor={bell} onClose={() => setPanelOpen(false)} onAction={onAttention} onRetry={() => void load()} notificationsUnread={notifUnread} />

      {/* At 1440 the second grid row takes the rest of the window (rows "auto minmax(0,1fr)"), as the frame does; on the rail the rows hug their content. */}
      <div style={{ maxWidth: 1280, boxSizing: "border-box", padding: "32px", minHeight: "calc(100dvh - 64px)", display: "flex", flexDirection: "column" }}>
        {/* The kept notices of the mobile page, full width above the grid. */}
        <DobPromptCard setup className="mb-6" />
        {error && !raw && <ErrorRow c={c} text={error} onRetry={() => void load()} />}
        <BusinessPlanHomeCard businessId={business?.id} />
        {selected?.hiddenAt && (
          <p role="note" style={{ fontSize: 13, lineHeight: "20px", color: c.high, background: c.highBg, borderRadius: 16, padding: "12px 14px", margin: "0 0 24px" }}>
            {t("{name} is hidden from Explore. Centium hid this venue on {date}, so people can't find it on Explore or open its page. You can still see it here. Contact Centium support to find out why.", { name: selected.name, date: dayMonthYear(selected.hiddenAt.slice(0, 10)) })}
          </p>
        )}

        <div ref={gridRef} data-dash-grid style={{ flex: rail ? "none" : 1, display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gridTemplateRows: rail ? "auto" : "auto minmax(min-content,1fr)", columnGap: GAP, rowGap: GAP }}>
          <section aria-label={t("At a glance")} data-glance style={{ ...span(spanAw), minWidth: 0, display: "flex", flexDirection: "column", gap: 8, order: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.faint, whiteSpace: "nowrap" }}>{t("At a glance")}</p>
              <button type="button" onClick={() => go("/app/business/analytics")} style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.pDark, whiteSpace: "nowrap", background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                {t("View analytics")}
                <ChevronRight size={16} aria-hidden className="rtl:-scale-x-100" />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div data-cluster style={{ width: clusterW }}>
                <GaugeCluster c={c} gauges={clusterGauges} controls={controls} onGaugeTap={(label) => navigate("/app/business/analytics", { state: { section: label } })} ready={!!raw} reducedMotion={reducedMotion} web />
              </div>
            </div>
          </section>

          {showSetup && (
            <WebSetupCard
              c={c}
              steps={steps}
              onStep={onStep}
              onDismiss={() => {
                setSetupHidden(true);
                if (business) void dismissSetup(business.id);
              }}
              style={{ ...span(cols - spanAw), order: 2 }}
            />
          )}

          {model && (model.kind === "gym" || model.kind === "empty") && (
            <WebTodayGym
              c={c}
              model={model.kind === "gym" ? model : null}
              empty={model.kind === "empty" ? { boxes: model.boxes, title: model.title, body: model.body } : null}
              onEntries={() => go("/app/business/operations")}
              style={{ ...span(showSetup ? (rail ? 4 : 7) : cols - spanAw), order: showSetup ? 3 : 2 }}
            />
          )}

          {gymId && <WebVenueSection c={c} gymId={gymId} cols={rail ? 3 : 4} onConsole={() => go("/app/business/venue")} style={{ ...span(rail ? 4 : 7), order: showSetup ? 5 : 3 }} />}

          {raw && feed.rows === null && feed.error ? (
            <div style={{ ...span(rail ? 4 : 5), order: 4 }}>
              <ErrorRow c={c} text={feed.error} onRetry={feed.refresh} />
            </div>
          ) : (
            raw && (
              <WebRecentActivity
                c={c}
                week={weekActivity}
                totals={totals}
                now={now}
                today={today}
                todayIndex={mondayIndex(now.getDay())}
                updatedAt={feed.updatedAt ?? updatedAt}
                online={online}
                refreshing={refreshing || feed.refreshing}
                onRefresh={() => {
                  void load();
                  feed.refresh();
                }}
                onSeeAll={() => setActivityOpen(true)}
                newIds={feed.newIds}
                style={{ ...span(rail ? 4 : 5), order: 4 }}
              />
            )
          )}

          {hasEvents && schedule && (
            <section aria-label={t("Schedule")} style={{ gridColumn: "1 / -1", order: 6, minWidth: 0 }}>
              <ScheduleBlock key={today} c={c} dates={schedule.dates} items={schedule.items} today={today} now={now} noClassesEver={(raw?.classes.length ?? 0) === 0} classBased={false} onCalendar={() => go("/app/business/calendar")} onCreateClass={() => go("/app/business/classes")} />
            </section>
          )}
        </div>

        {selected && !isOwner && <p style={{ fontSize: 13, lineHeight: "20px", color: c.faint, textAlign: "center", margin: "24px 0 0" }}>{t("You're staff at this venue, so you can view it but only the owner can change it.")}</p>}
      </div>

      <WebListingPopup c={c} open={sheetOpen} onClose={() => setSheetOpen(false)} active={!!business?.active} onToggle={onToggleListing} />
    </div>
  );
}

