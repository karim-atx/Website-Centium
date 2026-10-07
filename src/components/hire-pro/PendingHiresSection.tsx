import React, { useCallback, useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { SectionLabel } from "../ui/SectionLabel";
import { useApp } from "../../context/AppContext";
import { cancelHire, confirmHirePayment, fetchPendingHires, type PendingHire } from "../../services/hires/pro";
import { cancelledLine, paymentMethodLabel } from "../../services/hires/proLogic";
import { formatPrice } from "../../utils/price";
import { formatDisplayDate } from "../../utils/date";

// A3: hires waiting for the professional to confirm they were paid — the
// handover's "Cash hires stay 'Pending payment' until the professional confirms
// receipt" (MO1.2.1.5.1 §8), seen from the professional's side.
//
// UNSPECIFIED BY THE HANDOVER: no v5.1 frame draws this. Built from the
// console's own Card / Button / SectionLabel and the inbox's row styles.
//
// professional_pending_hires() gives a FIRST NAME only, by design, and that is
// all this shows of the client. Confirming (confirm_hire_payment) activates
// the hire, makes them a client and posts the "Plan confirmed" chat card; it is
// idempotent, so a double press is harmless. Cancelling (cancel_hire) leaves
// any existing client relationship alone.
//
// Renders nothing at all while there is nothing pending, so the console looks
// as it did for a professional nobody has hired.

type Notice = { tone: "ok" | "error"; text: string } | null;

export const PendingHiresSection: React.FC<{
  /** The professional's plan name for the ATXA0 sentence, when known. */
  planLabel?: string | null;
  /** Called after a confirmation, which adds a client to the roster. */
  onConfirmed?: () => void | Promise<void>;
  className?: string;
}> = ({ planLabel, onConfirmed, className }) => {
  const { authUserId } = useApp();
  const [hires, setHires] = useState<PendingHire[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [askingCancel, setAskingCancel] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const reload = useCallback(async () => {
    const res = await fetchPendingHires();
    if (res.ok) {
      setHires(res.hires);
      setLoadError(null);
    } else {
      setLoadError(res.message);
    }
  }, []);

  useEffect(() => {
    if (!authUserId) return;
    let cancelled = false;
    void fetchPendingHires().then((res) => {
      if (cancelled) return;
      if (res.ok) setHires(res.hires);
      else setLoadError(res.message);
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  const confirm = async (hire: PendingHire) => {
    if (busy) return;
    setBusy(hire.id);
    setNotice(null);
    const res = await confirmHirePayment(hire.id, planLabel);
    setBusy(null);
    if (res.ok) {
      setHires((prev) => prev.filter((h) => h.id !== hire.id));
      setNotice({
        tone: "ok",
        text: `${hire.clientFirstName || "The client"}'s payment is confirmed. They're now one of your clients.`,
      });
      await onConfirmed?.();
      await reload();
      return;
    }
    setNotice({ tone: "error", text: res.message });
    // ATXA1: cancelled or gone in the meantime, so the list catches up.
    if (res.code === "ATXA1") await reload();
  };

  const cancel = async (hire: PendingHire) => {
    if (busy) return;
    setBusy(hire.id);
    setNotice(null);
    const res = await cancelHire(hire.id);
    setBusy(null);
    setAskingCancel(null);
    if (res.ok) {
      setHires((prev) => prev.filter((h) => h.id !== hire.id));
      setNotice({ tone: "ok", text: cancelledLine(hire.clientFirstName, res.wasFree) });
      await reload();
      return;
    }
    setNotice({ tone: "error", text: res.message });
    if (res.code === "ATXA1") await reload();
  };

  if (hires.length === 0 && !loadError && !notice) return null;

  return (
    <section className={className} aria-labelledby="pending-hires-label">
      <SectionLabel id="pending-hires-label" className="mb-3">
        Pending payment
      </SectionLabel>
      <div className="space-y-2.5">
        {loadError && (
          <p className="text-xs font-semibold text-status-high" role="alert">
            {loadError}
          </p>
        )}
        {notice && (
          <div
            role="status"
            className={notice.tone === "ok" ? "rounded-xl bg-primary-pale px-3.5 py-2.5" : "rounded-xl bg-status-high-bg px-3.5 py-2.5"}
          >
            <p className={notice.tone === "ok" ? "text-xs font-semibold text-charcoal" : "text-xs text-status-high"}>
              {notice.text}
            </p>
          </div>
        )}
        {hires.map((h) => {
          const name = h.clientFirstName || "A client";
          return (
            <Card key={h.id} className="animate-fade-slide-up">
              <p className="text-sm font-bold text-charcoal">{name}</p>
              <p className="text-xs text-charcoal-soft">
                {h.planName} · {formatPrice(h.priceAgreed) || "$0"} · {paymentMethodLabel(h.paymentMethod)}
              </p>
              <p className="text-[11px] text-charcoal-faint mb-3">Hired you {formatDisplayDate(h.createdAt)}</p>
              {askingCancel === h.id ? (
                <div>
                  <p className="text-xs text-charcoal-soft mb-2.5">
                    Cancel {name}'s hire? Nothing has been confirmed yet, so it's cancelled at no cost.
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1" disabled={!!busy} onClick={() => setAskingCancel(null)}>
                      Keep
                    </Button>
                    <Button size="sm" variant="secondary" className="flex-1" disabled={!!busy} onClick={() => void cancel(h)}>
                      {busy === h.id ? "Cancelling…" : "Cancel hire"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1" disabled={!!busy} onClick={() => setAskingCancel(h.id)}>
                    Cancel
                  </Button>
                  <Button size="sm" className="flex-1" disabled={!!busy} onClick={() => void confirm(h)}>
                    {busy === h.id ? "Confirming…" : "Confirm payment"}
                  </Button>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
};
