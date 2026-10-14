import { useCallback, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { SegmentedTabs } from "../../components/ui/SegmentedTabs";
import { useBusiness } from "../../components/business-more/useBusiness";
import { AnalyticsContext, type CsvRow } from "./analyticsContext";
import { presetRange, rangeLine, type AnalyticsRange, type RangeKey } from "./analyticsRange";
import { CustomRangeSheet } from "./CustomRangeSheet";
import { SECTION_VIEWS, sectionTabs, type SectionKey } from "./sections";

// The Analytics shell (AN5-001 / AN4-001 rows 1-8, shared by AN1, AN3, AN4,
// AN5): title "Analytics" 27/700, subtitle, section tabs per type
// (SegmentedTabs default), range tabs (compact: This week / 4 weeks /
// 12 weeks / Custom), the range line and Export CSV. The prototype notice is
// gone (HANDOVER §5). Each section is a route
// (/app/business/analytics/<section>/…) so browser back walks the section
// pages (AN4-015 row 2). A section renders inside AnalyticsContext and feeds
// Export CSV with its own real rows.

export function downloadCsv(filename: string, rows: CsvRow[]) {
  const csv = rows.map((r) => r.map((v) => (v === null ? "" : `"${String(v).replace(/"/g, '""')}"`)).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "week", label: "This week" },
  { key: "4w", label: "4 weeks" },
  { key: "12w", label: "12 weeks" },
  { key: "custom", label: "Custom" },
];

export default function AnalyticsShell() {
  const { section: param } = useParams();
  const navigate = useNavigate();
  const { kind, kindKnown } = useBusiness();
  const tabs = sectionTabs(kind);
  const section = (param ?? "overview") as SectionKey;
  const [range, setRange] = useState<AnalyticsRange>(() => presetRange("4w"));
  const [customOpen, setCustomOpen] = useState(false);
  const [csv, setCsv] = useState<{ name: string; rows: CsvRow[] } | null>(null);

  const setExport = useCallback((name: string, rows: CsvRow[] | null) => setCsv(rows ? { name, rows } : null), []);
  const ctx = useMemo(() => ({ range, kind, setExport }), [range, kind, setExport]);

  // The lane decides the tabs and vocabulary: wait for it (an unknown lane reads as a store).
  if (!kindKnown)
    return (
      <div className="pb-6" role="status" aria-label="Loading">
        <h1 className="text-[27px] leading-[40.5px] font-bold tracking-[-0.022em] text-charcoal">Analytics</h1>
        <p className="text-[13px] leading-[19.5px] font-medium text-charcoal-faint mt-[6px]">How your business is doing over time</p>
        <span className="block mt-[18px] h-[56px] rounded-[16px] bg-cream-soft animate-skeleton-pulse" />
        <span className="block mt-[10px] h-[50px] rounded-[16px] bg-cream-soft animate-skeleton-pulse" />
      </div>
    );
  if (!tabs.some((t) => t.key === section)) return <Navigate to="/app/business/analytics/overview" replace />;
  const View = SECTION_VIEWS[section];

  return (
    <div className="pb-6">
      <h1 className="text-[27px] leading-[40.5px] font-bold tracking-[-0.022em] text-charcoal">Analytics</h1>
      <p className="text-[13px] leading-[19.5px] font-medium text-charcoal-faint mt-[6px]">How your business is doing over time</p>

      <SegmentedTabs
        className="mt-[18px]"
        items={tabs.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={section}
        onChange={(k) => navigate(`/app/business/analytics/${k}`)}
      />
      <SegmentedTabs
        className="mt-[10px]"
        size="compact"
        items={RANGE_TABS.map((t) => ({ key: t.key, label: t.label }))}
        activeKey={range.key}
        onChange={(k) => (k === "custom" ? setCustomOpen(true) : setRange(presetRange(k as Exclude<RangeKey, "custom">)))}
      />
      <div className="flex items-start justify-between gap-3 mt-[16px] mb-[24px]">
        <p className="text-[11px] leading-[15px] text-charcoal-faint">{rangeLine(range)}</p>
        {csv && (
          <button
            type="button"
            onClick={() => downloadCsv(csv.name, csv.rows)}
            className="tap relative shrink-0 inline-flex items-center gap-[5px] text-[11.5px] font-semibold text-primary-dark"
          >
            <span aria-hidden className="absolute -inset-y-[15px] -inset-x-[6px]" />
            <Download size={13} aria-hidden /> Export CSV
          </button>
        )}
      </div>

      <AnalyticsContext.Provider value={ctx}>
        <View />
      </AnalyticsContext.Provider>

      <CustomRangeSheet
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        initial={range}
        onApply={(r) => {
          setRange(r);
          setCustomOpen(false);
        }}
      />
    </div>
  );
}
