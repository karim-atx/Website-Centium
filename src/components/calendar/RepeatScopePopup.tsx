import React, { useEffect, useRef } from "react";
import { CentredPopup } from "../ui/CentredPopup";

/**
 * OURS · which occurrences a change to a repeating event applies to (MO1.6
 * B5, PB-O-64; Database B3: "this one" = calendar_event_exceptions, "this
 * and following" = calendar_events.repeat_until, "all" = the series row).
 * Not drawn: built on the shared centred popup in our own geometry (X-01
 * "ours": 342, r22, pad 20; scrim rgba(36,31,27,0.4), no blur),
 * start-aligned title 17 / 25.5 800 ls -0.3 and a 12.5 / 18.8 line, then
 * three equal 48 r14 outlined choices (0.5 ink@14%, 14 / 21 700; danger ink
 * #C0392B / #F09A8E when deleting), gap 8, and a 44 Cancel text action.
 * Focus starts on Cancel; Escape, Back and the scrim cancel, except while busy.
 */
export type RepeatScope = "one" | "following" | "all";

export const RepeatScopePopup: React.FC<{
  mode: "save" | "delete" | null;
  busy: boolean;
  onCancel: () => void;
  onChoose: (scope: RepeatScope) => void;
}> = ({ mode, busy, onCancel, onChoose }) => {
  const cancelRef = useRef<HTMLButtonElement | null>(null);
  const open = !!mode;
  useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => cancelRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
  }, [open]);

  const del = mode === "delete";
  const choices: { scope: RepeatScope; label: string }[] = del
    ? [
        { scope: "one", label: "Delete this event only" },
        { scope: "following", label: "Delete this and following" },
        { scope: "all", label: "Delete all events" },
      ]
    : [
        { scope: "one", label: "This event only" },
        { scope: "following", label: "This and following events" },
        { scope: "all", label: "All events" },
      ];

  return (
    <CentredPopup
      open={open}
      onClose={() => {
        if (!busy) onCancel();
      }}
      title={del ? "Delete a repeating event" : "Change a repeating event"}
      geometry="ours"
      align="start"
      describeBody
      scrimBlur={false}
      titleClass="text-[17px] leading-[25.5px] tracking-[-0.3px]"
      className="!p-5 dark:!shadow-none"
      body={
        <span className="block text-[12.5px] leading-[18.8px] font-normal">
          {del ? "Which events do you want to delete?" : "Which events should these changes apply to?"}
        </span>
      }
    >
      <div className="flex flex-col gap-2" role="group" aria-label={del ? "Delete which events" : "Apply changes to"}>
        {choices.map((c) => (
          <button
            key={c.scope}
            type="button"
            disabled={busy}
            onClick={() => onChoose(c.scope)}
            className="tap w-full min-h-[calc(48px+var(--text-boost,0px))] rounded-[14px] px-3 text-[14px] leading-[21px] font-bold bg-cream-card border-[0.5px] border-charcoal/[0.14] disabled:opacity-60"
            style={{ color: del ? "rgb(var(--c-status-high))" : "rgb(var(--c-charcoal))" }}
          >
            {c.label}
          </button>
        ))}
        <button
          ref={cancelRef}
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="tap w-full min-h-11 text-[14px] leading-[21px] font-bold text-charcoal-soft disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </CentredPopup>
  );
};
