import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Send, UserX } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useClientAccess } from "../../../hooks/useClientAccess";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { Toast } from "../../ui/Toast";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { EmptyState } from "../EmptyState";
import { OfflineLine, ProCardSkeleton, ProError } from "../states";
import { PRO_ROUTES, proClientPath, type ProLane } from "../subtypeLanes";
import { askToShare, fetchPendingAccessRequests } from "../../../services/pro/clientPage";
import { startThread } from "../../../services/messaging";
import { localIso } from "../../../services/pro/home";
import type { AccessCategory } from "../../../services/pro/access";
import type { ChartRange } from "./insightsModel";
import { ClientPicker, DetailHead, RangeTabs, SharedBadges, type PickerClient } from "./parts";
import { GroupsOpenContext } from "./groupsOpen";
import { CATEGORY_LABEL, chartRangeFor, tabsForLane, type InsightsTab, type PageRange, type PanelProps } from "./panelProps";
import { ActivityPanel } from "./ActivityPanel";
import { NutritionPanel, NutritionRoster } from "./NutritionPanel";
import { VitalsPanel } from "./VitalsPanel";
import { BiomarkersPanel } from "./BiomarkersPanel";
import { NutrientAnalysis } from "./NutrientAnalysis";
import { TargetsReadOnly } from "../nutrition/Targets";
import { t, tk } from "../../../i18n/core";
import { useIsWeb, useWebLayout } from "../../web/useWebLayout";
import { ProPageBodyWeb, ProPageHeaderWeb } from "../web/ProPageWeb";
import { ClientTabBodyWeb, ClientTabsWeb } from "../web/ClientPageWeb";

/**
 * Release 3 · W5 the Insights screen (TR9 v3/v4/v5, TR16 v3, NU10, NU14 /
 * v2 / v3; source gen/r10.js insHead10 + badge10, gen/r11.js insights11,
 * gen/r13.js asNT13 "Client insights"):
 * - title (19 / 700 -0.03em): "Insights" (Clinical overview's navbar tab)
 *   or "Client insights" (inside the client page, Full coaching and
 *   Nutrition; with the back chevron);
 * - tabs Activity, Nutrition, Vitals, Biomarkers (11.5); Full coaching has
 *   no Biomarkers tab (HANDOVER k: lab results hidden for Full coaching);
 * - the patient picker (40 high, real clients only) and Today, Week,
 *   Month; Clinical overview's Nutrition tab adds "All patients" (NU10);
 * - the "shared" badges for the tab's switches, then the tab's panel.
 * Data only from what the client shares with this professional
 * (useClientAccess; each panel reads only its switches).
 */

const TAB_LABEL: Record<InsightsTab, string> = { activity: tk("Activity"), nutrition: tk("Nutrition"), vitals: tk("Vitals"), biomarkers: tk("Biomarkers") };

/** The empty roster's line, per lane and tab (whole sentences, so each reads in Arabic). */
const emptyLine = (patient: boolean, tab: InsightsTab): string =>
  patient
    ? tab === "vitals"
      ? t("Insights fill in when a patient shares blood pressure or activity and vitals with you.")
      : tab === "nutrition"
        ? t("Insights fill in when a patient shares their food diary with you.")
        : t("Insights fill in when a patient shares activity and vitals with you.")
    : tab === "vitals"
      ? t("Insights fill in when a client shares blood pressure or activity and vitals with you.")
      : tab === "nutrition"
        ? t("Insights fill in when a client shares their food diary with you.")
        : t("Insights fill in when a client shares activity and vitals with you.");
const TAB_CATS: Record<InsightsTab, AccessCategory[]> = {
  activity: ["health_metrics", "workout_activity"],
  nutrition: ["food_diary"],
  vitals: ["blood_pressure", "health_metrics", "weight", "body_measurements"],
  biomarkers: ["lab_results"],
};


export interface InsightsScreenProps {
  lane: ProLane;
  title: "Insights" | "Client insights";
  clients: PickerClient[];
  /** null: no one chosen ("All patients" on Clinical overview's Nutrition tab). */
  clientId: string | null;
  onClient: (id: string | null) => void;
  tab: InsightsTab;
  onTab: (t: InsightsTab) => void;
  onBack?: () => void;
  /** The roster is still loading. */
  loading?: boolean;
}

