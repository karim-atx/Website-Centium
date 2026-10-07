import { useState } from "react";
import { CentredPopup } from "../ui/CentredPopup";
import { MemberTag } from "../marketplace/MemberTag";
import type { TypeColours } from "../professionals/typeColour";
import { textPx } from "../../theme/textSize";
import {
  cancelHire,
  cancelPromptLine,
  clientCancelledLine,
  describeClientCancelError,
  hireStatusLabel,
  hireUntilLabel,
  priceShort,
  type MyHire,
} from "../../services/hires";

// A3-client: where a client sees their hire later — on the professional's
// profile, above the pinned row, from my_hires(). The status is the
// handover's "Pending payment" until the professional confirms receipt, then
// Active. Cancel hire calls cancel_hire(); the wording is chosen by whether
// the professional has confirmed (the predicate cancel_hire() returns as
// was_free) and, after it, says what was agreed and that Centium records the
// cancellation only. No charge or refund is ever named.
//
// UNSPECIFIED BY THE HANDOVER: no frame draws a hire's status on the profile
// or a cancel action. Built from the profile's own pieces (the section label,
// the r20 card with the 0.08 hairline the About card uses, the stage 5 member
// tag, CentredPopup), so every size and colour here is theirs, not a frame's.

export function YourHireCard({
  hire,
  t,
  sectionLabel,
  onChanged,
}: {
  hire: MyHire;
  t: TypeColours;
  sectionLabel: (text: string) => React.ReactNode;
  /** Reload my_hires() after a cancel; `note` is what cancelling did, for the page to show once this card is gone. */
  onChanged: (note?: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = hire.paymentStatus !== "paid";
  const until = hireUntilLabel(hire.expiresOn);

  const cancel = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await cancelHire(hire.id);
    setBusy(false);
    setConfirming(false);
    if (!r.ok) {
      setError(r.code ? describeClientCancelError(r.code) : r.message);
      if (r.code === "ATXA1") onChanged();
      return;
    }
    onChanged(clientCancelledLine(hire.professionalFirstName, r.wasFree));
  };

  return (
    <section className="mb-5 animate-fade-slide-up" aria-label="Your plan">
      {sectionLabel("Your plan")}
      <div className="rounded-[20px] bg-cream-card border border-charcoal/[0.08] p-4">
        <div className="flex items-start gap-2.5">
          <div className="min-w-0 flex-1">
            <p className="m-0 font-semibold text-charcoal break-words" style={{ fontSize: textPx(13.5) }}>
              {hire.planName}
            </p>
            <p className="m-0 mt-0.5 text-charcoal-faint tabular-nums" style={{ fontSize: textPx(11.5) }}>
              {[priceShort(hire.priceAgreed), hire.paymentMethod === "whish" ? "Whish Money" : "Cash", until].filter(Boolean).join(" · ")}
            </p>
          </div>
          <MemberTag label={hireStatusLabel(hire)} tone={pending ? "pending" : "member"} />
        </div>
        {pending && (
          <p className="m-0 mt-2 text-[12px] leading-[1.5] text-charcoal-soft">
            {hire.paymentMethod === "cash" ? `Pay ${hire.professionalFirstName || "them"} in person. ` : ""}
            Your hire becomes active once they confirm they've been paid.
          </p>
        )}
        <button
          type="button"
          onClick={() => {
            setError(null);
            setConfirming(true);
          }}
          className="tap mt-3 h-8 px-3 -ml-1 rounded-[10px] text-[12px] font-bold"
          style={{ color: t.deep }}
        >
          Cancel hire
        </button>
        {error && (
          <p role="alert" className="m-0 mt-2 text-[12.5px] font-medium text-status-high">
            {error}
          </p>
        )}
      </div>

      <CentredPopup
        open={confirming}
        onClose={() => !busy && setConfirming(false)}
        title="Cancel this hire?"
        body={cancelPromptLine(hire)}
        cta={{ label: "Cancel hire", loading: busy, onClick: () => void cancel() }}
      >
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={busy}
          className="tap mt-2 w-full h-11 text-[14px] font-bold text-th-7d67d9 dark:text-primary-dark disabled:opacity-40"
        >
          Keep my plan
        </button>
      </CentredPopup>
    </section>
  );
}
