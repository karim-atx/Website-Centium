import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BadgePercent, CalendarPlus, ChevronRight, IdCard, MailPlus, Package, PackagePlus } from "lucide-react";
import { DobPromptCard } from "../../components/profile/DobPromptCard";
import { useApp } from "../../context/AppContext";
import type { MyVenue } from "../../services/venues/consoleLogic";
import { dayMonthYear } from "../../services/venues/venueLogic";
import { mondayIndex } from "../../utils/week";
import type { DashPalette } from "../../components/business-dashboard/palette";
import { GaugeCluster, type ClusterControl, type ClusterGauge } from "../../components/business-dashboard/GaugeCluster";
import { dismissSetup, type DashRaw } from "../../components/business-dashboard/dashboardData";
import { counts, dateKicker, greeting, shortHour, todayBlock, toneColour, type DashKind, type DayItem, type GaugeModel, type SetupStep } from "../../components/business-dashboard/dashboardModel";
import type { AttentionItem } from "../../components/business-dashboard/attention";
import type { ActivityEvent, WeekTotal } from "../../components/business-dashboard/activityFeed";
import { ErrorRow } from "../../components/business-dashboard/parts";
import { ScheduleBlock } from "../../components/business-dashboard/ScheduleBlock";
import { WebAttentionPopover, WebDashActions, WebListingPopup, WebRecentActivity, WebSetupCard, WebVenueChip, WebVenueSection } from "../../components/business-dashboard/DashboardParts.web";
import { WebScheduleSection, WebTodayClasses, WebTodayStore, type ClassBar } from "../../components/business-dashboard/DashboardKinds.web";
import { BusinessPlanHomeCard } from "../../components/premium/BusinessPlanHomeCard";
import { t } from "../../i18n/core";
import { WEB_CONTENT_MAX } from "../../components/web/useWebLayout";

// Website viewport v1 · WB-HO · CS Dashboard (WB-HO Classes Dashboard Web v2)
// and WB-HO · ST Dashboard (WB-HO Store Dashboard Web v2), from 1024px wide.
// The gym dashboard's header (64), cluster and Recent activity over the same
// 12-column grid (8 on the rail, gaps 24, padding 32):
//   Classes: At a glance (4 / 3) · Today (8 / 5: boxes, Fill by class today
//   beside Next up); Schedule (7 / 4: week strip and the day card) · Recent
//   activity (5 / 4). New: Finish setting up beside At a glance, Today (the
//   "No classes yet" box) and Schedule 7 / 4 under it.
//   Store: At a glance · Today (boxes, Orders to fulfil beside Low stock);
//   Recent activity across the second row. New: Finish setting up, Today
//   (the "No orders yet" box) 7 / 4 beside Recent activity 5 / 4.
// Reading, polling, saving and the destinations are the mobile
// BusinessDashboard's (BusinessDashboard.web passes its state in). Kept from
// the mobile page: a venue's figures (This venue) for a gym that runs
// classes, and calendar events in a store's Schedule.

const GAP = 24;

export interface KindDashProps {
  kind: Exclude<DashKind, "gym">;
  c: DashPalette;
  raw: DashRaw | null;
  error: string | null;
  now: Date;
  today: string;
  rail: boolean;
  online: boolean;
  reducedMotion: boolean;
  venues: MyVenue[];
  selected: MyVenue | null;
  select: (gymId: string) => void;
  isOwner: boolean;
  gymId: string | null;
  gauges: GaugeModel[] | null;
  attention: AttentionItem[] | null;
  steps: SetupStep[];
  notifUnread: number | null;
  panelOpen: boolean;
  setPanelOpen: (v: boolean) => void;
  sheetOpen: boolean;
  setSheetOpen: (v: boolean) => void;
  setupHidden: boolean;
  setSetupHidden: (v: boolean) => void;
  onToggleListing: (v: boolean) => Promise<string | null>;
  onAttention: (a: AttentionItem) => void;
  onStep: (s: SetupStep) => void;
  openListing: () => void;
  load: () => void;
  schedule: { dates: string[]; items: DayItem[][] } | null;
  weekActivity: ActivityEvent[];
  totals: WeekTotal[] | null;
  feed: { rows: unknown[] | null; error: string | null; updatedAt: number | null; refreshing: boolean; refresh: () => void; newIds: Set<number> };
  updatedAt: number | null;
  refreshing: boolean;
  onSeeAllActivity: () => void;
}