export const InsightsScreen: React.FC<InsightsScreenProps> = ({ lane, title, clients, clientId, onClient, tab, onTab, onBack, loading }) => {
  const navigate = useNavigate();
  const [range, setRange] = useState<PageRange>("month");
  const [chart, setChart] = useState<Record<InsightsTab, ChartRange>>({ activity: "M", nutrition: "M", vitals: "M", biomarkers: "M" });
  const patient = lane === "clinical_overview";
  const tabs = tabsForLane(lane);
  const allPatients = patient && tab === "nutrition";
  // Website viewport (WP-CO-IN): the Insights page (not the client page's Client insights, which keeps its column) gets the page header, the equal tabs and its cards across the page.
  const web = useIsWeb() && !onBack;
  const { rail } = useWebLayout();

  // Hold a real client whenever "All patients" isn't on offer.
  useEffect(() => {
    if (!loading && !clientId && !allPatients && clients.length) onClient(clients[0].clientId);
  }, [loading, clientId, allPatients, clients, onClient]);

  const setPageRange = (r: PageRange) => {
    setRange(r);
    setChart({ activity: chartRangeFor(r), nutrition: chartRangeFor(r), vitals: chartRangeFor(r), biomarkers: chartRangeFor(r) });
  };
  const head = web ? (
    <ProPageHeaderWeb
      title={t(title)}
      actions={
        clients.length ? (
          <>
            <ClientPicker web={{ width: rail ? 220 : 280 }} clients={clients} value={clientId} onChange={(id) => onClient(id || null)} allLabel={allPatients ? t("All patients") : undefined} patient={patient} />
            <RangeTabs web={{ width: rail ? 240 : 300 }} value={range} onChange={setPageRange} />
          </>
        ) : undefined
      }
    />
  ) : onBack ? (
    <DetailHead title={t(title)} onBack={onBack} />
  ) : (
    <h1 style={{ marginBottom: 13, fontSize: textPx(19), lineHeight: 1.5, fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch }}>{t(title)}</h1>
  );
  const tabBar = web ? (
    <ClientTabsWeb label={t(title)} items={tabs.map((k) => ({ key: k, label: t(TAB_LABEL[k]) }))} active={tab} onChange={(k) => onTab(k as InsightsTab)} />
  ) : (
    <SegmentedTabs className="mb-[10px]" items={tabs.map((k) => ({ key: k, label: t(TAB_LABEL[k]) }))} activeKey={tab} onChange={(k) => onTab(k as InsightsTab)} labelSize={11.5} />
  );

  // The page around the content: the same elements on mobile; on web the header, then the padded body.
  const frame = (children: React.ReactNode) =>
    web ? (
      <div>
        {head}
        <ProPageBodyWeb>
          {/* WP-CO-IN chips (Vitals, Results): one row of equal 36 cells, 8 apart, 15/24, ellipsis (Insights Web v2 chipN). */}
          <style>{".wpin-an .wpcl-tab>:nth-child(-n+3),.wpin-tg .wpcl-tab>:first-child{column-span:all}[data-pro-web=page] [role=tablist].scroll-row{display:grid!important;grid-auto-flow:column;grid-auto-columns:minmax(0,1fr)}[data-pro-web=page] [role=tablist].scroll-row>button{min-width:0;padding:0 8px!important;overflow:hidden;text-overflow:ellipsis}"}</style>
          {tabBar}
          {children}
        </ProPageBodyWeb>
      </div>
    ) : (
      <div>
        {head}
        {tabBar}
        {children}
      </div>
    );

  if (loading && !clients.length) return frame(<ProCardSkeleton lines={4} height={220} />);

  if (!clients.length)
    return frame(
        <EmptyState icon={Activity} title={t("No shared data yet")} line={emptyLine(patient, tab)}>
          <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label={patient ? t("Ask a patient to share") : t("Ask a client to share")} onClick={() => navigate(PRO_ROUTES.clients)} />
        </EmptyState>
    );

  const range5 = (
    <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
      <ClientPicker clients={clients} value={clientId} onChange={(id) => onClient(id || null)} allLabel={allPatients ? t("All patients") : undefined} patient={patient} />
      <RangeTabs value={range} onChange={setPageRange} />
    </div>
  );

  const body = clientId ? (
    <ClientInsights key={clientId} web={web} lane={lane} clientId={clientId} client={clients.find((c) => c.clientId === clientId) ?? null} tab={tab} pageRange={range} chart={chart[tab]} onChart={(r) => setChart((c) => ({ ...c, [tab]: r }))} />
  ) : allPatients ? (
    // Website viewport (WP-CO-IN.5): the roster is one list card across the page.
    web ? (
      <div style={{ columnSpan: "all", display: "block" }}>
        <NutritionRoster clients={clients} today={localIso(new Date())} onPick={(id) => onClient(id)} />
      </div>
    ) : (
      <NutritionRoster clients={clients} today={localIso(new Date())} onPick={(id) => onClient(id)} />
    )
  ) : null;
  return frame(
    <>
      {!web && range5}
      {web ? <ClientTabBodyWeb columns={2}>{body}</ClientTabBodyWeb> : body}
    </>
  );
};

