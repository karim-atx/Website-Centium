import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { LEVEL_LABEL } from "../../services/achievements";
import { colourSet, levelHex } from "./achievementStyle";

// The unlock moment, mobile v5.1 MO1.1.3.2: a pill at the top of whatever
// page earned it. It replaces the bottom sheet with its confetti and "Nice".
//
// RENDERED IN Layout, NOT IN Mind. An achievement is earned wherever the thing
// that earned it happened, and the celebration belongs on that screen.
//
// ONE AT A TIME, IN ORDER. The context holds a queue and this shows its front;
// when one finishes it is dismissed and the next plays (never stacked).
//
// THE PAGE STAYS USABLE: no backdrop, no dim; only the pill takes pointer
// events. Tap opens Achievements; a swipe up dismisses it early.
//
// MOTION (A12, about 6 s), entry easing cubic-bezier(.22,1,.36,1):
//   0–600 ms     a dot grows into a circle
//   400–1000     the Centium logo appears in it
//   1000–1300    a 180° coin flip to the achievement's icon
//   1300–1800    the pill widens, staying centred
//   1800–2100    the details fade in
//   2100–5400    it holds, with one light sheen
//   5400–6100    it reverses out (details, width, circle), easing in
// With reduced motion it is a static pill: fades in, holds 4 s, fades out.

const EASE = "cubic-bezier(.22,1,.36,1)";
const EASE_IN = "cubic-bezier(.55,0,1,.45)";
const CIRCLE = 44;
const WIDE = 318;

type Phase = "dot" | "circle" | "logo" | "flip" | "wide" | "details" | "sheen" | "outDetails" | "outWide" | "outCircle" | "gone";

const SCHEDULE: [number, Phase][] = [
  [30, "circle"],
  [400, "logo"],
  [1000, "flip"],
  [1300, "wide"],
  [1800, "details"],
  [2100, "sheen"],
  [5400, "outDetails"],
  [5600, "outWide"],
  [5900, "outCircle"],
  [6100, "gone"],
];
const ORDER: Phase[] = ["dot", "circle", "logo", "flip", "wide", "details", "sheen", "outDetails", "outWide", "outCircle", "gone"];
const at = (p: Phase, q: Phase) => ORDER.indexOf(p) >= ORDER.indexOf(q);

