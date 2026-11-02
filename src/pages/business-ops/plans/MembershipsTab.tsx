import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { ConfirmationStrip } from "../../../components/market/ConfirmationStrip";
import { MarketEmptyCard, MarketError, MarketOffline, MarketSkeleton } from "../../../components/market/MarketStates";
import { useOnline } from "../../../hooks/useOnline";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import { textPx } from "../../../theme/textSize";
import type { MembershipPlanRow } from "../../../services/membership-plans";
import { CapsLabel, OutlineButton } from "../../business-market/listingParts";
import { sortMembers, untilLabel } from "./planModel";
import { PlanSheet } from "./PlanSheet";
import { PlansProvider, usePlansCtx, type PlanAction } from "./PlansContext";
import { MemberNote, MemberRows, PlanCard, PlanFocusCss, SeeAllRow, usePlanColors } from "./ui";
import { t, tk } from "../../../i18n/core";

// Market + Share 3.0 · W3 · B-MA.5 Memberships (Business Marketplace Screens
// lines 302–335; frame-check B-MA.5 memberships / planSaved / planListNew,
// B-MA.5.1 editList / editSaved / deleteDone). The body is shared by the
// standalone page (/app/business/gym: back header "Gym / Memberships", from
// the Overview's Gym card) and Front desk › Memberships (no back header).
// Top to bottom (padding 0 16 32; the app column gives the 16):
// - the ConfirmationStrip (margin-bottom 12) "Plan added" / "Plan updated" /
//   "Plan deleted" with "View", and the kept actions' lines;
// - caps "Plans and day passes" + the outlined "Add plan" (plus 15 / 2.4);
// - the plan cards (margin-top 10, gap 10) with their menu;
// - archived plans (kept live: Restore / Duplicate / Delete), collapsed under
//   caps "Archived · {n}" (OURS);
// - caps "Active members · {n}" (margin-top 18) and the member rows card
//   (margin-top 8) from venue_members (first name as shared, never a surname).
// The Day passes tab is folded in (PLAN §3.4): "21 sold this month · 2 today"
// on a day pass card (business_plan_figures), the Hidden chip and the menu's
// Show on Explore / Hide from Explore (visible_on_explore).

export const PLANS_ROUTE = "/app/business/gym";
export const planRoute = (id: string) => `${PLANS_ROUTE}/${id}`;

/** How many member rows show before "See all" (the board draws 4). */
const MEMBERS_SHOWN = 4;

/**
 * The Memberships body. Mount it under the Front desk shell's Memberships
 * tab; it brings its own data provider when none is above it.
 */
export const MembershipsTab: React.FC = () => {
  const ctx = usePlansCtx();
  if (!ctx) {
    return (
      <PlansProvider>
        <MembershipsTab />
      </PlansProvider>
    );
  }
  return <MembershipsList />;
};

/** The strip at the top of the list (or the plan page): View scrolls to the plan's card and focuses it. */
export const PlansStrip: React.FC<{ style?: React.CSSProperties; onView?: (planId: string) => void }> = ({ style, onView }) => {
  const ctx = usePlansCtx()!;
  const reduce = useReducedMotion();
  const s = ctx.strip;
  if (!s) return null;
  const stub = s.stub === "View" && (!s.planId || !onView) ? undefined : s.stub;
  return (
    <div style={{ marginBottom: 12, ...style }}>
      <ConfirmationStrip
        key={s.id}
        text={s.text}
        tone={s.tone}
        still={reduce}
        action={stub ? t(stub) : undefined}
        onAction={() => {
          if (s.stub === "Undo") s.undo?.();
          else if (s.stub === "View" && s.planId) onView?.(s.planId);
          ctx.clearStrip();
        }}
      />
    </div>
  );
};

