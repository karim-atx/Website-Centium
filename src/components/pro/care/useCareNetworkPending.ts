import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { fetchPendingCount, subscribeCareChanges } from "../../../services/pro/careNetwork";

/**
 * Release 3 · W6 the More row's Care network badge: how many received items
 * need an answer (referrals a client agreed to, status "sent", and
 * colleagues asking to connect). Re-read when a care notification arrives
 * (pro.referral.received, pro.care_network.request write the inbox). 0 while
 * loading or when it can't be read.
 */
export function useCareNetworkPending(): { count: number } {
  const { authUserId, user } = useApp();
  const [count, setCount] = useState(0);
  const isPro = user.accountType === "professional";
  useEffect(() => {
    if (!authUserId || !isPro) return;
    let live = true;
    const load = () => void fetchPendingCount(authUserId).then((n) => live && n != null && setCount(n));
    load();
    const off = subscribeCareChanges(authUserId, load);
    return () => {
      live = false;
      off();
    };
  }, [authUserId, isPro]);
  return { count };
}
