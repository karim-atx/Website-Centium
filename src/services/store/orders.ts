import { db, loadFail, writeFail, type Load, type Write } from "./backend";
import { num, pageFacts, toMyOrder, toOrder, toReturn, withFacts, type PageFacts, type Row } from "./mapping";

// Store orders and returns (B11 · ST-02, ST-03, ST-05), both sides. Names are
// HANDOVER_API.md "B11 · Store" (20261121260000):
//   store_orders (RLS: the customer's own, or the store with `store`),
//   store_order_items (same), store_returns (same; items = [{item_id, quantity}])
//   store_orders_page(p_business_id, p_status, p_search, p_limit, p_offset):
//     the masked customer label + minor flag + open_return, store only
//   advance_order_status(p_order_id, p_status) → void (pushes order_update)
//   mark_order_paid(p_order_id) → void
//   cancel_order(p_order_id, p_reason) → { paid_to_refund }
//   respond_return(p_return_id, p_status, p_refund_amount) → void
//     (the refunded step records the refund: `revenue` as well as `store`)
//   place_order(...) → uuid · my_orders(p_limit, p_offset) · request_return(...) → uuid
//   store_low_stock / store_sales_summary / store_top_products
// The delivery address is visible to that store for that order only and is
// cleared 90 days after the order ends: a null address on an old order is
// expected, not an error. Money: cash only today, and every amount here is
// what the store recorded, never a payment Centium processed.

import type { CustomerOrder, Fulfilment, OrderStatus, ReturnKind, ReturnStatus, StoreOrder, StoreReturn } from "./types";
export type { CustomerOrder, Fulfilment, OrderItem, OrderStatus, PayMethod, PayStatus, ReturnKind, ReturnStatus, StoreOrder, StoreReturn } from "./types";

/** V6-158: the return reasons, our short list (recorded as OURS). */
export const RETURN_REASONS = ["Unopened", "Damaged", "Wrong item", "Changed my mind"] as const;

const ITEM_COLS = "id, order_id, offering_id, name, unit_price, quantity, line_total";
const ORDER_COLS =
  "id, business_id, order_number, customer_id, fulfilment, delivery_address, subtotal, delivery_fee, total, payment_method, payment_status, paid_at, status, note, placed_at, packed_at, completed_at, cancelled_at, cancel_reason";
const ORDER_SELECT = `${ORDER_COLS}, store_order_items(${ITEM_COLS})`;
const RETURN_SELECT = `id, order_id, business_id, customer_id, kind, status, reason, items, refund_amount, created_at, resolved_at, store_orders(order_number, placed_at, payment_method, store_order_items(${ITEM_COLS}))`;

/** The most rows one screen reads (the lists page 30 at a time on screen). */
const MAX_ROWS = 1000;
const PAGE = 200;

// ---------------------------------------------------------------------------
// Business side

/** store_orders_page in pages of 200: every order's label, minor flag and open return. */
async function readFacts(businessId: string, search: string | null = null, limit = PAGE): Promise<Load<Map<string, PageFacts>>> {
  const facts = new Map<string, PageFacts>();
  for (let offset = 0; offset < MAX_ROWS; offset += PAGE) {
    const { data, error } = await db.rpc("store_orders_page", { p_business_id: businessId, p_status: null, p_search: search, p_limit: Math.min(limit, PAGE), p_offset: offset });
    if (error) return loadFail(error, "Could not read the orders page");
    const rows = (data ?? []) as Row[];
    for (const r of rows) facts.set(String(r.order_id), pageFacts(r));
    const total = num(rows[0]?.total_count);
    if (rows.length < PAGE || facts.size >= total || limit <= PAGE) break;
  }
  return { status: "ok", value: facts };
}

/** Every order of this store with its items and the server's customer label, newest first. */
export async function fetchStoreOrders(businessId: string): Promise<Load<StoreOrder[]>> {
  const [rows, facts] = await Promise.all([
    db.from("store_orders").select(ORDER_SELECT).eq("business_id", businessId).order("placed_at", { ascending: false }).limit(MAX_ROWS),
    readFacts(businessId, null, MAX_ROWS),
  ]);
  if (rows.error) return loadFail(rows.error, "Could not read the orders");
  if (facts.status !== "ok") return facts;
  return { status: "ok", value: ((rows.data ?? []) as Row[]).map((r) => withFacts(toOrder(r), facts.value.get(String(r.id)))) };
}

