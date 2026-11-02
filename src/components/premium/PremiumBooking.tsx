import { useEffect, useState } from "react";
import { Toggle } from "../ui/Toggle";
import { usePremium } from "../../services/premium/hooks";
import { fetchPremiumBooking, setPremiumBooking } from "../../services/premium/g2Calls";
import { premiumBookingOpensAt, showWaitlistPriority, type PremiumBooking } from "../../services/premium/g2";
import { formatShortDate } from "../../utils/date";
import { t, tn } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G2 · early booking and waitlist priority. The business sets, with
// the schedule permission, how many days before everyone else a Premium
// member may book (0 to 7) and whether Premium members on a waitlist are
// offered a spot first (set_business_premium_booking). The member's class
// page says "Premium members can book from {date}" on a class not yet open
// to free members, as book_class decides (everyone from the booking window,
// Premium that many days sooner), and "Premium members are offered a spot
// first" on the waitlist where priority is on. All only with the switch on.

const DAYS = [0, 1, 2, 3, 4, 5, 6, 7];

function useBooking(businessId: string | null | undefined, on: boolean) {
  const [state, setState] = useState<{ id: string; value: PremiumBooking | null } | null>(null);
  useEffect(() => {
    if (!on || !businessId) return;
    let live = true;
    void fetchPremiumBooking(businessId).then((value) => live && setState({ id: businessId, value }));
    return () => {
      live = false;
    };
  }, [on, businessId]);
  return { value: on && businessId && state?.id === businessId ? state.value : null, set: (v: PremiumBooking) => businessId && setState({ id: businessId, value: v }) };
}

/** The business's setting, on Class rules (staff with schedule change it). */
export function PremiumBookingSetting({ businessId, canWrite }: { businessId: string; canWrite: boolean }) {
  const { premium } = usePremium();
  const on = !!premium?.premiumOn;
  const booking = useBooking(businessId, on);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const b = booking.value;
  // Off, loading, or a Database without the columns: today's page.
  if (!b) return null;

  const save = async (next: PremiumBooking) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await setPremiumBooking(businessId, next.earlyDays, next.waitlistPriority);
    setBusy(false);
    if (r.ok) booking.set(r.value);
    else setError(r.message);
  };
  const disabled = !canWrite || busy;

  return (
    <section data-premium-booking="" aria-label={t("Premium members")} className="mb-3.5 rounded-[20px] bg-cream-card px-4 py-3 shadow-soft">
      <p className="text-[13px] font-bold text-charcoal">{t("Premium members")}</p>
      <div className="mt-2 flex items-center gap-3">
        <label htmlFor="premium-early-days" className="min-w-0 flex-1">
          <span className="block text-[13px] font-semibold text-charcoal">{t("Early booking")}</span>
          <span className="block text-[11.5px] leading-[15px] text-charcoal-faint">{t("Premium members can book this many days before everyone else.")}</span>
        </label>
        <select
          id="premium-early-days"
          value={b.earlyDays}
          disabled={disabled}
          onChange={(e) => void save({ ...b, earlyDays: Number(e.target.value) })}
          className="tap h-9 rounded-xl border border-charcoal/15 bg-cream px-2 text-[13px] font-semibold text-charcoal disabled:opacity-50"
        >
          {DAYS.map((d) => (
            <option key={d} value={d}>
              {d === 0 ? t("Off") : tn(d, "{n} day", "{n} days")}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-charcoal">{t("Waitlist priority")}</p>
          <p className="text-[11.5px] leading-[15px] text-charcoal-faint">{t("Premium members on a waitlist are offered a spot first, then everyone in the order they joined.")}</p>
        </div>
        <Toggle checked={b.waitlistPriority} onChange={(v) => void save({ ...b, waitlistPriority: v })} disabled={disabled} label={t("Waitlist priority")} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-status-high">
          {error}
        </p>
      )}
    </section>
  );
}

const dayText = (d: Date) => formatShortDate(d, { weekday: "short", day: "numeric", month: "short" });

/** The member's class page: the early-booking line, and the waitlist line where priority is on. */
export function ClassPremiumLines({ businessId, startsAt, windowDays, waitlist }: { businessId: string | null | undefined; startsAt: string | null | undefined; windowDays: number | null | undefined; waitlist: boolean }) {
  const { premium } = usePremium();
  const on = !!premium?.premiumOn;
  const booking = useBooking(businessId, on);
  const b = booking.value;
  if (!b) return null;
  const opens = premiumBookingOpensAt(premium, startsAt, windowDays, b.earlyDays);
  const priority = waitlist && showWaitlistPriority(premium, b);
  if (!opens && !priority) return null;
  return (
    <div data-class-premium="" className="mt-1">
      {opens && <p className="text-[12px] leading-[18px] text-charcoal-faint">{t("Premium members can book from {date}", { date: dayText(opens) })}</p>}
      {priority && <p className="text-[12px] leading-[18px] text-charcoal-faint">{t("Premium members are offered a spot first")}</p>}
    </div>
  );
}
