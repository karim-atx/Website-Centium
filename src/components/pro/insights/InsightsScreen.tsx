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
import { CATEGORY_LABEL, chartRangeFor, tabsForLane, type InsightsTab, type PageRange, type PanelProps } from "./panelProps";
import { ActivityPanel } from "./ActivityPanel";
import { NutritionPanel, NutritionRoster } from "./NutritionPanel";
import { VitalsPanel } from "./VitalsPanel";
import { BiomarkersPanel } from "./BiomarkersPanel";
import { NutrientAnalysis } from "./NutrientAnalysis";
import { TargetsReadOnly } from "../nutrition/Targets";

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

const TAB_LABEL: Record<InsightsTab, string> = { activity: "Activity", nutrition: "Nutrition", vitals: "Vitals", biomarkers: "Biomarkers" };
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

  // Hold a real client whenever "All patients" isn't on offer.
  useEffect(() => {
    if (!loading && !clientId && !allPatients && clients.length) onClient(clients[0].clientId);
  }, [loading, clientId, allPatients, clients, onClient]);

  const head = onBack ? (
    <DetailHead title={title} onBack={onBack} />
  ) : (
    <h1 style={{ marginBottom: 13, fontSize: textPx(19), lineHeight: 1.5, fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch }}>{title}</h1>
  );
  const tabBar = (
    <SegmentedTabs className="mb-[10px]" items={tabs.map((t) => ({ key: t, label: TAB_LABEL[t] }))} activeKey={tab} onChange={(k) => onTab(k as InsightsTab)} labelSize={11.5} />
  );

  if (loading && !clients.length)
    return (
      <div>
        {head}
        {tabBar}
        <ProCardSkeleton lines={4} height={220} />
      </div>
    );

  if (!clients.length)
    return (
      <div>
        {head}
        {tabBar}
        <EmptyState icon={Activity} title="No shared data yet" line={`Insights fill in when a ${patient ? "patient" : "client"} shares ${tab === "vitals" ? "blood pressure or activity and vitals" : tab === "nutrition" ? "their food diary" : "activity and vitals"} with you.`}>
          <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label={`Ask a ${patient ? "patient" : "client"} to share`} onClick={() => navigate(PRO_ROUTES.clients)} />
        </EmptyState>
      </div>
    );

  const range5 = (
    <div className="flex items-center" style={{ gap: 8, marginBottom: 10 }}>
      <ClientPicker clients={clients} value={clientId} onChange={(id) => onClient(id || null)} allLabel={allPatients ? "All patients" : undefined} patient={patient} />
      <RangeTabs
        value={range}
        onChange={(r) => {
          setRange(r);
          setChart({ activity: chartRangeFor(r), nutrition: chartRangeFor(r), vitals: chartRangeFor(r), biomarkers: chartRangeFor(r) });
        }}
      />
    </div>
  );

  return (
    <div>
      {head}
      {tabBar}
      {range5}
      {clientId ? (
        <ClientInsights key={clientId} lane={lane} clientId={clientId} client={clients.find((c) => c.clientId === clientId) ?? null} tab={tab} pageRange={range} chart={chart[tab]} onChart={(r) => setChart((c) => ({ ...c, [tab]: r }))} />
      ) : allPatients ? (
        <NutritionRoster clients={clients} today={localIso(new Date())} onPick={(id) => onClient(id)} />
      ) : null}
    </div>
  );
};

const ClientInsights: React.FC<{ lane: ProLane; clientId: string; client: PickerClient | null; tab: InsightsTab; pageRange: PageRange; chart: ChartRange; onChart: (r: ChartRange) => void }> = ({ lane, clientId, client, tab, pageRange, chart, onChart }) => {
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
  if (access.notConnected) return <EmptyState icon={UserX} title={lane === "clinical_overview" ? "Not one of your patients" : "Not one of your clients"} line="They may have ended the connection, or the link is out of date." />;

  const onAsk = async (c: AccessCategory) => {
    if (asked.includes(c)) return setToast(`You've already asked. It's waiting for ${firstName}.`);
    const r = await askToShare(clientId, c);
    if (r.ok) {
      setAsked((a) => [...a, c]);
      setToast(`Asked ${firstName} to share.`);
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
  const badges = TAB_CATS[tab].map((c) => ({ label: CATEGORY_LABEL[c] ?? c, on: c === "lab_results" ? access.has(c) || (access.access?.resultSharedCount ?? 0) > 0 : access.has(c) }));

  return (
    <>
      {access.offline && <OfflineLine />}
      {analysis === "targets" && tab === "nutrition" ? (
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
