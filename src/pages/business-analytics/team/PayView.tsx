import { ChevronRight, Wallet } from "lucide-react";
import { useState } from "react";
import { Accordion, Avatar, HeadCard, PageHeader, QuestionCard, Strip } from "./parts";
import { money } from "./fmt";
import type { TeamState } from "./useTeam";
import type { Vocab } from "./vocab";
import { useAnalytics } from "../shell/AnalyticsContext";
import { useScorecard } from "./useScorecard";
import { payRowsOf } from "./payRows";
import { t, tk, tn } from "../../../i18n/core";

// AN5-065 Team › Pay (AnTeamV6 k === "pay", l.469-486; markup l.216-247).
// B15 instructor_scorecard (TM-04, gate revenue) gives, per instructor for
// the range, the classes taught, pay (business_employees.pay_rate_per_class
// × classes; NULL rate = not agreed) and the recorded revenue from their
// classes, so the "Revenue vs pay per class" block (row 7) is drawn from it.
// Without the reader (missing, or no revenue permission) the page keeps the
// rate × classes estimate from the Team service and no revenue. The rate is
// set on the Team person page (set_employee_terms). With no rate this shows
// the drawn "No pay data yet" state (row 11).

const PAY_ESTIMATE_NOTE = tk("An estimate from each instructor's agreed rate, not payouts you recorded.");
/** "$141" / "−$12" (U+2212 minus). */
const signedMoney = (n: number) => (n < 0 ? `−${money(Math.abs(n))}` : money(n));

