import { useCallback, useEffect, useState } from "react";
import { fetchMyBookingPauses, pauseAt, type MyPause } from "../../services/no-shows";

/**
 * Round F2 AB4: the caller's booking pause at a business now in force
 * (my_booking_pauses), or null. Signed out or unreadable: null, and Book
 * stays (book_class still refuses with ATXS0 and its sentence).
 */
export function useBookingPause(businessId: string | null | undefined, signedIn: boolean): { pause: MyPause | null; reload: () => void } {
  const [pauses, setPauses] = useState<MyPause[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!signedIn || !businessId) return;
    let cancelled = false;
    void fetchMyBookingPauses().then((r) => {
      if (!cancelled && r.ok) setPauses(r.value);
    });
    return () => {
      cancelled = true;
    };
  }, [businessId, signedIn, tick]);
  const reload = useCallback(() => setTick((x) => x + 1), []);
  return { pause: signedIn ? pauseAt(pauses, businessId) : null, reload };
}
