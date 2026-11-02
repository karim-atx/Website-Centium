import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, CircleCheck } from "lucide-react";
import type { HabitItem } from "../../../types";
import { useApp } from "../../../context/AppContext";
import { habitIcon } from "../../../utils/icons";
import { useHabitColours, type HabitColourKey } from "./data";
import { FadeValue, HeaderPill, HomeCard, HomeKeyframes, homeColors, Line, linePx, textPx, useHomeMode, useLoadingTimeout } from "./kit";
import { inlineScrolled } from "../../../utils/inlineScroll";
import { t } from "../../../i18n/core";

// HO1.W8 Habits (small), OURS-home-large-widgets §B (large) and
// OURS-home-habits-empty. The purple follows the theme primary (th-/thi-);
// High contrast: primary fills #5B48B8 (Centium light, as the HE1 strip).
// V6-141 (D21): every segment #9A8CD6 until habits carry a colour
// (habit_items.colour_key, PB-HO-08, Mind owner): BACKEND.

const isDone = (h: HabitItem, day: string, today: string) => (day === today ? h.done : !!h.doneDates?.includes(day));

/**
 * B3 habit_items.colour: the segment in the habit's own colour (MO1.1.1).
 * Lavender is the drawn #9A8CD6 (theme purple; dark #A991FE; HC #5B48B8).
 * The other four are not drawn: mind-backend §1 says take them from the repo
 * folder palette, so each is that family's header shade (data/folderColors:
 * Teal #8ABFB5, Gold #BB8B32, Berry #C082A6 for rose, Blue #5E99D4 for sky).
 */
function segmentFill(colour: HabitColourKey | undefined, dark: boolean, hc: boolean): string {
  switch (colour) {
    case "teal":
      return "#8ABFB5";
    case "gold":
      return "#BB8B32";
    case "rose":
      return "#C082A6";
    case "sky":
      return "#5E99D4";
    default:
      return hc && !dark ? "#5B48B8" : dark ? "rgb(var(--th-a991fe))" : "rgb(var(--th-9a8cd6))";
  }
}

