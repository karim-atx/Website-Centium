import React, { useEffect, useState } from "react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { useApp } from "../../../context/AppContext";
import { linePx, textPx } from "../../../theme/textSize";
import { fetchClassRoster } from "../../../services/venues/console";
import { sendMessage, startMemberThread } from "../../../services/messaging";
import { fieldStyle, useMarketColours } from "./parts";
import { FOCUS_CSS } from "../../../components/market/usePress";
import type { Session } from "./scheduleModel";
import { t, tn } from "../../../i18n/core";

// OP1-088 · Message members (kept, PLAN §3.4; Market + Share 3.0 W3 restyle:
// the MasterBottomSheet chrome of B-MA.6, --sgrey boxes with the 13 / 500
// --slabel label over a --sfield field, the note 12 / 17 --ink2, and the
// pinned CTA "Send to {n} members" 50 radius 16 --fill 15 / 700).
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
  const m = useMarketColours();
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
      if (!r.ok) setError(t("Couldn't load who's booked. Check your connection and try again."));
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
  const clients = people === "clients";
  const canSend = online && !busy && n > 0 && !!text.trim() && !!businessId && !!authUserId;

  const send = async () => {
    if (!canSend || !businessId || !authUserId) return;
    setBusy(true);
    setError(null);
    let sent = 0;
    for (const personId of ids) {
      const thread = await startMemberThread(businessId, personId);
      if (!thread.ok) continue;
      const m = await sendMessage(thread.threadId, authUserId, text.trim());
      if (m.ok) sent += 1;
    }
    setBusy(false);
    if (sent === 0) {
      setError(t("Couldn't send. Check your connection and try again."));
      return;
    }
    setDrafts((d) => ({ ...d, [session.id]: "" }));
    onSent(
      sent === n
        ? clients
          ? tn(n, "Sent to {n} client.", "Sent to {n} clients.")
          : tn(n, "Sent to {n} member.", "Sent to {n} members.")
        : clients
          ? tn(n, "Sent to {sent} of {n} client. Try again for the rest.", "Sent to {sent} of {n} clients. Try again for the rest.", { sent })
          : tn(n, "Sent to {sent} of {n} member. Try again for the rest.", "Sent to {sent} of {n} members. Try again for the rest.", { sent })
    );
    onClose();
  };

  const box: React.CSSProperties = { background: m.sgrey, borderRadius: 14, padding: "12px 14px" };
  const boxLabel: React.CSSProperties = { margin: "0 0 8px", fontSize: textPx(13), fontWeight: 500, color: m.slabel };

  return (
    <BottomSheet
      open={open}
      onClose={() => !busy && onClose()}
      title={clients ? t("Message clients") : t("Message members")}
      animateExit
      footerRule
      footer={
        <>
          <style>{FOCUS_CSS}</style>
          {!online && <p style={{ margin: "0 0 8px", fontSize: textPx(11.5), fontWeight: 700, color: m.ink2 }}>{t("You're offline.")}</p>}
          {error && (
            <p role="alert" style={{ margin: "0 0 8px", fontSize: textPx(11.5), fontWeight: 700, lineHeight: linePx(16), color: m.high }}>
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={() => void send()}
            disabled={!canSend}
            aria-disabled={!canSend || undefined}
            className="market-focus w-full flex items-center justify-center"
            style={{ height: 50, borderRadius: 16, background: m.fill, color: m.onfill, fontSize: textPx(15), fontWeight: 700, border: 0, opacity: canSend ? 1 : 0.4 }}
          >
            {busy ? t("Sending…") : clients ? tn(n, "Send to {n} client", "Send to {n} clients") : tn(n, "Send to {n} member", "Send to {n} members")}
          </button>
        </>
      }
    >
      <div className="flex flex-col" style={{ gap: 10, lineHeight: "normal" }}>
        <div style={box}>
          <p style={boxLabel}>{t("To")}</p>
          <div role="textbox" aria-readonly="true" style={{ ...fieldStyle(m), color: m.ink }}>
            {loadingIds
              ? t("Finding who's booked on {class}…", { class: session.title })
              : clients
                ? tn(n, "{n} booked client of {class}", "{n} booked clients of {class}", { class: session.title })
                : tn(n, "{n} booked member of {class}", "{n} booked members of {class}", { class: session.title })}
          </div>
        </div>
        <div style={box}>
          <label htmlFor="msg-members-text" className="block" style={boxLabel}>
            {t("Message")}
          </label>
          <textarea
            id="msg-members-text"
            value={text}
            onChange={(e) => setDrafts((d) => ({ ...d, [session.id]: e.target.value.slice(0, 2000) }))}
            rows={4}
            className="market-focus w-full block resize-none"
            style={{ ...fieldStyle(m), display: "block", minHeight: 104, outline: "none", caretColor: m.pdark }}
          />
        </div>
        <p style={{ margin: "0 4px", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>
          {clients ? t("They get it in Messages. Names stay private to other clients.") : t("They get it in Messages. Names stay private to other members.")}
        </p>
      </div>
    </BottomSheet>
  );
}
