import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarRange } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ProCardSkeleton } from "../states";
import { ListCard, SectionHead } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { ErrorLine } from "../library/libraryUi";
import { PRO_ROUTES } from "../subtypeLanes";
import { fetchProgrammeProgress } from "../../../services/programmes";
import { assignmentStatus, doneLine, summariseProgress, totalSoFar } from "../../../services/programmes/model";
import { useProgrammes } from "./useProgrammes";
import { AssignProgrammeSheet } from "./AssignProgrammeSheet";

/**
 * Round D · DT1 on the client page (Plan tab, Full coaching): this client's
 * week-by-day programmes from this professional, each with its week and
 * "{n} of {n} sessions done" so far (programme_progress; "Not shared"
 * without the client's Workout activity consent, never 0). A row opens the
 * client's progress in Library (?view=programme-client); "Assign" opens the
 * assign sheet with this client fixed.
 */
export const ClientWeekProgrammes: React.FC<{ clientId: string; today: string }> = ({ clientId, today }) => {
  const navigate = useNavigate();
  const state = useProgrammes();
  const [assigning, setAssigning] = useState(false);
  const [totals, setTotals] = useState<Record<string, string>>({});

  const active = state.assignments.filter((a) => a.clientId === clientId && !a.endedAt);
  const key = active.map((a) => a.id).join(",");

  useEffect(() => {
    if (!key) return;
    let live = true;
    void Promise.all(
      key.split(",").map(async (id) => {
        const r = await fetchProgrammeProgress(id);
        if (!r.ok) return [id, ""] as const;
        const t = totalSoFar(summariseProgress(r.data), today);
        return [id, t.planned > 0 ? doneLine(t.planned, t.done) : ""] as const;
      })
    ).then((rows) => live && setTotals(Object.fromEntries(rows)));
    return () => {
      live = false;
    };
  }, [key, today]);

  return (
    <>
      <SectionHead label="Week-by-day programmes" right={state.programmes.length ? "Assign" : undefined} onRight={state.programmes.length ? () => setAssigning(true) : undefined} />
      {state.status === "loading" ? (
        <ProCardSkeleton lines={2} />
      ) : state.status === "error" ? (
        <ErrorLine>{state.offline ? "You're offline. Programmes need a connection." : "Couldn't load programmes."}</ErrorLine>
      ) : active.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>
          {state.programmes.length ? "Not on a week-by-day programme." : "Build a week-by-day programme in Library to assign it here."}
        </p>
      ) : (
        <ListCard
          rows={active.map((a) => {
            const p = state.programmes.find((x) => x.id === a.programmeId);
            const weeks = p?.durationWeeks ?? 0;
            return {
              key: a.id,
              icon: CalendarRange,
              title: p?.name ?? "Programme",
              meta: [assignmentStatus(a, weeks, today, (d) => fmtDay(d)), totals[a.id] || null, `ends ${fmtDay(a.endsOn)}`].filter(Boolean).join(" · "),
              onClick: () => navigate(`${PRO_ROUTES.library}/programmes?view=programme-client&id=${a.id}`),
            };
          })}
        />
      )}
      <AssignProgrammeSheet
        open={assigning}
        onClose={() => setAssigning(false)}
        programmes={state.programmes}
        assignments={state.assignments}
        clientId={clientId}
        onAssigned={() => void state.reload()}
      />
    </>
  );
};
