import { useCallback, useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchBusinessFull, type BusinessFull } from "../../services/business-more";
import { bizKindOf, type BizKind } from "./kind";

export interface UseBusiness {
  business: BusinessFull | null;
  /** The lane for per-type rows: the stored type, else the onboarding type. */
  kind: BizKind;
  /** False until the lane is known (the row has loaded, or onboarding chose a type). */
  kindKnown: boolean;
  loading: boolean;
  error: string | null;
  reload: () => void;
  setBusiness: (b: BusinessFull) => void;
}

/**
 * The business row (B5 columns included) for the signed-in owner. The lane
 * reads business_profiles.business_type when the row exists, and otherwise
 * the type chosen at onboarding (user.businessType), so a business that has
 * not saved its listing yet still gets its own vocabulary.
 */
export function useBusiness(): UseBusiness {
  const { authUserId, profileReady, user } = useApp();
  const [business, setBusiness] = useState<BusinessFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!profileReady || !authUserId) return;
    let cancelled = false;
    void fetchBusinessFull(authUserId).then((r) => {
      if (cancelled) return;
      setLoading(false);
      if (!r.ok) {
        setError(r.message);
        return;
      }
      setError(null);
      setBusiness(r.value);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, profileReady, tick]);

  const reload = useCallback(() => {
    setLoading(true);
    setTick((t) => t + 1);
  }, []);

  const type = business?.type ?? user.businessType;
  return { business, kind: bizKindOf(type), kindKnown: !!business || (!loading && !!user.businessType), loading, error, reload, setBusiness };
}
