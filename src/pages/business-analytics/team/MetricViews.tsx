import { heroRangeLabel, type AnalyticsRange } from "../shell/range";
import { MIN_BOOKINGS, TARGET, type InstructorStats } from "./model";
import { Accordion, Avatar, HeadCard, HeadOld, PageHeader, QuestionCard, Strip } from "./parts";
import type { TeamState } from "./useTeam";
import type { Vocab } from "./vocab";
import { t, tn } from "../../../i18n/core";

// Team section pages the tiles open (AN5-001 S7) that the frames do not
// draw: AnTeamV6 build("performance" | "repeat" | "load") l.411-445 is the
// spec (questions, captions, legends, bars, thresholds, foot lines). Real
// numbers from business_classes + bookings; return rates need B15's reader,
// so that page shows the source's own not-enough-data rows.

const period = (r: AnalyticsRange) => heroRangeLabel(r).toLowerCase();

function Bar({ w, col, refs }: { w: number; col: string; refs: { x: number; kind: "target" | "avg" }[] }) {
  return (
    <div className="an5-track" style={{ height: 10 }}>
      <div className="an5-bar-fill" style={{ width: `${Math.max(0, Math.min(100, w))}%`, background: col }} />
      {refs.map((r) => (
        <span key={r.kind} className={`an5-ref is-${r.kind}`} style={{ insetInlineStart: `${Math.max(0, Math.min(100, r.x))}%` }} aria-hidden />
      ))}
    </div>
  );
}

function Legend({ items }: { items: { t: string; kind: "fill" | "teal" | "target" | "avg" }[] }) {
  return (
    <div className="an5-reflegend">
      {items.map((i) => (
        <span key={i.t}>
          {i.kind === "fill" || i.kind === "teal" ? (
            <span style={{ width: 12, height: 6, borderRadius: 999, background: i.kind === "teal" ? "var(--an-teal)" : "var(--an-fill)" }} />
          ) : (
            <span style={{ width: 0, height: 12, borderInlineStart: i.kind === "target" ? "2px solid var(--an-teal)" : "1.5px dashed var(--an-avg)" }} />
          )}
          {i.t}
        </span>
      ))}
    </div>
  );
}

function PersonBar({ p, value, valueTone, meta, onOpen, children }: { p: InstructorStats; value: string; valueTone?: "caution" | "faint"; meta: string; onOpen: () => void; children?: React.ReactNode }) {
  return (
    <button type="button" className="an5-barrow tap" aria-label={t("Open scorecard for {name}", { name: p.person.name })} onClick={onOpen}>
      <Avatar name={p.person.name} seat={p.person.seat} />
      <span className="min-w-0 block">
        <span className="an5-barrow-head">
          <span className="an5-name">{p.person.name}</span>
          <span className="an5-amt" style={{ fontSize: 13, color: valueTone === "caution" ? "var(--an-caution-text)" : valueTone === "faint" ? "var(--an-faint)" : undefined }}>
            {value}
          </span>
        </span>
        {children}
        <span className="an5-meta block">{meta}</span>
      </span>
    </button>
  );
}

interface ViewProps {
  state: TeamState;
  range: AnalyticsRange;
  vocab: Vocab;
  onBack: () => void;
  onCard: (id: string) => void;
}

const strip = (state: TeamState) =>
  state.error ? (
    <Strip
      offline={state.error === "offline"}
      text={state.error === "offline" ? t("You're offline. Showing your team as of the last update.") : t("Couldn't load your team. Check your connection and try again.")}
      onRetry={state.reload}
    />
  ) : null;

