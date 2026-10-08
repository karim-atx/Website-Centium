import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import type { MessageThread } from "../../services/messaging";

/**
 * OURS · MO1.7 "Delete this conversation?" (design-handover frame-check
 * OURS-MO1.7-delete-confirm.md; V6-75). Delete for me: the reader's own
 * mark, nothing deleted on the server, and the conversation comes back with
 * only newer messages. No Undo (the confirm is the safeguard).
 *
 * Built on the shared centred popup in our own geometry (X-01 "ours": 342
 * wide, r22, pad 20; scrim rgba(36,31,27,0.4) in both modes per X-07, no
 * blur; shadow in light, none in dark), start-aligned: title 17 / 25.5 800
 * ls -0.3, the line 12.5 / 18.8 400 6 below, then two equal 48 r14 buttons
 * 16 below, gap 8: Cancel (outline 0.5 ink@14%) and Delete (#C0392B with
 * white / #F09A8E with #0D0B1A). Focus starts on Cancel; Escape, Back and
 * the scrim cancel, except while busy.
 */
function deleteLine(t: MessageThread): string {
  const lead = "It's removed from your Messages, with its history.";
  if (t.kind === "official_support")
    return "It's removed from your Messages. Centium keeps its copy. A new message from Centium brings it back.";
  if (t.kind === "group") return `${lead} Other members still have it. You stay in the group, so new messages bring it back.`;
  if (t.venue?.memberSide) return `${lead} ${t.venue.name} still has it. A new message from them brings it back.`;
  return `${lead} ${t.participantName} still has it. If they message you again, it comes back with only the new messages.`;
}

export const DeleteConversationConfirm: React.FC<{
  thread: MessageThread | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ thread, busy, onCancel, onConfirm }) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const open = !!thread;
  useEffect(() => {
    if (!open) return;
    // The popup focuses its card on open; the safe choice takes it next.
    const id = requestAnimationFrame(() => cancelRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const cancel = () => {
    if (!busy) onCancel();
  };

  return (
    <CentredPopup
      open={open}
      onClose={cancel}
      title="Delete this conversation?"
      geometry="ours"
      align="start"
      alert
      describeBody
      scrimBlur={false}
      titleClass="text-[17px] leading-[25.5px] tracking-[-0.3px]"
      className="!p-5 dark:!shadow-none"
      body={
        thread ? (
          <span data-delete-line="" className="block text-[12.5px] leading-[18.8px] font-normal">
            {deleteLine(thread)}
          </span>
        ) : null
      }
    >
      <div className="grid grid-cols-2 gap-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={cancel}
          disabled={busy}
          className="tap min-w-0 h-[calc(48px+var(--text-boost,0px))] rounded-[14px] text-[14px] leading-[21px] font-bold px-2.5 bg-cream-card text-charcoal-soft border-[0.5px] border-charcoal/[0.14] disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            if (!busy) onConfirm();
          }}
          aria-busy={busy || undefined}
          disabled={busy}
          className="tap min-w-0 h-[calc(48px+var(--text-boost,0px))] rounded-[14px] text-[14px] leading-[21px] font-bold px-2.5 flex items-center justify-center"
          style={{ background: "rgb(var(--c-status-high))", color: "rgb(var(--c-on-destructive))" }}
        >
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden />
              <span className="sr-only">Deleting…</span>
            </>
          ) : (
            "Delete"
          )}
        </button>
      </div>
    </CentredPopup>
  );
};
