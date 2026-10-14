import { db, isMissingColumn, loadFail, num, str, writeFail, type Load, type Write } from "./backend";

// Store products on business_offerings (V6-50: the model the app already
// reads; ST-01 / B11 extends it). One editor for OP1 Products and AN11
// listings (V6-157): name, price and description are live today; stock,
// visibility, photo and product category are B11 columns, read when present
// and otherwise reported as pending so the editor shows them as "Coming soon".
//
// GRANTS (local stack, 14 Oct): INSERT business_id, category, title, price,
// description (+ id, timestamps); UPDATE title, price, description, category.
// B11 adds stock, visible, image_path and a product category. Their WRITE
// path (column grants or functions) is not in HANDOVER_API.md yet, so none of
// them is ever sent from here (npm run audit:grants): the editor shows them
// as "Coming soon" until B11 is wired (STOCK_WRITES below).

/** B11 stock / visibility / category / photo writes are wired (flip with B11). */
export const STOCK_WRITES = false;

import type { OfferingCategory, Product } from "./types";
export type { OfferingCategory, Product } from "./types";

export interface ProductsLoad {
  products: Product[];
  /** B11's stock / visible / category columns exist. */
  stockShipped: boolean;
}

const BASE = "id, title, price, description, category, created_at";
const B11 = ", stock, visible, image_path, product_categories(name)";

type Row = Record<string, unknown>;

const toProduct = (r: Row): Product => ({
  id: String(r.id),
  name: String(r.title ?? ""),
  price: r.price === null || r.price === undefined ? null : num(r.price),
  description: String(r.description ?? ""),
  marketCategory: r.category as OfferingCategory,
  stock: r.stock === null || r.stock === undefined ? null : num(r.stock),
  visible: r.visible === undefined || r.visible === null ? true : r.visible !== false,
  category: str((r.product_categories as Row | null)?.name),
  imagePath: str(r.image_path),
});

async function readProducts(filter: (q: unknown) => unknown): Promise<Load<ProductsLoad>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose B11 builder
  const full = await (filter(db.from("business_offerings").select(BASE + B11)) as any).order("created_at", { ascending: false });
  if (!full.error) return { status: "ok", value: { products: ((full.data ?? []) as Row[]).map(toProduct), stockShipped: true } };
  if (!isMissingColumn(full.error) && full.error.code !== "PGRST200") return loadFail(full.error, "Could not read the products");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose builder
  const base = await (filter(db.from("business_offerings").select(BASE)) as any).order("created_at", { ascending: false });
  if (base.error) return loadFail(base.error, "Could not read the products");
  return { status: "ok", value: { products: ((base.data ?? []) as Row[]).map(toProduct), stockShipped: false } };
}

/** This store's products (owner screens). */
export function fetchStoreProducts(businessId: string): Promise<Load<ProductsLoad>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose builder
  return readProducts((q) => (q as any).eq("business_id", businessId));
}

/** One product (customer product page). */
export async function fetchProduct(productId: string): Promise<Load<{ product: Product; businessId: string } | null>> {
  const full = await db.from("business_offerings").select(BASE + ", business_id" + B11).eq("id", productId).maybeSingle();
  let res = full;
  if (full.error && (isMissingColumn(full.error) || full.error.code === "PGRST200")) {
    res = await db.from("business_offerings").select(BASE + ", business_id").eq("id", productId).maybeSingle();
  }
  if (res.error) return loadFail(res.error, "Could not read the product");
  if (!res.data) return { status: "ok", value: null };
  return { status: "ok", value: { product: toProduct(res.data as Row), businessId: String((res.data as Row).business_id) } };
}

/** Which Explore category a store's products are listed under (business_offerings.category is required). */
export function marketCategoryFor(businessType: string | null | undefined): OfferingCategory {
  switch (businessType) {
    case "supplement_store":
      return "supplements";
    case "equipment_seller":
      return "equipment";
    case "clothing_store":
      return "clothing";
    case "wellness_service":
      return "wellness";
    case "meal_prep_service":
      return "meal_prep";
    default:
      return "stores";
  }
}

export interface ProductDraft {
  name: string;
  price: number;
  description: string;
  /** Sent only once B11's stock column exists. */
  stock?: number | null;
}

export async function createProduct(businessId: string, businessType: string | null, d: ProductDraft, _stockShipped: boolean): Promise<Write<Product>> {
  const payload: Row = {
    business_id: businessId,
    title: d.name.trim(),
    category: marketCategoryFor(businessType),
    price: d.price,
    description: d.description.trim() || null,
  };
  const { data, error } = await db.from("business_offerings").insert(payload).select(BASE).single();
  if (error || !data) return writeFail(error, "Could not create the product");
  return { ok: true, value: toProduct(data as Row) };
}

export async function updateProduct(id: string, d: ProductDraft, _stockShipped: boolean): Promise<Write<null>> {
  const { error } = await db
    .from("business_offerings")
    .update({ title: d.name.trim(), price: d.price, description: d.description.trim() || null }).eq("id", id);
  if (error) return writeFail(error, "Could not save the product");
  return { ok: true, value: null };
}

/** B11 visibility (Hide from the store / Show in the store): pending until B11's write path is in HANDOVER_API.md. */
export async function setProductVisible(_id: string, _visible: boolean): Promise<Write<null>> {
  return { ok: false, pending: true };
}

export async function deleteProduct(id: string): Promise<Write<null>> {
  const { error } = await db.from("business_offerings").delete().eq("id", id);
  if (error) return writeFail(error, "Could not delete the product");
  return { ok: true, value: null };
}

/** Stock chip (OP1-008 row 9): Low 1 to 4, Out at 0, none at 5 or more or untracked; Hidden (OURS). */
export function stockChip(p: Product): { label: string; tone: "warn" | "bad" | "soft" } | null {
  if (!p.visible) return { label: "Hidden", tone: "soft" };
  if (p.stock === null) return null;
  if (p.stock <= 0) return { label: "Out", tone: "bad" };
  if (p.stock < 5) return { label: "Low", tone: "warn" };
  return null;
}

/** Number boxes (OP1-008 row 5): live, low (1 to 4), out (0); hidden products count in none. */
export function productCounts(list: Product[]): { live: number; low: number; out: number } {
  const live = list.filter((p) => p.visible);
  return {
    live: live.length,
    low: live.filter((p) => p.stock !== null && p.stock > 0 && p.stock < 5).length,
    out: live.filter((p) => p.stock !== null && p.stock <= 0).length,
  };
}

/** Whole number 0 or more, or null when the text is not one. */
export function parseStock(text: string): number | null {
  const t = text.trim();
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}
