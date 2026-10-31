import React, { useEffect, useId, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useIsDark } from "../../hooks/useIsDark";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { visibleAchievements } from "../../services/achievements";
import { textPx, linePx } from "../../theme/textSize";
import { marketPalette, tierRank, tierStyle, type TierStyle } from "../../theme/marketTokens";
import { NO_ICON_SCALE } from "../../components/pro/proInk";
import { FOCUS_CSS } from "../../components/market/usePress";
import { MarketError } from "../../components/market/MarketStates";
import { DAILY_RULES, STREAK_MILESTONES, earnedToday, fetchLedger, fetchPointsRules, nextMilestone, todayLine, type PointsRules } from "../../services/points";
import { BackTitle } from "./BackTitle";
import { pickAchievements, streakNow } from "./howToEarnModel";
import { appLocale } from "../../i18n/format";

// Market + Share 3.0 · W2 · How to earn (C-MO.4.8 `earn`; Client Explore
// Screens lines 635–677, script `daily`, `streaks`, `achievements`,
// `todayLine`).
// - back row + "How to earn" 22 / 800;
// - three collapsible cards (margin-top 12, then 10 apart): radius 18, 0.5px
//   --hair, overflow hidden; the 54 header --soft, padding 0 14: the title
//   14 / 800, at the right 12 / 700 in the tier's TEXT ink and the 15
//   chevron (stroke 2 --faint; rotated 180 while open). All open by default,
//   as drawn; the header is a button with aria-expanded.
//   - Daily logging (body padding 4 14 12): the four DAILY_RULES rows
//     (padding 10 0, gap 12, 0.5px --div): the 22 tick circle (--good with a
//     white 12 tick, stroke 3, when today's ledger has the source; else a
//     1.5px --border ring), the label 13 / 600, "+10" 13 / 800; the note
//     11.5 / 17 --faint (margin-top 10). Right: "20 of 30 today"
//     (my_points_summary earned_today / daily_cap). The points, the cap in
//     the note and the months in the closing note are platform_settings'
//     (fetchPointsRules: points_value_*, points_daily_cap,
//     points_expiry_months), the values the server awards with; until they
//     load the figures are blank, and a failed read shows the error strip.
//   - Streak milestones (body padding 12 14): "Next: 100 days" 12.5 / 700 and
//     "68 days to go · +750" --faint; the 5 bar (margin-top 8, --tiertrack,
//     fill the tier ink); the 4-column grid (margin-top 12, gap 6): radius
//     12, padding 8 0, reached = --tierpill + the tier's text ink, else
//     --soft / --ink, the days 12 / 800 and the points 11 --faint; the note.
//     Right: "{n}-day streak". The points are the live achievements'
//     (streak_7 / 30 / 100 / 365: my_achievements points), which is what the
//     server pays: the board's 50 / 200 / 750 / 3,000 since Database f470909.
//   - Achievements (body padding 4 14 8): rows (padding 10 0, gap 12): the
//     title 13 / 600 (--ink unlocked, --ink2 locked), the chip 11 / 700
//     radius 999 padding 2 8 (Unlocked --tealbg / --tealink, Locked --pale /
//     --pdark), "+25" 13 / 800, 44 wide right-aligned. Right: "{n} of {total}".
//     KEPT (PLAN §3.1): the old card's tap-through, as "All achievements".
// - KEPT (PLAN §3.1): the old card's tier rail as a "Tiers" card in the same
//   chrome (our design): a row per point_tiers tier, the tier's icon in its
//   fill, the name 13 / 700, "From 1,000 points" 11.5 --faint, the current
//   one marked "Your tier" in its pill.
// - the note "Points expire 12 months after they are earned. Points have no
//   cash value." 11.5 / 17 --faint (margin-top 14); the months are
//   points_expiry_months.