/** One order as its store sees it (label from store_orders_page, searched by its number). */
export async function fetchStoreOrder(orderId: string): Promise<Load<StoreOrder | null>> {
  const { data, error } = await db.from("store_orders").select(ORDER_SELECT).eq("id", orderId).maybeSingle();
  if (error) return loadFail(error, "Could not read the order");
  if (!data) return { status: "ok", value: null };
  const o = toOrder(data as Row);
  const facts = await readFacts(o.businessId, String(o.number), 1);
  if (facts.status !== "ok") return facts;
  return { status: "ok", value: withFacts(o, facts.value.get(o.id)) };
}

export async function fetchStoreReturns(businessId: string): Promise<Load<StoreReturn[]>> {
  const { data, error } = await db.from("store_returns").select(RETURN_SELECT).eq("business_id", businessId).order("created_at", { ascending: false }).limit(MAX_ROWS);
  if (error) return loadFail(error, "Could not read the returns");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toReturn) };
}

export async function fetchStoreReturn(returnId: string): Promise<Load<StoreReturn | null>> {
  const { data, error } = await db.from("store_returns").select(RETURN_SELECT).eq("id", returnId).maybeSingle();
  if (error) return loadFail(error, "Could not read the return");
  if (!data) return { status: "ok", value: null };
  const r = toReturn(data as Row);
  if (r.orderNumber === null) return { status: "ok", value: r };
  const facts = await readFacts(String((data as Row).business_id), String(r.orderNumber), 1);
  if (facts.status !== "ok") return facts;
  return { status: "ok", value: { ...r, customerLabel: facts.value.get(r.orderId)?.label ?? null } };
}

/** Move an order one step (the server pushes the customer an order_update). */
export async function advanceOrder(orderId: string, status: OrderStatus): Promise<Write<null>> {
  const { error } = await db.rpc("advance_order_status", { p_order_id: orderId, p_status: status });
  if (error) return writeFail(error, "Could not advance the order");
  return { ok: true, value: null };
}

/**
 * Cancel (store or customer). Stock goes back and an unpaid order's money is
 * voided by the server; a paid order stays paid and `paidToRefund` says the
 * refund still has to be recorded (Revenue, RV-04).
 */
export async function cancelOrder(orderId: string, reason: string | null): Promise<Write<{ paidToRefund: boolean }>> {
  const { data, error } = await db.rpc("cancel_order", { p_order_id: orderId, p_reason: reason });
  if (error) return writeFail(error, "Could not cancel the order");
  const row = (Array.isArray(data) ? data[0] : data) as Row | null;
  return { ok: true, value: { paidToRefund: row?.paid_to_refund === true } };
}

/** The store records that the cash was received (never a processed payment). */
export async function markOrderPaid(orderId: string): Promise<Write<null>> {
  const { error } = await db.rpc("mark_order_paid", { p_order_id: orderId });
  if (error) return writeFail(error, "Could not mark the order paid");
  return { ok: true, value: null };
}

/** requested → approved | rejected → received → refunded (refund needs `revenue` and an amount). */
export async function respondReturn(returnId: string, status: ReturnStatus, refundAmount: number | null = null): Promise<Write<null>> {
  const { error } = await db.rpc("respond_return", { p_return_id: returnId, p_status: status, p_refund_amount: status === "refunded" ? refundAmount : null });
  if (error) return writeFail(error, "Could not update the return");
  return { ok: true, value: null };
}

export interface LowStockRow {
  id: string;
  name: string;
  stock: number;
  visible: boolean;
}

/** Products under `below` left (store_low_stock). */
export async function fetchLowStock(businessId: string, below = 5): Promise<Load<LowStockRow[]>> {
  const { data, error } = await db.rpc("store_low_stock", { p_business_id: businessId, p_below: below });
  if (error) return loadFail(error, "Could not read low stock");
  return {
    status: "ok",
    value: ((data ?? []) as Row[]).map((r) => ({ id: String(r.offering_id), name: String(r.title ?? ""), stock: num(r.stock), visible: r.visible !== false })),
  };
}

export interface SalesSummary {
  orders: number;
  units: number;
  sales: number;
  averageOrder: number;
  cancelled: number;
  /** null when no order counts (the server's nullif). */
  returnedPct: number | null;
}

/** store_sales_summary for [from, to] (YYYY-MM-DD, the business's own days). */
export async function fetchSalesSummary(businessId: string, from: string, to: string): Promise<Load<SalesSummary>> {
  const { data, error } = await db.rpc("store_sales_summary", { p_business_id: businessId, p_from: from, p_to: to });
  if (error) return loadFail(error, "Could not read the sales summary");
  const r = ((Array.isArray(data) ? data[0] : data) ?? {}) as Row;
  return {
    status: "ok",
    value: {
      orders: num(r.orders),
      units: num(r.units),
      sales: num(r.sales),
      averageOrder: num(r.average_order),
      cancelled: num(r.cancelled),
      returnedPct: r.returned_pct === null || r.returned_pct === undefined ? null : num(r.returned_pct),
    },
  };
}

