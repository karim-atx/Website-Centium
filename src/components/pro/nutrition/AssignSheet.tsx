import React, { useEffect, useMemo, useState } from "react";
import { Check, CircleAlert, TriangleAlert, UserPlus } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { INK, NO_ICON_SCALE } from "../proInk";
import { Avatar } from "../client/kit";
import { ProError } from "../states";
import { todayLocal } from "../../../utils/date";
import { assignMealPlan, fetchConflicts, type Assignment, type MealPlan } from "../../../services/pro/nutrition";
import type { ProLane } from "../subtypeLanes";
import { allergenLabel, restrictionLabel } from "./nuFormat";
import { useNuRoster } from "./hooks";
import { clientConflictLine, type ClientConflictLine, type ConflictRow } from "./nutritionModel";

/**
 * Release 3 · NU13 "Assign template with conflicts" (source gen r7.js
 * nuAssign7): the template line 12.5 text.soft, then a row per client
 * (check 24 round, avatar 32, name 13.5 / 600) with the conflict line under it
 * (m-left 68, 11.5 / 1.45, red 600 with the triangle when blocked, gold ink
 * 600 with the circle for restrictions, faint "No conflicts"), the footnote
 * and "Assign to {n} clients" (sheet CTA, user-plus).
 *
 * Conflicts per client are food_conflicts for every item of the template
 * (DB-5). A confirmed allergy blocks: assign_meal_plan would refuse (ATXG7),
 * so that client can't be ticked until the item is swapped in the template.
 * The plan doesn't invent swaps ("Swaps added" needs a swap source the
 * backend doesn't have); each client's copy can be swapped in the builder.
 * Start and end dates feed meal_plan_assignments.starts_on / ends_on (Home's
 * "Meal plans ending soon").
 */
