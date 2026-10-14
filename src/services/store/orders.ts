import { db, loadFail, num, str, writeFail, type Load, type Write } from "./backend";

// Store orders and returns (B11 · ST-02, ST-03), both sides.
//
// CONTRACT ASSUMED (BACKEND_REQUIREMENTS-v6 ST-02 / ST-03; re-check against
// HANDOVER_API.md "B11" when it lands, and change the names here only):
//   store_orders(id, business_id, number, customer_id, customer_name,
//     customer_phone, fulfilment pickup|delivery, delivery_address,
//     delivery_fee, subtotal, total, currency, payment_method cash|whish,
//     paid_at, status placed|packed|out_for_delivery|ready_for_pickup|
//     completed|cancelled|returned, placed_at, packed_at,
//     out_for_delivery_at, ready_at, completed_at, cancelled_at,
//     refund_amount, refund_method, refunded_at)
//   store_order_items(id, order_id, offering_id, name, variant, unit_price, qty)
//   store_returns(id, order_id, business_id, customer_id, reason, note, kind,
//     status requested|approved|received|refunded|rejected, refund_amount,
//     requested_at, approved_at, received_at, refunded_at, rejected_at,
//     store_return_items(order_item_id, qty))
//   advance_order_status(p_order_id, p_status) → { notified boolean }
//   cancel_order(p_order_id, p_reason) → { notified boolean }
//   set_return_status(p_return_id, p_status) → { notified boolean }
//   request_return(p_order_id, p_items jsonb, p_reason, p_note) → uuid
// RLS (B11): a store reads only its own orders; a customer only their own.
// The delivery address is visible to that store for that order only and is
// cleared 90 days after completion (V6-38): a null address on an old order
// is expected, not an error.

export type OrderStatus = "placed" | "packed" | "out_for_delivery" | "ready_for_pickup" | "completed" | "cancelled" | "returned";
export type Fulfilment = "delivery" | "pickup";
export type PayMethod = "cash" | "whish";

