import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { hiddenInRecovery, LEVEL_LABEL } from "../../services/achievements";
import { pillColours } from "./achievementStyle";
import { AchievementIcon } from "./AchievementIcon";
import { appLocale } from "../../i18n/format";

// The unlock moment, v6 MO1.1.3.2: a pill at the top of whatever page earned
// it (K1: rendered in Layout, not in Mind).
//
// ONE AT A TIME, IN ORDER (S4). The context holds a queue and this shows its
// front; when one finishes it is dismissed and the next plays.
//
// THE PAGE STAYS USABLE (S6): no backdrop, no dim; only the pill takes
// pointer events. Tap opens that badge's detail (S1), a swipe up dismisses it
// early (S2).
//
// MOTION B (S3, motion-specs.md:140; V6-142 replaces A's dot, logo and coin
// flip): in from the top with a fade, 300 ms cubic-bezier(.22,1,.36,1); it
// holds 4 s while one sheen sweeps; out upward with a fade, 200 ms ease-in.
// Reduce motion: the same timing as an opacity fade only, no sheen.
//
// SHOWN ONCE (S5): today the queue is fed by newly_earned from the same
// my_achievements() call plus an in-memory set (AppContext). Unlocks awarded
// by the 01:15 sweep or on another device get no pill until stage B3
// (user_achievements.notified_at) is on the stack.

const ENTER_MS = 300;
const HOLD_MS = 4000;
const EXIT_MS = 200;
const EASE_OUT = "cubic-bezier(.22,1,.36,1)";
const EASE_IN = "cubic-bezier(.55,0,1,.45)";
/** Start offset: from above the screen's top edge. */
const FROM_Y = -90;

export const AchievementUnlockToast: React.FC = () => {
  const { unlockQueue, dismissUnlock, recoverySensitive, recoveryModePending } = useApp();
  // A FRESH PILL PER QUEUE ENTRY: keyed by its position in the run of pills,
  // so the same badge queued twice (the dev helper) still restarts.
  const [shown, setShown] = useState(0);
  const achievement = unlockQueue[0] ?? null;
  // Recovery-sensitive mode (AJ R8, D20): a streak or logging badge never
  // pops. With the mode on it is dropped from the queue (marked shown, so it
  // does not come back on the next read); while the setting is still being
  // read the pill simply waits, so nothing flashes and nothing is lost.
  const hiddenBadge = !!achievement && hiddenInRecovery(achievement) && (recoverySensitive || recoveryModePending);
  const drop = hiddenBadge && recoverySensitive;
  // Once per queue entry: a re-run of the effect (Strict Mode) must not drop
  // the entry behind it too.
  const dropped = useRef<Unlocked | null>(null);
  useEffect(() => {
    if (!drop || !achievement || dropped.current === achievement) return;
    dropped.current = achievement;
    dismissUnlock();
  }, [drop, achievement, dismissUnlock]);
  if (!achievement || hiddenBadge) return null;
  return (
    <Pill
      key={`${shown}-${achievement.key}`}
      achievement={achievement}
      onDone={() => {
        setShown((n) => n + 1);
        dismissUnlock();
      }}
    />
  );
};

type Unlocked = ReturnType<typeof useApp>["unlockQueue"][number];
type Stage = "before" | "in" | "out";

