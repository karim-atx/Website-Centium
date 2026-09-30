import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchMyCv, type MyCv } from "../../services/professional-cv";

/**
 * The signed-in professional's own CV, read from the server.
 *
 * Every write in the editor goes to the server first and patches this state
 * with the row the database returned, so what is on screen is what is stored.
 */
export function useMyCv() {
  const { authUserId } = useApp();
  const [cv, setCv] = useState<MyCv | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!authUserId) return;
    const result = await fetchMyCv(authUserId);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setError(null);
    setCv(result.cv);
  }, [authUserId]);

  useEffect(() => {
    let cancelled = false;
    if (!authUserId) return;
    void fetchMyCv(authUserId).then((result) => {
      if (cancelled) return;
      if (!result.ok) setError(result.message);
      else {
        setError(null);
        setCv(result.cv);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  return { cv, setCv, error, reload, userId: authUserId };
}

/** One past the highest position in a list: where a new entry goes. */
export const nextPosition = (rows: { position: number }[]) =>
  rows.reduce((max, r) => Math.max(max, r.position + 1), 0);
