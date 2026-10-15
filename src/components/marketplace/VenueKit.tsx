import React, { useCallback, useState } from "react";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, TriangleAlert, UserRound, type LucideIcon } from "lucide-react";
import { Toast } from "../ui/Toast";

/** K17 · the OpsTabsV4 toast (business variant, shape "ops", 3000 ms). */
export function useOpsToast(): [React.ReactNode, (message: string) => void] {
  const [msg, setMsg] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const show = useCallback((m: string) => {
    setMsg(m);
    setN((k) => k + 1);
  }, []);
  const node = <Toast key={n} open={!!msg} message={msg ?? ""} variant="business" shape="ops" onExpire={() => setMsg(null)} />;
  return [node, show];
}

// The venue console kit (OURS-OP1-venue-console-page.md, K1-K14): the
// OpsTabsV4 detail-page parts the console, its rosters and the member pages
// are rebuilt from. Every value is the measured one from that file's Kit
// table (light · dark through the app tokens, so the five colour themes,
// Larger text and High contrast follow):
//   page #FFFFFF · #121317 = bg-cream; card #FFFFFF · #1C1F28 = bg-cream-card;
//   soft #F5F5F6 · #242730 = bg-cream-soft; ink / inkSoft / faint / tert =
//   charcoal / -soft / -faint / -tertiary; pale #F0EDF9 · #303141 =
//   primary-pale; pDark #7D6BB5 · #C3B3FB = primary-dark; deep #5F5093 ·
//   #C3B3FB = primary-deep-text; card border rgba(36,31,27,0.11) ·
//   rgba(245,243,250,0.08); dividers rgba(…,0.06).

export const CARD = "bg-cream-card border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08]";
export const DIVIDER = "border-charcoal/[0.06]";

/** K2 · Back row: 44 back + 13/700 faint label, margin -6 0 10 -10. */
export const VBackRow: React.FC<{ label: string; onBack: () => void }> = ({ label, onBack }) => (
  <div className="flex items-center" style={{ margin: "-6px 0 10px -10px" }}>
    <button
      type="button"
      onClick={onBack}
      aria-label={`Back to ${label}`}
      className="tap flex items-center gap-[6px] min-h-[44px] pr-2 rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
    >
      <span className="w-[44px] h-[44px] flex items-center justify-center text-charcoal">
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      </span>
      <span className="text-[13px] font-bold text-charcoal-faint">{label}</span>
    </button>
  </div>
);

/** K8 · Pill tones (OpsTabsV4 pill()). */
export type PillTone = "good" | "caution" | "soft" | "pale" | "high";
const PILL: Record<PillTone, string> = {
  good: "bg-status-good-bg text-status-good",
  caution: "bg-status-caution-bg text-caution-strong [html.high-contrast:not(.dark)_&]:text-caution-text",
  soft: "bg-cream-soft text-charcoal-faint",
  pale: "bg-primary-pale text-primary-dark",
  high: "bg-status-high-bg text-status-high",
};
export const VPill: React.FC<{ tone: PillTone; label: string; size?: "head" | "row"; className?: string }> = ({ tone, label, size = "row", className }) => (
  <span
    className={clsx(
      "inline-flex items-center shrink-0 rounded-full whitespace-nowrap font-extrabold",
      size === "head" ? "text-[10.5px] leading-[14px] px-[8px] py-[2px]" : "text-[10px] leading-[14px] px-[7px] py-[2px]",
      PILL[tone],
      className
    )}
  >
    {label}
  </span>
);

/** K3 · Detail head: 60 r16 pale tile, 22/800 title, pill, sub, sub2. */
export const VDetailHead: React.FC<{
  tile: React.ReactNode;
  title: React.ReactNode;
  pill?: React.ReactNode;
  sub?: React.ReactNode;
  sub2?: React.ReactNode;
  id?: string;
}> = ({ tile, title, pill, sub, sub2, id }) => (
  <div id={id} className="flex items-start gap-[14px]">
    <span className="relative w-[60px] h-[60px] rounded-[16px] overflow-hidden bg-primary-pale text-primary-dark flex items-center justify-center shrink-0 text-[18px] font-extrabold">
      {tile}
    </span>
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-[8px] gap-y-[4px]">
        <h1 className="text-[22px] leading-[27px] font-extrabold tracking-[-0.02em] text-charcoal min-w-0 [overflow-wrap:anywhere]">{title}</h1>
        {pill}
      </div>
      {sub && <p className="text-[13px] leading-[18px] text-charcoal-soft mt-[3px]">{sub}</p>}
      {sub2 && <div className="text-[12px] leading-[16px] text-charcoal-faint">{sub2}</div>}
    </div>
  </div>
);

