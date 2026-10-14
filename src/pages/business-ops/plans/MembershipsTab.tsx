import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { ChevronDown, ChevronRight, Copy, Eye, EyeOff, KeyRound, Pause, Pencil, Play, Plus, Trash2, type LucideIcon } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { useReducedMotion } from "../../../hooks/useReducedMotion";
import type { MembershipPlanRow } from "../../../services/membership-plans";
import {
  billingLabel,
  figuresLine,
  GROUP_OF,
  GROUP_ORDER,
  membersLine,
  planIcon,
  plansCount,
  priceLine,
} from "./planModel";
import { PlanSheet } from "./PlanSheet";
import { PlansProvider, PlansToast, usePlansCtx } from "./PlansContext";
import { Bar, BORDER, DIVIDER, ErrorCard, FiguresCard, ICONS, StatusPill, useTones } from "./ui";

// v6 Batch 4 · Front desk › Memberships: the plan list (OP1-022 / 033 / 036
// list rows, OP1-040 CTA, OP1-096 / 098 / 099 open rows, OP1-046 / 111 saved
// toast), from OpsTabsV4 template 21-83 and logic 417-426 / 461 / 482-484.
// Replaces BusinessGymTab (HANDOVER §5): edit and delete move into the open
// row's action grid; the per-plan QrPattern is dropped (OP1-037 K2).

export const PLANS_ROUTE = "/app/business/gym";
/** Where the plan list lives for a gym: Front desk › Memberships (V6-54). */
export const MEMBERSHIPS_HOME = "/app/business/operations?tab=memberships";
export const planRoute = (id: string) => `${PLANS_ROUTE}/${id}`;

/** One action tile (OP1-096 row 6): min-h 52, r14, soft, icon 16 / 2.1, label 10.5/800, gap 3. */
const ActionTile: React.FC<{
  icon: LucideIcon;
  label: string;
  aria: string;
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  size?: "row" | "page";
}> = ({ icon: Icon, label, aria, onClick, danger, disabled, size = "row" }) => (
  <button
    type="button"
    aria-label={aria}
    title={aria}
    onClick={onClick}
    disabled={disabled}
    className={clsx(
      "tap min-w-0 flex flex-col items-center justify-center bg-cream-soft font-extrabold whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed [container-type:inline-size]",
      danger ? "text-status-high" : "text-charcoal"
    )}
    style={size === "page" ? { minHeight: 60, borderRadius: 16, gap: 4 } : { minHeight: 52, borderRadius: 14, gap: 3 }}
  >
    <Icon size={size === "page" ? 17 : 16} strokeWidth={2.1} aria-hidden />
    {/* Larger text (OP1-037 / 096 A1): the label grows only as far as the
        tile allows (never below the drawn 10.5 / 11), then ellipsis. */}
    <span
      className="max-w-full truncate px-0.5"
      style={{
        fontSize:
          size === "page"
            ? "min(calc(11px + var(--text-boost, 0px)), max(11px, 17cqi))"
            : "min(calc(10.5px + var(--text-boost, 0px)), max(10.5px, 18cqi))",
      }}
    >
      {label}
    </span>
  </button>
);

/**
 * The plan action grid (OP1-096 row 6 / OP1-037 row 7): Edit · Pause · Hide ·
 * Duplicate · and Archive's slot. Pause, Hide and Duplicate need B7 (status,
 * visible on Explore, duplicate as hidden): drawn disabled with a note. The
 * last tile is today's delete with a confirm until B7 archive exists.
 */
