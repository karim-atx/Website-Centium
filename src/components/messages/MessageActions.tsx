import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Flag, Forward, Info, Pencil, Pin, PinOff, Plus, Reply, Star, StarOff, Trash2, type LucideIcon } from "lucide-react";
import { MORE_REACTIONS, QUICK_REACTIONS } from "../../services/messaging/chatFeatures";

export interface MessageAction {
  label: string;
  onSelect: () => void;
  /** Delete and report read as cautions, below a divider. */
  danger?: boolean;
  /** Right-aligned note, e.g. how long an edit window has left. */
  note?: string;
}

/** MO1.2.1.3.3 draws an icon on every action; matched on the label's first word. */
const ACTION_ICONS: Record<string, LucideIcon> = {
  Reply,
  Forward,
  Star,
  Unstar: StarOff,
  Copy,
  Pin,
  Unpin: PinOff,
  Edit: Pencil,
  Info,
  Report: Flag,
  Delete: Trash2,
};
const iconFor = (label: string) => ACTION_ICONS[label.split(" ")[0]];

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
  // MO1.2.1.3.3: the app's dropdown rows (radius 8, option border, raised
  // fill, 12.5/500) with an icon, 44 tall for the tap target.
  const row =
    "tap w-full h-11 px-3 flex items-center gap-2.5 text-left text-[12.5px] font-medium rounded-lg border border-border-option bg-surface-raised";
  const icon = (label: string) => {
    const I = iconFor(label);
    return I ? <I size={15} strokeWidth={1.75} className="shrink-0" aria-hidden /> : null;
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Message actions"
      onClick={onClose}
      className="fixed inset-0 z-[70] overflow-y-auto"
      style={{ background: "rgb(var(--th-3a3547) / 0.92)" }}
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
              ? "bg-bubble-sent text-white dark:text-[#0D0B1A] rounded-[20px_20px_4px_20px]"
              : "bg-cream-card text-charcoal rounded-[20px_20px_20px_4px]"
          }`}
        >
          {preview}
        </div>

        <div
          onClick={(e) => e.stopPropagation()}
          className="w-[212px] bg-cream-card rounded-[14px] p-2 flex flex-col gap-1.5 animate-fade-slide-up"
          style={{ border: "1px solid rgb(var(--th-aea1dc) / 0.5)", boxShadow: "0 12px 32px rgb(var(--th-5f5093) / 0.18)" }}
        >
          {safe.map((a) => (
            <button key={a.label} type="button" onClick={a.onSelect} className={`${row} text-charcoal`}>
              {icon(a.label)}
              <span className="flex-1 min-w-0">{a.label}</span>
              {a.note && <span className="text-[11px] font-semibold text-charcoal-soft">{a.note}</span>}
            </button>
          ))}
          {danger.length > 0 && <div className="h-px bg-charcoal/[0.08] my-0.5" />}
          {danger.map((a) => (
            <button key={a.label} type="button" onClick={a.onSelect} className={`${row} text-status-high`}>
              {icon(a.label)}
              <span className="flex-1 min-w-0">{a.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body
  );
};
