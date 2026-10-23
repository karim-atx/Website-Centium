// Market + Share 3.0 · W3 · B-MA.2 Showcase Manager: pure rules (node:test
// loads this file). Items are business_offerings rows (D-17), read in the
// live order (created_at, newest first): DB3's `sort` exists but an owner
// can't write it (no UPDATE grant, no reorder function).

export interface ShowcaseRowItem {
  id: string;
  name: string;
  price: number | null;
  stock: number | null;
  visible: boolean;
  /** The store's own group (product_categories.name), or null. */
  category: string | null;
}

/** "5 items · drag to reorder" (the caps header), "1 item" singular. */
export const itemsHeader = (n: number): string => `${n} ${n === 1 ? "item" : "items"} · drag to reorder`;

/** The display price as the board writes it ("$48", "$12.50"), or "" when none. */
export function priceText(price: number | null): string {
  if (price === null || !Number.isFinite(price)) return "";
  return `$${Number.isInteger(price) ? price : price.toFixed(2)}`;
}

/** The row's price line: "$48", plus the store's live stock figure ("$48 · 12 left"); "No price" when a store item has none. */
export function priceLine(item: Pick<ShowcaseRowItem, "price" | "stock">, store: boolean): string {
  const p = priceText(item.price) || (store ? "No price" : "");
  if (!store || item.stock === null) return p;
  return p ? `${p} · ${item.stock} left` : `${item.stock} left`;
}

const OTHER = "Other";

/** Store sections by product category, alphabetical, "Other" last (OP1-008 row 6, KEPT); each keeps the list's order. */
export function groupByCategory<T extends Pick<ShowcaseRowItem, "category">>(list: T[]): { name: string; list: T[] }[] {
  const map = new Map<string, T[]>();
  for (const p of list) {
    const k = p.category ?? OTHER;
    map.set(k, [...(map.get(k) ?? []), p]);
  }
  return [...map.entries()].sort(([a], [b]) => (a === OTHER ? 1 : b === OTHER ? -1 : a.localeCompare(b))).map(([name, l]) => ({ name, list: l }));
}

/** Moves `id` to index `to` (clamped). */
export function moveTo(ids: string[], id: string, to: number): string[] {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const t = Math.max(0, Math.min(ids.length - 1, to));
  if (t === from) return ids;
  const out = ids.slice();
  out.splice(from, 1);
  out.splice(t, 0, id);
  return out;
}

/**
 * The drop index for a pointer at `y` over rows whose vertical midpoints are
 * `mids` (top to bottom): the number of midpoints above the pointer,
 * counting the dragged row's own slot once (it is removed first).
 */
export function dropIndex(mids: number[], y: number, from: number): number {
  let n = 0;
  for (let i = 0; i < mids.length; i++) {
    if (i === from) continue;
    if (y > mids[i]) n++;
  }
  return n;
}

/**
 * The whole order after a section's visible slice was reordered: `slice` is
 * the new order of the section's first rows; the section's other rows keep
 * their place after it, and the other sections stay as they were.
 */
export function mergeSectionOrder(all: string[], section: string[], slice: string[]): string[] {
  const rest = section.filter((id) => !slice.includes(id));
  const nextSection = [...slice, ...rest];
  const inSection = new Set(section);
  let k = 0;
  return all.map((id) => (inSection.has(id) ? nextSection[k++] : id));
}
