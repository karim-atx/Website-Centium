import React, { useId, useState } from "react";
import { BadgeCheck, Building2, ChevronDown, ChevronRight, Clock, MessageCircle, Send, UserPlus } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { useIsDark } from "../../../hooks/useIsDark";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import { LogoTile } from "./BusinessParts";
import { FieldInput, FieldLabel, wellStyle } from "../calendar/calendarFields";
import { ROLE_LABEL } from "../../../pages/business-team/teamLogic";
import type { BusinessRole } from "../../../services/business-team/types";
import { t } from "../../../i18n/core";

/**
 * Release 3 · MO17 v2 / v3 pieces, literal from gen/r15.js (explore15,
 * exploreColleagues15, cover15) and gen/r17.js (explore17, askJoin17).
 */

/** cHead15: back 36 (-7 in), gap 6; the title 24 / 700 -0.03em on 1.25 (3 down), subtitle 13 text.faint 4 under; 16 below. */
export const ExploreHead: React.FC<{ onBack: () => void }> = ({ onBack }) => (
  <div className="flex items-start" style={{ gap: 6, marginBottom: 16 }}>
    <button type="button" onClick={onBack} aria-label={t("Back")} className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginInlineStart: -7 }}>
      <svg className="rtl:-scale-x-100" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ color: INK.chS }}>
        <path d="m15 18-6-6 6-6" />
      </svg>
    </button>
    <div className="min-w-0" style={{ marginTop: 3 }}>
      <h1 style={{ fontSize: textPx(24), fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.25, color: INK.ch }}>{t("Explore")}</h1>
      <p style={{ marginTop: 4, fontSize: textPx(13), color: INK.chF }}>{t("Businesses, classes and colleagues")}</p>
    </div>
  </div>
);

/**
 * explore15 affiliated card: r20, pad 14 16, 14 below, mint hero fill (#ECF5F3
 * / teal 12%); the card-filled 44 disc with building 20 (#4F8F8A); "Affiliated
 * with" 10.5 / 700 caps 0.08em heroSub, the name 16 / 800 heroTitle, chevron
 * 16 heroSub; the line 12 heroSub 8 under.
 */
export const AffiliationCard: React.FC<{ name: string; onOpen: () => void }> = ({ name, onOpen }) => {
  const dark = useIsDark();
  const sub = dark ? "#A5BDB9" : "#869595";
  return (
    <button type="button" onClick={onOpen} className="tap w-full text-start" style={{ borderRadius: 20, padding: "14px 16px", marginBottom: 14, background: dark ? "rgba(162,200,194,0.12)" : "#ECF5F3" }}>
      <span className="flex items-center" style={{ gap: 12 }}>
        <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 44, height: 44, background: INK.card }}>
          <Building2 size={20} strokeWidth={2} style={{ color: "#4F8F8A" }} aria-hidden />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block" style={{ fontSize: textPx(10.5), fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: sub }}>
            {t("Affiliated with")}
          </span>
          <span className="block" style={{ fontSize: textPx(16), fontWeight: 800, color: dark ? "#D5EAE5" : "#32544D", overflowWrap: "anywhere" }}>
            {name}
          </span>
        </span>
        <ChevronRight size={16} strokeWidth={2} style={{ color: sub }} className="rtl:-scale-x-100" aria-hidden />
      </span>
      <span className="block" style={{ fontSize: textPx(12), color: sub, marginTop: 8, lineHeight: 1.45 }}>
        {t("You can still browse and reach out to other businesses below.")}
      </span>
    </button>
  );
};

/** segTabs (h 38, 12.5 / 700, 12 below): track r16 pad 6 gap 5; the tab colours as Messages' tabs. */
export function ExploreTabs<T extends string>({ items, active, onChange }: { items: { key: T; label: string }[]; active: T; onChange: (k: T) => void }) {
  const dark = useIsDark();
  return (
    <div role="tablist" className="flex items-center" style={{ background: dark ? "#242730" : "#F3F3FD", borderRadius: 16, padding: 6, gap: 5, marginBottom: 12 }}>
      {items.map((x) => {
        const on = x.key === active;
        return (
          <button
            key={x.key}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(x.key)}
            className="tap flex-1 min-w-0 flex items-center justify-center whitespace-nowrap"
            style={{
              minHeight: 38,
              padding: "0 6px",
              borderRadius: 12,
              fontSize: textPx(12.5),
              fontWeight: 700,
              background: on ? (dark ? "#A991FE" : "#A79AD5") : dark ? "#2B2C3A" : "#F5F4FE",
              color: on ? (dark ? "#0D0B1A" : "#FFFFFF") : dark ? "#B7ABDE" : "#6D50D3",
            }}
          >
            {x.label}
          </button>
        );
      })}
    </div>
  );
}

