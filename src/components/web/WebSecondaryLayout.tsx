import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Armchair,
  Bell,
  BellRing,
  CalendarClock,
  CalendarRange,
  CalendarX,
  ChevronRight,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Globe,
  KeyRound,
  Landmark,
  ListOrdered,
  Percent,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Sun,
  Camera,
  UserPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useBusiness } from "../business-more/useBusiness";
import { useBusinessPlan } from "../../hooks/useBusinessPlan";
import { PremiumLeafIcon, ReferralLeafIcon } from "../icons/MoreLeafIcons";
import { ReferralPopup } from "../profile/ReferralPopup";
import { fetchLocations, fetchPlanRenewal, fetchStoreSettings, fetchTeamRows } from "../../services/business-more";
import { fetchJoinRequests } from "../../services/business-team/team";
import { fetchBookingPolicies } from "../../services/business-classes/schedule";
import { effectiveRules, policyFor, type BookingPolicy } from "../../services/business-classes/scheduleRules";
import { returnsSummary } from "../../pages/business-more/storePolicyText";
import { formatShortDate } from "../../utils/date";
import { tk, tn } from "../../i18n/core";
import { bizSettingsSection, type BizSettingsSection, type SecondaryKind } from "./webNav";
import { AppSettingsLayout, ProMoreLayout } from "./WebAppSecondary";
import { PaneFillContext, PaneSpanContext } from "./paneFill";
import { useWebLayout, WEB_READING_MAX } from "./useWebLayout";

const under = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

// Website viewport v1, section 4 "More and Settings on web" (ST Settings Web,
// Karim's decisions 2 to 4): a secondary column (360 at 1440, 300 at 1024,
// padding 24, its own scroll) with the title 28/36 and the repo's section
// groups as grouped cards (#F7F7FC, r18). Rows: min 60, 40 tile #8E7FD0 with a
// white glyph, title 15/20 600 on one line (ellipsis, hover title),
// description 13/20 on one line, chevron or ↗, the repo's markers (count
// badges). Selected row #F0EDF9 with a purple title. The content pane shows the
// selected item, the first by default; its page is the repo's own screen (the
// pane designs follow later), centred in the pane. Items with their own
// sidebar entry are not listed (decision 4).

export interface SecondaryItem {
  key: string;
  label: string;
  desc?: React.ReactNode;
  descTitle?: string;
  icon: LucideIcon | React.FC<{ size?: number; style?: React.CSSProperties }>;
  /** Route (with an optional query) the pane opens. */
  to?: string;
  onClick?: () => void;
  badge?: number;
  /** Opens a page of its own, outside this layout (↗). */
  ext?: boolean;
  /** A marker before the chevron (the Verified chip, review stars). */
  trailing?: React.ReactNode;
  /** A row that is a switch (WP-MO.10 Calls with hired clients): its state; null while loading. The click (onClick) flips it. */
  switchOn?: boolean | null;
}
export interface SecondaryGroup {
  label: string;
  items: SecondaryItem[];
}

const TILE = "#8E7FD0";