export default function HowToEarnPage() {
  const dark = useIsDark();
  const m = marketPalette(dark);
  const navigate = useNavigate();
  const { pointsSummary, pointTiers, achievements, streaks, refreshAchievements } = useApp();
  // Opened straight from a link (or Explore's hero), the summary and the
  // achievements may not have been read yet: the app's one points read.
  const known = !!pointsSummary && !!achievements;
  useEffect(() => {
    if (!known) refreshAchievements();
  }, [known, refreshAchievements]);
  const rank = tierRank(pointTiers, pointsSummary?.tierName);
  const t = tierStyle(rank, dark);

  // Today's ticks: my_points_ledger's newest page, the logging sources with
  // a net award on today's day (a same-day reversal cancels its kind).
  const [ticks, setTicks] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    void fetchLedger(null, 50).then((r) => {
      if (!cancelled && r.ok) setTicks(earnedToday(r.value.entries));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // The values the server awards with (platform_settings).
  const [rules, setRules] = useState<PointsRules | null>(null);
  const [rulesFailed, setRulesFailed] = useState(false);
  const [rulesTry, setRulesTry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    void fetchPointsRules().then((r) => {
      if (cancelled) return;
      if (r.ok) setRules(r.value);
      else setRulesFailed(true);
    });
    return () => {
      cancelled = true;
    };
  }, [rulesTry]);

  // Recovery-sensitive mode (AJ R7/R8): no Streak milestones card, and the
  // Achievements card leaves out the hidden streak and logging badges.
  const hideNumbers = useHideNumbers();
  const shownAchievements = useMemo(() => (achievements ? visibleAchievements(achievements, hideNumbers) : null), [achievements, hideNumbers]);
  const streak = streakNow(achievements, streaks);
  const milestonePoints = (days: number) => achievements?.find((a) => a.key === `streak_${days}`)?.points ?? null;
  const next = streak === null ? null : nextMilestone(streak, milestonePoints);
  const picked = useMemo(() => (shownAchievements ? pickAchievements(shownAchievements) : null), [shownAchievements]);
  const earnedCount = shownAchievements ? shownAchievements.filter((a) => a.earnedAt).length : 0;

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <style>{FOCUS_CSS}</style>
      <BackTitle title="How to earn" parent="/app/marketplace" />

      <Section title="Daily logging" aside={pointsSummary?.extras ? todayLine(pointsSummary.extras) : null} t={t} first bodyPadding="4px 14px 12px">
        {DAILY_RULES.map(([source, label]) => {
          const on = ticks.has(source);
          const pts = rules?.values[source];
          return (
            <div key={source} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `0.5px solid ${m.div}` }}>
              <span
                role="img"
                aria-label={on ? "Earned today" : "Not earned today"}
                style={{ width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", background: on ? m.good : "transparent", border: on ? 0 : `1.5px solid ${m.border}`, color: dark ? m.onfill : "#FFFFFF", boxSizing: "border-box", flexShrink: 0 }}
              >
                <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" style={{ opacity: on ? 1 : 0, ...NO_ICON_SCALE }} aria-hidden>
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span style={{ flex: 1, fontSize: textPx(13), fontWeight: 600 }}>{label}</span>
              <span style={{ fontSize: textPx(13), fontWeight: 800 }}>{pts !== undefined ? `+${pts.toLocaleString(appLocale("en-US"))}` : ""}</span>
            </div>
          );
        })}
        {rulesFailed ? <MarketError thing="the points values" onRetry={() => {
              setRulesFailed(false);
              setRulesTry((x) => x + 1);
            }} style={{ marginTop: 10 }} /> : null}
        <p style={{ margin: "10px 0 0", fontSize: textPx(11.5), lineHeight: linePx(17), color: m.faint }}>
          {rules ? `Each action counts once a day, up to ${rules.dailyCap.toLocaleString(appLocale("en-US"))} points. ` : "Each action counts once a day. "}Only entries logged for today earn points.
        </p>
      </Section>

      {!hideNumbers && (
        <Section title="Streak milestones" aside={streak !== null ? `${streak}-day streak` : null} t={t} bodyPadding="12px 14px">
          {next ? (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: textPx(12.5) }}>
              <span style={{ fontWeight: 700 }}>Next: {next.days} days</span>
              <span style={{ color: m.faint, textAlign: "end" }}>
                {next.toGo} {next.toGo === 1 ? "day" : "days"} to go{next.points !== null ? ` · +${next.points.toLocaleString(appLocale("en-US"))}` : ""}
              </span>
            </div>
          ) : (
            <div style={{ fontSize: textPx(12.5), fontWeight: 700 }}>{streak === null ? "Your streak will show here." : "Every milestone reached"}</div>
          )}
          <div
            role="progressbar"
            aria-label="Streak towards the next milestone"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={next ? next.pct : streak === null ? 0 : 100}
            style={{ marginTop: 8, height: 5, borderRadius: 999, background: t.track, overflow: "hidden" }}
          >
            <div style={{ height: "100%", width: `${next ? next.pct : streak === null ? 0 : 100}%`, borderRadius: 999, background: t.ink }} />
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
            {STREAK_MILESTONES.map((d) => {
              const on = streak !== null && streak >= d;
              const p = milestonePoints(d);
              return (
                <div key={d} style={{ borderRadius: 12, padding: "8px 0", textAlign: "center", background: on ? t.pill : m.soft }} aria-label={`${d} days${p !== null ? `, ${p.toLocaleString(appLocale("en-US"))} points` : ""}${on ? ", reached" : ""}`} role="img">
                  <div style={{ fontSize: textPx(12), fontWeight: 800, color: on ? t.text : m.ink }}>{d} days</div>
                  <div style={{ fontSize: textPx(11), color: m.faint }}>{p !== null ? `+${p.toLocaleString(appLocale("en-US"))}` : " "}</div>
                </div>
              );
            })}
          </div>
          <p style={{ margin: "10px 0 0", fontSize: textPx(11.5), lineHeight: linePx(17), color: m.faint }}>Each milestone pays once per streak. It can be earned again after a streak breaks and is rebuilt.</p>
        </Section>
      )}

      <Section title="Achievements" aside={shownAchievements ? `${earnedCount} of ${shownAchievements.length}` : null} t={t} bodyPadding="4px 14px 8px">
        {picked === null ? (
          <div aria-hidden className="animate-skeleton-pulse" style={{ margin: "10px 0", height: 120, borderRadius: 12, background: m.soft }} />
        ) : (
          picked.map((a) => {
            const on = !!a.earnedAt;
            return (
              <div key={a.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `0.5px solid ${m.div}` }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: textPx(13), fontWeight: 600, color: on ? m.ink : m.ink2 }}>{a.title}</span>
                <span style={{ fontSize: textPx(11), fontWeight: 700, borderRadius: 999, padding: "2px 8px", background: on ? m.tealbg : m.pale, color: on ? m.tealink : m.pdark, whiteSpace: "nowrap" }}>{on ? "Unlocked" : "Locked"}</span>
                <span style={{ width: 44, flexShrink: 0, textAlign: "end", fontSize: textPx(13), fontWeight: 800 }}>+{a.points.toLocaleString(appLocale("en-US"))}</span>
              </div>
            );
          })
        )}
        <button
          type="button"
          onClick={() => navigate("/app/mind/achievements")}
          className="market-focus"
          style={{ width: "100%", minHeight: 44, display: "flex", alignItems: "center", gap: 12, padding: 0, background: "none", border: 0, font: "inherit", fontSize: textPx(13), fontWeight: 700, color: m.pdark, cursor: "pointer", textAlign: "start" }}
        >
          <span style={{ flex: 1 }}>All achievements</span>
          <ChevronRight size={15} aria-hidden style={NO_ICON_SCALE} />
        </button>
      </Section>

      {pointTiers.length > 0 ? (
        <Section title="Tiers" aside={pointsSummary?.tierName ?? null} t={t} bodyPadding="4px 14px 8px">
          {[...pointTiers]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((tier, i, all) => {
              const ts = tierStyle(tierRank(pointTiers, tier.name), dark);
              const current = tier.name === pointsSummary?.tierName;
              return (
                <div key={tier.name} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: i < all.length - 1 ? `0.5px solid ${m.div}` : 0 }}>
                  <span aria-hidden style={{ width: 32, height: 32, borderRadius: 10, background: ts.fill, border: `0.5px solid ${ts.border}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <ts.Icon size={16} strokeWidth={1.75} color={ts.icon} style={NO_ICON_SCALE} />
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: textPx(13), fontWeight: 700 }}>{tier.name}</span>
                    <span style={{ display: "block", fontSize: textPx(11.5), color: m.faint }}>{tier.minPoints > 0 ? `From ${tier.minPoints.toLocaleString(appLocale("en-US"))} points` : "Where everyone starts"}</span>
                  </span>
                  {current ? <span style={{ fontSize: textPx(11), fontWeight: 700, borderRadius: 999, padding: "2px 8px", background: ts.pill, color: ts.text, whiteSpace: "nowrap" }}>Your tier</span> : null}
                </div>
              );
            })}
        </Section>
      ) : null}

      <p style={{ margin: "14px 0 0", fontSize: textPx(11.5), lineHeight: linePx(17), color: m.faint }}>
        {rules ? `Points expire ${rules.expiryMonths} ${rules.expiryMonths === 1 ? "month" : "months"} after they are earned. ` : ""}Points have no cash value.
      </p>
    </div>
  );
}

const Section: React.FC<{ title: string; aside: string | null; t: TierStyle; first?: boolean; bodyPadding: string; children: React.ReactNode }> = ({ title, aside, t, first, bodyPadding, children }) => {
  const m = marketPalette(useIsDark());
  const [open, setOpen] = useState(true);
  const id = useId();
  return (
    <section style={{ marginTop: first ? 12 : 10, borderRadius: 18, border: `0.5px solid ${m.hair}`, overflow: "hidden" }}>
      <h2 style={{ margin: 0 }}>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="market-focus"
          style={{ width: "100%", minHeight: 54, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "0 14px", background: m.soft, border: 0, font: "inherit", color: m.ink, cursor: "pointer", textAlign: "start" }}
        >
          <span style={{ fontSize: textPx(14), fontWeight: 800 }}>{title}</span>
          <span style={{ display: "flex", alignItems: "center", gap: 8, fontSize: textPx(12), fontWeight: 700, color: t.text, whiteSpace: "nowrap" }}>
            {aside}
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={m.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden style={{ ...NO_ICON_SCALE, transform: open ? "rotate(180deg)" : "none" }}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </span>
        </button>
      </h2>
      <div id={id} hidden={!open} style={{ padding: bodyPadding }}>
        {children}
      </div>
    </section>
  );
};
