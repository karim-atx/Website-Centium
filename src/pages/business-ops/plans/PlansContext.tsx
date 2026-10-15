import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Archive, EyeOff, Pause, Trash2 } from "lucide-react";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { useIsDark } from "../../../hooks/useIsDark";
import type { MembershipPlanRow, PlanDbStatus } from "../../../services/membership-plans";
import { archiveBody, archivedToast } from "./planModel";
import { usePlans, type PlansData } from "./usePlans";

// v6 Batch 4 · Plans: one data source for the plan list (Front desk ›
// Memberships) and the plan page, so going to a plan and back keeps the open
// row (OP1-037 S1) and a toast raised on the page shows on the list. It also
// owns the plan actions and their confirms (OP1-048 Pause, 049 Hide, 051
// Archive; Delete for archived plans) and toasts (OP1-046, 050, 052).

interface ToastState {
  message: string;
  error?: boolean;
  id: number;
  action?: { label: string; onClick: () => void };
}

export type PlanAction = "pause" | "resume" | "hide" | "show" | "duplicate" | "archive" | "restore" | "delete";

interface PlansCtx extends PlansData {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  toast: ToastState | null;
  showToast: (message: string, error?: boolean, action?: ToastState["action"]) => void;
  clearToast: () => void;
  /** Runs a plan action, through its confirm where it has one. `after` runs once it landed (archive / delete from the plan page). */
  act: (action: PlanAction, plan: MembershipPlanRow, after?: () => void) => void;
}

const Ctx = createContext<PlansCtx | null>(null);

/**
 * What outlives one provider: the plan page and the Front desk list each mount
 * their own, so the open row (OP1-037 S1) and a toast raised just before
 * leaving the plan page (archive, delete) are handed over here.
 */
const carried: { openId: string | null; toast: ToastState | null } = { openId: null, toast: null };

/** Fired after a write made by a provider that may no longer be on screen. */
const PLANS_CHANGED = "centium-plans-changed";

