import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AlertCircle, Trash2 } from "lucide-react";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import type { MembershipPlanRow } from "../../../services/membership-plans";
import { usePlans, type PlansData } from "./usePlans";

// v6 Batch 4 · Plans: one data source for the plan list (Front desk ›
// Memberships) and the plan page, so going to a plan and back keeps the open
// row (OP1-037 S1) and a toast raised on the page shows on the list.

interface ToastState {
  message: string;
  error?: boolean;
  id: number;
}

interface PlansCtx extends PlansData {
  openId: string | null;
  setOpenId: (id: string | null) => void;
  toast: ToastState | null;
  showToast: (message: string, error?: boolean) => void;
  clearToast: () => void;
  /** Delete with a confirm (the live delete, kept until B7 archive; OP1-051 layout). */
  requestDelete: (plan: MembershipPlanRow, after?: () => void) => void;
}

const Ctx = createContext<PlansCtx | null>(null);

/**
 * What outlives one provider: the plan page and the Front desk list each mount
 * their own, so the open row (OP1-037 S1) and a toast raised just before
 * leaving the plan page (delete) are handed over here.
 */
const carried: { openId: string | null; toast: ToastState | null } = { openId: null, toast: null };

/** Shows a toast on the next plan screen (the page is about to be left). */
function carryToast(message: string, error?: boolean) {
  carried.toast = { message, error, id: Date.now() };
}

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = usePlans();
  const [openId, setOpenIdState] = useState<string | null>(carried.openId);
  // A carried toast is taken once, while fresh (StrictMode runs this twice).
  const [toast, setToast] = useState<ToastState | null>(() => (carried.toast && Date.now() - carried.toast.id < 3000 ? carried.toast : null));
  useEffect(() => {
    carried.toast = null;
  }, []);
  const setOpenId = useCallback((id: string | null) => {
    carried.openId = id;
    setOpenIdState(id);
  }, []);
  const [confirm, setConfirm] = useState<{ plan: MembershipPlanRow; after?: () => void } | null>(null);
  const [busy, setBusy] = useState(false);

  const showToast = useCallback((message: string, error?: boolean) => setToast({ message, error, id: Date.now() }), []);
  const clearToast = useCallback(() => setToast(null), []);
  const requestDelete = useCallback((plan: MembershipPlanRow, after?: () => void) => setConfirm({ plan, after }), []);

  const runDelete = async () => {
    if (!confirm || busy) return;
    setBusy(true);
    const { plan, after } = confirm;
    const r = await data.remove(plan.id);
    setBusy(false);
    setConfirm(null);
    if (!r.ok) {
      showToast(r.inUse ? `People have bought ${plan.name}, so it can't be deleted.` : r.message, true);
      return;
    }
    if (openId === plan.id) setOpenId(null);
    showToast(`${plan.name} deleted.`);
    if (after) {
      carryToast(`${plan.name} deleted.`);
      after();
    }
  };

  const members = confirm ? data.membersOf(confirm.plan) : null;
  const inUse = (members?.length ?? 0) > 0;

  return (
    <Ctx.Provider value={{ ...data, openId, setOpenId, toast, showToast, clearToast, requestDelete }}>
      {children}
      <ConfirmCard
        open={!!confirm}
        layout="stacked"
        tone="destructive"
        destructiveFill="solid"
        cancelVariant="outlined"
        initialFocus="cancel"
        scrimBlur
        icon={<Trash2 size={20} strokeWidth={2.2} />}
        title={confirm ? `Delete ${confirm.plan.name}?` : ""}
        subtitle={
          inUse
            ? "People have bought this plan, so it can't be deleted. Archiving, which keeps their memberships, is coming soon."
            : "It's removed from Explore and can't be bought."
        }
        confirmLabel="Delete plan"
        confirmDisabled={inUse}
        cancelLabel="Keep it"
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void runDelete()}
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
      icon={t?.error ? <AlertCircle size={18} strokeWidth={2.2} aria-hidden className="flex-none" style={{ color: "#F09A8E" }} /> : undefined}
      onExpire={() => ctx?.clearToast()}
    />
  );
};

