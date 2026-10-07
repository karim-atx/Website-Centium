import { useState } from "react";
import { useLocation } from "react-router-dom";
import { Bug, Check } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { useApp } from "../../context/AppContext";
import { MAX_DESCRIPTION, submitBugReport } from "../../services/bug-reports";

/**
 * MO1.8.10 Report a bug, as a centred popup (no ×; outside tap and Escape
 * close it). Was a bottom sheet; what it writes and says is unchanged.
 *
 * NO "ADD SCREENSHOT" ROW (C33). The board draws one, but bug_reports has no
 * screenshot column and there is no bucket for it (backlog), so a row that
 * could only fail is left out.
 *
 * THE COPY IS CHOSEN AS CAREFULLY AS THE CODE. Nothing in this project can
 * send a message, so a filed report notifies nobody and waits until someone
 * queries the table. The confirmed state says it was received and is read,
 * not answered.
 *
 * THE ROUTE IS THE ONE CAPTURED AT OPEN. Settings keys this popup on `open`,
 * so a mount is an open: every opening starts empty, with no stale error.
 */
export const ReportBugPopup: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const { authUserId } = useApp();
  const location = useLocation();
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
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

  if (sent) {
    return (
      <CentredPopup
        open={open}
        onClose={onClose}
        title="Report sent"
        icon={<Check size={22} />}
        body="Thank you. The team reads these when reviewing reports. You won’t get a reply here."
      />
    );
  }

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      title="Report a bug"
      // MO1.8.10: Bug 22 / 1.75; the card the Foundations 342 wide (decision 23 flag).
      icon={<Bug size={22} strokeWidth={1.75} />}
      cta={{
        label: busy ? "Sending…" : "Send report",
        disabled: busy || !description.trim() || tooLong,
        onClick: () => void send(),
      }}
    >
      <label className="block">
        {/* MO1.8.10: the label in the muted grey (text.muted), the field 13 / 400. */}
        <span className="block text-[12px] font-semibold text-charcoal-muted mb-1.5">What happened?</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="The weight I logged this morning isn't showing on Home…"
          // 110 tall on the board (159 to 268.5 on the 2x crop).
          className="h-[110px] w-full rounded-2xl bg-cream-soft border border-charcoal/10 px-3.5 py-3 text-[13px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none"
        />
      </label>

      {description.length > MAX_DESCRIPTION * 0.75 && (
        <p className={`mt-1.5 text-[11px] text-right ${tooLong ? "text-status-high" : "text-charcoal-faint"}`}>
          {description.length} / {MAX_DESCRIPTION}
        </p>
      )}

      {/* Stated rather than silently collected: only the page and the
          browser ride along with the words. */}
      <p className="mt-3 text-[11px] text-charcoal-faint">
        Sent with this report: the page you were on{route ? ` (${route})` : ""} and your browser
        version. Nothing from your health records is included.
      </p>

      {error && (
        <p role="alert" className="mt-3 text-xs text-status-high bg-status-high-bg rounded-xl px-3.5 py-2.5">
          {error}
        </p>
      )}
    </CentredPopup>
  );
};
