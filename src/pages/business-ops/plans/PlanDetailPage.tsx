import React, { useState } from "react";
import { isMaskedLabel } from "../../../services/venues/consoleLogic";
import { useNavigate, useParams } from "react-router-dom";
import clsx from "clsx";
import { ArrowRightLeft, Copy, RotateCcw, Trash2, CalendarClock, CalendarDays, ChevronLeft, Gauge, Hash, QrCode, Repeat, Sun, UserCheck, type LucideIcon, UserRound } from "lucide-react";
import { hasInAppHistory } from "../../../hooks/useBack";
import { useOnline } from "../../../hooks/useOnline";
import type { MembershipPlanRow, PlanMember } from "../../../services/membership-plans";
import { classesLabel, commitmentLabel, daysLabel, initials, joinAnd, limitLabel, priceLine, renewsLabel, renewsSub, shortDate, statusLine } from "./planModel";
import { ActionTile, MEMBERSHIPS_HOME, PlanActions } from "./MembershipsTab";
import { PlanSheet } from "./PlanSheet";
import { PlansToast, usePlansCtx } from "./PlansContext";
import { Bar, BORDER, DIVIDER, ErrorCard, FiguresCard, StatusPill } from "./ui";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { planData } from "../../../components/share/business/bizCardModel";

// v6 Batch 4 · the plan page (OP1-037 Monthly, OP1-039 paused; OpsTabsV4
// template 222-326 isDetail, logic 492-498). Reached from "Members and
// bookings" on an open plan row. Figures, "Who it covers" and "Members on
// this plan" read today's data; bookings a week and per-plan deltas are
// BU2-12 (B7) and show the early "–" state (O6).

const CoverRow: React.FC<{ icon: LucideIcon; title: string; sub: string; value: string; first: boolean }> = ({ icon: Icon, title, sub, value, first }) => (
  <div className={clsx("flex items-center", !first && clsx("border-t", DIVIDER))} style={{ gap: 10, padding: "10px 16px" }}>
    <Icon size={16} aria-hidden className="shrink-0 text-charcoal-faint" />
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-bold leading-[17px] text-charcoal">{title}</p>
      <p className="text-[11.5px] leading-[15px] text-charcoal-faint">{sub}</p>
    </div>
    <span className="text-[12.5px] font-extrabold text-charcoal whitespace-nowrap">{value}</span>
  </div>
);

const Card: React.FC<{ title: string; sub?: string; children: React.ReactNode }> = ({ title, sub, children }) => (
  <section aria-label={title} className={clsx("bg-cream-card border overflow-hidden", BORDER)} style={{ marginTop: 14, borderRadius: 22 }}>
    <div className="flex items-baseline justify-between" style={{ gap: 10, padding: "14px 16px 6px" }}>
      <h2 className="text-[14px] font-extrabold text-charcoal">{title}</h2>
      {sub && <p className="text-[11.5px] text-charcoal-faint whitespace-nowrap">{sub}</p>}
    </div>
    {children}
  </section>
);

function coverRows(
  plan: MembershipPlanRow,
  runsClasses: boolean,
  nameOf: (id: string) => string | null
): { icon: LucideIcon; title: string; sub: string; value: string }[] {
  // Membership rows are the source's (logic 497); the other types OURS O7.
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
    ...(plan.minimumTermMonths || plan.noticeDays
      ? [{ icon: CalendarClock, title: "Commitment", sub: "Minimum term and notice", value: commitmentLabel(plan.minimumTermMonths, plan.noticeDays) }]
      : []),
  ];
}

