import { useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { time12 } from "../../../utils/time12";
import { classesRangeLabel, type AnalyticsRange } from "../shell/range";
import { MIN_BOOKINGS, MIN_SESSIONS, TARGET } from "./model";
import { Avatar, PageHeader, Strip } from "./parts";
import { dayDate, weekday } from "./fmt";
import { MIN_REVIEWS, distOf, vsTeam } from "./ratingsModel";
import { RatingGraphic, ReviewsSheet, Snippets } from "./RatingsParts";
import type { RatingsState } from "./useRatings";
import type { TeamState } from "./useTeam";
import { roleLabel } from "./vocab";
import { getLanguage, t, tk, tn } from "../../../i18n/core";

// AN5-045 instructor scorecard (AnTeamV6 l.282-342, sc0 l.500-509), with
// AN5-048 (below target in caution), AN5-049 (New, not enough first-timers),
// AN5-044 / AN5-047 / AN5-050 tap states as :focus-visible. Land-on-Ratings
// scroll (row 15): the box top 84 below the scroller, smooth (instant under
// Reduce motion), retried at 60 / 400 / 1000 ms, focus moved to its heading.
// Ratings box on B14 (instructor_ratings, V6-85): the team-average line, the
// small graphic or New with "{n} so far", the two newest snippets (a tap
// opens the reviews sheet on that review) and "See all {n} reviews"
// (AN5-051); snippets and See all show while New too (AN5-049 row 5).

export function ScorecardView({
  state,
  ratings,
  range,
  personId,
  focusRatings,
  backLabel,
  crumb,
  onBack,
}: {
  state: TeamState;
  ratings: RatingsState;
  range: AnalyticsRange;
  personId: string;
  focusRatings: boolean;
  backLabel: string;
  crumb: string;
  onBack: () => void;
}) {
  const reduce = useReducedMotion();
  const ratRef = useRef<HTMLDivElement | null>(null);
  const headRef = useRef<HTMLParagraphElement | null>(null);
  const [allUp, setAllUp] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [focusRev, setFocusRev] = useState<string | null>(null);
  const st = state.stats?.perPerson.find((p) => p.person.id === personId);
  const studio = state.stats?.studioFill ?? null;

  useEffect(() => {
    if (!focusRatings) return;
    const go = () => {
      const el = ratRef.current;
      if (!el) return;
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: reduce ? "auto" : "smooth" });
    };
    const timers = [60, 400, 1000].map((ms) => window.setTimeout(go, ms));
    headRef.current?.focus({ preventScroll: true });
    return () => timers.forEach(clearTimeout);
  }, [focusRatings, reduce, st?.person.id]);

  if (!st) {
    return (
      <div>
        <PageHeader crumb={crumb} title={t("Scorecard")} backLabel={backLabel} onBack={onBack} />
        {state.error ? <Strip offline={state.error === "offline"} text={t("Couldn't load your team. Check your connection and try again.")} onRetry={state.reload} /> : null}
      </div>
    );
  }

  const p = st.person;
  const types = [...new Set(st.taught.map((c) => c.classType || c.title))].slice(0, 2);
  // Ratings box on B14 (AN5-045 rows 9-12, AN5-049, OURS R5 / R6): all time, from instructor_ratings and the matched reviews.
  const myRow = ratings.all.find((r) => r.professionalId === p.id);
  const myCount = myRow?.reviews ?? 0;
  const myAvg = myCount >= MIN_REVIEWS && myRow?.average != null ? Math.round(myRow.average * 10) / 10 : null;
  const mine = ratings.byPerson.get(p.id) ?? [];
  const vs = vsTeam(myAvg, ratings.team.avg);
  const fillCaution = st.fill !== null && st.fill < TARGET;
  const fillCap =
    st.fill === null
      ? t("Fill shows after {min} classes ({n} so far).", { min: MIN_SESSIONS, n: st.sessions })
      : studio !== null && (state.stats?.withFill ?? 0) > 1
        ? st.fill >= studio
          ? t("{n} points above the studio's {pct}%. Teal line: 70% target.", { n: Math.abs(st.fill - studio), pct: studio })
          : t("{n} points below the studio's {pct}%. Teal line: 70% target.", { n: Math.abs(st.fill - studio), pct: studio })
        : st.fill >= TARGET
          ? t("At or above your 70% target. Teal line: 70% target.")
          : t("Under your 70% target. Teal line: 70% target.");

  // Time slots: fill by weekday + start time, from 2 different slots.
  const slots = new Map<string, { label: string; title: string; booked: number; cap: number }>();
  for (const c of st.taught) {
    const k = `${weekday(c.date)} ${c.start}`;
    const s = slots.get(k) ?? { label: `${weekday(c.date)} ${time12(c.start)}`, title: c.title, booked: 0, cap: 0 };
    s.booked += c.booked;
    s.cap += c.capacity;
    slots.set(k, s);
  }
  const ranked = [...slots.values()].filter((s) => s.cap > 0).sort((a, b) => b.booked / b.cap - a.booked / a.cap);
  const pct = (s: { booked: number; cap: number }) => Math.round((s.booked / s.cap) * 100);
  const loadW = Math.min(100, (st.hoursPerWeek / 6) * 100);
  const avgW = Math.min(100, ((state.stats?.hoursAvg ?? 0) / 6) * 100);
  const upcoming = allUp ? st.upcoming : st.upcoming.slice(0, 3);

  return (
    <div>
      <PageHeader crumb={crumb} title={p.name} backLabel={backLabel} onBack={onBack} />
      {state.error && (
        <Strip offline={state.error === "offline"} text={state.error === "offline" ? t("You're offline. Showing your team as of the last update.") : t("Couldn't load your team. Check your connection and try again.")} onRetry={state.reload} />
      )}
      <div className="an5-card an5-sc">
        <div className="an5-sc-head">
          <Avatar name={p.name} seat={p.seat} size={52} />
          <div className="min-w-0 flex-1">
            <p className="an5-sc-name">{p.name}</p>
            <p className="an5-sc-role">{[roleLabel(p.role), ...types].join(" · ")}</p>
          </div>
          <div className="an5-sc-cls">
            <b>{st.sessions}</b>
            <span>{classesRangeLabel(range)}</span>
          </div>
        </div>

        <div className="an5-metric">
          <div className="an5-metric-head">
            <p className="an5-metric-l">{t("Fill rate")}</p>
            <p className="an5-metric-v" style={fillCaution ? { color: "var(--an-caution-text)" } : undefined}>
              {st.fill === null ? "–" : `${st.fill}%`}
            </p>
          </div>
          <div className="an5-mtrack">
            <span className="an5-mtrack-l">{t("Booked spots")}</span>
            <div className="an5-track">
              <div className="an5-bar-fill" style={{ width: `${st.fill ?? 0}%`, background: fillCaution ? "var(--an-caution)" : "var(--an-fill)" }} />
              <span className="an5-ref is-target" style={{ insetInlineStart: `${TARGET}%` }} aria-hidden />
              {studio !== null && (state.stats?.withFill ?? 0) > 1 && <span className="an5-ref is-avg" style={{ insetInlineStart: `${studio}%` }} aria-hidden />}
            </div>
            <span className="an5-mtrack-v">{st.fill === null ? "–" : `${st.fill}%`}</span>
          </div>
          <p className="an5-metric-cap">{fillCap}</p>
        </div>

        <div className="an5-metric">
          <div className="an5-metric-head">
            <p className="an5-metric-l">{t("Members coming back")}</p>
            <p className="an5-metric-v" style={{ color: "var(--an-faint)" }}>
              –
            </p>
          </div>
          {[
            { l: t("Repeat"), col: "var(--an-fill)" },
            { l: t("First-timer"), col: "var(--an-teal)" },
          ].map((row) => (
            <div key={row.l} className="an5-mtrack">
              <span className="an5-mtrack-l">{row.l}</span>
              <div className="an5-track" />
              <span className="an5-mtrack-v">–</span>
            </div>
          ))}
          <p className="an5-metric-cap">
            {st.booked < MIN_BOOKINGS ? t("Comparisons start at {min} bookings ({n} so far).", { min: MIN_BOOKINGS, n: st.booked }) : t("Return rates appear here soon.")}
          </p>
        </div>

        <div className="an5-metric">
          <div className="an5-metric-head">
            <p className="an5-metric-l">{t("Teaching load")}</p>
            <p className="an5-metric-v">{t("{n} h / wk", { n: st.hoursPerWeek.toFixed(1) })}</p>
          </div>
          <div className="an5-mtrack">
            <span className="an5-mtrack-l">{t("{n} a week", { n: st.classesPerWeek })}</span>
            <div className="an5-track">
              <div className="an5-bar-fill" style={{ width: `${loadW}%` }} />
              {(state.stats?.perPerson.filter((x) => x.sessions > 0).length ?? 0) > 1 && <span className="an5-ref is-avg" style={{ insetInlineStart: `${avgW}%` }} aria-hidden />}
            </div>
            <span className="an5-mtrack-v">{t("{n} h", { n: st.hoursPerWeek.toFixed(1) })}</span>
          </div>
          <p className="an5-metric-cap">{t("Hours taught per week (class length × classes).")}</p>
        </div>

        {ranked.length >= 2 && (
          <div className="an5-metric">
            <p className="an5-metric-l">{t("Time slots")}</p>
            <div className="an5-slots">
              {[
                { k: tk("Best"), cls: "is-best", s: ranked[0] },
                { k: tk("Weakest"), cls: "is-weak", s: ranked[ranked.length - 1] },
              ].map((x) => (
                <div key={x.k} className={`an5-slot ${x.cls}`}>
                  <p className="an5-slot-k">{t(x.k)}</p>
                  <p className="an5-slot-t">{x.s.label}</p>
                  <p className="an5-slot-s">
                    {x.s.title} · {t("{pct}% booked", { pct: pct(x.s) })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div ref={ratRef} className={`an5-ratbox${focusRatings ? " is-focus" : ""}`}>
          <div className="an5-metric-head">
            <p ref={headRef} tabIndex={-1} className="an5-metric-l" style={{ outline: "none" }}>
              {t("Ratings")}
            </p>
            {vs && (
              <p style={{ fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", color: vs.good ? "var(--an-good)" : "var(--an-faint)" }}>{vs.text}</p>
            )}
          </div>
          {myAvg !== null ? (
            <RatingGraphic size="sm" avg={myAvg} count={myCount} countText={tn(myCount, "{n} review", "{n} reviews")} dist={distOf(mine, myCount)} />
          ) : (
            <div className="an5-newline">
              <b>{t("New")}</b>
              <span>{t("Shows a rating after 3 reviews.")} {myCount === 0 ? t("None yet.") : t("{n} so far.", { n: myCount })}</span>
            </div>
          )}
          <Snippets
            list={mine}
            onOpen={(id) => {
              setFocusRev(id);
              setSheet(true);
            }}
          />
          {mine.length > 0 && (
            <button
              type="button"
              className="an5-more tap"
              onClick={() => {
                setFocusRev(null);
                setSheet(true);
              }}
            >
              {tn(myCount, "See all {n} review", "See all {n} reviews")}
              <ChevronRight className="rtl:-scale-x-100" size={14} aria-hidden />
            </button>
          )}
        </div>

        <div className="an5-metric">
          <p className="an5-metric-l">{t("Upcoming classes")}</p>
          {st.upcoming.length === 0 ? (
            <p className="an5-metric-cap">{t("No upcoming classes.")}</p>
          ) : (
            <div style={{ marginTop: 4 }}>
              {upcoming.map((c) => (
                <div key={c.id} className="an5-up">
                  <span className="an5-up-d">{getLanguage() === "ar" ? dayDate(c.date) : dayDate(c.date).split(" ").slice(0, 3).join(" ")}</span>
                  <span className="an5-up-c">
                    {c.title} · {time12(c.start)}
                  </span>
                  <span className={`an5-up-b${c.booked >= c.capacity ? " is-full" : ""}`}>
                    {c.booked}/{c.capacity}
                  </span>
                </div>
              ))}
              {st.upcoming.length > 3 && !allUp && (
                <button type="button" className="an5-more tap" onClick={() => setAllUp(true)}>
                  {t("See all {n}", { n: st.upcoming.length })}
                  <ChevronRight className="rtl:-scale-x-100" size={14} aria-hidden />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      <p className="an5-foot">{t("Based on bookings in this period. Ratings come from Centium reviews.")}</p>
      <ReviewsSheet
        open={sheet}
        onClose={() => setSheet(false)}
        title={t("{name}'s reviews", { name: p.name })}
        lead={`${types.length ? types.join("، ") + " · " : ""}${t("all time")}`}
        list={mine}
        count={myCount}
        avg={myAvg}
        team={false}
        businessName={state.businessName || t("Your business")}
        emptyText={t("Reviews appear here after members rate {name}.", { name: p.name })}
        focusId={focusRev}
      />
    </div>
  );
}
