import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useClientAccess, type UseClientAccess } from "../../../hooks/useClientAccess";
import { fetchClientFlags, fetchClientStages, type ClientFlags, type StageRow } from "../../../services/pro/clients";
import { fetchClientPendingHires, fetchCarePlan, type CarePlan, type ClientPendingHire } from "../../../services/pro/clientPage";
import { fetchSessions, localIso, shiftIso, type RangeSession } from "../../../services/pro/home";
import type { ProLane } from "../subtypeLanes";
import type { ProfessionalClient } from "../../../types";

/**
 * Release 3 · W3 what every tab of the client page shares, read once:
 * - the relationship row from the roster (AppContext, the same reads the old
 *   the old client detail sheet used: names, communication preferences, and the gated
 *   tiles the roster already fetches per category);
 * - the stage row (my_client_stages), the flags (client_flags);
 * - the access switches (useClientAccess);
 * - sessions with this client, 90 days back and 60 ahead (fetchSessions);
 * - Pending payment hires for this client (the header banner);
 * - Clinical overview: the care plan (the follow-up due pill and the tab).
 */
export interface ClientPageData {
  clientId: string;
  rel: ProfessionalClient | null;
  /** The roster has answered and this person isn't (or is no longer) a client. */
  missing: boolean;
  name: string;
  firstName: string;
  stage: StageRow | null;
  stageError: boolean;
  flags: ClientFlags | null;
  access: UseClientAccess;
  sessions: RangeSession[] | null;
  pendingHires: ClientPendingHire[];
  carePlan: { plan: CarePlan | null; error: boolean; offline: boolean } | null;
  today: string;
  reload: () => void;
  reloadCarePlan: () => void;
}

export function useClientPage(clientId: string, lane: ProLane | null): ClientPageData {
  const { authUserId, professionalClients, rosterLoading } = useApp();
  const rel = professionalClients.find((c) => c.clientId === clientId) ?? null;
  const access = useClientAccess(clientId);
  const today = localIso(new Date());
  const [nonce, setNonce] = useState(0);
  const [cpNonce, setCpNonce] = useState(0);
  const [stage, setStage] = useState<{ row: StageRow | null; error: boolean } | null>(null);
  const [flags, setFlags] = useState<ClientFlags | null>(null);
  const [sessions, setSessions] = useState<RangeSession[] | null>(null);
  const [pendingHires, setPendingHires] = useState<ClientPendingHire[]>([]);
  const [carePlan, setCarePlan] = useState<ClientPageData["carePlan"]>(null);

  useEffect(() => {
    if (!authUserId || !clientId) return;
    let live = true;
    void fetchClientStages().then((r) => live && setStage((prev) => (r.ok ? { row: r.data.find((x) => x.clientId === clientId) ?? null, error: false } : { row: prev?.row ?? null, error: true })));
    void fetchClientFlags(clientId).then((f) => live && setFlags(f));
    void fetchSessions(authUserId, shiftIso(today, -90), shiftIso(today, 60)).then((r) => live && r.ok && setSessions(r.data.filter((s) => s.client?.userId === clientId)));
    void fetchClientPendingHires(clientId).then((r) => live && r.ok && setPendingHires(r.data));
    return () => {
      live = false;
    };
  }, [authUserId, clientId, nonce, today]);

  useEffect(() => {
    if (!authUserId || !clientId || lane !== "clinical_overview") return;
    let live = true;
    void fetchCarePlan(authUserId, clientId).then((r) => {
      if (!live) return;
      setCarePlan((prev) => (r.ok ? { plan: r.data, error: false, offline: false } : { plan: prev?.plan ?? null, error: true, offline: r.offline }));
    });
    return () => {
      live = false;
    };
  }, [authUserId, clientId, lane, cpNonce]);

  const reload = useCallback(() => {
    setNonce((n) => n + 1);
    access.retry();
  }, [access]);
  const reloadCarePlan = useCallback(() => setCpNonce((n) => n + 1), []);

  const name = useMemo(() => (rel ? `${rel.prefix ? `${rel.prefix} ` : ""}${rel.name}` : ""), [rel]);
  return {
    clientId,
    rel,
    missing: !rosterLoading && !rel && access.notConnected,
    name,
    firstName: rel?.name.split(" ")[0] ?? "",
    stage: stage?.row ?? null,
    stageError: !!stage?.error,
    flags,
    access,
    sessions,
    pendingHires,
    carePlan,
    today,
    reload,
    reloadCarePlan,
  };
}