const ClientInsights: React.FC<{ web?: boolean; lane: ProLane; clientId: string; client: PickerClient | null; tab: InsightsTab; pageRange: PageRange; chart: ChartRange; onChart: (r: ChartRange) => void }> = ({ web, lane, clientId, client, tab, pageRange, chart, onChart }) => {
  const navigate = useNavigate();
  const { authUserId } = useApp();
  const access = useClientAccess(clientId);
  const [asked, setAsked] = useState<AccessCategory[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<"analysis" | "targets" | null>(null);
  const name = client?.name ?? "";
  const firstName = name.split(" ")[0] ?? "";

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void fetchPendingAccessRequests(authUserId, clientId).then((c) => live && setAsked(c));
    return () => {
      live = false;
    };
  }, [authUserId, clientId]);
  useEffect(() => setAnalysis(null), [tab]);

  if (access.loading) return <ProCardSkeleton lines={4} height={220} />;
  if (access.error && !access.access) return <ProError onRetry={access.retry} />;
  if (access.notConnected) return <EmptyState icon={UserX} title={lane === "clinical_overview" ? t("Not one of your patients") : t("Not one of your clients")} line={t("They may have ended the connection, or the link is out of date.")} />;

  const onAsk = async (c: AccessCategory) => {
    if (asked.includes(c)) return setToast(t("You've already asked. It's waiting for {firstName}.", { firstName }));
    const r = await askToShare(clientId, c);
    if (r.ok) {
      setAsked((a) => [...a, c]);
      setToast(t("Asked {firstName} to share.", { firstName }));
    } else setToast(r.message);
  };
  const onMessage = async () => {
    const r = await startThread(clientId);
    if (r.ok) navigate("/app/messages", { state: { threadId: r.threadId } });
    else setToast(r.message);
  };
  const props: PanelProps = {
    clientId,
    firstName,
    name,
    lane,
    access,
    range: chart,
    onRange: onChart,
    pageRange,
    today: localIso(new Date()),
    asked,
    onAsk: (c) => void onAsk(c),
    openClient: (t) => navigate(proClientPath(clientId, t)),
  };
  const badges = TAB_CATS[tab].map((c) => ({ label: t(CATEGORY_LABEL[c] ?? c), on: c === "lab_results" ? access.has(c) || (access.access?.resultSharedCount ?? 0) > 0 : access.has(c) }));

  return (
    <>
      {access.offline && <OfflineLine />}
      {web && analysis === "targets" && tab === "nutrition" ? (
        // Website viewport (WP-CO-IN.7): the read-only targets across the page, their cards in two columns under the head.
        <div className="wpin-tg" style={{ columnSpan: "all", display: "block" }}>
          <ClientTabBodyWeb columns={2}>
            <TargetsReadOnly clientId={clientId} firstName={firstName} clientName={name} showHead onBack={() => setAnalysis(null)} />
          </ClientTabBodyWeb>
        </div>
      ) : web && analysis && tab === "nutrition" ? (
        // Website viewport (WP-CO-IN.6): the analysis across the page; its head, tabs and range span both columns and every Group is open beside the main card.
        <div className="wpin-an" style={{ columnSpan: "all", display: "block" }}>
          <GroupsOpenContext.Provider value>
            <ClientTabBodyWeb columns={2}>
              <NutrientAnalysis clientId={clientId} lane={lane} onBack={() => setAnalysis(null)} />
            </ClientTabBodyWeb>
          </GroupsOpenContext.Provider>
        </div>
      ) : web && tab === "vitals" ? (
        // Website viewport (WP-CO-IN.8): the chips and one full-width chart per view, its stat boxes and insight under it.
        <div style={{ columnSpan: "all", display: "block" }}>
          <SharedBadges items={badges} />
          <VitalsPanel {...props} />
        </div>
      ) : web && tab === "biomarkers" && lane !== "full_coaching" ? (
        // Website viewport (WP-CO-IN.4): Tests and All results beside the selected result's chart, across the page.
        <div style={{ columnSpan: "all", display: "block" }}>
          <SharedBadges items={badges} />
          <BiomarkersPanel {...props} onMessage={() => void onMessage()} />
        </div>
      ) : analysis === "targets" && tab === "nutrition" ? (
        // NU8 v3 Clinical overview: the targets read only.
        <TargetsReadOnly clientId={clientId} firstName={firstName} clientName={name} showHead onBack={() => setAnalysis(null)} />
      ) : analysis && tab === "nutrition" ? (
        <NutrientAnalysis clientId={clientId} lane={lane} onBack={() => setAnalysis(null)} />
      ) : (
        <>
          <SharedBadges items={badges} />
          {tab === "activity" && <ActivityPanel {...props} />}
          {tab === "nutrition" && <NutritionPanel {...props} onAnalysis={() => setAnalysis("analysis")} onTargets={lane === "clinical_overview" ? () => setAnalysis("targets") : undefined} />}
          {tab === "vitals" && <VitalsPanel {...props} />}
          {tab === "biomarkers" && lane !== "full_coaching" && <BiomarkersPanel {...props} onMessage={() => void onMessage()} />}
        </>
      )}
      <Toast open={!!toast} message={toast ?? ""} onExpire={() => setToast(null)} />
    </>
  );
};
