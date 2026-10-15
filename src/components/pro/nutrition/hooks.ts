// Release 3 · W5 the NU screens' shared hooks (apart from the components so
// Fast refresh keeps working).

import { useEffect, useMemo, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useIsDark } from "../../../hooks/useIsDark";
import { fetchDietaryNeeds, type DietaryNeeds } from "../../../services/pro/clientPage";
import { fetchClientStages, type StageRow } from "../../../services/pro/clients";
import type { UseClientAccess } from "../../../hooks/useClientAccess";
import type { ProLane } from "../subtypeLanes";

/** The client's dietary needs (structured data), loaded once per client. */
export function useDietaryNeeds(clientId: string | null, access: UseClientAccess | null): { needs: DietaryNeeds | null; shared: boolean; allergiesShared: boolean; loading: boolean } {
  const allergiesShared = !!access?.has("allergies_dietary");
  const shared = allergiesShared || !!access?.has("food_diary");
  const [needs, setNeeds] = useState<{ key: string; data: DietaryNeeds | null } | null>(null);
  const key = clientId ? `${clientId}|${allergiesShared}` : "";
  useEffect(() => {
    if (!clientId || !shared) return;
    let live = true;
    void fetchDietaryNeeds(clientId, allergiesShared).then((r) => live && setNeeds({ key: `${clientId}|${allergiesShared}`, data: r.ok ? r.data : null }));
    return () => {
      live = false;
    };
  }, [clientId, shared, allergiesShared]);
  const mine = needs?.key === key ? needs : null;
  return { needs: mine?.data ?? null, shared, allergiesShared, loading: shared && !mine };
}

export interface NuClient {
  clientId: string;
  name: string;
  firstName: string;
  avatarUrl: string | null;
  nutritionCoaching: boolean;
}

/**
 * The clients meal plans can be built for: everyone for Nutrition; for Full
 * coaching only clients with "Include nutrition coaching" on (the database
 * enforces it: ATX12). The list keeps its identity between renders.
 */
export function useNuRoster(lane: ProLane | null): { clients: NuClient[] | null; error: boolean; retry: () => void } {
  const { professionalClients, rosterLoading } = useApp();
  const [stages, setStages] = useState<{ rows: StageRow[] | null; error: boolean } | null>(null);
  const [nonce, setNonce] = useState(0);
  useEffect(() => {
    if (!lane) return;
    let live = true;
    void fetchClientStages().then((r) => live && setStages(r.ok ? { rows: r.data, error: false } : { rows: null, error: true }));
    return () => {
      live = false;
    };
  }, [lane, nonce]);
  const clients = useMemo(() => {
    if (!stages?.rows || rosterLoading) return null;
    const byId = new Map(stages.rows.map((s) => [s.clientId, s]));
    return professionalClients
      .filter((c) => !!c.clientId && byId.has(c.clientId))
      .map((c) => ({
        clientId: c.clientId!,
        name: `${c.prefix ? `${c.prefix} ` : ""}${c.name}`,
        firstName: c.name.split(" ")[0] || c.name,
        avatarUrl: c.avatarUrl ?? null,
        nutritionCoaching: byId.get(c.clientId!)!.nutritionCoaching,
      }))
      .filter((c) => lane === "nutrition" || c.nutritionCoaching)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [stages, rosterLoading, professionalClients, lane]);
  const retry = useMemo(() => () => setNonce((n) => n + 1), []);
  return { clients, error: !!stages?.error, retry };
}

export function useTileBg(): string {
  return useIsDark() ? "rgba(174,161,220,0.14)" : "#F0EDF9";
}
