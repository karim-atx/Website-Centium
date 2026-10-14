import React from "react";
import { ChevronLeft, ChevronRight, UserRound } from "lucide-react";
import type { BizKind } from "../../../components/business-more/kind";
import {
  initials,
  type PaymentRecord,
} from "../../../services/business-revenue";

// Small pieces shared by the Revenue pages (AnInsightsV3 and PaySeeAllV2
// literal values through the .rv-scope tokens in revenue.css).

export const v = (name: string) => `var(--rv-${name})`;

/** Section label: 10.5/800 0.08em uppercase faint, margin 22 4 8. */
export const SecLabel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => (
  <p
    className={`text-[10.5px] font-extrabold tracking-[0.08em] uppercase mt-[22px] mx-[4px] mb-[8px] ${className ?? ""}`}
    style={{ color: v("faint") }}
  >
    {children}
  </p>
);

/** AnInsightsV3 card: r24, 1px border, card fill. */
export const RCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, className, style }) => (
  <div
    className={`rounded-[24px] overflow-hidden ${className ?? ""}`}
    style={{
      background: v("card"),
      border: `1px solid ${v("border")}`,
      ...style,
    }}
  >
    {children}
  </div>
);

export type PillTone =
  "good" | "high" | "warn" | "soft" | "pale" | "pay-warn" | "teal";
const PILL: Record<PillTone, [string, string]> = {
  good: ["good-bg", "good"],
  high: ["high-bg", "high"],
  warn: ["caution-bg", "caution-ink"],
  "pay-warn": ["caution-bg", "pay-caution"],
  soft: ["soft", "ink-soft"],
  pale: ["pale", "pdark"],
  teal: ["teal-pale", "teal-ink"],
};

/** Status pill 10/800 r999 padding 1 7. */
export const Pill: React.FC<{
  tone: PillTone;
  children: React.ReactNode;
  className?: string;
}> = ({ tone, children, className }) => (
  <span
    className={`inline-block text-[10px] font-extrabold rounded-full px-[7px] py-[1px] whitespace-nowrap ${className ?? ""}`}
    style={{ background: v(PILL[tone][0]), color: v(PILL[tone][1]) }}
  >
    {children}
  </span>
);

/** "Soon" chip: 10/800 uppercase 0.05em, pale / pDark, r999, padding 1 7 (AN14-019 O1). */
export const SoonChip: React.FC = () => (
  <span
    className="inline-block text-[10px] font-extrabold uppercase tracking-[0.05em] rounded-full px-[7px] py-[1px]"
    style={{ background: v("pale"), color: v("pdark") }}
  >
    Soon
  </span>
);

/** Named (tealPale / tealInk initials) or masked (user-round) avatar. */
export const Avatar: React.FC<{
  who: string | null;
  size: number;
  font: number;
  icon: number;
  pay?: boolean;
  stroke?: number;
}> = ({ who, size, font, icon, pay, stroke = 2.2 }) => {
  const ini = initials(who);
  return (
    <span
      aria-hidden
      className="rounded-full flex items-center justify-center font-extrabold shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: font,
        background: ini ? v("teal-pale") : v(pay ? "mask-bg" : "soft"),
        color: ini ? v("teal-ink") : v(pay ? "mask-ink" : "ink-soft"),
      }}
    >
      {ini ?? <UserRound size={icon} strokeWidth={stroke} />}
    </span>
  );
};

/** The person on a payment: their first name, or "Member" when the reader gives none (no member code yet, B7). */
export const whoOf = (r: PaymentRecord) => r.who ?? "Member";

export interface Vocab {
  people: string;
  person: string;
  peopleCap: string;
}
export function vocabOf(kind: BizKind): Vocab {
  if (kind === "classes")
    return { people: "clients", person: "client", peopleCap: "Clients" };
  if (kind === "store")
    return { people: "customers", person: "customer", peopleCap: "Customers" };
  return { people: "members", person: "member", peopleCap: "Members" };
}

/** Error card with Retry (12/600 #C0392B + 12.5/800 pDark, 44 tall). */
export const ErrorLine: React.FC<{ message: string; onRetry: () => void }> = ({
  message,
  onRetry,
}) => (
  <RCard className="mt-[16px] px-[16px] py-[12px] flex items-center justify-between gap-[12px]">
    <p
      role="alert"
      className="text-[12px] font-semibold"
      style={{ color: "#C0392B" }}
    >
      {message}
    </p>
    <button
      type="button"
      onClick={onRetry}
      className="tap min-h-[44px] px-[6px] text-[12.5px] font-extrabold"
      style={{ color: v("pdark") }}
    >
      Retry
    </button>
  </RCard>
);

/** "Offline. Showing what was loaded at 9:41 AM." */
export const OfflineLine: React.FC<{ at: Date | null }> = ({ at }) =>
  at ? (
    <p
      role="status"
      className="mt-[10px] text-[11.5px] leading-[16px]"
      style={{ color: v("ink-soft") }}
    >
      Offline. Showing what was loaded at{" "}
      {at.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.
    </p>
  ) : null;

/** PaySeeAllV2 header: back 44 (margin-left -10) chevron 22/2.2, crumb 10.5/700 0.1em uppercase, title 22/800. */
export const PayHeader: React.FC<{
  crumb: string;
  title: string;
  onBack: () => void;
}> = ({ crumb, title, onBack }) => (
  <div className="flex items-center gap-[6px] -ml-[10px] mb-[6px]">
    <button
      type="button"
      onClick={onBack}
      aria-label="Back"
      className="tap w-[44px] h-[44px] shrink-0 flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
      style={{ color: v("ink") }}
    >
      <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
    </button>
    <div className="min-w-0">
      <p
        className="text-[10.5px] font-bold tracking-[0.1em] uppercase leading-[14px]"
        style={{ color: v("faint") }}
      >
        {crumb}
      </p>
      <h1
        className="text-[22px] font-extrabold tracking-[-0.02em] leading-[28px]"
        style={{ color: v("ink") }}
      >
        {title}
      </h1>
    </div>
  </div>
);

/** A "See all" style row: min-height 44, border-top, centred 12.5/800 pDark + chevron 14. */
export const MoreRow: React.FC<{
  label: string;
  onClick: () => void;
  minH?: number;
  icon?: React.ReactNode;
}> = ({ label, onClick, minH = 44, icon }) => (
  <button
    type="button"
    onClick={onClick}
    className="tap w-full flex items-center justify-center gap-[4px] text-[12.5px] font-extrabold whitespace-nowrap focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark"
    style={{
      minHeight: minH,
      borderTop: `1px solid ${v("divider")}`,
      color: v("pdark"),
    }}
  >
    {label}
    {icon ?? <ChevronRight size={14} aria-hidden />}
  </button>
);

export const Skel: React.FC<{ h: number; className?: string; r?: number }> = ({
  h,
  className,
  r = 12,
}) => (
  <span
    aria-hidden
    className={`block animate-skeleton-pulse ${className ?? ""}`}
    style={{ height: h, borderRadius: r, background: v("track") }}
  />
);

/** Writes rows as a CSV download (the shell's format). */
export function downloadCsv(
  filename: string,
  rows: (string | number | null)[][],
) {
  const csv = rows
    .map((r) =>
      r
        .map((x) => (x === null ? "" : `"${String(x).replace(/"/g, '""')}"`))
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}
