import { useCallback, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Download } from "lucide-react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useBusiness } from "../../components/business-more/useBusiness";
import { ConsoleGate } from "../../components/business-console/ConsoleGate";
import { useApp } from "../../context/AppContext";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { AnalyticsContext, type CsvRow } from "./analyticsContext";
import { presetRange, rangeLine, type AnalyticsRange, type RangeKey } from "./analyticsRange";
import { CustomRangeSheet } from "./CustomRangeSheet";
import { toCsvText } from "../../utils/csv";
import { FULL_PAGE_SECTIONS, PUSHED_VIEWS, SECTION_NEED, SECTION_VIEWS, pushedFor, sectionTabs, type SectionKey } from "./sections";
import { t, tk } from "../../i18n/core";

// The Analytics shell (AN5-001 / AN4-001 rows 1-8, shared by AN1, AN3, AN4,
// AN5): title "Analytics" 27/700, subtitle, section tabs per type
// (SegmentedTabs default), range tabs (compact: This week / 4 weeks /
// 12 weeks / Custom), the range line and Export CSV. The prototype notice is
// gone (HANDOVER §5). Each section is a route
// (/app/business/analytics/<section>/…) so browser back walks the section
// pages (AN4-015 row 2). A section renders inside AnalyticsContext and feeds
// Export CSV with its own real rows.

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = toCsvText(rows, "\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "week", label: tk("This week") },
  { key: "4w", label: tk("4 weeks") },
  { key: "12w", label: tk("12 weeks") },
  { key: "custom", label: tk("Custom") },
];

