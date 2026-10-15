import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { fetchProfileFacts, type ProfileFacts } from "../../../services/pro/profile";

/**
 * The professional_profiles facts the profile screens read, with the states
 * every data screen has: loading (null data, no error), error with retry,
 * offline (the last answer kept).
 */
export function useProfileFacts() {
  const { authUserId } = useApp();
  const [data, setData] = useState<ProfileFacts | null>(null);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);

  const load = useCallback(async () => {
    if (!authUserId) return;
    const r = await fetchProfileFacts(authUserId);
    if (r.ok) {
      setData(r.data);
      setError(false);
      setOffline(false);
    } else {
      setOffline(r.offline);
      setError(true);
    }
  }, [authUserId]);

  useEffect(() => {
    let live = true;
    void Promise.resolve().then(() => live && void load());
    return () => {
      live = false;
    };
  }, [load]);

  return { facts: data, setFacts: setData, error, offline, reload: load };
}