export const PlanActions: React.FC<{
  plan: MembershipPlanRow;
  onEdit: () => void;
  onDelete: () => void;
  size?: "row" | "page";
  disabled?: boolean;
}> = ({ plan, onEdit, onDelete, size = "row", disabled }) => {
  const paused = plan.status === "paused";
  const hidden = plan.status === "hidden";
  return (
    <>
      <div className="grid" style={{ gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: size === "page" ? 6 : 4 }}>
        <ActionTile size={size} icon={Pencil} label="Edit" aria={`Edit ${plan.name}`} onClick={onEdit} disabled={disabled} />
        <ActionTile size={size} icon={paused ? Play : Pause} label={paused ? "Resume" : "Pause"} aria={`${paused ? "Resume" : "Pause"} ${plan.name}`} disabled />
        <ActionTile size={size} icon={hidden ? Eye : EyeOff} label={hidden ? "Show" : "Hide"} aria={`${hidden ? "Show" : "Hide"} ${plan.name}`} disabled />
        <ActionTile size={size} icon={Copy} label="Duplicate" aria={`Duplicate ${plan.name}`} disabled />
        <ActionTile size={size} icon={Trash2} label="Delete" aria={`Delete ${plan.name}`} onClick={onDelete} danger disabled={disabled} />
      </div>
      <p className="text-[11px] leading-[15px] text-charcoal-faint" style={{ marginTop: 8 }}>
        Pause, Hide and Duplicate are coming soon.
      </p>
    </>
  );
};

/** Open row details (OP1-096 row 3, logic 419): label 12 faint, value 12.5/700, rows pad 7 0, divider from the 2nd. */
function detailsOf(plan: MembershipPlanRow, runsClasses: boolean): [string, string][] {
  if (plan.kind === "day_pass") {
    return [
      ["Billing", "Daily"],
      ["Covers", runsClasses ? "All classes that day" : "Gym entry"],
      ["Payment type", plan.paymentType],
    ];
  }
  return [
    ["Billing", billingLabel(plan.billing)],
    ["Payment type", plan.paymentType],
    ...(runsClasses
      ? ([
          ["Includes", "All classes"],
          ["Limit", "Unlimited"],
        ] as [string, string][])
      : []),
    ["Commitment", "None, cancel anytime"],
  ];
}

