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
import { summariseProgress, totalSoFar } from "../../../services/programmes/model";
import { t } from "../../../i18n/core";
import { doneText, statusText } from "./programmeText";
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
        const sum = totalSoFar(summariseProgress(r.data), today);
        return [id, sum.planned > 0 ? doneText(sum.planned, sum.done) : ""] as const;
      })
    ).then((rows) => live && setTotals(Object.fromEntries(rows)));
    return () => {
      live = false;
    };
  }, [key, today]);

  return (
    <>
      <SectionHead label={t("Week-by-day programmes")} right={state.programmes.length ? t("Assign") : undefined} onRight={state.programmes.length ? () => setAssigning(true) : undefined} />
      {state.status === "loading" ? (
        <ProCardSkeleton lines={2} />
      ) : state.status === "error" ? (
        <ErrorLine>{state.offline ? t("You're offline. Programmes need a connection.") : t("Couldn't load programmes.")}</ErrorLine>
      ) : active.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>
          {state.programmes.length ? t("Not on a week-by-day programme.") : t("Build a week-by-day programme in Library to assign it here.")}
        </p>
      ) : (
        <ListCard
          rows={active.map((a) => {
            const p = state.programmes.find((x) => x.id === a.programmeId);
            const weeks = p?.durationWeeks ?? 0;
            return {
              key: a.id,
              icon: CalendarRange,
              title: p?.name ?? t("Programme"),
              meta: [statusText(a, weeks, today, (d) => fmtDay(d)), totals[a.id] || null, t("ends {date}", { date: fmtDay(a.endsOn) })].filter(Boolean).join(" · "),
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
