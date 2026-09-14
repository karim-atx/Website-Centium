import React, { Suspense, lazy, useEffect } from "react";
import { createPortal } from "react-dom";
import { Phone, PhoneOff, Video } from "lucide-react";
import { useCall } from "../../context/CallContext";

/**
 * Everything a call puts on screen, mounted once for the whole app.
 *
 * THE LAZY BOUNDARY IS THIS LINE, and it is the reason CallScreen is a separate
 * file at all. React.lazy turns the import into a dynamic one, so Rollup emits
 * livekit-client and @livekit/components-react as their own chunk — roughly
 * 147 KB gzip — fetched the first time a call actually connects and never on
 * any other page. Importing CallScreen normally anywhere would pull all of it
 * back into the main bundle with nothing to warn you.
 */
const CallScreen = lazy(() => import("./CallScreen"));

/**
 * Full-viewport, portaled to <body>.
 *
 * NOT BottomSheet, which is capped at max-h-[88vh] with a max-w-md and built
 * for forms. What is borrowed from it is the mechanism rather than the
 * component: createPortal past any transformed ancestor (a transform makes an
 * ancestor the containing block for descendant `position: fixed`, which is what
 * clipped that sheet before it was portaled), plus locking body scroll while
 * open.
 */
const CallOverlay: React.FC<{ children: React.ReactNode; dim?: boolean }> = ({
  children,
  dim,
}) => {
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return createPortal(
    <div
      className={`fixed inset-0 z-[60] ${dim ? "bg-charcoal/60 backdrop-blur-[2px]" : "bg-[#0D0B1A]"}`}
      role="dialog"
      aria-modal="true"
    >
      {children}
    </div>,
    document.body
  );
};

/** The spinner shown while the LiveKit chunk is being fetched. */
const Connecting: React.FC<{ name: string }> = ({ name }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/75">
    <div className="w-12 h-12 rounded-full border-2 border-white/25 border-t-white/80 animate-spin" />
    <p className="text-sm font-semibold text-white/85">Connecting to {name}…</p>
  </div>
);

export const CallSurface: React.FC = () => {
  const { phase, call, endedReason, busy, error, answer, decline, hangUp, dismissError, dismissEnded } =
    useCall();

  // The brief post-call notice clears itself; a call that has ended should not
  // need dismissing before the app is usable again.
  useEffect(() => {
    if (phase !== "ended") return;
    const id = window.setTimeout(dismissEnded, 2600);
    return () => window.clearTimeout(id);
  }, [phase, dismissEnded]);

  // A failure to place or answer is reported where it happened rather than as
  // an overlay, but there is no other surface for it while nothing is on
  // screen, so it gets a toast.
  useEffect(() => {
    if (!error) return;
    const id = window.setTimeout(dismissError, 4000);
    return () => window.clearTimeout(id);
  }, [error, dismissError]);

  if (error && phase === "idle") {
    return createPortal(
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] rounded-2xl bg-charcoal text-cream text-xs font-semibold px-4 py-3 shadow-lift">
        {error}
      </div>,
      document.body
    );
  }

  if (phase === "ended" && endedReason) {
    return createPortal(
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] max-w-[92vw] rounded-2xl bg-charcoal text-cream text-xs font-semibold px-4 py-3 shadow-lift">
        {endedReason}
      </div>,
      document.body
    );
  }

  if (!call) return null;
  const name = call.row.caller_id && call.role === "callee" ? "your professional" : "them";

  // INCOMING: deliberately not full-screen. Until it is answered this is an
  // interruption, not a destination, and covering the whole app for something
  // the user may want to decline is heavy-handed.
  if (phase === "incoming") {
    return (
      <CallOverlay dim>
        <div className="absolute inset-x-0 top-0 p-4">
          <div className="mx-auto max-w-md rounded-3xl bg-cream shadow-lift p-5 animate-sheet-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl bg-primary-pale flex items-center justify-center text-primary-dark">
                {call.row.kind === "video" ? <Video size={20} /> : <Phone size={20} />}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-charcoal truncate">
                  Incoming {call.row.kind === "video" ? "video" : "voice"} call
                </p>
                <p className="text-[11px] text-charcoal-faint">Ringing…</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => void decline()}
                disabled={busy}
                className="tap flex-1 rounded-2xl bg-charcoal/5 text-charcoal py-3 text-sm font-semibold disabled:opacity-60"
              >
                Decline
              </button>
              <button
                onClick={() => void answer()}
                disabled={busy}
                className="tap flex-1 rounded-2xl bg-status-good text-white py-3 text-sm font-semibold disabled:opacity-60"
              >
                {busy ? "Answering…" : "Answer"}
              </button>
            </div>
            {error && <p className="text-[11px] text-status-high mt-3">{error}</p>}
          </div>
        </div>
      </CallOverlay>
    );
  }

  // OUTGOING: full-viewport already, because the caller is committed and there
  // is nothing else for them to do until it is picked up.
  if (phase === "outgoing") {
    return (
      <CallOverlay>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-white/80">
          <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center">
            {call.row.kind === "video" ? <Video size={26} /> : <Phone size={26} />}
          </div>
          <p className="text-sm font-semibold text-white/90">Ringing…</p>
          <p className="text-xs text-white/55">Waiting for an answer</p>
          <button
            onClick={() => void hangUp()}
            disabled={busy}
            aria-label="Cancel call"
            className="tap mt-6 w-16 h-14 rounded-full bg-status-high text-white flex items-center justify-center disabled:opacity-60"
          >
            <PhoneOff size={22} />
          </button>
        </div>
      </CallOverlay>
    );
  }

  if (phase === "connected" && call.credentials) {
    return (
      <CallOverlay>
        <Suspense fallback={<Connecting name={name} />}>
          <CallScreen
            credentials={call.credentials}
            participantName={name}
            video={call.row.kind === "video"}
            startedAt={call.row.started_at}
            onHangUp={() => void hangUp()}
          />
        </Suspense>
      </CallOverlay>
    );
  }

  return null;
};
