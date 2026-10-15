import { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, Check, CircleX, Hand, House, Package, RotateCcw, Store, Truck, type LucideIcon } from "lucide-react";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { usePoll } from "../../../hooks/usePoll";
import type { Load } from "../../../services/store/backend";
import type { StepGlyph } from "../../../services/store/orderSteps";
import type { StoreOrder } from "../../../services/store/orders";

export const STEP_ICON: Record<StepGlyph, LucideIcon> = {
  check: Check,
  package: Package,
  truck: Truck,
  home: House,
  store: Store,
  hand: Hand,
  "x-circle": CircleX,
  "rotate-ccw": RotateCcw,
  banknote: Banknote,
};

export const STEP_CHIP = {
  done: { label: "Done", tone: "good" },
  next: { label: "Next", tone: "pale" },
  later: { label: "Later", tone: "soft" },
} as const;

/**
 * The customer as this store sees them: the server's label, rendered as sent
 * (B11 store_orders_page: "Member #0042" unless the name is shared, a first
 * name, or "Guest" for a desk sale). Never formatted here.
 */
export function customerLabel(o: { customerLabel: string | null }): string {
  return o.customerLabel ?? "Customer";
}

/** The label plus the safeguarding flag for list subs ("Member #0042 · Under 18"). */
export function customerWho(o: { customerLabel: string | null; customerIsMinor?: boolean }): string {
  return o.customerIsMinor ? `${customerLabel(o)} · Under 18` : customerLabel(o);
}

export const methodWord = (o: Pick<StoreOrder, "fulfilment">) => (o.fulfilment === "delivery" ? "Delivery" : "Pickup");

/** The business row this owner manages (id + type), from the B5 business read. */
export function useStoreBusiness() {
  const b = useBusiness();
  return { businessId: b.business?.id ?? null, businessType: b.business?.type ?? null, ready: !b.loading || !!b.business, loadError: !b.business && !!b.error, reload: b.reload };
}

/**
 * Load, retry and the 2-minute polling fallback while the page is visible
 * (D2; realtime is BU2-24). A failed refresh keeps what is on screen.
 */
export function useLive<T>(load: (() => Promise<Load<T>>) | null, pollMs = 120000, dep = "") {
  const [state, setState] = useState<Load<T> | { status: "loading" }>({ status: "loading" });
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  const run = useCallback(async (quiet: boolean) => {
    const fn = loadRef.current;
    if (!fn) return;
    if (!quiet) setState({ status: "loading" });
    const r = await fn();
    setState((prev) => (quiet && r.status === "error" && prev.status === "ok" ? prev : r));
  }, []);
  const key = load ? `on:${dep}` : "off";
  useEffect(() => {
    if (key !== "off") void run(false);
  }, [key, run]);
  usePoll(() => void run(true), pollMs || 120000, key !== "off" && pollMs > 0);
  return { state, reload: () => void run(false), refresh: () => run(true) };
}
