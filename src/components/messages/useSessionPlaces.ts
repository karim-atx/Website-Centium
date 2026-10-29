import { useCallback, useEffect, useState } from "react";
import { usePoll } from "../../hooks/usePoll";
import { fetchSessionPlaces } from "../../services/messaging/sessionPlaces";
import { PLACES_BATCH, type SessionPlaces } from "../../services/messaging/groupCardsModel";

/**
 * Round D · places on the session cards in view (shared_session_places): read
 * once for the newest 200 cards whenever the set changes, and again every
 * minute while the chat is open, so other members' bookings show up. `set`
 * puts one card's answer in straight after a booking or a cancel.
 */
export function useSessionPlaces(messageIds: string[], enabled: boolean) {
  const [places, setPlaces] = useState<Record<string, SessionPlaces>>({});
  const ids = messageIds.slice(-PLACES_BATCH);
  const key = ids.join(",");

  const refresh = useCallback(async () => {
    if (!enabled || !key) return;
    const next = await fetchSessionPlaces(key.split(","));
    setPlaces(next);
  }, [enabled, key]);

  useEffect(() => {
    void refresh();
  }, [refresh]);
  usePoll(() => void refresh(), 60000, enabled && !!key);

  const set = useCallback((p: SessionPlaces) => setPlaces((prev) => ({ ...prev, [p.messageId]: p })), []);
  return { places, set, refresh };
}