export const AssignSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  template: MealPlan | null;
  lane: ProLane;
  assignments: Assignment[];
  onAssigned: (n: number) => void;
}> = ({ open, onClose, template, lane, assignments, onAssigned }) => {
  const dark = useIsDark();
  const { clients, error, retry } = useNuRoster(lane);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [lines, setLines] = useState<Record<string, ClientConflictLine | "loading" | "error">>({});
  const [startsOn, setStartsOn] = useState(todayLocal());
  const [endsOn, setEndsOn] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const already = useMemo(() => new Set(assignments.filter((a) => a.templateId === template?.id).map((a) => a.clientId)), [assignments, template]);
  const refs = useMemo(() => {
    const seen = new Map<string, { kind: NonNullable<MealPlan["days"][number]["items"][number]["kind"]>; refId: string; name: string }>();
    for (const d of template?.days ?? []) for (const i of d.items) if (i.kind && i.refId) seen.set(`${i.kind}:${i.refId}`, { kind: i.kind, refId: i.refId, name: i.name });
    return [...seen.values()];
  }, [template]);

  useEffect(() => {
    if (!open) return;
    setChecked(new Set());
    setStartsOn(todayLocal());
    setEndsOn("");
    setMsg(null);
  }, [open, template]);

  useEffect(() => {
    if (!open || !clients || !template) return;
    let live = true;
    setLines(Object.fromEntries(clients.map((c) => [c.clientId, "loading" as const])));
    void Promise.all(
      clients.map(async (c) => {
        const per = await Promise.all(refs.map(async (r) => ({ name: r.name, rows: await fetchConflicts(c.clientId, { kind: r.kind, refId: r.refId }, r.name) })));
        if (per.some((p) => p.rows === null)) return [c.clientId, "error" as const] as const;
        return [c.clientId, clientConflictLine(per as { name: string; rows: ConflictRow[] }[], { allergen: allergenLabel, restriction: restrictionLabel })] as const;
      })
    ).then((pairs) => live && setLines(Object.fromEntries(pairs)));
    return () => {
      live = false;
    };
  }, [open, clients, template, refs]);

  const n = checked.size;
  const assign = async () => {
    if (!template || !n) return;
    if (endsOn && endsOn < startsOn) return setMsg("The end date must be after the start.");
    setBusy(true);
    setMsg(null);
    const failures: string[] = [];
    let done = 0;
    for (const id of checked) {
      const r = await assignMealPlan(template.id, id, startsOn, endsOn || null);
      if (r.ok) done++;
      else failures.push(`${clients?.find((c) => c.clientId === id)?.name ?? "A client"}: ${r.message}`);
    }
    setBusy(false);
    if (failures.length) {
      setMsg(failures.join(" "));
      if (done) onAssigned(done);
      return;
    }
    onAssigned(done);
    onClose();
  };

  const field: React.CSSProperties = { height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 10px", fontSize: textPx(14), color: INK.ch, width: "100%" };

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Assign template"
      footer={<CtaButton className="w-full" size="sheet" icon={<UserPlus size={15} />} label={n === 1 ? "Assign to 1 client" : `Assign to ${n} clients`} disabled={!n} loading={busy} onClick={() => void assign()} />}
    >
      {template && (
        <p style={{ fontSize: textPx(12.5), color: INK.chS, marginBottom: 10 }}>{`${template.name} template · ${template.daysCount} ${template.daysCount === 1 ? "day" : "days"}`}</p>
      )}
      {error ? (
        <ProError onRetry={retry} />
      ) : !clients ? (
        <p role="status" style={{ fontSize: textPx(12.5), color: INK.chF, padding: "10px 0" }}>
          Loading clients…
        </p>
      ) : clients.length === 0 ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chF, padding: "10px 0" }}>
          {lane === "nutrition" ? "No clients yet." : "No clients with nutrition coaching on. Turn it on from a client's Plan tab."}
        </p>
      ) : (
        clients.map((c) => {
          const line = lines[c.clientId];
          const isAlready = already.has(c.clientId);
          const blocked = typeof line === "object" && line.blocked;
          const disabled = isAlready || blocked || line === "loading" || line === "error";
          const on = checked.has(c.clientId);
          const tone = typeof line === "object" ? line.tone : "none";
          const colour = tone === "att" ? INK.hi : tone === "req" ? INK.goldInk : INK.chF;
          const text = isAlready
            ? "Already on this plan"
            : line === "loading" || line === undefined
              ? "Checking dietary needs…"
              : line === "error"
                ? "Couldn't check dietary needs. Try again later."
                : blocked
                  ? `${line.text} Swap it in the template first.`
                  : line.text;
          return (
            <div key={c.clientId} style={{ padding: "10px 0", borderBottom: `1px solid ${INK.b06}` }}>
              <button
                type="button"
                role="checkbox"
                aria-checked={on}
                aria-disabled={disabled}
                onClick={() => {
                  if (disabled) return;
                  setChecked((prev) => {
                    const next = new Set(prev);
                    if (next.has(c.clientId)) next.delete(c.clientId);
                    else next.add(c.clientId);
                    return next;
                  });
                }}
                className="tap w-full flex items-center text-left"
                style={{ gap: 12, minHeight: 44, opacity: disabled && !on ? 0.85 : 1 }}
              >
                <span className="flex items-center justify-center shrink-0" style={{ width: 24, height: 24, borderRadius: 9999, ...(on ? { background: INK.fill } : { border: `1.5px solid ${dark ? "#9A8CD6" : "#D1CAEB"}` }) }}>
                  {on && <Check size={14} strokeWidth={2.8} aria-hidden style={{ color: INK.onFill, ...NO_ICON_SCALE }} />}
                </span>
                <Avatar name={c.name} url={c.avatarUrl} size={32} />
                <span className="flex-1 min-w-0" style={{ fontSize: textPx(13.5), fontWeight: 600, color: INK.ch, overflowWrap: "anywhere" }}>
                  {c.name}
                </span>
              </button>
              <p className="flex" style={{ gap: 6, margin: "6px 0 0 68px", fontSize: textPx(11.5), lineHeight: 1.45, color: colour, fontWeight: tone === "att" || tone === "req" ? 600 : 400 }}>
                {tone === "att" && <TriangleAlert size={12} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 2, ...NO_ICON_SCALE }} />}
                {tone === "req" && <CircleAlert size={12} strokeWidth={2.2} aria-hidden style={{ flexShrink: 0, marginTop: 2, ...NO_ICON_SCALE }} />}
                <span>{text}</span>
              </p>
            </div>
          );
        })
      )}
      <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 10, lineHeight: 1.5 }}>Each client gets their own copy, where you can swap items. Foods with an allergen the client has recorded are never added.</p>
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
        <label className="block min-w-0">
          <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
            Starts
          </span>
          <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value || todayLocal())} style={field} />
        </label>
        <label className="block min-w-0">
          <span className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
            Ends (optional)
          </span>
          <input type="date" value={endsOn} min={startsOn} onChange={(e) => setEndsOn(e.target.value)} style={field} />
        </label>
      </div>
      {msg && (
        <p role="alert" style={{ marginTop: 10, fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {msg}
        </p>
      )}
    </BottomSheet>
  );
};
