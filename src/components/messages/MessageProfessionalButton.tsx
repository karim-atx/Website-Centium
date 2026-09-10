import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle } from "lucide-react";
import { Button } from "../ui/Button";
import { startThread } from "../../services/messaging";

/**
 * Opens the real conversation with someone, creating it only if needed.
 *
 * ONE COMPONENT FOR BOTH TIERS, deliberately. A client reaches this from a
 * public listing before hiring anyone, and from a connection after hiring —
 * two different places in the product, the same call. `start_message_thread`
 * requires no relationship and is idempotent per pair, so neither caller has a
 * "does a thread already exist" question to get wrong, and the pre-hire and
 * active-relationship cases need no branch here.
 *
 * WHAT THE TIER DOES NOT DO YET. The two-tier model (pre-hire text-only,
 * active relationship eventually gaining attachments, voice notes and ticks)
 * is a constraint on those features, not on this button — none of them exist,
 * so there is nothing here to gate. The tier is derived at read time from
 * `active_professional_clients`; see the README entry for why it must not be
 * stored on the thread.
 *
 * REPLACES A MOCK THAT INVENTED REPLIES. ProfessionalDetail used to open a
 * local chat that answered "Got it — thanks for the update! 👍" a second after
 * you sent anything, held in component state that never reached storage of any
 * kind. A fabricated reply from a health professional is the same class of
 * error as a measurement that was never taken.
 */
export const MessageProfessionalButton: React.FC<{
  professionalId: string;
  /** Used only for the label; omitted falls back to a bare "Message". */
  firstName?: string;
  variant?: "primary" | "outline";
  className?: string;
}> = ({ professionalId, firstName, variant = "outline", className }) => {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await startThread(professionalId);
    // Deliberately not clearing `busy` before navigating: on success this
    // component unmounts, and re-enabling a button on the way out is a frame
    // in which a second thread can be requested.
    if (!result.ok) {
      setBusy(false);
      setError(result.message);
      return;
    }
    // The thread id travels in navigation state rather than the URL. Messages
    // opens it once and then forgets it, so backing out of the conversation
    // lands on the list rather than bouncing straight back in.
    navigate("/app/messages", { state: { threadId: result.threadId } });
  };

  return (
    <div className={className}>
      <Button fullWidth variant={variant} onClick={() => void open()} disabled={busy}>
        <MessageCircle size={15} /> {busy ? "Opening…" : firstName ? `Message ${firstName}` : "Message"}
      </Button>
      {error && (
        <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5 mt-2">
          {error}
        </p>
      )}
    </div>
  );
};
