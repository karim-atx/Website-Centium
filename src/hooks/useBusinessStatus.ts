import { useEffect, useState } from "react";
import { fetchBusinessStatus, type BusinessStatus } from "../services/business-closure";

/**
 * CP: whether the business behind a public page takes new bookings and sales
 * (services/business-closure). "unknown" while loading or without a business
 * id, so a page keeps its actions until it knows; the server refuses a closed
 * or paused business with ATXAB either way.
 */
export function useBusinessStatus(businessId: string | null | undefined): BusinessStatus {
  const [state, setState] = useState<{ id: string; status: BusinessStatus } | null>(null);
  useEffect(() => {
    if (!businessId) return;
    let live = true;
    void fetchBusinessStatus(businessId).then((status) => {
      if (live) setState({ id: businessId, status });
    });
    return () => {
      live = false;
    };
  }, [businessId]);
  return businessId && state?.id === businessId ? state.status : "unknown";
}
