import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useApp } from "../../context/AppContext";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { neutralPushText, onPushReceived, openPushLink } from "../../platform/push";
import { bannerFromPush, enqueueBanner, type PushBannerCard } from "../../platform/pushBannerModel";
import { fxHaptic } from "../../platform/haptics";
import { CentiumMark } from "../icons/CentiumMark";
import { t } from "../../i18n/core";

// A push that arrives while Centium is open (follow-up to Round J's J2, #86;
// pushBannerModel.ts says which pushes and why). The phone app only; rendered
// inside the router, beside NativeOpenPath.
//
// THE MESSAGE POP-UP'S ANATOMY (MessagePopupToast): a card at the top, the
// page stays usable, one at a time in order. Tap opens the push's link as a
// tap on its notification would (openPushLink: NativeOpenPath's rules), a
// swipe up or Escape dismisses. In from the top with a fade, 300 ms; holds
// 4 s (6 s while the pointer is over it); out upward, 200 ms. Reduce motion:
// the same timing as a fade only.
//
// RECOVERY-SENSITIVE MODE: the text is the neutral line "Hide details on lock
// screen" gives the push's family, never the push's own; while the setting is
// still being read the banner waits, so nothing detailed flashes. With
// "Hide details on lock screen" on, the push's own text already is that line.
//
// FX: a Light tap as the card shows (in Pill, so a card that never shows never
// buzzes), once per push; the same push again replaces its card in place.

const ENTER_MS = 300;
const HOLD_MS = 4000;
const HOVER_HOLD_MS = 6000;
const EXIT_MS = 200;
const EASE_OUT = "cubic-bezier(.22,1,.36,1)";
const EASE_IN = "cubic-bezier(.55,0,1,.45)";
const FROM_Y = -90;

type Text = { key: string; title: string; line: string };

export const PushBanner: React.FC = () => {
  const { authUserId, profileReady, user, recoverySensitive, recoveryModePending } = useApp();
  const ready = !!authUserId && profileReady && !!user.onboarded;
  const [queue, setQueue] = useState<PushBannerCard[]>([]);
  const [neutral, setNeutral] = useState<Text | null>(null);
  const readyRef = useRef(ready);
  const seq = useRef(0);
  useEffect(() => {
    readyRef.current = ready;
  });

  useEffect(
    () =>
      onPushReceived((push) => {
        // Signed out or not onboarded yet: nothing to open it into.
        if (!readyRef.current) return;
        const card = bannerFromPush(push, ++seq.current);
        if (card) setQueue((q) => enqueueBanner(q, card));
      }),
    []
  );

  const current = ready ? (queue[0] ?? null) : null;

  useEffect(() => {
    if (!current || !recoverySensitive || recoveryModePending) return;
    let alive = true;
    void neutralPushText(current.notificationId)
      .catch(() => null)
      .then((n) => {
      if (alive) setNeutral({ key: current.key, ...(n ?? { title: "Centium", line: t("You have a new notification") }) });
    });
    return () => {
      alive = false;
    };
  }, [current, recoverySensitive, recoveryModePending]);

  if (!current || recoveryModePending) return null;
  const text: Text | null = recoverySensitive ? (neutral?.key === current.key ? neutral : null) : current;
  if (!text) return null;
  return (
    <Pill
      key={current.key}
      hapticKey={`push:${current.key}`}
      text={text}
      onOpen={() => openPushLink(current.path)}
      onDone={() => setQueue((q) => q.filter((c) => c.key !== current.key))}
    />
  );
};

type Stage = "before" | "in" | "out";

const Pill: React.FC<{ text: Text; hapticKey: string; onOpen: () => void; onDone: () => void }> = ({ text, hapticKey, onOpen, onDone }) => {
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<Stage>("before");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [hover, setHover] = useState(false);
  // Round K · ET: while it has keyboard or screen-reader focus it stays (no time limit); Escape still dismisses.
  const [focused, setFocused] = useState(false);
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

  // FX: the tap, as it shows.
  useEffect(() => {
    fxHaptic("banner", { key: hapticKey });
  }, [hapticKey]);

  useEffect(() => {
    let raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(() => setStage("in"));
    });
    return () => {
      window.cancelAnimationFrame(raf);
      if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    };
  }, []);

  // The hold: restarted when the same push comes again (its text) and by the
  // pointer leaving; longer while it is over the card.
  useEffect(() => {
    if (stage !== "in" || dragging || focused) return;
    const id = window.setTimeout(leave, (hover ? HOVER_HOLD_MS : HOLD_MS) + ENTER_MS);
    return () => window.clearTimeout(id);
  }, [stage, hover, dragging, focused, text, leave]);

  const open = () => {
    onOpen();
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

  return createPortal(
    <div
      className="fixed inset-x-0 z-[93] flex justify-center px-3 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      role="status"
      aria-live="polite"
    >
      <div
        data-push-banner=""
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
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
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
        aria-label={t("Notification: {title}. {line}. Open", { title: text.title, line: text.line.replace(/[.!?؟]+$/u, "") })}
        className="pointer-events-auto w-full flex items-center gap-2.5 rounded-2xl bg-cream-card shadow-popup border-[0.5px] border-charcoal/[0.08] px-3 py-2.5 cursor-pointer select-none touch-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary-dark"
        style={{
          maxWidth: 420,
          opacity: visible ? 1 : 0,
          transform: `translateY(${offset + dragY}px)`,
          transition: dragging ? "opacity 0ms" : `transform ${timing}, opacity ${timing}`,
        }}
      >
        <span aria-hidden className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center bg-primary-pale">
          <CentiumMark height={18} framing="ink" />
        </span>
        <span className="flex-1 min-w-0">
          <span className="block text-[13px] leading-[18px] font-bold text-charcoal truncate">{text.title}</span>
          {text.line && <span className="block text-[12.5px] leading-[17px] font-medium text-charcoal-soft line-clamp-2">{text.line}</span>}
        </span>
        <span className="shrink-0 self-start mt-px text-[11px] leading-[16px] text-charcoal-faint">{t("now")}</span>
      </div>
    </div>,
    document.body
  );
};
