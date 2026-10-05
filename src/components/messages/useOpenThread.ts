import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { startThread } from "../../services/messaging";

/**
 * Opens the real conversation with someone, creating it only if needed
 * (start_message_thread is idempotent per pair and needs no relationship).
 * Shared by MessageProfessionalButton and the profile's pinned Message.
 */
export function useOpenThread(otherUserId: string) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await startThread(otherUserId);
    // Deliberately not clearing `busy` before navigating: on success the
    // caller unmounts, and re-enabling a button on the way out is a frame in
    // which a second thread can be requested.
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

  return { open, busy, error };
}
