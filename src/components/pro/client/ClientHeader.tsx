import React, { useRef, useState } from "react";
import { CalendarPlus, ChevronLeft, Clock3, MessageCircle, MoreHorizontal, Plus } from "lucide-react";
import { textPx } from "../../../theme/textSize";
import { CtaButton } from "../../ui/PinnedCta";
import { INK } from "../proInk";
import { Avatar, Pill, RoundBtn, type Tone } from "./kit";
import { fmtDay } from "./clientFormat";
import { formatPrice } from "../../../utils/price";
import { paymentMethodLabel } from "../../../services/hires/proLogic";
import type { ClientPendingHire } from "../../../services/pro/clientPage";

/**
 * Release 3 · CL2 client page header (source gen/r6b.js cpHead6 with
 * ui.js head19 and roundBtn):
 * - back (36, chevron 18) and the three round buttons (36): Message,
 *   Schedule, More;
 * - avatar 60 (sky for a new client), name 21 / 800 -0.02em, the status
 *   pill; "{Client|Patient} since {date} · Next {when}" 12 text.faint (a new
 *   client: "Joined {date} · Not booked yet");
 * - tags 11 / 700, pad 3 9, r7, soft fill, and the dashed "+ Tag" chip
 *   (m-bottom 14);
 * - Release 2 kept: the Pending payment banner (FINAL_PLAN 2.4, "client
 *   page header banner") with Confirm payment (confirm_hire_payment).
 */
export const ClientHeader: React.FC<{
  name: string;
  avatarUrl: string | null | undefined;
  patient: boolean;
  status: { label: string; tone: Tone };
  isNew: boolean;
  joinedAt: string;
  next: string | null;
  tags: string[];
  pendingHires: ClientPendingHire[];
  onBack: () => void;
  onMessage: () => void;
  onSchedule: () => void;
  onMore: (el: HTMLElement) => void;
  onTags: () => void;
  onConfirmPayment: (h: ClientPendingHire) => Promise<string | null>;
}> = ({ name, avatarUrl, patient, status, isNew, joinedAt, next, tags, pendingHires, onBack, onMessage, onSchedule, onMore, onTags, onConfirmPayment }) => {
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sinceLine = isNew
    ? `Joined ${fmtDay(joinedAt, true)} · ${next ? `Next ${next}` : "Not booked yet"}`
    : `${patient ? "Patient" : "Client"} since ${fmtDay(joinedAt, true)}${next ? ` · Next ${next}` : ""}`;
  return (
    <>
      <div className="flex items-start justify-between" style={{ gap: 12, marginBottom: 13 }}>
        <button type="button" onClick={onBack} aria-label="Back" className="tap flex items-center justify-center shrink-0" style={{ width: 44, height: 44, marginInlineStart: -10, marginTop: -2 }}>
          <ChevronLeft size={18} strokeWidth={2} aria-hidden style={{ color: INK.chS }} />
        </button>
        <div className="flex" style={{ gap: 8 }}>
          <RoundBtn icon={MessageCircle} label="Message" onClick={onMessage} />
          <RoundBtn icon={CalendarPlus} label="Schedule" onClick={onSchedule} />
          <RoundBtn ref={moreRef} icon={MoreHorizontal} label="More" onClick={() => moreRef.current && onMore(moreRef.current)} />
        </div>
      </div>
      <div className="flex items-center" style={{ gap: 14, marginBottom: 10 }}>
        <Avatar name={name} url={avatarUrl} size={60} tone={isNew ? "sky" : "pr"} />
        <div className="min-w-0">
          <div className="flex items-center flex-wrap" style={{ gap: 8 }}>
            <h1 style={{ fontSize: textPx(21), fontWeight: 800, letterSpacing: "-0.02em", color: INK.ch, overflowWrap: "anywhere" }}>{name}</h1>
            <Pill label={status.label} tone={status.tone} />
          </div>
          <p style={{ fontSize: textPx(12), color: INK.chF }}>{sinceLine}</p>
        </div>
      </div>
      <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 14 }}>
        {tags.map((t) => (
          <button key={t} type="button" onClick={onTags} className="tap" style={{ fontSize: textPx(11), fontWeight: 700, padding: "3px 9px", borderRadius: 7, background: INK.soft, color: INK.chS, minHeight: 24 }}>
            {t}
          </button>
        ))}
        <button
          type="button"
          onClick={onTags}
          className="tap inline-flex items-center relative before:absolute before:-inset-y-2 before:inset-x-0 before:content-['']"
          style={{ gap: 3, fontSize: textPx(11), fontWeight: 700, padding: "3px 9px", borderRadius: 7, border: `1px dashed ${INK.b10}`, color: INK.chF }}
        >
          <Plus size={10} strokeWidth={2.6} aria-hidden />
          Tag
        </button>
      </div>
      {pendingHires.map((h) => (
        <div key={h.id} role="status" className="flex items-start" style={{ gap: 12, borderRadius: 20, background: INK.goldPale, padding: "12px 14px", marginBottom: 12 }}>
          <Clock3 size={18} strokeWidth={2} aria-hidden style={{ color: INK.goldInk, flexShrink: 0, marginTop: 2 }} />
          <div className="flex-1 min-w-0">
            <p style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.ch }}>Pending payment</p>
            <p style={{ fontSize: textPx(12), color: INK.chS, lineHeight: 1.45 }}>
              {`${h.planName} · ${formatPrice(h.priceAgreed) || "$0"} · ${paymentMethodLabel(h.paymentMethod)}`}
            </p>
            {error && busy === null && (
              <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 4 }}>
                {error}
              </p>
            )}
            <div className="flex" style={{ marginTop: 8 }}>
              <CtaButton
                size="base"
                label="Confirm payment"
                loading={busy === h.id}
                onClick={async () => {
                  setBusy(h.id);
                  setError(null);
                  const err = await onConfirmPayment(h);
                  setBusy(null);
                  setError(err);
                }}
              />
            </div>
          </div>
        </div>
      ))}
    </>
  );
};