export default function AnalyticsShell() {
  const { section: param } = useParams();
  const navigate = useNavigate();
  const biz = useBusiness();
  const { kind } = biz;
  const { user } = useApp();
  const access = useConsoleAccess();
  // B7: staff (non-business accounts on a team) see only the sections their
  // permissions allow (SECTION_NEED); the owner sees every tab.
  const staffView = user.accountType !== "business";
  const allowed = (key: string) => !staffView || access.meets(SECTION_NEED[key] ?? "owner");
  const tabs = sectionTabs(kind).filter((tb) => allowed(tb.key));
  const section = (param ?? (staffView ? (tabs[0]?.key ?? "overview") : "overview")) as SectionKey;
  const [range, setRange] = useState<AnalyticsRange>(() => presetRange("4w"));
  const [customOpen, setCustomOpen] = useState(false);
  const [csv, setCsv] = useState<{ name: string; rows: CsvRow[] } | null>(null);

  const setExport = useCallback((name: string, rows: CsvRow[] | null) => setCsv(rows ? { name, rows } : null), []);
  const pushed = useMemo(() => [...pushedFor(kind), ...FULL_PAGE_SECTIONS], [kind]);
  const ctx = useMemo(() => ({ range, kind, setExport, pushed }), [range, kind, setExport, pushed]);

  // The lane decides the tabs and vocabulary. A direct open of
  // /app/business/analytics/<section> waits for the business row's own type:
  // the profile's onboarding type alone can name another lane, whose tabs
  // would not hold <section> and would send it to Overview.
  const typeKnown = !biz.loading && biz.kindKnown && (!staffView || access.ready);
  // Staff without the section's permission: the no-access card (the gate
  // also covers somebody on no team at all).
  if (staffView && (access.ready || access.failed) && !allowed(section))
    return <ConsoleGate need={SECTION_NEED[section] ?? "owner"}>{null}</ConsoleGate>;
  if (!typeKnown) {
    const failed = !biz.loading && !biz.business && !!biz.error;
    return (
      <div className="pb-6" role="status" aria-label={failed ? undefined : t("Loading")}>
        <h1 className="text-[27px] leading-[40.5px] font-bold tracking-[-0.022em] text-charcoal">{t("Analytics")}</h1>
        <p className="text-[13px] leading-[19.5px] font-medium text-charcoal-faint mt-[6px]">{t("How your business is doing over time")}</p>
        {failed ? (
          <div role="alert" className="mt-[18px] flex items-center gap-3 rounded-[16px] bg-status-high-bg px-[14px] min-h-[44px]">
            <p className="flex-1 text-[12.5px] leading-[18px] text-status-high my-[12px]">{biz.error}</p>
            <button type="button" onClick={biz.reload} className="tap min-h-[44px] px-1 text-[12px] font-bold text-primary-dark">
              {t("Retry")}
            </button>
          </div>
        ) : (
          <>
            <span className="block mt-[18px] h-[56px] rounded-[16px] bg-cream-soft animate-skeleton-pulse" />
            <span className="block mt-[10px] h-[50px] rounded-[16px] bg-cream-soft animate-skeleton-pulse" />
          </>
        )}
      </div>
    );
  }
  const push = PUSHED_VIEWS[section];
  const pushedOk = !!push && pushed.includes(section);
  const fullPage = FULL_PAGE_SECTIONS.includes(section);
  if (!fullPage && !pushedOk && !tabs.some((tb) => tb.key === section)) return <Navigate to={`/app/business/analytics/${tabs[0]?.key ?? "overview"}`} replace />;
  if (fullPage) {
    const Full = SECTION_VIEWS[section];
    return (
      <AnalyticsContext.Provider value={ctx}>
        <Full />
      </AnalyticsContext.Provider>
    );
  }
  const View = pushedOk ? push.View : SECTION_VIEWS[section];
  const rangeTabs = (
    <SegmentedTabs
      className="mt-[10px]"
      size="compact"
      items={RANGE_TABS.map((tb) => ({ key: tb.key, label: t(tb.label) }))}
      activeKey={range.key}
      onChange={(k) => (k === "custom" ? setCustomOpen(true) : setRange(presetRange(k as Exclude<RangeKey, "custom">)))}
    />
  );
  const customSheet = (
    <CustomRangeSheet
      open={customOpen}
      onClose={() => setCustomOpen(false)}
      initial={range}
      onApply={(r) => {
        setRange(r);
        setCustomOpen(false);
      }}
    />
  );

  // A pushed screen (V6-28 Client outcomes): the BizTypeKit back header
  // (back 40 at −8, kicker 11/700, title 24/700 −0.02em 30, sub 12.5/18,
  // gap 10, margin-bottom 14), then the range tabs and line.
  if (pushedOk)
    return (
      <div className="pb-6">
        <div className="flex items-start gap-[10px] mb-[4px]">
          <button
            type="button"
            aria-label={t("Back")}
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/app/business/analytics/overview"))}
            className="tap shrink-0 w-[40px] h-[40px] -ms-[8px] rounded-full flex items-center justify-center text-charcoal-soft"
          >
            <ChevronLeft size={20} aria-hidden />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] leading-[16.5px] font-bold text-charcoal-faint">{t("Analytics")}</p>
            <h1 className="text-[24px] leading-[30px] font-bold tracking-[-0.02em] text-charcoal">{t(push.title)}</h1>
            <p className="text-[12.5px] leading-[18px] text-charcoal-faint mt-[2px] [text-wrap:pretty]">{t(push.sub)}</p>
          </div>
        </div>
        {rangeTabs}
        <div className="flex items-start justify-between gap-3 mt-[16px] mb-[24px]">
          <p className="text-[11px] leading-[15px] text-charcoal-faint">{rangeLine(range)}</p>
          {push.exportable && csv && (
            <button type="button" onClick={() => downloadCsv(csv.name, csv.rows)} className="tap relative shrink-0 inline-flex items-center gap-[5px] text-[11.5px] font-semibold text-primary-dark">
              <span aria-hidden className="absolute -inset-y-[15px] -inset-x-[6px]" />
              <Download size={13} aria-hidden /> {t("Export CSV")}
            </button>
          )}
        </div>
        <AnalyticsContext.Provider value={ctx}>
          <View />
        </AnalyticsContext.Provider>
        {customSheet}
      </div>
    );

  return (
    <div className="pb-6">
      <h1 className="text-[27px] leading-[40.5px] font-bold tracking-[-0.022em] text-charcoal">{t("Analytics")}</h1>
      <p className="text-[13px] leading-[19.5px] font-medium text-charcoal-faint mt-[6px]">{t("How your business is doing over time")}</p>

      <SegmentedTabs
        className="mt-[18px]"
        items={tabs.map((tb) => ({ key: tb.key, label: tb.label }))}
        activeKey={section}
        onChange={(k) => navigate(`/app/business/analytics/${k}`)}
      />
      {rangeTabs}
      <div className="flex items-start justify-between gap-3 mt-[16px] mb-[24px]">
        <p className="text-[11px] leading-[15px] text-charcoal-faint">{rangeLine(range)}</p>
        {csv && (
          <button
            type="button"
            onClick={() => downloadCsv(csv.name, csv.rows)}
            className="tap relative shrink-0 inline-flex items-center gap-[5px] text-[11.5px] font-semibold text-primary-dark"
          >
            <span aria-hidden className="absolute -inset-y-[15px] -inset-x-[6px]" />
            <Download size={13} aria-hidden /> {t("Export CSV")}
          </button>
        )}
      </div>

      <AnalyticsContext.Provider value={ctx}>
        <View />
      </AnalyticsContext.Provider>

      {customSheet}
    </div>
  );
}
