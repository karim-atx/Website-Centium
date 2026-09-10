import { useState } from "react";
import { useLocation } from "react-router-dom";
import { BottomSheet } from "../ui/BottomSheet";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { MAX_DESCRIPTION, submitBugReport } from "../../services/bug-reports";
import { Check } from "lucide-react";

/**
 * Filing a bug report.
 *
 * THE COPY IS CHOSEN AS CAREFULLY AS THE CODE. Nothing in this project can
 * send a message — no mail provider, no queue, no webhook — so a filed report
 * notifies nobody and waits until someone queries the table. "We'll get back
 * to you" would be a promise the product has no way to keep, and the confirmed
 * state says the report was received and is read, not answered.
 *
 * THE ROUTE IS THE ONE CAPTURED AT OPEN, not at submit. Opening this sheet
 * does not navigate, so the two are the same today — but if this ever becomes
 * reachable from somewhere that does, the useful answer is where the user was
 * when they hit the problem, not where they were when they finished typing.
 */
export const ReportBugSheet: React.FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { authUserId } = useApp();
  const location = useLocation();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Captured once at mount, and Settings keys this component on `open` so a
  // mount IS an open. That keying also does the resetting: every open starts
  // with an empty box and no stale error, without an effect writing state
  // during render — a previous report's text lingering here would invite
  // filing it twice, and an old error would describe a failure already over.
  const [route] = useState<string | null>(() => `${location.pathname}${location.search}`);

  const send = async () => {
    if (!authUserId) {
      setError("You need to be signed in to send a report.");
      return;
    }
    setBusy(true);
    setError(null);
    const result = await submitBugReport({
      userId: authUserId,
      description,
      route,
      userAgent: typeof navigator === "undefined" ? null : navigator.userAgent,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "That report couldn't be sent.");
      return;
    }
    setSent(true);
    setTimeout(onClose, 1200);
  };

  const tooLong = description.length > MAX_DESCRIPTION;

  return (
    <BottomSheet open={open} onClose={onClose} title="Report a bug">
      {sent ? (
        <div className="py-8 flex flex-col items-center text-center animate-fade-slide-up">
          <div className="w-12 h-12 rounded-full bg-primary-pale flex items-center justify-center mb-3">
            <Check size={22} className="text-primary-dark" />
          </div>
          <p className="text-sm font-semibold text-charcoal">Report sent</p>
          <p className="text-xs text-charcoal-faint mt-1 max-w-xs">
            Thank you — the team reads these when reviewing reports. You won&rsquo;t get a
            reply here.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5 animate-fade-slide-up">
          <p className="text-xs text-charcoal-soft">
            What went wrong? Anything you can say about what you were doing helps.
          </p>

          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="The weight I logged this morning isn't showing on Home…"
            className="w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-sm text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
          />

          {/* Only once it is close to mattering. A counter sitting at 0 / 4000
              under an empty box reads as a demand for length. */}
          {description.length > MAX_DESCRIPTION * 0.75 && (
            <p className={`text-[11px] text-right ${tooLong ? "text-status-high" : "text-charcoal-faint"}`}>
              {description.length} / {MAX_DESCRIPTION}
            </p>
          )}

          {/* Stated rather than silently collected. It is only the page and the
              browser, and a user is entitled to know what rides along with
              their words. */}
          <p className="text-[11px] text-charcoal-faint">
            Sent with this report: the page you were on{route ? ` (${route})` : ""} and your
            browser version. Nothing from your health records is included.
          </p>

          {error && (
            <p className="text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">{error}</p>
          )}

          <Button
            fullWidth
            size="lg"
            disabled={busy || !description.trim() || tooLong}
            onClick={() => void send()}
          >
            {busy ? "Sending…" : "Send report"}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
};
