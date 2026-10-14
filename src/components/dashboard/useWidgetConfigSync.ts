import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase/client";
import { useApp } from "../../context/AppContext";
import type { WidgetConfig, WidgetSize, WidgetType } from "../../types";

// V6-141 (PB3 D22, PB-HO-01): the Home board is stored in public.widget_configs
// with platform 'web' (the phone keeps its own layout, by design). Owner-only
// rows; grants: SELECT / INSERT / DELETE and UPDATE (size, position, platform,
// visible, widget_type). This file only ever UPDATEs size and position.
//
// FIRST READ: rows on the server win and replace the local board; no rows
// means this browser's board is the first copy, so it is written once.
// AFTER THAT: every change to the board (add, remove, resize, reorder) is
// diffed against what the server holds and written 400 ms later. Widgets the
// board hides (Weight in recovery-sensitive mode, Cycle while the section is
// not offered) stay in the list and so stay stored, exactly where they were.
// `widget_type` gained `cycle` in Database B2; body_fat and gym_passes are
// enum values the web board no longer offers.

const TO_DB: Partial<Record<WidgetType, string>> = {
  steps: "steps",
  weight: "weight",
  water: "water",
  sleep: "sleep",
  nutrition: "nutrition",
  workout: "workout",
  heartRate: "heart_rate",
  habits: "habits",
  journal: "journal",
  meditation: "meditation",
  cycle: "cycle",
};
const FROM_DB: Record<string, WidgetType> = Object.fromEntries(Object.entries(TO_DB).map(([k, v]) => [v, k as WidgetType]));

interface Stored {
  size: WidgetSize;
  position: number;
}

type Row = { widget_type: string; size: WidgetSize; position: number; visible: boolean };
type Result<T> = PromiseLike<{ data: T | null; error: { message: string } | null }>;
interface Table {
  select: (cols: string) => { eq: (c: string, v: unknown) => { eq: (c: string, v: unknown) => { order: (c: string) => Result<Row[]> } } };
  insert: (rows: Record<string, unknown>[]) => Result<null>;
  update: (patch: { size: WidgetSize; position: number }) => { eq: (c: string, v: unknown) => { eq: (c: string, v: unknown) => { eq: (c: string, v: unknown) => Result<null> } } };
  delete: () => { eq: (c: string, v: unknown) => { eq: (c: string, v: unknown) => { in: (c: string, v: string[]) => Result<null> } } };
}
// widget_configs is in the generated types, but `cycle` (B2) is not yet in its enum there.
const table = () => (supabase as unknown as { from: (t: "widget_configs") => Table }).from("widget_configs");

function wanted(widgets: WidgetConfig[]): Map<string, Stored> {
  const out = new Map<string, Stored>();
  widgets.forEach((w) => {
    const t = TO_DB[w.type];
    if (t && !out.has(t)) out.set(t, { size: w.size, position: out.size });
  });
  return out;
}

export function useWidgetConfigSync(): void {
  const { authUserId, widgets, replaceWidgets } = useApp();
  const stored = useRef<Map<string, Stored> | null>(null);
  const [ready, setReady] = useState<string | null>(null);

  // 1. Read the web layout once per signed-in user.
  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    stored.current = null;
    void table()
      .select("widget_type, size, position, visible")
      .eq("owner_id", authUserId)
      .eq("platform", "web")
      .order("position")
      .then(({ data, error }) => {
        if (cancelled || error) return; // a failed read leaves the local board alone and writes nothing
        const rows = (data ?? []).filter((r) => FROM_DB[r.widget_type]);
        stored.current = new Map(rows.map((r) => [r.widget_type, { size: r.size, position: r.position }]));
        if (rows.length > 0) {
          replaceWidgets(rows.map((r) => ({ id: `w-${FROM_DB[r.widget_type]}`, type: FROM_DB[r.widget_type], size: r.size, visible: r.visible })));
        }
        setReady(authUserId);
      });
    return () => {
      cancelled = true;
    };
  }, [authUserId, replaceWidgets]);

  // 2. Write what changed.
  useEffect(() => {
    if (!authUserId || ready !== authUserId || !stored.current) return;
    const want = wanted(widgets);
    const have = stored.current;
    const inserts: Record<string, unknown>[] = [];
    const updates: [string, Stored][] = [];
    const deletes: string[] = [];
    for (const [t, v] of want) {
      const h = have.get(t);
      if (!h) inserts.push({ owner_id: authUserId, platform: "web", widget_type: t, size: v.size, position: v.position, visible: true });
      else if (h.size !== v.size || h.position !== v.position) updates.push([t, v]);
    }
    for (const t of have.keys()) if (!want.has(t)) deletes.push(t);
    if (!inserts.length && !updates.length && !deletes.length) return;
    const timer = window.setTimeout(async () => {
      const results = await Promise.all([
        deletes.length ? table().delete().eq("owner_id", authUserId).eq("platform", "web").in("widget_type", deletes) : null,
        inserts.length ? table().insert(inserts) : null,
        ...updates.map(([t, v]) =>
          table().update({ size: v.size, position: v.position }).eq("owner_id", authUserId).eq("platform", "web").eq("widget_type", t)
        ),
      ]);
      // On a failure the next change retries the whole difference; the board itself is never rolled back.
      if (results.every((r) => !r || !r.error)) stored.current = want;
    }, 400);
    return () => window.clearTimeout(timer);
  }, [widgets, ready, authUserId]);
}
