import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, Building2, CalendarDays, Check, ChevronLeft, ChevronRight, LogOut, X } from "lucide-react";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { useApp } from "../../../context/AppContext";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { chooseConsoleBusiness, staffAreas, type StaffArea } from "../../../services/business-console";
import { requestToJoin } from "../../../services/business-team/employment";
import type { MyEmployment } from "../../../services/business-team/employment";
import type { BusinessFacts, MyClass } from "../../../services/pro/businesses";
import { linePx, textPx } from "../../../theme/textSize";
import { initialsOf } from "../client/clientFormat";
import { INK } from "../proInk";
import { classWhen, monthYear, ROLE_NAME, typeLine } from "./useBusinesses";
import { deadInvitationLine, invitationExpiry, invitationState, type InvitationState } from "./invitationLogic";
import { appLocale } from "../../../i18n/format";

/**
 * Release 3 · MO9 v3 / MO13 building blocks, literal from gen/r13.js
 * (business13, bizCard13, bizDetail13), gen/ui.js (pageHead, head19, popup)
 * and gen/r17.js (the business ID field).
 */

/** ui.js pageHead: back 36 (2 down), gap 6; title 27 / 700 -0.022em on 1.5; subtitle 13 / 500 text.faint 6 under; 20 below. */
export const PageHead: React.FC<{ title: string; sub?: string; onBack: () => void }> = ({ title, sub, onBack }) => (
  <div className="flex items-start" style={{ gap: 6, marginBottom: 20 }}>
    <button type="button" onClick={onBack} aria-label="Back" className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginTop: 2 }}>
      <ChevronLeft size={18} strokeWidth={2} style={{ color: INK.chS }} aria-hidden />
    </button>
    <div className="min-w-0">
      <h1 style={{ fontSize: textPx(27), fontWeight: 700, letterSpacing: "-0.022em", lineHeight: 1.5, color: INK.ch }}>{title}</h1>
      {sub && <p style={{ fontSize: textPx(13), fontWeight: 500, marginTop: 6, color: INK.chF }}>{sub}</p>}
    </div>
  </div>
);