/** K4 · Action tiles: grid gap 6, mt 16, min-h 60 r16 soft, icon 17/2.1, 11/800. */
export const VActionTiles: React.FC<{ items: { icon: LucideIcon; label: string; onClick: () => void; disabled?: boolean }[] }> = ({ items }) => (
  <div className="grid gap-[6px] mt-[16px]" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
    {items.map((t) => (
      <button
        key={t.label}
        type="button"
        onClick={t.onClick}
        disabled={t.disabled}
        className="tap min-h-[60px] rounded-[16px] bg-cream-soft text-charcoal flex flex-col items-center justify-center gap-[4px] px-1 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
      >
        <t.icon size={17} strokeWidth={2.1} aria-hidden />
        <span className="text-[11px] font-extrabold leading-[14px] text-center">{t.label}</span>
      </button>
    ))}
  </div>
);

/** A value in a number box: "–" in tert while loading (OpsTabsV4 vInk). */
export type NumberBox = { label: string; value: string | null; delta?: React.ReactNode };

/** K5 · Number-box card: two boxes, 30/800 values, a line under them. */
export const VNumberCard: React.FC<{ boxes: [NumberBox, NumberBox]; line?: React.ReactNode; className?: string }> = ({ boxes, line, className }) => (
  <div className={clsx(CARD, "rounded-[22px] overflow-hidden", className)}>
    <div className="grid" style={{ gridTemplateColumns: "minmax(0,1fr) 1px minmax(0,1fr)" }}>
      {boxes.map((b, i) => (
        <React.Fragment key={b.label}>
          {i === 1 && <span aria-hidden className="bg-charcoal/[0.06]" />}
          <div className="min-w-0" style={{ padding: "14px 14px 12px" }}>
            <p className="text-[11.5px] font-bold leading-[15px] text-charcoal-faint">{b.label}</p>
            <p className="flex items-baseline gap-[6px] mt-[4px]">
              <span
                className={clsx(
                  "text-[30px] leading-[34px] font-extrabold tracking-[-0.03em] tabular-nums whitespace-nowrap",
                  b.value === null ? "text-charcoal-tertiary" : "text-charcoal"
                )}
              >
                {b.value ?? "–"}
              </span>
              {b.delta}
            </p>
          </div>
        </React.Fragment>
      ))}
    </div>
    {line && <div className={clsx("border-t text-[12px] leading-[17px] text-charcoal-soft [text-wrap:pretty]", DIVIDER)} style={{ padding: "10px 14px 12px" }}>{line}</div>}
  </div>
);

/** K6 · Group header: margin 22 4 8; left 10.5/800 0.08em uppercase faint; right 11 faint. */
export const VGroupHeader: React.FC<{ left: string; right?: React.ReactNode; className?: string }> = ({ left, right, className }) => (
  <div className={clsx("flex items-baseline justify-between gap-3", className)} style={{ margin: "22px 4px 8px" }}>
    <h2 className="text-[10.5px] font-extrabold tracking-[0.08em] uppercase text-charcoal-faint">{left}</h2>
    {right && <span className="text-[11px] text-charcoal-faint text-right">{right}</span>}
  </div>
);

/** K7 · List card (r20) holding K7 rows split by a divider. */
export const VListCard: React.FC<{ children: React.ReactNode; className?: string; label?: string }> = ({ children, className, label }) => (
  <div role={label ? "list" : undefined} aria-label={label} className={clsx(CARD, "rounded-[20px] overflow-hidden", className)}>
    {children}
  </div>
);