function useReducedMotion(): boolean {
  // Initialised from the query rather than set in an effect, so the first paint
  // is already correct; the listener follows a mid-session change.
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false
  );
  useEffect(() => {
    const query = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!query) return;
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

export const AchievementUnlockToast: React.FC = () => {
  const { unlockQueue, dismissUnlock } = useApp();
  const achievement = unlockQueue[0] ?? null;
  if (!achievement) return null;
  // A FRESH PILL PER BADGE: keyed, so the next one in the queue starts its own
  // run from the dot with fresh state.
  return <Pill key={achievement.key} achievement={achievement} onDone={dismissUnlock} />;
};

type Unlocked = ReturnType<typeof useApp>["unlockQueue"][number];

const Pill: React.FC<{ achievement: Unlocked; onDone: () => void }> = ({ achievement, onDone }) => {
  const navigate = useNavigate();
  const dark = useIsDark();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("dot");
  const [shown, setShown] = useState(false); // reduced motion: faded in
  const [dragY, setDragY] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [flung, setFlung] = useState(false);
  const drag = useRef<{ y: number; moved: boolean } | null>(null);
  const dismissRef = useRef(onDone);
  useEffect(() => {
    dismissRef.current = onDone;
  });

  useEffect(() => {
    const timers: number[] = [];
    if (reduced) {
      timers.push(window.setTimeout(() => setShown(true), 30));
      timers.push(window.setTimeout(() => setShown(false), 4000));
      timers.push(window.setTimeout(() => dismissRef.current(), 4200));
    } else {
      for (const [ms, p] of SCHEDULE) timers.push(window.setTimeout(() => setPhase(p), ms));
      timers.push(window.setTimeout(() => dismissRef.current(), 6150));
    }
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [reduced]);

  const set = colourSet(levelHex(achievement.level), dark);
  const level = achievement.level ? LEVEL_LABEL[achievement.level] : null;

  const finish = () => {
    setFlung(true);
    window.setTimeout(() => dismissRef.current(), 200);
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
    if (!d.moved) {
      // Tapping opens the Achievements page.
      navigate("/app/mind/achievements");
      finish();
    } else if (dragY < -24) {
      finish(); // swipe up dismisses early
    } else {
      setDragY(0);
    }
  };

  // Geometry for the current phase.
  const wide = reduced ? true : at(phase, "wide") && !at(phase, "outWide");
  const scale = reduced ? 1 : at(phase, "circle") && !at(phase, "outCircle") ? 1 : 0;
  const flipped = reduced || (at(phase, "flip") && !at(phase, "outWide"));
  const showLogo = !reduced && at(phase, "logo");
  const details = reduced ? true : at(phase, "details") && !at(phase, "outDetails");
  const leaving = at(phase, "outDetails");

  return createPortal(
    <div
      className="fixed left-1/2 z-[95] pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 17px)", transform: "translateX(-50%)" }}
      role="status"
      aria-live="polite"
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          drag.current = null;
          setDragging(false);
          setDragY(0);
        }}
        className="pointer-events-auto relative overflow-hidden rounded-full border cursor-pointer select-none touch-none"
        aria-label={`Achievement unlocked: ${achievement.title}. Open achievements`}
        style={{
          width: wide ? `min(${WIDE}px, calc(100vw - 32px))` : CIRCLE,
          height: CIRCLE + 14,
          marginLeft: "auto",
          marginRight: "auto",
          background: "rgb(var(--c-cream-card))",
          borderColor: set.border.length === 9 ? `${set.border.slice(0, 7)}8C` : set.border, // 55%
          boxShadow: "0 10px 28px rgba(36,31,27,0.16)",
          opacity: reduced ? (shown && !flung ? 1 : 0) : flung ? 0 : 1,
          transform: `translateY(${flung ? -80 : dragY}px) scale(${scale})`,
          transition: reduced
            ? "opacity 200ms ease"
            : [
                `width ${leaving ? `300ms ${EASE_IN}` : `500ms ${EASE}`}`,
                `transform ${dragging ? "0ms" : leaving ? `200ms ${EASE_IN}` : `600ms ${EASE}`}`,
                "opacity 200ms ease",
              ].join(", "),
        }}
      >
        {/* The circle: logo on the front, the badge's icon on the back. */}
        <span
          className="absolute top-[7px] left-[7px] w-11 h-11"
          style={{ perspective: 400 }}
        >
          <span
            className="relative block w-full h-full"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateY(${flipped ? 180 : 0}deg)`,
              transition: reduced ? "none" : `transform 300ms ${EASE}`,
            }}
          >
            <span
              className="absolute inset-0 rounded-full flex items-center justify-center bg-cream-card"
              style={{ backfaceVisibility: "hidden", opacity: showLogo ? 1 : 0, transition: "opacity 300ms ease" }}
            >
              <img src="/centium-logo-c.png" alt="" className="w-6 h-auto" />
            </span>
            <span
              className="absolute inset-0 rounded-full flex items-center justify-center text-[22px] leading-none"
              style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: set.track }}
            >
              {achievement.icon}
            </span>
          </span>
        </span>

        {/* The details. */}
        <span
          className="absolute inset-y-0 left-[60px] right-4 flex items-center gap-3"
          style={{ opacity: details ? 1 : 0, transition: "opacity 300ms ease" }}
        >
          <span className="flex-1 min-w-0">
            <span className="block text-[9px] font-extrabold tracking-[.16em] uppercase" style={{ color: set.ink }}>
              Achievement unlocked
            </span>
            <span className="mt-0.5 flex items-center gap-1.5 min-w-0">
              <span className="text-[15px] font-extrabold text-charcoal truncate">{achievement.title}</span>
              {level && (
                <span
                  className="shrink-0 text-[10px] font-bold rounded-full px-1.5 py-[1px]"
                  style={{ color: set.ink, background: set.track }}
                >
                  {level}
                </span>
              )}
            </span>
          </span>
          {/* An explorer badge is worth zero and says nothing rather than "+0". */}
          {achievement.points > 0 && (
            <span className="shrink-0 text-[16px] font-extrabold tabular-nums" style={{ color: set.ink }}>
              +{achievement.points.toLocaleString()}
            </span>
          )}
        </span>

        {/* One light sheen while it holds. */}
        {!reduced && at(phase, "sheen") && !leaving && (
          <span aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            <span className="absolute inset-y-0 -left-1/3 w-1/3 animate-unlock-sheen bg-gradient-to-r from-transparent via-white/50 dark:via-white/10 to-transparent" />
          </span>
        )}
      </div>
    </div>,
    document.body
  );
};