const PlanRow: React.FC<{
  plan: MembershipPlanRow;
  first: boolean;
  open: boolean;
  onToggle: () => void;
  count: number | null;
  runsClasses: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onOpenPage: () => void;
  offline: boolean;
  rowRef?: (el: HTMLDivElement | null) => void;
}> = ({ plan, first, open, onToggle, count, runsClasses, onEdit, onDelete, onOpenPage, offline, rowRef }) => {
  const reduced = useReducedMotion();
  const Icon = ICONS[planIcon(plan)];
  const panelId = `plan-panel-${plan.id}`;
  const dim = plan.status === "paused" && !open;
  return (
    <div ref={rowRef} className={clsx(!first && clsx("border-t", DIVIDER))} style={{ opacity: dim ? 0.78 : 1 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="tap w-full flex items-center text-left box-border"
        style={{ gap: 12, padding: "12px 14px", minHeight: 64 }}
      >
        <span className="shrink-0 flex items-center justify-center bg-primary-pale text-primary-dark" style={{ width: 44, height: 44, borderRadius: 12 }}>
          <Icon size={20} strokeWidth={1.9} aria-hidden />
        </span>
        <span className="flex-1 min-w-0 block">
          <span className="flex items-center min-w-0 flex-wrap" style={{ gap: 6 }}>
            <span className="text-[14px] font-extrabold leading-[18px] text-charcoal min-w-0" style={{ textWrap: "balance" } as React.CSSProperties}>
              {plan.name}
            </span>
            {plan.status !== "archived" && <StatusPill status={plan.status} />}
          </span>
          <span className="block text-[12px] leading-[16px] text-charcoal-soft" style={{ marginTop: 2 }}>
            {priceLine(plan)}
          </span>
          {count !== null && (
            <span className="block text-[11px] leading-[15px] text-charcoal-faint" style={{ marginTop: 1 }}>
              {membersLine(plan.kind, count)}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          strokeWidth={2.2}
          aria-hidden
          className="shrink-0 text-charcoal-faint"
          style={{ transform: open ? "rotate(180deg)" : "none", transition: reduced ? "none" : "transform 0.25s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </button>
      {/* motion/expand-collapse: height and opacity together, 220 ms; instant under Reduce motion. */}
      <div
        id={panelId}
        className="grid"
        style={{
          gridTemplateRows: open ? "1fr" : "0fr",
          opacity: open ? 1 : 0,
          transition: reduced ? "none" : "grid-template-rows 220ms cubic-bezier(0.22,1,0.36,1), opacity 220ms cubic-bezier(0.22,1,0.36,1)",
        }}
        inert={!open}
      >
        <div className="overflow-hidden min-h-0">
          <div style={{ padding: "0 14px 14px 70px" }}>
            {detailsOf(plan, runsClasses).map(([l, v], j) => (
              <div key={l} className={clsx("flex items-baseline justify-between", j > 0 && clsx("border-t", DIVIDER))} style={{ gap: 10, padding: "7px 0" }}>
                <span className="text-[12px] text-charcoal-faint whitespace-nowrap [html.larger-text_&]:whitespace-normal">{l}</span>
                <span className="text-[12.5px] font-bold text-charcoal text-right">{v}</span>
              </div>
            ))}
            <div style={{ marginTop: 10, marginLeft: -56 }}>
              <PlanActions plan={plan} onEdit={onEdit} onDelete={onDelete} disabled={offline} />
            </div>
            <button
              type="button"
              onClick={onOpenPage}
              className="tap w-[calc(100%+56px)] flex items-center justify-center text-[12.5px] font-extrabold text-primary-dark"
              style={{ margin: "8px 0 0 -56px", minHeight: 44, gap: 4 }}
            >
              Members and bookings
              <ChevronRight size={14} aria-hidden />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** OURS loading (OP1-022 O1): figures with grey values, one card of three rows. */
const ListSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading plans">
    <FiguresCard cells={[{ label: "Active plans", value: "" }, { label: "Members on plans", value: "" }]} style={{ marginTop: 16 }} />
    <div className={clsx("bg-cream-card border overflow-hidden", BORDER)} style={{ borderRadius: 20, marginTop: 30 }}>
      {[0, 1, 2].map((i) => (
        <div key={i} className={clsx("flex items-center", i > 0 && clsx("border-t", DIVIDER))} style={{ gap: 12, padding: "12px 14px", minHeight: 64 }}>
          <span className="shrink-0 bg-primary-pale" style={{ width: 44, height: 44, borderRadius: 12 }} />
          <span className="flex-1 min-w-0">
            <Bar w={120} h={12} />
            <Bar w={80} h={10} style={{ marginTop: 8 }} />
          </span>
        </div>
      ))}
    </div>
  </div>
);

/** OP1-033 empty card: dashed tert, r22, padding 28 20; tile 48 r16 pale, key-round 22. */
const EmptyCard: React.FC<{ guard: boolean }> = ({ guard }) => (
  <div className="bg-cream-card border border-dashed border-charcoal-tertiary text-center" style={{ marginTop: 18, borderRadius: 22, padding: "28px 20px" }}>
    <span className="inline-flex items-center justify-center bg-primary-pale text-primary-dark" style={{ width: 48, height: 48, borderRadius: 16 }}>
      <KeyRound size={22} aria-hidden />
    </span>
    <p className="text-[15px] font-extrabold text-charcoal" style={{ marginTop: 10 }}>
      No membership plans yet
    </p>
    <p className="text-[12.5px] leading-[18px] text-charcoal-soft" style={{ marginTop: 4, textWrap: "pretty" } as React.CSSProperties}>
      {guard
        ? "Save your business profile first to start adding plans."
        : "Add a plan and members can buy it on Explore. Each buyer gets their own QR code."}
    </p>
  </div>
);

/**
 * OURS (V6-156, OURS-OP1-plans-archived): archived plans in one collapsed group
 * at the end of the list, "Archived · {n}" (group label pattern), rows at
 * opacity 0.6 with Restore and Duplicate only. Archive is B7 (status column):
 * until then no plan is archived and the group does not show; both actions
 * are drawn disabled because they need the same column.
 */
const ArchivedGroup: React.FC<{ plans: MembershipPlanRow[] }> = ({ plans }) => {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Archived plans">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="tap w-full flex items-baseline justify-between"
        style={{ margin: "22px 0 8px", padding: "0 4px", minHeight: 44 }}
      >
        <span className="text-[10.5px] font-extrabold uppercase text-charcoal-faint" style={{ letterSpacing: "0.08em" }}>
          Archived · {plans.length}
        </span>
        <ChevronDown size={16} aria-hidden className="text-charcoal-faint" style={{ transform: open ? "rotate(180deg)" : "none" }} />
      </button>
      {open && (
        <div className={clsx("bg-cream-card border overflow-hidden", BORDER)} style={{ borderRadius: 20 }}>
          {plans.map((p, i) => {
            const Icon = ICONS[planIcon(p)];
            return (
              <div key={p.id} className={clsx("flex items-center", i > 0 && clsx("border-t", DIVIDER))} style={{ gap: 12, padding: "12px 14px", minHeight: 64 }}>
                <span className="shrink-0 flex items-center justify-center bg-primary-pale text-primary-dark" style={{ width: 44, height: 44, borderRadius: 12, opacity: 0.6 }}>
                  <Icon size={20} strokeWidth={1.9} aria-hidden />
                </span>
                <span className="flex-1 min-w-0" style={{ opacity: 0.6 }}>
                  <span className="block text-[14px] font-extrabold leading-[18px] text-charcoal">{p.name}</span>
                  <span className="block text-[12px] leading-[16px] text-charcoal-soft">{priceLine(p)}</span>
                </span>
                {["Restore", "Duplicate"].map((a) => (
                  <button key={a} type="button" disabled aria-label={`${a} ${p.name}`} className="text-[12px] font-extrabold text-primary-dark disabled:opacity-45" style={{ minHeight: 44, padding: "0 6px" }}>
                    {a}
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

/** The page header when the list stands alone (title per tab, OP1-022 rows 2-3). */
export const MembershipsHeader: React.FC = () => (
  <div>
    <h1 className="text-[27px] font-extrabold leading-[34px] text-charcoal" style={{ letterSpacing: "-0.022em" }}>
      Memberships
    </h1>
    <p className="text-[13px] font-medium text-charcoal-faint" style={{ marginTop: 4 }}>
      Membership plans clients can buy on Explore
    </p>
  </div>
);

/**
 * The Memberships tab content. Mount it under the Front desk shell's
 * Memberships tab; it brings its own data provider when none is above it.
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

const MembershipsList: React.FC = () => {
  const ctx = usePlansCtx()!;
  const navigate = useNavigate();
  const online = useOnline();
  const t = useTones();
  const [sheet, setSheet] = useState<{ open: boolean; editing: MembershipPlanRow | null }>({ open: false, editing: null });
  const rows = useRef(new Map<string, HTMLDivElement>());

  const { plans, loading, error, businessId, runsClasses, classTypes, membersOf, counts, totalMembers, membersLoaded, openId, setOpenId } = ctx;
  const live = plans.filter((p) => p.status !== "archived");
  const archived = plans.filter((p) => p.status === "archived");


  const groups = GROUP_ORDER.map((g) => ({ title: g, items: live.filter((p) => GROUP_OF[p.kind] === g) })).filter((g) => g.items.length > 0);
  const guard = !loading && !error && !businessId;
  const ctaDisabled = !businessId || !online;
  const membersValue = !membersLoaded ? "" : totalMembers === null ? "–" : String(totalMembers);

  return (
    <div>
      {loading && plans.length === 0 ? (
        <ListSkeleton />
      ) : error && plans.length === 0 ? (
        <ErrorCard
          className="mt-4"
          title="Couldn't load your plans"
          body={online ? "Check your connection and try again." : "You're offline. Showing your last saved plans."}
          onRetry={ctx.reload}
        />
      ) : (
        <>
          <FiguresCard
            style={{ marginTop: 16 }}
            cells={[
              { label: "Active plans", value: String(live.filter((p) => p.status === "active").length) },
              { label: "Members on plans", value: membersValue },
            ]}
            line={figuresLine(live, counts)}
          />
          {!online && (
            <p role="status" className="text-[11.5px] text-charcoal-faint" style={{ marginTop: 8 }}>
              Offline. Changes are paused.
            </p>
          )}
          {error && (
            <p role="alert" className="text-[11.5px] font-bold text-status-high" style={{ marginTop: 8 }}>
              {error}
            </p>
          )}
          {guard || live.length === 0 ? (
            <EmptyCard guard={guard} />
          ) : (
            groups.map((g) => (
              <section key={g.title} aria-label={g.title}>
                <div className="flex items-baseline justify-between" style={{ margin: "22px 4px 8px" }}>
                  <h2 className="text-[10.5px] font-extrabold uppercase text-charcoal-faint" style={{ letterSpacing: "0.08em" }}>
                    {g.title}
                  </h2>
                  <p className="text-[11px] text-charcoal-faint">{plansCount(g.items.length)}</p>
                </div>
                <div className={clsx("bg-cream-card border overflow-hidden", BORDER)} style={{ borderRadius: 20 }}>
                  {g.items.map((p, i) => {
                    const m = membersOf(p);
                    return (
                      <PlanRow
                        key={p.id}
                        plan={p}
                        first={i === 0}
                        open={openId === p.id}
                        onToggle={() => setOpenId(openId === p.id ? null : p.id)}
                        count={m ? m.length : null}
                        runsClasses={runsClasses}
                        offline={!online}
                        onEdit={() => setSheet({ open: true, editing: p })}
                        onDelete={() => ctx.requestDelete(p)}
                        onOpenPage={() => navigate(planRoute(p.id))}
                        rowRef={(el) => {
                          if (el) rows.current.set(p.id, el);
                          else rows.current.delete(p.id);
                        }}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          )}
          {archived.length > 0 && <ArchivedGroup plans={archived} />}
        </>
      )}
      {/* Page bottom padding 176 (source padB) so the last row clears the CTA. */}
      <div aria-hidden style={{ height: 64 }} />

      {/* OP1-022 rows 19-20: the fade and the fixed CTA, 88 above the bottom.
          Portalled: a transformed ancestor (a page-in animation) would make
          'fixed' relative to it. */}
      {createPortal(
        <>
      <div
        aria-hidden
        className="fixed pointer-events-none z-30"
        style={{
          left: "var(--app-gutter)",
          right: "var(--app-gutter)",
          bottom: 0,
          height: 150,
          background: "linear-gradient(180deg, rgb(var(--c-cream) / 0) 0%, rgb(var(--c-cream)) 42%)",
        }}
      />
      <button
        type="button"
        // OP1-040 K1: no business profile yet, so the CTA leads there instead of an Add that would fail.
        onClick={() => (guard ? navigate("/app/business/profile") : setSheet({ open: true, editing: null }))}
        disabled={guard ? !online : ctaDisabled}
        aria-describedby={guard ? "plans-guard" : undefined}
        className="tap fixed z-30 flex items-center justify-center bg-primary-fill text-on-primary-fill text-[14.5px] font-extrabold active:scale-[0.98] disabled:opacity-45 disabled:active:scale-100"
        style={{
          left: "calc(var(--app-gutter) + 16px)",
          right: "calc(var(--app-gutter) + 16px)",
          bottom: "calc(env(safe-area-inset-bottom) + 88px)",
          height: 52,
          borderRadius: 16,
          gap: 8,
          boxShadow: t.ctaShadow,
          transition: "transform 120ms ease",
        }}
      >
        {!guard && <Plus size={17} strokeWidth={2.4} aria-hidden />}
        {guard ? "Set up business profile" : "Add membership plan"}
      </button>
        </>,
        document.body
      )}
      {guard && (
        <span id="plans-guard" className="sr-only">
          Save your business profile first to start adding plans.
        </span>
      )}

      <PlanSheet
        open={sheet.open}
        editing={sheet.editing}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
        runsClasses={runsClasses}
        classTypes={classTypes}
        memberCount={sheet.editing ? (membersOf(sheet.editing)?.length ?? null) : null}
        save={(draft) => (sheet.editing ? ctx.edit(sheet.editing.id, draft) : ctx.add(draft))}
        onSaved={(plan, isNew) => {
          ctx.showToast(isNew ? `${plan.name} added. It shows on Explore now.` : `${plan.name} saved.`);
          if (isNew) {
            setOpenId(plan.id);
            // OP1-111: the saved plan's row opens and scrolls into view above the toast.
            window.setTimeout(() => rows.current.get(plan.id)?.scrollIntoView({ block: "center", behavior: "smooth" }), 80);
          }
        }}
      />
      <PlansToast bottom={150} />
    </div>
  );
};
