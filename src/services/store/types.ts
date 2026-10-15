import type { Database } from "../../../lib/supabase/database.types";

// The store's row shapes, kept free of Supabase so pure modules and their
// node tests (analytics productsModel, the order steps) can import them
// without pulling the client in. orders.ts and products.ts re-export them.
// Names follow HANDOVER_API.md B11 (20261121260000).

export type OrderStatus = "placed" | "packed" | "out_for_delivery" | "ready_for_pickup" | "completed" | "cancelled" | "returned";
export type Fulfilment = "delivery" | "pickup";
export type PayMethod = "cash" | "whish";
/** venue_payment_status: what the store recorded, never a processed payment. */
export type PayStatus = "pending" | "paid" | "refunded";

export interface OrderItem {
  /** store_order_items.id (request_return's item_id). */
  id: string;
  offeringId: string | null;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
}

export interface StoreOrder {
  id: string;
  businessId: string;
  number: number;
  customerId: string | null;
  /**
   * The server's label for the customer on the store's reads
   * (store_orders_page: "Member #0042" unless the name is shared, a first
   * name, or "Guest"). Null on the customer's own reads.
   */
  customerLabel: string | null;
  customerIsMinor: boolean;
  fulfilment: Fulfilment;
  /** This store only; null once cleared, 90 days after the order ends. */
  deliveryAddress: string | null;
  deliveryFee: number;
  subtotal: number;
  total: number;
  paymentMethod: PayMethod;
  paymentStatus: PayStatus;
  paidAt: string | null;
  status: OrderStatus;
  placedAt: string;
  packedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  note: string | null;
  itemCount: number;
  items: OrderItem[];
  /** Store name, on the customer's own reads. */
  storeName: string | null;
  /** The status of a return still in progress (requested / approved / received). */
  openReturn: ReturnStatus | null;
  /** my_orders: the customer may cancel (still placed). */
  canCancel: boolean;
  /** my_orders: completed in the last 30 days with no open return. */
  canReturn: boolean;
}

export type ReturnStatus = "requested" | "approved" | "received" | "refunded" | "rejected";
export type ReturnKind = "refund" | "exchange";

export interface ReturnItem {
  itemId: string;
  name: string;
  qty: number;
  /** unit price × returned quantity, from the order's own line. */
  amount: number;
}

export interface StoreReturn {
  id: string;
  orderId: string;
  orderNumber: number | null;
  orderPlacedAt: string | null;
  /** The server's label (see StoreOrder.customerLabel); null until known. */
  customerLabel: string | null;
  kind: ReturnKind;
  reason: string;
  status: ReturnStatus;
  paymentMethod: PayMethod;
  /** Recorded refund (refunded), else the returned lines' value. */
  refundAmount: number;
  requestedAt: string;
  /** Set when the return ends (refunded, rejected, or an exchange received). */
  resolvedAt: string | null;
  items: ReturnItem[];
}

export type OfferingCategory = Database["public"]["Enums"]["offering_category"];

export interface Product {
  id: string;
  name: string;
  price: number | null;
  description: string;
  /** Marketplace category (business_offerings.category, the Explore enum). */
  marketCategory: OfferingCategory;
  /** null = not tracked, or the column is not there yet. */
  stock: number | null;
  /** false = hidden from the public. Defaults to true before B11. */
  visible: boolean;
  /** product_categories id / name / glyph, or null ("Other"). */
  categoryId: string | null;
  category: string | null;
  categoryGlyph: string | null;
  /** Public URL in the product-images bucket. */
  imageUrl: string | null;
}

export interface ProductCategory {
  id: string;
  name: string;
  glyph: string | null;
  position: number;
}

/** Who ordered when (the Customers section's counts). */
export interface CustomerOrder {
  customerId: string | null;
  placedAt: string;
  status: OrderStatus;
}