export interface OrderItem {
  id: string;
  offeringId: string | null;
  name: string;
  variant: string | null;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface StoreOrder {
  id: string;
  businessId: string;
  number: number;
  customerId: string | null;
  customerName: string | null;
  customerPhone: string | null;
  fulfilment: Fulfilment;
  deliveryAddress: string | null;
  deliveryFee: number;
  subtotal: number;
  total: number;
  paymentMethod: PayMethod;
  paidAt: string | null;
  status: OrderStatus;
  placedAt: string;
  packedAt: string | null;
  outAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  refundAmount: number | null;
  refundMethod: PayMethod | null;
  refundedAt: string | null;
  items: OrderItem[];
  /** Store name, on the customer's own reads. */
  storeName: string | null;
}

export type ReturnStatus = "requested" | "approved" | "received" | "refunded" | "rejected";

export interface StoreReturn {
  id: string;
  orderId: string;
  orderNumber: number | null;
  orderPlacedAt: string | null;
  customerName: string | null;
  reason: string;
  note: string | null;
  status: ReturnStatus;
  paymentMethod: PayMethod;
  refundAmount: number;
  requestedAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  refundedAt: string | null;
  rejectedAt: string | null;
  items: { name: string; variant: string | null; qty: number; amount: number }[];
}

/** V6-158: the return reasons, our short list (recorded as OURS). */
export const RETURN_REASONS = ["Unopened", "Damaged", "Wrong item", "Changed my mind"] as const;

const ORDER_SELECT = "*, store_order_items(*)";
const RETURN_SELECT = "*, store_orders(number, placed_at, customer_name, payment_method), store_return_items(qty, store_order_items(name, variant, unit_price))";

type Row = Record<string, unknown>;

export function toOrder(r: Row): StoreOrder {
  const items = ((r.store_order_items as Row[] | null) ?? []).map((i) => {
    const qty = num(i.qty) || 1;
    const unit = num(i.unit_price);
    return {
      id: String(i.id),
      offeringId: str(i.offering_id),
      name: String(i.name ?? ""),
      variant: str(i.variant),
      qty,
      unitPrice: unit,
      lineTotal: i.line_total !== undefined && i.line_total !== null ? num(i.line_total) : unit * qty,
    };
  });
  const biz = r.business_profiles as Row | null | undefined;
  return {
    id: String(r.id),
    businessId: String(r.business_id ?? ""),
    number: num(r.number),
    customerId: str(r.customer_id),
    customerName: str(r.customer_name),
    customerPhone: str(r.customer_phone),
    fulfilment: r.fulfilment === "pickup" ? "pickup" : "delivery",
    deliveryAddress: str(r.delivery_address),
    deliveryFee: num(r.delivery_fee),
    subtotal: num(r.subtotal),
    total: num(r.total),
    paymentMethod: r.payment_method === "whish" ? "whish" : "cash",
    paidAt: str(r.paid_at),
    status: (str(r.status) as OrderStatus) ?? "placed",
    placedAt: String(r.placed_at ?? r.created_at ?? new Date().toISOString()),
    packedAt: str(r.packed_at),
    outAt: str(r.out_for_delivery_at),
    readyAt: str(r.ready_at),
    completedAt: str(r.completed_at),
    cancelledAt: str(r.cancelled_at),
    refundAmount: r.refund_amount === null || r.refund_amount === undefined ? null : num(r.refund_amount),
    refundMethod: r.refund_method === "whish" ? "whish" : r.refund_method === "cash" ? "cash" : null,
    refundedAt: str(r.refunded_at),
    items,
    storeName: biz ? str(biz.business_name) : null,
  };
}

export function toReturn(r: Row): StoreReturn {
  const o = (r.store_orders as Row | null) ?? null;
  const items = ((r.store_return_items as Row[] | null) ?? []).map((i) => {
    const oi = (i.store_order_items as Row | null) ?? {};
    const qty = num(i.qty) || 1;
    return { name: String(oi.name ?? ""), variant: str(oi.variant), qty, amount: num(oi.unit_price) * qty };
  });
  return {
    id: String(r.id),
    orderId: String(r.order_id ?? ""),
    orderNumber: o ? num(o.number) : null,
    orderPlacedAt: o ? str(o.placed_at) : null,
    customerName: o ? str(o.customer_name) : null,
    reason: String(r.reason ?? ""),
    note: str(r.note),
    status: (str(r.status) as ReturnStatus) ?? "requested",
    paymentMethod: o && o.payment_method === "whish" ? "whish" : "cash",
    refundAmount: r.refund_amount !== null && r.refund_amount !== undefined ? num(r.refund_amount) : items.reduce((s, i) => s + i.amount, 0),
    requestedAt: String(r.requested_at ?? r.created_at ?? new Date().toISOString()),
    approvedAt: str(r.approved_at),
    receivedAt: str(r.received_at),
    refundedAt: str(r.refunded_at),
    rejectedAt: str(r.rejected_at),
    items,
  };
}

// ---------------------------------------------------------------------------
// Business side

/** Every order of this store, newest first (the tabs split them client-side). */
export async function fetchStoreOrders(businessId: string): Promise<Load<StoreOrder[]>> {
  const { data, error } = await db.from("store_orders").select(ORDER_SELECT).eq("business_id", businessId).order("placed_at", { ascending: false });
  if (error) return loadFail(error, "Could not read the orders");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toOrder) };
}

export async function fetchOrder(orderId: string): Promise<Load<StoreOrder | null>> {
  const { data, error } = await db.from("store_orders").select(ORDER_SELECT + ", business_profiles(business_name)").eq("id", orderId).maybeSingle();
  if (error) return loadFail(error, "Could not read the order");
  return { status: "ok", value: data ? toOrder(data as Row) : null };
}

export async function fetchStoreReturns(businessId: string): Promise<Load<StoreReturn[]>> {
  const { data, error } = await db.from("store_returns").select(RETURN_SELECT).eq("business_id", businessId).order("requested_at", { ascending: false });
  if (error) return loadFail(error, "Could not read the returns");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toReturn) };
}

