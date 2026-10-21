import { Info } from "lucide-react";
import { closedLine, type BusinessStatus } from "../../services/business-closure/logic";

/**
 * CP: the calm line a public page shows in place of buy and book when the
 * business is closed or paused (useBusinessStatus). Renders nothing while it
 * takes new activity, or while that isn't known.
 */
export function BusinessClosedNote({ status, what = "bookings", className = "mt-3" }: { status: BusinessStatus; what?: "bookings" | "orders"; className?: string }) {
  const line = closedLine(status, what);
  if (!line) return null;
  return (
    <div role="status" data-business-closed={status} className={`flex items-start gap-2.5 rounded-2xl bg-cream-soft px-3.5 py-3 ${className}`}>
      <Info size={15} strokeWidth={2} aria-hidden className="shrink-0 mt-0.5 text-charcoal-soft" />
      <p className="m-0 text-[12.5px] leading-[18px] font-semibold text-charcoal-soft">{line}</p>
    </div>
  );
}
