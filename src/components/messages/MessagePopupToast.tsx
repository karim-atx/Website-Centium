import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Megaphone } from "lucide-react";
import { useMessagePopup } from "../../context/UnreadContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import type { PopupCard } from "../../services/messaging/popupModel";
import { t } from "../../i18n/core";

// AX, the in-app message pop-up (Round C Release 1; PLAN S5, undrawn, in the
// AchievementUnlockToast anatomy). A pill at the top for a new chat or
// support message while the person is elsewhere in the app.
//
// ONE AT A TIME, GROUPED PER THREAD. The queue lives in UnreadProvider; a
// second message in the showing thread turns its line into "2 new messages"
// and restarts the hold.
//
// THE PAGE STAYS USABLE: no backdrop, only the pill takes pointer events, and
// it never takes focus. Tap opens the thread, a swipe up dismisses.
//
// MOTION as the unlock pill: in from the top with a fade, 300 ms
// cubic-bezier(.22,1,.36,1); holds 4 s (6 s while the pointer is over it);
// out upward, 200 ms. Reduce motion: the same timing as a fade only.

const ENTER_MS = 300;
const HOLD_MS = 4000;
const HOVER_HOLD_MS = 6000;
const EXIT_MS = 200;
const EASE_OUT = "cubic-bezier(.22,1,.36,1)";
const EASE_IN = "cubic-bezier(.55,0,1,.45)";
const FROM_Y = -90;

export const MessagePopupToast: React.FC = () => {
  const { current, dismiss } = useMessagePopup();
  if (!current) return null;
  // A fresh pill per thread; the same thread's next arrival restarts the hold
  // inside it (stamp), without replaying the entry.
  return <Pill key={current.threadId} card={current} onDone={dismiss} />;
};

type Stage = "before" | "in" | "out";

const Pill: React.FC<{ card: PopupCard; onDone: () => void }> = ({ card, onDone }) => {
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<Stage>("before");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const exitTimer = useRef<number | null>(null);
  const leaving = useRef(false);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const leave = React.useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    setStage("out");
    exitTimer.current = window.setTimeout(() => doneRef.current(), EXIT_MS);
  }, []);

  useEffect(() => {
    let raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(() => setStage("in"));
    });
    return () => {
      window.cancelAnimationFrame(raf);
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  // The hold: restarted by every arrival in this thread (stamp) and by the
  // pointer leaving; longer while it is over the pill.
  useEffect(() => {
    if (stage !== "in" || dragging) return;
    const t = window.setTimeout(leave, (hover ? HOVER_HOLD_MS : HOLD_MS) + (card.count === 1 ? ENTER_MS : 0));
    return () => window.clearTimeout(t);
  }, [stage, hover, dragging, card.stamp, card.count, leave]);

  const open = () => {
    navigate("/app/messages", { state: { threadId: card.threadId } });
    leave();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, moved: false };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dy = e.clientY - drag.current.y;
    if (Math.abs(dy) > 4) drag.current.moved = true;
    setDragY(Math.min(0, dy));
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d) return;
    if (!d.moved) open();
    else if (dragY < -24) leave();
    else setDragY(0);
  };

  const visible = stage === "in";
  const offset = reduced ? 0 : visible ? 0 : FROM_Y;
  const timing = stage === "out" ? `${EXIT_MS}ms ${EASE_IN}` : `${ENTER_MS}ms ${EASE_OUT}`;
  const initial = card.title.trim().charAt(0).toUpperCase() || "?";

  return createPortal(
    <div
      className="fixed inset-x-0 z-[94] flex justify-center px-3 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      role="status"
      aria-live="polite"
    >
      <div
        data-message-popup=""
        data-stage={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setDragY(0);
        }}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
          } else if (e.key === "Escape") leave();
        }}
        // A button for keyboards and screen readers, reachable with Tab but
        // never focused on its own.
        role="button"
        tabIndex={0}
        aria-label={t("New message from {name}: {line}. Open conversation", { name: card.title, line: card.line })}
        className="pointer-events-auto w-full flex items-center gap-2.5 rounded-2xl bg-cream-card shadow-popup border-[0.5px] border-charcoal/[0.08] px-3 py-2.5 cursor-pointer select-none touch-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
        style={{
          maxWidth: 420,
          opacity: visible ? 1 : 0,
          transform: `translateY(${offset + dragY}px)`,
          transition: dragging ? "opacity 0ms" : `transform ${timing}, opacity ${timing}`,
        }}
      >
        {card.isSupport ? (
          <span aria-hidden className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-teal/20 text-teal">
            <Megaphone size={16} />
          </span>
        ) : (
          <span aria-hidden className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-primary-pale text-primary-dark text-[13px] font-bold">
            {initial}
          </span>
        )}
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] leading-[18px] font-bold text-charcoal truncate">{card.title}</span>
          <span className="block text-[12.5px] leading-[17px] font-medium text-charcoal-soft truncate">{card.line}</span>
        </span>
        <span className="shrink-0 self-start mt-px text-[11px] leading-[16px] text-charcoal-faint">{t("now")}</span>
      </div>
    </div>,
    document.body
  );
};
