import React, { useCallback, useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { confirmHirePayment, fetchPendingHires, type PendingHire } from "../../services/hires/pro";
import { paymentMethodLabel } from "../../services/hires/proLogic";
import { formatPrice } from "../../utils/price";
import { textPx } from "../../theme/textSize";
import { INK } from "../pro/proInk";
import { Initials } from "../pro/home/ProTrendRing";
import { initialsOf } from "../pro/home/initials";
import { whenLabel } from "../pro/home/notificationText";
import { HubCta, HubCtaRow } from "../pro/home/HubCta";

// A3: hires waiting for the professional to confirm they were paid — the
// handover's "Cash hires stay 'Pending payment' until the professional confirms
// receipt" (MO1.2.1.5.1 §8), seen from the professional's side. Shown only in
// the Release 3 notifications hub (NotificationsHub, Requests tab).
//
// Release 3 W9: each hire is drawn as an HO7 request row (gen/hub5.js
// hubPanel5): the unread dot, avatar 40 gold, name 14 / 700 with the time 11
// text.tertiary, the line 12 / 600 text.soft, then Decline and Confirm payment
// as the frame's small buttons (HubCta). The buttons wrap onto two lines
// rather than wrapping "Confirm payment" (360 px with Larger text). The status
// line "Pending payment" takes the place of the frame's quoted message. The
// payment method shows only for cash (no Whish in the interface).
//
// professional_pending_hires() gives a FIRST NAME only, by design, and that is
// all this shows of the client. Confirming (confirm_hire_payment) activates
// the hire, makes them a client and posts the "Plan confirmed" chat card; it is
// idempotent, so a double press is harmless. Decline opens the caller's
// decline-with-reason (decline_hire).
//
// Renders nothing at all while there is nothing pending.

type Notice = { tone: "ok" | "error"; text: string } | null;

export const PendingHiresSection: React.FC<{
  /** The professional's plan name for the ATXA0 sentence, when known. */
  planLabel?: string | null;
  /** Called after a confirmation, which adds a client to the roster. */
  onConfirmed?: () => void | Promise<void>;
  /** Decline opens the caller's decline-with-reason (decline_hire). */
  onDecline: (hire: PendingHire) => void;
  /** Changing it re-reads the list (after the caller declined one). */
  reloadKey?: number;
  /** For "2h ago". */
  now: Date;
}> = ({ planLabel, onConfirmed, onDecline, reloadKey, now }) => {
  const { authUserId } = useApp();
  const [hires, setHires] = useState<PendingHire[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
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
  }, [authUserId, reloadKey]);

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

  if (hires.length === 0 && !loadError && !notice) return null;

  return (
    <section aria-label="Pending payment">
      {loadError && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi, padding: "8px 0" }}>
          {loadError}
        </p>
      )}
      {notice && (
        <p role="status" style={{ borderRadius: 14, background: notice.tone === "ok" ? INK.goodBg : INK.hiBg, padding: "10px 12px", margin: "8px 0", fontSize: textPx(12.5), fontWeight: 600, color: notice.tone === "ok" ? INK.ch : INK.hi, lineHeight: 1.4 }}>
          {notice.text}
        </p>
      )}
      {hires.map((h) => {
        const name = h.clientFirstName || "A client";
        return (
          <div key={h.id} className="flex" style={{ gap: 10, padding: "12px 0", borderBottom: `1px solid ${INK.b06}` }}>
            <span aria-hidden className="shrink-0" style={{ width: 8, height: 8, borderRadius: 9999, background: INK.pr, marginTop: 6 }} />
            <Initials text={initialsOf(name)} size={40} tone="gold" />
            <div className="flex-1 min-w-0">
              <div className="flex justify-between" style={{ gap: 8 }}>
                <p style={{ fontSize: textPx(14), fontWeight: 700, color: INK.ch }}>{name}</p>
                <span style={{ fontSize: textPx(11), color: INK.chT, whiteSpace: "nowrap" }}>{whenLabel(h.createdAt, now)}</span>
              </div>
              <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }}>
                {[h.planName, formatPrice(h.priceAgreed) || "$0", h.paymentMethod === "cash" ? paymentMethodLabel(h.paymentMethod) : null].filter(Boolean).join(" · ")}
              </p>
              <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: 2, lineHeight: 1.4 }}>Pending payment</p>
              <HubCtaRow>
                <HubCta variant="secondary" icon={X} label="Decline" ariaLabel={`Decline ${name}'s hire`} disabled={!!busy} onClick={() => onDecline(h)} />
                <HubCta icon={Check} label={busy === h.id ? "Confirming…" : "Confirm payment"} ariaLabel={`Confirm ${name}'s payment`} disabled={!!busy} onClick={() => void confirm(h)} />
              </HubCtaRow>
            </div>
          </div>
        );
      })}
    </section>
  );
};