export function BusinessDashboardKindWeb(p: KindDashProps) {
  const { kind, c, raw, now, today, rail } = p;
  const { user } = useApp();
  const navigate = useNavigate();
  const go = (to: string) => navigate(to);
  const [bell, setBell] = useState<HTMLButtonElement | null>(null);

  // The grid's own width, for the cluster (min(320, 4 or 3 columns)), as the gym page.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [gridW, setGridW] = useState(0);
  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => setGridW(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const store = kind === "store";
  const business = raw?.business ?? null;
  const listed = raw ? !!business?.active : null;

  const controls: ClusterControl[] = store
    ? [
        { key: "product", Icon: PackagePlus, name: t("Add product"), onActivate: () => go("/app/business/products") },
        { key: "orders", Icon: Package, name: t("View orders"), onActivate: () => go("/app/business/operations") },
        { key: "discount", Icon: BadgePercent, name: t("Add discount"), onActivate: () => go("/app/business/products?tab=promotions&offer=new") },
      ]
    : [
        { key: "class", Icon: CalendarPlus, name: t("Create class"), onActivate: () => go("/app/business/classes") },
        { key: "invite", Icon: MailPlus, name: t("Invite member"), onActivate: () => go("/app/business/members") },
        { key: "offering", Icon: PackagePlus, name: t("Add offering"), onActivate: () => go("/app/business/marketplace") },
        { key: "discount", Icon: BadgePercent, name: t("Add discount"), onActivate: () => go("/app/business/marketplace?tab=promo&offer=new") },
        { key: "employee", Icon: IdCard, name: t("Add employee"), onActivate: () => go("/app/business/employees") },
      ];
  const LOADING_LABELS = store ? ["Net members", "New members", "Live listings", "Live discounts"] : ["Fill rate", "Booked", "Net members", "Seats used"];
  const clusterGauges: ClusterGauge[] = p.gauges
    ? p.gauges.map((g) => ({ spec: g.spec, empty: g.empty, label: g.label, sub: g.sub, subColor: toneColour(c, g.subTone), target: g.target, format: g.format, display: "–", unit: g.unit }))
    : LOADING_LABELS.map((l) => ({ spec: { kind: "blank" }, empty: true, label: t(l), sub: "", subColor: c.faint, target: null, format: String, display: "" }));

  const model = useMemo(() => (raw ? todayBlock(kind, raw, now) : null), [kind, raw, now]);
  const empty = model?.kind === "empty" ? model : null;
  // Fill by class today: the bars of todayBlock with each class's name and booked figures (the frame's labels and tooltips).
  const bars: ClassBar[] = useMemo(() => {
    if (!raw || kind !== "classes") return [];
    const k = counts(raw, now);
    return (k.byDate[k.today] ?? []).map((x) => {
      const b = k.booked[x.id] ?? 0;
      return { h: x.cap > 0 ? Math.round((b / x.cap) * 100) : 0, label: shortHour(x.start), name: x.title, booked: b, cap: x.cap };
    });
  }, [raw, kind, now]);

  const showSetup = !!raw && !raw.dismissed && !p.setupHidden && p.steps.some((s) => !s.done);
  const hasEvents = !!p.schedule && p.schedule.items.some((d) => d.some((x) => x.ev));

  const cols = rail ? 8 : 12;
  const spanAw = rail ? 3 : 4;
  const col = gridW > 0 ? (gridW - (cols - 1) * GAP) / cols : 0;
  const clusterW = col > 0 ? Math.min(320, Math.floor(spanAw * col + (spanAw - 1) * GAP)) : 320;
  const span = (n: number) => ({ gridColumn: `span ${n}` });
  // Handover: Today spans the rest of the first row, or 7 / 4 under Finish setting up when new (order 3).
  const spanToday = empty ? (rail ? 4 : 7) : cols - spanAw;
  const todayOrder = empty ? 3 : 2;
  const spanAct = store && !empty ? cols : rail ? 4 : 5;

  return (
    <div data-business-dashboard="web" data-dash-kind={kind} style={{ color: c.ink }}>
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
          venueChip={<WebVenueChip c={c} venues={p.venues} selected={p.selected} onSelect={p.select} />}
          listed={listed}
          attentionCount={p.attention?.length ?? 0}
          notificationsUnread={p.notifUnread}
          panelOpen={p.panelOpen}
          onBell={() => p.setPanelOpen(true)}
          onChip={p.openListing}
          bellRef={setBell}
        />
      </header>
      <WebAttentionPopover c={c} open={p.panelOpen} items={p.attention} anchor={bell} onClose={() => p.setPanelOpen(false)} onAction={p.onAttention} onRetry={p.load} notificationsUnread={p.notifUnread} />

      <div style={{ maxWidth: WEB_CONTENT_MAX, boxSizing: "border-box", padding: "32px", minHeight: "calc(100dvh - 64px)", display: "flex", flexDirection: "column" }}>
        {/* The kept notices of the mobile page, full width above the grid. */}
        <DobPromptCard setup className="mb-6" />
        {p.error && !raw && <ErrorRow c={c} text={p.error} onRetry={p.load} />}
        <BusinessPlanHomeCard businessId={business?.id} />
        {p.selected?.hiddenAt && (
          <p role="note" style={{ fontSize: 13, lineHeight: "20px", color: c.high, background: c.highBg, borderRadius: 16, padding: "12px 14px", margin: "0 0 24px" }}>
            {t("{name} is hidden from Explore. Centium hid this venue on {date}, so people can't find it on Explore or open its page. You can still see it here. Contact Centium support to find out why.", { name: p.selected.name, date: dayMonthYear(p.selected.hiddenAt.slice(0, 10)) })}
          </p>
        )}

        {/* At 1440 the second row takes the rest of the window ("auto minmax(0,1fr)" in the frames); on the rail the rows hug their content. */}
        <div
          ref={gridRef}
          data-dash-grid
          style={{ flex: rail ? "none" : 1, display: "grid", gridTemplateColumns: `repeat(${cols},minmax(0,1fr))`, gridTemplateRows: rail ? "auto" : "auto minmax(min-content,1fr)", columnGap: GAP, rowGap: GAP }}
        >
          <section aria-label={t("At a glance")} data-glance style={{ ...span(spanAw), minWidth: 0, display: "flex", flexDirection: "column", gap: 8, order: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: c.faint, whiteSpace: "nowrap" }}>{t("At a glance")}</p>
              <button type="button" onClick={() => go("/app/business/analytics")} style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: c.pDark, whiteSpace: "nowrap", background: "none", border: 0, padding: 0, cursor: "pointer" }}>
                {t("View analytics")}
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div data-cluster style={{ width: clusterW }}>
                <GaugeCluster c={c} gauges={clusterGauges} controls={controls} onGaugeTap={(label) => navigate("/app/business/analytics", { state: { section: label } })} ready={!!raw} reducedMotion={p.reducedMotion} web />
              </div>
            </div>
          </section>

          {showSetup && (
            <WebSetupCard
              c={c}
              steps={p.steps}
              onStep={p.onStep}
              onDismiss={() => {
                p.setSetupHidden(true);
                if (business) void dismissSetup(business.id);
              }}
              style={{ ...span(cols - spanAw), order: 2 }}
            />
          )}

          {model &&
            (store ? (
              <WebTodayStore
                c={c}
                model={model.kind === "store" ? model : null}
                empty={empty}
                onOrders={() => go("/app/business/operations")}
                onOpenOrder={(id) => go(`/app/business/orders/${id}`)}
                onProducts={() => go("/app/business/products")}
                style={{ ...span(spanToday), order: todayOrder }}
              />
            ) : (
              <WebTodayClasses
                c={c}
                model={model.kind === "classes" ? model : null}
                empty={empty}
                bars={bars}
                onSeeAll={() => go("/app/business/classes")}
                onOpenClass={() => go("/app/business/classes")}
                style={{ ...span(spanToday), order: todayOrder }}
              />
            ))}

          {!store && p.schedule && (
            <WebScheduleSection
              key={today}
              c={c}
              dates={p.schedule.dates}
              items={p.schedule.items}
              today={today}
              now={now}
              noClassesEver={(raw?.classes.length ?? 0) === 0}
              rail={rail}
              onCalendar={() => go("/app/business/calendar")}
              onCreateClass={() => go("/app/business/classes")}
              style={{ ...span(rail ? 4 : 7), order: 3 }}
            />
          )}

          {raw && p.feed.rows === null && p.feed.error ? (
            <div style={{ ...span(spanAct), order: 4 }}>
              <ErrorRow c={c} text={p.feed.error} onRetry={p.feed.refresh} />
            </div>
          ) : (
            raw && (
              <WebRecentActivity
                c={c}
                week={p.weekActivity}
                totals={p.totals}
                now={now}
                today={today}
                todayIndex={mondayIndex(now.getDay())}
                updatedAt={p.feed.updatedAt ?? p.updatedAt}
                online={p.online}
                refreshing={p.refreshing || p.feed.refreshing}
                onRefresh={() => {
                  p.load();
                  p.feed.refresh();
                }}
                onSeeAll={p.onSeeAllActivity}
                newIds={p.feed.newIds}
                style={{ ...span(spanAct), order: 4 }}
              />
            )
          )}

          {/* Kept from the mobile page: a venue's own figures (a gym that runs classes), full width under the grid's rows. */}
          {!store && p.gymId && <WebVenueSection c={c} gymId={p.gymId} cols={rail ? 4 : 6} onConsole={() => go("/app/business/venue")} style={{ gridColumn: "1 / -1", order: 5 }} />}

          {/* Kept from the mobile page: a store's calendar events in the Schedule, full width at the end (as the gym page). */}
          {store && hasEvents && p.schedule && (
            <section aria-label={t("Schedule")} style={{ gridColumn: "1 / -1", order: 6, minWidth: 0 }}>
              <ScheduleBlock key={today} c={c} dates={p.schedule.dates} items={p.schedule.items} today={today} now={now} noClassesEver={(raw?.classes.length ?? 0) === 0} classBased={false} onCalendar={() => go("/app/business/calendar")} onCreateClass={() => go("/app/business/classes")} />
            </section>
          )}
        </div>

        {p.selected && !p.isOwner && <p style={{ fontSize: 13, lineHeight: "20px", color: c.faint, textAlign: "center", margin: "24px 0 0" }}>{t("You're staff at this venue, so you can view it but only the owner can change it.")}</p>}
      </div>

      <WebListingPopup c={c} open={p.sheetOpen} onClose={() => p.setSheetOpen(false)} active={!!business?.active} onToggle={p.onToggleListing} />
    </div>
  );
}