/** head19 with the eyebrow: back 36 (-6 in, 2 down), gap 10; eyebrow 10.5 / 600 caps 0.11em text.faint, 2 under; title 19 / 700 -0.03em; 13 below. */
export const EyebrowHead: React.FC<{ eyebrow: string; title: string; onBack: () => void }> = ({ eyebrow, title, onBack }) => (
  <div className="flex items-start" style={{ gap: 10, marginBottom: 13 }}>
    <button type="button" onClick={onBack} aria-label="Back" className="tap relative flex items-center justify-center shrink-0 before:absolute before:-inset-1 before:content-['']" style={{ width: 36, height: 36, marginInlineStart: -6, marginTop: 2 }}>
      <ChevronLeft size={18} strokeWidth={2} style={{ color: INK.chS }} aria-hidden />
    </button>
    <div className="min-w-0">
      <p style={{ fontSize: textPx(10.5), fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.11em", color: INK.chF, marginBottom: 2 }}>{eyebrow}</p>
      <h1 style={{ fontSize: textPx(19), fontWeight: 700, letterSpacing: "-0.03em", color: INK.ch, overflowWrap: "anywhere" }}>{title}</h1>
    </div>
  </div>
);

/** bizCard13's logo tile: 48, r14, the soft stripes, 1px 10% border, initials 13 / 800 text.soft (or the logo). */
export const LogoTile: React.FC<{ name: string; logoUrl?: string | null; size?: number }> = ({ name, logoUrl, size = 48 }) => (
  <span
    aria-hidden
    className="flex items-center justify-center shrink-0 overflow-hidden"
    style={{
      width: size,
      height: size,
      borderRadius: 14,
      background: `repeating-linear-gradient(45deg, ${INK.soft} 0 5px, ${INK.card} 5px 10px)`,
      border: `1px solid ${INK.b10}`,
      fontSize: 13,
      fontWeight: 800,
      color: INK.chS,
    }}
  >
    {logoUrl && /^https?:/.test(logoUrl) ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : initialsOf(name)}
  </span>
);

/**
 * bizCard13: card r20, pad 14 16, 10 below; the logo tile, gap 12, name
 * 15 / 800 and "Gym · Beirut" 12 text.faint, chevron 16 text.faint; 10
 * under, the lines 12 text.soft gap 4 (briefcase 13: role · since; calendar
 * 13: the next classes there). Kept under it (from the old Your businesses page): the console
 * areas this team's permissions open.
 */
export const BizCard: React.FC<{
  e: MyEmployment;
  facts?: BusinessFacts;
  upcoming: MyClass[];
  onOpen: () => void;
}> = ({ e, facts, upcoming, onOpen }) => {
  const role = e.role && ROLE_NAME[e.role];
  const lines = [
    { icon: Briefcase, text: [role, e.acceptedAt ? `Since ${monthYear(e.acceptedAt)}` : null].filter(Boolean).join(" · ") },
    ...(upcoming.length ? [{ icon: CalendarDays, text: upcoming.slice(0, 2).map((c) => `${c.title} ${classWhen(c)}`).join(" · ") }] : []),
  ].filter((l) => l.text);
  return (
    <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "14px 16px", marginBottom: 10 }}>
      <button type="button" onClick={onOpen} className="tap w-full text-start" aria-label={`Open ${e.businessName}`}>
        <span className="flex items-center" style={{ gap: 12 }}>
          <LogoTile name={e.businessName} logoUrl={facts?.logoUrl} />
          <span className="flex-1 min-w-0">
            <span className="block" style={{ fontSize: textPx(15), fontWeight: 800, color: INK.ch, overflowWrap: "anywhere" }}>
              {e.businessName}
            </span>
            {facts && <span className="block" style={{ fontSize: textPx(12), color: INK.chF }}>{typeLine(facts)}</span>}
          </span>
          <ChevronRight size={16} strokeWidth={2} style={{ color: INK.chF }} aria-hidden />
        </span>
        {lines.length > 0 && (
          <span className="flex flex-col" style={{ gap: 4, marginTop: 10, fontSize: textPx(12), color: INK.chS, lineHeight: linePx(17) }}>
            {lines.map((l) => (
              <span key={l.text} className="flex" style={{ gap: 6 }}>
                <l.icon size={13} strokeWidth={2} style={{ color: INK.chF, flexShrink: 0, marginTop: 2 }} aria-hidden />
                {l.text}
              </span>
            ))}
          </span>
        )}
      </button>
      <ConsoleLinks businessId={e.businessId} businessName={e.businessName} />
    </div>
  );
};


/**
 * Kept from the old Your businesses page (B7): the console areas this team's owner turned
 * on for me (staffAreas); a tap makes the business the console's current one
 * and opens the area. None turned on: the owner line. The business I own:
 * every area.
 */
export const ConsoleLinks: React.FC<{ businessId: string; businessName: string; bare?: boolean }> = ({ businessId, businessName, bare }) => {
  const { authUserId } = useApp();
  const navigate = useNavigate();
  const access = useConsoleAccess();
  if (!access.ready) return null;
  const seat = access.seats.find((s) => s.businessId === businessId) ?? null;
  // The owner's seat holds every permission, so staffAreas lists every area.
  const areas: StaffArea[] = seat ? staffAreas(seat) : [];
  const open = (to: string) => {
    if (authUserId && seat && !seat.isOwner) chooseConsoleBusiness(authUserId, businessId);
    navigate(to);
  };
  const row = (key: string, label: string, desc: string, to: string) => (
    <li key={key}>
      <button type="button" onClick={() => open(to)} className="tap w-full flex items-center text-start" style={{ minHeight: 48, gap: 12 }}>
        <span className="min-w-0 flex-1">
          <span className="block" style={{ fontSize: textPx(13), fontWeight: 600, color: INK.ch }}>
            {label}
          </span>
          <span className="block" style={{ fontSize: textPx(11.5), lineHeight: linePx(16), color: INK.chF }}>
            {desc}
          </span>
        </span>
        <ChevronRight size={16} aria-hidden style={{ color: INK.chF }} className="shrink-0" />
      </button>
    </li>
  );
  return (
    <div style={bare ? undefined : { marginTop: 12, paddingTop: 4, borderTop: `1px solid ${INK.b06}` }}>
      {areas.length === 0 ? (
        <p style={{ fontSize: textPx(12), lineHeight: linePx(17), color: INK.chF, paddingTop: 8 }}>{`${businessName}'s owner hasn't turned on anything you can do in their business console yet.`}</p>
      ) : (
        <ul aria-label={`What you can do at ${businessName}`}>{areas.map((a) => row(a.key, a.label, a.desc, a.to))}</ul>
      )}
    </div>
  );
};