export function PerformanceView({ state, range, onBack, onCard }: ViewProps) {
  const s = state.stats;
  const rows = [...(s?.perPerson ?? [])].sort((a, b) => (b.fill ?? -1) - (a.fill ?? -1));
  const withFill = rows.filter((r) => r.fill !== null);
  const studio = s?.studioFill ?? null;
  const top = withFill[0];
  const bottom = withFill[withFill.length - 1];
  const lead =
    withFill.length === 0
      ? t("Fill rates show once an instructor has taught 3 classes.")
      : withFill.length === 1
        ? t("{name} fills {pct}% of spots, compared with your 70% target.", { name: top.person.name, pct: top.fill ?? 0 })
        : ((top.fill as number) >= (studio ?? 0)
            ? t("{name} fills {pct}% of spots, {n} points above the studio average.", { name: top.person.name, pct: top.fill ?? 0, n: Math.abs((top.fill as number) - (studio ?? 0)) })
            : t("{name} fills {pct}% of spots, {n} points below the studio average.", { name: top.person.name, pct: top.fill ?? 0, n: Math.abs((top.fill as number) - (studio ?? 0)) })) +
          ((bottom.fill as number) < TARGET ? " " + t("{name} is {n} points under target.", { name: bottom.person.name, n: TARGET - (bottom.fill as number) }) : "");
  const under = withFill.filter((r) => (r.fill as number) < TARGET);
  return (
    <div>
      <PageHeader crumb={t("Team")} title={t("Instructor performance")} backLabel={t("Back to Team")} onBack={onBack} />
      {strip(state)}
      <HeadOld
        cells={[
          { v: studio === null ? "–" : `${studio}%`, l: t("Studio fill rate"), dash: studio === null },
          { v: withFill.length ? t("{n} of {total}", { n: s?.onTarget ?? 0, total: withFill.length }) : "–", l: t("At or above 70%"), dash: !withFill.length },
        ]}
        lead={lead}
      />
      <QuestionCard
        q={t("Which instructors fill their classes?")}
        cap={t("Booked spots ÷ capacity across each instructor's classes, {period}. Highest first. Tap a row for their scorecard.", { period: period(range) })}
        after={
          <Accordion title={t("Below target")} summary={under.length ? tn(under.length, "{n} instructor is under 70%.", "{n} instructors are under 70%.") : t("Everyone is at or above 70%.")}>
            {under.length === 0 ? (
              <p className="an5-acc-text">{t("Everyone with 3 or more classes fills at least 70% of spots.")}</p>
            ) : (
              under.map((r) => (
                <div key={r.person.id} className="an5-rule">
                  <span className="an5-rule-tile" style={{ color: "var(--an-caution-text)", fontSize: 11, fontWeight: 800 }}>
                    {r.fill}%
                  </span>
                  <span>
                    <span className="an5-rule-t block">{r.person.name}</span>
                    <span className="an5-rule-s block">
                      {tn(r.sessions, "{n} class", "{n} classes")} · {t("{n} booked per class", { n: r.avgBooked })}
                    </span>
                  </span>
                </div>
              ))
            )}
          </Accordion>
        }
      >
        <Legend items={[{ t: t("Fill rate"), kind: "fill" }, { t: t("70% target"), kind: "target" }, ...(withFill.length > 1 && studio !== null ? [{ t: t("Studio average {pct}%", { pct: studio }), kind: "avg" as const }] : [])]} />
        <div className="an5-bars">
          {rows.map((r) => (
            <PersonBar
              key={r.person.id}
              p={r}
              value={r.fill === null ? "–" : `${r.fill}%`}
              valueTone={r.fill === null ? "faint" : r.fill < TARGET ? "caution" : undefined}
              meta={r.fill === null ? tn(r.sessions, "{n} class so far. Fill shows after 3.", "{n} classes so far. Fill shows after 3.") : `${tn(r.sessions, "{n} class", "{n} classes")} · ${t("{n} booked per class", { n: r.avgBooked })}`}
              onOpen={() => onCard(r.person.id)}
            >
              <Bar
                w={r.fill ?? 0}
                col={r.fill !== null && r.fill < TARGET ? "var(--an-caution)" : "var(--an-fill)"}
                refs={[{ x: TARGET, kind: "target" }, ...(withFill.length > 1 && studio !== null ? [{ x: studio, kind: "avg" as const }] : [])]}
              />
            </PersonBar>
          ))}
        </div>
      </QuestionCard>
      <p className="an5-foot">{t("Based on bookings in this period.")}</p>
    </div>
  );
}

export function RepeatView({ state, onBack, onCard }: ViewProps) {
  const rows = state.stats?.perPerson ?? [];
  return (
    <div>
      <PageHeader crumb={t("Team")} title={t("Return rate")} backLabel={t("Back to Team")} onBack={onBack} />
      {strip(state)}
      <HeadOld
        cells={[
          { v: "–", l: t("Repeat bookers"), dash: true },
          { v: "–", l: t("First-timers back in 30 days"), dash: true },
        ]}
        lead={t("Return rates show once an instructor has 20 bookings.")}
      />
      <QuestionCard
        q={t("Do members come back to this instructor?")}
        cap={t("Top bar: share of an instructor's bookers who booked them again this period. Bottom: of members whose first-ever booking was with them, the share who booked again within 30 days.")}
        after={
          <Accordion title={t("Who turns first-timers into regulars")} summary={t("Not enough first-timers yet.")}>
            <p className="an5-acc-text">{t("This appears once instructors have 5 first-timers each.")}</p>
          </Accordion>
        }
      >
        <Legend items={[{ t: t("Repeat"), kind: "fill" }, { t: t("First-timer return"), kind: "teal" }, { t: t("Studio average"), kind: "avg" }]} />
        <div className="an5-bars">
          {rows.map((r) => (
            <PersonBar
              key={r.person.id}
              p={r}
              value={t("Not enough data yet")}
              valueTone="faint"
              meta={r.booked < MIN_BOOKINGS ? tn(r.booked, "{n} booking so far. Comparisons start at {min}.", "{n} bookings so far. Comparisons start at {min}.", { min: MIN_BOOKINGS }) : tn(r.booked, "{n} booking. Return rates appear here soon.", "{n} bookings. Return rates appear here soon.")}
              onOpen={() => onCard(r.person.id)}
            />
          ))}
        </div>
      </QuestionCard>
      <p className="an5-foot">{t("Based on bookings in this period. Shown once an instructor has 20 bookings.")}</p>
    </div>
  );
}