/** K7 · List row: padding 12 14, min-h 64, tile 44 r12 pale, title 14/800, lines, trailing. */
export const VListRow: React.FC<{
  tile: React.ReactNode;
  title: React.ReactNode;
  pill?: React.ReactNode;
  line1?: React.ReactNode;
  line2?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  pressed?: boolean;
  first?: boolean;
}> = ({ tile, title, pill, line1, line2, trailing, onClick, pressed, first }) => {
  const inner = (
    <>
      <span className="relative w-[44px] h-[44px] rounded-[12px] overflow-hidden bg-primary-pale text-primary-dark flex items-center justify-center shrink-0 text-[14px] font-extrabold">
        {tile}
      </span>
      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
          <span className="text-[14px] leading-[18px] font-extrabold text-charcoal [text-wrap:balance] [overflow-wrap:anywhere]">{title}</span>
          {pill}
        </span>
        {line1 && <span className="block text-[12px] leading-[16px] text-charcoal-soft mt-[2px]">{line1}</span>}
        {line2 && <span className="block text-[11px] leading-[15px] text-charcoal-faint mt-[1px]">{line2}</span>}
      </span>
      {trailing}
    </>
  );
  const cls = clsx("w-full flex items-center gap-[12px] min-h-[64px]", !first && "border-t", DIVIDER);
  if (!onClick)
    return (
      <div role="listitem" className={cls} style={{ padding: "12px 14px" }}>
        {inner}
      </div>
    );
  return (
    <div role="listitem">
      <button
        type="button"
        onClick={onClick}
        aria-pressed={pressed}
        className={clsx(cls, "tap active:bg-cream-soft focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark")}
        style={{ padding: "12px 14px" }}
      >
        {inner}
      </button>
    </div>
  );
};

/** K9 · Detail card with rows: header 14/800 + right 11.5 faint, rows, footer / note. */
export const VDetailCard: React.FC<{
  title: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  note?: React.ReactNode;
  className?: string;
  id?: string;
  headerAside?: React.ReactNode;
}> = ({ title, right, children, footer, note, className, id }) => (
  <section id={id} className={clsx(CARD, "rounded-[22px] overflow-hidden mt-[14px] scroll-mt-4", className)}>
    <div className="flex items-baseline justify-between gap-3" style={{ padding: "14px 16px 6px" }}>
      <h2 className="text-[14px] font-extrabold leading-[18px] text-charcoal">{title}</h2>
      {right !== undefined && right !== null && <span className="text-[11.5px] text-charcoal-faint whitespace-nowrap">{right}</span>}
    </div>
    {children}
    {footer}
    {note && (
      <div className={clsx("border-t text-[11.5px] leading-[16px] text-charcoal-faint", DIVIDER)} style={{ padding: "10px 16px 14px" }}>
        {note}
      </div>
    )}
  </section>
);

/** K9 · avatar 34: teal initial, masked, a waitlist number (pale), or an icon. */
export const VAvatar: React.FC<{ initial?: string; masked?: boolean; number?: number | null; icon?: LucideIcon; iconTone?: "faint" | "high" }> = ({
  initial,
  masked,
  number,
  icon: Icon,
  iconTone = "faint",
}) => {
  if (Icon)
    return (
      <span className={clsx("w-[34px] h-[34px] flex items-center justify-center shrink-0", iconTone === "high" ? "text-status-high" : "text-charcoal-faint")} aria-hidden>
        <Icon size={16} />
      </span>
    );
  if (masked)
    return (
      <span className="w-[34px] h-[34px] rounded-full bg-cream-soft text-charcoal-faint flex items-center justify-center shrink-0" aria-hidden>
        <UserRound size={15} />
      </span>
    );
  if (number != null)
    return (
      <span className="w-[34px] h-[34px] rounded-full bg-primary-pale text-primary-dark flex items-center justify-center shrink-0 text-[12px] font-extrabold tabular-nums" aria-hidden>
        {number}
      </span>
    );
  return (
    <span className="w-[34px] h-[34px] rounded-full bg-teal-pale text-teal-text flex items-center justify-center shrink-0 text-[12px] font-extrabold" aria-hidden>
      {initial}
    </span>
  );
};

