import { useCallback, useEffect, useState } from "react";
import { agreeToGymEntrySharing, fetchMyEntrySharing, withdrawGymEntrySharing, type EntrySharing } from "../../services/venues";
import type { VenueEntrySystem } from "../../services/front-desk/entrySystem";
import { entrySystemDisplay } from "../../services/venues/entrySystem";
import { ConfirmCard } from "../ui/ConfirmCard";
import { EntrySharingCheck } from "./EntrySharingCheck";
import { t } from "../../i18n/core";

// Round H (EU) · under the pass of a gym that keeps its own entry system
// (my_gym_entry_sharing, HANDOVER_API "The member's consent"):
// - `needed` (a member who joined before the gym set its system, or who
//   withdrew): the consent checkbox and Agree. Until then the desk can't see
//   them on its lists (they're only a count), so this is where they're asked.
// - agreed: one line and "Stop sharing" (withdraw_gym_entry_sharing), behind a
//   confirm: the desk is then told to take them off its system.
// Online only, and never on the device's offline copy of the pass.

export function EntrySharingStatus({ gymId, gymName, system }: { gymId: string; gymName: string; system: VenueEntrySystem }) {
  const [row, setRow] = useState<EntrySharing | null>(null);
  const [tick, setTick] = useState(0);
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const reload = useCallback(() => setTick((k) => k + 1), []);
  useEffect(() => {
    let alive = true;
    void fetchMyEntrySharing().then((r) => {
      if (alive && r.ok) setRow(r.value.find((x) => x.gymId === gymId) ?? null);
    });
    return () => {
      alive = false;
    };
  }, [gymId, tick]);

  const name = entrySystemDisplay(system.system, system.name);
  const agree = async () => {
    if (!ticked || busy) return;
    setBusy(true);
    const r = await agreeToGymEntrySharing(gymId);
    setBusy(false);
    if (!r.ok) return setNote({ text: r.message, error: true });
    setNote({ text: t("Thanks. The front desk can now add you to {system}.", { system: name }), error: false });
    reload();
  };
  const withdraw = async () => {
    setBusy(true);
    const r = await withdrawGymEntrySharing(gymId);
    setBusy(false);
    setAsking(false);
    if (!r.ok) return setNote({ text: r.message, error: true });
    setTicked(false);
    setNote({ text: t("You've stopped sharing. {gym} will take you off {system}.", { gym: gymName, system: name }), error: false });
    reload();
  };

  if (!row) return null;
  return (
    <div className="mt-3 w-full rounded-[14px] bg-cream-soft px-3.5 py-3 text-start">
      {row.needed ? (
        <>
          <p className="m-0 text-[13px] font-bold text-charcoal">{t("{gym} needs your agreement to add you to {system}.", { gym: gymName, system: name })}</p>
          <EntrySharingCheck gymName={gymName} system={system} checked={ticked} onChange={setTicked} />
          <button type="button" onClick={() => void agree()} disabled={!ticked || busy} className="tap text-[13px] font-bold text-primary-dark disabled:opacity-40" style={{ minHeight: 44 }}>
            {busy ? t("One moment…") : t("Agree")}
          </button>
        </>
      ) : row.agreed ? (
        <div className="flex items-center justify-between gap-3">
          <p className="m-0 text-[12px] leading-[17px] text-charcoal-soft">{t("You share your first name, member number and membership dates with {system}.", { system: name })}</p>
          <button type="button" onClick={() => setAsking(true)} className="tap shrink-0 text-[12px] font-bold text-status-high" style={{ minHeight: 44 }}>
            {t("Stop sharing")}
          </button>
        </div>
      ) : null}
      {note && (
        <p role={note.error ? "alert" : "status"} className={`m-0 text-[12px] font-semibold ${note.error ? "text-status-high" : "text-charcoal-faint"}`}>
          {note.text}
        </p>
      )}
      <ConfirmCard
        open={asking}
        layout="decision"
        title={t("Stop sharing with {system}?", { system: name })}
        subtitle={t("{gym} will be told to take you off its entry system, so you may not be able to get in. Ask the front desk how to get in after this.", { gym: gymName })}
        confirmLabel={busy ? t("One moment…") : t("Stop sharing")}
        cancelLabel={t("Keep sharing")}
        busy={busy}
        onCancel={() => setAsking(false)}
        onConfirm={() => void withdraw()}
      />
    </div>
  );
}