const SecondaryRow: React.FC<{ item: SecondaryItem; selected: boolean; rule: boolean; onSelect: () => void }> = ({ item, selected, rule, onSelect }) => {
  const { t } = useApp();
  const Icon = item.icon as React.FC<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; "aria-hidden"?: boolean }>;
  const label = t(item.label);
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected ? "page" : undefined}
      role={item.switchOn !== undefined ? "switch" : undefined}
      aria-checked={item.switchOn !== undefined ? !!item.switchOn : undefined}
      disabled={item.switchOn === null}
      className="relative w-full flex items-center text-start shrink-0 transition-colors duration-150 hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:-outline-offset-2"
      style={{ minHeight: 60, gap: 14, paddingBlock: 8, paddingInlineStart: 14, paddingInlineEnd: 16, borderRadius: 14, background: selected ? "#F0EDF9" : undefined }}
    >
      {rule && <span aria-hidden className="absolute top-0" style={{ insetInlineStart: 68, insetInlineEnd: 16, height: 1, background: "#EBEAF6" }} />}
      <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 10, background: TILE }}>
        <Icon size={22} strokeWidth={1.5} style={{ color: "#FFFFFF" }} aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span
          title={label}
          className="block whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ fontSize: 15, lineHeight: "20px", fontWeight: 600, color: selected ? "#7D6BB5" : "#241F1B" }}
        >
          {label}
        </span>
        {item.desc != null && item.desc !== false && (
          <span
            title={item.descTitle}
            className="block whitespace-nowrap overflow-hidden text-ellipsis"
            style={{ marginTop: 2, fontSize: 13, lineHeight: "20px", color: "#857F9E" }}
          >
            {item.desc}
          </span>
        )}
      </span>
      <span className="flex items-center shrink-0" style={{ gap: 8 }}>
        {item.trailing}
        {item.badge != null && item.badge > 0 && (
          <span
            className="flex items-center justify-center tabular-nums"
            style={{ minWidth: 20, height: 20, padding: "0 6px", boxSizing: "border-box", borderRadius: 999, background: "#9A8CD6", color: "#FFFFFF", fontSize: 11, lineHeight: "16px", fontWeight: 700 }}
          >
            {item.badge}
          </span>
        )}
        {item.switchOn !== undefined ? (
          <span aria-hidden className="flex shrink-0" style={{ width: 44, height: 26, boxSizing: "border-box", borderRadius: 999, background: item.switchOn ? "#9A8CD6" : "#E4E2EA", padding: 3, justifyContent: item.switchOn ? "flex-end" : "flex-start", opacity: item.switchOn === null ? 0.4 : 1 }}>
            <span style={{ width: 20, height: 20, borderRadius: 999, background: "#FFFFFF", boxShadow: "0 1px 2px rgba(36,31,27,0.2)" }} />
          </span>
        ) : item.ext ? (
          <ExternalLink size={16} strokeWidth={2} style={{ color: "#9A94B3" }} aria-hidden />
        ) : (
          <ChevronRight size={16} strokeWidth={2} style={{ color: "#9A94B3" }} aria-hidden />
        )}
      </span>
    </button>
  );
};

/** The column's body: the groups, a caps label with the lavender rule over each card. */
export const SecondaryGroups: React.FC<{ title: string; groups: SecondaryGroup[]; selected: string | null; onSelect: (item: SecondaryItem) => void; navPb: number }> = ({
  title,
  groups,
  selected,
  onSelect,
  navPb,
}) => {
  const { t } = useApp();
  return (
    <nav aria-label={t("{title} sections", { title })} className="flex-1 min-h-0 overflow-y-auto flex flex-col" style={{ scrollbarWidth: "none", padding: `16px 24px ${navPb}px`, gap: 20 }}>
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <section key={g.label} aria-label={t(g.label)} className="shrink-0 flex flex-col">
            <p
              className="shrink-0 uppercase rtl:tracking-normal"
              style={{ margin: "0 4px 10px", paddingBottom: 8, borderBottom: "1.5px solid #AEA1DC", fontSize: 12, lineHeight: "16px", fontWeight: 600, letterSpacing: ".14em", color: "#8C8378" }}
            >
              {t(g.label)}
            </p>
            <div className="shrink-0 flex flex-col" style={{ borderRadius: 18, background: "#F7F7FC", padding: "4px 0" }}>
              {g.items.map((it, i) => (
                <SecondaryRow key={it.key} item={it} selected={selected === it.key} rule={i > 0 && selected !== it.key && selected !== g.items[i - 1].key} onSelect={() => onSelect(it)} />
              ))}
            </div>
          </section>
        ))}
    </nav>
  );
};

