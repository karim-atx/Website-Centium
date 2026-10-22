import { useState } from "react";
import { Backpack, Check, ChevronDown, CircleAlert, FlaskConical, HeartPulse, Loader2, Milk, Package, Plus, Shirt, type LucideIcon } from "lucide-react";
import type { ProductCategory } from "../../../../services/store/products";
import { fieldStyle, px, SheetBox, useMarketColors } from "../../../business-market/listingParts";

// AN11-004 · the store product's Category field and its in-flow listbox
// (product_categories: pick one, or "New category" to name your own group),
// KEPT (PLAN §3.4 Stores) and restyled in the B-MA.2 Edit item sheet's chrome:
// an --sgrey box (radius 14, padding 12 14) with the 13 / 500 --slabel label,
// the field on --sfield (radius 10, padding 11 13, 14 / 19); the listbox
// rows 44 tall radius 10 on the card, the selected one 1.5px --fill on --pale
// with a check in --pdark. O1: no categories = only "New category"; O3:
// three skeleton rows while loading. The new-group field caps at 24
// characters (the server allows 40).

const GLYPHS: Record<string, LucideIcon> = { milk: Milk, "flask-conical": FlaskConical, shirt: Shirt, backpack: Backpack, "heart-pulse": HeartPulse };
/** A category's glyph; one without a stored glyph (a store's own new group) uses package. */
function CategoryGlyph({ glyph, size, color }: { glyph: string | null | undefined; size: number; color: string }) {
  const Icon: LucideIcon = (glyph && GLYPHS[glyph]) || Package;
  return <Icon size={size} aria-hidden color={color} style={{ flexShrink: 0 }} />;
}

/** O2: "Use up to 24 characters." (the server allows 40; the field is stricter). */
export const CATEGORY_NAME_MAX = 24;

export function CategoryPicker({
  categories,
  value,
  onPick,
  onCreate,
  disabled,
  note,
}: {
  /** null while loading (O3). */
  categories: ProductCategory[] | null;
  value: string | null;
  onPick: (id: string | null) => void;
  /** Adds a category and answers an error sentence, or null when it worked. */
  onCreate: (name: string) => Promise<string | null>;
  disabled?: boolean;
  note?: React.ReactNode;
}) {
  const m = useMarketColors();
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const current = categories?.find((c) => c.id === value) ?? null;

  const add = async () => {
    const n = name.trim();
    if (!n) return;
    if (n.length > CATEGORY_NAME_MAX) {
      setError(`Use up to ${CATEGORY_NAME_MAX} characters.`);
      return;
    }
    setBusy(true);
    setError(null);
    const err = await onCreate(n);
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setName("");
    setAdding(false);
    setOpen(false);
  };

  const option = (sel: boolean): React.CSSProperties => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    minHeight: 44,
    borderRadius: 10,
    padding: "6px 12px",
    boxSizing: "border-box",
    border: `1.5px solid ${sel ? m.fill : "transparent"}`,
    background: sel ? m.pale : m.card,
    textAlign: "left",
    fontFamily: "inherit",
    color: m.ink,
    cursor: "pointer",
  });

  return (
    <SheetBox label="Category" htmlFor="product-category">
      <button
        id="product-category"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className="market-focus"
        style={{ ...fieldStyle(m), display: "flex", alignItems: "center", gap: 8, textAlign: "left", cursor: disabled ? "default" : "pointer", opacity: disabled ? 0.6 : 1, boxShadow: open ? `inset 0 0 0 1px ${m.fill}` : undefined }}
      >
        {current && <CategoryGlyph glyph={current.glyph} size={16} color={m.pdark} />}
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: current ? m.ink : m.faint }}>{current?.name ?? "Choose a category"}</span>
        <ChevronDown size={16} aria-hidden color={m.faint} style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {note && !open && <p style={{ fontSize: px(11.5), color: m.faint, marginTop: 6, lineHeight: "normal" }}>{note}</p>}
      {open && (
        <div role="listbox" aria-label="Category" style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
          {categories === null
            ? [0, 1, 2].map((i) => <div key={i} aria-hidden className="animate-skeleton-pulse" style={{ height: 44, borderRadius: 10, background: m.card }} />)
            : categories.map((c) => {
                const sel = c.id === value;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={sel}
                    onClick={() => {
                      onPick(sel ? null : c.id);
                      setOpen(false);
                    }}
                    className="market-focus"
                    style={option(sel)}
                  >
                    <span style={{ width: 30, height: 30, borderRadius: 10, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <CategoryGlyph glyph={c.glyph} size={15} color={m.pdark} />
                    </span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: px(14), fontWeight: sel ? 700 : 600, color: sel ? m.pdark : m.ink, overflowWrap: "anywhere" }}>{c.name}</span>
                    {sel && <Check size={15} strokeWidth={2.6} aria-hidden color={m.pdark} style={{ flexShrink: 0 }} />}
                  </button>
                );
              })}
          {categories !== null &&
            (adding ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    aria-label="New category name"
                    value={name}
                    autoFocus
                    maxLength={40}
                    onChange={(e) => {
                      setName(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && void add()}
                    placeholder="Name the group"
                    aria-invalid={!!error || undefined}
                    style={{ ...fieldStyle(m, !!error), flex: 1, minWidth: 0, width: "auto" }}
                  />
                  <button
                    type="button"
                    onClick={() => void add()}
                    disabled={!name.trim() || busy}
                    aria-busy={busy || undefined}
                    className="tap market-focus"
                    style={{ height: 40, borderRadius: 12, padding: "0 16px", border: 0, background: m.fill, color: m.onfill, fontSize: px(12.5), fontWeight: 800, display: "flex", alignItems: "center", gap: 6, flexShrink: 0, opacity: !name.trim() || busy ? 0.4 : 1, fontFamily: "inherit", cursor: "pointer" }}
                  >
                    {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                    Add
                  </button>
                </div>
                {error && (
                  <p role="alert" style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: px(11.5), fontWeight: 700, color: m.high }}>
                    <CircleAlert size={13} aria-hidden style={{ flexShrink: 0 }} />
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <button type="button" role="option" aria-selected={false} onClick={() => setAdding(true)} className="market-focus" style={option(false)}>
                <span style={{ width: 30, height: 30, borderRadius: 10, background: m.pale, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Plus size={15} aria-hidden color={m.pdark} />
                </span>
                <span style={{ flex: 1, minWidth: 0, lineHeight: "normal" }}>
                  <span style={{ display: "block", fontSize: px(14), fontWeight: 600 }}>New category</span>
                  <span style={{ display: "block", fontSize: px(11.5), color: m.faint }}>Name your own group</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </SheetBox>
  );
}
