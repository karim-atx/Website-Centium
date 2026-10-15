import type {
  Fulfilment,
  OrderItem,
  OrderStatus,
  PayMethod,
  PayStatus,
  Product,
  ProductCategory,
  ReturnKind,
  ReturnStatus,
  StoreOrder,
  StoreReturn,
  OfferingCategory,
} from "./types";

// B11 rows → the app's shapes, and the store's error codes → sentences.
// Pure (no Supabase import) so node:test covers every mapping
// (mapping.test.ts). Names follow HANDOVER_API.md B11 and the local
// functions' RETURNS TABLE columns.

export type Row = Record<string, unknown>;

/** A count of money from PostgREST's numeric string or a number. */
export function num(v: unknown): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

export const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v : null);

const ORDER_STATUSES: OrderStatus[] = ["placed", "packed", "out_for_delivery", "ready_for_pickup", "completed", "cancelled", "returned"];
const RETURN_STATUSES: ReturnStatus[] = ["requested", "approved", "received", "refunded", "rejected"];

const orderStatus = (v: unknown): OrderStatus => (ORDER_STATUSES.includes(v as OrderStatus) ? (v as OrderStatus) : "placed");
export const returnStatus = (v: unknown): ReturnStatus | null => (RETURN_STATUSES.includes(v as ReturnStatus) ? (v as ReturnStatus) : null);
const fulfilment = (v: unknown): Fulfilment => (v === "pickup" ? "pickup" : "delivery");
const payMethod = (v: unknown): PayMethod => (v === "whish" ? "whish" : "cash");
const payStatus = (v: unknown): PayStatus => (v === "paid" ? "paid" : v === "refunded" ? "refunded" : "pending");

export function toItem(i: Row): OrderItem {
  const qty = num(i.quantity) || 1;
  const unit = num(i.unit_price);
  return {
    id: String(i.id),
    offeringId: str(i.offering_id),
    name: String(i.name ?? ""),
    qty,
    unitPrice: unit,
    lineTotal: i.line_total !== undefined && i.line_total !== null ? num(i.line_total) : unit * qty,
  };
}

/** A store_orders row (with store_order_items embedded, and business_profiles on the customer's reads). */
export function toOrder(r: Row): StoreOrder {
  const items = ((r.store_order_items as Row[] | null) ?? []).map(toItem);
  const biz = r.business_profiles as Row | null | undefined;
  const status = orderStatus(r.status);
  return {
    id: String(r.id),
    businessId: String(r.business_id ?? ""),
    number: num(r.order_number),
    customerId: str(r.customer_id),
    customerLabel: null,
    customerIsMinor: false,
    fulfilment: fulfilment(r.fulfilment),
    deliveryAddress: str(r.delivery_address),
    deliveryFee: num(r.delivery_fee),
    subtotal: num(r.subtotal),
    total: num(r.total),
    paymentMethod: payMethod(r.payment_method),
    paymentStatus: payStatus(r.payment_status),
    paidAt: str(r.paid_at),
    status,
    placedAt: String(r.placed_at ?? ""),
    packedAt: str(r.packed_at),
    completedAt: str(r.completed_at),
    cancelledAt: str(r.cancelled_at),
    cancelReason: str(r.cancel_reason),
    note: str(r.note),
    itemCount: items.reduce((s, i) => s + i.qty, 0),
    items,
    storeName: biz ? str(biz.business_name) : null,
    openReturn: null,
    canCancel: status === "placed",
    canReturn: false,
  };
}

/** What store_orders_page adds to a store's own row: the masked label, the minor flag, the open return. */
export interface PageFacts {
  label: string;
  isMinor: boolean;
  openReturn: ReturnStatus | null;
}

export function pageFacts(r: Row): PageFacts {
  return {
    label: str(r.customer_label) ?? "Guest",
    isMinor: r.customer_is_minor === true,
    openReturn: returnStatus(r.open_return),
  };
}

export function withFacts(o: StoreOrder, f: PageFacts | undefined): StoreOrder {
  if (!f) return o;
  return { ...o, customerLabel: f.label, customerIsMinor: f.isMinor, openReturn: f.openReturn };
}

/** A my_orders row (the customer's list: no items, no address). */
export function toMyOrder(r: Row): StoreOrder {
  const status = orderStatus(r.status);
  return {
    id: String(r.order_id),
    businessId: String(r.business_id ?? ""),
    number: num(r.order_number),
    customerId: null,
    customerLabel: null,
    customerIsMinor: false,
    fulfilment: fulfilment(r.fulfilment),
    deliveryAddress: null,
    deliveryFee: 0,
    subtotal: num(r.total),
    total: num(r.total),
    paymentMethod: "cash",
    paymentStatus: payStatus(r.payment_status),
    paidAt: null,
    status,
    placedAt: String(r.placed_at ?? ""),
    packedAt: null,
    completedAt: null,
    cancelledAt: null,
    cancelReason: null,
    note: null,
    itemCount: num(r.item_count),
    items: [],
    storeName: str(r.business_name),
    openReturn: null,
    canCancel: r.can_cancel === true,
    canReturn: r.can_return === true,
  };
}

