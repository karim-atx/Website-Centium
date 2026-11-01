import { useEffect, useState } from "react";
import { CalendarClock, CalendarCheck } from "lucide-react";
import { MemberTag } from "../../../components/marketplace/MemberTag";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useOnline } from "../../../hooks/useOnline";
import { isMaskedLabel } from "../../../services/venues/consoleLogic";
import { fetchBusinessBookingPauses, liftBookingPause, noShowsLine, pausedChip, PAUSES_COPY, type MemberPause } from "../../../services/no-shows";
import { t } from "../../../i18n/core";
import { AnAvatar, AnCard, AnListRow, AnRowButton } from "./anKit";

// Round F2 AB4 (Karim F22): the business's members whose class bookings are
// paused (business_booking_pauses, staff with members), each with "Paused
// until {date}" and their no-shows in 30 days, and "Lift pause"
// (lift_booking_pause; the member is told). The roster reader
// (list_business_members) carries no member id, so the pauses are their own
// card rather than a chip on its rows; the venue roster, which has the id,
// shows the chip too. Nothing is drawn while nobody is paused or the seat
// can't read them.

export function BookingPausesCard({ businessId, onToast, className = "mt-[12px]" }: { businessId: string | null; onToast: (text: string) => void; className?: string }) {
  const online = useOnline();
  const access = useConsoleAccess();
  const canSee = access.ready && access.meets("members");
  const [pauses, setPauses] = useState<{ businessId: string; rows: MemberPause[] } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!businessId || !canSee) return;
    let cancelled = false;
    void fetchBusinessBookingPauses(businessId).then((r) => {
      if (!cancelled && r.ok) setPauses({ businessId, rows: r.value });
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, canSee, tick]);

  const rows = pauses && pauses.businessId === businessId ? pauses.rows : [];
  if (!canSee || rows.length === 0) return null;

  const lift = async (p: MemberPause) => {
    if (!businessId || busy) return;
    setBusy(p.memberId);
    setError(null);
    const r = await liftBookingPause(businessId, p.memberId);
    setBusy(null);
    if (!r.ok) return setError(r.message);
    onToast(t(PAUSES_COPY.lifted));
    setTick((x) => x + 1);
  };

  return (
    <AnCard className={className} label={t(PAUSES_COPY.heading)}>
      <div style={{ padding: "4px 16px 4px" }}>
        <p className="text-[12px] leading-[16px] font-bold text-charcoal-faint" style={{ padding: "10px 0 2px" }}>
          {t(PAUSES_COPY.heading)}
        </p>
        {rows.map((p, i) => (
          <AnListRow
            key={p.memberId}
            first={i === 0}
            avatar={isMaskedLabel(p.label) ? <AnAvatar masked /> : <AnAvatar initial={p.label.charAt(0).toUpperCase()} index={i} />}
            name={p.label}
            nameExtra={<MemberTag label={pausedChip(p.pausedUntil)} tone="pending" />}
            fact={noShowsLine(p.noShows)}
            trailing={
              <AnRowButton
                icon={busy === p.memberId ? CalendarClock : CalendarCheck}
                label={t(PAUSES_COPY.lift)}
                ariaLabel={t("Lift {name}'s booking pause", { name: p.label })}
                onClick={() => void lift(p)}
                disabled={!!busy || !online}
              />
            }
          />
        ))}
      </div>
      {error && (
        <p role="alert" className="text-[11.5px] leading-[16px] font-bold text-status-high" style={{ padding: "0 16px 12px" }}>
          {error}
        </p>
      )}
      <p className="text-[10.5px] leading-[15px] text-charcoal-faint" style={{ padding: "0 16px 12px" }}>
        {t(PAUSES_COPY.foot)}
      </p>
    </AnCard>
  );
}
