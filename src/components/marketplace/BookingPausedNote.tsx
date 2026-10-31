import { CalendarX } from "lucide-react";
import { pausedSentence, type MyPause } from "../../services/no-shows";

/**
 * Round F2 AB4: the calm line the class page shows in place of Book while the
 * member's new bookings at the business are paused (useBookingPause; PLAN
 * AB4: "You missed 3 classes at {gym} in 30 days, so new bookings there are
 * paused until {date}. Your existing bookings are kept."). BusinessClosedNote's
 * style.
 */
export function BookingPausedNote({ pause, gym, className = "" }: { pause: MyPause; gym: string | null; className?: string }) {
  return (
    <div role="status" data-booking-paused="" className={`flex items-start gap-2.5 rounded-2xl bg-cream-soft px-3.5 py-3 ${className}`}>
      <CalendarX size={15} strokeWidth={2} aria-hidden className="shrink-0 mt-0.5 text-charcoal-soft" />
      <p className="m-0 text-[12.5px] leading-[18px] font-semibold text-charcoal-soft">{pausedSentence(pause.businessName ?? gym, pause.pausedUntil)}</p>
    </div>
  );
}
