import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Target } from "lucide-react";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Toast } from "../../../components/ui/Toast";
import { useApp } from "../../../context/AppContext";
import { useG3 } from "../../../components/premium/g3/useG3";
import { G3Body, G3Caps, G3Route, LockedRow } from "../../../components/premium/g3/parts";
import { acceptTargetSuggestion, fetchTargetSuggestions, fetchWeeklyReview } from "../../../services/premium/g3Calls";
import {
  acceptLabel,
  addDays,
  canAccept,
  canGoToWeek,
  lastWeekStart,
  mondayOf,
  reviewLines,
  suggestionLine,
  type TargetSuggestion,
  type WeeklyReview,
} from "../../../services/premium/g3";
import { appLocale } from "../../../i18n/format";
import { formatShortDate } from "../../../utils/date";
import { t } from "../../../i18n/core";

// undrawn (Round G, no handover)
// Round G3 · /app/weekly-review, the Monday weekly review
// (my_weekly_review(p_week_start), last week by default, Monday to Sunday,
// with week navigation) and the target suggestions (my_target_suggestions()).
//
// THE ROUTE: the Monday push (kind weekly_summary, queue_weekly_summary)
// opens /app/weekly-review (send-reminder-push deepLinkFor, Database G3
// fixes), exactly this path. Home's WeeklyReviewCard is the standing way in.
//
// - Counts always; the numbers (average steps, sleep, meditation minutes)
//   only when the review isn't hiding them (numbers_hidden in
//   recovery-sensitive mode).
// - Suggestions: steps and water offer "Make {suggested} my goal"
//   (accept_target_suggestion; never applied by itself); calories and protein
//   show their reason line only. Recovery-sensitive mode returns none.
// - Premium (ATXQ1 for a free member: the locked row and the prompt).

const fmt = (n: number) => new Intl.NumberFormat(appLocale("en-US")).format(n);
const day = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { day: "numeric", month: "short" });

export default function WeeklyReviewPage() {
  return (
    <G3Route fallback="/app">
      <ReviewScreen />
    </G3Route>
  );
}

function ReviewScreen() {
  const { today } = useApp();
  const [params] = useSearchParams();
  const asked = params.get("week");
  const latest = lastWeekStart(today);
  const [week, setWeek] = useState(() => (asked && /^\d{4}-\d{2}-\d{2}$/.test(asked) && canGoToWeek(mondayOf(asked), today) ? mondayOf(asked) : latest));
  const review = useG3(() => fetchWeeklyReview(week), `review:${week}`);
  const end = addDays(week, 6);

  return (
    <div className="animate-fade-slide-up pb-10">
      <PageHeader title={t("Your week")} subtitle={t("{from} to {to}", { from: day(week), to: day(end) })} showBack />
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setWeek(addDays(week, -7))}
          className="tap flex items-center gap-1 min-h-10 text-[12.5px] font-bold text-th-6b41ef dark:text-primary-dark"
        >
          <ChevronLeft size={15} aria-hidden className="rtl:-scale-x-100" />
          {t("Week before")}
        </button>
        <button
          type="button"
          disabled={!canGoToWeek(addDays(week, 7), today)}
          onClick={() => setWeek(addDays(week, 7))}
          className="tap flex items-center gap-1 min-h-10 text-[12.5px] font-bold text-th-6b41ef dark:text-primary-dark disabled:opacity-40"
        >
          {t("Week after")}
          <ChevronRight size={15} aria-hidden className="rtl:-scale-x-100" />
        </button>
      </div>
      <G3Body
        state={review.state}
        onRetry={review.reload}
        otherwise={review.state.kind === "premium" ? <LockedRow feature="weekly_review" title={t("Your weekly review")} meta={t("Part of Centium Premium")} /> : null}
      >
        {(r) => (r ? <ReviewBody r={r} /> : <p className="text-[13px] text-charcoal-faint">{t("Nothing to show for this week.")}</p>)}
      </G3Body>
      {review.state.kind === "ready" && <Suggestions />}
    </div>
  );
}

function ReviewBody({ r }: { r: WeeklyReview }) {
  const { counts, numbers } = reviewLines(r, fmt);
  const tile = (l: { key: string; label: string; value: string }) => (
    <div key={l.key} className="rounded-2xl bg-cream-card shadow-soft px-4 py-3">
      <p className="text-[20px] leading-[26px] font-extrabold text-charcoal tabular-nums">{l.value}</p>
      <p className="mt-0.5 text-[11.5px] leading-[16px] text-charcoal-faint">{l.label}</p>
    </div>
  );
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5">{counts.map(tile)}</div>
      {numbers.length > 0 && <div className="grid grid-cols-2 gap-2.5 mt-2.5">{numbers.map(tile)}</div>}
    </>
  );
}

function Suggestions() {
  const { setStepsGoal, setWaterGoal } = useApp();
  const { state, reload } = useG3(fetchTargetSuggestions, "suggestions");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ message: string; tone?: "error" } | null>(null);
  if (state.kind !== "ready" || state.value.length === 0) return null;

  const accept = async (s: TargetSuggestion) => {
    if (!canAccept(s) || (s.kind !== "steps" && s.kind !== "water")) return;
    setBusy(true);
    const r = await acceptTargetSuggestion(s.kind);
    setBusy(false);
    if (!r.ok) return setToast({ message: r.message, tone: "error" });
    const v = r.value ?? s.suggested;
    // The app's own goal cache, so Home and Health read the new goal at once (same value, same day: an idempotent save).
    if (v !== null) {
      if (s.kind === "steps") setStepsGoal(v);
      else setWaterGoal(v);
    }
    setToast({ message: s.kind === "steps" ? t("Your step goal is updated from today.") : t("Your water goal is updated from today.") });
    reload();
  };

  return (
    <section aria-label={t("Goal suggestions")} className="mt-6">
      <G3Caps>{t("Goal suggestions")}</G3Caps>
      <div className="flex flex-col gap-2.5">
        {state.value.map((s) => {
          const line = suggestionLine(s);
          const label = acceptLabel(s, fmt);
          if (!line && !label) return null;
          return (
            <div key={s.kind} className="rounded-2xl bg-cream-card shadow-soft px-4 py-3">
              <p className="flex items-start gap-2 text-[13px] leading-[19px] text-charcoal">
                <Target size={15} aria-hidden className="shrink-0 mt-0.5 text-primary-deep-text" />
                {line}
              </p>
              {label && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void accept(s)}
                  className="tap mt-2.5 h-9 px-3.5 rounded-xl bg-primary-fill text-on-primary-fill text-[12.5px] font-bold disabled:opacity-50"
                >
                  {label}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[11px] leading-[16px] text-charcoal-faint">{t("Suggestions are never applied by themselves.")}</p>
      <Toast open={!!toast} message={toast?.message ?? ""} tone={toast?.tone} onExpire={() => setToast(null)} />
    </section>
  );
}
