import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { Bug, Check, ChevronRight, Image as ImageIcon, X } from "lucide-react";
import { CentredPopup } from "../ui/CentredPopup";
import { useApp } from "../../context/AppContext";
import { MAX_DESCRIPTION, prepareBugScreenshot, submitBugReport } from "../../services/bug-reports";
import { SCREENSHOT_ACCEPT } from "../../services/bug-reports/screenshotRules";

/**
 * MO1.8.10 Report a bug, as a centred popup (no ×; outside tap and Escape
 * close it). Measured from the 2x frame: the card padded 22 on top and 18 at
 * the sides and bottom; "What happened?" 12 / 600 muted, 6 over a 110 pt
 * field (13 / 400); 14 under it the Add screenshot row (padding 13 0: a
 * 36 pt primary.tint tile with Image 17 / 1.75, 12 to the 14 / 600 title, a
 * ChevronRight 16 / 1.75 at the end); 14 under the row, Send report.
 *
 * ADD SCREENSHOT (Stage A1). A picked JPEG, PNG or WebP up to 5 MB is
 * re-drawn without its metadata as soon as it is picked (a refusal says why
 * under the row), shown in the tile, and on Send uploaded to the private
 * `bug-screenshots` bucket under `<uid>/<file>` before the report row is
 * inserted carrying its path (services/bug-reports). The path is never shown.
 *
 * THE COPY IS CHOSEN AS CAREFULLY AS THE CODE. Nothing in this project can
 * send a message, so a filed report notifies nobody and waits until someone
 * queries the table. The confirmed state says it was received and is read,
 * not answered.
 *
 * Handover-complete pass: going over the limit is the Foundations input
 * error (danger border and a line under the field). Restore round 2 (user,
 * 2026-10-07): the character counter is back as on main (from 75% of the
 * limit), at the end of that line. The "Sent with this report" line stays: it is a
 * privacy disclosure of what is collected (exception 1). The sent state and
 * errors are the Foundations popup and error line (the board draws neither).
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
  // `file` is the prepared (metadata-free) copy that is uploaded; `name` is
  // the picked file's own name, shown in the row only.
  const [shot, setShot] = useState<{ name: string; url: string; file: File } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [shotError, setShotError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // The preview's object URL is released when it is replaced, removed, or
  // the popup goes.
  const shotUrl = useRef<string | null>(null);
  const replaceShot = (next: { name: string; url: string; file: File } | null) => {
    if (shotUrl.current) URL.revokeObjectURL(shotUrl.current);
    shotUrl.current = next?.url ?? null;
    setShot(next);
  };
  useEffect(
    () => () => {
      if (shotUrl.current) URL.revokeObjectURL(shotUrl.current);
    },
    []
  );

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setShotError(null);
    setPreparing(true);
    const prepared = await prepareBugScreenshot(file);
    setPreparing(false);
    if (!prepared.ok) {
      setShotError(prepared.message);
      return;
    }
    replaceShot({ name: file.name, url: URL.createObjectURL(prepared.file), file: prepared.file });
  };

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
      screenshot: shot?.file ?? null,
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
  // MO1.8.10 measured: 22 top, 18 sides and bottom (the Foundations card is 24 × 20).
  const pad = "!px-[18px] !pt-[22px] !pb-[18px]";

  if (sent) {
    return (
      <CentredPopup
        open={open}
        onClose={onClose}
        className={pad}
        title="Report sent"
        icon={<Check size={22} strokeWidth={1.75} />}
        body="Thank you. The team reads these when reviewing reports. You won’t get a reply here."
      />
    );
  }

  return (
    <CentredPopup
      open={open}
      onClose={onClose}
      className={pad}
      title="Report a bug"
      // MO1.8.10: Bug 22 / 1.75; the card the Foundations 342 wide (decision 23 flag).
      icon={<Bug size={22} strokeWidth={1.75} />}
      cta={{
        label: "Send report",
        loading: busy,
        disabled: !description.trim() || tooLong || preparing,
        onClick: () => void send(),
        className: "!mt-3.5",
      }}
    >
      <label className="block">
        {/* MO1.8.10: the label in the muted grey (text.muted), the field 13 / 400. */}
        <span className="block text-[12px] leading-[18px] font-semibold text-charcoal-muted mb-1.5">What happened?</span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          aria-invalid={tooLong || undefined}
          placeholder="The weight I logged this morning isn't showing on Home…"
          // 110 tall on the board (159 to 268.5 on the 2x crop).
          className={`h-[110px] w-full rounded-2xl bg-cream-soft border px-3.5 py-3 text-[13px] text-charcoal placeholder:text-charcoal-faint focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none ${
            tooLong ? "border-status-high" : "border-charcoal/10"
          }`}
        />
      </label>
      {/* Restore round 2 (user, 2026-10-07): the live counter from three
          quarters of the limit, as on main, at the end of the line; over the
          limit it turns danger and the Foundations input error sits beside it. */}
      {description.length > MAX_DESCRIPTION * 0.75 && (
        <div className="mt-1.5 flex items-start gap-2">
          {tooLong && (
            <p role="alert" className="flex-1 min-w-0 text-[12px] font-semibold text-status-high">
              Too long: {description.length.toLocaleString("en-GB")} of {MAX_DESCRIPTION.toLocaleString("en-GB")} characters.
            </p>
          )}
          <p className={`ms-auto shrink-0 text-[11px] leading-[18px] text-right tabular-nums ${tooLong ? "text-status-high" : "text-charcoal-faint"}`}>
            {description.length} / {MAX_DESCRIPTION}
          </p>
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={SCREENSHOT_ACCEPT}
        className="hidden"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      <div className="mt-3.5 flex items-center gap-3 py-[13px]">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || preparing}
          className="tap flex-1 min-w-0 flex items-center gap-3 text-start"
        >
          <span
            aria-hidden
            className="w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 overflow-hidden bg-th-f0edf9 text-primary-accent dark:bg-th-aea1dc/[0.14]"
          >
            {shot ? (
              <img src={shot.url} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={17} strokeWidth={1.75} />
            )}
          </span>
          <span className="flex-1 min-w-0 truncate text-[14px] leading-5 font-semibold text-charcoal">
            {preparing ? "Preparing…" : shot ? shot.name : "Add screenshot"}
          </span>
          {!shot && <ChevronRight size={16} strokeWidth={1.75} aria-hidden className="shrink-0 text-charcoal-faint rtl:-scale-x-100" />}
        </button>
        {shot && (
          <button
            type="button"
            onClick={() => replaceShot(null)}
            disabled={busy}
            aria-label="Remove screenshot"
            className="tap shrink-0 text-charcoal-faint"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>
      {shotError && (
        <p role="alert" className="-mt-1.5 text-[12px] font-semibold text-status-high">
          {shotError}
        </p>
      )}

      {/* Stated rather than silently collected: only the page and the
          browser ride along with the words, and the screenshot only when
          one is added (privacy, exception 1). */}
      <p className="mt-1 text-[11px] text-charcoal-faint">
        Sent with this report: the page you were on{route ? ` (${route})` : ""}, your browser
        version{shot ? " and your screenshot" : ""}. Nothing from your health records is
        included{shot ? " unless your screenshot shows it" : ""}.
      </p>

      {error && (
        <p role="alert" className="mt-2 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}
    </CentredPopup>
  );
};
