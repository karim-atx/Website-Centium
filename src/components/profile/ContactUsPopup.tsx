import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Headset, Mail, MessageCircle } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { listTime } from "../messages/chatTime";
import {
  SUPPORT_EMAIL,
  fetchMySupportThread,
  startSupportThread,
  supportEntryValue,
  supportUnreadBadge,
  type SupportThreadSummary,
} from "../../services/support";

// MO1.8.9 Contact us, as a centred popup (no ×; tapping outside or Escape
// closes it).
//
// LIVE CHAT, THEN EMAIL. Live chat is the user's own front door to Centium
// support (Database stage A5): on open, my_support_thread() says whether a
// conversation already exists (zero rows: "Start a chat"; one row: the way back
// into it, with its unread badge). start_support_thread() is called only behind
// the tap, never to find out whether a thread exists, because it creates one.
// The conversation opens in Messages like any other thread.
//
// A MINOR CAN USE IT. The database bypasses the minor messaging rule for support
// on purpose, so there is no age check here either.
//
// CALL US STILL WAITS (C32, frame check 2n): the board's +961 1 234 567 is a
// sample value with no real line behind it, so the row is not drawn.
//
// The contact FORM (contact_submissions) is the marketing site's Contact page,
// the path for people without an account. It stays separate from this.
//
// A REAL mailto: LINK, so the Email row opens the mail app with the address
// filled in. The address is also shown in full, so anyone without a mail app
// can copy it.

// Rows 60 apart on the board: 12 above and below a 36 pt tile. The inset
// divider is border.row (Foundations 2.3), from the text column (36 tile + 14
// gap = 50) to the end, not under the last row; ::before because .tap already
// uses ::after for its hit box.
const rowClass =
  "tap relative w-full flex items-center gap-3.5 py-3 text-start " +
  "before:content-[''] before:absolute before:bottom-0 before:start-[50px] before:end-0 before:h-px before:bg-[var(--border-row)] before:pointer-events-none last:before:hidden";

export const ContactUsPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const navigate = useNavigate();
  /** undefined while loading; null when the person has never contacted support. */
  const [thread, setThread] = useState<SupportThreadSummary | null | undefined>(undefined);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  // Read afresh every time the popup opens: a reply may have arrived since.
  // The state goes back to "loading" on the way out (close), so the next open
  // never shows the previous answer.
  const close = () => {
    setThread(undefined);
    setLoadError(null);
    setOpenError(null);
    setBusy(false);
    onClose();
  };
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchMySupportThread().then((r) => {
      if (cancelled) return;
      if (r.ok) setThread(r.thread);
      else {
        // Unknown rather than "none": the row still works, because the tap
        // goes through start_support_thread(), which finds an existing thread.
        setThread(null);
        setLoadError(r.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const loading = thread === undefined;

  const openChat = async () => {
    if (busy || loading) return;
    setBusy(true);
    setOpenError(null);
    let threadId = thread?.threadId ?? null;
    if (!threadId) {
      const r = await startSupportThread();
      if (!r.ok) {
        setBusy(false);
        setOpenError(r.message);
        return;
      }
      threadId = r.threadId;
    }
    // Messages opens the thread from navigation state once, the same way a
    // "Message" button does (useOpenThread). Not clearing busy: this unmounts.
    close();
    navigate("/app/messages", { state: { threadId } });
  };

  const badge = supportUnreadBadge(thread ?? null);
  const value = loading ? null : supportEntryValue(thread ?? null, (iso) => listTime(iso));
  const error = openError ?? loadError;

  return (
    // MO1.8.9 measured: the card 346 wide (the overlay padded 0 22 on the 390
    // board, card x 44 to 735 on the 2x board).
    <CentredPopup open={open} onClose={close} title="Contact us" icon={<Headset size={22} strokeWidth={1.75} />} maxWidth={346}>
      <div className="flex flex-col">
        {/* Live chat: tile #F0EDF9 (primary.tint) with MessageCircle 17 / 1.75
            in primary.accent; title 14 / 600; value 12 / 400 muted. */}
        <button
          type="button"
          onClick={() => void openChat()}
          disabled={busy || loading}
          aria-busy={busy || loading}
          aria-label={badge ? `Live chat, ${badge} unread` : undefined}
          className={`${rowClass} disabled:cursor-default`}
        >
          <span className="w-9 h-9 rounded-2xl bg-primary-pale flex items-center justify-center shrink-0" aria-hidden>
            <MessageCircle size={17} strokeWidth={1.75} className="text-primary-accent" />
          </span>
          <span className="flex-1 min-w-0 text-[14px] font-semibold text-charcoal">Live chat</span>
          {loading ? (
            // States › Loading: a skeleton block where the value sits (surface.soft).
            <span aria-hidden className="shrink-0 h-3 w-20 rounded-md bg-cream-soft animate-pulse" />
          ) : (
            <span className="shrink-0 max-w-[60%] truncate text-[12px] text-charcoal-faint">
              {busy ? "Opening…" : value}
            </span>
          )}
          {badge && (
            // The chat list's unread badge, so the two read the same.
            <span
              aria-hidden
              className="shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-primary-fill text-on-primary-fill text-[11px] font-extrabold flex items-center justify-center"
            >
              {badge}
            </span>
          )}
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />
        </button>
        {error && (
          // States › Error: an inline line in danger under the affected row.
          <p role="alert" className="ps-[50px] pb-2 -mt-1 text-[12px] font-semibold text-status-high">
            {error}
          </p>
        )}

        <a href={`mailto:${SUPPORT_EMAIL}`} className={rowClass}>
          <span className="w-9 h-9 rounded-2xl bg-berry-pale flex items-center justify-center shrink-0" aria-hidden>
            <Mail size={17} strokeWidth={1.75} className="text-berry" />
          </span>
          <span className="flex-1 min-w-0 text-[14px] font-semibold text-charcoal">Email</span>
          <span className="shrink-0 max-w-[60%] truncate text-[12px] text-charcoal-faint">{SUPPORT_EMAIL}</span>
          <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />
        </a>
      </div>
    </CentredPopup>
  );
};