/** HO1.W8 #6: one segment per habit, h 6, gap 4, r9999; done in the habit colour, not done #FFFFFF (dark @8%*). */
const Segments: React.FC<{ done: boolean[]; colours: (HabitColourKey | undefined)[]; width: number | string; dark: boolean; hc: boolean }> = ({ done, colours, width, dark, hc }) => {
  return (
    <span className="flex" style={{ gap: 4, width, height: 6 }} aria-hidden>
      {done.map((d, i) => (
        <span
          key={i}
          className="block flex-1 rounded-full"
          style={{ background: d ? segmentFill(colours[i], dark, hc) : dark ? "rgba(255,255,255,0.08)" : "#FFFFFF", transition: "background-color 300ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      ))}
    </span>
  );
};

/**
 * OURS §B #8-#9: the kept habit grid (main's HabitPages, deleted on the branch; restyled): 200 x 88 at
 * 142, 47, two columns, six to a page, gap 6 x 5, swipe between pages, page
 * dots 4 x 4 gap 3 under the grid.
 */
const HabitGrid: React.FC<{ habits: HabitItem[]; day: string; today: string; dark: boolean; hc: boolean }> = ({ habits, day, today, dark, hc }) => {
  const pages: HabitItem[][] = [];
  for (let i = 0; i < habits.length; i += 6) pages.push(habits.slice(i, i + 6));
  const [page, setPage] = useState(0);
  const deep = dark ? "rgb(var(--thi-c3b3fb))" : hc ? "#4B3BA0" : "rgb(var(--thi-5f5093))";
  const fillDone = dark ? "rgb(var(--th-a991fe) / 0.14)" : "rgb(var(--th-9a8cd6) / 0.14)";
  return (
    <span className="block relative z-[1]" style={{ width: 200 }}>
      <span
        className="flex no-scrollbar"
        style={{ overflowX: "auto", scrollSnapType: "x mandatory", height: 88 }}
        onScroll={(e) => setPage(Math.round(inlineScrolled(e.currentTarget) / Math.max(1, e.currentTarget.clientWidth)))}
        onClick={(e) => e.stopPropagation()}
      >
        {pages.map((items, p) => (
          <span
            key={p}
            className="grid shrink-0 content-start"
            aria-label={pages.length > 1 ? t("Habits page {page} of {pages}", { page: p + 1, pages: pages.length }) : undefined}
            style={{ width: 200, gridTemplateColumns: "1fr 1fr", columnGap: 6, rowGap: 5, scrollSnapAlign: "start" }}
          >
            {items.map((h) => {
              const done = isDone(h, day, today);
              const Icon = habitIcon[h.icon];
              return (
                <span
                  key={h.id}
                  className="flex items-center min-w-0"
                  style={{ height: 26, gap: 5, padding: "0 6px", borderRadius: 10, background: done ? fillDone : dark ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.45)" }}
                >
                  {Icon && <Icon size={12} strokeWidth={1.5} style={{ color: deep, flex: "none" }} aria-hidden />}
                  <span
                    className="flex-1 min-w-0 truncate"
                    style={{ fontSize: textPx(9.5), lineHeight: linePx(12.4), fontWeight: done ? 700 : 500, color: done ? "rgb(var(--c-charcoal))" : "rgb(var(--c-charcoal-faint))" }}
                  >
                    {h.label}
                  </span>
                  <span
                    className="grid place-items-center shrink-0"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: 4,
                      boxSizing: "border-box",
                      background: done ? deep : "transparent",
                      border: done ? "none" : `1.5px solid ${dark ? "rgb(var(--thi-c3b3fb) / 0.3)" : "rgb(var(--thi-5f5093) / 0.3)"}`,
                    }}
                    aria-label={done ? t("Done") : t("Not done")}
                  >
                    {done && <Check size={9} strokeWidth={3} style={{ color: dark ? "#1C1F28" : "#FFFFFF" }} aria-hidden />}
                  </span>
                </span>
              );
            })}
          </span>
        ))}
      </span>
      {pages.length > 1 && (
        // Main's hint, verbatim, back beside the dots as main laid them out
        // (hint left, dots right; release review O1). Dots keep top 91.
        <span className="absolute flex items-center justify-between" style={{ insetInlineStart: 0, insetInlineEnd: 0, top: 87.5, height: 11, gap: 10 }}>
          <span className="whitespace-nowrap" style={{ fontSize: textPx(8.5), lineHeight: linePx(11), fontWeight: 600, color: deep, opacity: dark ? 1 : 0.68 }}>
            {t("For more habits, swipe.")}
          </span>
          <span className="flex shrink-0" style={{ gap: 3 }} aria-hidden>
            {pages.map((_, i) => (
              <span key={i} className="block rounded-full" style={{ width: 4, height: 4, background: deep, opacity: i === page ? 1 : 0.3 }} />
            ))}
          </span>
        </span>
      )}
    </span>
  );
};

export const HabitsWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { habits, habitsLoading, habitsError, reloadHabits, selectedDate, today } = useApp();
  const { dark, hc, online } = useHomeMode();
  const isLarge = size === "large";
  const c = homeColors("habits", dark);
  const ink = hc && !dark ? "#4B3BA0" : c.ink;
  const colors = { tint: c.tint, icon: ink, label: ink, ink, tile: c.tile };
  const timedOut = useLoadingTimeout(habitsLoading);
  const colourOf = useHabitColours(habits.map((h) => h.id));
  const open = () => navigate("/app/mind/habits");

  if (habits.length === 0) {
    let state: "empty" | "loading" | "error" | "offline" = "empty";
    if (habitsLoading && !timedOut) state = online ? "loading" : "offline";
    else if (habitsError || timedOut) state = online ? "error" : "offline";
    return (
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={CircleCheck}
        label={t("Habits")}
        state={state}
        emptyTitle={t("No habits yet")}
        emptyHint={isLarge ? t("Add a habit to see it here") : t("Add a habit")}
        onRetry={() => void reloadHabits()}
        // S1: MO1.1.1.1 Add habit is the Mind owner's screen; until it has a deep link, MO1.1.1 Habits.
        onOpen={open}
        ariaLabel={state === "empty" ? t("Habits, no habits yet. Add a habit") : undefined}
      />
    );
  }

  const done = habits.map((h) => isDone(h, selectedDate, today));
  const count = done.filter(Boolean).length;
  const all = count === habits.length;
  const context = all ? t("All done today") : t("habits done today");

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={CircleCheck}
        label={t("Habits")}
        onOpen={open}
        ariaLabel={t("Habits, {count} of {total} done today", { count, total: habits.length })}
        value={<FadeValue k={count} value={count} />}
        unit={t("of {n}", { n: habits.length })}
        // Small: value 43 (gap 12), segments 73, context 85. Large: value 52.5 (gap 19.5), segments 92.5 (110 wide), context 104.5; grid 142, 47.
        bodyGap={isLarge ? 19.5 : 12}
        headerRight={isLarge ? <HeaderPill ink={ink} dark={dark}>{t("{count} of {total} today", { count, total: habits.length })}</HeaderPill> : undefined}
        graphic={<Segments done={done} colours={habits.map((h) => colourOf?.[h.id])} width={isLarge ? 110 : "100%"} dark={dark} hc={hc} />}
        graphicHeight={6}
        context={<Line>{context}</Line>}
        aside={
          isLarge ? (
            <span className="block" style={{ marginTop: -5.5 }}>
              <HabitGrid habits={habits} day={selectedDate} today={today} dark={dark} hc={hc} />
            </span>
          ) : undefined
        }
      />
    </>
  );
};