/** K9 · row: flex gap 10, padding 10 16, divider; title 13/700, sub 11.5/15 faint; right. */
export const VDetailRow: React.FC<{
  avatar?: React.ReactNode;
  title: React.ReactNode;
  titleExtra?: React.ReactNode;
  sub?: React.ReactNode;
  sub2?: React.ReactNode;
  right?: React.ReactNode;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  titleWeight?: 700 | 800;
  disabled?: boolean;
}> = ({ avatar, title, titleExtra, sub, sub2, right, onClick, ariaLabel, titleWeight = 700, disabled }) => {
  const inner = (
    <>
      {avatar}
      <span className="min-w-0 flex-1 text-left">
        <span className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
          <span className={clsx("text-[13px] leading-[17px] text-charcoal [overflow-wrap:anywhere]", titleWeight === 800 ? "font-extrabold" : "font-bold")}>{title}</span>
          {titleExtra}
        </span>
        {sub && <span className="block text-[11.5px] leading-[15px] text-charcoal-faint">{sub}</span>}
        {sub2 && <span className="block text-[11.5px] leading-[15px] text-charcoal-faint">{sub2}</span>}
      </span>
      {right}
    </>
  );
  const cls = clsx("w-full flex items-center gap-[10px] border-t min-h-[54px]", DIVIDER);
  if (!onClick)
    return (
      <div className={cls} style={{ padding: "10px 16px" }}>
        {inner}
      </div>
    );
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      disabled={disabled}
      aria-haspopup={ariaLabel ? undefined : undefined}
      className={clsx(cls, "tap active:bg-cream-soft disabled:opacity-60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark")}
      style={{ padding: "10px 16px" }}
    >
      {inner}
    </button>
  );
};

/** K9 footer: 12.5/800 pDark centred, padding 12 16, border-top, 44 hit. */
export const VFooterLink: React.FC<{ label: string; onClick: () => void; disabled?: boolean; ariaLabel?: string }> = ({ label, onClick, disabled, ariaLabel }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={ariaLabel}
    className={clsx(
      "tap w-full border-t text-center text-[12.5px] font-extrabold text-primary-dark min-h-[44px] disabled:text-charcoal-tertiary focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark",
      DIVIDER
    )}
    style={{ padding: "12px 16px" }}
  >
    {label}
  </button>
);