export function LoadView({ state, range, vocab, onBack, onCard }: ViewProps) {
  const s = state.stats;
  const rows = [...(s?.perPerson ?? [])].sort((a, b) => b.hoursPerWeek - a.hoursPerWeek);
  const teaching = rows.filter((r) => r.sessions > 0);
  const avg = s?.hoursAvg ?? 0;
  const max = Math.max(6, ...rows.map((r) => r.hoursPerWeek));
  const cpw = Math.round(rows.reduce((a, r) => a + r.classesPerWeek, 0) * 10) / 10;
  const single = teaching.length === 1;
  const hi = teaching.filter((r) => r.hoursPerWeek >= avg * 1.3);
  const lo = teaching.filter((r) => r.hoursPerWeek <= avg * 0.7);
  const lead =
    teaching.length === 0
      ? range.key === "week" ? t("No classes taught this week.") : t("No classes taught in this period.")
      : single
        ? t("{name} teaches {n} hours a week.", { name: teaching[0].person.name, n: teaching[0].hoursPerWeek.toFixed(1) })
        : hi.length
          ? t("{name} teaches {pct}% more hours than the team average. {least} teaches the least.", { name: hi[0].person.name, pct: Math.round((hi[0].hoursPerWeek / avg - 1) * 100), least: teaching[teaching.length - 1].person.name })
          : t("Hours are balanced across the team.");
  return (
    <div>
      <PageHeader crumb={t("Team")} title={t("Teaching load")} backLabel={t("Back to Team")} onBack={onBack} />
      {strip(state)}
      <HeadCard
        cells={[
          { v: teaching.length ? t("{n} h", { n: avg.toFixed(1) }) : "–", l: t("Average per week"), dash: !teaching.length },
          { v: String(cpw), l: t("Classes per week") },
        ]}
        lead={lead}
      />
      <QuestionCard
        q={t("Is the schedule balanced across the team?")}
        cap={t("Hours taught per week (class length × classes), {period}. The dashed line is the team average.", { period: period(range) })}
        after={
          <>
            <Accordion title={t("Overloaded and under-used")} summary={single || teaching.length === 0 ? t("No comparison with one instructor.") : t("{hi} overloaded, {lo} under-used.", { hi: hi.length, lo: lo.length })}>
              {[...hi, ...lo].length === 0 ? (
                <p className="an5-acc-text">{t("Nobody teaches far more or far less than the team average.")}</p>
              ) : (
                [...hi.map((r) => ({ r, line: t("{name} may be overloaded", { name: r.person.name }) })), ...lo.map((r) => ({ r, line: t("{name} is under-used", { name: r.person.name }) }))].map(({ r, line }) => (
                  <div key={line} className="an5-rule">
                    <span className="an5-rule-tile" style={{ color: "var(--an-caution-text)", fontSize: 10.5, fontWeight: 800 }}>
                      {t("{n} h", { n: r.hoursPerWeek.toFixed(1) })}
                    </span>
                    <span>
                      <span className="an5-rule-t block">{line}</span>
                      <span className="an5-rule-s block">{t("{n} classes a week.", { n: r.classesPerWeek })}</span>
                    </span>
                  </div>
                ))
              )}
            </Accordion>
            <Accordion title={t("Utilization")} summary={vocab.kind === "store" ? t("Needs staff member availability.") : t("Needs instructor availability.")}>
              <p className="an5-acc-text">
                {t("Utilization (hours taught ÷ hours available, healthy at 75 to 90%) appears once instructors can set their available hours. Centium doesn't record availability yet, so this shows hours taught.")}
              </p>
            </Accordion>
          </>
        }
      >
        <Legend items={[{ t: t("Hours per week"), kind: "fill" }, ...(single ? [] : [{ t: t("Team average {n} h", { n: avg.toFixed(1) }), kind: "avg" as const }])]} />
        <div className="an5-bars">
          {rows.map((r) => {
            const flag = !single && r.sessions > 0 && (r.hoursPerWeek >= avg * 1.3 || r.hoursPerWeek <= avg * 0.7);
            return (
              <PersonBar
                key={r.person.id}
                p={r}
                value={t("{n} h", { n: r.hoursPerWeek.toFixed(1) })}
                valueTone={flag ? "caution" : undefined}
                meta={`${t("{n} classes a week", { n: r.classesPerWeek })}${flag ? (r.hoursPerWeek >= avg * 1.3 ? ` · ${t("well above average")}` : ` · ${t("well below average")}`) : ""}`}
                onOpen={() => onCard(r.person.id)}
              >
                <Bar w={(r.hoursPerWeek / max) * 100} col={flag ? "var(--an-caution)" : "var(--an-fill)"} refs={single ? [] : [{ x: (avg / max) * 100, kind: "avg" }]} />
              </PersonBar>
            );
          })}
        </div>
      </QuestionCard>
      <p className="an5-foot">{t("Based on scheduled class hours.")}</p>
    </div>
  );
}
