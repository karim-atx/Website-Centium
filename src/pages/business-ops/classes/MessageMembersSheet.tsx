import { useEffect, useState } from "react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { useApp } from "../../../context/AppContext";
import { linePx, textPx } from "../../../theme/textSize";
import { fetchClassRoster } from "../../../services/venues/console";
import { sendMessage, startMemberThread } from "../../../services/messaging";
import { useOps } from "./opsTheme";
import type { Session } from "./scheduleModel";

// OP1-088 · Message members (OpsTabsV4 sheet: 62 header, body 18 18 30;
// "To" read-only 48 r14 soft, Message 104 r14 input + 1px border, the note
// 12/17 inkSoft, Send 52 r16 fill 14.5/800 "Send to {n} members").
//
// EACH PERSON GETS IT IN THEIR OWN THREAD WITH THE BUSINESS, never a group
// (a group would show members to each other): start_member_thread per
// booked person (B7 MB-02; idempotent, one thread per member whoever sends),
// then one message into each. The handover asks for a server-side fan-out;
// the Database chose this per-member call, so it runs here, in order, and
// says how many it reached. Booked people only, from venue_class_roster's
// person_id (Database 65e0311), de-duplicated.
//
// OURS (O2): "Sending…" at 0.45 while it runs; a failure line under the
// button; offline disables Send with "You're offline."; the draft is kept
// while the sheet is closed and reopened for the same session (S2).

export function MessageMembersSheet({
  open,
  session,
  businessId,
  people,
  online,
  onClose,
  onSent,
}: {
  open: boolean;
  session: Session | null;
  businessId: string | null;
  /** "members" or "clients" (Classes). */
  people: "members" | "clients";
  online: boolean;
  onClose: () => void;
  onSent: (message: string) => void;
}) {
  const c = useOps();
  const { authUserId } = useApp();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  /** Booked people per session; ids null while the roster loads. */
  const [recipients, setRecipients] = useState<{ sessionId: string; ids: string[] | null } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setError(null);
  }

  const sessionId = session?.id ?? null;
  useEffect(() => {
    if (!open || !sessionId) return;
    let alive = true;
    void fetchClassRoster(sessionId).then((r) => {
      if (!alive) return;
      const ids = r.ok ? [...new Set(r.value.filter((e) => e.kind === "booked" && e.personId).map((e) => e.personId!))] : [];
      setRecipients({ sessionId, ids });
      if (!r.ok) setError("Couldn't load who's booked. Check your connection and try again.");
    });
    return () => {
      alive = false;
    };
  }, [open, sessionId]);

  if (!session) return null;
  const text = drafts[session.id] ?? "";
  const loadingIds = recipients?.sessionId !== session.id || recipients.ids === null;
  const ids = (recipients?.sessionId === session.id ? recipients.ids : null) ?? [];
  const n = ids.length;
  const word = (k: number) => (people === "clients" ? (k === 1 ? "client" : "clients") : k === 1 ? "member" : "members");
  const canSend = online && !busy && n > 0 && !!text.trim() && !!businessId && !!authUserId;

  const send = async () => {
    if (!canSend || !businessId || !authUserId) return;
    setBusy(true);
    setError(null);
    let sent = 0;
    for (const personId of ids) {
      const t = await startMemberThread(businessId, personId);
      if (!t.ok) continue;
      const m = await sendMessage(t.threadId, authUserId, text.trim());
      if (m.ok) sent += 1;
    }
    setBusy(false);
    if (sent === 0) {
      setError("Couldn't send. Check your connection and try again.");
      return;
    }
    setDrafts((d) => ({ ...d, [session.id]: "" }));
    onSent(sent === n ? `Sent to ${n} ${word(n)}.` : `Sent to ${sent} of ${n} ${word(n)}. Try again for the rest.`);
    onClose();
  };

  const label = { margin: "0 0 6px", fontSize: textPx(12), fontWeight: 700, color: c.inkSoft, whiteSpace: "nowrap" as const };

  return (
    <BottomSheet
      open={open}
      onClose={() => !busy && onClose()}
      title={people === "clients" ? "Message clients" : "Message members"}
      tone="business"
      headerHeight={62}
      animateExit
      bodyPadding={{ top: 18, right: 18, bottom: 30, left: 18 }}
    >
      <p style={label}>To</p>
      <div
        role="textbox"
        aria-readonly="true"
        className="flex items-center"
        style={{ minHeight: 48, borderRadius: 14, background: c.soft, padding: "0 14px", marginBottom: 14, fontSize: textPx(14), fontWeight: 600, lineHeight: linePx(20), color: c.ink }}
      >
        {loadingIds ? `Finding who's booked on ${session.title}…` : `${n} booked ${word(n)} of ${session.title}`}
      </div>
      <label htmlFor="msg-members-text" style={{ ...label, display: "block" }}>
        Message
      </label>
      <textarea
        id="msg-members-text"
        value={text}
        onChange={(e) => setDrafts((d) => ({ ...d, [session.id]: e.target.value.slice(0, 2000) }))}
        rows={4}
        className="w-full resize-none focus:outline-none"
        style={{ minHeight: 104, borderRadius: 14, background: c.input, border: `1px solid ${c.border}`, padding: "12px 14px", marginBottom: 14, fontSize: textPx(14), fontWeight: 600, lineHeight: linePx(20), color: c.ink }}
      />
      <p style={{ margin: "0 0 14px", fontSize: textPx(12), lineHeight: linePx(17), color: c.inkSoft }}>
        They get it in Messages. Names stay private to other {word(2)}.
      </p>
      <button
        type="button"
        onClick={() => void send()}
        disabled={!canSend}
        aria-disabled={!canSend || undefined}
        className="tap w-full flex items-center justify-center"
        style={{ minHeight: 52, borderRadius: 16, background: c.fill, color: c.onFill, fontSize: textPx(14.5), fontWeight: 800, opacity: canSend ? 1 : 0.45 }}
      >
        {busy ? "Sending…" : `Send to ${n} ${word(n)}`}
      </button>
      {!online && (
        <p style={{ margin: "8px 0 0", fontSize: textPx(11.5), fontWeight: 700, color: c.inkSoft }}>You're offline.</p>
      )}
      {error && (
        <p role="alert" style={{ margin: "8px 0 0", fontSize: textPx(11.5), fontWeight: 700, color: c.high }}>
          {error}
        </p>
      )}
    </BottomSheet>
  );
}