const MembershipsList: React.FC = () => {
  const ctx = usePlansCtx()!;
  const m = usePlanColors();
  const navigate = useNavigate();
  const online = useOnline();
  const [sheet, setSheet] = useState<{ open: boolean; editing: MembershipPlanRow | null }>({ open: false, editing: null });
  const [allMembers, setAllMembers] = useState(false);
  const [archivedOpen, setArchivedOpen] = useState(false);
  /** Plans added in this visit ("New · no members yet"). */
  const [added, setAdded] = useState<Set<string>>(() => new Set());

  const { plans, loading, error, businessId } = ctx;
  const live = plans.filter((p) => p.dbStatus !== "archived");
  const archived = plans.filter((p) => p.dbStatus === "archived");
  const guard = !loading && !error && !businessId;

  const view = (planId: string) => {
    const card = document.querySelector<HTMLElement>(`[data-plan-card="${planId}"]`);
    if (!card) return navigate(planRoute(planId));
    if (archived.some((p) => p.id === planId)) setArchivedOpen(true);
    card.scrollIntoView({ block: "center", behavior: "smooth" });
    card.focus({ preventScroll: true });
  };

  const onAction = (p: MembershipPlanRow) => (a: PlanAction) => {
    if (a === "edit") setSheet({ open: true, editing: p });
    else ctx.act(a, p);
  };

  const card = (p: MembershipPlanRow) => (
    <PlanCard
      key={p.id}
      plan={p}
      figures={{ ...ctx.figuresOf(p), isNew: added.has(p.id) }}
      highlighted={!!ctx.strip && ctx.strip.tone !== "error" && ctx.strip.planId === p.id && (ctx.strip.text === t("Plan added") || ctx.strip.text === t("Plan updated"))}
      offline={!online}
      onOpen={() => {
        ctx.clearStrip();
        navigate(planRoute(p.id));
      }}
      onAction={onAction(p)}
    />
  );

  // Active members: every active membership the venue readers return, the one ending soonest first.
  const members = ctx.allMembers ? sortMembers(ctx.allMembers) : null;
  const shownMembers = members ? (allMembers ? members : members.slice(0, MEMBERS_SHOWN)) : [];

  let body: React.ReactNode;
  if (loading && plans.length === 0) {
    body = <MarketSkeleton radius={20} rows={3} count={3} label={t("Loading plans")} style={{ marginTop: 10 }} />;
  } else if (error && plans.length === 0) {
    body = <MarketError thing={tk("your plans")} onRetry={ctx.reload} style={{ marginTop: 10 }} />;
  } else if (guard || live.length === 0) {
    body = (
      <MarketEmptyCard
        style={{ marginTop: 10 }}
        title={t("No plans yet")}
        body={guard ? t("Save your business profile first to start adding plans.") : t("Add a plan or a day pass and members can buy it on Explore. Each buyer gets their own QR code.")}
      />
    );
  } else {
    body = <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>{live.map(card)}</div>;
  }

  return (
    <div style={{ paddingBottom: 32, color: m.ink, lineHeight: "normal" }}>
      <PlanFocusCss />
      <PlansStrip onView={view} />
      <MarketOffline loaded={plans.length > 0} onRetry={ctx.reload} style={{ marginBottom: 12 }} />
      {error && plans.length > 0 ? <MarketError thing={tk("your plans")} onRetry={ctx.reload} style={{ marginBottom: 12 }} /> : null}

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <CapsLabel>{t("Plans and day passes")}</CapsLabel>
        {guard ? (
          <OutlineButton onClick={() => navigate("/app/business/profile")} disabled={!online}>
            {t("Set up profile")}
          </OutlineButton>
        ) : (
          <OutlineButton onClick={() => setSheet({ open: true, editing: null })} disabled={!businessId || !online}>
            <Plus size={15} strokeWidth={2.4} aria-hidden />
            {t("Add plan")}
          </OutlineButton>
        )}
      </div>
      {body}

      {archived.length > 0 ? (
        <section aria-label={t("Archived plans")}>
          <button
            type="button"
            aria-expanded={archivedOpen}
            onClick={() => setArchivedOpen((o) => !o)}
            className="tap market-focus"
            style={{ marginTop: 18, minHeight: 44, width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: 0, padding: 0, fontFamily: "inherit", cursor: "pointer" }}
          >
            <CapsLabel as="span">{t("Archived · {n}", { n: archived.length })}</CapsLabel>
            <span style={{ fontSize: textPx(12), fontWeight: 800, color: m.pdark }}>{archivedOpen ? t("Hide") : t("Show")}</span>
          </button>
          {archivedOpen ? <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>{archived.map(card)}</div> : null}
        </section>
      ) : null}

      {businessId && live.length + archived.length > 0 ? (
        <>
          <CapsLabel style={{ marginTop: 18 }}>{members ? t("Active members · {n}", { n: members.length }) : t("Active members")}</CapsLabel>
          <div style={{ marginTop: 8 }}>
            {!ctx.membersLoaded ? (
              <MarketSkeleton radius={24} rows={2} count={1} label={t("Loading members")} />
            ) : !members ? (
              <MarketError thing={tk("your members")} onRetry={ctx.reload} />
            ) : (
              <MemberRows
                rows={shownMembers.map((x) => ({ id: x.membershipId, label: x.label, plan: x.planName, until: untilLabel(x.expiresOn), minor: x.isMinor }))}
                footer={
                  members.length === 0 ? (
                    <MemberNote>{t("No active members yet. Members show here once someone buys a plan.")}</MemberNote>
                  ) : members.length > MEMBERS_SHOWN ? (
                    <SeeAllRow label={allMembers ? t("Show fewer") : t("See all {n}", { n: members.length })} onClick={() => setAllMembers((x) => !x)} />
                  ) : null
                }
              />
            )}
          </div>
        </>
      ) : null}

      <PlanSheet
        open={sheet.open}
        editing={sheet.editing}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        runsClasses={ctx.runsClasses}
        classTypes={ctx.classTypes}
        plans={plans}
        offered={ctx.offered}
        memberCount={sheet.editing ? ctx.figuresOf(sheet.editing).active : null}
        save={(draft) => (sheet.editing ? ctx.edit(sheet.editing.id, draft) : ctx.add(draft))}
        onSaved={(plan, isNew) => {
          if (isNew) setAdded((s) => new Set(s).add(plan.id));
          ctx.say(isNew ? t("Plan added") : t("Plan updated"), { planId: plan.id });
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
        onDelete={(plan) => ctx.act("delete", plan, () => setSheet((s) => ({ ...s, open: false })), false)}
      />
    </div>
  );
};
