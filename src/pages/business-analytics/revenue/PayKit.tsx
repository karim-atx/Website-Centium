import React, { useEffect, useRef } from "react";
import { Check, ChevronDown, CircleCheck, type LucideIcon } from "lucide-react";
import { Avatar, SoonChip, v } from "./kit";

// PaySeeAllV2 (AN14-035 to -090) building blocks, literal: the boxes card,
// the controls row with its overlay menu, list rows, the empty card and the
// detail page (hero, facts, history, banner, actions, note).

export interface PayBox {
  l: string;
  v: string;
  d?: string | null;
  /** Value in faint ink (the empty state, AN14-042 row 1). */
  faint?: boolean;
  dTone?: "bad" | "good" | "neutral" | "caution";
}

export const PayBoxes: React.FC<{ boxes: PayBox[]; line: string }> = ({
  boxes,
  line,
}) => (
  <div
    className="rounded-[22px] grid overflow-hidden"
    style={{
      background: v("card"),
      border: `1px solid ${v("border")}`,
      gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)",
    }}
  >
    {boxes.map((b, i) => (
      <div
        key={b.l}
        className="pt-[14px] px-[16px] pb-[12px]"
        style={{ borderLeft: i ? `1px solid ${v("divider")}` : "none" }}
      >
        <p
          className="text-[11px] font-bold leading-[15px]"
          style={{ color: v("faint") }}
        >
          {b.l}
        </p>
        <p className="flex items-baseline gap-[6px] mt-[4px]">
          <span
            className="text-[28px] font-extrabold tracking-[-0.03em] leading-[32px] rv-num"
            style={{ color: b.faint ? v("faint") : v("ink") }}
          >
            {b.v}
          </span>
          {b.d && (
            <span
              className="text-[11.5px] font-extrabold"
              style={{
                color:
                  b.dTone === "bad"
                    ? v("high")
                    : b.dTone === "good"
                      ? v("good")
                      : b.dTone === "caution"
                        ? v("pay-caution")
                        : v("faint"),
              }}
            >
              {b.d}
            </span>
          )}
        </p>
      </div>
    ))}
    <p
      className="col-span-2 text-[12px] leading-[17px] px-[16px] pt-[10px] pb-[12px]"
      style={
        {
          color: v("ink-soft"),
          borderTop: `1px solid ${v("divider")}`,
          textWrap: "pretty",
        } as React.CSSProperties
      }
    >
      {line}
    </p>
  </div>
);

export interface MenuOpt {
  value: string;
  label: string;
  /** Group header shown above this option. */
  header?: string;
  disabled?: boolean;
  soon?: boolean;
}

export interface Ctrl {
  key: string;
  icon: LucideIcon;
  label: string;
  /** Left offset of the menu (PaySeeAll menuLeft). */
  menuLeft: number;
  options: MenuOpt[];
  /** Selected value per group header (one choice per group). */
  selected: string[];
  onPick: (value: string) => void;
  /** An active filter keeps the #AEA1DC border (AN14-039 row 1). */
  active?: boolean;
}