const Pill: React.FC<{ achievement: Unlocked; onDone: () => void }> = ({ achievement, onDone }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const reduced = useReducedMotion();
  const [stage, setStage] = useState<Stage>("before");
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const timers = useRef<number[]>([]);
  const leaving = useRef(false);
  const dismissRef = useRef(onDone);
  useEffect(() => {
    dismissRef.current = onDone;
  });

  const leave = () => {
    if (leaving.current) return;
    leaving.current = true;
    timers.current.forEach((t) => window.clearTimeout(t));
    setStage("out");
    timers.current = [window.setTimeout(() => dismissRef.current(), EXIT_MS)];
  };
  const leaveRef = useRef(leave);
  useEffect(() => {
    leaveRef.current = leave;
  });

  useEffect(() => {
    // Two frames so the "before" state paints and the entry transitions.
    let raf = window.requestAnimationFrame(() => {
      raf = window.requestAnimationFrame(() => {
        setStage("in");
        timers.current.push(window.setTimeout(() => leaveRef.current(), ENTER_MS + HOLD_MS));
      });
    });
    const list = timers.current;
    return () => {
      window.cancelAnimationFrame(raf);
      list.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  // The sweep: 1.4 s across the pill (A's duration), starting once it is in.
  const sweep = React.useCallback((el: HTMLSpanElement | null) => {
    el?.animate([{ transform: "translateX(0)" }, { transform: "translateX(410px)" }], {
      duration: 1400,
      delay: ENTER_MS,
      easing: "ease-in-out",
      fill: "both",
    });
  }, []);

  const c = pillColours(achievement.level, dark);
  // V6-142: a badge with no level shows no chip.
  const level = achievement.level ? LEVEL_LABEL[achievement.level] : null;

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
    if (!d.moved) {
      // S1: this badge's detail (MO1.1.3.1) over Achievements.
      navigate(`/app/mind/achievements?badge=${encodeURIComponent(achievement.key)}`);
      leave();
    } else if (dragY < -24) {
      leave(); // S2: a swipe up dismisses early
    } else {
      setDragY(0);
    }
  };

  const visible = stage === "in";
  const offset = reduced ? 0 : stage === "in" ? 0 : FROM_Y;
  const timing = stage === "out" ? `${EXIT_MS}ms ${EASE_IN}` : `${ENTER_MS}ms ${EASE_OUT}`;

  return createPortal(
    <div
      className="fixed left-1/2 z-[95] pointer-events-none"
      // #54: 16 under the top (plus the safe area).
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 16px)", transform: "translateX(-50%)" }}
      role="status"
      aria-live="polite"
    >
      <div
        data-stage={stage}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setDragY(0);
        }}
        // #54: 318 × 58 (grows with Larger text, O-2), r9999, white with a
        // 0.5 px border in the level colour at 55% and the shadow in light;
        // #1C1F28, the dark ink at 55%, no shadow in dark.
        className="pointer-events-auto relative overflow-hidden rounded-full border-[0.5px] bg-cream-card cursor-pointer select-none touch-none"
        aria-label={`Achievement unlocked: ${achievement.title}. Open details`}
        style={{
          width: `min(318px, calc(100vw - 32px))`,
          minHeight: 58,
          borderColor: c.border,
          boxShadow: dark ? "none" : "0 10px 28px rgba(36,31,27,0.16)",
          opacity: visible ? 1 : 0,
          transform: `translateY(${offset + dragY}px)`,
          transition: dragging ? "opacity 0ms" : `transform ${timing}, opacity ${timing}`,
        }}
      >
        <span className="flex items-center min-h-[57px] ps-[5px] pe-5 py-[4.5px]">
          {/* #56-#57: the 48 coin, 1 px ring in the level ink, the 40 medallion. */}
          <span
            className="shrink-0 w-12 h-12 rounded-full border flex items-center justify-center bg-cream-card"
            style={{ borderColor: c.ink }}
          >
            <AchievementIcon achievementKey={achievement.key} emoji={achievement.icon} size={40} />
          </span>
          {/* #58-#60: text from 64 in; #61: points 10 after it. */}
          <span className="flex-1 min-w-0 ms-[11px] me-2.5">
            <span className="block text-[9px] leading-[12px] font-extrabold tracking-[1.3px] uppercase" style={{ color: c.ink }}>
              Achievement unlocked
            </span>
            <span className="mt-0.5 flex items-center gap-[7px] min-w-0">
              <span className="text-[15px] leading-[20px] tracking-[-0.1px] font-extrabold text-charcoal truncate">
                {achievement.title}
              </span>
              {level && (
                <span
                  className="shrink-0 text-[10px] leading-[14px] font-bold rounded-full px-[7px] py-px"
                  style={{ color: c.ink, background: c.chip }}
                >
                  {level}
                </span>
              )}
            </span>
          </span>
          <span
            className="shrink-0 text-[16px] leading-[20px] font-extrabold tabular-nums"
            style={{ color: c.ink }}
          >
            {achievement.points > 0 ? `+${achievement.points.toLocaleString(appLocale())}` : "No points"}
          </span>
        </span>

        {/* #55: one sheen while it holds, 81.3 × 96.9, the table's gradient
            (stops after 30% truncated: symmetric, white 0.5 in the middle). */}
        {!reduced && visible && (
          <span aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            <span ref={sweep} className="absolute inset-0">
              <span
                className="absolute top-1/2 w-[81.3px] h-[96.9px] -translate-y-1/2"
                style={{
                  insetInlineStart: -82,
                  background: `linear-gradient(90deg, transparent 0%, ${c.sheen} 30%, ${c.sheenMid} 50%, ${c.sheen} 70%, transparent 100%)`,
                }}
              />
            </span>
          </span>
        )}
      </div>
    </div>,
    document.body
  );
};
