import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { LEVEL_LABEL } from "../../services/achievements";
import { colourSet, levelHex } from "./achievementStyle";
import { ThemedC } from "../ui/ThemedMark";
import { tintOn } from "../../data/folderColors";

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
// MOTION, the board's motion strip (frames/MO1.1.3.2__board.png). Every entry
// step eases out on cubic-bezier(.22,1,.36,1); t0 is the first frame after the
// dot has painted.
//   0–600 ms     a 12 pt dot in the level colour grows into the 58 pt circle
//   400–1000     the Centium logo (in its 48 pt ringed coin) appears in it
//   1000–1300    a 180° rotateY coin flip to the achievement's icon
//   1300–1800    the pill widens right to 318, the whole unit staying centred
//   1800–2100    the details fade in
//   2100–6000    it holds; one light sheen sweeps (2100–3500)
//   6000–7000    "same steps in reverse with ease-in": details out (200),
//                retract (300), flip back (300), shrink to the dot (200)
// The board gives the reverse no durations ("Exit"); those four are the
// app's own. With reduced motion (Foundations 2.6: 0 ms cross-fades, no flip
// and no sheen) the full pill appears at once, holds 4 s, and goes at once.

const EASE = "cubic-bezier(.22,1,.36,1)";
const EASE_IN = "cubic-bezier(.55,0,1,.45)";
/** The collapsed circle: the pill's own height. */
const CIRCLE = 58;
const WIDE = 318;
/** The dot it grows from: 12 pt on the motion strip. */
const DOT_SCALE = 12 / 58;
/** Reduced motion: how long the static pill stays (the board's "about 4 s"). */
const REDUCED_HOLD = 4000;
const END = 7000;

type Phase = "dot" | "circle" | "logo" | "flip" | "wide" | "details" | "sheen" | "outDetails" | "outWide" | "outFlip" | "outCircle";

