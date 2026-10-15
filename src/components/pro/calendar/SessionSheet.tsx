import React, { useEffect, useState } from "react";
import { Banknote, CalendarX, ChevronRight, Clock, EyeOff, Link as LinkIcon, MapPin, MessageCircle, Paperclip } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CentredPopup } from "../../ui/CentredPopup";
import { CtaButton } from "../../ui/PinnedCta";
import { SegmentedTabs } from "../../ui/SegmentedTabs";
import { normaliseLink, linkLabel } from "../../calendar/calendarTime";
import { textPx } from "../../../theme/textSize";
import { range12 } from "../../../utils/time12";
import { INK } from "../proInk";
import { Avatar } from "../client/kit";
import type { ProLane } from "../subtypeLanes";
import {
  fetchSessionNote,
  saveSessionNote,
  setSessionOutcome,
  setSessionPaid,
  type NoteKind,
  type Outcome,
  type SessionType,
} from "../../../services/pro/calendar";
import { dayDate, money } from "./calendarModel";
import type { CalItem } from "./calendarItems";

/**
 * Release 3 · W4 CA6 Session details and outcome (source/gen/cal.js
 * sessionDetail): the client card (raised r16 pad 12, avatar 44, name 14 /
 * 700, the plan line 12 text.faint, Profile 12 / 700 primary.deep), the
 * details (13 text.soft, icons 14 text.faint, gap 8, 14 above, 18 under),
 * "How did it go?" (the section label) over Completed / No-show / Late
 * cancel (SegmentedTabs h38, 12), the private note (min 96, r12), "Only you
 * can see session notes" (11, eye-off 12), Cancel session (13 / 700
 * status.high), and Message + Save outcome as the sheet's footer pair.
 *
 * DB-4: set_session_outcome (a pack client's session is counted once),
 * set_session_paid (a state, no payments), session_notes with event_id
 * (private: shared_with_client false). Outcomes are offered once the session
 * has started. CA7 is the cancel popup: a booking is cancelled through
 * cancel_professional_booking (the client is told); a session added here is
 * removed with its invitation.
 */

const NOTE_LABEL: Record<ProLane, string> = { full_coaching: "Training note", nutrition: "Nutrition note", clinical_overview: "Clinical note" };
const NOTE_KIND: Record<ProLane, NoteKind> = { full_coaching: "training", nutrition: "nutrition", clinical_overview: "clinical" };
const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: "completed", label: "Completed" },
  { key: "no_show", label: "No-show" },
  { key: "late_cancel", label: "Late cancel" },
];

