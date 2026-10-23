import { useEffect, useState } from "react";
import { useApp } from "../../../context/AppContext";
import { useBusiness } from "../../../components/business-more/useBusiness";
import type { BizKind } from "../../../components/business-more/kind";
import { fetchMayHire } from "../../../services/hiring";

// Market + Share 3.0 · the business every Hiring page works for.
// Hiring's rule is the server's: business_may_hire(p_business_id) (Database
// #38: business_type 'gym' or 'studio'). Anything else gets the pages' quiet
// "Hiring is for gyms and studios." state, and the server refuses its writes
// with ATXH0 anyway.

export interface HiringBusiness {
  businessId: string | null;
  businessName: string;
  kind: BizKind;
  /** business_may_hire answered true. */
  canHire: boolean;
  isOwner: boolean;
  /** The row, the lane or the may-hire answer is still loading. */
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useHiringBusiness(): HiringBusiness {
  const { authUserId } = useApp();
  const b = useBusiness();
  const id = b.business?.id ?? null;
  const [may, setMay] = useState<{ id: string; ok: boolean } | null>(null);
  useEffect(() => {
    if (!id) return;
    let live = true;
    void fetchMayHire(id).then((r) => live && setMay({ id, ok: r.ok && r.value }));
    return () => {
      live = false;
    };
  }, [id]);
  const answered = may && may.id === id ? may : null;
  return {
    businessId: id,
    businessName: b.business?.name ?? "",
    kind: b.kind,
    canHire: !!answered?.ok,
    isOwner: !!b.business && b.business.ownerId === authUserId,
    loading: !b.laneSettled || (b.loading && !b.business) || (!!id && !answered),
    error: b.error,
    reload: b.reload,
  };
}
