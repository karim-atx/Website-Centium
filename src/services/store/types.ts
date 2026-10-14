import type { Database } from "../../../lib/supabase/database.types";

// The store's row shapes, kept free of Supabase so pure modules and their
// node tests (analytics productsModel, the order steps) can import them
// without pulling the client in. orders.ts and products.ts re-export them.

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

export type OfferingCategory = Database["public"]["Enums"]["offering_category"];

export interface Product {
  id: string;
  name: string;
  price: number | null;
  description: string;
  /** Marketplace category (business_offerings.category, the Explore enum). */
  marketCategory: OfferingCategory;
  /** B11: null = not tracked, or the column is not there yet. */
  stock: number | null;
  /** B11: false = hidden from the store. Defaults to true before B11. */
  visible: boolean;
  /** B11 product category name, or null ("Other"). */
  category: string | null;
  imagePath: string | null;
}
