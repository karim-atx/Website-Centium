import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { StripTone } from "../../../components/market/ConfirmationStrip";
import type { MembershipPlanRow, PlanDbStatus } from "../../../services/membership-plans";
import { CentredDialog } from "../../business-market/listingParts";
import { archiveBody } from "./planModel";
import { usePlans, type PlansData } from "./usePlans";

// Market + Share 3.0 · W3 · B-MA.5 / B-MA.5.1: one data source for the plan
// list (Marketplace › Gym › Memberships and Front desk › Memberships) and the
// plan page, so a strip raised on the page shows on the list. It owns the
// plan menu's actions and their dialogs:
// - Delete: the two CentredDialogs as drawn (`del`: "Delete this plan?" /
//   "Members with an active plan keep it until it ends." / Cancel · Delete,
//   then "Confirm delete" / "This can't be undone." / Cancel · Delete plan),
//   through the live delete; its in-use refusal (ATXA4 / 23503) is kept,
//   inside step 2, with Archive offered instead (live).
// - Archive (kept live action): one CentredDialog with the live body.
// - Pause / Resume, Show / Hide on Explore, Duplicate, Restore act at once,
//   as the drawn menu's Pause plan does.
// The result is the ConfirmationStrip at the top of the list ("Plan added" /
// "Plan updated" / "Plan deleted" as drawn; the kept actions' lines OURS),
// closing after 2.6 s (W1 lead decision Q5); the plan it names gets the
// drawn 1.5px --fill border while it shows (bizPlans `bd`).

export type PlanAction = "edit" | "pause" | "resume" | "hide" | "show" | "duplicate" | "archive" | "restore" | "delete";

export interface StripState {
  text: string;
  tone: StripTone;
  /** The plan the strip is about (its card is outlined and "View" scrolls to it). */
  planId?: string;
  /** The stub: "View" (scroll to the plan), "Undo" (runs `undo`) or "Done". */
  stub: "View" | "Undo" | "Done";
  undo?: () => void;
  id: number;
}

interface PlansCtx extends PlansData {
  strip: StripState | null;
  say: (text: string, opts?: { planId?: string; tone?: StripTone; stub?: StripState["stub"]; undo?: () => void }) => void;
  clearStrip: () => void;
  /**
   * Runs a plan menu action (Edit is the caller's). `after` runs once it
   * landed (archive / delete from the plan page, delete from the sheet);
   * `carry` (default true) hands the strip to the next plan screen.
   */
  act: (action: Exclude<PlanAction, "edit">, plan: MembershipPlanRow, after?: () => void, carry?: boolean) => void;
}

const Ctx = createContext<PlansCtx | null>(null);

/**
 * What outlives one provider: the plan page and the list each mount their
 * own, so a strip raised just before leaving the plan page (archive, delete)
 * is handed over here.
 */
const carried: { strip: StripState | null } = { strip: null };

/** Fired after a write made by a provider that may no longer be on screen. */
const PLANS_CHANGED = "centium-plans-changed";

/** Success strips close after 2.6 s (W1 Q5); an error stays 6 s so it can be read. */
const STRIP_MS = 2600;
const ERROR_MS = 6000;

type DeleteState = { plan: MembershipPlanRow; step: 1 | 2; after?: () => void; carry: boolean; error: string | null; inUse: boolean };

