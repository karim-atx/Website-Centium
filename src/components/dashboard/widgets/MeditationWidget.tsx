import React from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../../../context/AppContext";
import { useHideNumbers } from "../../../hooks/useHideNumbers";
import { mondayFirstWeek } from "../../../utils/week";
import { LotusGlyph } from "../LotusGlyph";
import { useMeditationWeek } from "./data";
import { DayDots, FadeValue, HeaderPill, HomeCard, HomeKeyframes, homeColors, Line, useHomeMode, useLoadingTimeout, WeekStrip } from "./kit";

// HO1.W10 Meditation (small), HO1.W10·e, OURS-home-large-widgets §D (large).
// Figures from my_meditation_summary() (minutes today, sessions and minutes
// this week, streak); the week's days from meditation_sessions (PB-HO-10).
// Colours fixed in every theme (V6-60).

/** svg/icons/custom/meditation-lotus.svg is the repo LotusGlyph; MetricWidget passes size and colour. */
const Lotus: React.FC<{ size?: number; style?: React.CSSProperties }> = ({ size = 12, style }) => <LotusGlyph size={size} stroke={style?.color as string | undefined} />;

export const MeditationWidget: React.FC<{ size: "small" | "large"; editMode: boolean }> = ({ size, editMode }) => {
  const navigate = useNavigate();
  const { meditationSummary, today } = useApp();
  const { dark, online } = useHomeMode();
  const hideNumbers = useHideNumbers();
  const isLarge = size === "large";
  const c = homeColors("meditation", dark);
  const colors = { tint: c.tint, icon: c.icon, label: c.label, ink: c.ink, tile: c.tile };
  const week = mondayFirstWeek(today);
  const days = useMeditationWeek(week, meditationSummary);
  const loading = meditationSummary === null;
  const timedOut = useLoadingTimeout(loading);
  const open = () => navigate("/app/mind/meditation");

  const s = meditationSummary;
  const empty = !!s && s.secondsToday === 0 && s.sessionsThisWeek === 0;
  if (!s || empty) {
    const state = !s ? (timedOut ? (online ? "error" : "offline") : online ? "loading" : "offline") : "empty";
    return (
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={Lotus}
        label="Meditation"
        state={state}
        emptyTitle="No sessions this week"
        emptyHint="Start a session"
        // Retry: the summary is read by AppContext; opening Meditation reads it again.
        onRetry={open}
        onOpen={open}
        ariaLabel={state === "empty" ? "Meditation, no sessions this week. Start a session" : undefined}
      />
    );
  }

  const minutesToday = Math.round(s.secondsToday / 60);
  const minutesWeek = Math.round(s.secondsThisWeek / 60);
  const sessions = `${s.sessionsThisWeek} session${s.sessionsThisWeek === 1 ? "" : "s"} this week`;
  const fill = "#8DBFB0";
  const dots = days ?? week.map(() => false);

  return (
    <>
      <HomeKeyframes />
      <HomeCard
        size={size}
        editMode={editMode}
        colors={colors}
        icon={Lotus}
        label="Meditation"
        onOpen={open}
        ariaLabel={`Meditation, ${minutesToday} minutes today, ${sessions}`}
        value={<FadeValue k={minutesToday} value={minutesToday} />}
        unit="min today"
        // Small: value 42 (gap 11), dots 72, context 86. Large: value 52.5 (gap 19.5), context x2 from 92.5 (gap 6); strip 142, 61.
        bodyGap={isLarge ? 19.5 : 11}
        // Recovery-sensitive mode (AJ R7): no streak pill.
        headerRight={isLarge && !hideNumbers && s.streakDays > 0 ? <HeaderPill ink={c.label} dark={dark}>{`${s.streakDays} day streak`}</HeaderPill> : undefined}
        // Empty ring measured ≈ #AFD3C8: the dot colour at partial strength.
        graphic={isLarge ? undefined : <DayDots days={dots} size={8} gap={4} fill={fill} ring="rgba(141,191,176,0.6)" />}
        graphicHeight={8}
        context={
          isLarge ? (
            <span className="block">
              <Line>{sessions}</Line>
              <Line style={{ marginTop: 6 }}>{`${minutesWeek} min this week`}</Line>
            </span>
          ) : (
            <Line>{sessions}</Line>
          )
        }
        aside={
          isLarge ? (
            <span className="block" style={{ marginTop: 8.5 }}>
              <WeekStrip days={dots} todayIndex={week.indexOf(today)} fill={fill} ring="rgba(141,191,176,0.4)" dark={dark} />
            </span>
          ) : undefined
        }
      />
    </>
  );
};
