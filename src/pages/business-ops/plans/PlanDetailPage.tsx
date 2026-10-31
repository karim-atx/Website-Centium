import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRightLeft, CalendarClock, CalendarDays, Gauge, Hash, Repeat, Sun, UserCheck, type LucideIcon } from "lucide-react";
import { MarketEmptyCard, MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { hasInAppHistory } from "../../../hooks/useBack";
import { useOnline } from "../../../hooks/useOnline";
import { linePx, textPx } from "../../../theme/textSize";
import type { MembershipPlanRow } from "../../../services/membership-plans";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { planData } from "../../../components/share/business/bizCardModel";
import { BackHeader, CapsLabel } from "../../business-market/listingParts";
import { KIND_LABEL, cardMeta, classesLabel, commitmentLabel, daysLabel, joinAnd, limitLabel, memberLine, priceLine, renewsLabel, renewsSub, shortDate, statusLine, untilLabel } from "./planModel";
import { PLANS_ROUTE, PlansStrip } from "./MembershipsTab";
import { PlanSheet } from "./PlanSheet";
import { usePlansCtx, type PlanAction } from "./PlansContext";
import { MemberNote, MemberRows, PlanFocusCss, PlanMenuButton, SeeAllRow, StatusChip, usePlanColors } from "./ui";

// Market + Share 3.0 · W3 · the plan page (KEPT, PLAN §3.4 "PlanDetailPage"),
// restyled in the B-MA.5 chrome: the handover back header ("Memberships" /
// the plan's name) with the share button and the plan menu; the plan card
// (radius 20: price 14 / 800, "{duration} · {included}" 11.5 --faint, the
// status chip and line); caps "Who it covers" over a radius 24 card of rows
// (title 13.5 / 700, sub 11.5 --faint, value 12.5 / 800); caps "Members on
// this plan · {n}" over the member rows (avatar 34 --tealbg / --tealink,
// "Joined {date}", "Until {date}"). Reached by tapping a plan card.

const MEMBERS_SHOWN = 4;

function coverRows(plan: MembershipPlanRow, runsClasses: boolean, nameOf: (id: string) => string | null): { icon: LucideIcon; title: string; sub: string; value: string }[] {
  const classes = plan.allowedClassTypes;
  const covers = classes
    ? { icon: CalendarDays, title: "Covers", sub: joinAnd(classes), value: classesLabel(classes) }
    : runsClasses
      ? { icon: CalendarDays, title: "Covers", sub: "Every class on your schedule", value: "All classes" }
      : { icon: Sun, title: "Covers", sub: "Entry to the gym", value: "Gym entry" };
  const anyone = { icon: UserCheck, title: "Who can buy", sub: "Anyone on Explore", value: "Anyone" };
  if (plan.kind === "day_pass") return [{ ...covers, sub: classes ? covers.sub : runsClasses ? "Every class that day" : "One day at the gym" }, anyone];
  if (plan.kind === "drop_in") return [{ ...covers, title: "Which classes" }, anyone];
  if (plan.kind === "class_pack") {
    return [
      { icon: Hash, title: "Sessions", sub: "Classes in the pack", value: plan.sessionsInPack ? String(plan.sessionsInPack) : "–" },
      { icon: CalendarClock, title: "Valid for", sub: "From the day it's bought", value: plan.validForDays ? daysLabel(plan.validForDays) : "–" },
      covers,
    ];
  }
  if (plan.kind === "intro_offer") {
    const target = plan.convertsToPlanId ? nameOf(plan.convertsToPlanId) : null;
    return [
      { icon: CalendarClock, title: "Length", sub: "From the day it's bought", value: plan.validForDays ? daysLabel(plan.validForDays) : "–" },
      { icon: ArrowRightLeft, title: "Converts to", sub: "Suggested when the offer ends", value: target ?? "Nothing" },
    ];
  }
  return [
    ...(runsClasses ? [{ icon: CalendarDays, title: "Classes", sub: classes ? joinAnd(classes) : "Every class on your schedule", value: classesLabel(classes) }] : []),
    anyone,
    ...(runsClasses ? [{ icon: Gauge, title: "Limit", sub: "How often a member can book", value: limitLabel(plan.visitsPerPeriod, plan.billing) }] : []),
    { icon: Repeat, title: "Renews", sub: renewsSub(plan.billing), value: renewsLabel(plan.billing) },
    ...(plan.minimumTermMonths || plan.noticeDays ? [{ icon: CalendarClock, title: "Commitment", sub: "Minimum term and notice", value: commitmentLabel(plan.minimumTermMonths, plan.noticeDays) }] : []),
  ];
}

export default function PlanDetailPage() {
  const ctx = usePlansCtx()!;
  const m = usePlanColors();
  const { planId } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState(false);

  const plan = ctx.plans.find((p) => p.id === planId) ?? null;
  const members = plan ? ctx.membersOf(plan) : null;
  const leave = () => {
    if (hasInAppHistory()) navigate(-1);
    else navigate(PLANS_ROUTE, { replace: true });
  };

  const onAction = (a: PlanAction) => {
    if (!plan) return;
    if (a === "edit") setEditing(true);
    else ctx.act(a, plan, a === "archive" || a === "delete" ? leave : undefined);
  };

  const header = (
    <BackHeader
      eyebrow="Memberships"
      title={plan?.name ?? "Plan"}
      onBack={leave}
      backLabel="Back to Memberships"
      aside={
        plan ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            {/* B-SH.1: share this plan (Membership plan card); only a plan on sale on Explore. */}
            {plan.dbStatus !== "archived" ? (
              <BizShareButton
                label={`Share ${plan.name}`}
                emptyHint={plan.status !== "active" ? "Only a plan on sale on Explore can be shared." : null}
                getData={() => ({ t: "plan", d: planData(plan) })}
              />
            ) : null}
            <PlanMenuButton plan={plan} offline={!online} onAction={onAction} style={{ margin: 0 }} />
          </div>
        ) : null
      }
    />
  );

  if (ctx.loading && !plan) {
    return (
      <div>
        {header}
        <MarketSkeleton radius={20} rows={3} label="Loading plan" />
        <MarketSkeleton radius={24} rows={4} label="Loading plan" style={{ marginTop: 18 }} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        {header}
        {ctx.error ? <MarketError thing="this plan" onRetry={ctx.reload} /> : <MarketEmptyCard title="This plan isn't available any more." />}
      </div>
    );
  }

  const figures = ctx.figuresOf(plan);
  const line = memberLine(plan, figures);
  const meta = cardMeta(plan);
  const count = members ? members.length : null;
  const shown = members ? (all ? members : members.slice(0, MEMBERS_SHOWN)) : [];

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <PlanFocusCss />
      {header}
      <PlansStrip />
      <MarketOffline loaded style={{ marginBottom: 12 }} />

      <div style={{ borderRadius: 20, background: m.card, border: `1px solid ${m.border}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0, fontSize: textPx(14), fontWeight: 800 }}>{KIND_LABEL[plan.kind]}</div>
          <span style={{ fontSize: textPx(14), fontWeight: 800, whiteSpace: "nowrap" }}>{priceLine(plan)}</span>
        </div>
        {meta ? <div style={{ fontSize: textPx(11.5), color: m.faint, marginTop: 2 }}>{meta}</div> : null}
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <StatusChip plan={plan} />
          {line ? <span style={{ fontSize: textPx(11.5), color: m.faint }}>{line}</span> : null}
        </div>
        <p style={{ margin: "10px 0 0", fontSize: textPx(12), lineHeight: linePx(17), color: m.ink2 }}>
          {statusLine(plan.status)} · {plan.paymentType}
        </p>
      </div>

      <CapsLabel style={{ marginTop: 18 }}>Who it covers</CapsLabel>
      <div style={{ marginTop: 8, borderRadius: 24, background: m.card, border: `1px solid ${m.border}`, overflow: "hidden" }}>
        {coverRows(plan, ctx.runsClasses, (id) => ctx.plans.find((p) => p.id === id)?.name ?? null).map((r, i) => (
          <div key={r.title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderTop: i ? `0.5px solid ${m.div}` : "0" }}>
            <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, background: m.pale, color: m.pdark, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <r.icon size={16} aria-hidden />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: textPx(13.5), fontWeight: 700 }}>{r.title}</div>
              <div style={{ fontSize: textPx(11.5), color: m.faint }}>{r.sub}</div>
            </div>
            <span style={{ fontSize: textPx(12.5), fontWeight: 800, textAlign: "end" }}>{r.value}</span>
          </div>
        ))}
      </div>

      <CapsLabel style={{ marginTop: 18 }}>{count === null ? "Members on this plan" : `Members on this plan · ${count}`}</CapsLabel>
      <div style={{ marginTop: 8 }}>
        {!ctx.membersLoaded ? (
          <MarketSkeleton radius={24} rows={2} label="Loading members" />
        ) : (
          <MemberRows
            rows={shown.map((x) => ({ id: x.membershipId, label: x.label, plan: `Joined ${shortDate(x.startedOn)}`, until: untilLabel(x.expiresOn), minor: x.isMinor }))}
            footer={
              count === null ? (
                <MemberNote>Couldn't load the members of this plan.</MemberNote>
              ) : count === 0 ? (
                <MemberNote>No members on this plan yet.</MemberNote>
              ) : count > MEMBERS_SHOWN ? (
                <SeeAllRow label={all ? "Show fewer" : `See all ${count}`} onClick={() => setAll((x) => !x)} />
              ) : null
            }
          />
        )}
      </div>
      <p style={{ margin: "10px 0 0", fontSize: textPx(11.5), lineHeight: linePx(16), color: m.faint }}>Each member gets their own QR code to check in when they buy this plan.</p>

      <PlanSheet
        open={editing}
        editing={plan}
        onClose={() => setEditing(false)}
        runsClasses={ctx.runsClasses}
        classTypes={ctx.classTypes}
        plans={ctx.plans}
        offered={ctx.offered}
        memberCount={figures.active}
        save={(draft) => ctx.edit(plan.id, draft)}
        onSaved={() => ctx.say("Plan updated", { planId: plan.id })}
        onDelete={(p) =>
          ctx.act("delete", p, () => {
            setEditing(false);
            leave();
          })
        }
      />
    </div>
  );
}
