// Release 3 · W7 (CU4, CU13): Food's reads of what a professional adds.
// Every hook is quiet for an account with no professional and no allergies
// (tabguard-signup): it reads, finds nothing, and the screen is as before.

import { useCallback, useEffect, useRef, useState } from "react";
import { useApp } from "../../context/AppContext";
import {
  fetchAllergiesSharedWith,
  fetchEntryFeedback,
  fetchFoodConflicts,
  fetchMyAllergies,
  hasConflictData,
  type EntryFeedback,
} from "../../services/nutrition/client";
import { type ConflictRow, type MyAllergy } from "../../services/nutrition/clientNutritionModel";
import type { FoodLogEntry } from "../../types";

// CU3's targets sync lives in AppContext (context/useProfessionalTargetsSync.ts),
// so Home and every ring get the locked targets without opening Food.

/** CU13 / CU15: the client's own allergies, and who they're shared with (not read when disabled: the professional's Goals view). */
export function useMyAllergies(enabled = true): {
  allergies: MyAllergy[];
  sharedWith: string[];
  status: "loading" | "ok" | "error";
  reload: () => void;
} {
  const { authUserId } = useApp();
  const [allergies, setAllergies] = useState<MyAllergy[]>([]);
  const [sharedWith, setSharedWith] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!authUserId || !enabled) return;
    let live = true;
    void Promise.all([fetchMyAllergies(authUserId), fetchAllergiesSharedWith(authUserId)]).then(([a, s]) => {
      if (!live) return;
      if (a.ok) setAllergies(a.data);
      if (s.ok) setSharedWith(s.data);
      setStatus(a.ok ? "ok" : "error");
    });
    return () => {
      live = false;
    };
  }, [authUserId, tick, enabled]);
  return { allergies, sharedWith, status, reload: useCallback(() => setTick((t) => t + 1), []) };
}

const conflictKey = (e: Pick<FoodLogEntry, "foodId" | "customFoodId" | "name">) => `${e.foodId ?? ""}|${e.customFoodId ?? ""}|${e.name.toLowerCase()}`;

/**
 * CU13 / CU4: per entry of the day, its food_conflicts rows and the
 * professionals' feedback. Conflicts are read only when the client has an
 * allergy or a dietary row the function could match, and cached by food.
 */
export function useDiaryExtras(entries: FoodLogEntry[], allergyVersion = 0): {
  conflicts: Map<string, ConflictRow[]>;
  feedback: Map<string, EntryFeedback[]>;
  setFeedbackReply: (feedbackId: string, reply: string) => void;
} {
  const { authUserId } = useApp();
  const cache = useRef(new Map<string, ConflictRow[]>());
  const [conflicts, setConflicts] = useState<Map<string, ConflictRow[]>>(new Map());
  const [feedback, setFeedback] = useState<Map<string, EntryFeedback[]>>(new Map());
  const [hasData, setHasData] = useState(false);

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    cache.current.clear();
    void hasConflictData(authUserId).then((v) => {
      if (live) setHasData(v);
    });
    return () => {
      live = false;
    };
  }, [authUserId, allergyVersion]);

  // Remote entries only: a local-only row has no id the server knows.
  const remote = entries.filter((e) => /^[0-9a-f-]{36}$/i.test(e.id));
  const idsKey = remote.map((e) => e.id).join(",");
  const foodsKey = remote.map(conflictKey).join(",");

  useEffect(() => {
    if (!authUserId || !hasData) {
      setConflicts(new Map());
      return;
    }
    let live = true;
    const todo = remote.filter((e) => !cache.current.has(conflictKey(e)));
    const uniq = new Map(todo.map((e) => [conflictKey(e), e]));
    void Promise.all(
      [...uniq.entries()].map(async ([k, e]) => {
        const r = await fetchFoodConflicts(authUserId, { foodId: e.foodId, customFoodId: e.customFoodId, name: e.name });
        if (r.ok) cache.current.set(k, r.data);
      })
    ).then(() => {
      if (!live) return;
      setConflicts(new Map(remote.map((e) => [e.id, cache.current.get(conflictKey(e)) ?? []])));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUserId, hasData, foodsKey, idsKey]);

  useEffect(() => {
    if (!authUserId || !idsKey) {
      setFeedback(new Map());
      return;
    }
    let live = true;
    void fetchEntryFeedback(authUserId, idsKey.split(",")).then((r) => {
      if (!live || !r.ok) return;
      const m = new Map<string, EntryFeedback[]>();
      for (const f of r.data) m.set(f.entryId, [...(m.get(f.entryId) ?? []), f]);
      setFeedback(m);
    });
    return () => {
      live = false;
    };
  }, [authUserId, idsKey]);

  const setFeedbackReply = useCallback((feedbackId: string, reply: string) => {
    setFeedback((prev) => {
      const next = new Map(prev);
      for (const [k, list] of next) next.set(k, list.map((f) => (f.id === feedbackId ? { ...f, clientReply: reply } : f)));
      return next;
    });
  }, []);

  return { conflicts, feedback, setFeedbackReply };
}
