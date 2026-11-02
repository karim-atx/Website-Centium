import React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { useApp } from "../../../context/AppContext";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { journalStreak } from "../../../services/journal/streak";
import { mondayFirstWeek } from "../../../utils/week";
import { useJournalWeek } from "./data";
import { DayDots, FadeValue, HeaderPill, HomeCard, HomeKeyframes, homeColors, Line, useHomeMode, useLoadingTimeout, WeekStrip } from "./kit";
import { appLocale } from "../../../i18n/format";
import { t, tn } from "../../../i18n/core";

// HO1.W9 Journal (small), OURS-home-large-widgets §C (large) and
// OURS-home-journal-empty. PRIVACY (home-backend §9, PB3 §6 #4): entry text
// never appears on Home; only counts. V6-141 (D14): words count only the
// entries this client can read (a locked folder's entries are not loaded).

const words = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

export const JournalWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { journalEntries, journalLoading, journalError, reloadJournal, today } = useApp();
  const { dark, online } = useHomeMode();
  // Recovery-sensitive mode (AJ R7): no streak. The value says whether today
  // has an entry instead.
  const hideNumbers = useHideNumbers();
  const isLarge = size === "large";
  const c = homeColors("journal", dark);
  const colors = { tint: c.tint, icon: c.icon, label: c.label, ink: c.ink, tile: c.tile };
  const timedOut = useLoadingTimeout(journalLoading);
  const jw = useJournalWeek(journalEntries.length);
  const open = () => navigate("/app/mind/journal");

  if (journalEntries.length === 0) {
    let state: "empty" | "loading" | "error" | "offline" = "empty";
    if (journalLoading && !timedOut) state = online ? "loading" : "offline";
    else if (journalError || timedOut) state = online ? "error" : "offline";
    return (
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={BookOpen}
        label={t("Journal")}
        state={state}
        emptyTitle={t("No entries yet")}
        emptyHint={isLarge ? (hideNumbers ? t("Write your first entry") : t("Write your first entry to start a streak")) : t("Write your first")}
        onRetry={() => void reloadJournal()}
        onOpen={open}
        ariaLabel={state === "empty" ? t("Journal, no entries yet. Write your first") : undefined}
      />
    );
  }

  const week = mondayFirstWeek(today);
  const days = week.map((d) => journalEntries.some((e) => e.date === d));
  // B3 my_journal_week(): words this week with locked folders left out entirely (D14); the client count only until it answers.
  const weekWords = jw?.words ?? journalEntries.filter((e) => e.date >= week[0] && e.date <= week[6]).reduce((s, e) => s + words(e.text), 0);
  const streak = journalStreak(
    journalEntries.map((e) => e.date),
    today
  );
  const writtenToday = journalEntries.some((e) => e.date === today);
  const fill = dark ? "#E0B360" : "#D4A84A";
  const wordsLine = tn(weekWords, "{n} word this week", "{n} words this week", { n: weekWords.toLocaleString(appLocale()) });

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={BookOpen}
        label={t("Journal")}
        onOpen={open}
        ariaLabel={
          hideNumbers
            ? writtenToday
              ? t("Journal, written today, {words}", { words: wordsLine })
              : t("Journal, not written today, {words}", { words: wordsLine })
            : writtenToday
              ? t("Journal, {streak}, {words}, written today", { streak: tn(streak, "{n} day streak", "{n} day streak"), words: wordsLine })
              : t("Journal, {streak}, {words}", { streak: tn(streak, "{n} day streak", "{n} day streak"), words: wordsLine })
        }
        value={hideNumbers ? (writtenToday ? t("Written") : t("Not yet")) : <FadeValue k={streak} value={streak} />}
        unit={hideNumbers ? t("today") : tn(streak, "day streak", "day streak")}
        // Small: value 42 (gap 11), dots 72 (8 x 8), context 86. Large: value 52.5 (gap 19.5), context 92.5; strip 200 x 52 at 142, 61.
        bodyGap={isLarge ? 19.5 : 11}
        // Recovery mode: the value already says it, so no pill to repeat it.
        headerRight={isLarge && !hideNumbers ? <HeaderPill ink={c.label} dark={dark}>{writtenToday ? t("Written today") : t("Not written today")}</HeaderPill> : undefined}
        // Not written: an outline in the dot colour at partial strength (measured ring ≈ #E2C584).
        graphic={isLarge ? undefined : <DayDots days={days} size={8} gap={4} fill={fill} ring={dark ? "rgba(224,179,96,0.6)" : "rgba(212,168,74,0.6)"} />}
        graphicHeight={8}
        context={<Line>{wordsLine}</Line>}
        aside={
          isLarge ? (
            <span className="block" style={{ marginTop: 8.5 }}>
              <WeekStrip days={days} todayIndex={week.indexOf(today)} fill={fill} ring={dark ? "rgba(224,179,96,0.4)" : "rgba(212,168,74,0.4)"} dark={dark} />
            </span>
          ) : undefined
        }
      />
    </>
  );
};
