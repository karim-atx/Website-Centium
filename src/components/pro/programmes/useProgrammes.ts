import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import {
  fetchOwnProgrammes,
  fetchProgrammeAssignments,
  fetchProgrammeSlots,
  type Programme,
  type ProgrammeAssignmentRow,
} from "../../../services/programmes";
import type { ProgrammeSlot } from "../../../services/programmes/model";

// Round D · DT1: the professional's week-by-day programmes, their sessions and
// their assignments, read together and re-read after every write (the tables
// change only through the calls, so a re-read is the truth).

export interface ProgrammesState {
  status: "loading" | "ok" | "error";
  offline: boolean;
  programmes: Programme[];
  slots: Record<string, ProgrammeSlot[]>;
  assignments: ProgrammeAssignmentRow[];
  reload: () => Promise<void>;
}

export function useProgrammes(): ProgrammesState {
  const { authUserId } = useApp();
  const [status, setStatus] = useState<ProgrammesState["status"]>("loading");
  const [offline, setOffline] = useState(false);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [slots, setSlots] = useState<Record<string, ProgrammeSlot[]>>({});
  const [assignments, setAssignments] = useState<ProgrammeAssignmentRow[]>([]);

  const load = useCallback(async () => {
    if (!authUserId) return;
    const [p, a] = await Promise.all([fetchOwnProgrammes(authUserId), fetchProgrammeAssignments(authUserId)]);
    if (!p.ok || !a.ok) {
      setOffline((!p.ok && p.offline) || (!a.ok && a.offline));
      setStatus("error");
      return;
    }
    const s = await fetchProgrammeSlots(p.data.map((x) => x.id));
    if (!s.ok) {
      setOffline(s.offline);
      setStatus("error");
      return;
    }
    setProgrammes(p.data);
    setAssignments(a.data);
    setSlots(s.data);
    setOffline(false);
    setStatus("ok");
  }, [authUserId]);

  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => {
      if (live) void load();
    });
    return () => {
      live = false;
    };
  }, [load]);

  return { status, offline, programmes, slots, assignments, reload: load };
}
