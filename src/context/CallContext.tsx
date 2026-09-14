import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { useApp } from "./AppContext";
import { useCallRealtime } from "../hooks/useCallRealtime";
import {
  answerCall as answerCallRemote,
  endCall as endCallRemote,
  startCall as startCallRemote,
  type CallCredentials,
  type CallKind,
  type CallRow,
} from "../services/calling";

/**
 * The one place that knows whether a call is happening.
 *
 * MOUNTED ALONGSIDE UnreadProvider IN Layout, for the reason that entry gives:
 * the authenticated shell is the smallest scope covering every route a call
 * could interrupt. Outside it there is no session to ring.
 *
 * THE ROW DRIVES THE STATE MACHINE, not this component's own optimism. Placing
 * a call sets "outgoing" locally because the caller already holds credentials,
 * but every SUBSEQUENT transition — answered, declined, missed, completed,
 * cap_ended — arrives as a `calls` UPDATE over Realtime and is applied from the
 * row. That is what keeps two clients agreeing: neither invents a transition
 * the database has not recorded.
 *
 * ONE CALL AT A TIME. A second ringing row while one is already live is
 * ignored rather than queued or stacked — there is one microphone, one camera
 * and one screen, and a "call waiting" model is a product decision nobody has
 * made. The ignored row still ends up `missed` through the server's own path.
 */

/**
 * THERE IS NO "ended" PHASE, and its absence is deliberate.
 *
 * There used to be one, and it was a bug rather than a state. `phase` governs
 * whether this app can receive or place a call — `onCall` accepts a ring only
 * while idle, and `placeCall` refuses otherwise — so any phase that lingered
 * after a call was over was a window in which the user was uncontactable. The
 * "ended" phase was cleared by the post-call notice's DISPLAY timer, which
 * meant a notice's readability and the app's ability to take a call were the
 * same number. A ring arriving in that window was dropped silently: no retry,
 * and nothing marks it missed, so the row sat `ringing` until the caller gave
 * up. Redialling straight after a call — exactly when people do — was the case
 * it broke.
 *
 * A call that has ended returns to `idle` immediately. Whether a notice is
 * still on screen is `endedReason`, which is a rendering concern and gates
 * nothing.
 */
export type CallPhase = "idle" | "outgoing" | "incoming" | "connected";

export interface ActiveCall {
  row: CallRow;
  /** Present once this side holds a token: the caller from the start, the callee on answer. */
  credentials: CallCredentials | null;
  /** Which side of this call the current user is. */
  role: "caller" | "callee";
}

interface CallState {
  phase: CallPhase;
  call: ActiveCall | null;
  /** Why the last call ended, for the brief notice after it does. */
  endedReason: string | null;
  busy: boolean;
  error: string | null;
  placeCall: (threadId: string, calleeId: string, kind: CallKind) => Promise<void>;
  answer: () => Promise<void>;
  decline: () => Promise<void>;
  hangUp: () => Promise<void>;
  dismissError: () => void;
  dismissEnded: () => void;
}

const CallCtx = createContext<CallState>({
  phase: "idle",
  call: null,
  endedReason: null,
  busy: false,
  error: null,
  placeCall: async () => {},
  answer: async () => {},
  decline: async () => {},
  hangUp: async () => {},
  dismissError: () => {},
  dismissEnded: () => {},
});

/** Statuses that mean the call is over, whoever ended it. */
const TERMINAL = new Set(["declined", "missed", "completed", "cap_ended", "failed"]);

