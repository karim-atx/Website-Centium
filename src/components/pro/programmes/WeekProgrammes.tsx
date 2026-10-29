import React, { useState } from "react";
import { CalendarRange } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ProCardSkeleton } from "../states";
import { Chip, SectionHead } from "../client/kit";
import { ErrorLine, LibCard } from "../library/libraryUi";
import { buildGrid, programmeMeta } from "../../../services/programmes/model";
import { useProgrammes } from "./useProgrammes";
import { ProgrammeDetailsSheet } from "./ProgrammeDetailsSheet";
import { ProgrammeBuilder } from "./ProgrammeBuilder";
import { AssignmentProgress } from "./AssignmentProgress";

/**
 * Round D · DT1 week-by-day programmes in Library › Programmes, beside the
 * workout templates (which keep working exactly as before).
 *
 * - WeekProgrammesSection: "Week-by-day programmes" with "New", one card per
 *   programme ("{n} weeks · {n} workouts a week", the clients chip); a card
 *   opens the builder.
 * - WeekProgrammeView: the sub-screens ProgrammesTab routes to by search
 *   param: ?view=programme&id= (the builder) and ?view=programme-client&id=
 *   (one client's progress, by assignment id).
 */
export const WeekProgrammesSection: React.FC<{ query: string; onOpen: (programmeId: string) => void }> = ({ query, onOpen }) => {
  const state = useProgrammes();
  const [creating, setCreating] = useState(false);
  const q = query.trim().toLowerCase();
  const list = state.programmes.filter((p) => !q || p.name.toLowerCase().includes(q));

  return (
    <>
      <SectionHead label="Week-by-day programmes" right="New" onRight={() => setCreating(true)} />
      {state.status === "loading" ? (
        <ProCardSkeleton lines={2} />
      ) : state.status === "error" && state.programmes.length === 0 ? (
        <ErrorLine>{state.offline ? "You're offline. Programmes need a connection." : "Couldn't load your programmes."}</ErrorLine>
      ) : list.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF, marginBottom: 12 }}>
          {q ? "No matches." : "Plan weeks of workouts, day by day, from your workout templates."}
        </p>
      ) : (
        list.map((p) => {
          const clients = new Set(state.assignments.filter((a) => a.programmeId === p.id && !a.endedAt).map((a) => a.clientId)).size;
          return (
            <LibCard
              key={p.id}
              icon={CalendarRange}
              title={p.name}
              sub={programmeMeta(p.durationWeeks, buildGrid(p.durationWeeks, state.slots[p.id] ?? []))}
              meta={clients > 0 ? <Chip label={`${clients} ${clients === 1 ? "client" : "clients"}`} /> : <Chip label="Not assigned" tone="pau" />}
              onOpen={() => onOpen(p.id)}
            />
          );
        })
      )}
      <ProgrammeDetailsSheet
        open={creating}
        onClose={() => setCreating(false)}
        programme={null}
        onSaved={(id) => {
          void state.reload();
          onOpen(id);
        }}
      />
    </>
  );
};

export const WeekProgrammeView: React.FC<{
  view: "programme" | "programme-client";
  id: string;
  onBack: () => void;
  onOpenAssignment: (assignmentId: string) => void;
}> = ({ view, id, onBack, onOpenAssignment }) => {
  const state = useProgrammes();
  if (view === "programme-client") return <AssignmentProgress assignmentId={id} state={state} onBack={onBack} />;
  return <ProgrammeBuilder programmeId={id} state={state} onBack={onBack} onOpenAssignment={onOpenAssignment} onDeleted={onBack} />;
};