const SCHEDULE: [number, Phase][] = [
  [0, "circle"],
  [400, "logo"],
  [1000, "flip"],
  [1300, "wide"],
  [1800, "details"],
  [2100, "sheen"],
  [6000, "outDetails"],
  [6200, "outWide"],
  [6500, "outFlip"],
  [6800, "outCircle"],
];
const ORDER: Phase[] = ["dot", "circle", "logo", "flip", "wide", "details", "sheen", "outDetails", "outWide", "outFlip", "outCircle"];
const at = (p: Phase, q: Phase) => ORDER.indexOf(p) >= ORDER.indexOf(q);

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
  const { colorTheme } = useApp();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>("dot");
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
    let raf = 0;
    if (reduced) {
      timers.push(window.setTimeout(() => dismissRef.current(), REDUCED_HOLD));
    } else {
      // The clock starts once the dot is on screen (two frames), so the
      // growth runs from t0 rather than from an unpainted mount.
      raf = window.requestAnimationFrame(() => {
        raf = window.requestAnimationFrame(() => {
          for (const [ms, p] of SCHEDULE) timers.push(window.setTimeout(() => setPhase(p), ms));
          timers.push(window.setTimeout(() => dismissRef.current(), END));
        });
      });
    }
    return () => {
      window.cancelAnimationFrame(raf);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [reduced]);

  const set = colourSet(levelHex(achievement.level), dark);
  // The chip and the coin's back face: #F3EDE9 on the 2x frame, the level's
  // colour at 12% on the white pill (the hero's track is a deeper mix).
  const tint = dark ? set.track : tintOn(levelHex(achievement.level), 0.12, "#FFFFFF");
  // A one-off has no level; MO1.1.3.2 still draws the chip, so it reads as
  // the first rung, Bronze (matching levelHex's fallback colour).
  const level = LEVEL_LABEL[achievement.level ?? "bronze"];
  // The dot it grows from: the motion strip's #B38E77 on its #F5F4F8 card,
  // i.e. the level colour at 74%.
  const dotFill = `${set.ink}BD`;
  // The sheen: on the 2x frame its stripes peak at the level colour at 7% on
  // the white pill. Dark is not drawn; there it stays a faint white.
  const sheen = dark ? "rgba(255,255,255,0.10)" : `${levelHex(achievement.level)}12`;

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
  const grown = reduced || (at(phase, "circle") && !at(phase, "outCircle"));
  const wide = reduced || (at(phase, "wide") && !at(phase, "outWide"));
  const flipped = reduced || (at(phase, "flip") && !at(phase, "outFlip"));
  const showLogo = !reduced && at(phase, "logo") && !at(phase, "outCircle");
  const details = reduced || (at(phase, "details") && !at(phase, "outDetails"));
  const leaving = !reduced && at(phase, "outDetails");
  // Entry steps ease out; the reverse eases in.
  const step = (enterMs: number, exitMs: number) => (leaving ? `${exitMs}ms ${EASE_IN}` : `${enterMs}ms ${EASE}`);

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
          height: CIRCLE,
          marginLeft: "auto",
          marginRight: "auto",
          background: grown ? "rgb(var(--c-cream-card))" : dotFill,
          borderColor: set.border.length === 9 ? `${set.border.slice(0, 7)}8C` : set.border, // 55%
          boxShadow: "0 10px 28px rgba(36,31,27,0.16)",
          opacity: flung ? 0 : 1,
          transform: `translateY(${flung ? -80 : dragY}px) scale(${grown ? 1 : DOT_SCALE})`,
          transition: reduced
            ? "none"
            : [
                `width ${step(500, 300)}`,
                `transform ${dragging ? "0ms" : step(600, 200)}`,
                `background-color ${step(600, 200)}`,
                "opacity 200ms ease",
              ].join(", "),
        }}
      >
        {/* The coin: 48 pt with a 1 pt ring in the level colour (2x frame),
            centred in the circle; logo on the front, the icon on the back. */}
        <span className="absolute top-1 left-1 w-12 h-12" style={{ perspective: 400 }}>
          <span
            className="relative block w-full h-full"
            style={{
              transformStyle: "preserve-3d",
              transform: `rotateY(${flipped ? 180 : 0}deg)`,
              transition: reduced ? "none" : `transform ${step(300, 300)}`,
            }}
          >
            <span
              className="absolute inset-0 rounded-full border flex items-center justify-center bg-cream-card"
              style={{
                borderColor: set.ink,
                backfaceVisibility: "hidden",
                opacity: showLogo ? 1 : 0,
                transition: reduced ? "none" : `opacity ${step(600, 200)}`,
              }}
            >
              {colorTheme === "centium" ? (
                <img src="/centium-logo-c.png" alt="" className="w-6 h-auto" />
              ) : (
                <ThemedC width={24} height={(24 * 701) / 648} />
              )}
            </span>
            <span
              className="absolute inset-0 rounded-full border flex items-center justify-center bg-cream-card"
              style={{ borderColor: set.ink, backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
            >
              {/* The 39 pt medallion inside the ring. */}
              <span
                className="w-[39px] h-[39px] rounded-full flex items-center justify-center text-[22px] leading-none"
                style={{ background: tint }}
              >
                {achievement.icon}
              </span>
            </span>
          </span>
        </span>

        {/* The details: text from 65 pt, the points ending 21 pt in (2x frame). */}
        <span
          className="absolute inset-y-0 left-[64px] right-5 flex items-center gap-3"
          style={{ opacity: details ? 1 : 0, transition: reduced ? "none" : `opacity ${step(300, 200)}` }}
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
                  style={{ color: set.ink, background: tint }}
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

        {/* One light sheen while it holds, as on the mid-sheen 2x frame: two
            stripes leaning forward 20.6° (18 pt and 19 pt wide, 4 pt apart,
            41 pt in all), each peaking off-centre. It starts just off the
            left edge and leaves past the right one. */}
        {!reduced && at(phase, "sheen") && !leaving && (
          <span aria-hidden className="absolute inset-0 pointer-events-none overflow-hidden rounded-full">
            <span className="absolute inset-0 animate-unlock-sheen">
              <span
                className="absolute inset-y-0 w-[41px]"
                style={{
                  left: -56,
                  transform: "skewX(-20.6deg)",
                  background: `linear-gradient(90deg, transparent 0%, ${sheen} 27%, transparent 44%, transparent 54%, ${sheen} 72%, transparent 100%)`,
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
