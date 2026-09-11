import { useEffect, useState } from "react";
import { Check, ChevronRight } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { PERSON_ICON } from "../../utils/icons";
import {
  describeMessage,
  fetchThreads,
  forwardMessage,
  type Message,
  type MessageThread,
} from "../../services/messaging";

/**
 * Choosing where to forward a message.
 *
 * A SECOND SHEET, NOT A NESTED ONE. The action sheet closes before this opens,
 * because two BottomSheets alive at once means two overlays and two backdrops
 * competing for the same dismiss. Sequential is also how the interaction
 * actually reads: pick the action, then pick the destination.
 *
 * THE LIST IS WHATEVER RLS ALLOWS, WHICH IS THE POINT. fetchThreads is scoped
 * to the caller's own conversations, so forwarding cannot reach a stranger --
 * you can only pass something to someone you are already talking to.
 *
 * DELETED PARTICIPANTS ARE EXCLUDED EXPLICITLY, AND USED NOT TO NEED TO BE.
 * This comment previously said such threads were "absent for free, since
 * thread_participant_summary inner-joins profiles and a null side yields no
 * row" -- true when written, and false since Database migration 20260911200000
 * changed that join to a LEFT JOIN so the survivor could still reach the
 * conversation. The free exclusion went with it, and the filter below replaces
 * it deliberately.
 *
 * WHY EXCLUDE RATHER THAN ALLOW. A forward into such a thread would insert
 * successfully -- messages_insert_by_sender only asks whether the sender is a
 * participant -- and this sheet would then report "Forwarded / Sent to Deleted
 * account", naming a recipient who does not exist and implying the message
 * arrived somewhere. Passing something along is an act aimed at a person; when
 * there is no person, the action has no meaning to offer.
 *
 * Composing directly into such a thread is still allowed, and that is not a
 * contradiction: writing a note in a conversation nobody will read is the
 * sender's own business, while choosing it from a list of recipients is the
 * app asserting someone is there to receive it.
 *
 * THE CURRENT THREAD IS EXCLUDED. Forwarding into the conversation you are
 * reading looks like a duplicate rather than an action; copy exists for that.
 *
 * CONFIRMS IN PLACE, matching ReportBugSheet and RateAppSheet. This app has no
 * toast, and the alternative -- closing silently -- leaves someone unsure
 * whether a message went to the right person, which is the one thing worth
 * being certain about when the destination was chosen a second ago.
 */
export const ForwardSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  message: Message | null;
  currentThreadId: string;
  senderId: string | null;
}> = ({ open, onClose, message, currentThreadId, senderId }) => {
  const [threads, setThreads] = useState<MessageThread[] | null>(null);
  const [busyFor, setBusyFor] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchThreads().then((result) => {
      if (cancelled) return;
      setThreads(
        result.ok
          ? result.threads.filter((t) => t.id !== currentThreadId && t.participantId !== null)
          : []
      );
      if (!result.ok) setError(result.message);
    });
    return () => {
      cancelled = true;
    };
  }, [open, currentThreadId]);

  const send = async (thread: MessageThread) => {
    if (!message || !senderId || busyFor) return;
    setBusyFor(thread.id);
    setError(null);
    const result = await forwardMessage(thread.id, senderId, message);
    setBusyFor(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setSentTo(thread.participantName);
    setTimeout(onClose, 1200);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="Forward to">
      {sentTo ? (
        <div className="py-8 flex flex-col items-center text-center animate-fade-slide-up">
          <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center mb-3">
            <Check size={22} className="text-primary-dark" />
          </div>
          <p className="text-sm font-semibold text-charcoal">Forwarded</p>
          <p className="text-xs text-charcoal-faint mt-1">Sent to {sentTo}.</p>
        </div>
      ) : (
        <div className="animate-fade-slide-up">
          {message && (
            <p className="text-xs text-charcoal-soft bg-cream-soft rounded-xl px-3 py-2 mb-3 truncate">
              {describeMessage(message)}
            </p>
          )}

          {error && (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mb-3">
              {error}
            </p>
          )}

          {/* Nothing at all while loading: a skeleton list would suggest
              conversations exist before anyone knows whether any do. */}
          {threads !== null && threads.length === 0 && !error && (
            <p className="text-sm text-charcoal-faint text-center py-8">
              No other conversations to forward to.
            </p>
          )}

          {(threads ?? []).map((t) => (
            <button
              key={t.id}
              onClick={() => void send(t)}
              disabled={!!busyFor}
              className="tap w-full flex items-center gap-3 px-1 py-3 text-left disabled:opacity-50"
            >
              <span className="w-9 h-9 rounded-full bg-primary-pale flex items-center justify-center shrink-0 overflow-hidden">
                {t.participantAvatarUrl ? (
                  <img src={t.participantAvatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <PERSON_ICON size={16} className="text-primary-dark" />
                )}
              </span>
              <span className="flex-1 min-w-0 text-sm font-medium text-charcoal truncate">
                {t.participantName}
              </span>
              {busyFor === t.id ? (
                <span className="text-[11px] text-charcoal-faint shrink-0">Sending…</span>
              ) : (
                <ChevronRight size={15} className="text-charcoal-faint shrink-0" />
              )}
            </button>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};