/**
 * A store_returns row with its order embedded
 * (store_orders(order_number, placed_at, payment_method, store_order_items(...))).
 * `items` is the customer's [{ item_id, quantity }]; names and prices come
 * from the order's own lines.
 */
export function toReturn(r: Row): StoreReturn {
  const o = (r.store_orders as Row | null) ?? null;
  const lines = new Map(((o?.store_order_items as Row[] | null) ?? []).map((i) => [String(i.id), toItem(i)]));
  const raw = Array.isArray(r.items) ? (r.items as Row[]) : [];
  const items = raw.map((e) => {
    const itemId = String(e.item_id ?? "");
    const line = lines.get(itemId);
    const qty = num(e.quantity) || 1;
    return { itemId, name: line?.name ?? "Item", qty, amount: (line?.unitPrice ?? 0) * qty };
  });
  const status = returnStatus(r.status) ?? "requested";
  const recorded = r.refund_amount !== null && r.refund_amount !== undefined ? num(r.refund_amount) : null;
  return {
    id: String(r.id),
    orderId: String(r.order_id ?? ""),
    orderNumber: o ? num(o.order_number) : null,
    orderPlacedAt: o ? str(o.placed_at) : null,
    customerLabel: null,
    kind: (r.kind === "exchange" ? "exchange" : "refund") as ReturnKind,
    reason: String(r.reason ?? ""),
    status,
    paymentMethod: payMethod(o?.payment_method),
    refundAmount: recorded ?? round2(items.reduce((s, i) => s + i.amount, 0)),
    requestedAt: String(r.created_at ?? ""),
    resolvedAt: str(r.resolved_at),
    items,
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// Products

export function toCategory(r: Row): ProductCategory {
  return { id: String(r.id), name: String(r.name ?? ""), glyph: str(r.glyph), position: num(r.position) };
}

export function toProduct(r: Row): Product {
  const cat = (r.product_categories as Row | null | undefined) ?? null;
  return {
    id: String(r.id),
    name: String(r.title ?? ""),
    price: r.price === null || r.price === undefined ? null : num(r.price),
    description: String(r.description ?? ""),
    marketCategory: r.category as OfferingCategory,
    stock: r.stock === null || r.stock === undefined ? null : num(r.stock),
    visible: r.visible === undefined || r.visible === null ? true : r.visible !== false,
    categoryId: str(r.category_id),
    category: cat ? str(cat.name) : null,
    categoryGlyph: cat ? str(cat.glyph) : null,
    imageUrl: str(r.image_url),
  };
}

// ---------------------------------------------------------------------------
// Errors → sentences (B11 codes ATXE8, ATXE9, ATXF0, ATXF1; ATX10 a step
// that no longer applies). `fallback` is the screen's own retry line.

export type StoreErr = { code?: string; message?: string } | null | undefined;

export function storeErrorText(e: StoreErr, fallback: string): string {
  const code = e?.code ?? "";
  const msg = e?.message ?? "";
  if (code === "ATXE8") {
    // The server names the product: "only 1 of Protein Bar left".
    const m = /only (\d+) of (.+) left/i.exec(msg);
    if (m) return Number(m[1]) === 0 ? `${m[2]} is out of stock. Remove it to order the rest.` : `Only ${m[1]} of ${m[2]} left. Lower the quantity and try again.`;
    return "Some of this is out of stock. Lower the quantity and try again.";
  }
  if (code === "ATXE9") return "This store isn't taking orders right now.";
  if (code === "ATXF0") {
    if (/pickup/i.test(msg)) return "This store doesn't offer pickup. Choose delivery.";
    if (/delivery/i.test(msg)) return "This store doesn't offer delivery. Choose pickup.";
    return "This store doesn't offer that. Choose pickup or delivery.";
  }
  if (code === "ATXF1") {
    if (/exchange/i.test(msg)) return "This store doesn't offer exchanges. Ask for a refund instead.";
    if (/already open/i.test(msg)) return "A return for this order is already open.";
    return "Only an order completed in the last 30 days can be returned.";
  }
  // respond_return's refunded step goes through record_refund (Revenue).
  if (code === "ATX09" && /refund/i.test(msg)) return "Recording a refund needs the Revenue permission. Ask the owner.";
  if (code === "22023" && /has not been paid/i.test(msg)) return "This order isn't marked paid, so there's nothing to refund yet. Mark it paid on the order first.";
  if (code === "22023" && /more than the/i.test(msg)) return "That's more than was paid for this order.";
  if (code === "ATX10") {
    if (/no longer be cancelled/i.test(msg)) return "This order can't be cancelled any more. The store has started on it.";
    return "This was already updated. Refresh to see where it is now.";
  }
  return fallback;
}
