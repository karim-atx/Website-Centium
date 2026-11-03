import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  CalendarDays,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Layers,
  Pause,
  Pencil,
  Play,
  Plus,
  QrCode,
  Repeat,
  Sun,
  Ticket,
  Trash2,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import { MarketError, MarketOffline } from "../../../components/market/MarketStates";
import { useOnline } from "../../../hooks/useOnline";
import { useWebLayout } from "../../../components/web/useWebLayout";
import { BizShareButton } from "../../../components/share/business/BizShareButton";
import { planData } from "../../../components/share/business/bizCardModel";
import type { MembershipPlanRow } from "../../../services/membership-plans";
import { isMaskedLabel } from "../../../services/venues/consoleLogic";
import { isRtl, t, tk, tn } from "../../../i18n/core";
import { coverRows } from "./coverRows";
import { PlansStrip } from "./MembershipsTab";
import { PlanSheet } from "./PlanSheet";
import { PlansProvider, usePlansCtx, type PlanAction } from "./PlansContext";
import { initials, memberLine, priceLine, shortDate, sortMembers, statusChip, statusLine, untilLabel } from "./planModel";
import { PlanFocusCss } from "./ui";
import { BRAND, CARD_BORDER, DIVIDER, INK, INK2, LAV, LIST_BG, MUTED, TINT, TONE, type WebTone } from "../frontdesk/deskWebTokens";
import { WebPrimaryButton, WebPulse } from "../frontdesk/FrontDeskParts.web";

// Website viewport v1 · WB-FD.3 Memberships (WB-FD Front Desk Web v4,
// `isMem`): Front desk › Memberships as list-detail, the plan list in 5
// columns and the plan page in 7 (half and half on the rail), each with its
// own scroll. The list: the figures card (Active plans · Members on plans and
// the most popular plan), then the plans grouped Memberships / Day passes
// and drop-ins (rows 64: tile 44 r12, name 15/22 800 with the status pill,
// price and members 13/20; the selected row #F7F7FC with a 3px #AEA1DC edge),
// and the archived plans under "Archived · {n}". The plan page: the 64 tile,
// the name 28/36 800 and status, the five action tiles (64), the figures
// card, then Who it covers beside Members on this plan (stacked on the rail).
// The selected plan lives in ?plan= (the first plan by default). Reading,
// every plan action and its dialogs, the PlanSheet (a 440 side sheet from
// 1024) and the share card are the mobile plan screens', unchanged.

const MEMBERS_SHOWN = 4;
const ONE_OFF = new Set(["day_pass", "drop_in"]);

function planIcon(p: MembershipPlanRow): LucideIcon {
  if (p.kind === "day_pass") return Sun;
  if (p.kind === "drop_in") return Ticket;
  if (p.kind === "class_pack") return Layers;
  if (p.kind === "intro_offer") return Gift;
  return p.billing === "annually" ? CalendarDays : Repeat;
}

const pillTone = (tone: "good" | "warn" | "soft"): WebTone => tone;

const StatusPill: React.FC<{ plan: MembershipPlanRow; size?: 11 }> = ({ plan }) => {
  const s = statusChip(plan.status);
  const c = TONE[pillTone(s.tone)];
  return <span style={{ fontSize: 11, lineHeight: "14px", fontWeight: 800, padding: "2px 7px", borderRadius: 999, background: c.bg, color: c.ink, whiteSpace: "nowrap" }}>{s.label}</span>;
};

/** Front desk › Memberships on the web; brings its plans provider when none is above it. */
export const MembershipsWeb: React.FC<{ onAddRef?: (open: () => void) => void }> = ({ onAddRef }) => {
  const ctx = usePlansCtx();
  if (!ctx) {
    return (
      <PlansProvider>
        <MembershipsWeb onAddRef={onAddRef} />
      </PlansProvider>
    );
  }
  return <MembershipsBody onAddRef={onAddRef} />;
};