export function PayView({ state, vocab, onBack, onCard }: { state: TeamState; vocab: Vocab; onBack: () => void; onCard: (id: string) => void }) {
  const [all, setAll] = useState(false);
  const { range } = useAnalytics();
  const sc = useScorecard(state.businessId, range);
  const people = state.stats?.perPerson ?? [];
  const { rows, total, avg } = payRowsOf(sc.rows, people);
  const noPay = rows.length === 0;
  // Row 7: revenue a class (recorded revenue ÷ classes) against the rate.
  const withRev = rows.some((r) => r.revenue !== null);
  const pairs = rows.map((r) => {
    const rev = r.classes ? Math.round((r.revenue ?? 0) / r.classes) : 0;
    return { r, rev, prof: rev - r.rate };
  });
  const mxR = Math.max(1, ...pairs.map((x) => Math.max(x.rev, x.r.rate)));
  const best = [...pairs].sort((a, b) => b.prof - a.prof)[0];
  const maxPay = Math.max(1, ...rows.map((r) => r.pay));
  const listed = all ? rows : rows.slice(0, 3);

  return (
    <div>
      <PageHeader crumb={t("Team")} title={t("Pay")} backLabel={t("Back to Team")} onBack={onBack} />
      {state.error && (
        <Strip offline={state.error === "offline"} text={state.error === "offline" ? t("You're offline. Showing your team as of the last update.") : t("Couldn't load your team. Check your connection and try again.")} onRetry={state.reload} />
      )}
      <HeadCard
        cells={
          noPay
            ? [
                { v: "–", l: t("Total pay"), dash: true },
                { v: "–", l: t("Average pay per class"), dash: true },
              ]
            : [
                { v: money(total), l: t("Total pay") },
                { v: money(avg), l: t("Average pay per class") },
              ]
        }
        lead={
          noPay
            ? t("No pay data yet.")
            : withRev && rows.length === 1
              ? t("{name} earns {rate} a class and each class makes {profit} after pay.", { name: rows[0].p.person.name, rate: money(rows[0].rate), profit: signedMoney(pairs[0].prof) })
              : withRev && best
                ? t("{name}'s classes make the most after pay, {profit} a class.", { name: best.r.p.person.name, profit: signedMoney(best.prof) })
                : t("{name} earns {rate} a class.", { name: rows[0].p.person.name, rate: money(rows[0].rate) })
        }
      />
      <QuestionCard
        q={t("What does each instructor cost and earn per class?")}
        cap={noPay ? undefined : vocab.payers === "customers" ? t("Pay uses each instructor's rate. Revenue is what customers paid for their classes.") : vocab.payers === "clients" ? t("Pay uses each instructor's rate. Revenue is what clients paid for their classes.") : t("Pay uses each instructor's rate. Revenue is what members paid for their classes.")}
        after={
          noPay ? undefined : (
            <Accordion title={t("How pay is counted")} summary={t("Rate × classes taught.")}>
              <p className="an5-acc-text">
                {vocab.payers === "customers"
                  ? t("Each instructor's pay is their rate per class times the classes they taught. Revenue is what customers paid for those classes. Profit is revenue minus pay.")
                  : vocab.payers === "clients"
                    ? t("Each instructor's pay is their rate per class times the classes they taught. Revenue is what clients paid for those classes. Profit is revenue minus pay.")
                    : t("Each instructor's pay is their rate per class times the classes they taught. Revenue is what members paid for those classes. Profit is revenue minus pay.")}
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
            <p className="an5-emptyblock-t">{t("No pay data yet")}</p>
            <p className="an5-emptyblock-s">{t("Set a pay rate for each instructor to see what every class costs and earns.")}</p>
          </div>
        ) : (
          <>
            <p className="an5-q" style={{ marginTop: 14 }}>
              {t("Pay per instructor")}
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
                    {tn(r.classes, "{n} class", "{n} classes")} · {t("{amount} a class", { amount: money(r.rate) })}
                  </span>
                </span>
              </div>
            ))}
            {withRev && (
              <>
                <div data-rev-vs-pay style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
                  <p className="an5-q">{t("Revenue vs pay per class")}</p>
                  <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 10.5, color: "var(--an-faint)", whiteSpace: "nowrap" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 6, borderRadius: 999, background: "var(--an-fill)" }} />
                      {t("Revenue")}
                    </span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 10, height: 6, borderRadius: 999, background: "var(--an-tert)" }} />
                      {t("Pay")}
                    </span>
                  </span>
                </div>
                {pairs.map((x, i) => (
                  <div key={x.r.p.person.id} style={{ padding: "10px 0", borderTop: i ? "1px solid var(--an-divider)" : "none" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", columnGap: 8, alignItems: "baseline" }}>
                      <p style={{ fontSize: 12.5, fontWeight: 700 }}>{x.r.p.person.name}</p>
                      <p style={{ fontSize: 11.5, fontWeight: 800, whiteSpace: "nowrap", color: x.prof > 0 ? "var(--an-good)" : "var(--an-ink-soft)" }}>{t("{amount} profit a class", { amount: signedMoney(x.prof) })}</p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 40px", columnGap: 8, alignItems: "center", marginTop: 6 }}>
                      <div style={{ height: 7, borderRadius: 999, background: "var(--an-track)" }}>
                        <div style={{ height: "100%", width: `${Math.round((Math.max(0, x.rev) / mxR) * 100)}%`, borderRadius: 999, background: "var(--an-fill)" }} />
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 800, textAlign: "end", fontVariantNumeric: "tabular-nums" }}>{money(x.rev)}</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 40px", columnGap: 8, alignItems: "center", marginTop: 4 }}>
                      <div style={{ height: 7, borderRadius: 999, background: "var(--an-track)" }}>
                        <div style={{ height: "100%", width: `${Math.round((x.r.rate / mxR) * 100)}%`, borderRadius: 999, background: "var(--an-tert)" }} />
                      </div>
                      <span style={{ fontSize: 10.5, fontWeight: 800, textAlign: "end", fontVariantNumeric: "tabular-nums", color: "var(--an-ink-soft)" }}>{money(x.r.rate)}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
            <p className="an5-q" style={{ marginTop: 14 }}>
              {t("By instructor")}
            </p>
            {listed.map((r) => (
              <button key={r.p.person.id} type="button" className="an5-barrow tap" style={{ gridTemplateColumns: "36px minmax(0,1fr) auto 16px", alignItems: "center", minHeight: 56 }} onClick={() => onCard(r.p.person.id)}>
                <Avatar name={r.p.person.name} seat={r.p.person.seat} size={36} />
                <span className="min-w-0 block">
                  <span className="an5-name block">{r.p.person.name}</span>
                  <span className="an5-meta block" style={{ marginTop: 0, fontSize: 11.5 }}>
                    {r.revenue === null ? tn(r.classes, "{n} class", "{n} classes") : `${tn(r.classes, "{n} class", "{n} classes")} · ${t("profit {amount}", { amount: signedMoney(r.revenue - r.pay) })}`}
                  </span>
                </span>
                <span className="an5-amt" style={{ fontSize: 13 }}>
                  {money(r.pay)}
                </span>
                <ChevronRight className="rtl:-scale-x-100" size={15} style={{ color: "var(--an-tert)" }} aria-hidden />
              </button>
            ))}
            {rows.length > 3 && !all && (
              <button type="button" className="an5-more tap" onClick={() => setAll(true)}>
                {t("See all {n}", { n: rows.length })}
                <ChevronRight className="rtl:-scale-x-100" size={14} aria-hidden />
              </button>
            )}
          </>
        )}
      </QuestionCard>
      {!noPay && <p className="an5-foot">{t("Based on classes taught in this period.")}</p>}
      {/* M3 (OURS-AN5 O6): "Total pay" is rate × classes, not payroll records. */}
      {!noPay && (
        <p className="an5-foot" data-pay-estimate style={{ marginTop: 4 }}>
          {t(PAY_ESTIMATE_NOTE)}
        </p>
      )}
    </div>
  );
}
