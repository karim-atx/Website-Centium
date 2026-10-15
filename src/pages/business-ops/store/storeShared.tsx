import { useCallback, useEffect, useRef, useState } from "react";
import { Banknote, Check, CircleX, Hand, House, Package, RotateCcw, Store, Truck, type LucideIcon } from "lucide-react";
import { useBusiness } from "../../../components/business-more/useBusiness";
import { usePoll } from "../../../hooks/usePoll";
import { useActivityRefresh } from "../useActivityRefresh";
import { useNavigate } from "react-router-dom";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { startMemberThread } from "../../../services/messaging";
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

const NO_KINDS: readonly string[] = [];
/** business_activity kinds for the orders list and the appointments diary (B15 DI-03). */
export const ORDER_KINDS = ["order"] as const;
export const APPT_KINDS = ["appointment"] as const;

/**
 * Load, retry and the 2-minute polling fallback while the page is visible
 * (D2). With `live`, B15 realtime too (OP1-001 S7, OP1-020 S3): a new
 * business_activity row of one of its kinds refreshes quietly. A failed
 * refresh keeps what is on screen.
 */
export function useLive<T>(load: (() => Promise<Load<T>>) | null, pollMs = 120000, dep = "", live?: { businessId: string | null; kinds: readonly string[] }) {
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
  useActivityRefresh(key !== "off" ? live?.businessId : null, live?.kinds ?? NO_KINDS, () => void run(true));
  return { state, reload: () => void run(false), refresh: () => run(true) };
}

/**
 * Message a client or customer (OURS-OP1-appointments-detail row 6,
 * OURS-OP1-store-order-steps row 13; B7 MB-02): start_member_thread(business,
 * person) opens (or finds) the business's one thread with them and Messages
 * opens on it. Gate messages; the server answers ATX96 unless the person is
 * the business's own (business_relationship_is_recent covers appointments
 * and store orders).
 */
export function useMessagePerson() {
  const access = useConsoleAccess();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const can = access.ready && !!access.businessId && access.meets("messages");
  const open = async (personId: string) => {
    if (!access.businessId || busy) return;
    setBusy(true);
    setError(null);
    const r = await startMemberThread(access.businessId, personId);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    navigate("/app/messages", { state: { threadId: r.threadId } });
  };
  return { can, open, busy, error };
}
