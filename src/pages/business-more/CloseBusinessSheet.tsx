import { useState, type CSSProperties } from "react";
import { BizButton, BizButtonSoft, BizField, BizSheet } from "../../components/business-more/kit";
import { closeBusiness, closeNameMatches, CLOSURE_REASON_MAX } from "../../services/business-closure";
import { useOnline } from "../../hooks/useOnline";

// CP: closing a business for good (close_business, owner only). The
// consequences are spelled out before the confirm, and the confirm needs the
// business's name typed back: there is no reopen, so one tap must not do it.

const CONSEQUENCES = [
  "Nothing is deleted. Members keep their records, receipts, bookings and reviews.",
  "No new bookings, sales, memberships, check-ins, staff invites or join requests.",
  "Your business leaves Explore.",
  "There's no reopening. To stop for a while instead, deactivate it.",
];

export function CloseBusinessSheet({
  open,
  businessId,
  businessName,
  onClose,
  onClosed,
}: {
  open: boolean;
  businessId: string;
  businessName: string;
  onClose: () => void;
  onClosed: (closedAt: string, reason: string | null) => void;
}) {
  const online = useOnline();
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const matches = closeNameMatches(typed, businessName);

  const close = () => {
    if (busy) return;
    setTyped("");
    setError(null);
    onClose();
  };

  const confirm = async () => {
    if (!matches || busy) return;
    setBusy(true);
    setError(null);
    const r = await closeBusiness(businessId, reason);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setTyped("");
    onClosed(r.closedAt, reason.trim() || null);
  };

  return (
    <BizSheet open={open} onClose={close} title="Close your business?" lead="Closing is for good. Here's what it means.">
      <ul className="m-0 p-0 list-none flex flex-col" style={{ gap: 8, marginBottom: 16 }} data-close-consequences="">
        {CONSEQUENCES.map((line) => (
          <li key={line} className="flex items-start text-[12.5px] leading-[18px] text-charcoal" style={{ gap: 8 }}>
            <span aria-hidden className="shrink-0 rounded-full bg-status-high" style={{ width: 5, height: 5, marginTop: 7 }} />
            <span style={{ textWrap: "pretty" } as CSSProperties}>{line}</span>
          </li>
        ))}
      </ul>
      <BizField id="close-reason" label="Reason (optional)" value={reason} onChange={setReason} placeholder="For your records" maxLength={CLOSURE_REASON_MAX} />
      <BizField id="close-name" label={`Type ${businessName} to confirm`} value={typed} onChange={setTyped} autoComplete="off" />
      {error && (
        <p role="alert" className="text-[12px] font-bold text-status-high" style={{ marginBottom: 6 }}>
          {error}
        </p>
      )}
      {!online && (
        <p role="status" className="text-[12px] font-semibold text-charcoal-soft" style={{ marginBottom: 6 }}>
          You're offline. Connect to close your business.
        </p>
      )}
      <BizButton label={busy ? "Closing…" : "Close business for good"} tone="danger" onClick={() => void confirm()} disabled={!matches || !online} busy={busy} />
      <BizButtonSoft label="Cancel" onClick={close} />
    </BizSheet>
  );
}
