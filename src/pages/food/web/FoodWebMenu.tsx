import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check } from "lucide-react";

// Website viewport v1 · WC-FO (Popup Menu, big: the web anchored dropdown):
// a white card 6 under its trigger, lined up with the trigger's start edge
// (or its end edge), opening upward when less than 220 is left below; border
// 1px #AEA1DC@50%, r14, shadow 0 12px 32px #5F5093@18%, padding 8; rows
// 15/24 at padding 8 × 12, r8, 6 apart, #FAFAFB with a #E5E6EB border,
// hover #F0EDF9 + #AEA1DC; the selected row #F0EDF9 + #AEA1DC, 700, a check
// 13/3 #7D6BB5. The page behind dims to #241F1B@18%. Esc and a click outside
// close it; Esc returns focus to the trigger. Arrow keys move between rows.

export interface FoodWebMenuOption<V extends string> {
  value: V;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  destructive?: boolean;
}

export function FoodWebMenu<V extends string>({
  anchor,
  options,
  onSelect,
  onClose,
  width,
  selected,
  align = "start",
  label,
}: {
  anchor: HTMLElement;
  options: FoodWebMenuOption<V>[];
  onSelect: (v: V) => void;
  onClose: () => void;
  /** The card's content width (the card adds 8 padding and a 1 border each side). */
  width: number;
  selected?: V | null;
  align?: "start" | "end";
  label?: string;
}) {
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; up: boolean } | null>(null);
  const card = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      const vw = document.documentElement.clientWidth;
      const vh = window.innerHeight;
      const cardW = width + 18;
      const atEnd = (align === "end") !== rtl;
      let left = atEnd ? r.right - cardW : r.left;
      left = Math.min(Math.max(8, left), vw - 8 - cardW);
      const below = vh - r.bottom - 6;
      const up = below < 220 && r.top > below;
      setPos(up ? { bottom: vh - r.top + 6, left, up } : { top: r.bottom + 6, left, up });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [anchor, width, align]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        closeRef.current();
        anchor.focus();
        return;
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        const items = Array.from(card.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? []);
        if (!items.length) return;
        e.preventDefault();
        const i = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
        items[next].focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [anchor]);

  useEffect(() => {
    if (pos) card.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus({ preventScroll: true });
  }, [pos]);

  if (!pos) return null;
  return createPortal(
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      <div className="absolute inset-0 animate-fade-in" style={{ background: "rgba(36,31,27,0.18)" }} onClick={onClose} />
      <div
        ref={card}
        role="menu"
        aria-label={label}
        data-food-web-menu
        className="absolute"
        style={{
          top: pos.top,
          bottom: pos.bottom,
          left: pos.left,
          width,
          boxSizing: "content-box",
          background: "#FFFFFF",
          border: "1px solid rgba(174,161,220,0.5)",
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
          padding: 8,
          animation: "popup-menu-in .22s cubic-bezier(.22,1,.36,1) both",
          ["--pm-dy" as string]: pos.up ? "6px" : "-6px",
        } as React.CSSProperties}
      >
        <style>{`@keyframes popup-menu-in { 0% { opacity: 0; transform: translateY(var(--pm-dy)); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
        {options.map((o, i) => {
          const on = selected !== undefined && selected === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role={selected !== undefined ? "menuitemradio" : "menuitem"}
              aria-checked={selected !== undefined ? on : undefined}
              disabled={o.disabled}
              onClick={() => {
                onSelect(o.value);
                onClose();
              }}
              className={`w-full flex items-center text-start disabled:opacity-40 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC] ${on || o.disabled ? "" : "hover:!bg-[#F0EDF9] hover:!border-[#AEA1DC] focus-visible:!bg-[#F0EDF9]"}`}
              style={{
                gap: 9,
                marginTop: i ? 6 : 0,
                borderRadius: 8,
                padding: "8px 12px",
                border: `1px solid ${on ? "#AEA1DC" : "#E5E6EB"}`,
                background: on ? "#F0EDF9" : "#FAFAFB",
                color: o.destructive ? "rgb(192,57,43)" : "#241F1B",
                fontSize: 15,
                lineHeight: "24px",
                fontWeight: on ? 700 : 500,
              }}
            >
              {o.icon && <span className="flex shrink-0" aria-hidden>{o.icon}</span>}
              <span className="flex-1 min-w-0">{o.label}</span>
              {on && <Check size={13} strokeWidth={3} color="#7D6BB5" aria-hidden />}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  );
}
