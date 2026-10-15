import { useCallback, useEffect, useMemo, useState } from "react";
import type { Routine } from "../../types";
import { fetchProgrammes, type ProgrammeData } from "../../services/routines/programmes";
import {
  coachRoutineMeta,
  endedOn,
  nextSession,
  programmeCountLine,
  splitAssignments,
  wasUpdatedByCoach,
  type ProgrammeAssignment,
} from "../../services/routines/programmeLogic";
import { fetchConnectedProfessional, professionalRole } from "../../services/connected-professional";

// Release 3 · W7 (CU1): the model behind Routines › "From your coach".

export interface CoachInfo {
  name: string;
  role: string | null;
  avatarUrl: string | null;
}

export interface CoachProgramme {
  assignment: ProgrammeAssignment;
  name: string;
  routine: Routine;
  countLine: string;
  meta: string;
  today: boolean;
  updated: boolean;
}

export interface CoachGroup {
  professionalId: string;
  programmes: CoachProgramme[];
}

export interface PastProgramme {
  id: string;
  name: string;
  endedOn: string | null;
}

export interface CoachProgrammes {
  status: "loading" | "ok" | "error";
  message: string | null;
  retry: () => void;
  /** Routines shown in the coach section, and so left out of Unfiled and the folders. */
  coachRoutineIds: Set<string>;
  groups: CoachGroup[];
  past: PastProgramme[];
  coaches: Record<string, CoachInfo>;
  /** Provisional while loading or after a failure: the routines a coach assigned. */
  provisional: Routine[];
}

const coachCache = new Map<string, CoachInfo>();

export function useCoachProgrammes(routines: Routine[], userId: string | null, today: string): CoachProgrammes {
  const [data, setData] = useState<ProgrammeData | null>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [coaches, setCoaches] = useState<Record<string, CoachInfo>>(() => Object.fromEntries(coachCache));

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    void fetchProgrammes(userId).then((r) => {
      if (cancelled) return;
      if (r.ok) {
        setData(r.data);
        setStatus("ok");
        setMessage(null);
      } else {
        setStatus("error");
        setMessage(r.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [userId, nonce]);

  const retry = useCallback(() => {
    setStatus("loading");
    setNonce((n) => n + 1);
  }, []);

  const provisional = useMemo(() => routines.filter((r) => !!r.assignedByProfessionalId), [routines]);

  const model = useMemo(() => {
    const byId = new Map(routines.map((r) => [r.id, r]));
    const groups: CoachGroup[] = [];
    const past: PastProgramme[] = [];
    const ids = new Set<string>();
    if (!data) return { groups, past, ids };
    const { current, past: ended } = splitAssignments(data.assignments, today);
    for (const a of current) {
      const routine = a.routineId ? byId.get(a.routineId) : undefined;
      // The client deleted the routine it produced: nothing to train here.
      if (!routine) continue;
      const pro = routine.assignedByProfessionalId ?? "";
      const next = nextSession(data.sessions[a.id] ?? [], today, a);
      const programme: CoachProgramme = {
        assignment: a,
        name: routine.name,
        routine,
        countLine: programmeCountLine(a, today, 1),
        meta: coachRoutineMeta(a, next, routine.exercises.length, routine.estimatedDurationMin),
        today: next === today,
        updated: wasUpdatedByCoach(a),
      };
      let g = groups.find((x) => x.professionalId === pro);
      if (!g) groups.push((g = { professionalId: pro, programmes: [] }));
      g.programmes.push(programme);
      ids.add(routine.id);
    }
    for (const a of ended) {
      const routine = a.routineId ? byId.get(a.routineId) : undefined;
      // Its name: the routine (named after the template), else the title its
      // sessions carried; the template itself is not readable by the client.
      past.push({ id: a.id, name: routine?.name ?? data.titles[a.id] ?? "Programme", endedOn: endedOn(a) });
    }
    return { groups, past, ids };
  }, [data, routines, today]);

  // The coaches' names and roles: connected_professional_summary (first name
  // only), as CoachNotePopup reads them. Empty for an ended relationship.
  // A string key, so a re-render with the same coaches doesn't restart the read.
  const proKey = useMemo(
    () =>
      [...new Set([...model.groups.map((g) => g.professionalId), ...provisional.map((r) => r.assignedByProfessionalId!)])]
        .filter(Boolean)
        .sort()
        .join(","),
    [model.groups, provisional]
  );
  useEffect(() => {
    const proIds = proKey ? proKey.split(",") : [];
    const missing = proIds.filter((id) => !coachCache.has(id));
    let cancelled = false;
    if (missing.length === 0) {
      // Read by an earlier render (or another screen): show what is cached.
      if (proIds.some((id) => coachCache.has(id))) {
        void Promise.resolve().then(() => !cancelled && setCoaches(Object.fromEntries(coachCache)));
      }
      return () => {
        cancelled = true;
      };
    }
    void Promise.all(
      missing.map(async (id) => {
        const r = await fetchConnectedProfessional(id);
        if (r.ok && r.professional) {
          const p = r.professional;
          coachCache.set(id, { name: p.firstName?.trim() || "Your coach", role: professionalRole(p), avatarUrl: p.avatarUrl });
        }
      })
    ).then(() => {
      if (!cancelled) setCoaches(Object.fromEntries(coachCache));
    });
    return () => {
      cancelled = true;
    };
  }, [proKey]);

  const coachRoutineIds = status === "ok" ? model.ids : new Set(provisional.map((r) => r.id));

  return {
    status,
    message,
    retry,
    coachRoutineIds,
    groups: model.groups,
    past: model.past,
    coaches,
    provisional,
  };
}
