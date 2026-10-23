import { db, isMissingColumn, loadFail, writeFail, type Load, type Write } from "./backend";
import { toCategory, toProduct, type Row } from "./mapping";
import { prepareForumPhoto } from "../forum/photo";

// Store products on business_offerings (V6-50 / Q-07: the product table).
// One editor for OP1 Products and AN11 listings (V6-157). B11 added stock
// (null = not tracked), visible (default true; hidden = gone from the public,
// still seen by the business), image_url and category_id
// (product_categories). Writing them needs `store` or `marketing`.
//
// GRANTS (local stack, 15 Oct): business_offerings INSERT business_id,
// category, category_id, description, image_url, price, stock, title,
// visible; UPDATE category, category_id, description, image_url, price,
// stock, title, visible. product_categories INSERT business_id, glyph, name,
// position; UPDATE glyph, name, position (npm run audit:grants).
//
// Production may not have B11 yet: a read that names a B11 column falls back
// to the base columns and reports `stockShipped: false`, and the editor shows
// the B11 fields as "Coming soon" there (never sent).

import type { OfferingCategory, Product, ProductCategory } from "./types";
export type { OfferingCategory, Product, ProductCategory } from "./types";

export interface ProductsLoad {
  products: Product[];
  /** B11's stock / visible / category / photo columns exist. */
  stockShipped: boolean;
}

const BASE = "id, title, price, description, category, created_at";
const B11 = ", stock, visible, image_url, category_id, product_categories(name, glyph)";

/**
 * `newest`: created_at, newest first (the analytics' order). `shelf`: the
 * owner's order as members see it through public_showcase (Database 73ea87b):
 * sort, then newest first, then id.
 */
export type ProductOrder = "newest" | "shelf";

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose builder
const ordered = (q: any, order: ProductOrder) =>
  order === "shelf" ? q.order("sort", { ascending: true }).order("created_at", { ascending: false }).order("id", { ascending: true }) : q.order("created_at", { ascending: false });

async function readProducts(filter: (q: unknown) => unknown, order: ProductOrder = "newest"): Promise<Load<ProductsLoad>> {
  const full = await ordered(filter(db.from("business_offerings").select(BASE + B11)), order);
  if (!full.error) return { status: "ok", value: { products: ((full.data ?? []) as Row[]).map(toProduct), stockShipped: true } };
  if (!isMissingColumn(full.error) && full.error.code !== "PGRST200") return loadFail(full.error, "Could not read the products");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose builder
  const base = await (filter(db.from("business_offerings").select(BASE)) as any).order("created_at", { ascending: false });
  if (base.error) return loadFail(base.error, "Could not read the products");
  return { status: "ok", value: { products: ((base.data ?? []) as Row[]).map(toProduct), stockShipped: false } };
}

/** This store's products (owner screens; hidden ones included), newest first unless `order` is "shelf". */
export function fetchStoreProducts(businessId: string, order: ProductOrder = "newest"): Promise<Load<ProductsLoad>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- loose builder
  return readProducts((q) => (q as any).eq("business_id", businessId), order);
}

/** One product (customer product page). RLS hides a hidden product from the public. */
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
  /** null = no price shown (Market + Share 3.0 W3: a gym or class business's showcase item may have none, as the old Offerings form allowed). */
  price: number | null;
  description: string;
  /** B11 fields, sent only when `stockShipped`. stock null = not tracked. */
  stock: number | null;
  visible: boolean;
  categoryId: string | null;
  imageUrl: string | null;
  /** The Explore category a new item is listed under (W3: a gym or class business picks it, as the old Offerings form did); unset = by business type. */
  category?: OfferingCategory;
}