/** The dark plan card pinned under the business More list (Centium Business). */
export const PlanCard: React.FC<{ title: string; line: string; selected: boolean; onClick: () => void }> = ({ title, line, selected, onClick }) => (
  <div className="shrink-0" style={{ padding: "12px 24px 24px", borderTop: "1px solid rgba(36,31,27,0.06)" }}>
    <button
      type="button"
      onClick={onClick}
      aria-current={selected ? "page" : undefined}
      className="w-full flex items-center justify-between text-start focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] focus-visible:outline-offset-2"
      style={{ gap: 14, borderRadius: 16, padding: "14px 18px", background: "#241F1B", boxShadow: selected ? "0 0 0 2px #AEA1DC" : undefined }}
    >
      <span className="flex items-center min-w-0" style={{ gap: 12 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 40, height: 40, borderRadius: 12, background: "rgba(174,161,220,0.26)" }}>
          <PremiumLeafIcon size={24} style={{ color: "#C8BFE9" }} />
        </span>
        <span className="min-w-0">
          <span title={title} className="block whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 15, lineHeight: "20px", fontWeight: 800, color: "#FFFFFF" }}>
            {title}
          </span>
          <span title={line} className="block whitespace-nowrap overflow-hidden text-ellipsis" style={{ fontSize: 13, lineHeight: "20px", color: "rgba(255,255,255,0.7)" }}>
            {line}
          </span>
        </span>
      </span>
      <ChevronRight size={16} strokeWidth={2} className="shrink-0" style={{ color: "#C8BFE9" }} aria-hidden />
    </button>
  </div>
);

const fmtRenew = (iso: string) => formatShortDate(new Date(iso), { day: "numeric", month: "short" });

