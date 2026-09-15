import { useEffect, useState } from "react";
import { useApp } from "../context/AppContext";
import { fetchMyTeam, type TeamMember } from "../services/business-team";

// The business's affiliated professionals, for the five screens that show them.
//
// A HOOK RATHER THAN THE SAME EFFECT FIVE TIMES. Every one of these screens
// wants the same thing — the team, hydrated on launch, not blanked by a failed
// read — and differs only in what it renders. Five copies would drift, and the
// first thing to drift would be the readiness gate: a read fired before
// profileReady returns nothing and looks exactly like an empty team.
//
// WHAT EACH CALLER ACTUALLY NEEDS, checked rather than assumed:
//   BusinessEmployeesTab  name, and the id to remove by
//   BusinessAnalyticsTab  the count, nothing else
//   BusinessClassesTab    id + name, for the "Run by" picker
//   BusinessCalendarTab   id + name, for the same picker and a lookup
//   BusinessMessagesTab   id + name, for the thread list
// None reads the subtype, which is just as well: a business cannot get it —
// see the note in services/business-team.

export interface UseBusinessTeam {
  team: TeamMember[];
  /** business_profiles.id for this account, or null if it has no row yet. */
  businessId: string | null;
  error: string | null;
}

export function useBusinessTeam(): UseBusinessTeam {
  const { authUserId, profileReady } = useApp();
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void (async () => {
      const result = await fetchMyTeam(authUserId);
      if (cancelled) return;
      if (!result.ok) {
        // Keep whatever is on screen. An empty list here is indistinguishable
        // from "everybody left", which is the wrong thing to show a business
        // because their connection dropped.
        setError(result.message);
        return;
      }
      setError(null);
      setBusinessId(result.businessId);
      setTeam(result.members);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady]);

  return { team, businessId, error };
}
