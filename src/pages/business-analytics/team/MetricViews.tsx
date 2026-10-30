import { heroRangeLabel, type AnalyticsRange } from "../shell/range";
import { MIN_BOOKINGS, TARGET, type InstructorStats } from "./model";
import { Accordion, Avatar, HeadCard, HeadOld, PageHeader, QuestionCard, Strip } from "./parts";
import type { TeamState } from "./useTeam";
import type { Vocab } from "./vocab";

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
        <span key={r.kind} className={`an5-ref is-${r.kind}`} style={{ left: `${Math.max(0, Math.min(100, r.x))}%` }} aria-hidden />
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
    <button type="button" className="an5-barrow tap" aria-label={`Open scorecard for ${p.person.name}`} onClick={onOpen}>
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
      text={state.error === "offline" ? "You're offline. Showing your team as of the last update." : "Couldn't load your team. Check your connection and try again."}
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
      ? "Fill rates show once an instructor has taught 3 classes."
      : withFill.length === 1
        ? `${top.person.name} fills ${top.fill}% of spots, compared with your 70% target.`
        : `${top.person.name} fills ${top.fill}% of spots, ${Math.abs((top.fill as number) - (studio ?? 0))} points ${(top.fill as number) >= (studio ?? 0) ? "above" : "below"} the studio average.` +
          ((bottom.fill as number) < TARGET ? ` ${bottom.person.name} is ${TARGET - (bottom.fill as number)} points under target.` : "");
  const under = withFill.filter((r) => (r.fill as number) < TARGET);
  return (
    <div>
      <PageHeader crumb="Team" title="Instructor performance" backLabel="Back to Team" onBack={onBack} />
      {strip(state)}
      <HeadOld
        cells={[
          { v: studio === null ? "–" : `${studio}%`, l: "Studio fill rate", dash: studio === null },
          { v: withFill.length ? `${s?.onTarget ?? 0} of ${withFill.length}` : "–", l: "At or above 70%", dash: !withFill.length },
        ]}
        lead={lead}
      />
      <QuestionCard
        q="Which instructors fill their classes?"
        cap={`Booked spots ÷ capacity across each instructor's classes, ${period(range)}. Highest first. Tap a row for their scorecard.`}
        after={
          <Accordion title="Below target" summary={under.length ? `${under.length} ${under.length === 1 ? "instructor is" : "instructors are"} under 70%.` : "Everyone is at or above 70%."}>
            {under.length === 0 ? (
              <p className="an5-acc-text">Everyone with 3 or more classes fills at least 70% of spots.</p>
            ) : (
              under.map((r) => (
                <div key={r.person.id} className="an5-rule">
                  <span className="an5-rule-tile" style={{ color: "var(--an-caution-text)", fontSize: 11, fontWeight: 800 }}>
                    {r.fill}%
                  </span>
                  <span>
                    <span className="an5-rule-t block">{r.person.name}</span>
                    <span className="an5-rule-s block">
                      {r.sessions} classes · {r.avgBooked} booked per class
                    </span>
                  </span>
                </div>
              ))
            )}
          </Accordion>
        }
      >
        <Legend items={[{ t: "Fill rate", kind: "fill" }, { t: "70% target", kind: "target" }, ...(withFill.length > 1 && studio !== null ? [{ t: `Studio average ${studio}%`, kind: "avg" as const }] : [])]} />
        <div className="an5-bars">
          {rows.map((r) => (
            <PersonBar
              key={r.person.id}
              p={r}
              value={r.fill === null ? "–" : `${r.fill}%`}
              valueTone={r.fill === null ? "faint" : r.fill < TARGET ? "caution" : undefined}
              meta={r.fill === null ? `${r.sessions} ${r.sessions === 1 ? "class" : "classes"} so far. Fill shows after 3.` : `${r.sessions} classes · ${r.avgBooked} booked per class`}
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
      <p className="an5-foot">Based on bookings in this period.</p>
    </div>
  );
}

export function RepeatView({ state, onBack, onCard }: ViewProps) {
  const rows = state.stats?.perPerson ?? [];
  return (
    <div>
      <PageHeader crumb="Team" title="Return rate" backLabel="Back to Team" onBack={onBack} />
      {strip(state)}
      <HeadOld
        cells={[
          { v: "–", l: "Repeat bookers", dash: true },
          { v: "–", l: "First-timers back in 30 days", dash: true },
        ]}
        lead="Return rates show once an instructor has 20 bookings."
      />
      <QuestionCard
        q="Do members come back to this instructor?"
        cap="Top bar: share of an instructor's bookers who booked them again this period. Bottom: of members whose first-ever booking was with them, the share who booked again within 30 days."
        after={
          <Accordion title="Who turns first-timers into regulars" summary="Not enough first-timers yet.">
            <p className="an5-acc-text">This appears once instructors have 5 first-timers each.</p>
          </Accordion>
        }
      >
        <Legend items={[{ t: "Repeat", kind: "fill" }, { t: "First-timer return", kind: "teal" }, { t: "Studio average", kind: "avg" }]} />
        <div className="an5-bars">
          {rows.map((r) => (
            <PersonBar
              key={r.person.id}
              p={r}
              value="Not enough data yet"
              valueTone="faint"
              meta={r.booked < MIN_BOOKINGS ? `${r.booked} bookings so far. Comparisons start at ${MIN_BOOKINGS}.` : `${r.booked} bookings. Return rates appear here soon.`}
              onOpen={() => onCard(r.person.id)}
            />
          ))}
        </div>
      </QuestionCard>
      <p className="an5-foot">Based on bookings in this period. Shown once an instructor has 20 bookings.</p>
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
      ? `No classes taught ${period(range) === "this week" ? "this week" : "in this period"}.`
      : single
        ? `${teaching[0].person.name} teaches ${teaching[0].hoursPerWeek.toFixed(1)} hours a week.`
        : hi.length
          ? `${hi[0].person.name} teaches ${Math.round((hi[0].hoursPerWeek / avg - 1) * 100)}% more hours than the team average. ${teaching[teaching.length - 1].person.name} teaches the least.`
          : "Hours are balanced across the team.";
  return (
    <div>
      <PageHeader crumb="Team" title="Teaching load" backLabel="Back to Team" onBack={onBack} />
      {strip(state)}
      <HeadCard
        cells={[
          { v: teaching.length ? `${avg.toFixed(1)} h` : "–", l: "Average per week", dash: !teaching.length },
          { v: String(cpw), l: "Classes per week" },
        ]}
        lead={lead}
      />
      <QuestionCard
        q="Is the schedule balanced across the team?"
        cap={`Hours taught per week (class length × classes), ${period(range)}. The dashed line is the team average.`}
        after={
          <>
            <Accordion title="Overloaded and under-used" summary={single || teaching.length === 0 ? "No comparison with one instructor." : `${hi.length} overloaded, ${lo.length} under-used.`}>
              {[...hi, ...lo].length === 0 ? (
                <p className="an5-acc-text">Nobody teaches far more or far less than the team average.</p>
              ) : (
                [...hi.map((r) => ({ r, t: `${r.person.name} may be overloaded` })), ...lo.map((r) => ({ r, t: `${r.person.name} is under-used` }))].map(({ r, t }) => (
                  <div key={t} className="an5-rule">
                    <span className="an5-rule-tile" style={{ color: "var(--an-caution-text)", fontSize: 10.5, fontWeight: 800 }}>
                      {r.hoursPerWeek.toFixed(1)} h
                    </span>
                    <span>
                      <span className="an5-rule-t block">{t}</span>
                      <span className="an5-rule-s block">{r.classesPerWeek} classes a week.</span>
                    </span>
                  </div>
                ))
              )}
            </Accordion>
            <Accordion title="Utilization" summary={`Needs ${vocab.singular} availability.`}>
              <p className="an5-acc-text">
                Utilization (hours taught ÷ hours available, healthy at 75 to 90%) appears once instructors can set their available hours. Centium doesn't record availability yet, so this shows hours taught.
              </p>
            </Accordion>
          </>
        }
      >
        <Legend items={[{ t: "Hours per week", kind: "fill" }, ...(single ? [] : [{ t: `Team average ${avg.toFixed(1)} h`, kind: "avg" as const }])]} />
        <div className="an5-bars">
          {rows.map((r) => {
            const flag = !single && r.sessions > 0 && (r.hoursPerWeek >= avg * 1.3 || r.hoursPerWeek <= avg * 0.7);
            return (
              <PersonBar
                key={r.person.id}
                p={r}
                value={`${r.hoursPerWeek.toFixed(1)} h`}
                valueTone={flag ? "caution" : undefined}
                meta={`${r.classesPerWeek} classes a week${flag ? (r.hoursPerWeek >= avg * 1.3 ? " · well above average" : " · well below average") : ""}`}
                onOpen={() => onCard(r.person.id)}
              >
                <Bar w={(r.hoursPerWeek / max) * 100} col={flag ? "var(--an-caution)" : "var(--an-fill)"} refs={single ? [] : [{ x: (avg / max) * 100, kind: "avg" }]} />
              </PersonBar>
            );
          })}
        </div>
      </QuestionCard>
      <p className="an5-foot">Based on scheduled class hours.</p>
    </div>
  );
}