/** The business More list and its live lines (as the mobile More index reads them). */
function useBusinessMoreGroups(openReferral: () => void): { groups: SecondaryGroup[]; first: string; planLine: string; firstTo: string; kindKnown: boolean } {
  const { t } = useApp();
  const { business, kind, kindKnown } = useBusiness();
  const { user, authUserId } = useApp();
  const { plan } = useBusinessPlan();
  const [team, setTeam] = useState<{ accepted: number } | null>(null);
  const [venueHours, setVenueHours] = useState<number | null | undefined>(undefined);
  const [policies, setPolicies] = useState<BookingPolicy[] | null | undefined>(undefined);
  const [returnsLine, setReturnsLine] = useState<string | null | undefined>(undefined);
  const [joinCount, setJoinCount] = useState(0);
  const [renews, setRenews] = useState<string | null>(null);
  const bizId = business?.id ?? null;

  useEffect(() => {
    if (!bizId) return;
    let cancelled = false;
    void fetchTeamRows(bizId).then((r) => !cancelled && r.ok && setTeam({ accepted: r.value.filter((x) => x.acceptedAt).length }));
    void fetchLocations(bizId).then((r) => !cancelled && setVenueHours(r.ok && r.value.length > 0 ? r.value[0].cancellationHours : null));
    void fetchBookingPolicies(bizId).then((r) => !cancelled && setPolicies(r.ok ? r.value : null));
    void fetchStoreSettings(bizId).then((r) => !cancelled && setReturnsLine(r.ok ? returnsSummary(r.value) : null));
    void fetchJoinRequests(bizId).then((r) => !cancelled && r.ok && setJoinCount(r.value.length));
    return () => {
      cancelled = true;
    };
  }, [bizId]);
  useEffect(() => {
    if (!authUserId) return;
    void fetchPlanRenewal(authUserId).then((r) => r.ok && setRenews(r.value));
  }, [authUserId]);

  const rules = policies === undefined || venueHours === undefined ? undefined : effectiveRules(policies ?? [], null, venueHours);
  const cancelHours = rules === undefined ? undefined : (policies ? policyFor(policies, null)?.cancellationHours : null) ?? venueHours;
  const cancelLine =
    cancelHours === undefined ? undefined : cancelHours === null ? t("Set when you add a location") : tn(cancelHours, "Free until {n} hour before", "Free until {n} hours before");
  const used = team?.accepted ?? 0;
  const totalSeats = plan?.totalSeats ?? 0;
  const seatsLine = plan && team ? (totalSeats > 0 ? t("{used} of {total} used · add seats", { used, total: totalSeats }) : t("No seats yet · add seats")) : undefined;
  const wellness = business?.type === "wellness_service" || user.businessType === "wellness_service";
  const store = kind === "store";
  const m = (p: string) => `/app/business/more/${p}`;

  const groups: SecondaryGroup[] = [
    { label: tk("Business"), items: [{ key: "referral", label: tk("Referral"), desc: t("Share your code, earn rewards"), icon: ReferralLeafIcon, onClick: openReferral }] },
  ];
  if (kindKnown) {
    groups.push(
      store
        ? { label: tk("Staff"), items: [{ key: "seats", label: tk("Seats"), desc: seatsLine, icon: Armchair, to: m("seats") }] }
        : {
            label: tk("Team and access"),
            items: [
              { key: "roles", label: tk("Roles and permissions"), desc: t("Who can see and change what"), icon: ShieldCheck, to: m("roles") },
              { key: "join", label: tk("Join requests"), desc: t("Professionals who used your ID"), icon: UserPlus, to: m("join-requests"), badge: joinCount },
              { key: "seats", label: tk("Seats"), desc: seatsLine, icon: Armchair, to: m("seats") },
            ],
          }
    );
    if (kind === "gym")
      groups.push({
        label: tk("Entry rules"),
        items: [
          { key: "cancellations", label: tk("Cancellations"), desc: cancelLine, icon: CalendarX, to: m("policies/edit?section=cancellations") },
          { key: "waiver", label: tk("Liability waiver"), desc: t("Accepted once, before the first visit"), icon: FileCheck, to: m("policy/waiver") },
          { key: "house", label: tk("House rules"), desc: t("Optional"), icon: FileText, to: m("policy/house_rules") },
        ],
      });
    if (kind === "classes")
      groups.push({
        label: tk("Booking policies"),
        items: [
          { key: "cancellations", label: tk("Cancellations"), desc: cancelLine, icon: CalendarX, to: m("policies/edit?section=cancellations") },
          {
            key: "window",
            label: tk("Booking window"),
            desc: rules ? tn(rules.bookingWindowDays, "Up to {n} day ahead", "Up to {n} days ahead") : undefined,
            icon: CalendarRange,
            to: m("policies/edit?section=window"),
          },
          {
            key: "waitlist",
            label: tk("Waitlist"),
            desc: rules ? (rules.waitlistCap > 0 ? tn(rules.waitlistCap, "On · up to {n} person", "On · up to {n} people") : t("Off")) : undefined,
            icon: ListOrdered,
            to: m("policies/edit?section=waitlist"),
          },
          { key: "reminders", label: tk("Class reminders"), desc: t("Coming soon"), icon: BellRing, to: m("policies/edit?section=reminders") },
          { key: "cterms", label: tk("Terms and waivers"), desc: t("Clients accept when booking"), icon: FileCheck, to: m("policies") },
        ],
      });
    if (store)
      groups.push({
        label: tk("Orders and policies"),
        items: [
          { key: "returns", label: tk("Returns and refunds"), desc: returnsLine === undefined ? undefined : returnsLine ?? t("Not set yet"), icon: RotateCcw, to: m("store-policies") },
          { key: "storeterms", label: tk("Terms clients accept"), desc: t("Shown before checkout"), icon: FileCheck, to: m("store-policies?section=terms") },
          ...(wellness
            ? [
                { key: "apwaiver", label: tk("Terms and waivers"), desc: t("For appointments"), icon: FileCheck, to: m("policy/appointment_waiver") },
                { key: "services", label: tk("Services and free slots"), desc: t("What clients can book, and when"), icon: CalendarClock, to: "/app/business/services", ext: true },
              ]
            : []),
        ],
      });
  }
  groups.push(
    {
      label: tk("Payments and billing"),
      items: [
        { key: "paymethods", label: tk("Payment methods"), desc: t("Cash · Whish soon"), icon: Wallet, to: m("payment-methods") },
        { key: "payouts", label: tk("Payouts"), desc: t("Whish payouts are coming"), icon: Landmark, to: m("payouts") },
        { key: "invoices", label: tk("Invoices and receipts"), desc: t("Coming soon"), icon: Receipt, to: m("invoices") },
        { key: "taxes", label: tk("Taxes"), desc: t("Coming soon"), icon: Percent, to: m("taxes") },
      ],
    },
    {
      label: tk("App"),
      items: [
        { key: "notifications", label: tk("Notifications"), desc: t("Bookings, payments, reviews & more"), icon: Bell, to: m("notifications") },
        { key: "export", label: tk("Export reports"), desc: store && kindKnown ? t("Orders, customers, transactions") : t("Bookings, members, transactions"), icon: Download, to: m("export") },
      ],
    }
  );
  const planLine = plan?.active
    ? [plan.base?.name ? t("{plan} plan", { plan: plan.base.name }) : t("Business plan"), tn(plan.totalSeats, "{n} seat", "{n} seats"), renews ? t("renews {date}", { date: fmtRenew(renews) }) : null]
        .filter(Boolean)
        .join(" · ")
    : t("See your plan and seats");
  const first = store ? "seats" : "roles";
  return { groups, first, planLine, firstTo: m(first === "seats" ? "seats" : "roles"), kindKnown };
}

