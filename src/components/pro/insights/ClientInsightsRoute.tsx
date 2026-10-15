import React, { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { proClientPath, type ProLane } from "../subtypeLanes";
import { InsightsScreen } from "./InsightsScreen";
import { tabsForLane, type InsightsTab } from "./panelProps";
import type { PickerClient } from "./parts";

/**
 * Release 3 · W5 "Client insights" (NU14 / v2 / v3; the same Insights for
 * Full coaching), inside the client page at /app/pro/clients/:id/insights
 * (?tab=activity|nutrition|vitals|biomarkers). The picker switches to
 * another client's insights; back returns to the client's Progress tab.
 */
export const ClientInsightsRoute: React.FC<{ clientId: string; lane: ProLane }> = ({ clientId, lane }) => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { professionalClients, rosterLoading } = useApp();
  const clients = useMemo<PickerClient[]>(
    () =>
      professionalClients
        .filter((c): c is typeof c & { clientId: string } => !!c.clientId)
        .map((c) => ({ clientId: c.clientId, name: `${c.prefix ? `${c.prefix} ` : ""}${c.name}`, avatarUrl: c.avatarUrl ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [professionalClients]
  );
  const tabs = tabsForLane(lane);
  const asked = params.get("tab") as InsightsTab | null;
  const tab = asked && tabs.includes(asked) ? asked : tabs[0];
  const go = (id: string, t: InsightsTab) => navigate(`${proClientPath(id, "insights")}?tab=${t}`, { replace: true });
  return (
    <InsightsScreen
      lane={lane}
      title="Client insights"
      clients={clients}
      clientId={clientId}
      onClient={(id) => id && go(id, tab)}
      tab={tab}
      onTab={(t) => go(clientId, t)}
      onBack={() => navigate(proClientPath(clientId, "progress"))}
      loading={rosterLoading}
    />
  );
};
