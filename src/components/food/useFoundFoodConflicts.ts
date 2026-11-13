import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useApp } from "../../context/AppContext";
import { fetchFoundFoodConflicts, hasConflictData } from "../../services/nutrition/client";
import type { ConflictRow } from "../../services/nutrition/clientNutritionModel";
import type { FoundAllergenData } from "../../services/food/onlineSearchModel";

// Batch D GI: the allergy and diet warnings for online and barcode results
// BEFORE they're saved (found_food_conflicts, 20261227110000), the same rows
// food_conflicts gives a catalogue food. Asked only for a member with an
// allergy, an Other allergy or a diet the check could match (as the diary's
// badges are), only for results on screen, and once per result
// (fetchFoundFoodConflicts caches and shares the request). On a database
// without the function every answer is "nothing", which is today's card.

export type FoundFood = FoundAllergenData & { name: string; brand: string | null };

const GATE_TTL_MS = 60_000;
let gate: { userId: string; at: number; answer: Promise<boolean> } | null = null;

/** Whether `userId` has anything the check could match; asked once a minute at most. */
function conflictGate(userId: string): Promise<boolean> {
  if (gate && gate.userId === userId && Date.now() - gate.at < GATE_TTL_MS) return gate.answer;
  const answer = hasConflictData(userId).catch(() => false);
  gate = { userId, at: Date.now(), answer };
  return answer;
}

/** found_food_conflicts' rows for one result; null while unknown (or nothing to check). */
export function useFoundFoodConflicts(key: string | null, food: FoundFood | null): ConflictRow[] | null {
  const { authUserId: who } = useApp();
  const [rows, setRows] = useState<{ key: string; rows: ConflictRow[] } | null>(null);
  useEffect(() => {
    if (!who || !key || !food) return;
    let live = true;
    const f = food;
    void conflictGate(who).then(async (has) => {
      if (!has || !live) return;
      const r = await fetchFoundFoodConflicts(who, key, f);
      if (live && r.ok) setRows({ key, rows: r.data });
    });
    return () => {
      live = false;
    };
  }, [who, key, food]);
  return rows && rows.key === key ? rows.rows : null;
}

const VISIBLE_DEBOUNCE_MS = 250;

/**
 * The rows for the results in a scrolling list, asked as each result comes on
 * screen (after a short pause, so a fling past twenty results asks for the
 * few it stops on). `observe(key)` is the ref for each result's element.
 */
export function useVisibleFoundConflicts(
  foods: ReadonlyMap<string, FoundFood>,
  root: RefObject<HTMLElement | null>
): { rows: ReadonlyMap<string, ConflictRow[]>; observe: (key: string) => (el: HTMLElement | null) => void } {
  const { authUserId } = useApp();
  const [has, setHas] = useState(false);
  const [rows, setRows] = useState<ReadonlyMap<string, ConflictRow[]>>(new Map());
  const foodsRef = useRef(foods);
  useEffect(() => {
    foodsRef.current = foods;
  }, [foods]);
  const visible = useRef(new Set<string>());
  const asked = useRef(new Set<string>());
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const elements = useRef(new Map<string, HTMLElement>());
  // One ref callback per result, so a re-render doesn't unobserve and observe it again.
  const refs = useRef(new Map<string, (el: HTMLElement | null) => void>());

  useEffect(() => {
    if (!authUserId) return;
    let live = true;
    void conflictGate(authUserId).then((v) => live && setHas(v));
    return () => {
      live = false;
    };
  }, [authUserId]);

  const flush = useCallback(() => {
    timer.current = null;
    if (!authUserId || !has) return;
    for (const key of visible.current) {
      const f = foodsRef.current.get(key);
      if (!f || asked.current.has(key)) continue;
      asked.current.add(key);
      void fetchFoundFoodConflicts(authUserId, key, f).then((r) => {
        if (r.ok) setRows((prev) => new Map(prev).set(key, r.data));
        else asked.current.delete(key);
      });
    }
  }, [authUserId, has]);

  useEffect(() => {
    if (!has || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const key = (e.target as HTMLElement).dataset.foundKey;
          if (!key) continue;
          if (e.isIntersecting) visible.current.add(key);
          else visible.current.delete(key);
        }
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(flush, VISIBLE_DEBOUNCE_MS);
      },
      { root: root.current }
    );
    observer.current = io;
    for (const el of elements.current.values()) io.observe(el);
    return () => {
      io.disconnect();
      observer.current = null;
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
    };
  }, [has, flush, root]);

  const observe = useCallback((key: string) => {
    let ref = refs.current.get(key);
    if (ref) return ref;
    ref = (el: HTMLElement | null) => {
      const before = elements.current.get(key);
      if (before && before !== el) {
        observer.current?.unobserve(before);
        elements.current.delete(key);
        visible.current.delete(key);
      }
      if (el) {
        el.dataset.foundKey = key;
        elements.current.set(key, el);
        observer.current?.observe(el);
      }
    };
    refs.current.set(key, ref);
    return ref;
  }, []);

  return { rows, observe };
}
