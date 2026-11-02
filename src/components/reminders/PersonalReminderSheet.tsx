import React, { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { Toggle } from "../ui/Toggle";
import { useApp } from "../../context/AppContext";
import {
  CADENCE_MAX,
  CADENCE_MIN,
  deletePersonalReminder,
  fetchPersonalReminder,
  savePersonalReminder,
  type PersonalReminder,
} from "../../services/personal-reminders";
import { todayLocal } from "../../utils/date";
import { t, tn } from "../../i18n/core";

/**
 * A personal reminder: every so many days, from a chosen date. It carries no
 * topic, and the notification always reads "You have a reminder today", so
 * nothing here says what it is for. Anybody can open it from anywhere.
 */
export const PersonalReminderSheet: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { authUserId } = useApp();
  const [loaded, setLoaded] = useState<"loading" | "ready" | "error">("loading");
  const [loadError, setLoadError] = useState("");
  const [existing, setExisting] = useState<PersonalReminder | null>(null);
  const [cadence, setCadence] = useState("14");
  const [nextDue, setNextDue] = useState(todayLocal());
  const [enabled, setEnabled] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !authUserId) return;
    let cancelled = false;
    void fetchPersonalReminder(authUserId).then((r) => {
      if (cancelled) return;
      if (!r.ok) {
        setLoadError(t(r.message));
        setLoaded("error");
        return;
      }
      setExisting(r.reminder);
      if (r.reminder) {
        setCadence(String(r.reminder.cadenceDays));
        setNextDue(r.reminder.nextDueOn);
        setEnabled(r.reminder.enabled);
      }
      setLoaded("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [open, authUserId]);

  const days = Number(cadence);
  const today = todayLocal();
  const valid = Number.isInteger(days) && days >= CADENCE_MIN && days <= CADENCE_MAX && nextDue >= today;

  const close = () => {
    setMessage(null);
    setLoaded("loading");
    onClose();
  };

  const save = async () => {
    if (!authUserId || !valid) return;
    setBusy(true);
    const r = await savePersonalReminder(authUserId, { cadenceDays: days, nextDueOn: nextDue, enabled });
    setBusy(false);
    if (r.ok) {
      setExisting({ cadenceDays: days, nextDueOn: nextDue, enabled });
      setMessage(t("Saved."));
    } else {
      setMessage(t(r.message));
    }
  };

  const remove = async () => {
    if (!authUserId) return;
    setBusy(true);
    const r = await deletePersonalReminder(authUserId);
    setBusy(false);
    if (r.ok) {
      setExisting(null);
      setCadence("14");
      setNextDue(todayLocal());
      setEnabled(true);
      setMessage(t("Reminder removed."));
    } else {
      setMessage(t(r.message));
    }
  };

  return (
    <BottomSheet open={open} onClose={close} title={t("Personal reminder")}>
      {loaded === "loading" ? (
        <p className="text-[13px] text-charcoal-faint">{t("Loading…")}</p>
      ) : loaded === "error" ? (
        <p className="text-[13px] text-charcoal-faint">{loadError}</p>
      ) : (
        <div className="space-y-4">
          <label className="block">
            <span className="text-[12px] font-semibold text-charcoal">{t("Remind me every")}</span>
            <span className="mt-1.5 flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                min={CADENCE_MIN}
                max={CADENCE_MAX}
                value={cadence}
                onChange={(e) => setCadence(e.target.value)}
                className="w-20 rounded-xl border border-charcoal/[0.12] bg-cream-card px-3 py-2.5 text-[14px] text-charcoal tabular-nums"
              />
              <span className="text-[13px] text-charcoal-soft">{tn(days || 0, "days", "days")}</span>
            </span>
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold text-charcoal">{t("Next reminder on")}</span>
            <input
              type="date"
              min={today}
              value={nextDue}
              onChange={(e) => setNextDue(e.target.value)}
              className="mt-1.5 block w-full rounded-xl border border-charcoal/[0.12] bg-cream-card px-3 py-2.5 text-[14px] text-charcoal"
            />
          </label>
          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-semibold text-charcoal">{t("On")}</span>
            <Toggle checked={enabled} onChange={setEnabled} label={t("Reminder on")} />
          </div>
          <p className="text-[11px] text-charcoal-faint leading-relaxed">
            {t('Arrives as a notification from 9:00 AM in your timezone, reading "You have a reminder today". Turn on notifications in Settings to receive it.')}
          </p>
          {message && (
            <p role="status" className="text-[12px] font-semibold text-primary-dark">
              {message}
            </p>
          )}
          <Button className="w-full" disabled={!valid || busy} onClick={save}>
            {t("Save")}
          </Button>
          {existing && (
            <Button variant="ghost" className="w-full" disabled={busy} onClick={remove}>
              {t("Remove reminder")}
            </Button>
          )}
        </div>
      )}
    </BottomSheet>
  );
};
