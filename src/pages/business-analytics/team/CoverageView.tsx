import { CalendarClock, RefreshCw, UserX } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { range12, time12 } from "../../../utils/time12";
import { Accordion, HeadCard, PageHeader, QuestionCard, Rule, Sk, StatusLine, Strip } from "./parts";
import type { Issue } from "./model";
import type { ClassRow } from "./teamData";
import type { TeamState } from "./useTeam";
import { dayDate } from "./fmt";
import type { Vocab } from "./vocab";
import { t, tk, tn } from "../../../i18n/core";

// AN5-023 (Schedule coverage page, master), AN5-028 / AN5-039 (resolved
// status), AN5-032 (Fix), OURS O1-O6, availability A3 ("Instructor left").
// Real rows: business_classes in the next 14 days of this business only;
// "No instructor" = professional_id null; "Overlap" = the same professional in
// two sessions whose times intersect. The range tabs do not apply (S6).


export function issueRows(state: TeamState): { issue: Issue; kind: string; tone: "high" | "caution"; title: string; sub: string; action: "Assign" | "Fix" }[] {
  const nameOf = (id: string) => state.team?.people.find((p) => p.id === id)?.name ?? state.leftNames.get(id) ?? t("Someone");
  return state.issues.map((issue) => {
    if (issue.kind === "overlap") {
      return {
        issue,
        kind: t("Overlap"),
        tone: "caution",
        title: t("{name} is booked twice on {date}", { name: nameOf(issue.professionalId), date: dayDate(issue.a.date) }),
        sub: t("{a} {aTime} and {b} {bTime}.", { a: issue.a.title, aTime: range12(issue.a.start, issue.a.end), b: issue.b.title, bTime: range12(issue.b.start, issue.b.end) }),
        action: tk("Fix"),
      };
    }
    const c = issue.cls;
    return {
      issue,
      kind: issue.kind === "left" ? t("Instructor left") : t("No instructor"),
      tone: "high",
      title: `${c.title}, ${dayDate(c.date)}, ${time12(c.start)}`,
      sub:
        issue.kind === "left"
          ? t("{name} left your team. Assign someone else.", { name: nameOf(issue.professionalId) })
          : t("{capacity} spots, {booked} booked. Nobody is assigned yet.", { capacity: c.capacity, booked: c.booked }),
      action: tk("Assign"),
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
    ? t("No classes in the next 14 days.")
    : n === 0
      ? t("Every upcoming class has one instructor, with no overlaps.")
      : tn(n, "One class in the next 14 days needs attention.", "{n} classes in the next 14 days need attention.");

  return (
    <div>
      <PageHeader crumb={t("Team")} title={t("Schedule coverage")} backLabel={t("Back to Team")} onBack={onBack} />
      {state.error && (
        <Strip
          offline={state.error === "offline"}
          text={state.error === "offline" ? t("You're offline. Changes need a connection.") : t("Couldn't load coverage. Check your connection and try again.")}
          onRetry={state.reload}
        />
      )}
      {!state.error && !online && <Strip offline text={t("You're offline. Changes need a connection.")} />}
      {state.loading && !state.team ? (
        <CoverageSkeleton />
      ) : (
        <>
          <HeadCard
            cells={[
              { v: String(without), l: vocab.kind === "store" ? t("Without a staff member") : t("Without an instructor") },
              { v: String(overlapsN), l: t("Overlaps") },
            ]}
            lead={lead}
          />
          <QuestionCard
            q={t("Is every upcoming class covered?")}
            cap={t("Sessions in the next 14 days with no instructor, or an instructor in two sessions at once.")}
            after={
              <Accordion title={t("How issues are found")} summary={t("Two kinds of problem, checked on every change.")}>
                <Rule icon={UserX} color="var(--an-high)" title={t("A class has no instructor")} sub={t("Nobody is set to teach it yet.")} />
                <Rule icon={CalendarClock} color="var(--an-caution)" title={t("An instructor is booked twice")} sub={t("Two of their classes overlap in time.")} />
                <Rule icon={RefreshCw} color="var(--an-pdark)" title={t("When we check")} sub={t("Every time you add or change a class, for the next 14 days.")} />
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
                      {t(r.action)}
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
                  {none ? t("Add classes on the Schedule to check coverage.") : t("Every class in the next 14 days has one instructor, with no overlaps.")}
                </p>
              </div>
            )}
          </QuestionCard>
          <p className="an5-foot">{t("Checked every time you add or change a class.")}</p>
        </>
      )}
    </div>
  );
}

function CoverageSkeleton() {
  return (
    <div aria-busy="true" aria-label={t("Loading")}>
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
