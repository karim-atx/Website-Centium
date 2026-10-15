import { useState } from "react";
import clsx from "clsx";
import { Backpack, Check, ChevronDown, CircleAlert, FlaskConical, HeartPulse, Loader2, Milk, Package, Plus, Shirt, type LucideIcon } from "lucide-react";
import type { ProductCategory } from "../../../../services/store/products";

// AN11-004 · the product Category field and its in-flow listbox
// (StoreFlowsV3.dc.html step "item-cat", DR() + opts): field 46 r14, open =
// 1.5px primary border (#AEA1DC / #A991FE) and the chevron turned 180°;
// listbox margin-top 6, card #FFFFFF / #1C1F28, 1px rgba(174,161,220,0.5),
// r14, shadow 0 12px 32px rgba(95,80,147,0.18), padding 8; option rows
// min-height 44, r8, padding 6 10, gap 10, 6 apart, 1px #E5E6EB / #31343C on
// #FAFAFB / #262932, label 13/600 ink; selected = primary border, pale fill
// (#F0EDF9 / #303141), 13/800 pDark (#7D6BB5 / #C3B3FB), check 15 / 2.6;
// icon tile 30 r10 pale, glyph 15 pDark. "New category" (plus) + sub 11/15
// faint "Name your own group" opens the O2 inline field: 46 field,
// placeholder "Name the group", Add 36 tall r12 #7D6BB5 12.5/800 #FFFFFF,
// error 11.5/700 high with circle-alert 13. O1: no categories = only "New
// category"; O3: three 44 r8 skeleton rows while loading.

const GLYPHS: Record<string, LucideIcon> = { milk: Milk, "flask-conical": FlaskConical, shirt: Shirt, backpack: Backpack, "heart-pulse": HeartPulse };
/** A category's glyph; one without a stored glyph (a store's own new group) uses package (UNSPECIFIED in the handover). */
function CategoryGlyph({ glyph, size, className }: { glyph: string | null | undefined; size: number; className?: string }) {
  const Icon: LucideIcon = (glyph && GLYPHS[glyph]) || Package;
  return <Icon size={size} aria-hidden className={className} />;
}

/** O2: "Use up to 24 characters." (the server allows 40; the OURS field is stricter). */
export const CATEGORY_NAME_MAX = 24;

