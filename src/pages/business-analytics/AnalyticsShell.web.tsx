import React, { useCallback, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { Download } from "lucide-react";
import { useBusiness } from "../../components/business-more/useBusiness";
import { ConsoleGate } from "../../components/business-console/ConsoleGate";
import { useApp } from "../../context/AppContext";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { useWebLayout } from "../../components/web/useWebLayout";
import { AnalyticsContext, type CsvRow } from "./analyticsContext";
import { presetRange, rangeLine, type AnalyticsRange, type RangeKey } from "./analyticsRange";
import { CustomRangeSheet } from "./CustomRangeSheet";
import { downloadCsv } from "./AnalyticsShell";
import { FULL_PAGE_SECTIONS, PUSHED_VIEWS, SECTION_NEED, SECTION_VIEWS, pushedFor, sectionTabs, type SectionKey } from "./sections";
import { OverviewWeb } from "./overview/OverviewSection.web";
import { MembersWeb } from "./members/MembersSection.web";
import { WebSegmented } from "./AnalyticsParts.web";
import { t, tk } from "../../i18n/core";

// Website viewport v1 · WB-AN Analytics (WB-AN Analytics Web v5), from 1024px
// wide. The page header (64: "Analytics", its line, Export CSV 40 at the
// end), then in the 1280 content (padding 32) the section tabs and the range
// tabs (segmented, 40, full width), the range line beside the range tabs
// (7 + 5) on Overview, and the section:
// - Overview (WB-AN.1): Headline numbers and More insights beside Live now.
// - Members (WB-AN.3): list-detail, the sections in 4 columns and the page in
//   8 (3 + 5 on the rail); Client outcomes (/analytics/outcomes) is one of
//   its rows on the web.
// Sections without a web design (Classes, Team, Products for a store, and the
// full-page Reputation and Revenue) show their mobile view in a centred 430
// column under the tabs. The range, the custom range sheet (a 440 side sheet
// from 1024), Export CSV, the staff permissions and the routes are the mobile
// AnalyticsShell's, unchanged.

const RANGE_TABS: { key: RangeKey; label: string }[] = [
  { key: "week", label: tk("This week") },
  { key: "4w", label: tk("4 weeks") },
  { key: "12w", label: tk("12 weeks") },
  { key: "custom", label: tk("Custom") },
];

const MobileColumn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-web-frame="mobile" className="max-w-[430px] mx-auto px-4 pt-6 pb-12">
    {children}
  </div>
);

