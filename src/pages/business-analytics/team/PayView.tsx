import { ChevronRight, Wallet } from "lucide-react";
import { useState } from "react";
import { Accordion, Avatar, HeadCard, PageHeader, QuestionCard, Strip } from "./parts";
import { money } from "./fmt";
import type { TeamState } from "./useTeam";
import type { Vocab } from "./vocab";

// AN5-065 Team › Pay. Pay = business_employees.pay_rate_per_class (B6; NULL
// means not agreed) × classes taught in range. The rate is set on the Team
// person page (Role card › Pay per class, set_employee_terms, B6 follow-up)
// and read here through the Team service; with none set this shows the drawn
// "No pay data yet" state (row 11). Revenue per class needs recorded booking payments (B8), so
// the revenue-vs-pay block is not shown until then.

const PAY_ESTIMATE_NOTE = "An estimate from each instructor's agreed rate, not payouts you recorded.";

export function PayView({ state, vocab, onBack, onCard }: { state: TeamState; vocab: Vocab; onBack: () => void; onCard: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const rows = (state.stats?.perPerson ?? [])
    .filter((p) => p.person.payRate !== null)
    .map((p) => ({ p, rate: p.person.payRate as number, pay: (p.person.payRate as number) * p.sessions }))
    .sort((a, b) => b.pay - a.pay);
  const noPay = rows.length === 0;
  const total = rows.reduce((a, r) => a + r.pay, 0);
  const classes = rows.reduce((a, r) => a + r.p.sessions, 0);
  const avg = classes ? Math.round(total / classes) : 0;
  const maxPay = Math.max(1, ...rows.map((r) => r.pay));
  const listed = all ? rows : rows.slice(0, 3);

  return (
    <div>
      <PageHeader crumb="Team" title="Pay" backLabel="Back to Team" onBack={onBack} />
      {state.error && (
        <Strip offline={state.error === "offline"} text={state.error === "offline" ? "You're offline. Showing your team as of the last update." : "Couldn't load your team. Check your connection and try again."} onRetry={state.reload} />
      )}
      <HeadCard
        cells={
          noPay
            ? [
                { v: "–", l: "Total pay", dash: true },
                { v: "–", l: "Average pay per class", dash: true },
              ]
            : [
                { v: money(total), l: "Total pay" },
                { v: money(avg), l: "Average pay per class" },
              ]
        }
        lead={noPay ? "No pay data yet." : `${rows[0].p.person.name} earns ${money(rows[0].rate)} a class.`}
      />
      <QuestionCard
        q="What does each instructor cost and earn per class?"
        cap={noPay ? undefined : `Pay uses each instructor's rate. Revenue is what ${vocab.payers} paid for their classes.`}
        after={
          noPay ? undefined : (
            <Accordion title="How pay is counted" summary="Rate × classes taught.">
              <p className="an5-acc-text">
                Each instructor's pay is their rate per class times the classes they taught. Revenue is what {vocab.payers} paid for those classes. Profit is revenue minus pay.
              </p>
            </Accordion>
          )
        }
      >
        {noPay ? (
          <div className="an5-emptyblock">
            <span className="an5-emptyblock-tile">
              <Wallet size={20} aria-hidden />
            </span>
            <p className="an5-emptyblock-t">No pay data yet</p>
            <p className="an5-emptyblock-s">Set a pay rate for each instructor to see what every class costs and earns.</p>
          </div>
        ) : (
          <>
            <p className="an5-q" style={{ marginTop: 14 }}>
              Pay per instructor
            </p>
            {rows.map((r) => (
              <div key={r.p.person.id} className="an5-barrow">
                <Avatar name={r.p.person.name} seat={r.p.person.seat} />
                <span className="min-w-0 block">
                  <span className="an5-barrow-head">
                    <span className="an5-name">{r.p.person.name}</span>
                    <span className="an5-amt">{money(r.pay)}</span>
                  </span>
                  <span className="an5-track">
                    <span className="an5-bar-fill" style={{ width: `${(r.pay / maxPay) * 100}%` }} />
                  </span>
                  <span className="an5-meta block">
                    {r.p.sessions} classes · {money(r.rate)} a class
                  </span>
                </span>
              </div>
            ))}
            <p className="an5-q" style={{ marginTop: 14 }}>
              By instructor
            </p>
            {listed.map((r) => (
              <button key={r.p.person.id} type="button" className="an5-barrow tap" style={{ gridTemplateColumns: "36px minmax(0,1fr) auto 16px", alignItems: "center", minHeight: 56 }} onClick={() => onCard(r.p.person.id)}>
                <Avatar name={r.p.person.name} seat={r.p.person.seat} size={36} />
                <span className="min-w-0 block">
                  <span className="an5-name block">{r.p.person.name}</span>
                  <span className="an5-meta block" style={{ marginTop: 0, fontSize: 11.5 }}>
                    {r.p.sessions} classes
                  </span>
                </span>
                <span className="an5-amt" style={{ fontSize: 13 }}>
                  {money(r.pay)}
                </span>
                <ChevronRight size={15} style={{ color: "var(--an-tert)" }} aria-hidden />
              </button>
            ))}
            {rows.length > 3 && !all && (
              <button type="button" className="an5-more tap" onClick={() => setAll(true)}>
                See all {rows.length}
                <ChevronRight size={14} aria-hidden />
              </button>
            )}
          </>
        )}
      </QuestionCard>
      {!noPay && <p className="an5-foot">Based on classes taught in this period.</p>}
      {/* M3 (OURS-AN5 O6): "Total pay" is rate × classes, not payroll records. */}
      {!noPay && (
        <p className="an5-foot" data-pay-estimate style={{ marginTop: 4 }}>
          {PAY_ESTIMATE_NOTE}
        </p>
      )}
    </div>
  );
}