/** The item a path shows (path, plus ?section= for the policy editor and the store terms). */
function selectedKey(groups: SecondaryGroup[], pathname: string, search: string): string | null {
  const here = new URLSearchParams(search);
  for (const g of groups)
    for (const it of g.items) {
      if (!it.to) continue;
      const [p, q] = it.to.split("?");
      if (p !== pathname) continue;
      const want = new URLSearchParams(q ?? "").get("section");
      if ((want ?? null) === (here.get("section") ?? null)) return it.key;
    }
  // A sub-page of a policy (policy/:kind/:view) keeps its item lit.
  for (const g of groups) for (const it of g.items) if (it.to && !it.to.includes("?") && pathname.startsWith(it.to + "/")) return it.key;
  return null;
}

const BIZ_SETTINGS: { key: BizSettingsSection; label: string; icon: LucideIcon }[] = [
  { key: "appearance", label: tk("Appearance"), icon: Sun },
  { key: "permissions", label: tk("Permissions"), icon: Camera },
  { key: "security", label: tk("Security"), icon: ShieldCheck },
  { key: "data", label: tk("Data & account"), icon: KeyRound },
  { key: "general", label: tk("General"), icon: Globe },
];

/** The Settings section a sub-page belongs to. */
function settingsSectionFor(pathname: string): string | null {
  if (under(pathname, "/app/settings/two-factor") || under(pathname, "/app/business/more/security")) return "security";
  if (under(pathname, "/app/business/more/deactivate") || under(pathname, "/app/settings/account")) return "data";
  if (pathname !== "/app/settings" && (under(pathname, "/app/settings") || under(pathname, "/app/business/more"))) return "general";
  return null;
}

/**
 * The pane: its own scroll, and the containing block of the fixed parts of the
 * screen inside it (pinned buttons, toasts), whose --app-gutter is the pane's
 * so they sit on the pane's centred column. A page shows in a centred 430
 * column (its mobile screen) unless it fills the pane (usePaneFill).
 * Professional handover v1 (section 4) and Addendum A (WC-SE): the professional
 * More and the Client / Professional Settings panes span the pane instead
 * (`span`): 32 padding (24 on the rail), the reading width of about 1280, values
 * and chevrons at the right edge. The Business panes keep their 430 column.
 */
export const Pane: React.FC<{ banners: React.ReactNode; children: React.ReactNode; scrollKey: string; span?: boolean }> = ({ banners, children, scrollKey, span }) => {
  const { rail } = useWebLayout();
  const pad = rail ? 24 : 32;
  const wrap = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const [gutter, setGutter] = useState(0);
  const [fill, setFill] = useState(false);
  useLayoutEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const update = () => setGutter(span ? pad : Math.max(0, (el.clientWidth - 430) / 2));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [span, pad]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [scrollKey]);
  return (
    <div ref={wrap} className="relative flex-1 min-w-0 h-full" style={{ contain: "layout", ["--app-gutter" as string]: `${gutter}px` }}>
      <div ref={scroller} className="h-full overflow-y-auto" style={{ scrollbarWidth: "thin" }} data-web-pane={fill ? "fill" : ""}>
        <div
          className={fill || span ? undefined : "max-w-[430px] mx-auto px-4 pt-6 pb-12"}
          style={!fill && span ? { maxWidth: WEB_READING_MAX, boxSizing: "border-box", padding: `${pad}px ${pad}px 48px` } : undefined}
        >
          <PaneFillContext.Provider value={setFill}>
            <PaneSpanContext.Provider value={!!span && !fill}>
              {banners}
              {children}
            </PaneSpanContext.Provider>
          </PaneFillContext.Provider>
        </div>
      </div>
    </div>
  );
};

