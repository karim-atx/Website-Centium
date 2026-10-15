import { useEffect, useState } from "react";
import { fetchPaidHistory, type PaidEntry } from "../../../services/business-revenue";

/**
 * A person's latest paid payments at the business (AN14-044 B1 "Recent
 * payments", AN14-068 row 4 "Last payments"). Null while loading, when there
 * is no person, or when the read is refused: the block is then omitted.
 */
export function usePaidHistory(
  businessId: string | null,
  personId: string | null,
  limit: number,
): PaidEntry[] | null {
  const key = `${businessId}|${personId}|${limit}`;
  const [got, setGot] = useState<{ key: string; rows: PaidEntry[] } | null>(null);
  useEffect(() => {
    if (!businessId || !personId) return;
    let alive = true;
    void fetchPaidHistory(businessId, personId, limit).then((r) => {
      if (alive && r.ok) setGot({ key, rows: r.value });
    });
    return () => {
      alive = false;
    };
  }, [businessId, personId, limit, key]);
  return got && got.key === key ? got.rows : null;
}