/** What to tell the user when a row arrives already finished. */
function endedMessage(status: string, role: "caller" | "callee"): string {
  switch (status) {
    case "declined":
      return role === "caller" ? "Call declined." : "Call declined.";
    case "missed":
      return role === "caller" ? "No answer." : "Missed call.";
    case "cap_ended":
      return "Call ended — time limit reached.";
    case "failed":
      return "The call couldn't be set up.";
    default:
      return "Call ended.";
  }
}

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authUserId } = useApp();
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [call, setCall] = useState<ActiveCall | null>(null);
  const [endedReason, setEndedReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read inside the Realtime handler, which closes over its first render.
  const callRef = useRef<ActiveCall | null>(null);
  const phaseRef = useRef<CallPhase>("idle");
  const setCallState = useCallback((next: ActiveCall | null, nextPhase: CallPhase) => {
    callRef.current = next;
    phaseRef.current = nextPhase;
    setCall(next);
    setPhase(nextPhase);
  }, []);

  /**
   * Applies a row that arrived over Realtime.
   *
   * THE GUARD IS "IS THIS ABOUT THE CALL I AM IN", and rows about any other
   * call are dropped unless they are a fresh ring while idle. Without that, a
   * stale UPDATE for a finished call would tear down a live one.
   */
  const onCall = useCallback(
    (row: CallRow) => {
      if (!authUserId) return;
      const role: "caller" | "callee" = row.caller_id === authUserId ? "caller" : "callee";
      const current = callRef.current;

      if (current && row.id === current.row.id) {
        if (TERMINAL.has(row.status)) {
          // IDLE IMMEDIATELY, on the server-confirmed terminal status. The
          // notice that follows is set separately and holds nothing open.
          setEndedReason(endedMessage(row.status, role));
          setCallState(null, "idle");
          return;
        }
        // answered: the caller learns the callee picked up. The callee already
        // moved itself, since it holds the credentials answer() returned.
        const nextPhase: CallPhase = row.status === "answered" ? "connected" : phaseRef.current;
        setCallState({ ...current, row }, nextPhase);
        return;
      }

      // A new ring for this user, as the callee, while nothing else is live.
      if (
        row.status === "ringing" &&
        role === "callee" &&
        phaseRef.current === "idle" &&
        row.callee_id === authUserId
      ) {
        setEndedReason(null);
        setCallState({ row, credentials: null, role }, "incoming");
      }
    },
    [authUserId, setCallState]
  );

  useCallRealtime(authUserId, onCall);

  const placeCall = useCallback(
    async (threadId: string, calleeId: string, kind: CallKind) => {
      if (phaseRef.current !== "idle" || busy) return;
      setBusy(true);
      setError(null);
      setEndedReason(null);
      const result = await startCallRemote(threadId, calleeId, kind);
      setBusy(false);

      if (result.status !== "ok") {
        setError(result.message);
        return;
      }
      // The row itself arrives over Realtime; this is the local half so the
      // caller sees "ringing" without waiting for the round trip back.
      setCallState(
        {
          row: {
            id: result.credentials.callId,
            thread_id: threadId,
            caller_id: authUserId,
            callee_id: calleeId,
            kind: result.credentials.kind,
            status: "ringing",
            cap_seconds: result.credentials.capSeconds,
            livekit_room_name: result.credentials.roomName,
            created_at: new Date().toISOString(),
            started_at: null,
            ended_at: null,
            duration_sec: null,
          },
          credentials: result.credentials,
          role: "caller",
        },
        "outgoing"
      );
    },
    [authUserId, busy, setCallState]
  );

  const answer = useCallback(async () => {
    const current = callRef.current;
    if (!current || phaseRef.current !== "incoming" || busy) return;
    setBusy(true);
    setError(null);
    const result = await answerCallRemote(current.row.id);
    setBusy(false);

    if (result.status !== "ok") {
      setError(result.message);
      // A call that is already resolved cannot be answered; clear rather than
      // leave an incoming overlay for something that has ended.
      if (result.status === "already_resolved") setCallState(null, "idle");
      return;
    }
    setCallState(
      {
        ...current,
        credentials: result.credentials,
        row: { ...current.row, status: "answered", started_at: result.credentials.startedAt },
      },
      "connected"
    );
  }, [busy, setCallState]);

  /**
   * Ends the call. One implementation for decline and hang-up, because the
   * server decides the terminal status from state and actor — the reason is a
   * log hint, not a choice.
   *
   * LOCAL STATE IS CLEARED REGARDLESS. end-call is idempotent and a failure
   * here means the row may be stale, but leaving someone stuck on a call
   * screen because a request failed is worse than a row the cap sweep will
   * close anyway.
   */
  const finish = useCallback(
    async (reason: "declined" | "hangup") => {
      const current = callRef.current;
      if (!current) return;
      setBusy(true);
      const result = await endCallRemote(current.row.id, reason);
      setBusy(false);
      if (result.status === "error") {
        console.error("[calling] Could not end the call cleanly:", result.message);
      }
      // Idle the moment the call is over, not when the notice times out — the
      // user may want to call straight back, and until this is idle they
      // cannot, nor can anyone reach them.
      setEndedReason(reason === "declined" ? "Call declined." : "Call ended.");
      setCallState(null, "idle");
    },
    [setCallState]
  );

  const decline = useCallback(() => finish("declined"), [finish]);
  const hangUp = useCallback(() => finish("hangup"), [finish]);

  const dismissError = useCallback(() => setError(null), []);
  /**
   * Clears the post-call notice. PURELY VISUAL — it no longer touches `phase`,
   * because the call was already over and the app already idle by the time
   * this runs. That separation is the fix: a notice's lifetime and the user's
   * reachability were one number, and they are unrelated concerns.
   */
  const dismissEnded = useCallback(() => setEndedReason(null), []);

  return (
    <CallCtx.Provider
      value={{
        phase,
        call,
        endedReason,
        busy,
        error,
        placeCall,
        answer,
        decline,
        hangUp,
        dismissError,
        dismissEnded,
      }}
    >
      {children}
    </CallCtx.Provider>
  );
};

export function useCall(): CallState {
  return useContext(CallCtx);
}