export async function createProduct(businessId: string, businessType: string | null, d: ProductDraft, stockShipped: boolean): Promise<Write<Product>> {
  const payload: Row = {
    business_id: businessId,
    title: d.name.trim(),
    category: d.category ?? marketCategoryFor(businessType),
    price: d.price,
    description: d.description.trim() || null,
  };
  if (stockShipped) {
    payload.stock = d.stock;
    payload.visible = d.visible;
    payload.category_id = d.categoryId;
    payload.image_url = d.imageUrl;
  }
  const { data, error } = await db.from("business_offerings").insert(payload).select(BASE).single();
  if (error || !data) return writeFail(error, "Could not create the product");
  return { ok: true, value: toProduct(data as Row) };
}

export async function updateProduct(id: string, d: ProductDraft, stockShipped: boolean): Promise<Write<null>> {
  // Two literal payloads (not a conditional) so npm run audit:grants checks both.
  const { error } = stockShipped
    ? await db
        .from("business_offerings")
        .update({
          title: d.name.trim(),
          price: d.price,
          description: d.description.trim() || null,
          stock: d.stock,
          visible: d.visible,
          category_id: d.categoryId,
          image_url: d.imageUrl,
        })
        .eq("id", id)
    : await db.from("business_offerings").update({ title: d.name.trim(), price: d.price, description: d.description.trim() || null }).eq("id", id);
  if (error) return writeFail(error, "Could not save the product");
  return { ok: true, value: null };
}

/** Hide from the store / Show in the store (a hidden product disappears from the public). */
export async function setProductVisible(id: string, visible: boolean): Promise<Write<null>> {
  const { error } = await db.from("business_offerings").update({ visible }).eq("id", id);
  if (error) return writeFail(error, "Could not change the product's visibility");
  return { ok: true, value: null };
}

export async function deleteProduct(id: string): Promise<Write<null>> {
  const { error } = await db.from("business_offerings").delete().eq("id", id);
  if (error) return writeFail(error, "Could not delete the product");
  return { ok: true, value: null };
}

// ---------------------------------------------------------------------------
// Product categories (the store's own groups; name ≤ 40, unique per business
// ignoring case)

export async function fetchCategories(businessId: string): Promise<Load<ProductCategory[]>> {
  const { data, error } = await db.from("product_categories").select("id, name, glyph, position").eq("business_id", businessId).order("position").order("name");
  if (error) return loadFail(error, "Could not read the categories");
  return { status: "ok", value: ((data ?? []) as Row[]).map(toCategory) };
}

export const CATEGORY_MAX = 40;

export async function createCategory(businessId: string, name: string, glyph: string | null, position: number): Promise<Write<ProductCategory>> {
  const { data, error } = await db.from("product_categories").insert({ business_id: businessId, name: name.trim(), glyph, position }).select("id, name, glyph, position").single();
  if (error || !data) return writeFail(error, "Could not add the category");
  return { ok: true, value: toCategory(data as Row) };
}

// ---------------------------------------------------------------------------
// Product photos: public bucket product-images, <uid>/<business_id>/<file>,
// 5 MB, JPEG / PNG / WebP (re-encoded as JPEG, metadata dropped).

const PHOTO_BUCKET = "product-images";

export async function uploadProductPhoto(businessId: string, file: File): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  const { data: auth } = await db.auth.getUser();
  const uid = auth?.user?.id as string | undefined;
  if (!uid) return { ok: false, message: "Sign in again to add a photo." };
  const prepared = await prepareForumPhoto(file);
  if (!prepared.ok) return { ok: false, message: prepared.message };
  if (prepared.file.size > 5 * 1024 * 1024) return { ok: false, message: "This photo is too large. Choose one under 5 MB." };
  const path = `${uid}/${businessId}/${crypto.randomUUID()}.jpg`;
  const up = await db.storage.from(PHOTO_BUCKET).upload(path, prepared.file, { contentType: "image/jpeg", upsert: false });
  if (up.error) {
    console.warn("[store] product photo upload refused:", up.error.message);
    return { ok: false, message: "Couldn't upload the photo. Check your connection and try again." };
  }
  return { ok: true, url: db.storage.from(PHOTO_BUCKET).getPublicUrl(path).data.publicUrl as string };
}

// ---------------------------------------------------------------------------

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