export const PlansProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const data = usePlans();
  // A carried strip is taken once, while fresh (StrictMode runs this twice).
  const [strip, setStrip] = useState<StripState | null>(() => (carried.strip && Date.now() - carried.strip.id < 2000 ? carried.strip : null));
  useEffect(() => {
    carried.strip = null;
  }, []);
  const { reload } = data;
  useEffect(() => {
    window.addEventListener(PLANS_CHANGED, reload);
    return () => window.removeEventListener(PLANS_CHANGED, reload);
  }, [reload]);
  useEffect(() => {
    if (!strip) return;
    const t = window.setTimeout(() => setStrip(null), strip.tone === "error" ? ERROR_MS : STRIP_MS);
    return () => window.clearTimeout(t);
  }, [strip]);

  const say = useCallback<PlansCtx["say"]>((text, opts) => {
    setStrip({ text, tone: opts?.tone ?? "success", planId: opts?.planId, stub: opts?.stub ?? (opts?.tone === "error" ? "Done" : "View"), undo: opts?.undo, id: Date.now() });
  }, []);
  const clearStrip = useCallback(() => setStrip(null), []);

  /** Shows the strip here and hands it to the next plan screen when `after` leaves this one. */
  const sayThen = (s: Omit<StripState, "id">, after?: () => void, carry = true) => {
    const next = { ...s, id: Date.now() };
    setStrip(next);
    if (after) {
      if (carry) carried.strip = next;
      after();
    }
  };
  const fail = (message: string) => say(message, { tone: "error", stub: "Done" });

  const busy = useRef(false);
  const run = async (action: Exclude<PlanAction, "edit" | "delete">, plan: MembershipPlanRow, after?: () => void, carry = true) => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (action === "pause" || action === "resume" || action === "archive" || action === "restore") {
        const to: PlanDbStatus = action === "pause" ? "paused" : action === "archive" ? "archived" : "active";
        const before = plan.dbStatus;
        const r = await data.setStatus(plan.id, to);
        if (!r.ok) return fail(r.message);
        if (action === "archive") {
          return sayThen(
            {
              text: "Plan archived",
              tone: "success",
              stub: "Undo",
              undo: () => {
                setStrip(null);
                // The provider that raised the strip may be gone (archived from the plan page): tell the one on screen.
                void data.setStatus(plan.id, before).then(() => window.dispatchEvent(new Event(PLANS_CHANGED)));
              },
            },
            after,
            carry
          );
        }
        return say(action === "pause" ? "Plan paused" : action === "resume" ? "Plan resumed" : "Plan restored", { planId: plan.id });
      }
      if (action === "hide" || action === "show") {
        const r = await data.setVisible(plan.id, action === "show");
        if (!r.ok) return fail(r.message);
        return say(action === "hide" ? "Plan hidden from Explore" : "Plan shown on Explore", { planId: plan.id });
      }
      // duplicate
      const r = await data.duplicate(plan);
      if (!r.ok) return fail(r.message);
      return say("Plan duplicated as hidden", { planId: r.plan.id });
    } finally {
      busy.current = false;
    }
  };

  const [archiving, setArchiving] = useState<{ plan: MembershipPlanRow; after?: () => void; carry: boolean } | null>(null);
  const [del, setDel] = useState<DeleteState | null>(null);
  const [dialogBusy, setDialogBusy] = useState(false);

  const act: PlansCtx["act"] = (action, plan, after, carry = true) => {
    if (action === "archive") setArchiving({ plan, after, carry });
    else if (action === "delete") setDel({ plan, step: 1, after, carry, error: null, inUse: false });
    else void run(action, plan, after, carry);
  };

  const confirmArchive = async () => {
    if (!archiving || dialogBusy) return;
    setDialogBusy(true);
    await run("archive", archiving.plan, archiving.after, archiving.carry);
    setDialogBusy(false);
    setArchiving(null);
  };

  const confirmDelete = async () => {
    if (!del || dialogBusy) return;
    if (del.step === 1) return setDel({ ...del, step: 2 });
    const { plan, after, carry } = del;
    if (del.inUse) {
      // The live refusal's way out: archive it instead (an archived plan just closes).
      if (plan.dbStatus === "archived") return setDel(null);
      setDialogBusy(true);
      await run("archive", plan, after, carry);
      setDialogBusy(false);
      return setDel(null);
    }
    setDialogBusy(true);
    const r = await data.remove(plan.id);
    setDialogBusy(false);
    if (!r.ok) {
      if (r.inUse) return setDel({ ...del, inUse: true, error: `People have bought ${plan.name}, so it can't be deleted.${plan.dbStatus === "archived" ? "" : " Archive it to stop selling it."}` });
      return setDel({ ...del, error: r.message });
    }
    setDel(null);
    sayThen({ text: "Plan deleted", tone: "success", stub: "Done" }, after, carry);
  };

  const archiveCount = archiving ? (data.figuresOf(archiving.plan).active ?? data.membersOf(archiving.plan)?.length ?? null) : null;

  return (
    <Ctx.Provider value={{ ...data, strip, say, clearStrip, act }}>
      {children}
      <CentredDialog
        open={!!archiving}
        title={archiving ? `Archive ${archiving.plan.name}?` : ""}
        body={archiveBody(archiveCount)}
        cancel="Cancel"
        action="Archive plan"
        busy={dialogBusy}
        onCancel={() => !dialogBusy && setArchiving(null)}
        onAction={() => void confirmArchive()}
      />
      <CentredDialog
        open={!!del}
        title={del?.step === 2 ? "Confirm delete" : "Delete this plan?"}
        body={del?.step === 2 ? "This can't be undone." : "Members with an active plan keep it until it ends."}
        cancel="Cancel"
        action={del?.step === 2 ? (del.inUse ? (del.plan.dbStatus === "archived" ? "OK" : "Archive plan") : "Delete plan") : "Delete"}
        tone={del?.inUse && del.plan.dbStatus === "archived" ? "primary" : "destructive"}
        busy={dialogBusy}
        error={del?.error}
        onCancel={() => !dialogBusy && setDel(null)}
        onAction={() => void confirmDelete()}
      />
    </Ctx.Provider>
  );
};

export function usePlansCtx(): PlansCtx | null {
  return useContext(Ctx);
}