const MemberRow: React.FC<{ m: PlanMember; first: boolean }> = ({ m, first }) => (
  <div className={clsx("flex items-center", !first && clsx("border-t", DIVIDER))} style={{ gap: 10, padding: "10px 16px" }}>
    <span
      className="shrink-0 flex items-center justify-center rounded-full bg-teal-pale text-[12px] font-extrabold"
      style={{ width: 34, height: 34, color: "rgb(var(--c-teal-text))" }}
    >
      {isMaskedLabel(m.label) ? <UserRound size={15} aria-hidden /> : initials(m.label)}
    </span>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-bold leading-[17px] text-charcoal">
        {m.label}
        {m.isMinor && <span className="text-[11px] font-bold text-charcoal-faint"> · Under 18</span>}
      </p>
      <p className="text-[11.5px] leading-[15px] text-charcoal-faint">
        Joined {shortDate(m.startedOn)}
        {m.expiresOn ? ` · valid until ${shortDate(m.expiresOn)}` : ""}
      </p>
    </div>
  </div>
);

export default function PlanDetailPage() {
  const ctx = usePlansCtx()!;
  const { planId } = useParams();
  const navigate = useNavigate();
  const online = useOnline();
  const [editing, setEditing] = useState(false);
  const [all, setAll] = useState(false);

  const plan = ctx.plans.find((p) => p.id === planId) ?? null;
  const members = plan ? ctx.membersOf(plan) : null;
  // Back returns to the list with this plan's row still open (OP1-037 S1);
  // opened directly, it lands on Front desk › Memberships.
  const leave = () => {
    if (hasInAppHistory()) navigate(-1);
    else navigate(MEMBERSHIPS_HOME, { replace: true });
  };
  const goBack = () => {
    if (plan) ctx.setOpenId(plan.id);
    leave();
  };

  const header = (
    // Back row: margin -6 0 10 -10 (the shell's top padding is 24, the source's 22).
    <div className="flex items-center" style={{ gap: 6, margin: "-8px 0 10px -10px" }}>
      <button type="button" onClick={goBack} aria-label="Back" className="tap flex items-center justify-center text-charcoal rtl:-scale-x-100" style={{ width: 44, height: 44 }}>
        <ChevronLeft size={22} strokeWidth={2.2} aria-hidden />
      </button>
      <p className="flex-1 text-[13px] font-bold text-charcoal-faint">Memberships</p>
      {/* Market + Share 3.0 B-SH.1: share this plan (Membership plan card); only a plan on sale on Explore. */}
      {plan && plan.dbStatus !== "archived" && (
        <BizShareButton
          label={`Share ${plan.name}`}
          style={{ marginRight: -5 }}
          emptyHint={plan.status !== "active" ? "Only a plan on sale on Explore can be shared." : null}
          getData={() => ({ t: "plan", d: planData(plan) })}
        />
      )}
    </div>
  );

  if (ctx.loading && !plan) {
    // OURS O1: header tile + bars, five grey tiles, two grey cards.
    return (
      <div aria-busy="true" aria-label="Loading plan">
        {header}
        <div className="flex items-center" style={{ gap: 14 }}>
          <span className="shrink-0 bg-primary-pale" style={{ width: 60, height: 60, borderRadius: 16 }} />
          <div className="flex-1">
            <Bar w={140} h={18} />
            <Bar w={120} h={12} style={{ marginTop: 8 }} />
            <Bar w={160} h={10} style={{ marginTop: 6 }} />
          </div>
        </div>
        <div className="grid" style={{ gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, marginTop: 16 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Bar key={i} w="100%" h={60} r={16} />
          ))}
        </div>
        <Bar w="100%" h={121.5} r={22} style={{ marginTop: 14 }} />
        <Bar w="100%" h={252} r={22} style={{ marginTop: 14 }} />
      </div>
    );
  }

  if (!plan) {
    return (
      <div>
        {header}
        <ErrorCard
          title={ctx.error ? "Couldn't load this plan. Check your connection and try again." : "This plan isn't available any more."}
          onRetry={ctx.error ? ctx.reload : undefined}
        />
        <PlansToast />
      </div>
    );
  }

  const count = members ? members.length : null;
  const shown = members ? (all ? members : members.slice(0, 3)) : [];

  return (
    <div style={{ paddingBottom: 0 }}>
      {header}
      {!online && (
        <ErrorCard className="mb-3.5" title="You're offline. Showing the last saved plan." />
      )}
      <div className="flex items-center" style={{ gap: 14 }}>
        <span className="shrink-0 flex items-center justify-center bg-primary-pale text-primary-dark" style={{ width: 60, height: 60, borderRadius: 16 }}>
          <QrCode size={26} strokeWidth={1.8} aria-hidden />
        </span>
        <div className="flex-1 min-w-0">
          <p className="flex items-center flex-wrap" style={{ gap: 7 }}>
            <span className="text-[22px] font-extrabold leading-[27px] text-charcoal" style={{ letterSpacing: "-0.02em" }}>
              {plan.name}
            </span>
            {plan.status !== "archived" && <StatusPill status={plan.status} size="page" />}
          </p>
          <p className="text-[13px] leading-[18px] text-charcoal-soft" style={{ marginTop: 3 }}>
            {priceLine(plan)} · {plan.paymentType}
          </p>
          <p className="text-[12px] leading-[16px] text-charcoal-faint">{statusLine(plan.status)}</p>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        {plan.dbStatus === "archived" ? (
          // OURS-OP1-plans-archived: an archived plan's page offers Restore, Duplicate and Delete.
          <div className="grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 6 }}>
            <ActionTile size="page" icon={RotateCcw} label="Restore" aria={`Restore ${plan.name}`} onClick={() => ctx.act("restore", plan)} disabled={!online} />
            <ActionTile size="page" icon={Copy} label="Duplicate" aria={`Duplicate ${plan.name}`} onClick={() => ctx.act("duplicate", plan)} disabled={!online} />
            <ActionTile size="page" icon={Trash2} label="Delete" aria={`Delete ${plan.name}`} onClick={() => ctx.act("delete", plan, leave)} danger disabled={!online} />
          </div>
        ) : (
        <PlanActions
          size="page"
          plan={plan}
          disabled={!online}
          onEdit={() => setEditing(true)}
          onAction={(a) => ctx.act(a, plan, a === "archive" ? leave : undefined)}
        />
        )}
      </div>

      <FiguresCard
        style={{ marginTop: 14 }}
        cells={[
          { label: "Members", value: count === null ? "–" : String(count) },
          { label: "Bookings a week", value: "–" },
        ]}
        line="Bookings a week shows after 2 weeks of bookings."
      />

      <Card title="Who it covers">
        {coverRows(plan, ctx.runsClasses, (id) => ctx.plans.find((p) => p.id === id)?.name ?? null).map((r, i) => (
          <CoverRow key={r.title} {...r} first={i === 0} />
        ))}
      </Card>

      <Card title="Members on this plan" sub={count === null ? undefined : String(count)}>
        {count === 0 && (
          <p className="text-[12px] text-charcoal-soft" style={{ padding: "10px 16px" }}>
            No members on this plan yet.
          </p>
        )}
        {count === null && (
          <p className="text-[12px] text-charcoal-soft" style={{ padding: "10px 16px" }}>
            Couldn't load the members of this plan.
          </p>
        )}
        {shown.map((m, i) => (
          <MemberRow key={m.membershipId} m={m} first={i === 0} />
        ))}
        {count !== null && count > 3 && !all && (
          <button
            type="button"
            onClick={() => setAll(true)}
            className={clsx("tap w-full text-center text-[12.5px] font-extrabold text-primary-dark border-t", DIVIDER)}
            style={{ padding: "12px 16px", minHeight: 44 }}
          >
            See all {count}
          </button>
        )}
        <p className={clsx("text-[11.5px] leading-[16px] text-charcoal-faint border-t", DIVIDER)} style={{ padding: "10px 16px 14px", textWrap: "pretty" } as React.CSSProperties}>
          Each member gets their own QR code to check in when they buy this plan.
        </p>
      </Card>

      <PlanSheet
        open={editing}
        editing={plan}
        onClose={() => setEditing(false)}
        runsClasses={ctx.runsClasses}
        classTypes={ctx.classTypes}
        plans={ctx.plans}
        offered={ctx.offered}
        memberCount={count}
        save={(draft) => ctx.edit(plan.id, draft)}
        onSaved={(p) => ctx.showToast(`${p.name} saved.`)}
      />
      <PlansToast />
    </div>
  );
}
