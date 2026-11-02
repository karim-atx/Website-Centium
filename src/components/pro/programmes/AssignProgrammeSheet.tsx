import React, { useEffect, useMemo, useState } from "react";
import { Check, UserPlus } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { Button } from "../../ui/Button";
import { useApp } from "../../../context/AppContext";
import { todayLocal } from "../../../utils/date";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { fmtDay } from "../client/clientFormat";
import { assignProgramme, type Programme, type ProgrammeAssignmentRow } from "../../../services/programmes";
import { assignmentEnd } from "../../../services/programmes/model";
import { t, tn } from "../../../i18n/core";

/**
 * Round D · DT1 TR5 for a week-by-day programme: one client, a start date
 * and the week they join at ("Start at"), with the end date
 * assign_programme_to_client will set (the Sunday of the last week) shown
 * first. Opened from the builder (the programme fixed, pick a client) or
 * from the client page (the client fixed, pick a programme).
 *
 * On assign the server copies each workout into a routine of the client's,
 * puts every session on their calendar and tells them once. Assigning a
 * programme the client is already on redraws their schedule from today.
 */
const FIELD = "w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3 py-2.5 text-sm text-charcoal focus:outline-none focus:ring-2 focus:ring-primary/20";

export const AssignProgrammeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  programmes: Programme[];
  assignments: ProgrammeAssignmentRow[];
  /** Fixed when opened from the builder. */
  programmeId?: string;
  /** Fixed when opened from the client page. */
  clientId?: string;
  onAssigned: (assignmentId: string) => void;
}> = ({ open, onClose, programmes, assignments, programmeId, clientId, onAssigned }) => {
  const { professionalClients } = useApp();
  const [pickedProgramme, setPickedProgramme] = useState<string>("");
  const [pickedClient, setPickedClient] = useState<string>("");
  const [startsOn, setStartsOn] = useState(todayLocal());
  const [joinWeek, setJoinWeek] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPickedProgramme(programmeId ?? programmes[0]?.id ?? "");
    setPickedClient(clientId ?? "");
    setStartsOn(todayLocal());
    setJoinWeek(1);
    setError(null);
    setBusy(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, programmeId, clientId]);

  const roster = useMemo(() => professionalClients.filter((c) => !!c.clientId), [professionalClients]);
  const programme = programmes.find((p) => p.id === pickedProgramme) ?? null;
  const weeks = programme?.durationWeeks ?? 1;
  const join = Math.min(joinWeek, weeks);
  const ends = programme ? assignmentEnd(startsOn, join, weeks) : null;
  const already = !!assignments.find((a) => a.programmeId === pickedProgramme && a.clientId === pickedClient && !a.endedAt);
  const clientName = roster.find((c) => c.clientId === pickedClient)?.name ?? "";

  const run = async () => {
    if (!programme || !pickedClient) return;
    setBusy(true);
    setError(null);
    const r = await assignProgramme(programme.id, pickedClient, startsOn, join);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onAssigned(r.data);
    onClose();
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={t("Assign programme")}>
      <div className="space-y-4 animate-fade-slide-up">
        {programmeId ? (
          <p style={{ fontSize: textPx(13), color: INK.chS }}>{programme ? `${programme.name} · ${tn(weeks, "{n} week", "{n} weeks")}` : ""}</p>
        ) : programmes.length === 0 ? (
          <p className="text-center text-sm text-charcoal-faint py-6">{t("You haven't built a week-by-day programme yet. Build one in Library.")}</p>
        ) : (
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{t("Programme")}</span>
            <select value={pickedProgramme} onChange={(e) => setPickedProgramme(e.target.value)} className={FIELD} style={{ minHeight: 44 }}>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>{`${p.name} · ${tn(p.durationWeeks, "{n} week", "{n} weeks")}`}</option>
              ))}
            </select>
          </label>
        )}

        {!clientId && (
          <div>
            {roster.length === 0 && <p className="text-center text-sm text-charcoal-faint py-6">{t("You don't have any clients yet.")}</p>}
            {roster.map((c, i) => {
              const id = c.clientId!;
              const on = pickedClient === id;
              const on2 = assignments.some((a) => a.programmeId === pickedProgramme && a.clientId === id && !a.endedAt);
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={busy}
                  onClick={() => setPickedClient(id)}
                  className="tap w-full flex items-center text-start"
                  style={{ gap: 12, padding: "11px 0", minHeight: 44, borderBottom: i < roster.length - 1 ? `1px solid ${INK.b06}` : "none" }}
                >
                  <span
                    aria-hidden
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 24, height: 24, borderRadius: 9999, border: `1.5px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.2)"}`, background: on ? INK.fill : "transparent" }}
                  >
                    {on && <Check size={14} strokeWidth={3} style={{ color: INK.onFill }} />}
                  </span>
                  <Avatar name={c.name} url={c.avatarUrl} size={32} />
                  <span className="flex-1 min-w-0">
                    <span className="block truncate" style={{ fontSize: textPx(14), fontWeight: 600, color: INK.ch }}>
                      {c.name}
                    </span>
                    <span className="block truncate" style={{ fontSize: textPx(12), color: INK.chF }}>
                      {on2 ? t("On this programme") : t("Not on this programme")}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {programme && (
          <div className="grid grid-cols-2" style={{ gap: 12 }}>
            <label className="block">
              <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{t("Start date")}</span>
              <input type="date" value={startsOn} onChange={(e) => e.target.value && setStartsOn(e.target.value)} className={FIELD} style={{ minHeight: 44 }} />
            </label>
            {weeks > 1 && (
              <label className="block">
                <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">{t("Start at")}</span>
                <select value={join} onChange={(e) => setJoinWeek(Number(e.target.value))} className={FIELD} style={{ minHeight: 44 }}>
                  {Array.from({ length: weeks }, (_, i) => (
                    <option key={i + 1} value={i + 1}>{t("Week {n}", { n: i + 1 })}</option>
                  ))}
                </select>
                <span className="block mt-1.5" style={{ fontSize: textPx(11.5), color: INK.chF }}>
                  {t("Pick a later week to join mid-programme")}
                </span>
              </label>
            )}
          </div>
        )}
        {ends && <p style={{ fontSize: textPx(12), color: INK.chS }}>{t("Ends {date}", { date: fmtDay(ends, true) })}</p>}
        {already && (
          <p style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>
            {clientName
              ? t("{name} is already on this programme. Assigning again redraws their schedule from today. Routines they already have stay as they are.", { name: clientName })
              : t("This client is already on this programme. Assigning again redraws their schedule from today. Routines they already have stay as they are.")}
          </p>
        )}
        <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.45 }}>
          {t("Each workout becomes a routine of theirs, and every session goes on their calendar.")}
        </p>

        {error && (
          <p role="alert" style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.hi }}>
            {t(error)}
          </p>
        )}
        <Button fullWidth size="lg" disabled={busy || !programme || !pickedClient} onClick={() => void run()}>
          <UserPlus size={16} />
          {busy ? t("Assigning…") : already ? t("Assign again") : t("Assign")}
        </Button>
      </div>
    </BottomSheet>
  );
};
