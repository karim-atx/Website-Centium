import React, { useState } from "react";
import { CircleAlert } from "lucide-react";
import { ACCESS_CATEGORIES, type AccessCategory } from "../../services/consent";
import {
  answerAccessRequest,
  requestBody,
  requestSummary,
  requestTitle,
  type AccessRequest,
} from "../../services/access-requests";
import { t } from "../../i18n/core";

const defaultLabel = (category: AccessCategory): string =>
  ACCESS_CATEGORIES.find((c) => c.category === category)?.label ?? t("This setting");

/**
 * Release 3 · a professional's request to see data types (DB-2
 * access_requests), for ONE professional.
 *
 * variant "notice" (default; CU8 v4 "Alex asks to see lab results"): drawn as
 * DataSharingSection's existing re-consent notice (r16 #F0EDF9, 12.5/600 title,
 * 12.5 body, 13/700 text action, r25.js l.30). The switches beside it are the
 * "yes"; "Don't share this" is the "no" (answer_access_request(id, false)).
 *
 * variant "summary" (CU11 v2 "Alex asks to see 3 things"): a count title, the
 * list, and "Choose what to share" (onChoose), which opens the switches.
 */
export const AccessRequestNotice: React.FC<{
  /** Pending requests, all from the same professional. Renders nothing when empty. */
  requests: AccessRequest[];
  /** That professional's first name. */
  firstName: string;
  /** Called after a successful answer with the ids answered and the answer. */
  onAnswered?: (ids: string[], grant: boolean) => void;
  variant?: "notice" | "summary";
  /** summary: "for your programme" in "Workout activity, Food diary and Weight, for your programme." */
  purpose?: string;
  /** summary: the "Choose what to share" action. Without it the button is not drawn. */
  onChoose?: () => void;
  /** Category labels; defaults to the sharing screen's (ACCESS_CATEGORIES). */
  labelFor?: (category: AccessCategory) => string;
  className?: string;
}> = ({ requests, firstName, onAnswered, variant = "notice", purpose, onChoose, labelFor = defaultLabel, className }) => {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (requests.length === 0) return null;
  // The category labels are English keys (ACCESS_CATEGORIES); the sentences get them in the app's language.
  const labels = requests.map((r) => t(labelFor(r.category)));

  if (variant === "summary") {
    return (
      <div className={`rounded-2xl bg-primary-pale px-3.5 py-3.5 ${className ?? ""}`}>
        <p className="text-[15px] font-bold text-charcoal">{requestTitle(firstName, labels, "asks")}</p>
        <p className="mt-1 text-[13px] text-charcoal-soft leading-normal">{requestSummary(labels, purpose)}</p>
        {onChoose && (
          <button
            type="button"
            onClick={onChoose}
            className="tap mt-3 w-full min-h-11 rounded-xl border border-charcoal text-[14px] font-bold text-charcoal"
          >
            {t("Choose what to share")}
          </button>
        )}
      </div>
    );
  }

  const decline = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    const results = await Promise.all(requests.map((r) => answerAccessRequest(r.id, false)));
    setSaving(false);
    const done = requests.filter((_, i) => results[i].ok).map((r) => r.id);
    const failed = results.find((r) => !r.ok);
    if (failed && !failed.ok) setError(failed.message);
    if (done.length > 0) onAnswered?.(done, false);
  };

  // A single message reads as the professional's own note; with several, the
  // newest note with one is used.
  const message = requests.find((r) => r.message?.trim())?.message ?? null;

  return (
    <div className={`rounded-2xl bg-primary-pale px-3.5 pt-3 pb-1 ${className ?? "mb-3"}`}>
      <p className="text-[12.5px] font-semibold text-charcoal mb-1">{requestTitle(firstName, labels)}</p>
      <p className="text-[12.5px] text-charcoal-soft leading-normal">{requestBody(firstName, labels, message)}</p>
      {error && (
        <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-xs font-semibold text-status-high">
          <CircleAlert size={13} strokeWidth={2} className="shrink-0 mt-px" aria-hidden />
          {t(error)}
        </p>
      )}
      <button
        type="button"
        onClick={() => void decline()}
        disabled={saving}
        className="tap min-h-11 inline-flex items-center text-[13px] font-bold text-primary-accent disabled:opacity-50"
      >
        {saving ? t("Saving…") : requests.length > 1 ? t("Don't share these") : t("Don't share this")}
      </button>
    </div>
  );
};