export default function AnalyticsShellWeb() {
  const { section: param } = useParams();
  const navigate = useNavigate();
  const biz = useBusiness();
  const { kind } = biz;
  const { user } = useApp();
  const access = useConsoleAccess();
  const { rail } = useWebLayout();
  const staffView = user.accountType !== "business";
  const allowed = (key: string) => !staffView || access.meets(SECTION_NEED[key] ?? "owner");
  const tabs = sectionTabs(kind).filter((tb) => allowed(tb.key));
  const section = (param ?? (staffView ? (tabs[0]?.key ?? "overview") : "overview")) as SectionKey | "outcomes";
  const [range, setRange] = useState<AnalyticsRange>(() => presetRange("4w"));
  const [customOpen, setCustomOpen] = useState(false);
  const [csv, setCsv] = useState<{ name: string; rows: CsvRow[] } | null>(null);
  const setExport = useCallback((name: string, rows: CsvRow[] | null) => setCsv(rows ? { name, rows } : null), []);
  const pushed = useMemo(() => [...pushedFor(kind), ...FULL_PAGE_SECTIONS], [kind]);
  const ctx = useMemo(() => ({ range, kind, setExport, pushed }), [range, kind, setExport, pushed]);

  const typeKnown = !biz.loading && biz.kindKnown && (!staffView || access.ready);
  if (staffView && (access.ready || access.failed) && !allowed(section)) return <ConsoleGate need={SECTION_NEED[section] ?? "owner"}>{null}</ConsoleGate>;

  // Client outcomes is a row of the Members list-detail on the web (a pushed screen on mobile).
  const outcomes = section === "outcomes" && pushed.includes("outcomes") && kind !== "store";
  const fullPage = FULL_PAGE_SECTIONS.includes(section as SectionKey);
  const known = typeKnown;
  if (known && !fullPage && !outcomes && !tabs.some((tb) => tb.key === section)) {
    const push = PUSHED_VIEWS[section];
    if (!(push && pushed.includes(section))) return <Navigate to={`/app/business/analytics/${tabs[0]?.key ?? "overview"}`} replace />;
  }

  // Reputation and Revenue draw their own page (own back and range): their mobile page, centred.
  if (known && fullPage) {
    const Full = SECTION_VIEWS[section as SectionKey];
    return (
      <MobileColumn>
        <AnalyticsContext.Provider value={ctx}>
          <Full />
        </AnalyticsContext.Provider>
      </MobileColumn>
    );
  }

  const activeTab = outcomes ? "members" : section;
  const isOverview = activeTab === "overview";
  const isMembers = activeTab === "members" && kind !== "store";
  const webSection = isOverview || isMembers;
  const View = !webSection && known ? (PUSHED_VIEWS[section] && pushed.includes(section) ? PUSHED_VIEWS[section].View : SECTION_VIEWS[section as SectionKey]) : null;

  return (
    <div data-analytics="web" style={{ color: "#241F1B", display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      <header style={{ height: 64, flex: "none", boxSizing: "border-box", display: "flex", alignItems: "center", gap: 12, padding: "0 32px", borderBottom: "1px solid rgba(36,31,27,0.06)" }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "baseline", gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 28, lineHeight: "36px", fontWeight: 700, letterSpacing: "-0.022em", whiteSpace: "nowrap" }}>{t("Analytics")}</h1>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 600, color: "#8C8378", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", minWidth: 0 }}>{t("How your business is doing over time")}</p>
        </div>
        {csv && (
          <button
            type="button"
            data-export-csv
            onClick={() => downloadCsv(csv.name, csv.rows)}
            className="hover:!bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, height: 40, padding: "0 14px", borderRadius: 12, fontSize: 15, lineHeight: "24px", fontWeight: 600, color: "#7D6BB5", whiteSpace: "nowrap", background: "transparent", border: 0, cursor: "pointer", flex: "none" }}
          >
            <Download size={18} aria-hidden />
            {t("Export CSV")}
          </button>
        )}
      </header>

      <div style={{ flex: "none", height: isMembers ? "calc(100dvh - 64px)" : "auto", minHeight: isMembers ? 560 : 0, boxSizing: "border-box" }}>
        <div style={{ maxWidth: 1280, height: "100%", boxSizing: "border-box", padding: 32, display: "flex", flexDirection: "column" }}>
          {!known ? (
            <div role="status" aria-label={t("Loading")} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {!biz.loading && !biz.business && biz.error ? (
                <div role="alert" style={{ display: "flex", alignItems: "center", gap: 12, borderRadius: 16, background: "#FBE7E4", padding: "0 16px", minHeight: 44 }}>
                  <p style={{ flex: 1, margin: "12px 0", fontSize: 15, lineHeight: "22px", color: "#C0392B" }}>{biz.error}</p>
                  <button type="button" onClick={biz.reload} style={{ minHeight: 44, padding: "0 8px", fontSize: 15, fontWeight: 700, color: "#7D6BB5", background: "none", border: 0, cursor: "pointer" }}>
                    {t("Retry")}
                  </button>
                </div>
              ) : (
                <>
                  <span className="block animate-skeleton-pulse" style={{ height: 40, borderRadius: 14, background: "#F3F3FD" }} />
                  <span className="block animate-skeleton-pulse" style={{ height: 40, borderRadius: 14, background: "#F3F3FD" }} />
                </>
              )}
            </div>
          ) : (
            <>
              <WebSegmented label={t("Analytics sections")} items={tabs.map((tb) => ({ key: tb.key, label: tb.label }))} active={activeTab} onChange={(k) => navigate(`/app/business/analytics/${k}`)} />
              <div style={{ flex: "none", display: "grid", gridTemplateColumns: isMembers ? "minmax(0,1fr)" : "minmax(0,7fr) minmax(0,5fr)", gap: 24, alignItems: "center", marginTop: 16 }}>
                <WebSegmented
                  label={t("Range")}
                  items={RANGE_TABS.map((tb) => ({ key: tb.key, label: t(tb.label) }))}
                  active={range.key}
                  onChange={(k) => (k === "custom" ? setCustomOpen(true) : setRange(presetRange(k as Exclude<RangeKey, "custom">)))}
                />
                {!isMembers && (
                  <p data-range-line style={{ margin: 0, textAlign: "end", fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
                    {rangeLine(range)}
                  </p>
                )}
              </div>
              <AnalyticsContext.Provider value={ctx}>
                {isOverview && <OverviewWeb rail={rail} />}
                {isMembers && <MembersWeb rail={rail} outcomes={outcomes} />}
                {View && (
                  <div style={{ marginTop: 24 }}>
                    <MobileColumn>
                      <View />
                    </MobileColumn>
                  </div>
                )}
              </AnalyticsContext.Provider>
            </>
          )}
        </div>
      </div>

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
