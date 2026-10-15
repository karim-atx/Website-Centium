import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Send } from "lucide-react";
import { BottomSheet } from "../../ui/BottomSheet";
import { CtaButton } from "../../ui/PinnedCta";
import { fetchMyPlans, type ProPlan } from "../../../services/hires/pro";
import { postPlansCard } from "../../../services/hires";
import { PLANS_PER_CARD, firstOfferablePlanIds } from "../../../services/hires/chatLogic";
import { cardPriceLine } from "../../../services/messaging/cards";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";
import { ProCardSkeleton, ProError } from "../states";

/**
 * Release 3 · MO22 v2 "Enquiry chat · Offer plans sheet": the professional's
 * active plans (professional_plans, own rows), each a check row; "Send {n}
 * plans" posts one plans card with the ticked ones (post_plans_card(thread,
 * ids); at most five, the database refuses more with 22023). Starts with the
 * first five active plans ticked (the order the card uses). "Edit services
 * and prices" opens More › Services.
 *
 * Rows (r6b option card): r16, 1px 10% border (ticked: primary at 60% on
 * primary.pale), pad 14 16, gap 14; the box 28 r8 (ticked: primary.deep fill,
 * white check 16 / 3; else card with a 1.5 15% border); name 15 / 700, price
 * 13 text.faint.
 */
export const OfferPlansSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  threadId: string;
  userId: string;
  firstName: string;
  onSent: () => void;
}> = ({ open, onClose, threadId, userId, firstName, onSent }) => {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<ProPlan[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPlans(null);
    setFailed(false);
    setError(null);
    void fetchMyPlans(userId).then((r) => {
      if (cancelled) return;
      if (!r.ok) return setFailed(true);
      const active = r.plans.filter((p) => p.active).sort((a, b) => a.position - b.position || a.createdAt.localeCompare(b.createdAt));
      setPlans(active);
      setPicked(new Set(firstOfferablePlanIds(active)));
    });
    return () => {
      cancelled = true;
    };
  }, [open, userId, reload]);

  const toggle = (id: string) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < PLANS_PER_CARD) next.add(id);
      return next;
    });

  const send = async () => {
    if (busy || picked.size === 0) return;
    setBusy(true);
    setError(null);
    const ids = (plans ?? []).filter((p) => picked.has(p.id)).map((p) => p.id);
    const r = await postPlansCard(threadId, ids);
    setBusy(false);
    if (!r.ok) return setError(r.message);
    onSent();
    onClose();
  };

  const n = picked.size;
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Offer plans"
      footer={
        plans && plans.length > 0 ? (
          <CtaButton label={busy ? "Sending…" : `Send ${n} ${n === 1 ? "plan" : "plans"}`} icon={<Send size={15} aria-hidden />} loading={busy} disabled={n === 0} onClick={() => void send()} />
        ) : undefined
      }
    >
      <p style={{ fontSize: textPx(13), lineHeight: 1.5, color: INK.chS, marginBottom: 14 }}>
        {`${firstName} sees each plan with a Choose button. Choosing opens checkout and moves the chat to Clients.`}
      </p>
      {failed ? (
        <ProError onRetry={() => setReload((x) => x + 1)} />
      ) : !plans ? (
        <div className="flex flex-col" style={{ gap: 8 }}>
          <ProCardSkeleton lines={2} />
          <ProCardSkeleton lines={2} />
        </div>
      ) : plans.length === 0 ? (
        <p style={{ fontSize: textPx(13), color: INK.chF, marginBottom: 8 }}>You have no active plans to offer yet.</p>
      ) : (
        <ul className="flex flex-col" style={{ gap: 8 }} aria-label="Your plans">
          {plans.map((p) => {
            const on = picked.has(p.id);
            return (
              <li key={p.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={on}
                  onClick={() => toggle(p.id)}
                  className="tap w-full flex items-center text-left"
                  style={{
                    gap: 14,
                    padding: "14px 16px",
                    minHeight: 64,
                    borderRadius: 16,
                    background: on ? INK.prPale : INK.card,
                    border: `1px solid ${on ? "rgb(var(--c-primary) / 0.6)" : INK.b10}`,
                  }}
                >
                  <span
                    aria-hidden
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 28, height: 28, borderRadius: 8, background: on ? INK.prDeep : INK.card, border: on ? "none" : "1.5px solid rgb(var(--c-charcoal) / 0.15)" }}
                  >
                    {on && <Check size={16} strokeWidth={3} color="#FFFFFF" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block" style={{ fontSize: textPx(15), fontWeight: 700, color: INK.ch, overflowWrap: "anywhere" }}>
                      {p.name}
                    </span>
                    <span className="block" style={{ fontSize: textPx(13), color: INK.chF, marginTop: 2 }}>
                      {cardPriceLine(p.price, p.billing)}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <button
        type="button"
        onClick={() => {
          onClose();
          navigate("/app/more/services");
        }}
        className="tap min-h-[44px] flex items-center"
        style={{ fontSize: textPx(13), fontWeight: 700, color: INK.prDeep, marginTop: 8 }}
      >
        Edit services and prices
      </button>
      {error && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, marginTop: 4 }}>
          {error}
        </p>
      )}
    </BottomSheet>
  );
};