const MembershipsBody: React.FC<{ onAddRef?: (open: () => void) => void }> = ({ onAddRef }) => {
  const ctx = usePlansCtx()!;
  const navigate = useNavigate();
  const online = useOnline();
  const { rail } = useWebLayout();
  const [params, setParams] = useSearchParams();
  const [sheet, setSheet] = useState<{ open: boolean; editing: MembershipPlanRow | null }>({ open: false, editing: null });
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [added, setAdded] = useState<Set<string>>(() => new Set());

  const { plans, loading, error, businessId } = ctx;
  const live = plans.filter((p) => p.dbStatus !== "archived");
  const archived = plans.filter((p) => p.dbStatus === "archived");
  const guard = !loading && !error && !businessId;
  const empty = !loading && !error && (guard || live.length === 0) && archived.length === 0;

  // Hands the page header's Add plan its opener once (the callback changes on every render of the page).
  const addRef = useRef(onAddRef);
  useEffect(() => {
    addRef.current?.(() => setSheet({ open: true, editing: null }));
  }, []);

  const wanted = params.get("plan");
  const selected = plans.find((p) => p.id === wanted) ?? live[0] ?? archived[0] ?? null;
  const select = (id: string) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set("plan", id);
        return n;
      },
      { replace: true }
    );

  const memberships = live.filter((p) => !ONE_OFF.has(p.kind));
  const oneOff = live.filter((p) => ONE_OFF.has(p.kind));
  // Members on plans and the most popular plan: each plan's active holders
  // (figuresOf: business_plan_figures, the venue members as its fallback),
  // as the plan cards and the plan page count them.
  const { figuresOf } = ctx;
  const counted = live.map((p) => ({ name: p.name, n: figuresOf(p).active })).filter((x): x is { name: string; n: number } => x.n !== null);
  const totalMembers = counted.length ? counted.reduce((s, x) => s + x.n, 0) : null;
  const top = totalMembers ? [...counted].sort((a, b) => b.n - a.n)[0] : null;
  const popular = top && totalMembers ? { name: top.name, n: top.n, total: totalMembers } : null;
  const activePlans = live.filter((p) => p.status === "active").length;

  const onAction = (p: MembershipPlanRow) => (a: PlanAction) => {
    if (a === "edit") setSheet({ open: true, editing: p });
    else ctx.act(a, p);
  };

  const figures = (
    <div data-mem-figures style={{ flex: "none", boxSizing: "border-box", background: "#FFFFFF", border: CARD_BORDER, borderRadius: 22, overflow: "hidden" }}>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
        {[
          { l: t("Active plans"), v: loading && plans.length === 0 ? "–" : String(activePlans) },
          { l: t("Members on plans"), v: live.length === 0 && !loading ? "0" : totalMembers === null ? "–" : String(totalMembers) },
        ].map((f, i) => (
          <div key={f.l} style={{ minWidth: 0, padding: "16px 18px 14px", borderInlineStart: i ? DIVIDER : "none" }}>
            <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.l}</p>
            <p style={{ margin: "4px 0 0", fontSize: 40, lineHeight: "48px", fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: f.v === "–" ? "#A79E93" : INK }}>{f.v}</p>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, borderTop: DIVIDER, padding: "12px 18px 14px", fontSize: 13, lineHeight: "20px", color: INK2 }}>
        {live.length === 0
          ? t("Add your first plan to start selling memberships.")
          : popular
            ? t("{plan} is the most popular plan: {n} of {total} members.", { plan: popular.name, n: popular.n, total: popular.total })
            : t("Members show here once someone buys a plan.")}
      </p>
    </div>
  );

  const row = (p: MembershipPlanRow, i: number) => {
    const on = selected?.id === p.id;
    const Icon = planIcon(p);
    const line = memberLine(p, { ...ctx.figuresOf(p), isNew: added.has(p.id) });
    return (
      <button
        key={p.id}
        type="button"
        data-plan-row={p.id}
        aria-current={on ? "true" : undefined}
        onClick={() => {
          ctx.clearStrip();
          select(p.id);
        }}
        className="hover:!bg-[#FAF8FE] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#AEA1DC]"
        style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", minHeight: 64, width: "100%", boxSizing: "border-box", cursor: "pointer", borderTop: i ? DIVIDER : "none", borderInline: 0, borderBottom: 0, background: on ? LIST_BG : "transparent", boxShadow: on ? `inset ${isRtl() ? "-3px" : "3px"} 0 0 ${LAV}` : "none", textAlign: "start", color: INK }}
      >
        <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, background: TINT, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: BRAND }}>
          <Icon size={20} strokeWidth={1.9} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 15, lineHeight: "22px", fontWeight: 800 }}>{p.name}</span>
            <StatusPill plan={p} />
          </span>
          <span style={{ display: "block", marginTop: 2, fontSize: 13, lineHeight: "20px", color: INK2 }}>{priceLine(p)}</span>
          {line && <span style={{ display: "block", marginTop: 1, fontSize: 13, lineHeight: "20px", color: MUTED }}>{line}</span>}
        </span>
        <ChevronRight size={18} strokeWidth={2.2} aria-hidden className="rtl:-scale-x-100" style={{ color: MUTED, flex: "none" }} />
      </button>
    );
  };

  const group = (title: string, items: MembershipPlanRow[], key: string) =>
    items.length === 0 ? null : (
      <section key={key} aria-label={title} style={{ flex: "none", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", margin: "22px 4px 8px" }}>
          <h2 className="rtl:tracking-normal" style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED, whiteSpace: "nowrap" }}>{title}</h2>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: MUTED, whiteSpace: "nowrap" }}>{tn(items.length, "{n} plan", "{n} plans")}</p>
        </div>
        <div style={{ boxSizing: "border-box", background: "#FFFFFF", border: CARD_BORDER, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>{items.map(row)}</div>
      </section>
    );

  let list: React.ReactNode;
  if (loading && plans.length === 0) {
    list = <WebPulse style={{ marginTop: 18, height: 220, borderRadius: 20 }} />;
  } else if (error && plans.length === 0) {
    list = <MarketError thing={tk("your plans")} onRetry={ctx.reload} style={{ marginTop: 18 }} />;
  } else if (empty) {
    list = (
      <div data-web-empty style={{ flex: 1, minHeight: 280, marginTop: 18, boxSizing: "border-box", background: "#FFFFFF", border: "1px dashed #A79E93", borderRadius: 22, padding: "28px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <span aria-hidden style={{ width: 64, height: 64, borderRadius: 16, background: TINT, display: "inline-flex", alignItems: "center", justifyContent: "center", color: BRAND }}>
          <KeyRound size={28} />
        </span>
        <p style={{ margin: "12px 0 0", fontSize: 22, lineHeight: "30px", fontWeight: 800 }}>{t("No plans yet")}</p>
        <p style={{ margin: "4px 0 0", fontSize: 15, lineHeight: "24px", color: INK2, maxWidth: 440 }}>
          {guard ? t("Save your business profile first to start adding plans.") : t("Add a plan or a day pass and members can buy it on Explore. Each buyer gets their own QR code.")}
        </p>
        <div style={{ marginTop: 20 }}>
          {guard ? (
            <WebPrimaryButton label={t("Set up profile")} onClick={() => navigate("/app/business/profile")} disabled={!online} shadow="0 10px 24px rgba(95,80,147,0.35)" />
          ) : (
            <WebPrimaryButton icon={Plus} label={t("Add plan")} onClick={() => setSheet({ open: true, editing: null })} disabled={!businessId || !online} shadow="0 10px 24px rgba(95,80,147,0.35)" />
          )}
        </div>
      </div>
    );
  } else {
    list = (
      <>
        {group(t("Memberships"), memberships, "m")}
        {group(t("Day passes and drop-ins"), oneOff, "d")}
        {archived.length > 0 && (
          <section aria-label={t("Archived plans")} style={{ flex: "none" }}>
            <button
              type="button"
              aria-expanded={archivedOpen}
              onClick={() => setArchivedOpen((o) => !o)}
              className="focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ width: "100%", minHeight: 44, margin: "14px 0 0", padding: "0 4px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "transparent", border: 0, cursor: "pointer" }}
            >
              <span className="rtl:tracking-normal" style={{ fontSize: 13, lineHeight: "20px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>{t("Archived · {n}", { n: archived.length })}</span>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 700, color: BRAND }}>{archivedOpen ? t("Hide") : t("Show")}</span>
            </button>
            {archivedOpen && <div style={{ boxSizing: "border-box", background: "#FFFFFF", border: CARD_BORDER, borderRadius: 20, overflow: "hidden", display: "flex", flexDirection: "column" }}>{archived.map(row)}</div>}
          </section>
        )}
      </>
    );
  }

  return (
    <div data-fd-memberships style={{ flex: 1, minHeight: 0, display: "grid", gridTemplateColumns: empty ? "minmax(0,1fr)" : rail ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,5fr) minmax(0,7fr)", gridTemplateRows: "minmax(0,1fr)", gap: 24, lineHeight: "normal" }}>
      <PlanFocusCss />
      <div data-mem-list style={{ minWidth: 0, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column", paddingBottom: 8 }}>
        <PlansStrip onView={select} />
        <MarketOffline loaded={plans.length > 0} onRetry={ctx.reload} style={{ marginBottom: 12 }} />
        {error && plans.length > 0 ? <MarketError thing={tk("your plans")} onRetry={ctx.reload} style={{ marginBottom: 12 }} /> : null}
        {figures}
        {list}
      </div>
      {!empty && (
        <div data-mem-detail style={{ minWidth: 0, minHeight: 0, overflowY: "auto", paddingBottom: 8 }}>
          {selected ? <PlanPane key={selected.id} plan={selected} rail={rail} online={online} onAction={onAction(selected)} /> : loading ? <WebPulse style={{ height: 320, borderRadius: 22 }} /> : null}
        </div>
      )}

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
          select(plan.id);
        }}
        onDelete={(plan) => ctx.act("delete", plan, () => setSheet((s) => ({ ...s, open: false })), false)}
      />
    </div>
  );
};

/** The plan page in the detail column. */
const PlanPane: React.FC<{ plan: MembershipPlanRow; rail: boolean; online: boolean; onAction: (a: PlanAction) => void }> = ({ plan, rail, online, onAction }) => {
  const ctx = usePlansCtx()!;
  const [all, setAll] = useState(false);
  const members = ctx.membersOf(plan);
  const sorted = members ? sortMembers(members) : null;
  const count = sorted ? sorted.length : null;
  const shown = sorted ? (all ? sorted : sorted.slice(0, MEMBERS_SHOWN)) : [];
  const f = ctx.figuresOf(plan);
  const archived = plan.dbStatus === "archived";
  const paused = plan.dbStatus === "paused";
  const offline = !online;

  const actions: { key: PlanAction; icon: LucideIcon; label: string; title: string; danger?: boolean }[] = archived
    ? [
        { key: "restore", icon: ArchiveRestore, label: t("Restore plan"), title: t("Restore plan") },
        { key: "duplicate", icon: Copy, label: t("Duplicate"), title: t("Duplicate plan") },
        { key: "delete", icon: Trash2, label: t("Delete"), title: t("Delete plan"), danger: true },
      ]
    : [
        { key: "edit", icon: Pencil, label: t("Edit"), title: t("Edit plan") },
        paused ? { key: "resume", icon: Play, label: t("Resume"), title: t("Resume plan") } : { key: "pause", icon: Pause, label: t("Pause"), title: t("Pause plan") },
        plan.visibleOnExplore ? { key: "hide", icon: EyeOff, label: t("Hide"), title: t("Hide from Explore") } : { key: "show", icon: Eye, label: t("Show"), title: t("Show on Explore") },
        { key: "duplicate", icon: Copy, label: t("Duplicate"), title: t("Duplicate plan") },
        { key: "archive", icon: Archive, label: t("Archive"), title: t("Archive plan"), danger: true },
      ];
  const oneOff = plan.kind === "day_pass" || plan.kind === "drop_in" || plan.kind === "intro_offer";

  const card: React.CSSProperties = { boxSizing: "border-box", background: "#FFFFFF", border: CARD_BORDER, borderRadius: 22, overflow: "hidden", display: "flex", flexDirection: "column", minWidth: 0 };
  const cardTitle: React.CSSProperties = { margin: 0, fontSize: 17, lineHeight: "24px", fontWeight: 800, whiteSpace: "nowrap" };

  return (
    <div data-plan-pane style={{ display: "flex", flexDirection: "column", gap: 16, color: INK }}>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span aria-hidden style={{ width: 64, height: 64, borderRadius: 16, background: TINT, display: "flex", alignItems: "center", justifyContent: "center", flex: "none", color: BRAND }}>
          <QrCode size={28} strokeWidth={1.8} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span data-plan-name style={{ fontSize: 28, lineHeight: "36px", fontWeight: 800, letterSpacing: "-0.02em" }}>{plan.name}</span>
            <StatusPill plan={plan} />
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 15, lineHeight: "22px", color: INK2 }}>
            {priceLine(plan)} · {t(plan.paymentType)}
          </p>
          <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: MUTED }}>{statusLine(plan.status)}</p>
        </div>
        {!archived && (
          <BizShareButton
            label={t("Share {name}", { name: plan.name })}
            emptyHint={plan.status !== "active" ? t("Only a plan on sale on Explore can be shared.") : null}
            getData={() => ({ t: "plan", d: planData(plan) })}
          />
        )}
      </div>

      <div data-plan-actions style={{ display: "grid", gridTemplateColumns: `repeat(${actions.length},minmax(0,1fr))`, gap: 6 }}>
        {actions.map((a) => {
          const disabled = a.key !== "edit" && offline;
          return (
            <button
              key={a.key}
              type="button"
              title={a.title}
              aria-label={a.title}
              disabled={disabled}
              onClick={() => onAction(a.key)}
              className="hover:!bg-[#F0EDF9] disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#AEA1DC]"
              style={{ minHeight: 64, borderRadius: 16, background: "#F5F5F6", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, padding: "8px", fontSize: rail ? 13 : 15, lineHeight: rail ? "20px" : "22px", fontWeight: 800, color: a.danger ? "#C0392B" : INK, border: 0, cursor: disabled ? "default" : "pointer", minWidth: 0, textAlign: "center" }}
            >
              <a.icon size={20} strokeWidth={2.1} aria-hidden />
              <span style={{ maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.label}</span>
            </button>
          );
        })}
      </div>

      <div data-plan-figures style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)" }}>
          {[
            { l: oneOff ? t("Sold this month") : t("Members"), v: oneOff ? f.soldMonth : f.active },
            { l: oneOff ? t("Sold today") : t("New this month"), v: oneOff ? f.soldToday : f.soldMonth },
          ].map((x, i) => (
            <div key={x.l} style={{ minWidth: 0, padding: "16px 18px 14px", borderInlineStart: i ? DIVIDER : "none" }}>
              <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", fontWeight: 700, color: MUTED, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.l}</p>
              <p style={{ margin: "4px 0 0", fontSize: 40, lineHeight: "48px", fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", color: x.v === null ? "#A79E93" : INK }}>{x.v === null ? "–" : String(x.v)}</p>
            </div>
          ))}
        </div>
        <p style={{ margin: 0, borderTop: DIVIDER, padding: "12px 18px 14px", fontSize: 13, lineHeight: "20px", color: INK2 }}>{memberLine(plan, f) ?? statusLine(plan.status)}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: rail ? "minmax(0,1fr)" : "minmax(0,1fr) minmax(0,1fr)", alignItems: "start", gap: 16 }}>
        <section data-plan-covers style={card} aria-label={t("Who it covers")}>
          <div style={{ padding: "14px 16px 6px" }}>
            <h2 style={cardTitle}>{t("Who it covers")}</h2>
          </div>
          {coverRows(plan, ctx.runsClasses, (id) => ctx.plans.find((p) => p.id === id)?.name ?? null).map((r, i) => (
            <div key={r.title} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: i ? DIVIDER : "none" }}>
              <r.icon size={20} aria-hidden style={{ color: MUTED, flex: "none" }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>{r.title}</p>
                <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: MUTED }}>{r.sub}</p>
              </div>
              <span style={{ fontSize: 13, lineHeight: "20px", fontWeight: 800, textAlign: "end" }}>{r.value}</span>
            </div>
          ))}
        </section>

        <section data-plan-members style={card} aria-label={t("Members on this plan")}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, padding: "14px 16px 6px" }}>
            <h2 style={cardTitle}>{t("Members on this plan")}</h2>
            {count !== null && <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: MUTED }}>{count}</p>}
          </div>
          {!ctx.membersLoaded ? (
            <WebPulse style={{ margin: "6px 16px 14px", height: 96, borderRadius: 14 }} />
          ) : count === null ? (
            <p style={{ margin: 0, padding: "10px 16px 14px", fontSize: 13, lineHeight: "20px", color: INK2 }}>{t("Couldn't load the members of this plan.")}</p>
          ) : count === 0 ? (
            <p style={{ margin: 0, padding: "10px 16px 14px", fontSize: 13, lineHeight: "20px", color: INK2 }}>{t("No members on this plan yet.")}</p>
          ) : (
            shown.map((x, i) => (
              <div key={x.membershipId} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderTop: i ? DIVIDER : "none" }}>
                <span aria-hidden style={{ width: 34, height: 34, borderRadius: 999, background: "#EAF4F2", color: "#2F5F58", display: "flex", alignItems: "center", justifyContent: "center", flex: "none", fontSize: 12, fontWeight: 800 }}>
                  {isMaskedLabel(x.label) ? <UserRound size={15} /> : initials(x.label)}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 15, lineHeight: "22px", fontWeight: 700 }}>
                    {x.label}
                    {x.isMinor ? <span style={{ fontSize: 13, fontWeight: 700, color: MUTED }}> · {t("Under 18")}</span> : null}
                  </p>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: "20px", color: MUTED }}>{[t("Joined {date}", { date: shortDate(x.startedOn) }), untilLabel(x.expiresOn)].filter(Boolean).join(" · ")}</p>
                </div>
              </div>
            ))
          )}
          {count !== null && count > MEMBERS_SHOWN && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="hover:!bg-[#FAF8FE] focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#AEA1DC]"
              style={{ borderTop: DIVIDER, borderInline: 0, borderBottom: 0, padding: "12px 16px", minHeight: 44, boxSizing: "border-box", textAlign: "center", fontSize: 15, lineHeight: "20px", fontWeight: 700, color: BRAND, background: "transparent", cursor: "pointer" }}
            >
              {all ? t("Show fewer") : t("See all {n}", { n: count })}
            </button>
          )}
          <p style={{ margin: 0, borderTop: DIVIDER, padding: "10px 16px 14px", fontSize: 13, lineHeight: "20px", color: MUTED }}>{t("Each member gets their own QR code to check in when they buy this plan.")}</p>
        </section>
      </div>
    </div>
  );
};
