import { CalendarClock, RefreshCw, UserX } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { range12, time12 } from "../../../utils/time12";
import { Accordion, HeadCard, PageHeader, QuestionCard, Rule, Sk, StatusLine, Strip } from "./parts";
import type { Issue } from "./model";
import type { ClassRow } from "./teamData";
import type { TeamState } from "./useTeam";
import { dayDate } from "./fmt";
import type { Vocab } from "./vocab";

// AN5-023 (Schedule coverage page, master), AN5-028 / AN5-039 (resolved
// status), AN5-032 (Fix), OURS O1-O6, availability A3 ("Instructor left").
// Real rows: business_classes in the next 14 days of this business only;
// "No instructor" = professional_id null; "Overlap" = the same professional in
// two sessions whose times intersect. The range tabs do not apply (S6).

const LEADS = ["", "One class in the next 14 days needs attention.", "Two classes in the next 14 days need attention."];

export function issueRows(state: TeamState): { issue: Issue; kind: string; tone: "high" | "caution"; title: string; sub: string; action: "Assign" | "Fix" }[] {
  const nameOf = (id: string) => state.team?.people.find((p) => p.id === id)?.name ?? state.leftNames.get(id) ?? "Someone";
  return state.issues.map((issue) => {
    if (issue.kind === "overlap") {
      return {
        issue,
        kind: "Overlap",
        tone: "caution",
        title: `${nameOf(issue.professionalId)} is booked twice on ${dayDate(issue.a.date)}`,
        sub: `${issue.a.title} ${range12(issue.a.start, issue.a.end)} and ${issue.b.title} ${range12(issue.b.start, issue.b.end)}.`,
        action: "Fix",
      };
    }
    const c = issue.cls;
    return {
      issue,
      kind: issue.kind === "left" ? "Instructor left" : "No instructor",
      tone: "high",
      title: `${c.title}, ${dayDate(c.date)}, ${time12(c.start)}`,
      sub:
        issue.kind === "left"
          ? `${nameOf(issue.professionalId)} left your team. Assign someone else.`
          : `${c.capacity} spots, ${c.booked} booked. Nobody is assigned yet.`,
      action: "Assign",
    };
  });
}

export function CoverageView({
  state,
  vocab,
  status,
  onBack,
  onAssign,
  onFix,
}: {
  state: TeamState;
  vocab: Vocab;
  status: string | null;
  onBack: () => void;
  onAssign: (c: ClassRow) => void;
  onFix: (issue: Extract<Issue, { kind: "overlap" }>) => void;
}) {
  const online = useOnline();
  const rows = issueRows(state);
  const without = state.issues.filter((i) => i.kind !== "overlap").length;
  const overlapsN = state.issues.length - without;
  const n = state.issues.length;
  const none = state.upcoming.length === 0;
  const lead = none
    ? "No classes in the next 14 days."
    : n === 0
      ? "Every upcoming class has one instructor, with no overlaps."
      : n < 3
        ? LEADS[n]
        : `${n} classes in the next 14 days need attention.`;

  return (
    <div>
      <PageHeader crumb="Team" title="Schedule coverage" backLabel="Back to Team" onBack={onBack} />
      {state.error && (
        <Strip
          offline={state.error === "offline"}
          text={state.error === "offline" ? "You're offline. Changes need a connection." : "Couldn't load coverage. Check your connection and try again."}
          onRetry={state.reload}
        />
      )}
      {!state.error && !online && <Strip offline text="You're offline. Changes need a connection." />}
      {state.loading && !state.team ? (
        <CoverageSkeleton />
      ) : (
        <>
          <HeadCard
            cells={[
              { v: String(without), l: `Without an ${vocab.singular}` },
              { v: String(overlapsN), l: "Overlaps" },
            ]}
            lead={lead}
          />
          <QuestionCard
            q="Is every upcoming class covered?"
            cap="Sessions in the next 14 days with no instructor, or an instructor in two sessions at once."
            after={
              <Accordion title="How issues are found" summary="Two kinds of problem, checked on every change.">
                <Rule icon={UserX} color="var(--an-high)" title="A class has no instructor" sub="Nobody is set to teach it yet." />
                <Rule icon={CalendarClock} color="var(--an-caution)" title="An instructor is booked twice" sub="Two of their classes overlap in time." />
                <Rule icon={RefreshCw} color="var(--an-pdark)" title="When we check" sub="Every time you add or change a class, for the next 14 days." />
              </Accordion>
            }
          >
            {status && <StatusLine text={status} />}
            {rows.length > 0 ? (
              <div className="an5-issues">
                {rows.map((r, i) => (
                  <div key={i} className="an5-issue">
                    <span className={`an5-issue-bar bg-${r.tone}`} aria-hidden />
                    <div className="min-w-0">
                      <p className={`an5-issue-kind is-${r.tone}`}>{r.kind}</p>
                      <p className="an5-issue-t">{r.title}</p>
                      <p className="an5-issue-s">{r.sub}</p>
                    </div>
                    <button
                      type="button"
                      className="an5-act tap"
                      aria-disabled={!online || undefined}
                      onClick={() => {
                        if (!online) return;
                        if (r.issue.kind === "overlap") onFix(r.issue);
                        else onAssign(r.issue.cls);
                      }}
                    >
                      {r.action}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="an5-noiss">
                {!none && (
                  <span className="an5-noiss-ic">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                )}
                <p className="an5-noiss-t">
                  {none ? "Add classes on the Schedule to check coverage." : "Every class in the next 14 days has one instructor, with no overlaps."}
                </p>
              </div>
            )}
          </QuestionCard>
          <p className="an5-foot">Checked every time you add or change a class.</p>
        </>
      )}
    </div>
  );
}

function CoverageSkeleton() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="an5-card an5-head" style={{ padding: "18px 20px" }}>
        <div className="flex justify-around">
          <Sk w={30} h={32} />
          <Sk w={30} h={32} />
        </div>
        <Sk w={220} h={12} style={{ marginTop: 26 }} />
      </div>
      <div className="an5-card" style={{ padding: "14px 16px" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className="an5-issue">
            <span className="an5-issue-bar" style={{ background: "var(--an-soft)" }} />
            <div className="flex flex-col gap-2">
              <Sk w={160} h={13} />
              <Sk w={220} h={11} />
            </div>
            <Sk w={64} h={44} r={12} />
          </div>
        ))}
      </div>
    </div>
  );
}