export const SessionSheet: React.FC<{
  item: CalItem | null;
  me: string;
  lane: ProLane;
  planLine: string | null;
  avatarUrl: string | null;
  type: SessionType | null;
  started: boolean;
  onClose: () => void;
  onProfile: (clientId: string) => void;
  onMessage: (clientId: string) => void;
  onEdit: (() => void) | null;
  onCancel: () => Promise<{ ok: boolean; message?: string }>;
  onOpenAttachment: (path: string) => void;
  onChanged: () => void;
}> = ({ item, me, lane, planLine, avatarUrl, type, started, onClose, onProfile, onMessage, onEdit, onCancel, onOpenAttachment, onChanged }) => {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [savedNote, setSavedNote] = useState("");
  const [paid, setPaid] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const eventId = item?.event?.id ?? null;

  useEffect(() => {
    setOutcome((item?.extras?.outcome as Outcome | null) ?? null);
    setPaid(!!item?.extras?.paidAt);
    setNote("");
    setSavedNote("");
    setNoteId(null);
    setError(null);
    setConfirm(false);
    if (!eventId || !item?.clientId) return;
    let live = true;
    void fetchSessionNote(me, eventId).then((r) => {
      if (!live || !r.ok || !r.data) return;
      setNoteId(r.data.id);
      setNote(r.data.body);
      setSavedNote(r.data.body);
    });
    return () => {
      live = false;
    };
  }, [eventId, item?.clientId, item?.extras?.outcome, item?.extras?.paidAt, me]);

  if (!item || !item.event) return null;
  const e = item.event;
  const clientId = item.clientId;
  const name = item.name ?? "";
  const price = item.extras?.price ?? null;
  const href = normaliseLink(e.url);
  const changed = outcome !== (item.extras?.outcome ?? null) || note.trim() !== savedNote.trim();

  const save = async () => {
    if (!eventId || busy) return;
    setBusy(true);
    setError(null);
    if (outcome && outcome !== item.extras?.outcome) {
      const r = await setSessionOutcome(eventId, outcome);
      if (!r.ok) {
        setBusy(false);
        setError(r.message);
        return;
      }
    }
    if (clientId && note.trim() !== savedNote.trim()) {
      const r = await saveSessionNote(me, eventId, clientId, NOTE_KIND[lane], noteId, note);
      if (!r.ok) {
        setBusy(false);
        setError(r.message);
        return;
      }
    }
    setBusy(false);
    onChanged();
    onClose();
  };

  const togglePaid = async () => {
    if (!eventId || busy) return;
    setBusy(true);
    const r = await setSessionPaid(eventId, !paid);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    setPaid(!paid);
    onChanged();
  };

  const cancel = async () => {
    setBusy(true);
    const r = await onCancel();
    setBusy(false);
    if (!r.ok) {
      setConfirm(false);
      setError(r.message ?? "Couldn't cancel this session. Try again.");
      return;
    }
    setConfirm(false);
    onClose();
  };

  const line = (icon: React.ReactNode, text: React.ReactNode, extra?: React.ReactNode) => (
    <span className="flex items-center" style={{ gap: 8 }}>
      {icon}
      <span className="flex-1 min-w-0">{text}</span>
      {extra}
    </span>
  );
  const ic = { size: 14, strokeWidth: 2, "aria-hidden": true, style: { color: INK.chF, flexShrink: 0 } } as const;
  const booking = e.sourceKind === "appointment";

  return (
    <>
      <BottomSheet
        open={!!item}
        onClose={onClose}
        title="Session"
        footer={
          <div className="flex w-full" style={{ gap: 8 }}>
            {clientId && <CtaButton size="sheet" variant="secondary" className="flex-1" label="Message" icon={<MessageCircle size={15} aria-hidden />} onClick={() => onMessage(clientId)} />}
            <CtaButton size="sheet" className="flex-1" label="Save outcome" loading={busy} disabled={!changed} onClick={() => void save()} />
          </div>
        }
      >
        {clientId && (
          <div className="flex items-center" style={{ gap: 12, background: INK.raised, borderRadius: 16, padding: 12 }}>
            <Avatar name={name} url={avatarUrl} size={44} />
            <div className="flex-1 min-w-0">
              <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{name}</p>
              {planLine && <p style={{ fontSize: textPx(12), color: INK.chF }}>{planLine}</p>}
            </div>
            <button type="button" onClick={() => onProfile(clientId)} className="tap flex items-center" style={{ gap: 2, fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, minHeight: 44 }}>
              Profile
              <ChevronRight size={12} strokeWidth={2.4} aria-hidden />
            </button>
          </div>
        )}
        <div className="flex flex-col" style={{ gap: 8, margin: "14px 0 18px", fontSize: textPx(13), color: INK.chS }}>
          {line(<Clock {...ic} />, [dayDate(item.date), range12(item.start, item.end), e.title].filter(Boolean).join(" · "))}
          {e.location && line(<MapPin {...ic} />, e.location)}
          {href &&
            line(
              <LinkIcon {...ic} />,
              <a href={href} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2" style={{ color: INK.prDeep, fontWeight: 600 }}>
                {linkLabel(href)}
              </a>
            )}
          {price !== null &&
            line(
              <Banknote {...ic} />,
              `${money(price, type?.currency ?? "USD")} · ${paid ? "Paid" : "Not paid yet"}`,
              <button type="button" onClick={() => void togglePaid()} disabled={busy} className="tap" style={{ fontSize: textPx(12), fontWeight: 700, color: INK.prDeep, minHeight: 32 }}>
                {paid ? "Mark as unpaid" : "Mark as paid"}
              </button>
            )}
          {e.attachmentPath &&
            line(
              <Paperclip {...ic} />,
              <button type="button" onClick={() => onOpenAttachment(e.attachmentPath!)} className="tap" style={{ fontWeight: 600, color: INK.prDeep }}>
                Open attachment
              </button>
            )}
        </div>

        {started && (
          <>
            <p style={{ fontSize: textPx(11), fontWeight: 600, lineHeight: "14px", textTransform: "uppercase", letterSpacing: "0.14em", paddingBottom: 7.5, borderBottom: `1.5px solid ${INK.pr}`, color: INK.chF, marginBottom: 10 }}>
              How did it go?
            </p>
            <SegmentedTabs items={OUTCOMES} activeKey={outcome ?? ""} onChange={(k) => setOutcome(k as Outcome)} tabHeight={38} labelSize={12} className="mb-4" />
          </>
        )}

        {clientId && (
          <>
            <label htmlFor="session-note" className="block" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS, marginBottom: 6 }}>
              {NOTE_LABEL[lane]}
            </label>
            <textarea
              id="session-note"
              value={note}
              onChange={(ev) => setNote(ev.target.value)}
              maxLength={10000}
              className="block w-full resize-none outline-none focus:border-primary"
              style={{ minHeight: 96, borderRadius: 12, background: INK.soft, border: `1px solid ${INK.b10}`, padding: "10px 12px", fontSize: textPx(14), color: INK.ch, lineHeight: 1.45 }}
            />
            <p className="flex items-center" style={{ gap: 6, fontSize: textPx(11), color: INK.chF, marginTop: 8 }}>
              <EyeOff size={12} strokeWidth={2} aria-hidden />
              Only you can see session notes
            </p>
          </>
        )}

        {error && (
          <p role="alert" className="text-center" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 12 }}>
            {error}
          </p>
        )}

        {onEdit && !booking && (
          <button type="button" onClick={onEdit} className="tap block w-full text-center" style={{ marginTop: 16, minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}>
            Edit details
          </button>
        )}
        <button type="button" onClick={() => setConfirm(true)} className="tap block w-full text-center" style={{ marginTop: onEdit && !booking ? 0 : 16, minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.hi }}>
          Cancel session
        </button>
      </BottomSheet>

      <CentredPopup
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Cancel this session?"
        icon={<CalendarX size={22} strokeWidth={2} aria-hidden />}
        body={
          booking || !clientId
            ? `${name || "Your client"} gets a notification and the slot opens for booking again.`
            : `${name} is taken off this session and the slot opens for booking again.`
        }
      >
        <div className="flex flex-col" style={{ gap: 8 }}>
          <CtaButton size="page" label="Cancel session" loading={busy} onClick={() => void cancel()} />
          <CtaButton size="page" variant="secondary" label="Keep session" disabled={busy} onClick={() => setConfirm(false)} />
        </div>
      </CentredPopup>
    </>
  );
};
