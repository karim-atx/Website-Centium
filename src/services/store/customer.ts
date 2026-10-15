import { db, loadFail, num, str, type Load } from "./backend";
import { fetchStoreProducts, type Product } from "./products";

// The customer side of a store (V6-49, designed by us): the storefront, the
// cart on this device, and the store's delivery / pickup settings for checkout.

export interface StoreInfo {
  id: string;
  name: string;
  location: string | null;
  businessType: string | null;
  sellsProducts: boolean;
  offersAppointments: boolean;
  delivery: boolean;
  pickup: boolean;
  deliveryFee: number | null;
  freeDeliveryOver: number | null;
  deliveryTime: string | null;
  returnsPolicy: string | null;
  /** Exchanges are offered (request_return p_kind "exchange"). */
  allowExchanges: boolean;
}

type Row = Record<string, unknown>;

export async function fetchStoreInfo(businessId: string): Promise<Load<StoreInfo | null>> {
  const [b, s] = await Promise.all([
    db.from("business_profiles").select("id, business_name, location, business_type").eq("id", businessId).maybeSingle(),
    db.from("business_store_settings").select("*").eq("business_id", businessId).maybeSingle(),
  ]);
  if (b.error) return loadFail(b.error, "Could not read the store");
  if (!b.data) return { status: "ok", value: null };
  const r = b.data as Row;
  const st = (s.error ? null : (s.data as Row | null)) ?? null;
  return {
    status: "ok",
    value: {
      id: String(r.id),
      name: String(r.business_name ?? ""),
      location: str(r.location),
      businessType: str(r.business_type),
      sellsProducts: st ? st.sells_products === true : true,
      offersAppointments: st ? st.offers_appointments === true : false,
      delivery: st ? st.delivery_enabled === true : false,
      pickup: st ? st.pickup_enabled === true : true,
      deliveryFee: st && st.delivery_fee !== null && st.delivery_fee !== undefined ? num(st.delivery_fee) : null,
      freeDeliveryOver: st && st.free_delivery_over !== null && st.free_delivery_over !== undefined ? num(st.free_delivery_over) : null,
      deliveryTime: st ? str(st.delivery_time_text) : null,
      returnsPolicy: st ? str(st.returns_policy) : null,
      allowExchanges: st ? st.allow_exchanges === true : false,
    },
  };
}

/** Visible products only (a hidden product is not for sale). */
export async function fetchStorefront(businessId: string): Promise<Load<{ products: Product[]; stockShipped: boolean }>> {
  const r = await fetchStoreProducts(businessId);
  if (r.status !== "ok") return r;
  return { status: "ok", value: { products: r.value.products.filter((p) => p.visible && p.price !== null), stockShipped: r.value.stockShipped } };
}

/** Delivery fee for a subtotal: free over the store's threshold. */
export function deliveryFeeFor(store: StoreInfo, subtotal: number): number {
  if (store.freeDeliveryOver !== null && subtotal >= store.freeDeliveryOver) return 0;
  return store.deliveryFee ?? 0;
}

// ---------------------------------------------------------------------------
// Cart (this device). One store at a time; quantities only. Prices and stock
// are always read again from the store (never kept in the cart).

export interface CartLine {
  offeringId: string;
  qty: number;
}
export interface Cart {
  businessId: string;
  lines: CartLine[];
}

const KEY = "centium-store-cart:";
export const CART_EVENT = "centium-store-cart";

export function readCart(uid: string | null): Cart | null {
  if (!uid) return null;
  try {
    const raw = window.localStorage.getItem(KEY + uid);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cart;
    if (!c || typeof c.businessId !== "string" || !Array.isArray(c.lines)) return null;
    return { businessId: c.businessId, lines: c.lines.filter((l) => typeof l.offeringId === "string" && l.qty > 0) };
  } catch {
    return null;
  }
}

export function writeCart(uid: string | null, cart: Cart | null) {
  if (!uid) return;
  try {
    if (!cart || cart.lines.length === 0) window.localStorage.removeItem(KEY + uid);
    else window.localStorage.setItem(KEY + uid, JSON.stringify(cart));
  } catch {
    /* private mode: the cart lives for this page only */
  }
  window.dispatchEvent(new Event(CART_EVENT));
}

export const MAX_QTY = 20;

/** Add to the cart; a cart from another store is replaced only when `replace` is set. */
export function addToCart(uid: string | null, businessId: string, offeringId: string, qty: number, replace = false): "added" | "other-store" {
  const cur = readCart(uid);
  if (cur && cur.businessId !== businessId && cur.lines.length > 0 && !replace) return "other-store";
  const base: Cart = cur && cur.businessId === businessId ? cur : { businessId, lines: [] };
  const line = base.lines.find((l) => l.offeringId === offeringId);
  if (line) line.qty = Math.min(MAX_QTY, line.qty + qty);
  else base.lines.push({ offeringId, qty: Math.min(MAX_QTY, qty) });
  writeCart(uid, base);
  return "added";
}

export function setCartQty(uid: string | null, offeringId: string, qty: number) {
  const cur = readCart(uid);
  if (!cur) return;
  const lines = cur.lines.map((l) => (l.offeringId === offeringId ? { ...l, qty: Math.min(MAX_QTY, qty) } : l)).filter((l) => l.qty > 0);
  writeCart(uid, { ...cur, lines });
}

export const cartCount = (c: Cart | null) => (c ? c.lines.reduce((s, l) => s + l.qty, 0) : 0);
