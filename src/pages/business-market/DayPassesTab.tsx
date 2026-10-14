import { useNavigate } from "react-router-dom";
import { Gift, Ticket } from "lucide-react";
import { PLANS_ROUTE } from "../business-ops/plans";
import type { MembershipPlanRow } from "../../services/membership-plans";
import { useMarket } from "./MarketContext";
import { lh, MBlock, MCard, MEmpty, MError, MLabel, MSwitch, px } from "./kit";

// OURS-MA1-gym-day-passes (V6-87): the Gym's second tab, built from the
// MA1-003 summary card and the MA1-007 offer card. Day passes are
// membership_plans with daily billing (the app's current rule, planKindOf).
// B7 (MB-03, not on the stack) adds plan_type (intro offers) and
// visible_on_explore: until then the "Show on Explore" switches are drawn
// disabled, Intro offers shows only when a plan says so, and the three
// summary figures, which need pass sales by source, read "–". No week strip
// (row 7: it means nothing for passes).

export function DayPassesTab() {
  const m = useMarket();
  const { c, plans, business } = m;
  const navigate = useNavigate();
  const flagsLive = m.backend.planFlags === "live";

  if (plans.error && plans.plans.length === 0) return <MError c={c} onRetry={m.reload} />;
  if (plans.loading && plans.plans.length === 0) {
    return (
      <div aria-busy="true" aria-label="Loading your passes">
        <MBlock c={c} h={63.5} r={20} style={{ marginBottom: 12 }} />
        <MBlock c={c} h={103} r={20} style={{ marginBottom: 8 }} />
        <MBlock c={c} h={103} r={20} />
      </div>
    );
  }

  const passes = plans.plans.filter((p) => p.kind === "day_pass");
  const intros = plans.plans.filter((p) => p.kind === "intro_offer");
  const cells = [
    { v: "–", l: "Sold today" },
    { v: "–", l: "Live on Explore" },
    { v: "–", l: "From Centium" },
  ];
  const listed = !!business?.active;

  return (
    <div style={{ paddingBottom: 8 }}>
      <MCard c={c} r={20} style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", overflow: "hidden", marginBottom: 12 }}>
        {cells.map((x, i) => (
          <div key={x.l} style={{ padding: "12px 8px", textAlign: "center", borderLeft: i ? `1px solid ${c.divider}` : "none" }}>
            <p style={{ fontSize: px(20), fontWeight: 800, lineHeight: lh(24), fontVariantNumeric: "tabular-nums", color: c.tert }}>{x.v}</p>
            <p style={{ fontSize: px(10.5), color: c.faint, lineHeight: lh(14) }}>{x.l}</p>
          </div>
        ))}
      </MCard>
      {passes.length === 0 && intros.length === 0 ? (
        <MEmpty
          c={c}
          icon={Ticket}
          title="No day passes yet"
          body="Add a day pass in Front desk > Memberships and choose whether it shows on Explore."
          action={{ label: "Add a day pass", onClick: () => navigate(PLANS_ROUTE) }}
        />
      ) : (
        <>
          {passes.length > 0 && (
            <>
              <MLabel c={c}>Day passes</MLabel>
              {passes.map((p) => (
                <PassCard key={p.id} p={p} icon="ticket" listed={listed} flagsLive={flagsLive} />
              ))}
            </>
          )}
          {intros.length > 0 && (
            <>
              <MLabel c={c} margin="16px 0 8px">
                Intro offers
              </MLabel>
              {intros.map((p) => (
                <PassCard key={p.id} p={p} icon="gift" listed={listed} flagsLive={flagsLive} sub={`For people new to ${business?.name ?? "you"}`} />
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function PassCard({ p, icon, listed, flagsLive, sub }: { p: MembershipPlanRow; icon: "ticket" | "gift"; listed: boolean; flagsLive: boolean; sub?: string }) {
  const { c } = useMarket();
  const Icon = icon === "gift" ? Gift : Ticket;
  const on = listed;
  return (
    <MCard c={c} r={20} style={{ padding: "12px 14px", marginBottom: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ width: 36, height: 36, borderRadius: 12, background: c.pale, color: c.pDark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={17} strokeWidth={2} aria-hidden />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: px(13.5), fontWeight: 800, color: c.ink, lineHeight: lh(20) }}>{`${p.name} · ${p.price}`}</span>
          {sub && <span style={{ display: "block", fontSize: px(11.5), color: c.faint, lineHeight: lh(16) }}>{sub}</span>}
        </span>
        <MSwitch c={c} on={on} onChange={() => undefined} label={`Show ${p.name} on Explore`} disabled={!flagsLive} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTop: `1px solid ${c.divider}` }}>
        <span style={{ fontSize: px(10.5), fontWeight: 700, color: c.faint }}>On your card:</span>
        <span style={{ fontSize: px(10), fontWeight: 800, color: on ? c.pDark : c.faint, background: on ? c.pale : c.soft, borderRadius: 999, padding: "2px 8px", opacity: on ? 1 : 0.6 }}>{p.name}</span>
      </div>
    </MCard>
  );
}
