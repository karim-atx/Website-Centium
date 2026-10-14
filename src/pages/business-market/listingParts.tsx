import React, { useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronUp, Eye, Plus, Square, SquareCheck, Star, X } from "lucide-react";
import { CATEGORY_KEYS, CATEGORY_LABEL, MAX_CATEGORIES, initialsOf, typeLabel } from "../../components/business-more/kind";
import type { MarketPalette } from "./palette";
import { lh, MCard, MLink, MSwitch, px } from "./kit";
import { checklistOrder, strengthLine, type StrengthItem } from "./model";

// MA1-001 / MA1-078 Listing tab parts: the strength card, the client card
// with the visibility row, the photos card, the Activities (Item categories)
// field with its upward multi-select (MA1-037) and the rating card.

// ---------------------------------------------------------------------------
// Listing strength (MA1-001 rows 5-5d, MA1-078)

export function StrengthCard({
  c,
  items,
  emptyLine,
  highlight,
  onItem,
}: {
  c: MarketPalette;
  items: StrengthItem[];
  emptyLine: string;
  highlight: string | null;
  onItem: (it: StrengthItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const done = items.filter((x) => x.done).length;
  const total = items.length;
  const order = checklistOrder(items);
  const shown = all ? order : order.slice(0, 4);
  return (
    <MCard c={c} style={{ overflow: "hidden", marginBottom: 12 }} data-strength>
      <button
        type="button"
        aria-expanded={open}
        aria-label={`Listing strength, ${done} of ${total} done`}
        onClick={() => setOpen((o) => !o)}
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", width: "100%", background: "transparent", border: 0, textAlign: "left", color: c.ink, cursor: "pointer" }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <p style={{ fontSize: px(14), fontWeight: 800, lineHeight: lh(21) }}>Listing strength</p>
            <p style={{ fontSize: px(12), fontWeight: 800, color: c.pDark, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", lineHeight: lh(18) }}>{`${done} of ${total} done`}</p>
          </div>
          <div aria-hidden style={{ display: "grid", gridTemplateColumns: `repeat(${total}, minmax(0,1fr))`, gap: 3, marginTop: 9 }}>
            {items.map((x) => (
              <span key={x.key} style={{ height: 6, borderRadius: 999, background: x.done ? c.primary : c.track }} />
            ))}
          </div>
          <p style={{ fontSize: px(11.5), lineHeight: lh(16), color: c.faint, marginTop: 8, textWrap: "pretty" } as React.CSSProperties}>{strengthLine(items, emptyLine)}</p>
        </div>
        <span className="motion-safe:transition-transform" style={{ display: "flex", color: c.tert, transform: open ? "rotate(180deg)" : "none", transitionDuration: "200ms", flexShrink: 0 }}>
          <ChevronDown size={18} strokeWidth={2.2} aria-hidden />
        </span>
      </button>
      {open && (
        <div style={{ borderTop: `1px solid ${c.divider}` }}>
          {shown.map((x, i) => (
            <button
              key={x.key}
              type="button"
              onClick={() => onItem(x)}
              aria-label={`${x.title}${x.sub ? `, ${x.sub}` : ""}${x.done ? ", done" : ""}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                minHeight: 52,
                padding: "8px 16px",
                width: "100%",
                borderTop: i ? `1px solid ${c.divider}` : "none",
                borderLeft: 0,
                borderRight: 0,
                borderBottom: 0,
                background: highlight === x.key ? c.goodBg : "transparent",
                textAlign: "left",
                color: c.ink,
                cursor: "pointer",
                transition: "background .3s",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: x.done ? c.good : "transparent",
                  border: `1.5px solid ${x.done ? c.good : c.tert}`,
                  color: "#FFFFFF",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  boxSizing: "border-box",
                }}
              >
                {x.done && <Check size={13} strokeWidth={3} aria-hidden />}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: px(13), fontWeight: 700, color: x.done ? c.faint : c.ink, lineHeight: lh(19.5) }}>{x.title}</span>
                {x.sub && <span style={{ display: "block", fontSize: px(11.5), color: c.faint, lineHeight: lh(16) }}>{x.sub}</span>}
              </span>
              {!x.done && <span style={{ fontSize: px(12), fontWeight: 800, color: c.pDark, whiteSpace: "nowrap" }}>{x.key === "photos" ? "Add" : "Set up"}</span>}
              <ChevronRight size={15} color={c.tert} aria-hidden style={{ flexShrink: 0 }} />
            </button>
          ))}
          {total > 4 && (
            <button
              type="button"
              onClick={() => setAll((a) => !a)}
              aria-expanded={all}
              style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, minHeight: 44, width: "100%", borderTop: `1px solid ${c.divider}`, borderLeft: 0, borderRight: 0, borderBottom: 0, background: "transparent", fontSize: px(12), fontWeight: 800, color: c.pDark, cursor: "pointer" }}
            >
              {all ? "Show less" : `Show all ${total}`}
              {all ? <ChevronUp size={14} strokeWidth={2.4} aria-hidden /> : <ChevronDown size={14} strokeWidth={2.4} aria-hidden />}
            </button>
          )}
        </div>
      )}
    </MCard>
  );
}

// ---------------------------------------------------------------------------
// Your card (MA1-001 rows 6-7)

export interface CardModel {
  name: string;
  type: string | null;
  categories: string[];
  location: string | null;
  bio: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  meta: string;
  chips: string[];
  rating: { average: number; count: number } | null;
}

export function typeLine(type: string | null, categories: string[]): string {
  const cats = categories.map((k) => CATEGORY_LABEL[k] ?? k);
  return cats.length ? `${typeLabel(type)} · ${cats.join(", ")}` : typeLabel(type);
}

/** The client card body (MA1-001 rows 6c-6k); shared by the Preview page. */
export function MiniCard({ c, m, dim, emptyAddress, emptyBio }: { c: MarketPalette; m: CardModel; dim?: boolean; emptyAddress: string; emptyBio: string }) {
  return (
    <div style={{ borderRadius: 18, border: `1px solid ${c.border}`, overflow: "hidden", opacity: dim ? 0.55 : 1 }}>
      <div style={{ position: "relative", height: 96, background: c.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {m.coverUrl && <img src={m.coverUrl} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />}
        <span
          style={{
            position: "relative",
            width: 46,
            height: 46,
            borderRadius: 14,
            background: c.card,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: px(15),
            fontWeight: 800,
            color: c.pDark,
            boxShadow: "0 2px 8px rgba(36,31,27,0.12)",
            overflow: "hidden",
          }}
        >
          {m.logoUrl ? <img src={m.logoUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : initialsOf(m.name)}
        </span>
      </div>
      <div style={{ padding: "10px 12px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <p style={{ flex: 1, minWidth: 0, fontSize: px(15), fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: c.ink, lineHeight: lh(22.5) }}>{m.name}</p>
          {m.rating && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, fontSize: px(12.5), fontWeight: 800, whiteSpace: "nowrap", color: c.ink }} aria-label={`Rated ${m.rating.average.toFixed(1)} from ${m.rating.count} reviews`}>
              <Star size={13} fill={c.gold} strokeWidth={0} color={c.gold} aria-hidden />
              {m.rating.average.toFixed(1)}
              <span style={{ fontWeight: 600, color: c.faint }}>({m.rating.count})</span>
            </span>
          )}
        </div>
        <p style={{ fontSize: px(12), fontWeight: 600, color: c.pDark, lineHeight: lh(18) }}>{typeLine(m.type, m.categories)}</p>
        <p style={{ fontSize: px(11.5), color: c.faint, lineHeight: lh(17.25) }}>{m.location?.trim() || emptyAddress}</p>
        <p style={{ fontSize: px(12), color: c.inkSoft, lineHeight: lh(17), marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>{m.bio?.trim() || emptyBio}</p>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: px(11.5), color: c.faint }}>{m.meta}</span>
          {m.chips.map((t) => (
            <span key={t} style={{ fontSize: px(10), fontWeight: 800, color: c.pDark, background: c.pale, borderRadius: 999, padding: "2px 8px" }}>
              {t}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function YourCard({
  c,
  m,
  active,
  emptyBusiness,
  listedSub,
  listedEmptySub,
  hiddenSub,
  canSwitch,
  onPreview,
  onSwitch,
  emptyAddress,
  emptyBio,
  error,
}: {
  c: MarketPalette;
  m: CardModel;
  active: boolean;
  emptyBusiness: boolean;
  listedSub: string;
  listedEmptySub: string;
  hiddenSub: string;
  canSwitch: boolean;
  onPreview: () => void;
  onSwitch: (on: boolean) => void;
  emptyAddress: string;
  emptyBio: string;
  error: string | null;
}) {
  return (
    <MCard c={c} style={{ overflow: "hidden" }} data-yourcard>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 0" }}>
        <p style={{ fontSize: px(10.5), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.faint, whiteSpace: "nowrap" }}>Your card</p>
        <MLink c={c} onClick={onPreview}>
          <Eye size={14} strokeWidth={2.2} aria-hidden />
          Preview as client
        </MLink>
      </div>
      <div style={{ margin: "12px 16px 0" }}>
        <MiniCard c={c} m={m} dim={!active} emptyAddress={emptyAddress} emptyBio={emptyBio} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 14px" }}>
        <span aria-hidden style={{ width: 8, height: 8, borderRadius: 999, background: active ? c.good : c.tert, boxShadow: `0 0 0 3px ${active ? c.goodBg : c.soft}`, flexShrink: 0 }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: px(13), fontWeight: 800, color: active ? c.good : c.faint, lineHeight: lh(19.5) }}>{active ? "Listed on Explore" : "Hidden from Explore"}</span>
          <span style={{ display: "block", fontSize: px(11.5), color: c.inkSoft, lineHeight: lh(16) }}>{active ? (emptyBusiness ? listedEmptySub : listedSub) : hiddenSub}</span>
        </span>
        <MSwitch c={c} large on={active} onChange={onSwitch} label="Show on Explore" disabled={!canSwitch} />
      </div>
      {error && (
        <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: c.high, padding: "0 16px 12px", lineHeight: lh(16) }}>
          {error}
        </p>
      )}
    </MCard>
  );
}

// ---------------------------------------------------------------------------
// Photos card (MA1-001 rows 8-8c)

export function PhotosCard({ c, photos, line, onOpen }: { c: MarketPalette; photos: string[]; line: string; onOpen: () => void }) {
  const slots = [0, 1, 2, 3];
  return (
    <MCard c={c} style={{ marginTop: 12, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(21) }}>Photos</p>
        <MLink c={c} onClick={onOpen} style={{ gap: 2 }}>
          {photos.length ? "Manage" : "Add photos"}
          <ChevronRight size={14} aria-hidden />
        </MLink>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 6 }}>
        {slots.map((i) =>
          photos[i] ? (
            <span key={i} style={{ position: "relative", aspectRatio: "4 / 3", borderRadius: 10, overflow: "hidden", background: c.pale }}>
              <img src={photos[i]} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              {i === 0 && (
                <span style={{ position: "absolute", left: 4, top: 4, fontSize: px(8.5), fontWeight: 800, background: c.card, color: c.ink, borderRadius: 999, padding: "1px 5px" }}>Cover</span>
              )}
            </span>
          ) : (
            <button
              key={i}
              type="button"
              onClick={onOpen}
              aria-label="Add photos"
              tabIndex={i === photos.length ? 0 : -1}
              style={{ aspectRatio: "4 / 3", borderRadius: 10, border: `1.5px dashed ${c.tert}`, background: "transparent", color: c.faint, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <Plus size={16} strokeWidth={2} aria-hidden />
            </button>
          )
        )}
      </div>
      <p style={{ fontSize: px(11.5), color: c.faint, marginTop: 8, lineHeight: lh(17.25) }}>{line}</p>
    </MCard>
  );
}

// ---------------------------------------------------------------------------
// Activities / Item categories (MA1-001 row 9, MA1-037)

export function CategoriesCard({
  c,
  kind,
  title,
  sub,
  value,
  canEdit,
  onApply,
  openSignal,
}: {
  c: MarketPalette;
  kind: "classes" | "gym" | "store";
  title: string;
  sub: string;
  value: string[];
  canEdit: boolean;
  onApply: (next: string[]) => Promise<string | null>;
  /** Bumped by the strength checklist's Activities row: scroll here and open. */
  openSignal: number;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string[]>(value);
  const [up, setUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fieldRef = useRef<HTMLButtonElement | null>(null);
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [lastSignal, setLastSignal] = useState(openSignal);
  const options = CATEGORY_KEYS[kind];

  const show = () => {
    setDraft(value);
    setError(null);
    setOpen(true);
  };
  if (openSignal !== lastSignal) {
    setLastSignal(openSignal);
    if (canEdit) show();
  }

  useLayoutEffect(() => {
    if (!open || !fieldRef.current) return;
    const r = fieldRef.current.getBoundingClientRect();
    // PopupMenu rule: open upward (as drawn) unless there is no room above.
    const menuH = 120 + options.length * 50;
    setUp(r.top > menuH || window.innerHeight - r.bottom < menuH);
    cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open, options.length]);

  const toggle = (k: string) => setDraft((d) => (d.includes(k) ? d.filter((x) => x !== k) : d.length >= MAX_CATEGORIES ? d : [...d, k]));
  const apply = async () => {
    setBusy(true);
    const msg = await onApply(draft);
    setBusy(false);
    if (msg) setError(msg);
    else setOpen(false);
  };
  const chips = value.map((k) => CATEGORY_LABEL[k] ?? k);

  return (
    <div ref={cardRef}>
      <MCard c={c} style={{ marginTop: 12, padding: "14px 16px" }}>
        <p style={{ fontSize: px(14), fontWeight: 800, color: c.ink, lineHeight: lh(21) }}>{title}</p>
        <p style={{ fontSize: px(11.5), color: c.faint, marginTop: 2, lineHeight: lh(17.25) }}>{sub}</p>
        <div style={{ position: "relative" }}>
          <button
            ref={fieldRef}
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-label={`${title}: ${chips.length ? chips.join(", ") : "none chosen"}`}
            disabled={!canEdit}
            onClick={() => (open ? setOpen(false) : show())}
            style={{
              marginTop: 10,
              display: "flex",
              alignItems: "center",
              gap: 8,
              minHeight: 48,
              width: "100%",
              borderRadius: 14,
              border: `1px solid ${open ? c.primary : c.border}`,
              padding: "6px 12px",
              boxSizing: "border-box",
              flexWrap: "wrap",
              background: "transparent",
              cursor: canEdit ? "pointer" : "default",
              textAlign: "left",
            }}
          >
            {(chips.length ? chips : ["Choose"]).map((t) => (
              <span key={t} style={{ fontSize: px(12), fontWeight: 700, background: c.pale, color: c.deep, borderRadius: 8, padding: "3px 9px" }}>
                {t}
              </span>
            ))}
            <span style={{ marginLeft: "auto", display: "flex", color: c.faint }}>
              <ChevronDown size={16} strokeWidth={2.4} aria-hidden />
            </span>
          </button>
          {open && (
            <div
              role="listbox"
              aria-multiselectable="true"
              aria-label={title}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                ...(up ? { bottom: 56 } : { top: 62 }),
                zIndex: 5,
                background: c.card,
                border: "1px solid rgba(174,161,220,0.5)",
                borderRadius: 14,
                boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
                padding: 8,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "0 0 2px 4px" }}>
                <p style={{ fontSize: px(11), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: c.faint }}>{`${title} · ${draft.length} chosen`}</p>
                <button type="button" aria-label="Close" onClick={() => setOpen(false)} className="tap" style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", color: c.faint, background: "transparent", border: 0 }}>
                  <X size={16} strokeWidth={2.4} aria-hidden />
                </button>
              </div>
              {options.map((k) => {
                const on = draft.includes(k);
                const blocked = !on && draft.length >= MAX_CATEGORIES;
                return (
                  <button
                    key={k}
                    type="button"
                    role="option"
                    aria-selected={on}
                    aria-disabled={blocked}
                    onClick={() => !blocked && toggle(k)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      borderRadius: 8,
                      padding: "9px 10px",
                      marginTop: 6,
                      border: `1px solid ${on ? c.optOn : c.option}`,
                      background: on ? c.pale : c.raised,
                      minHeight: 44,
                      boxSizing: "border-box",
                      width: "100%",
                      textAlign: "left",
                      color: c.ink,
                      opacity: blocked ? 0.45 : 1,
                      cursor: blocked ? "not-allowed" : "pointer",
                    }}
                  >
                    <span style={{ flex: 1, fontSize: px(13), fontWeight: 700 }}>{CATEGORY_LABEL[k] ?? k}</span>
                    <span style={{ display: "flex", color: on ? c.pDark : c.tert }}>{on ? <SquareCheck size={17} strokeWidth={2.4} aria-hidden /> : <Square size={17} strokeWidth={2.4} aria-hidden />}</span>
                  </button>
                );
              })}
              {error && <p role="alert" style={{ fontSize: px(11.5), fontWeight: 700, color: c.high, margin: "8px 4px 0" }}>{error}</p>}
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1.4fr)", gap: 8, marginTop: 10 }}>
                <button type="button" onClick={() => setDraft([])} style={{ height: 40, borderRadius: 10, border: `1px solid ${c.option}`, color: c.inkSoft, background: "transparent", fontSize: px(13), fontWeight: 700 }}>
                  Clear
                </button>
                <button type="button" onClick={() => void apply()} disabled={busy} style={{ height: 40, borderRadius: 10, background: c.fill, color: c.onFill, border: 0, fontSize: px(13), fontWeight: 800, opacity: busy ? 0.6 : 1 }}>
                  {`Apply · ${draft.length}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </MCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rating card (MA1-001 row 10)

export function RatingCard({ c, average, count, onOpen }: { c: MarketPalette; average: number | null; count: number; onOpen: () => void }) {
  if (count === 0) return null;
  const few = count < 3 || average === null;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={few ? "No reviews yet" : `Rated ${average.toFixed(1)} from ${count} reviews`}
      style={{ marginTop: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, width: "100%", borderRadius: 24, background: c.card, border: `1px solid ${c.border}`, textAlign: "left", color: c.ink, cursor: "pointer" }}
    >
      {few ? (
        <span style={{ flex: 1, fontSize: px(13), fontWeight: 800 }}>No reviews yet</span>
      ) : (
        <>
          <span style={{ fontSize: px(30), fontWeight: 800, letterSpacing: "-0.03em", lineHeight: lh(32) }}>{average.toFixed(1)}</span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "flex", gap: 2 }} aria-hidden>
              {[0, 1, 2, 3, 4].map((i) => (
                <span key={i} style={{ position: "relative", width: 16, height: 16, display: "inline-flex" }}>
                  <Star size={16} strokeWidth={1.6} color={c.goldTrack} style={{ position: "absolute", inset: 0 }} />
                  <span style={{ position: "absolute", inset: 0, width: `${Math.max(0, Math.min(1, average - i)) * 100}%`, overflow: "hidden", color: c.gold }}>
                    <Star size={16} fill={c.gold} strokeWidth={1.6} />
                  </span>
                </span>
              ))}
            </span>
            <span style={{ display: "block", fontSize: px(11.5), color: c.faint, marginTop: 2 }}>{`${count} reviews`}</span>
          </span>
        </>
      )}
      <ChevronRight size={18} strokeWidth={2.2} color={c.tert} aria-hidden />
    </button>
  );
}