/**
 * Kept from the old Your businesses page: an invitation with Accept / Decline
 * (business_employees, accepted_at null). Batch 2 CO: its expiry when known,
 * and once expired or withdrawn no Accept, the reason, and Remove (the same
 * own-row delete as Decline).
 */
export const InvitationCard: React.FC<{
  e: MyEmployment;
  busy: boolean;
  onAccept: () => void;
  onDecline: () => void;
  state?: InvitationState;
  onRemove?: () => void;
}> = ({ e, busy, onAccept, onDecline, state: given, onRemove }) => {
  const state = given ?? invitationState(e.invite, null);
  const expiry = invitationExpiry(e.invite, state);
  const dead = deadInvitationLine(state, e.businessName);
  return (
  <div style={{ background: INK.card, border: `1px solid ${INK.bCard}`, borderRadius: 20, padding: "14px 16px", marginBottom: 10 }}>
    <div className="flex items-center" style={{ gap: 12 }}>
      <span className="flex items-center justify-center shrink-0 rounded-full" style={{ width: 44, height: 44, background: INK.prPale }}>
        <Building2 size={18} style={{ color: INK.prDeep }} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{`${e.businessName} invited you to their team`}</p>
        <p style={{ fontSize: textPx(12), color: INK.chF }}>
          {`Invited ${new Date(e.invitedAt).toLocaleDateString(appLocale("en-US"), { month: "short", day: "numeric", year: "numeric" })}` + (e.role && ROLE_NAME[e.role] ? ` · as ${ROLE_NAME[e.role]}` : "")}
        </p>
        {expiry && (
          <p style={{ fontSize: textPx(12), fontWeight: state === "open" ? 500 : 700, color: state === "open" ? INK.chS : INK.hi }}>{expiry}</p>
        )}
      </div>
    </div>
    {e.message && (
      <blockquote className="whitespace-pre-line" style={{ marginTop: 12, borderRadius: 12, background: INK.soft, padding: "10px 14px", fontSize: textPx(12.5), lineHeight: linePx(18), color: INK.ch }}>
        <span className="block" style={{ fontSize: textPx(11), fontWeight: 600, color: INK.chF, marginBottom: 4 }}>{`Message from ${e.businessName}`}</span>
        {e.message}
      </blockquote>
    )}
    {dead ? (
      <>
        <p style={{ fontSize: textPx(12), lineHeight: linePx(17), fontWeight: 600, color: INK.hi, marginTop: 12 }}>
          {dead}
        </p>
        <div style={{ marginTop: 12 }}>
          <CtaButton size="base" variant="outline" label={busy ? "Removing…" : "Remove"} icon={<X size={15} aria-hidden />} disabled={busy} onClick={onRemove ?? onDecline} />
        </div>
      </>
    ) : (
      <>
        <p style={{ fontSize: textPx(12), lineHeight: linePx(17), color: INK.chS, marginTop: 12 }}>
          {`Accepting lets ${e.businessName} schedule you and see your licences. While you're on a team, your public listing in the directory is turned off. You can leave at any time.`}
        </p>
        <div className="grid grid-cols-2" style={{ gap: 8, marginTop: 12 }}>
          <CtaButton size="base" variant="outline" label="Decline" icon={<X size={15} aria-hidden />} disabled={busy} onClick={onDecline} />
          <CtaButton size="base" label={busy ? "Accepting…" : "Accept"} icon={<Check size={15} aria-hidden />} disabled={busy} onClick={onAccept} />
        </div>
      </>
    )}
  </div>
  );
};