/** chipRow10: scrolling, gap 8; chips r10 pad 7 13, 12, 1px 11% border (active fill, onFill 700; else card, text.soft 600). */
export function ChipRow<T extends string>({ items, active, onChange }: { items: { key: T; label: string }[]; active: T; onChange: (k: T) => void }) {
  return (
    <div className="scroll-row no-scrollbar flex" style={{ gap: 8, marginBottom: 12, overflowX: "auto" }}>
      {items.map((c) => {
        const on = c.key === active;
        return (
          <button
            key={c.key}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(c.key)}
            className="tap flex-none whitespace-nowrap"
            style={{
              minHeight: 32,
              borderRadius: 10,
              padding: "7px 13px",
              fontSize: textPx(12),
              border: `1px solid ${on ? "rgb(var(--c-primary-fill))" : "rgb(var(--c-charcoal) / 0.11)"}`,
              background: on ? "rgb(var(--c-primary-fill))" : INK.card,
              color: on ? "rgb(var(--c-on-primary-fill))" : INK.chS,
              fontWeight: on ? 700 : 600,
            }}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

export type JoinState = "ask" | "sent" | "member" | "none";

/**
 * explore15 business card + explore17 buttons: r18 card, 10 below, the cover
 * 84 (soft stripes, or the photo); pad 10 12 12, items end, gap 10; name 14 /
 * 700, the line 12 text.faint, the bio 11.5 text.soft 2 under. Buttons 32
 * tall r10, 12 / 700, gap 6: Message 32 square on soft (gyms, which take
 * messages), "Ask to join" on the fill, "Request sent" gold pale with clock.
 */
export const BusinessCard: React.FC<{
  name: string;
  line: string;
  bio: string | null;
  join: JoinState;
  onOpen: () => void;
  onMessage?: () => void;
  onAsk: () => void;
}> = ({ name, line, bio, join, onOpen, onMessage, onAsk }) => (
  <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, overflow: "hidden", marginBottom: 10 }}>
    <button type="button" onClick={onOpen} aria-label={t("Open {name}", { name })} className="tap block w-full" style={{ height: 84, background: `repeating-linear-gradient(45deg, ${INK.soft} 0 6px, ${INK.card} 6px 12px)` }} />
    <div className="flex items-end" style={{ padding: "10px 12px 12px", gap: 10 }}>
      <button type="button" onClick={onOpen} className="tap flex-1 min-w-0 text-start">
        <span className="block" style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>
          {name}
        </span>
        {line && <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>{line}</span>}
        {bio && (
          <span className="block line-clamp-2" style={{ fontSize: textPx(11.5), color: INK.chS, marginTop: 2 }}>
            {bio}
          </span>
        )}
      </button>
      <span className="flex shrink-0" style={{ gap: 6 }}>
        {onMessage && (
          <button type="button" onClick={onMessage} aria-label={t("Message")} className="tap relative inline-flex items-center justify-center before:absolute before:-inset-1.5 before:content-['']" style={{ width: 32, height: 32, borderRadius: 10, background: INK.soft }}>
            <MessageCircle size={14} strokeWidth={2} style={{ color: INK.chS }} aria-hidden />
          </button>
        )}
        {join === "ask" && (
          <button type="button" onClick={onAsk} className="tap relative inline-flex items-center whitespace-nowrap before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']" style={{ gap: 5, height: 32, padding: "0 11px", borderRadius: 10, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(12), fontWeight: 700 }}>
            <UserPlus size={13} strokeWidth={2} aria-hidden />
            {t("Ask to join")}
          </button>
        )}
        {join === "sent" && (
          <span className="inline-flex items-center whitespace-nowrap" style={{ gap: 5, height: 32, padding: "0 11px", borderRadius: 10, background: INK.goldPale, color: INK.goldInk, fontSize: textPx(12), fontWeight: 700 }}>
            <Clock size={13} strokeWidth={2} aria-hidden />
            {t("Request sent")}
          </span>
        )}
      </span>
    </div>
  </div>
);

/** W6A-1: the most a join request's message may say (request_to_join_business, 22023 past it). */
export const JOIN_MESSAGE_MAX = 500;

/**
 * askJoin17: the business (tile 44 r14, name 15 / 800, line 12 text.faint),
 * "Your role" (field, chevron-down), 12, "Message (optional)" (field), the
 * note (FINAL_PLAN: "one business at a time" deleted), Send request.
 * W6A-1 (20261216080000): request_to_join_business_by_id(p_business_id,
 * p_message, p_role) records the role as a wish (the business picks the role
 * when it accepts) and the message up to 500. The role is the business_role
 * list (the frame's free-text sample has no column); none chosen sends null.
 * The frame's "Shared with the business" switches still have nothing to
 * write to and aren't drawn.
 */
export const AskToJoinSheet: React.FC<{
  business: { name: string; line: string } | null;
  busy: boolean;
  error: string | null;
  onSend: (ask: { role: BusinessRole | null; message: string }) => void;
  onClose: () => void;
}> = ({ business, busy, error, onSend, onClose }) => {
  const [role, setRole] = useState<BusinessRole | "">("");
  const [message, setMessage] = useState("");
  const [forName, setForName] = useState<string | null>(null);
  const roleId = useId();
  // A fresh sheet for each business (state reset while rendering, not in an effect).
  if ((business?.name ?? null) !== forName) {
    setForName(business?.name ?? null);
    setRole("");
    setMessage("");
  }
  return (
  <BottomSheet
    open={!!business}
    onClose={onClose}
    title={t("Ask to join")}
    footer={<CtaButton label={t("Send request")} icon={<Send size={15} aria-hidden />} loading={busy} onClick={() => onSend({ role: role || null, message: message.trim() })} />}
  >
    {business && (
      <>
        <div className="flex items-center" style={{ gap: 12, marginBottom: 12 }}>
          <LogoTile name={business.name} size={44} />
          <span className="min-w-0">
            <span className="block" style={{ fontSize: textPx(15), fontWeight: 800, color: INK.ch }}>
              {business.name}
            </span>
            {business.line && <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>{business.line}</span>}
          </span>
        </div>
        <div className="min-w-0">
          <FieldLabel htmlFor={roleId}>{t("Your role")}</FieldLabel>
          <span className="relative flex items-center focus-within:!border-primary" style={{ ...wellStyle(), height: 40 }}>
            <select
              id={roleId}
              value={role}
              onChange={(e) => setRole(e.target.value as BusinessRole | "")}
              className="flex-1 min-w-0 h-full bg-transparent outline-none appearance-none"
              style={{ fontSize: textPx(14), color: role ? INK.ch : INK.chF, paddingInlineEnd: 22 }}
            >
              <option value="">{t("Choose a role")}</option>
              {(Object.keys(ROLE_LABEL) as BusinessRole[]).map((r) => (
                <option key={r} value={r}>
                  {t(ROLE_LABEL[r])}
                </option>
              ))}
            </select>
            <ChevronDown size={14} strokeWidth={2} aria-hidden className="pointer-events-none absolute" style={{ insetInlineEnd: 12, color: INK.chF }} />
          </span>
        </div>
        <div style={{ height: 12 }} />
        <FieldInput label={t("Message (optional)")} value={message} onChange={setMessage} maxLength={JOIN_MESSAGE_MAX} />
        <p style={{ fontSize: textPx(11.5), color: INK.chF, lineHeight: 1.5, marginTop: 8 }}>
          {t("The business checks your credentials before you appear on its team. Your clients and their data are never shared with the business.")}
        </p>
        {error && (
          <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 8 }}>
            {error}
          </p>
        )}
      </>
    )}
  </BottomSheet>
  );
};

/**
 * exploreColleagues15 row: r18 card, pad 12 14, gap 12, 8 below; avatar 44;
 * name 14 / 700 with badge-check 13 good; the type 12 text.faint, the line
 * 11.5 text.soft; "In network" chip (done tone) or Add (32, r10, primary.pale,
 * user-plus 13, 12 / 700 primary.deep).
 */
export const ColleagueRow: React.FC<{ name: string; type: string; line: string | null; avatarUrl: string | null; state: "network" | "pending" | "add"; busy: boolean; onAdd: () => void }> = ({ name, type, line, avatarUrl, state, busy, onAdd }) => (
  <div className="flex items-center" style={{ gap: 12, background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 18, padding: "12px 14px", marginBottom: 8 }}>
    <Avatar name={name} url={avatarUrl} size={44} tone="teal" />
    <span className="flex-1 min-w-0">
      <span className="flex items-center" style={{ gap: 5, fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>
        <span className="truncate">{name}</span>
        <BadgeCheck size={13} strokeWidth={2} style={{ color: INK.good, flexShrink: 0 }} aria-label={t("Verified")} />
      </span>
      <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>{type}</span>
      {line && <span className="block" style={{ fontSize: textPx(11.5), color: INK.chS }}>{line}</span>}
    </span>
    {state === "network" ? (
      <span className="whitespace-nowrap shrink-0" style={{ fontSize: textPx(10.5), fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: INK.tealPale, color: "rgb(var(--th-3c6b65))" }}>
        {t("In network")}
      </span>
    ) : state === "pending" ? (
      <span className="whitespace-nowrap shrink-0" style={{ fontSize: textPx(10.5), fontWeight: 700, padding: "2px 8px", borderRadius: 9999, background: INK.goldPale, color: INK.goldInk }}>
        {t("Requested")}
      </span>
    ) : (
      <button type="button" onClick={onAdd} disabled={busy} className="tap relative inline-flex items-center whitespace-nowrap shrink-0 disabled:opacity-50 before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-['']" style={{ gap: 4, height: 32, padding: "0 10px", borderRadius: 10, background: INK.prPale, color: INK.prDeep, fontSize: textPx(12), fontWeight: 700 }}>
        <UserPlus size={13} strokeWidth={2} aria-hidden />
        {t("Add")}
      </button>
    )}
  </div>
);
