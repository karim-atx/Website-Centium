import React, { useState } from "react";
import { Ban, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { REPORT_REASONS, reportMessage, type Message, type ReportReason } from "../../services/messaging";

// Report and block, for a conversation (Database 20261001020000).
//
// A REPORT IS ABOUT A MESSAGE. The schema files every report against one
// message, which is what an admin opens first. "Report" in Chat info reports
// the most recent message that person sent in this conversation, and says so — there is no such thing as a report with nothing attached.
//
// A BLOCK WORKS BOTH WAYS and says nothing to the other person. While it
// stands neither of them can message or call the other.

export const ReportSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  reporterId: string;
  message: Message | null;
  /** Whose message it is; null when their account is gone. */
  reportedId: string | null;
  personName: string;
  /** Offered after a report, when the person isn't blocked yet. */
  onBlock?: () => void;
  canBlock: boolean;
}> = ({ open, onClose, reporterId, message, reportedId, personName, onBlock, canBlock }) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [detail, setDetail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const submit = async () => {
    if (!message || !reason || busy) return;
    setBusy(true);
    setError(null);
    const result = await reportMessage({ reporterId, messageId: message.id, reportedId, reason, detail });
    setBusy(false);
    if (result.ok) setDone("Thanks. Our team will review this message.");
    else if (result.already) setDone(result.message);
    else setError(result.message);
  };

  return (
    <BottomSheet open={open} onClose={onClose} title={done ? "Report sent" : "Report"} size="tall">
      {done ? (
        <div className="space-y-4">
          <p className="flex items-start gap-2 text-sm text-charcoal">
            <ShieldCheck size={17} className="shrink-0 mt-0.5 text-status-good" /> {done}
          </p>
          <p className="text-xs text-charcoal-soft leading-relaxed">
            {personName} isn't told who reported them. If you feel unsafe, you can also block them: they won't be able to
            message or call you.
          </p>
          {canBlock && onBlock && (
            <Button variant="outline" fullWidth onClick={onBlock}>
              <Ban size={15} /> Block {personName}
            </Button>
          )}
          <Button fullWidth onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-charcoal-soft leading-relaxed">
            Tell our team what's wrong with this message. {personName} won't be told who reported it.
          </p>
          <fieldset className="space-y-2">
            <legend className="text-xs font-semibold text-charcoal-soft mb-2">Reason</legend>
            {REPORT_REASONS.map((r) => (
              <label
                key={r.value}
                className={clsx(
                  "tap flex items-start gap-3 rounded-xl border px-3.5 py-3 min-h-[44px] cursor-pointer",
                  reason === r.value ? "border-primary bg-primary-pale" : "border-charcoal/10 bg-cream-card"
                )}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r.value}
                  checked={reason === r.value}
                  onChange={() => setReason(r.value)}
                  className="mt-1 accent-primary"
                />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-charcoal">{r.label}</span>
                  <span className="block text-xs text-charcoal-soft">{r.hint}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <label className="block">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 block">Anything else? (optional)</span>
            <textarea
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-xl bg-cream-soft border border-charcoal/10 px-3.5 py-2.5 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
            />
          </label>
          {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
          <Button fullWidth size="lg" disabled={!reason || busy || !message} onClick={() => void submit()}>
            {busy ? "Sending…" : "Send report"}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};

/**
 * Block or unblock, confirmed first. Opened from Chat info; report has its own
 * row there, so this sheet is only the decision.
 */
export const BlockSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  personName: string;
  iBlocked: boolean;
  busy: boolean;
  error: string | null;
  onBlock: () => void;
  onUnblock: () => void;
}> = ({ open, onClose, personName, iBlocked, busy, error, onBlock, onUnblock }) => (
  <BottomSheet open={open} onClose={onClose} title={iBlocked ? `Unblock ${personName}?` : `Block ${personName}?`}>
    <div className="space-y-3 animate-fade-slide-up">
      <p className="text-sm text-charcoal">
        {iBlocked
          ? "You'll be able to message and call each other again."
          : "Neither of you will be able to message or call the other. They won't be told."}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>
          Cancel
        </Button>
        <Button className="flex-1" disabled={busy} onClick={iBlocked ? onUnblock : onBlock}>
          {iBlocked ? (busy ? "Unblocking…" : "Unblock") : busy ? "Blocking…" : "Block"}
        </Button>
      </div>
      {error && <p className="text-xs font-semibold text-status-high">{error}</p>}
    </div>
  </BottomSheet>
);