/**
 * MO9 "Join a business" (r13 field + r17 hint): 40 tall, r12, soft fill, 1px
 * 10% border, pad 0 12, building 15 lead, arrow-right 16 to send. The ID is
 * the business's 6-character code (request_to_join_business(p_code)).
 */
export const JoinById: React.FC<{ hint: string; onSent: () => void; onToast: (m: string) => void }> = ({ hint, onSent, onToast }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const send = async () => {
    const c = code.trim().toUpperCase();
    if (c.length !== 6) return setError("A business ID has 6 letters and numbers.");
    setSending(true);
    setError(null);
    const r = await requestToJoin(c);
    setSending(false);
    if (!r.ok) return setError(r.message);
    setCode("");
    onToast("Request sent. You join once the business approves and you accept.");
    onSent();
  };
  return (
    <div>
      <div className="flex items-center" style={{ height: 40, borderRadius: 12, background: INK.soft, border: `1px solid ${error ? INK.hi : INK.b10}`, paddingBlock: "0", paddingInline: "12px 4px", gap: 8 }}>
        <Building2 size={15} strokeWidth={2} style={{ color: INK.chF }} className="shrink-0" aria-hidden />
        <label htmlFor="join-code" className="sr-only">
          Business ID
        </label>
        <input
          id="join-code"
          value={code}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Enter a business ID"
          aria-invalid={!!error}
          aria-describedby={error ? "join-code-err" : "join-code-help"}
          onChange={(ev) => {
            setCode(ev.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
            setError(null);
          }}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") void send();
          }}
          className="flex-1 min-w-0 bg-transparent focus:outline-none placeholder:text-charcoal-faint"
          style={{ fontSize: textPx(14), color: INK.ch, letterSpacing: code ? "0.08em" : undefined, fontWeight: code ? 700 : 400 }}
        />
        <button type="button" onClick={() => void send()} disabled={sending || code.length === 0} aria-label="Send request" className="tap flex items-center justify-center shrink-0 disabled:opacity-40" style={{ width: 36, height: 36 }}>
          <ArrowRight size={16} strokeWidth={1.75} style={{ color: INK.chF }} aria-hidden />
        </button>
      </div>
      {error ? (
        <p id="join-code-err" role="alert" style={{ fontSize: textPx(11.5), fontWeight: 600, color: INK.hi, marginTop: 6 }}>
          {error}
        </p>
      ) : (
        <p id="join-code-help" style={{ fontSize: textPx(11.5), color: INK.chF, marginTop: 6, lineHeight: 1.5 }}>
          {hint}
        </p>
      )}
    </div>
  );
};

/** MO9 "leave confirmation" (ui.js popup with log-out): Leave business, Stay. */
export const LeavePopup: React.FC<{ name: string | null; busy: boolean; onLeave: () => void; onClose: () => void }> = ({ name, busy, onLeave, onClose }) => (
  <CentredPopup open={!!name} onClose={onClose} title={`Leave ${name ?? ""}?`} icon={<LogOut size={22} strokeWidth={2} aria-hidden />} body="You lose access to their business. Your own account and clients stay.">
    <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
      <CtaButton size="page" label="Leave business" loading={busy} onClick={onLeave} />
      <CtaButton size="page" variant="secondary" label="Stay" onClick={onClose} disabled={busy} />
    </div>
  </CentredPopup>
);

/** Kept from the old Your businesses page: declining an invitation, confirmed. */
export const DeclinePopup: React.FC<{ name: string | null; busy: boolean; onDecline: () => void; onClose: () => void }> = ({ name, busy, onDecline, onClose }) => (
  <CentredPopup open={!!name} onClose={onClose} title={`Decline ${name ?? ""}'s invitation?`} icon={<X size={22} strokeWidth={2} aria-hidden />} body="They can invite you again later.">
    <div className="flex flex-col" style={{ gap: 8, marginTop: 4 }}>
      <CtaButton size="page" label="Decline" loading={busy} onClick={onDecline} />
      <CtaButton size="page" variant="secondary" label="Keep it" onClick={onClose} disabled={busy} />
    </div>
  </CentredPopup>
);
