import React, { useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, Lightbulb, Lock, Send, ShieldCheck, TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { PopupMenu } from "../../ui/PopupMenu";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { EmptyState } from "../EmptyState";
import { askWithMessage, ASK_MESSAGE_MAX } from "../../../services/pro/insights";
import { t } from "../../../i18n/core";

/**
 * Release 3 · W5 Insights building blocks, from the board's own functions
 * with literal values (source gen/r10.js, r11.js, r14.js):
 * - InsightCard (card10): r20, card fill and border, pad 14, m-bottom 12;
 *   title 13 / 700, question 11.5 text.faint m-top 1, body m-top 10;
 * - SharedBadges (badge10): 24 high, pad 0 8, r8, 11 / 700, teal pale and
 *   #3C6B65 (dark #B2D4CF) with the shield when shared, soft and text.faint
 *   with the lock when not;
 * - StatBoxes (boxes11 + box10): two a row, the odd one centred; r18, pad
 *   14 14 13; label 12 / 600 text.soft; value 26 / 800 -0.02em, unit 13 /
 *   700 text.faint; delta 12 / 800 with the trend arrow (good up, high
 *   down); sub 11.5 text.faint;
 * - Group (grp10): r20 card, row pad 14 16, the 36 r11 lavender tile with a
 *   17 / 1.75 icon, title 14 / 700, line 12 text.soft, chevron; open: a 6%
 *   rule and pad 12 12 4;
 * - ClientPicker (insHead10): 40 high, r12, soft fill, 1px 10% border, pad
 *   0 12, avatar 24, name 14, chevron 14;
 * - RangeTabs (range5): Today, Week, Month;
 * - DetailHead (head19): back 36, eyebrow 10.5 / 600 caps 0.11em, title 19
 *   / 700 -0.03em;
 * - InsightLine (insight10): 12 text.soft, the lightbulb in primary.accent.
 */

// ---------------------------------------------------------------------------
// Cards and rows
// ---------------------------------------------------------------------------

export const InsightCard: React.FC<{ title: string; question?: string; children: React.ReactNode; pad?: number }> = ({ title, question, children, pad = 14 }) => (
  <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: pad, marginBottom: 12 }}>
    <p style={{ fontSize: textPx(13), fontWeight: 700, color: INK.ch }}>{title}</p>
    {question && <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 1 }}>{question}</p>}
    <div style={{ marginTop: 10 }}>{children}</div>
  </div>
);

export const InsightLine: React.FC<{ children: React.ReactNode; top?: number }> = ({ children, top = 10 }) => (
    <p className="flex" style={{ gap: 6, fontSize: textPx(12), color: INK.chS, lineHeight: 1.45, marginTop: top }}>
      <Lightbulb size={13} strokeWidth={2} aria-hidden style={{ color: INK.prAccent, flexShrink: 0, marginTop: 2 }} />
      <span>{children}</span>
    </p>
);

/** A card's quiet line (early data, no data in range): 12 text.faint. */
export const QuietLine: React.FC<{ children: React.ReactNode }> = ({ children }) => <p style={{ fontSize: textPx(12), color: INK.chF, lineHeight: 1.5 }}>{children}</p>;

export const SharedBadges: React.FC<{ items: { label: string; on: boolean }[] }> = ({ items }) => {
  const dark = useIsDark();
  const onInk = dark ? "#B2D4CF" : "#3C6B65";
  return (
    <div className="flex flex-wrap" style={{ gap: 5, marginBottom: 12 }}>
      {items.map((c) => (
        <span key={c.label} className="inline-flex items-center whitespace-nowrap" style={{ gap: 4, height: 24, padding: "0 8px", borderRadius: 8, fontSize: textPx(11), fontWeight: 700, background: c.on ? INK.tealPale : INK.soft, color: c.on ? onInk : INK.chF }}>
          {c.on ? <ShieldCheck size={11} strokeWidth={2.2} aria-hidden /> : <Lock size={11} strokeWidth={2.2} aria-hidden />}
          {c.label}
          <span className="sr-only">{c.on ? t(", shared") : t(", not shared")}</span>
        </span>
      ))}
    </div>
  );
};

export interface StatBox {
  label: string;
  value: string;
  unit?: string;
  delta?: string | null;
  /** "up" draws good, "down" draws high; null is neutral. */
  dir?: "up" | "down" | null;
  sub: string;
}