export async function fetchReturn(returnId: string): Promise<Load<StoreReturn | null>> {
  const { data, error } = await db.from("store_returns").select(RETURN_SELECT).eq("id", returnId).maybeSingle();
  if (error) return loadFail(error, "Could not read the return");
  return { status: "ok", value: data ? toReturn(data as Row) : null };
}

const notified = (data: unknown): boolean => {
  if (data && typeof data === "object" && "notified" in (data as Row)) return (data as Row).notified !== false;
  return true;
};

/** Move an order one step (BU2-02). `notified` = the customer's message went out. */
export async function advanceOrder(orderId: string, status: OrderStatus): Promise<Write<{ notified: boolean }>> {
  const { data, error } = await db.rpc("advance_order_status", { p_order_id: orderId, p_status: status });
  if (error) return writeFail(error, "Could not advance the order");
  return { ok: true, value: { notified: notified(data) } };
}

/** Cancel (store or customer): stock restored, refund record written (cash) by the server (BU2-03). */
export async function cancelOrder(orderId: string, reason: string | null): Promise<Write<{ notified: boolean }>> {
  const { data, error } = await db.rpc("cancel_order", { p_order_id: orderId, p_reason: reason });
  if (error) return writeFail(error, "Could not cancel the order");
  return { ok: true, value: { notified: notified(data) } };
}

export async function setReturnStatus(returnId: string, status: ReturnStatus): Promise<Write<{ notified: boolean }>> {
  const { data, error } = await db.rpc("set_return_status", { p_return_id: returnId, p_status: status });
  if (error) return writeFail(error, "Could not update the return");
  return { ok: true, value: { notified: notified(data) } };
}

// ---------------------------------------------------------------------------
// Customer side

/** The signed-in customer's own orders, newest first, with the store's name. */
export async function fetchMyOrders(customerId: string): Promise<Load<StoreOrder[]>> {
  const { data, error } = await db
    .from("store_orders")
    .select(ORDER_SELECT + ", business_profiles(business_name)")
    .eq("customer_id", customerId)
    .order("placed_at", { ascending: false });
  if (error) return loadFail(error, "Could not read your orders");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toOrder) };
}

export async function fetchMyReturns(customerId: string): Promise<Load<StoreReturn[]>> {
  const { data, error } = await db.from("store_returns").select(RETURN_SELECT).eq("customer_id", customerId).order("requested_at", { ascending: false });
  if (error) return loadFail(error, "Could not read your returns");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toReturn) };
}

export async function requestReturn(
  orderId: string,
  items: { orderItemId: string; qty: number }[],
  reason: string,
  note: string
): Promise<Write<string>> {
  const { data, error } = await db.rpc("request_return", {
    p_order_id: orderId,
    p_items: items.map((i) => ({ order_item_id: i.orderItemId, qty: i.qty })),
    p_reason: reason,
    p_note: note.trim() || null,
  });
  if (error) return writeFail(error, "Could not request the return");
  return { ok: true, value: String(data ?? "") };
}

export interface PlaceOrderInput {
  businessId: string;
  fulfilment: Fulfilment;
  items: { offeringId: string; qty: number }[];
  deliveryAddress: string | null;
  phone: string | null;
}

/** place_order: prices, fee and stock are the server's (prices from data, never from the cart). Cash only today. */
export async function placeOrder(input: PlaceOrderInput): Promise<Write<string>> {
  const { data, error } = await db.rpc("place_order", {
    p_business_id: input.businessId,
    p_fulfilment: input.fulfilment,
    p_items: input.items.map((i) => ({ offering_id: i.offeringId, qty: i.qty })),
    p_delivery_address: input.deliveryAddress,
    p_phone: input.phone,
    p_payment_method: "cash",
  });
  if (error) return writeFail(error, "Could not place the order");
  return { ok: true, value: String(data ?? "") };
}

/** Is B11 on this database? A zero-row read of the orders table answers it. */
export async function storeOrdersShipped(): Promise<boolean | null> {
  const { error } = await db.from("store_orders").select("id").limit(0);
  if (!error) return true;
  const l = loadFail(error, "Could not check the store");
  return l.status === "pending" ? false : null;
}
