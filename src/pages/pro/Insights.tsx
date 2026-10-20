import { useCallback, useMemo } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useProSubtype } from "../../hooks/useProSubtype";
import { INSIGHTS_TABS, pickTab, PRO_ROUTES } from "../../components/pro/subtypeLanes";
import { InsightsScreen } from "../../components/pro/insights/InsightsScreen";
import type { InsightsTab } from "../../components/pro/insights/panelProps";
import type { PickerClient } from "../../components/pro/insights/parts";

/**
 * Release 3 · Insights (/app/pro/insights/:tab, Clinical overview's navbar
 * tab; TR9 v3/v4/v5, TR16 v3, NU10). The patient is chosen with the picker
 * at the top (TR9 / TR16 frames), from the real roster only, and kept in
 * `?client=` so a link from the client page's Trends lands on that patient.
 * The other lanes see the same screen inside the client page ("Client
 * insights", /app/pro/clients/:id/insights).
 */
export default function Insights() {
  const { tab } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { lane } = useProSubtype();
  const { professionalClients, rosterLoading } = useApp();
  const clients = useMemo<PickerClient[]>(
    () =>
      professionalClients
        .filter((c): c is typeof c & { clientId: string } => !!c.clientId)
        .map((c) => ({ clientId: c.clientId, name: `${c.prefix ? `${c.prefix} ` : ""}${c.name}`, avatarUrl: c.avatarUrl ?? null }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [professionalClients]
  );
  const asked = params.get("client");
  const clientId = asked && (rosterLoading || clients.some((c) => c.clientId === asked)) ? asked : null;
  const onClient = useCallback(
    (id: string | null) =>
      setParams(
        (p) => {
          const next = new URLSearchParams(p);
          if (id) next.set("client", id);
          else next.delete("client");
          return next;
        },
        { replace: true }
      ),
    [setParams]
  );

  if (!lane) return null;
  const current = pickTab(INSIGHTS_TABS, tab);
  if (tab !== undefined && tab !== current) return <Navigate to={`${PRO_ROUTES.insights}/${current}`} replace />;

  return (
    <InsightsScreen
      lane={lane}
      title="Insights"
      clients={clients}
      clientId={clientId}
      onClient={onClient}
      tab={current as InsightsTab}
      onTab={(t) => navigate({ pathname: `${PRO_ROUTES.insights}/${t}`, search: params.toString() ? `?${params.toString()}` : "" }, { replace: true })}
      loading={rosterLoading}
    />
  );
}