export interface TopProduct {
  offeringId: string | null;
  name: string;
  units: number;
  sales: number;
}

export async function fetchTopProducts(businessId: string, from: string, to: string, limit = 5): Promise<Load<TopProduct[]>> {
  const { data, error } = await db.rpc("store_top_products", { p_business_id: businessId, p_from: from, p_to: to, p_limit: limit });
  if (error) return loadFail(error, "Could not read the top products");
  return {
    status: "ok",
    value: ((data ?? []) as Row[]).map((r) => ({ offeringId: typeof r.offering_id === "string" ? r.offering_id : null, name: String(r.name ?? ""), units: num(r.units), sales: num(r.sales) })),
  };
}

// ---------------------------------------------------------------------------
// Customer side

/** The signed-in customer's orders, newest first (my_orders). */
export async function fetchMyOrders(): Promise<Load<StoreOrder[]>> {
  const { data, error } = await db.rpc("my_orders", { p_limit: PAGE, p_offset: 0 });
  if (error) return loadFail(error, "Could not read your orders");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toMyOrder) };
}

const RETURN_DAYS = 30;
const OPEN_RETURN: ReturnStatus[] = ["requested", "approved", "received"];

/** One of the customer's own orders, with its latest return. */
export async function fetchMyOrder(orderId: string, now = Date.now()): Promise<Load<{ order: StoreOrder; ret: StoreReturn | null } | null>> {
  const [o, r] = await Promise.all([
    db.from("store_orders").select(`${ORDER_SELECT}, business_profiles(business_name)`).eq("id", orderId).maybeSingle(),
    db.from("store_returns").select(RETURN_SELECT).eq("order_id", orderId).order("created_at", { ascending: false }).limit(1),
  ]);
  if (o.error) return loadFail(o.error, "Could not read your order");
  if (!o.data) return { status: "ok", value: null };
  const order = toOrder(o.data as Row);
  const ret = !r.error && r.data?.[0] ? toReturn(r.data[0] as Row) : null;
  const open = ret && OPEN_RETURN.includes(ret.status) ? ret.status : null;
  // The same rule my_orders answers with (completed in the last 30 days, no open return).
  const canReturn = order.status === "completed" && !!order.completedAt && now - new Date(order.completedAt).getTime() <= RETURN_DAYS * 86400000 && !open;
  return { status: "ok", value: { order: { ...order, openReturn: open, canReturn }, ret } };
}

export async function requestReturn(orderId: string, items: { itemId: string; qty: number }[], kind: ReturnKind, reason: string): Promise<Write<string>> {
  const { data, error } = await db.rpc("request_return", {
    p_order_id: orderId,
    p_items: items.map((i) => ({ item_id: i.itemId, quantity: i.qty })),
    p_kind: kind,
    p_reason: reason,
  });
  if (error) return writeFail(error, "Could not request the return");
  return { ok: true, value: String(data ?? "") };
}

export interface PlaceOrderInput {
  businessId: string;
  fulfilment: Fulfilment;
  items: { offeringId: string; qty: number }[];
  deliveryAddress: string | null;
  note: string | null;
}

/** place_order: prices, fee and stock are the server's (never the cart's). Cash only today. */
export async function placeOrder(input: PlaceOrderInput): Promise<Write<string>> {
  const { data, error } = await db.rpc("place_order", {
    p_business_id: input.businessId,
    p_items: input.items.map((i) => ({ offering_id: i.offeringId, quantity: i.qty })),
    p_fulfilment: input.fulfilment,
    p_delivery_address: input.deliveryAddress,
    p_payment_method: "cash",
    p_note: input.note,
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

/** Who ordered when (the Customers section's counts). Read with `store`; RLS returns nothing without it. */
export async function fetchCustomerOrders(businessId: string): Promise<Load<CustomerOrder[]>> {
  const { data, error } = await db.from("store_orders").select("customer_id, placed_at, status").eq("business_id", businessId).order("placed_at", { ascending: false }).limit(5000);
  if (error) return loadFail(error, "Could not read who ordered");
  return {
    status: "ok",
    value: ((data ?? []) as Row[]).map((r) => ({ customerId: typeof r.customer_id === "string" ? r.customer_id : null, placedAt: String(r.placed_at ?? ""), status: (r.status as OrderStatus) ?? "placed" })),
  };
}