export const Column: React.FC<{ title: string; secW: number; children: React.ReactNode; plan?: React.ReactNode }> = ({ title, secW, children, plan }) => (
  <aside
    aria-label={title}
    className="shrink-0 h-full flex flex-col bg-white"
    style={{ width: secW, boxSizing: "border-box", borderInlineEnd: "1px solid rgba(36,31,27,0.08)" }}
  >
    <div className="shrink-0" style={{ padding: "24px 24px 4px" }}>
      <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.03em", color: "#241F1B" }}>{title}</h1>
    </div>
    <div className="relative flex-1 min-h-0 flex flex-col">{children}</div>
    {plan}
  </aside>
);

const BusinessMoreLayout: React.FC<{ secW: number; banners: React.ReactNode; children: React.ReactNode }> = ({ secW, banners, children }) => {
  const { t } = useApp();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [referralOpen, setReferralOpen] = useState(false);
  const { groups, planLine, firstTo, kindKnown } = useBusinessMoreGroups(() => setReferralOpen(true));
  const atIndex = pathname === "/app/more" || pathname === "/app/business/more" || pathname === "/app/business/more/";
  // The first item opens by default, once the type (and so the first item) is known.
  if (atIndex && kindKnown) return <Navigate to={firstTo} replace />;
  const selected = selectedKey(groups, pathname, search);
  const planOn = under(pathname, "/app/business/more/subscription");
  return (
    <>
      <Column
        title={t("More")}
        secW={secW}
        plan={<PlanCard title="Centium Business" line={planLine} selected={planOn} onClick={() => navigate("/app/business/more/subscription")} />}
      >
        <SecondaryGroups title={t("More")} groups={groups} selected={selected} navPb={24} onSelect={(it) => (it.onClick ? it.onClick() : it.to && navigate(it.to))} />
      </Column>
      <Pane banners={banners} scrollKey={pathname + search}>
        {atIndex ? null : children}
      </Pane>
      <ReferralPopup open={referralOpen} onClose={() => setReferralOpen(false)} />
    </>
  );
};

const BusinessSettingsLayout: React.FC<{ secW: number; banners: React.ReactNode; children: React.ReactNode }> = ({ secW, banners, children }) => {
  const { t } = useApp();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  // /app/settings shows one section's pane (?section=, Appearance by default); a sub-page lights its section.
  const selected = settingsSectionFor(pathname) ?? bizSettingsSection(search);
  const groups: SecondaryGroup[] = BIZ_SETTINGS.map((s) => ({ label: s.label, items: [{ key: s.key, label: s.label, icon: s.icon }] }));
  return (
    <>
      <Column title={t("Settings")} secW={secW}>
        <SecondaryGroups
          title={t("Settings")}
          groups={groups}
          selected={selected}
          navPb={24}
          onSelect={(it) => navigate(it.key === BIZ_SETTINGS[0].key ? "/app/settings" : `/app/settings?section=${it.key}`)}
        />
      </Column>
      <Pane banners={banners} scrollKey={pathname + search}>
        {children}
      </Pane>
    </>
  );
};

/** The secondary layout's frame beside the sidebar: the column and the pane, one viewport tall. */
export const WebSecondaryHost: React.FC<{ kind: SecondaryKind; sidebarW: number; rail: boolean; banners: React.ReactNode; children: React.ReactNode }> = ({
  kind,
  sidebarW,
  rail,
  banners,
  children,
}) => {
  const secW = rail ? 300 : 360;
  return (
    <div className="flex h-[100dvh] overflow-hidden" style={{ paddingInlineStart: sidebarW }} data-web-frame={kind}>
      {kind === "business-more" ? (
        <BusinessMoreLayout secW={secW} banners={banners}>
          {children}
        </BusinessMoreLayout>
      ) : kind === "pro-more" ? (
        <ProMoreLayout secW={secW} banners={banners}>
          {children}
        </ProMoreLayout>
      ) : kind === "settings" ? (
        <AppSettingsLayout secW={secW} banners={banners}>
          {children}
        </AppSettingsLayout>
      ) : (
        <BusinessSettingsLayout secW={secW} banners={banners}>
          {children}
        </BusinessSettingsLayout>
      )}
    </div>
  );
};

