import React, { useEffect, useRef } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import { useCall } from "../../context/CallContext";
import { fetchCall } from "../../services/calling";
import { callIdFromLink, callLinkStep } from "../../services/push/messagePushUrl";

/**
 * /app/calls/:callId, where a tapped call notification lands (sw.ts via
 * notificationTarget; send-push's own `/calls/{id}` redirects here).
 *
 * Reads the call, rings it if it is still ringing for this user (the Realtime
 * INSERT went out before the app was open, so CallProvider never saw it;
 * CallSurface shows the incoming screen over whatever is behind it), and opens
 * its conversation: Messages resolves `state.threadId` once its threads load,
 * for clients and professionals alike. A call that is not this user's, or not
 * found, opens Messages.
 */
const CallLink: React.FC = () => {
  const { callId } = useParams();
  const { authUserId } = useApp();
  const { applyCallRow } = useCall();
  const navigate = useNavigate();
  const done = useRef(false);

  useEffect(() => {
    if (!authUserId || done.current) return;
    done.current = true;
    const id = callIdFromLink(callId);
    void (async () => {
      const row = id ? await fetchCall(id) : null;
      const step = callLinkStep(row, authUserId);
      if (row && step.ring) applyCallRow(row);
      navigate("/app/messages", { replace: true, state: step.threadId ? { threadId: step.threadId } : null });
    })();
  }, [authUserId, callId, applyCallRow, navigate]);

  return null;
};

export default CallLink;

/**
 * /calls/:callId, the path send-push writes into every call notification
 * (Database send-push). Outside /app it was the marketing 404; Pages
 * redirects it (public/_redirects) and this covers an in-app navigation.
 */
export const LegacyCallLink: React.FC = () => {
  const { callId } = useParams();
  return <Navigate to={`/app/calls/${encodeURIComponent(callId ?? "")}`} replace />;
};