export const StatBoxes: React.FC<{ boxes: StatBox[] }> = ({ boxes }) => (
  <div className="flex flex-wrap justify-center" style={{ gap: 8, marginBottom: 12 }}>
    {boxes.map((b) => {
      const dc = b.dir === "up" ? INK.good : b.dir === "down" ? INK.hi : INK.chF;
      const Arrow = b.dir === "down" ? TrendingDown : TrendingUp;
      return (
        <div key={b.label} className="flex min-w-0" style={{ flex: "0 0 calc(50% - 4px)" }}>
          <div className="flex-1 min-w-0" style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "14px 14px 13px" }}>
            <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, lineHeight: 1.35 }}>{b.label}</p>
            <p className="flex flex-wrap items-baseline" style={{ gap: "4px 8px", marginTop: 8 }}>
              <span style={{ fontSize: textPx(26), fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, fontVariantNumeric: "tabular-nums", color: INK.ch }}>
                {b.value}
                {b.unit && <span style={{ fontSize: textPx(13), fontWeight: 700, color: INK.chF, marginInlineStart: 3 }}>{b.unit}</span>}
              </span>
              {b.delta && (
                <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 2, fontSize: textPx(12), fontWeight: 800, color: dc }}>
                  {b.dir && <Arrow size={12} strokeWidth={2.4} aria-hidden />}
                  {b.delta}
                </span>
              )}
            </p>
            <p style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6, lineHeight: 1.35 }}>{b.sub}</p>
          </div>
        </div>
      );
    })}
  </div>
);

export const Group: React.FC<{ id: string; icon: LucideIcon; title: string; line: string; open: boolean; onToggle: () => void; children: React.ReactNode }> = ({ id, icon: Icon, title, line, open, onToggle, children }) => {
  const dark = useIsDark();
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, marginBottom: 10, overflow: "hidden" }}>
      <button type="button" aria-expanded={open} aria-controls={`grp-${id}`} onClick={onToggle} className="tap w-full flex items-center text-start" style={{ gap: 12, padding: "14px 16px", minHeight: 64 }}>
        <span className="flex items-center justify-center shrink-0" style={{ width: 36, height: 36, borderRadius: 11, background: dark ? "rgba(174,161,220,0.14)" : "#F0EDF9" }}>
          <Icon size={17} strokeWidth={1.75} aria-hidden style={{ color: INK.prAccent }} />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
            {title}
          </span>
          <span className="block" style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.4 }}>
            {line}
          </span>
        </span>
        <ChevronDown size={16} strokeWidth={2} aria-hidden style={{ color: INK.chF, transform: open ? "rotate(180deg)" : undefined, transition: "transform 160ms" }} />
      </button>
      {open && (
        <div id={`grp-${id}`} style={{ borderTop: `1px solid ${INK.b06}`, padding: "12px 12px 4px" }}>
          {children}
        </div>
      )}
    </div>
  );
};

/** The scrolling sub-tab chips (vitals, filters): r10, pad 7 12, 12 / 700 on, 600 off. */
export const ChipRow: React.FC<{ items: { key: string; label: string }[]; active: string; onChange: (k: string) => void; label: string }> = ({ items, active, onChange, label }) => (
  <div role="tablist" aria-label={label} className="flex overflow-x-auto no-scrollbar" style={{ gap: 6, marginBottom: 12, paddingBottom: 2 }}>
    {items.map((c) => {
      const on = c.key === active;
      return (
        <button
          key={c.key}
          type="button"
          role="tab"
          aria-selected={on}
          onClick={() => onChange(c.key)}
          className="tap shrink-0 whitespace-nowrap relative before:absolute before:inset-x-0 before:-inset-y-[7px] before:content-['']"
          style={{ borderRadius: 10, padding: "7px 12px", fontSize: textPx(12), fontWeight: on ? 700 : 600, background: on ? INK.fill : INK.card, color: on ? INK.onFill : INK.chS, border: `1px solid ${on ? INK.fill : "rgb(var(--c-charcoal) / 0.11)"}` }}
        >
          {c.label}
        </button>
      );
    })}
  </div>
);

import type { PageRange } from "./panelProps";

export const RangeTabs: React.FC<{ value: PageRange; onChange: (r: PageRange) => void }> = ({ value, onChange }) => (
  <SegmentedTabs
    items={[
      { key: "today", label: t("Today") },
      { key: "week", label: t("Week") },
      { key: "month", label: t("Month") },
    ]}
    activeKey={value}
    onChange={(k) => onChange(k as PageRange)}
    size="compact"
    tabHeight={26}
    trackStyle={{ padding: 3, gap: 3, borderRadius: 12 }}
    tabRadius={9}
    labelSize={11.5}
  />
);

export interface PickerClient {
  clientId: string;
  name: string;
  avatarUrl: string | null;
}

