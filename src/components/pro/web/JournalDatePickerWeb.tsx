import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { appLocale } from "../../../i18n/format";
import { t } from "../../../i18n/core";

// Professional handover v1, WP-NU-MP.2.1 (WP-NU Meal Plans Web v3, `datePop`):
// web only. The journal header's 40 calendar button (r12, #F0EDF9 while open)
// opens a centred 392 popup (r24, 20 24 24, the 0 24 64 shadow, over a 32%
// scrim): "Jump to a date" 17/24 700 with the 36 close circle, the month row
// (40 r12 #F3F3FD arrows, the month 17/24 700; no month after today's), the
// Mon-first grid (heads 12/16 700 #8C8378; days 44 high, r12, 15/20, a 5 dot):
// the open day #A79AD5 white, a logged day #F3F3FD #5F5093 700 with a
// #7D6BB5 dot, a future day at 35%. Only logged days can be picked. Under it
// the legend "Days {name} logged food".

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;

export const JournalDateButton: React.FC<{ open: boolean; onOpen: () => void }> = ({ open, onOpen }) => (
  <button
    type="button"
    aria-label={t("Jump to a date")}
    title={t("Jump to a date")}
    aria-haspopup="dialog"
    aria-expanded={open}
    onClick={onOpen}
    className="flex items-center justify-center shrink-0 hover:bg-[#F0EDF9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
    style={{ width: 40, height: 40, boxSizing: "border-box", borderRadius: 12, background: open ? "#F0EDF9" : "#FFFFFF", border: `1px solid ${open ? "#AEA1DC" : "rgba(36,31,27,0.10)"}` }}
  >
    <CalendarDays size={20} strokeWidth={1.9} aria-hidden style={{ color: "#5F5093" }} />
  </button>
);

export const JournalDatePickerWeb: React.FC<{
  open: boolean;
  onClose: () => void;
  /** YYYY-MM-DD of the open day. */
  current: string;
  today: string;
  /** Days the client logged food (YYYY-MM-DD). */
  logged: string[];
  firstName: string;
  onPick: (day: string) => void;
}> = ({ open, onClose, current, today, logged, firstName, onPick }) => {
  const [month, setMonth] = useState(() => ({ y: Number(current.slice(0, 4)), m: Number(current.slice(5, 7)) - 1 }));
  const box = useRef<HTMLDivElement | null>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const id = window.setTimeout(() => box.current?.querySelector<HTMLElement>("[aria-pressed=true], button[data-day]")?.focus(), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(id);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const set = new Set(logged);
  const first = new Date(month.y, month.m, 1);
  const blanks = (first.getDay() + 6) % 7;
  const count = new Date(month.y, month.m + 1, 0).getDate();
  const ty = Number(today.slice(0, 4));
  const tm = Number(today.slice(5, 7)) - 1;
  const atLast = month.y > ty || (month.y === ty && month.m >= tm);
  const loc = appLocale("en-GB");
  const title = first.toLocaleDateString(loc, { month: "long", year: "numeric" });
  const heads = Array.from({ length: 7 }, (_, i) => new Date(2024, 0, 1 + i).toLocaleDateString(loc, { weekday: "narrow" }));
  const step = (d: number) => setMonth(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const arrow: React.CSSProperties = { width: 40, height: 40, borderRadius: 12, background: "#F3F3FD" };

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 70, background: "rgba(36,31,27,0.32)" }} onClick={onClose}>
      <div
        ref={box}
        role="dialog"
        aria-modal="true"
        aria-label={t("Jump to a date")}
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col"
        style={{ width: 392, maxWidth: "calc(100vw - 32px)", boxSizing: "border-box", borderRadius: 24, background: "#FFFFFF", boxShadow: "0 24px 64px rgba(36,31,27,0.24)", padding: "20px 24px 24px", gap: 16 }}
      >
        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <p style={{ margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>{t("Jump to a date")}</p>
          <button type="button" aria-label={t("Close")} onClick={onClose} className="flex items-center justify-center shrink-0 hover:bg-[rgba(36,31,27,0.09)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ width: 36, height: 36, borderRadius: 999, background: "rgba(36,31,27,0.05)" }}>
            <X size={16} strokeWidth={2} aria-hidden style={{ color: "#5B5349" }} />
          </button>
        </div>
        <div className="flex items-center justify-between" style={{ gap: 12 }}>
          <button type="button" aria-label={t("Previous month")} onClick={() => step(-1)} className="flex items-center justify-center hover:bg-[#ECE8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={arrow}>
            <ChevronLeft size={18} strokeWidth={2.2} aria-hidden style={{ color: "#5F5093" }} />
          </button>
          <span aria-live="polite" style={{ fontSize: 17, lineHeight: "24px", fontWeight: 700, color: "#241F1B" }}>
            {title}
          </span>
          <button type="button" aria-label={t("Next month")} disabled={atLast} onClick={() => step(1)} className="flex items-center justify-center enabled:hover:bg-[#ECE8FB] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]" style={{ ...arrow, opacity: atLast ? 0.4 : 1 }}>
            <ChevronRight size={18} strokeWidth={2.2} aria-hidden style={{ color: "#5F5093" }} />
          </button>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4 }}>
          {heads.map((h, i) => (
            <span key={i} aria-hidden className="flex items-center justify-center" style={{ height: 24, fontSize: 12, lineHeight: "16px", fontWeight: 700, color: "#8C8378" }}>
              {h}
            </span>
          ))}
          {Array.from({ length: blanks }, (_, i) => (
            <span key={`b${i}`} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const d = i + 1;
            const day = iso(month.y, month.m, d);
            const sel = day === current;
            const has = set.has(day);
            const future = day > today;
            const label = new Date(month.y, month.m, d).toLocaleDateString(loc, { day: "numeric", month: "long" });
            return (
              <button
                key={day}
                type="button"
                data-day={has ? "" : undefined}
                aria-label={has ? t("{date}, logged", { date: label }) : label}
                aria-pressed={sel}
                disabled={!has}
                onClick={() => {
                  onPick(day);
                  onClose();
                }}
                className={`flex flex-col items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#7248F8] ${has && !sel ? "hover:bg-[#ECE8FB]" : ""}`}
                style={{ height: 44, gap: 3, borderRadius: 12, background: sel ? "#A79AD5" : has ? "#F3F3FD" : "transparent", color: sel ? "#FFFFFF" : has ? "#5F5093" : "#241F1B", fontSize: 15, lineHeight: "20px", fontWeight: sel || has ? 700 : 500, opacity: future ? 0.35 : 1, cursor: has ? "pointer" : "default" }}
              >
                {d.toLocaleString(loc)}
                <span aria-hidden style={{ width: 5, height: 5, borderRadius: 999, background: sel ? "#FFFFFF" : has ? "#7D6BB5" : "transparent" }} />
              </button>
            );
          })}
        </div>
        <p className="flex items-center" style={{ margin: 0, gap: 8, fontSize: 13, lineHeight: "20px", color: "#8C8378" }}>
          <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: "#7D6BB5" }} />
          {firstName ? t("Days {name} logged food", { name: firstName }) : t("Days with food logged")}
        </p>
      </div>
    </div>,
    document.body
  );
};
