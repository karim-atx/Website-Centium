import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { fetchMyLane } from "../services/pro/access";
import { laneForType, type ProLane } from "../components/pro/subtypeLanes";
import type { ProfessionalSubtype } from "../types";

/**
 * Release 3 · the signed-in professional's lane (Full coaching, Nutrition or
 * Clinical overview). Every professional screen switches on it, using the
 * capability matrix (HANDOVER d): hidden means not rendered and not fetched.
 *
 * Two sources, one answer. The first render uses the TypeScript mirror of
 * subtype_for_type on the profile's professional_subtype, so the navbar never
 * waits on a round trip; the database's own derived lane,
 * my_professional_subtype() (DB-1), then confirms it once per account and
 * wins if they ever disagree. A failed read keeps the mirror's answer: the
 * mapping is pure, and the database enforces access either way.
 *
 * `lane` is null for every account that isn't a professional.
 */
export interface ProSubtype {
  lane: ProLane | null;
  type: ProfessionalSubtype | null;
  /** True until the database has answered once for this account. */
  confirming: boolean;
}

// One read per account, shared by every mounted caller (the navbar, the
// sidebar and the page all ask at once).
const confirmed = new Map<string, ProLane | null>();
const inFlight = new Map<string, Promise<void>>();
const listeners = new Set<() => void>();

function confirm(userId: string): Promise<void> {
  const running = inFlight.get(userId);
  if (running) return running;
  const p = fetchMyLane().then((r) => {
    inFlight.delete(userId);
    if (r.ok) confirmed.set(userId, r.data);
    listeners.forEach((l) => l());
  });
  inFlight.set(userId, p);
  return p;
}

export function useProSubtype(): ProSubtype {
  const { user, authUserId } = useApp();
  const isPro = user.accountType === "professional";
  const [, bump] = useState(0);

  useEffect(() => {
    if (!isPro || !authUserId || confirmed.has(authUserId)) return;
    const l = () => bump((n) => n + 1);
    listeners.add(l);
    void confirm(authUserId);
    return () => {
      listeners.delete(l);
    };
  }, [isPro, authUserId]);

  if (!isPro) return { lane: null, type: null, confirming: false };
  const type = user.professionalSubtype ?? null;
  const fromDb = authUserId ? confirmed.get(authUserId) : undefined;
  return {
    lane: fromDb ?? laneForType(type),
    type,
    confirming: !!authUserId && !confirmed.has(authUserId),
  };
}
