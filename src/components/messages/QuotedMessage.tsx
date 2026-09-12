import { CornerUpLeft, X } from "lucide-react";
import { describeMessage, type Message } from "../../services/messaging";

/**
 * The one-line quote of a message being replied to.
 *
 * USED IN TWO PLACES WITH ONE IMPLEMENTATION: above the composer while a reply
 * is being written, and inside the sent bubble afterwards. They are the same
 * object seen at two moments, and letting them diverge is how a quote ends up
 * saying one thing before sending and another after.
 *
 * IT DESCRIBES RATHER THAN COPIES. The text comes from describeMessage, the
 * same function the thread list uses, so a photo reads "Photo" and a purged
 * attachment reads "Attachment removed" in both places. Nothing is stored — the
 * quote is resolved from the parent every render, so it cannot outlive what it
 * quotes.
 *
 * A MISSING PARENT IS STATED, NOT HIDDEN. `message` is null when the reply
 * points at something outside the loaded window, and the row says so instead
 * of rendering an empty bar that looks like a loading failure.
 */
export const QuotedMessage: React.FC<{
  message: Message | null;
  /** Who wrote the quoted message, already resolved by the caller. */
  authorLabel: string;
  onCancel?: () => void;
  onJump?: () => void;
  /** Inside a sent bubble, rather than above the composer. */
  inBubble?: boolean;
}> = ({ message, authorLabel, onCancel, onJump, inBubble = false }) => {
  const body = message ? describeMessage(message) : "Message unavailable";

  const content = (
    <>
      {/* THE inBubble OPACITIES ARE CONTRAST FLOORS, NOT TASTE. This renders
          inside BOTH bubbles — a sent one, whose ground darkened so white ink
          could clear 4.5:1, and a received `cream-soft` one — and it sits on a
          `bg-black/10` tile inside either, which darkens the local ground
          again. Worst case across four themes and both modes: rail 3.12:1
          (needs 3:1, decorative divider), author 5.43:1 and body 4.59:1 (both
          needing 4.5:1 as normal text at 11px and 11.5px).

          The author carries the hierarchy now by WEIGHT rather than by being
          dimmed — it was 80% against the body's 70%, which on the old ground
          measured 2.40:1 and 2.18:1. Neither was readable, so the difference
          between them was not hierarchy, it was two illegible greys. */}
      <span
        className={`w-0.5 self-stretch rounded-full shrink-0 ${
          inBubble ? "bg-current opacity-65" : "bg-primary"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className={`block text-[11px] font-semibold truncate ${inBubble ? "" : "text-primary-dark"}`}>
          {authorLabel}
        </span>
        <span className={`block text-[11.5px] truncate ${inBubble ? "opacity-85" : "text-charcoal-soft"}`}>
          {body}
        </span>
      </span>
    </>
  );

  if (inBubble) {
    return (
      <button
        onClick={onJump}
        // A quote with no target is not tappable: jumping to nothing would
        // read as the control being broken rather than the message being gone.
        disabled={!message}
        className="tap flex items-stretch gap-2 w-full text-left rounded-xl bg-black/10 px-2.5 py-1.5 mb-1.5 disabled:cursor-default"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded-xl bg-cream-soft px-3 py-2 mb-2">
      <CornerUpLeft size={14} className="text-primary-dark shrink-0" />
      <div className="flex items-stretch gap-2 min-w-0 flex-1">{content}</div>
      {onCancel && (
        <button
          onClick={onCancel}
          aria-label="Cancel reply"
          className="tap w-7 h-7 rounded-full flex items-center justify-center text-charcoal-soft shrink-0 hover:bg-charcoal/5"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
};
