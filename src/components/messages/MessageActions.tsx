import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Plus } from "lucide-react";
import { MORE_REACTIONS, QUICK_REACTIONS } from "../../services/messaging/chatFeatures";

export interface MessageAction {
  label: string;
  onSelect: () => void;
  /** Delete and report read as cautions, below a divider. */
  danger?: boolean;
  /** Right-aligned note, e.g. how long an edit window has left. */
  note?: string;
}

/**
 * Long-press on a message (phase 2A, screen 3): the reaction bar above the
 * message and its actions below, over a dimmed conversation.
 *
 * Tapping the reaction already chosen removes it; tapping another changes it,
 * one per person per message. "More" opens the wider set in place.
 *
 * Escape and a tap on the dimmed area close it without doing anything.
 */
export const MessageActions: React.FC<{
  open: boolean;
  onClose: () => void;
  mine: boolean;
  preview: string;
  myReaction: string | null;
  /** Null when this message cannot be reacted to (a blocked conversation). */
  onReact: ((emoji: string | null) => void) | null;
  actions: MessageAction[];
}> = ({ open, onClose, mine, preview, myReaction, onReact, actions }) => {
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const react = (emoji: string) => {
    onReact?.(emoji === myReaction ? null : emoji);
    onClose();
  };

  const safe = actions.filter((a) => !a.danger);
  const danger = actions.filter((a) => a.danger);
  const row =
    "tap w-full h-[46px] px-4 flex items-center justify-between gap-3 text-left text-[14.5px] font-semibold";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Message actions"
      onClick={onClose}
      className="fixed inset-0 z-[70] overflow-y-auto"
      style={{ background: "rgba(58, 53, 71, 0.92)" }}
    >
      <div
        className={`min-h-full max-w-lg mx-auto px-4 py-10 flex flex-col justify-center gap-2.5 ${
          mine ? "items-end" : "items-start"
        }`}
      >
        {onReact && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-cream-card rounded-[28px] p-1.5 flex flex-wrap gap-0.5 max-w-full animate-fade-slide-up"
          >
            {(more ? [...QUICK_REACTIONS, ...MORE_REACTIONS] : QUICK_REACTIONS).map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => react(emoji)}
                aria-label={`React ${emoji}`}
                aria-pressed={emoji === myReaction}
                className={`tap w-11 h-11 rounded-full text-[22px] leading-none flex items-center justify-center ${
                  emoji === myReaction ? "bg-primary-pale" : ""
                }`}
              >
                {emoji}
              </button>
            ))}
            {!more && (
              <button
                type="button"
                onClick={() => setMore(true)}
                aria-label="More reactions"
                className="tap w-11 h-11 rounded-full bg-cream-soft flex items-center justify-center text-primary-deep-text"
              >
                <Plus size={18} strokeWidth={2.2} />
              </button>
            )}
          </div>
        )}

        <div
          className={`max-w-[78%] px-3 py-[9px] text-sm leading-[1.4] whitespace-pre-wrap break-words line-clamp-6 ${
            mine
              ? "bg-bubble-sent text-white dark:text-[#0D0B1A] rounded-[16px_16px_4px_16px]"
              : "bg-cream-card text-charcoal rounded-[16px_16px_16px_4px]"
          }`}
        >
          {preview}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="w-60 bg-cream-card rounded-2xl py-1.5 flex flex-col animate-fade-slide-up"
        >
          {safe.map((a) => (
            <button key={a.label} type="button" onClick={a.onSelect} className={`${row} text-charcoal`}>
              {a.label}
              {a.note && <span className="text-xs font-semibold text-charcoal-soft">{a.note}</span>}
            </button>
          ))}
          {danger.length > 0 && <div className="h-px bg-charcoal/[0.08] my-1" />}
          {danger.map((a) => (
            <button key={a.label} type="button" onClick={a.onSelect} className={`${row} text-status-high`}>
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