export const ClientPicker: React.FC<{ clients: PickerClient[]; value: string | null; onChange: (id: string) => void; allLabel?: string; patient: boolean }> = ({ clients, value, onChange, allLabel, patient }) => {
  const [el, setEl] = useState<HTMLElement | null>(null);
  const cur = clients.find((c) => c.clientId === value) ?? null;
  const label = cur ? cur.name : allLabel ?? "";
  return (
    <>
      <button
        type="button"
        onClick={(e) => setEl(e.currentTarget)}
        aria-haspopup="listbox"
        aria-expanded={!!el}
        aria-label={patient ? t("Patient: {label}", { label }) : t("Client: {label}", { label })}
        className="tap flex-1 min-w-0 flex items-center"
        style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "0 12px", gap: 8, fontSize: textPx(14), color: INK.ch }}
      >
        {cur && <Avatar name={cur.name} url={cur.avatarUrl} size={24} />}
        <span className="flex-1 min-w-0 truncate text-start">{label}</span>
        <ChevronDown size={14} strokeWidth={2} aria-hidden style={{ color: INK.chF, flexShrink: 0 }} />
      </button>
      <PopupMenu
        open={!!el}
        onClose={() => setEl(null)}
        anchor={el}
        options={[...(allLabel ? [{ value: "", label: allLabel }] : []), ...clients.map((c) => ({ value: c.clientId, label: c.name }))]}
        selected={value ?? ""}
        onSelect={(v) => {
          setEl(null);
          onChange(v);
        }}
        width={240}
        align="left"
      />
    </>
  );
};

export const DetailHead: React.FC<{ eyebrow?: string; title: string; onBack: () => void; right?: React.ReactNode }> = ({ eyebrow, title, onBack, right }) => (
  <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 13 }}>
    <div className="flex items-start min-w-0" style={{ gap: 10 }}>
      <button type="button" onClick={onBack} aria-label={t("Back")} className="tap flex items-center justify-center shrink-0 relative before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginInlineStart: -6, marginTop: 2 }}>
        <ChevronLeft size={18} strokeWidth={2} aria-hidden className="rtl:-scale-x-100" style={{ color: INK.chS }} />
      </button>
      <div className="min-w-0">
        {eyebrow && <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2 }}>{eyebrow}</p>}
        <h2 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, marginTop: eyebrow ? 0 : 5, overflowWrap: "anywhere" }}>{title}</h2>
      </div>
    </div>
    {right}
  </div>
);

/** The not-shared state of a whole tab (TR9 v4 empty): EmptyState with "Ask {name} to share". */
export const NotShared: React.FC<{ icon: LucideIcon; title: string; line: string; askLabel: string; asked: boolean; onAsk: () => void }> = ({ icon, title, line, askLabel, asked, onAsk }) => (
  <EmptyState icon={icon} title={title} line={line}>
    <CtaButton size="base" variant="secondary" icon={<Send size={15} />} label={asked ? t("Asked") : askLabel} disabled={asked} onClick={onAsk} />
  </EmptyState>
);

// ---------------------------------------------------------------------------
// TR20 · Ask the patient to share or test
// ---------------------------------------------------------------------------

export const AskShareSheet: React.FC<{ open: boolean; onClose: () => void; clientId: string; firstName: string; onSent: (message: string) => void }> = ({ open, onClose, clientId, firstName, onSent }) => {
  const [kind, setKind] = useState<"share" | "new">("share");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setKind("share");
      setMsg("");
      setErr(null);
    }
  }, [open]);
  const send = async () => {
    setBusy(true);
    setErr(null);
    const r = await askWithMessage(clientId, "lab_results", msg);
    setBusy(false);
    if (!r.ok) return setErr(r.message);
    onSent(t("Asked {firstName} to share.", { firstName }));
  };
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={t("Ask {firstName}", { firstName })}
      footer={<CtaButton className="w-full" size="sheet" icon={<Send size={15} />} label={t("Send")} loading={busy} disabled={kind !== "share"} onClick={() => void send()} />}
    >
      <SegmentedTabs
        className="mb-3"
        items={[
          { key: "share", label: t("Share a test") },
          { key: "new", label: t("New bloods") },
        ]}
        activeKey={kind}
        onChange={(k) => setKind(k as "share" | "new")}
        tabHeight={36}
        labelSize={12}
      />
      {kind === "new" ? (
        <p style={{ fontSize: textPx(12.5), color: INK.chS, lineHeight: 1.5, marginBottom: 12 }}>{t("Booking new blood tests isn't in Centium yet. You can ask {firstName} to share a past test.", { firstName })}</p>
      ) : (
        <label className="block" style={{ marginBottom: 12 }}>
          <span className="sr-only">{t("Message")}</span>
          <textarea
            value={msg}
            onChange={(e) => setMsg(e.target.value.slice(0, ASK_MESSAGE_MAX))}
            rows={4}
            placeholder={t("A note for {firstName} (optional)", { firstName })}
            className="w-full"
            style={{ borderRadius: 14, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch, resize: "none" }}
          />
          <span className="block text-end" style={{ fontSize: textPx(11), color: INK.chF }}>{`${msg.length} / ${ASK_MESSAGE_MAX}`}</span>
        </label>
      )}
      <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5 }}>{t("{firstName} gets a request in Centium to share a past test or book new bloods, with your message. Nothing is shared until {firstName} says yes.", { firstName })}</p>
      {err && (
        <p role="alert" style={{ fontSize: textPx(12), color: INK.hi, marginTop: 8 }}>
          {err}
        </p>
      )}
    </BottomSheet>
  );
};