const OPTION = "tap w-full flex items-center text-start border box-border";

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

  return (
    <div style={{ marginBottom: 12 }}>
      <p id="product-category-l" className="text-[12px] font-bold text-charcoal-soft" style={{ marginBottom: 6 }}>
        Category
      </p>
      <button
        id="product-category"
        type="button"
        aria-labelledby="product-category-l product-category"
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "tap w-full text-start flex items-center bg-cream-soft border-[1.5px]",
          open ? "border-th-aea1dc dark:border-th-a991fe" : "border-charcoal/[0.11] dark:border-charcoal/[0.08]",
          disabled && "opacity-60"
        )}
        style={{ height: 46, borderRadius: 14, padding: "0 12px 0 14px", gap: 8 }}
      >
        {current && <CategoryGlyph glyph={current.glyph} size={16} className="shrink-0 text-th-7d6bb5 dark:text-th-c3b3fb" />}
        <span className={clsx("flex-1 min-w-0 truncate text-[14px]", current ? "font-bold text-charcoal" : "font-medium text-charcoal-faint")}>{current?.name ?? "Choose a category"}</span>
        <ChevronDown size={16} aria-hidden className="shrink-0 text-charcoal-faint" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {note && !open && <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ marginTop: 4 }}>{note}</p>}
      {open && (
        <div
          role="listbox"
          aria-label="Category"
          className="bg-cream-card border border-th-aea1dc/50"
          style={{ marginTop: 6, borderRadius: 14, boxShadow: "0 12px 32px rgba(95,80,147,0.18)", padding: 8 }}
        >
          {categories === null
            ? [0, 1, 2].map((i) => <div key={i} aria-hidden className="bg-cream-soft dark:bg-surface-raised animate-pulse" style={{ height: 44, borderRadius: 8, marginTop: i ? 6 : 0 }} />)
            : categories.map((c, i) => {
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
                    className={clsx(OPTION, sel ? "border-th-aea1dc dark:border-th-a991fe bg-th-f0edf9 dark:bg-th-303141" : "border-border-option bg-surface-raised")}
                    style={{ minHeight: 44, borderRadius: 8, padding: "6px 10px", gap: 10, marginTop: i ? 6 : 0 }}
                  >
                    <span className="flex items-center justify-center shrink-0 bg-th-f0edf9 dark:bg-th-303141 text-th-7d6bb5 dark:text-th-c3b3fb" style={{ width: 30, height: 30, borderRadius: 10 }}>
                      <CategoryGlyph glyph={c.glyph} size={15} />
                    </span>
                    <span className={clsx("flex-1 min-w-0 text-[13px] break-words", sel ? "font-extrabold text-th-7d6bb5 dark:text-th-c3b3fb" : "font-semibold text-charcoal")}>{c.name}</span>
                    {sel && <Check size={15} strokeWidth={2.6} aria-hidden className="shrink-0 text-th-7d6bb5 dark:text-th-c3b3fb" />}
                  </button>
                );
              })}
          {categories !== null &&
            (adding ? (
              <div style={{ marginTop: categories.length ? 6 : 0 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
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
                    className={clsx(
                      "flex-1 min-w-0 bg-cream-soft border-[1.5px] outline-none text-[14px] font-bold text-charcoal placeholder:text-charcoal-faint placeholder:font-medium",
                      error ? "border-status-high" : "border-charcoal/[0.10] dark:border-charcoal/[0.10]"
                    )}
                    style={{ height: 46, borderRadius: 14, padding: "0 14px" }}
                  />
                  <button
                    type="button"
                    onClick={() => void add()}
                    disabled={!name.trim() || busy}
                    aria-busy={busy || undefined}
                    className="tap shrink-0 flex items-center justify-center bg-th-7d6bb5 text-white text-[12.5px] font-extrabold disabled:opacity-40"
                    style={{ height: 36, borderRadius: 12, padding: "0 16px", gap: 6 }}
                  >
                    {busy && <Loader2 size={14} className="animate-spin" aria-hidden />}
                    Add
                  </button>
                </div>
                {error && (
                  <p role="alert" className="flex items-center text-[11.5px] font-bold text-status-high" style={{ gap: 6, marginTop: 6 }}>
                    <CircleAlert size={13} aria-hidden className="shrink-0" />
                    {error}
                  </p>
                )}
              </div>
            ) : (
              <button
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => setAdding(true)}
                className={clsx(OPTION, "border-border-option bg-surface-raised")}
                style={{ minHeight: 44, borderRadius: 8, padding: "6px 10px", gap: 10, marginTop: categories.length ? 6 : 0 }}
              >
                <span className="flex items-center justify-center shrink-0 bg-th-f0edf9 dark:bg-th-303141 text-th-7d6bb5 dark:text-th-c3b3fb" style={{ width: 30, height: 30, borderRadius: 10 }}>
                  <Plus size={15} aria-hidden />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-semibold text-charcoal">New category</span>
                  <span className="block text-[11px] leading-[15px] text-charcoal-faint">Name your own group</span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

/** AN11-001 row 11: "Visible on Explore" switch row, 46×28 switch (not the 44×24 Toggle). */
export function VisibleSwitch({ on, onChange, disabled, note }: { on: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div className={clsx("flex items-center", disabled && "opacity-60")} style={{ gap: 12, minHeight: 46 }}>
        <span className="flex-1 min-w-0">
          <span className="block text-[13.5px] font-extrabold text-charcoal">Visible on Explore</span>
          <span className="block text-[11.5px] leading-[16px] text-charcoal-faint">{on ? "Clients can find and buy it." : "Only you can see it."}</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Visible on Explore"
          disabled={disabled}
          onClick={() => onChange(!on)}
          className={clsx("tap relative shrink-0", on ? "bg-th-7d6bb5 dark:bg-th-a991fe" : "bg-border-option")}
          style={{ width: 46, height: 28, borderRadius: 999 }}
        >
          <span aria-hidden className="absolute bg-white" style={{ top: 3, left: on ? 21 : 3, width: 22, height: 22, borderRadius: 999, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
        </button>
      </div>
      {note && <p className="text-[11.5px] leading-[16px] text-charcoal-faint" style={{ marginTop: 4 }}>{note}</p>}
    </div>
  );
}