/** K10 · Pick / outline button: min-h 40 (44 hit), r12, 1px border, 12/800 pDark, icon 14/2.4. */
export const VPickButton: React.FC<{ label: string; icon?: LucideIcon; onClick: () => void; disabled?: boolean; className?: string; tone?: "primary" | "high" }> = ({
  label,
  icon: Icon,
  onClick,
  disabled,
  className,
  tone = "primary",
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={clsx("tap relative inline-flex items-center justify-center my-[2px]", className)}
    style={{ minHeight: 40 }}
  >
    <span aria-hidden className="absolute -inset-y-[2px] inset-x-0" />
    <span
      className={clsx(
        "inline-flex items-center gap-[5px] min-h-[40px] px-[12px] rounded-[12px] border border-solid border-charcoal/[0.11] dark:border-charcoal/[0.08] bg-cream-card text-[12px] font-extrabold",
        tone === "high" ? "text-status-high" : "text-primary-dark",
        disabled && "opacity-50"
      )}
    >
      {Icon && <Icon size={14} strokeWidth={2.4} aria-hidden />}
      {label}
    </span>
  </button>
);

/** K12 · Attention band: card naBd border r22; band naBg, icon naInk, title naTitle. */
export const VAttentionBand: React.FC<{ icon: LucideIcon; title: React.ReactNode; sub?: React.ReactNode; children?: React.ReactNode; className?: string }> = ({
  icon: Icon,
  title,
  sub,
  children,
  className,
}) => (
  <div
    role="status"
    className={clsx(
      "rounded-[22px] overflow-hidden border border-solid bg-cream-card border-[rgba(192,57,43,0.28)] dark:border-[rgba(240,154,142,0.38)]",
      className
    )}
  >
    <div className="flex items-start gap-[10px] bg-[#FCEFED] dark:bg-[#33242A] min-h-[52px]" style={{ padding: "13px 14px 13px 16px" }}>
      <Icon size={17} strokeWidth={2.2} aria-hidden className="shrink-0 mt-[1px] text-[#B8473A] dark:text-[#F09A8E]" />
      <div className="min-w-0">
        <p className="text-[14px] leading-[18px] font-extrabold text-[#8E2F24] dark:text-[#F6C3BB]">{title}</p>
        {sub && <p className="text-[11.5px] leading-[15px] text-charcoal-soft mt-[2px]">{sub}</p>}
      </div>
    </div>
    {children}
  </div>
);

/** K13 · Empty card: dashed tert border, r22, padding 28 20, tile 48 r16 pale, 15/800, 12.5/18. */
export const VEmptyCard: React.FC<{ icon: LucideIcon; title: string; body?: React.ReactNode; children?: React.ReactNode; className?: string }> = ({
  icon: Icon,
  title,
  body,
  children,
  className,
}) => (
  <div className={clsx("bg-cream-card rounded-[22px] border border-dashed border-charcoal-tertiary text-center flex flex-col items-center", className)} style={{ padding: "28px 20px" }}>
    <span className="w-[48px] h-[48px] rounded-[16px] bg-primary-pale text-primary-dark flex items-center justify-center" aria-hidden>
      <Icon size={22} />
    </span>
    <p className="text-[15px] font-extrabold text-charcoal mt-[10px]">{title}</p>
    {body && <p className="text-[12.5px] leading-[18px] text-charcoal-soft mt-[4px] max-w-[300px]">{body}</p>}
    {children}
  </div>
);

/** K14 · Text tabs: gap 20, tab padding 8 0 10, 13.5 (active 800 ink), 2px #AEA1DC · #A991FE underline. */
export function VTextTabs<V extends string>({ tabs, value, onChange, label }: { tabs: { value: V; label: string }[]; value: V; onChange: (v: V) => void; label: string }) {
  return (
    <div role="tablist" aria-label={label} className="flex gap-[20px] border-b border-th-ebeaf6 dark:border-th-aea1dc/[0.16] mb-[16px] overflow-x-auto no-scrollbar">
      {tabs.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(t.value)}
            className={clsx(
              "tap relative whitespace-nowrap text-[13.5px] min-h-[44px] -mb-px border-b-2 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark",
              on ? "font-extrabold text-charcoal border-primary-fill" : "font-semibold text-charcoal-faint border-transparent"
            )}
            style={{ padding: "8px 0 10px" }}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/** A soft skeleton bar (#F5F5F6 · #242730). */
export const VBar: React.FC<{ w: number | string; h: number; r?: number; className?: string }> = ({ w, h, r = 6, className }) => (
  <span aria-hidden className={clsx("block bg-cream-soft animate-skeleton-pulse", className)} style={{ width: w, height: h, borderRadius: r }} />
);

/** K9 skeleton rows (avatar disc, two bars, a pill block). */
export const VSkeletonRows: React.FC<{ rows: number; pill?: boolean }> = ({ rows, pill }) => (
  <div aria-label="Loading" role="status">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className={clsx("flex items-center gap-[10px] border-t min-h-[54px]", DIVIDER)} style={{ padding: "10px 16px" }}>
        <VBar w={34} h={34} r={999} />
        <span className="flex-1 space-y-[6px]">
          <VBar w={120} h={10} />
          <VBar w={160} h={8} />
        </span>
        {pill && <VBar w={52} h={18} r={999} />}
      </div>
    ))}
  </div>
);

/** Console O3 · in-card error row with a Retry footer. */
export const VCardError: React.FC<{ title: string; message?: string | null; onRetry?: () => void }> = ({ title, message, onRetry }) => (
  <>
    <VDetailRow avatar={<VAvatar icon={TriangleAlert} iconTone="high" />} title={title} sub={message ?? undefined} />
    {onRetry && <VFooterLink label="Retry" onClick={onRetry} />}
  </>
);

/** Console O4 · offline line: 11.5/16 faint. */
export const VOfflineLine: React.FC<{ text?: string; className?: string }> = ({ text = "You're offline. Showing what was loaded last.", className }) => (
  <p role="status" className={clsx("text-[11.5px] leading-[16px] text-charcoal-faint", className)}>
    {text}
  </p>
);

/** K7 trailing chevron 18/2.2 faint. */
export const VChevron: React.FC<{ size?: number }> = ({ size = 18 }) => <ChevronRight size={size} strokeWidth={2.2} aria-hidden className="text-charcoal-faint shrink-0" />;