/** The controls row (margin 16 0 8, gap 8): 36 tall r12 buttons and an overlay menu (left X, top 42, 248 wide, z 5). */
export const PayControls: React.FC<{
  ctrls: Ctrl[];
  open: string | null;
  setOpen: (k: string | null) => void;
  count?: string;
  disabled?: boolean;
}> = ({ ctrls, open, setOpen, count, disabled }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, setOpen]);
  const cur = ctrls.find((c) => c.key === open) ?? null;
  return (
    <div
      ref={ref}
      className="relative flex flex-wrap items-center gap-[8px] mt-[16px] mb-[8px]"
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      {ctrls.map((c) => {
        const isOpen = open === c.key;
        return (
          <button
            key={c.key}
            type="button"
            disabled={disabled}
            aria-haspopup="listbox"
            aria-expanded={isOpen}
            onClick={() => setOpen(isOpen ? null : c.key)}
            className="tap relative inline-flex items-center gap-[6px] h-[36px] px-[12px] rounded-[12px] text-[12.5px] font-bold whitespace-nowrap focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
            style={{
              background: v("card"),
              border: `1px solid ${isOpen || c.active ? v("primary") : v("border")}`,
              color: v("ink"),
            }}
          >
            <span aria-hidden className="absolute inset-x-0 -inset-y-[4px]" />
            <c.icon
              size={14}
              strokeWidth={2.2}
              aria-hidden
              style={{ color: v("pdark") }}
            />
            {c.label}
            <ChevronDown
              size={14}
              strokeWidth={2.4}
              aria-hidden
              style={{ color: v("faint") }}
            />
          </button>
        );
      })}
      {count && (
        <span
          className="ml-auto text-[11.5px] font-bold whitespace-nowrap"
          style={{ color: v("faint") }}
        >
          {count}
        </span>
      )}
      {cur && (
        <div
          role="listbox"
          aria-label={cur.label}
          className="absolute top-[42px] w-[248px] max-w-full z-[5] rounded-[14px] p-[8px]"
          style={{
            left: cur.menuLeft,
            background: v("card"),
            border: `1px solid ${v("menu-border")}`,
            boxShadow: "0 12px 32px rgba(95,80,147,0.18)",
          }}
        >
          {cur.options.map((o) => {
            const sel = cur.selected.includes(o.value);
            return (
              <React.Fragment key={o.value}>
                {o.header && (
                  <p
                    className="mt-[6px] mx-[4px] mb-[2px] text-[11px] font-bold tracking-[0.1em] uppercase"
                    style={{ color: v("faint") }}
                  >
                    {o.header}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={sel}
                  aria-disabled={o.disabled || undefined}
                  onClick={() => {
                    if (o.disabled) return;
                    cur.onPick(o.value);
                    setOpen(null);
                  }}
                  className="tap w-full flex items-center gap-[10px] rounded-[8px] px-[10px] py-[9px] mt-[6px] min-h-[44px] box-border text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
                  style={{
                    border: `1px solid ${sel ? v("primary") : v("option")}`,
                    background: sel ? v("pale") : v("raised"),
                    opacity: o.disabled ? 0.55 : 1,
                  }}
                >
                  <span
                    className="flex-1 min-w-0 text-[13px] font-bold"
                    style={{ color: v("ink") }}
                  >
                    {o.label}
                  </span>
                  {o.soon && <SoonChip />}
                  {sel && (
                    <Check
                      size={16}
                      strokeWidth={2.6}
                      aria-hidden
                      style={{ color: v("pdark") }}
                    />
                  )}
                </button>
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
};

export interface PayRowData {
  key: string;
  who: string | null;
  title: string;
  dot?: string;
  sub: string;
  chip?: { t: string; bg: string; ink: string };
  s2?: string;
  amt: string;
  action?: { icon: LucideIcon; name: string; onClick: () => void };
  onClick: () => void;
}

/** One list card of rows (r20, 1px border, rows divided by the divider). */
export const PayList: React.FC<{ rows: PayRowData[] }> = ({ rows }) => (
  <div
    className="rounded-[20px] overflow-hidden"
    style={{ background: v("card"), border: `1px solid ${v("border")}` }}
  >
    {rows.map((r, i) => (
      <div
        key={r.key}
        className="relative"
        style={{ borderTop: i ? `1px solid ${v("divider")}` : "none" }}
      >
        <button
          type="button"
          onClick={r.onClick}
          className="tap w-full flex items-center gap-[11px] pt-[11px] pr-[12px] pb-[11px] pl-[14px] min-h-[64px] box-border text-left focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-primary-dark"
        >
          <Avatar who={r.who} size={36} font={12} icon={16} pay />
          <span className="flex-1 min-w-0">
            <span
              className="flex items-center gap-[6px] text-[13.5px] font-extrabold leading-[18px]"
              style={{ color: v("ink") }}
            >
              <span className="min-w-0 truncate">{r.title}</span>
              {r.dot && (
                <span
                  aria-hidden
                  className="w-[7px] h-[7px] rounded-full shrink-0"
                  style={{ background: r.dot }}
                />
              )}
            </span>
            <span
              className="block text-[11.5px] leading-[16px]"
              style={
                {
                  color: v("ink-soft"),
                  textWrap: "pretty",
                } as React.CSSProperties
              }
            >
              {r.sub}
            </span>
            {(r.chip || r.s2) && (
              <span
                className="flex items-center gap-[6px] flex-wrap text-[11px] leading-[15px] mt-[2px]"
                style={{ color: v("faint") }}
              >
                {r.chip && (
                  <span
                    className="inline-flex text-[10px] font-extrabold px-[7px] py-[1px] rounded-full"
                    style={{ background: r.chip.bg, color: r.chip.ink }}
                  >
                    {r.chip.t}
                  </span>
                )}
                {r.s2}
              </span>
            )}
          </span>
          <span className="flex flex-col items-end gap-[4px] shrink-0">
            <span
              className="text-[14px] font-extrabold rv-num"
              style={{ color: v("ink") }}
            >
              {r.amt}
            </span>
            {r.action && <span aria-hidden className="w-[30px] h-[30px]" />}
          </span>
        </button>
        {r.action && (
          <button
            type="button"
            aria-label={r.action.name}
            title={r.action.name}
            onClick={r.action.onClick}
            className="tap absolute right-[12px] bottom-[11px] w-[30px] h-[30px] rounded-full flex items-center justify-center focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
            style={{ background: v("pale"), color: v("pdark") }}
          >
            <span aria-hidden className="absolute -inset-[7px]" />
            <r.action.icon size={15} strokeWidth={2.2} aria-hidden />
          </button>
        )}
      </div>
    ))}
  </div>
);

/** Group header: 12/800 0.02em + 11.5/700 faint, margin 14 2 8. */
export const PayGroupHead: React.FC<{ h: string; s: string; id?: string }> = ({
  h,
  s,
  id,
}) => (
  <div
    id={id}
    className="flex items-baseline justify-between gap-[8px] mt-[14px] mx-[2px] mb-[8px] scroll-mt-[16px]"
  >
    <p
      className="text-[12px] font-extrabold tracking-[0.02em]"
      style={{ color: v("ink") }}
    >
      {h}
    </p>
    <p
      className="text-[11.5px] font-bold whitespace-nowrap"
      style={{ color: v("faint") }}
    >
      {s}
    </p>
  </div>
);

/** Empty card: r22 padding 26 20, disc 48 goodBg / good, 15/800 title, 12.5/18 body. */
export const PayEmpty: React.FC<{
  icon?: LucideIcon;
  title: string;
  body: string;
}> = ({ icon: Icon = CircleCheck, title, body }) => (
  <div
    className="rounded-[22px] px-[20px] py-[26px] text-center"
    style={{ background: v("card"), border: `1px solid ${v("border")}` }}
  >
    <span
      className="w-[48px] h-[48px] rounded-full inline-flex items-center justify-center"
      style={{ background: v("good-bg"), color: v("good") }}
    >
      <Icon size={22} strokeWidth={2.2} aria-hidden />
    </span>
    <p
      className="text-[15px] font-extrabold mt-[10px]"
      style={{ color: v("ink") }}
    >
      {title}
    </p>
    <p
      className="text-[12.5px] leading-[18px] mt-[4px]"
      style={
        { color: v("ink-soft"), textWrap: "pretty" } as React.CSSProperties
      }
    >
      {body}
    </p>
  </div>
);

export interface HistRow {
  t: string;
  s: string;
  d: string;
  kind: "ok" | "bad" | "warn" | "info";
}
export interface DetailAction {
  t: string;
  icon: LucideIcon;
  primary?: boolean;
  disabled?: boolean;
  dim?: number;
  onClick: () => void;
}

const DOT: Record<HistRow["kind"], [string, string]> = {
  ok: ["good", "good-bg"],
  bad: ["high", "high-bg"],
  warn: ["pay-caution", "caution-bg"],
  info: ["primary", "pale"],
};

/** The PaySeeAll detail body (AN14-044 base). */
export const PayDetail: React.FC<{
  who: string | null;
  name: string;
  sub: string;
  amt: string;
  amtInk?: string;
  chip: { t: string; bg: string; ink: string };
  facts: { l: string; v: string }[];
  histTitle?: string;
  hist?: HistRow[];
  banner?: { icon: LucideIcon; t: string; s: string; bg: string; ink: string };
  actions: DetailAction[];
  note?: string;
}> = ({
  who,
  name,
  sub,
  amt,
  amtInk,
  chip,
  facts,
  histTitle,
  hist,
  banner,
  actions,
  note,
}) => (
  <div>
    <div
      className="rounded-[22px] pt-[18px] px-[16px] pb-[16px] text-center"
      style={{ background: v("card"), border: `1px solid ${v("border")}` }}
    >
      <span className="inline-flex">
        <Avatar who={who} size={56} font={17} icon={24} pay stroke={2} />
      </span>
      <p
        className="text-[17px] font-extrabold mt-[8px]"
        style={{ color: v("ink") }}
      >
        {name}
      </p>
      <p className="text-[12.5px]" style={{ color: v("ink-soft") }}>
        {sub}
      </p>
      <p
        className="text-[34px] font-extrabold tracking-[-0.03em] leading-[40px] mt-[10px] rv-num"
        style={{ color: amtInk ?? v("ink") }}
      >
        {amt}
      </p>
      <span
        className="inline-flex items-center gap-[5px] text-[11px] font-extrabold px-[10px] py-[3px] rounded-full mt-[4px] whitespace-nowrap"
        style={{ background: chip.bg, color: chip.ink }}
      >
        {chip.t}
      </span>
    </div>
    <div
      className="rounded-[20px] mt-[12px] px-[16px] py-[2px]"
      style={{ background: v("card"), border: `1px solid ${v("border")}` }}
    >
      {facts.map((f, i) => (
        <div
          key={f.l}
          className="flex items-center justify-between gap-[12px] min-h-[44px]"
          style={{ borderTop: i ? `1px solid ${v("divider")}` : "none" }}
        >
          <span className="text-[12.5px]" style={{ color: v("ink-soft") }}>
            {f.l}
          </span>
          <span
            className="text-[13px] font-extrabold text-right"
            style={
              { color: v("ink"), textWrap: "balance" } as React.CSSProperties
            }
          >
            {f.v}
          </span>
        </div>
      ))}
    </div>
    {hist && hist.length > 0 && (
      <>
        <p
          className="text-[12px] font-extrabold mt-[16px] mx-[2px] mb-[8px]"
          style={{ color: v("ink") }}
        >
          {histTitle}
        </p>
        <div
          className="rounded-[20px] pt-[6px] px-[16px] pb-[4px]"
          style={{ background: v("card"), border: `1px solid ${v("border")}` }}
        >
          {hist.map((h, i) => (
            <div
              key={i}
              className="grid items-start py-[8px]"
              style={{
                gridTemplateColumns: "16px minmax(0,1fr) auto",
                columnGap: 10,
              }}
            >
              <span className="relative flex justify-center h-full">
                <span
                  className="w-[10px] h-[10px] rounded-full mt-[4px]"
                  style={{
                    background: v(DOT[h.kind][0]),
                    boxShadow: `0 0 0 3px ${v(DOT[h.kind][1])}`,
                  }}
                />
                {i < hist.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-[18px] -bottom-[14px] w-[1.5px]"
                    style={{ background: v("divider") }}
                  />
                )}
              </span>
              <span className="min-w-0">
                <span
                  className="block text-[13px] font-bold"
                  style={{ color: v("ink") }}
                >
                  {h.t}
                </span>
                <span
                  className="block text-[11.5px] leading-[16px]"
                  style={{ color: v("ink-soft") }}
                >
                  {h.s}
                </span>
              </span>
              <span
                className="text-[11.5px] font-bold whitespace-nowrap"
                style={{ color: v("faint") }}
              >
                {h.d}
              </span>
            </div>
          ))}
        </div>
      </>
    )}
    {banner && (
      <div
        role="status"
        className="mt-[12px] rounded-[16px] px-[14px] py-[12px] flex gap-[10px]"
        style={{ background: banner.bg }}
      >
        <span className="flex" style={{ color: banner.ink }}>
          <banner.icon size={18} strokeWidth={2.4} aria-hidden />
        </span>
        <span className="min-w-0">
          <span
            className="block text-[13.5px] font-extrabold"
            style={{ color: banner.ink }}
          >
            {banner.t}
          </span>
          <span
            className="block text-[12px] leading-[17px] mt-[2px]"
            style={{ color: v("ink-soft") }}
          >
            {banner.s}
          </span>
        </span>
      </div>
    )}
    <div className="flex flex-col gap-[8px] mt-[16px]">
      {actions.map((a) => (
        <button
          key={a.t}
          type="button"
          aria-disabled={a.disabled || undefined}
          onClick={() => !a.disabled && a.onClick()}
          className="tap h-[50px] rounded-[16px] flex items-center justify-center gap-[8px] text-[14px] font-extrabold focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
          style={{
            background: a.primary ? v("fill") : v("card"),
            color: a.primary ? v("on-fill") : v("pdark"),
            border: `1px solid ${a.primary ? v("fill") : v("border")}`,
            opacity: a.dim ?? 1,
          }}
        >
          <a.icon size={17} strokeWidth={2.2} aria-hidden />
          {a.t}
        </button>
      ))}
    </div>
    {note && (
      <p
        className="text-[12px] leading-[17px] text-center mt-[8px]"
        style={{ color: v("faint") }}
      >
        {note}
      </p>
    )}
  </div>
);