const planPage = (id: string) => `/app/business/gym/${id}`;

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = usePlans();
  const navigate = useNavigate();
  const dark = useIsDark();
  const [openId, setOpenIdState] = useState<string | null>(carried.openId);
  // A carried toast is taken once, while fresh (StrictMode runs this twice).
  const [toast, setToast] = useState<ToastState | null>(() => (carried.toast && Date.now() - carried.toast.id < 3000 ? carried.toast : null));
  useEffect(() => {
    carried.toast = null;
  }, []);
  const { reload } = data;
  useEffect(() => {
    window.addEventListener(PLANS_CHANGED, reload);
    return () => window.removeEventListener(PLANS_CHANGED, reload);
  }, [reload]);
  const setOpenId = useCallback((id: string | null) => {
    carried.openId = id;
    setOpenIdState(id);
  }, []);
  const [confirm, setConfirm] = useState<{ action: "pause" | "hide" | "archive" | "delete"; plan: MembershipPlanRow; after?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const showToast = useCallback(
    (message: string, error?: boolean, action?: ToastState["action"]) => setToast({ message, error, action, id: Date.now() }),
    []
  );
  const clearToast = useCallback(() => setToast(null), []);

  /** Shows a toast here and hands it to the next plan screen when `after` leaves this one. */
  const say = (message: string, after?: () => void, action?: ToastState["action"]) => {
    showToast(message, false, action);
    if (after) {
      carried.toast = { message, id: Date.now(), action };
      after();
    }
  };

  const run = async (action: PlanAction, plan: MembershipPlanRow, after?: () => void) => {
    const fail = (message: string) => showToast(message, true);
    if (action === "pause" || action === "resume" || action === "archive" || action === "restore") {
      const to: PlanDbStatus = action === "pause" ? "paused" : action === "archive" ? "archived" : "active";
      const before = plan.dbStatus;
      const r = await data.setStatus(plan.id, to);
      if (!r.ok) return fail(r.message);
      if (action === "pause") return say(`${plan.name} is paused. Nobody new can buy it.`);
      if (action === "resume") return say(`${plan.name} is on sale again.`);
      if (action === "restore") return say(`${plan.name} is restored.`);
      if (openId === plan.id) setOpenId(null);
      const n = data.membersOf(plan)?.length ?? null;
      // OP1-052 S3 (OURS): Undo puts the plan back as it was while the toast shows.
      return say(archivedToast(plan.name, n), after, {
        label: "Undo",
        onClick: () => {
          clearToast();
          // The provider that raised the toast may be gone (archived from the plan page): tell the one on screen.
          void data.setStatus(plan.id, before).then(() => window.dispatchEvent(new Event(PLANS_CHANGED)));
        },
      });
    }
    if (action === "hide" || action === "show") {
      const r = await data.setVisible(plan.id, action === "show");
      if (!r.ok) return fail(r.message);
      return say(action === "hide" ? `${plan.name} is hidden from Explore.` : `${plan.name} is back on Explore.`);
    }
    if (action === "duplicate") {
      const r = await data.duplicate(plan);
      if (!r.ok) return fail(r.message);
      const copy = r.plan;
      return say(`${copy.name} added as hidden. Edit it, then show it on Explore.`, undefined, {
        label: "Open",
        onClick: () => {
          clearToast();
          navigate(planPage(copy.id));
        },
      });
    }
    // delete
    const r = await data.remove(plan.id);
    if (!r.ok) return fail(r.inUse ? `People have bought ${plan.name}, so it can't be deleted.` : r.message);
    if (openId === plan.id) setOpenId(null);
    say(`${plan.name} deleted.`, after);
  };

  const act = (action: PlanAction, plan: MembershipPlanRow, after?: () => void) => {
    if (action === "pause" || action === "hide" || action === "archive" || action === "delete") setConfirm({ action, plan, after });
    else void run(action, plan, after);
  };

  const onConfirm = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    await run(confirm.action, confirm.plan, confirm.after);
    setBusy(false);
    setConfirm(null);
  };

  const members = confirm ? data.membersOf(confirm.plan) : null;
  const count = members ? members.length : null;
  const inUse = (count ?? 0) > 0;
  const name = confirm?.plan.name ?? "";
  // OP1-048 / 049 / 051 (OpsTabsV4 confirm map, logic 622-630; pause body per V6-47).
  const cfg =
    confirm?.action === "pause"
      ? {
          icon: <Pause size={20} strokeWidth={2.2} />,
          disc: { bg: dark ? "#332B1A" : "#F6E9C9", ink: "rgb(var(--c-caution-strong))" },
          title: `Pause ${name}?`,
          body: "Members keep their plan and renewals continue. Nobody new can buy it until you resume.",
          label: "Pause plan",
          destructive: false,
          disabled: false,
        }
      : confirm?.action === "hide"
        ? {
            icon: <EyeOff size={20} strokeWidth={2.2} />,
            disc: { bg: "rgb(var(--c-cream-soft))", ink: "rgb(var(--c-charcoal-soft))" },
            title: `Hide ${name} from Explore?`,
            body: "Current members keep it. New members can't see or buy it.",
            label: "Hide plan",
            destructive: false,
            disabled: false,
          }
        : confirm?.action === "archive"
          ? {
              icon: <Archive size={20} strokeWidth={2.2} />,
              disc: undefined,
              title: `Archive ${name}?`,
              body: archiveBody(count),
              label: "Archive plan",
              destructive: true,
              disabled: false,
            }
          : {
              icon: <Trash2 size={20} strokeWidth={2.2} />,
              disc: undefined,
              title: `Delete ${name}?`,
              body: inUse ? "People have bought this plan, so it can't be deleted. It stays archived." : "It's removed for good. This can't be undone.",
              label: "Delete plan",
              destructive: true,
              disabled: inUse,
            };

  return (
    <Ctx.Provider value={{ ...data, openId, setOpenId, toast, showToast, clearToast, act }}>
      {children}
      <ConfirmCard
        open={!!confirm}
        layout="stacked"
        tone={cfg.destructive ? "destructive" : "primary"}
        destructiveFill="solid"
        cancelVariant="outlined"
        initialFocus="cancel"
        scrimBlur
        icon={cfg.icon}
        disc={cfg.disc}
        title={cfg.title}
        subtitle={cfg.body}
        confirmLabel={cfg.label}
        confirmDisabled={cfg.disabled}
        cancelLabel="Keep it"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void onConfirm()}
      />
    </Ctx.Provider>
  );
};

export function usePlansCtx(): PlansCtx | null {
  return useContext(Ctx);
}

/** The plan screens' toast (OP1-046: business toast, wraps; 150 above the fixed CTA on the list). */
export const PlansToast: React.FC<{ bottom?: number }> = ({ bottom }) => {
  const ctx = useContext(Ctx);
  const t = ctx?.toast;
  return (
    <Toast
      key={t?.id}
      open={!!t}
      message={t?.message ?? ""}
      variant="business"
      bottom={bottom}
      action={t?.action}
      icon={t?.error ? <AlertCircle size={18} strokeWidth={2.2} aria-hidden className="flex-none" style={{ color: "#F09A8E" }} /> : undefined}
      onExpire={() => ctx?.clearToast()}
    />
  );
};
