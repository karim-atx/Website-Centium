import { useApp } from "../../../context/AppContext";
import { useBusiness } from "../../../components/business-more/useBusiness";
import type { BizKind } from "../../../components/business-more/kind";

// Market + Share 3.0 · W4 · the business every Hiring page works for.
// Hiring is for gyms and studios only (PLAN §2.2 DB8, `not_a_gym`): a gym
// (BizKind "gym") or a classes studio (BizKind "classes"). A store gets the
// pages' quiet "Hiring is for gyms and studios." state.

export interface HiringBusiness {
  businessId: string | null;
  businessName: string;
  kind: BizKind;
  /** Gym or studio: may hire. */
  canHire: boolean;
  isOwner: boolean;
  /** The row or the lane is still loading. */
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useHiringBusiness(): HiringBusiness {
  const { authUserId } = useApp();
  const b = useBusiness();
  return {
    businessId: b.business?.id ?? null,
    businessName: b.business?.name ?? "",
    kind: b.kind,
    canHire: b.kind === "gym" || b.kind === "classes",
    isOwner: !!b.business && b.business.ownerId === authUserId,
    loading: !b.laneSettled || (b.loading && !b.business),
    error: b.error,
    reload: b.reload,
  };
}
