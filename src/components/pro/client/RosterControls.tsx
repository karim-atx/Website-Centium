import React from "react";
import { ChevronDown } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";

/**
 * Release 3 · CL3 v6 roster controls (source gen/r8.js scrollRow8, segs8,
 * qf8; r6b.js filterPanel6; r7.js quickFilters7), literal values:
 * - ScrollRow: the row runs to the right page edge (margin-right -16), gap 6,
 *   pad-right 16, and a 44 wide right-edge fade from transparent to the page
 *   cream; it scrolls sideways.
 * - Status tabs: 36 high (× Larger text), pad 0 12, r12, gap 6, 12.5 / 700;
 *   active fill.segmentedActive (#A79AD5, dark primary fill) with white /
 *   #0D0B1A, idle tab idle (#F5F4FE, dark #2B2C3A) with #6D50D3 / #B7ABDE;
 *   the count 11 / 800 at 80%.
 * - Quick filters: 34 high, pad 0 11, r10, 12 / 600 text.soft on card with a
 *   1px 11% border and a 12 chevron; a filter in use is filled (700).
 * - Filter panel: top 116, 16 in, card, 1px rgba(174,161,220,0.5), r14,
 *   0 12 32 rgba(95,80,147,0.18), pad 8 10 10; group titles 11 / 700 caps
 *   0.1em text.faint (m 10 2 7); chips r8 pad 7 10, 12, on #F0EDF9 with
 *   #AEA1DC (dark #303141 / #9A8CD6) at 700, off #FAFAFB with #E5E6EB
 *   (dark #262932 / #31343C) at 500; Clear and "Show n clients" (sm).
 */

export const ScrollRow: React.FC<{ children: React.ReactNode; label: string; role?: string }> = ({ children, label, role }) => (
  <div className="relative" style={{ margin: "0 -16px 12px 0" }}>
    <div role={role} aria-label={label} className="flex overflow-x-auto no-scrollbar" style={{ gap: 6, padding: "5px 44px 5px 0", margin: "-5px 0" }}>
      {children}
    </div>
    <span aria-hidden className="absolute pointer-events-none" style={{ top: 0, right: 0, bottom: 0, width: 44, background: "linear-gradient(to right, transparent, rgb(var(--c-cream)))" }} />
  </div>
);

export interface StatusTab<K extends string> {
  key: K;
  label: string;
  count: number;
}

export function StatusTabs<K extends string>({ tabs, active, onChange, k }: { tabs: StatusTab<K>[]; active: K; onChange: (k: K) => void; k: number }) {
  return (
    <ScrollRow label="Status" role="tablist">
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.key)}
            className="tap relative flex items-center whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']"
            style={{
              flex: "none",
              height: Math.round(36 * k),
              padding: "0 12px",
              borderRadius: 12,
              gap: 6,
              fontSize: textPx(12.5),
              fontWeight: 700,
              background: on ? "rgb(var(--c-seg-active))" : "var(--c-pro-tab-idle)",
              color: on ? "rgb(var(--c-on-primary-fill))" : "var(--c-pro-tab-idle-ink)",
            }}
          >
            {t.label}
            <span style={{ fontSize: textPx(11), fontWeight: 800, opacity: 0.8, fontVariantNumeric: "tabular-nums" }}>{t.count}</span>
          </button>
        );
      })}
    </ScrollRow>
  );
}

export const QuickFilter: React.FC<{ label: string; on: boolean; onClick: (el: HTMLElement) => void; k: number; expanded: boolean }> = ({ label, on, onClick, k, expanded }) => (
  <button
    type="button"
    aria-haspopup="menu"
    aria-expanded={expanded}
    onClick={(e) => onClick(e.currentTarget)}
    className="tap relative inline-flex items-center whitespace-nowrap before:absolute before:inset-x-0 before:-inset-y-[5px] before:content-['']"
    style={{
      flex: "none",
      gap: 5,
      height: Math.round(34 * k),
      padding: "0 11px",
      borderRadius: 10,
      fontSize: textPx(12),
      fontWeight: on ? 700 : 600,
      background: on ? INK.fill : INK.card,
      color: on ? INK.onFill : INK.chS,
      border: `1px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}`,
    }}
  >
    {label}
    <ChevronDown size={12} strokeWidth={2.2} aria-hidden style={{ color: on ? INK.onFill : INK.chF }} />
  </button>
);

export interface FilterGroup {
  key: string;
  title: string;
  options: { value: string; label: string }[];
}

export const FilterPanel: React.FC<{
  open: boolean;
  groups: FilterGroup[];
  selected: Record<string, string[]>;
  onToggle: (group: string, value: string) => void;
  onClear: () => void;
  onClose: () => void;
  showLabel: string;
}> = ({ open, groups, selected, onToggle, onClear, onClose, showLabel }) => {
  const dark = useIsDark();
  if (!open) return null;
  return (
    <div className="fixed inset-0" style={{ zIndex: 60 }}>
      <button type="button" aria-label="Close filters" className="absolute inset-0" style={{ background: "rgba(36,31,27,0.18)" }} onClick={onClose} />
      <div
        role="dialog"
        aria-label="Filter"
        className="absolute overflow-y-auto"
        style={{
          top: 116,
          left: "max(16px, calc(50% - 199px))",
          right: "max(16px, calc(50% - 199px))",
          maxHeight: "calc(100vh - 220px)",
          background: INK.card,
          border: "1px solid rgba(174,161,220,0.5)",
          borderRadius: 14,
          boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
          padding: "8px 10px 10px",
        }}
      >
        {groups.map((g) => (
          <div key={g.key} role="group" aria-label={g.title}>
            <p style={{ fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: INK.chF, margin: "10px 2px 7px" }}>{g.title}</p>
            <div className="flex flex-wrap" style={{ gap: 6 }}>
              {g.options.map((o) => {
                const on = (selected[g.key] ?? []).includes(o.value);
                return (
                  <button
                    key={o.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(g.key, o.value)}
                    className="tap whitespace-nowrap"
                    style={{
                      minHeight: 36,
                      borderRadius: 8,
                      padding: "7px 10px",
                      fontSize: textPx(12),
                      border: `1px solid ${on ? (dark ? "#9A8CD6" : "#AEA1DC") : dark ? "#31343C" : "#E5E6EB"}`,
                      background: on ? (dark ? "#303141" : "#F0EDF9") : dark ? "#262932" : "#FAFAFB",
                      color: INK.ch,
                      fontWeight: on ? 700 : 500,
                    }}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="flex" style={{ gap: 8, marginTop: 14 }}>
          <CtaButton className="flex-1" variant="secondary" size="base" label="Clear" onClick={onClear} />
          <CtaButton className="flex-1" size="base" label={showLabel} onClick={onClose} />
        </div>
      </div>
    </div>
  );
};
