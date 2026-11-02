import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { useApp } from "../../../context/AppContext";
import type { Exercise, WorkoutTemplate } from "../../../types";
import { canEditClientRoutine, fetchOneRepMaxes, setClientCopyWeight } from "../../../services/pro/library";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { LockLine } from "../LockLine";
import { ProCardSkeleton, ProError } from "../states";
import { resolveWeights } from "../../../services/workout/coach";
import { fmtKg, isActive } from "./libraryModel";
import { t } from "../../../i18n/core";

/**
 * Release 3 · W5 TR14 v2 "Targets per client" for one exercise of a template.
 *
 * Each client on this programme: their estimated 1RM (current_personal_records,
 * behind Progress; a LockLine when not shared), the weight from it
 * (the database's resolve_weight(one_rm, intensity_pct, 'kg'), called when
 * rendering as the follow-up 20261124160000 says; nothing is stored) labelled "From 1RM",
 * or the coach's own figure ("Set by you", Reset). Save targets writes the
 * weight into each client's own copy (set_routine_exercises, allowed for the
 * assigning professional while the client is connected:
 * can_edit_client_routine). The template keeps intensity only.
 */
export const TargetsSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onBack?: () => void;
  template: WorkoutTemplate | null;
  exercise: Exercise | null;
}> = ({ open, onClose, onBack, template, exercise }) => {
  const { templateAssignments, professionalClients } = useApp();
  const [oneRms, setOneRms] = useState<Record<string, number> | null>(null);
  // resolve_weight per client id; a client left out has no 1RM or the call failed.
  const [fromRm, setFromRm] = useState<Record<string, number>>({});
  const [failed, setFailed] = useState(false);
  const [editable, setEditable] = useState<Record<string, boolean>>({});
  const [override, setOverride] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string[] | null>(null);
  const [reload, setReload] = useState(0);

  const rows = template
    ? templateAssignments
        .filter((a) => a.templateId === template.id && isActive(a) && a.routineId)
        .map((a) => ({ a, client: professionalClients.find((c) => c.clientId === a.clientId) }))
        .filter((r) => !!r.client)
    : [];
  const key = rows.map((r) => r.a.id).join(",");

  useEffect(() => {
    if (!open || !exercise?.exerciseId) return;
    let cancelled = false;
    setOneRms(null);
    setFailed(false);
    setResult(null);
    setOverride({});
    const shared = rows.filter((r) => r.client!.access.progress).map((r) => r.a.clientId);
    void Promise.all([
      fetchOneRepMaxes(shared, exercise.exerciseId),
      Promise.all(rows.map(async (r) => [r.a.id, await canEditClientRoutine(r.a.routineId!)] as const)),
    ]).then(async ([prs, edits]) => {
      if (cancelled) return;
      if (!prs.ok) {
        setFailed(true);
        return;
      }
      const pct = exercise.intensityPct;
      const kg = pct ? await resolveWeights(Object.entries(prs.data).map(([clientId, oneRm]) => ({ key: clientId, oneRm, intensityPct: pct }))) : {};
      if (cancelled) return;
      setFromRm(kg);
      setOneRms(prs.data);
      setEditable(Object.fromEntries(edits));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, exercise?.exerciseId, key, reload]);

  if (!template || !exercise) return null;
  const pct = exercise.intensityPct;
  const sets = exercise.sets ?? exercise.maxSets ?? exercise.minSets;
  const reps = exercise.reps ?? exercise.maxReps ?? exercise.minReps;
  const head = [
    exercise.name,
    sets && reps ? (pct ? t("{sets} x {reps} at {pct}% of 1RM", { sets, reps, pct }) : t("{sets} x {reps}", { sets, reps })) : pct ? t("{pct}% of 1RM", { pct }) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const weightFor = (clientId: string): number | null => {
    const o = override[clientId];
    if (o !== undefined && o !== "") return Number(o);
    return fromRm[clientId] ?? null;
  };

  const save = async () => {
    setSaving(true);
    const lines: string[] = [];
    for (const r of rows) {
      const w = weightFor(r.a.clientId);
      if (w == null || !Number.isFinite(w) || !editable[r.a.id]) continue;
      const res = await setClientCopyWeight(r.a.routineId!, { exerciseId: exercise.exerciseId, name: exercise.name }, w);
      if (!res.ok) lines.push(t("{name}: {message}", { name: r.client!.name, message: t(res.message) }));
    }
    setSaving(false);
    setResult(lines);
    if (lines.length === 0) onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} onBack={onBack} title={t("Targets per client")}>
      <div className="space-y-4 animate-fade-slide-up">
        <p style={{ fontSize: textPx(13), color: INK.chS }}>{head}</p>
        {!exercise.exerciseId && <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{t("Targets from 1RM work with exercises from the exercise database.")}</p>}
        {failed && <ProError onRetry={() => setReload((n) => n + 1)} />}
        {!failed && oneRms === null && exercise.exerciseId && rows.length > 0 && <ProCardSkeleton lines={3} />}
        {rows.length === 0 && <p style={{ fontSize: textPx(12.5), color: INK.chF }}>{t("Not assigned to anyone yet.")}</p>}
        {oneRms &&
          rows.map(({ a, client }, i) => {
            const c = client!;
            const first = c.name.split(" ")[0];
            if (!c.access.progress) {
              return (
                <div key={a.id} style={{ paddingBottom: 12, borderBottom: i < rows.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
                  <div className="flex items-center mb-2" style={{ gap: 10 }}>
                    <Avatar name={c.name} url={c.avatarUrl} size={36} />
                    <span className="flex-1 truncate" style={{ fontSize: textPx(15), fontWeight: 600, color: INK.ch }}>{c.name}</span>
                  </div>
                  <LockLine what={t("Progress")} clientFirstName={first} />
                </div>
              );
            }
            const rm = oneRms[a.clientId] ?? null;
            const from = fromRm[a.clientId] ?? null;
            const o = override[a.clientId];
            const overridden = o !== undefined;
            const shown = overridden ? o : from != null ? fmtKg(from) : "";
            return (
              <div key={a.id} style={{ paddingBottom: 12, borderBottom: i < rows.length - 1 ? `1px solid ${INK.b06}` : "none" }}>
                <div className="flex items-center mb-2" style={{ gap: 10 }}>
                  <Avatar name={c.name} url={c.avatarUrl} size={36} />
                  <span className="flex-1 truncate" style={{ fontSize: textPx(15), fontWeight: 600, color: INK.ch }}>{c.name}</span>
                  <span style={{ fontSize: textPx(12.5), color: INK.chF }}>{rm != null ? t("1RM {kg} kg", { kg: fmtKg(rm) }) : t("No 1RM yet")}</span>
                </div>
                <div className="flex items-center rounded-xl bg-cream-soft border border-charcoal/10" style={{ paddingBlock: "0", paddingInline: "12px 8px", gap: 8, minHeight: 44 }}>
                  <input
                    value={shown}
                    onChange={(e) => setOverride((p) => ({ ...p, [a.clientId]: e.target.value.replace(/[^\d.]/g, "") }))}
                    inputMode="decimal"
                    placeholder={t("Enter weight")}
                    aria-label={t("Weight in kg for {name}", { name: c.name })}
                    disabled={!editable[a.id]}
                    className="flex-1 min-w-0 bg-transparent text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none"
                  />
                  {shown && <span style={{ fontSize: textPx(13), color: INK.chS }}>{t("kg")}</span>}
                  {!overridden && from != null && (
                    <span style={{ fontSize: textPx(11), fontWeight: 700, color: INK.tealDark, background: INK.tealPale, borderRadius: 8, padding: "3px 8px" }}>{t("From 1RM")}</span>
                  )}
                  {overridden && (
                    <>
                      <span style={{ fontSize: textPx(11), fontWeight: 700, color: INK.prDeep, background: INK.prPale, borderRadius: 8, padding: "3px 8px" }}>{t("Set by you")}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setOverride((p) => {
                            const n = { ...p };
                            delete n[a.clientId];
                            return n;
                          })
                        }
                        className="tap"
                        style={{ minHeight: 44, padding: "0 4px", fontSize: textPx(12), fontWeight: 700, color: INK.prDeep }}
                      >
                        {t("Reset")}
                      </button>
                    </>
                  )}
                </div>
                {rm == null && !overridden && (
                  <p className="flex items-center mt-1.5" style={{ gap: 6, fontSize: textPx(12), color: INK.chF }}>
                    <Info size={13} aria-hidden /> {t("No 1RM recorded for this client")}
                  </p>
                )}
                {!editable[a.id] && <p className="mt-1.5" style={{ fontSize: textPx(12), color: INK.chF }}>{t("{first} isn't connected with you any more, so their copy can't be changed.", { first })}</p>}
              </div>
            );
          })}
        <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5 }}>{t("Weight = 1RM x intensity, rounded to the nearest 2.5 kg.")}</p>
        {result?.map((l) => (
          <p key={l} className="text-[11.5px] font-semibold text-status-high">
            {l}
          </p>
        ))}
        <Button fullWidth size="lg" disabled={saving || !oneRms || rows.length === 0} onClick={() => void save()}>
          {saving ? t("Saving…") : t("Save targets")}
        </Button>
      </div>
    </BottomSheet>
  );
};
