import { useState } from "react";
import { CircleHelp, Dumbbell, Heart, ThumbsUp } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { textPx } from "../../theme/textSize";
import { useIsDark } from "../../hooks/useIsDark";
import { replyToFeedback, type EntryFeedback } from "../../services/nutrition/client";
import { feedbackText, REPLY_MAX } from "../../services/nutrition/clientNutritionModel";
import { ProAvatar } from "./MealPlanCard";
import { t } from "../../i18n/core";

const REACTION_ICON = { like: ThumbsUp, love: Heart, strong: Dumbbell, question: CircleHelp } as const;

/**
 * Release 3 · CU4 "feedback from {pro} on entries" (gen/r23.js fb23): under a
 * diary entry, one line per food_log_feedback row the professional wrote with
 * comment_on_food_entry. Margin 5 0 4; the line r11, 8 × 10, #F6F5FB (dark
 * #2B2C3A), gap 8: a 20 teal avatar, the text 11.5 / 1.45 text.secondary with
 * the reaction's icon (12 / 2.2, status.good) and the name bold in
 * text.primary, then "Reply" 11 / 700 primary deep. Reply opens a sheet that
 * sends reply_to_food_feedback(p_feedback_id, p_reply); once replied, the
 * client's words show under the line.
 */
export function FoodFeedbackLine({ f, onReplied }: { f: EntryFeedback; onReplied: (id: string, reply: string) => void }) {
  const dark = useIsDark();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const name = f.professionalName || t("Your professional");
  const Icon = f.reaction ? REACTION_ICON[f.reaction as keyof typeof REACTION_ICON] : null;
  const text = feedbackText(f);

  const send = async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    const r = await replyToFeedback(f.id, draft);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onReplied(f.id, draft.trim());
    setOpen(false);
    setDraft("");
  };

  return (
    <div style={{ margin: "5px 0 4px" }} onClick={(e) => e.stopPropagation()}>
      <div className="flex items-start" style={{ gap: 8, padding: "8px 10px", borderRadius: 11, background: dark ? "rgb(var(--th-2b2c3a))" : "#F6F5FB" }}>
        <ProAvatar name={f.professionalName} size={20} />
        <span className="flex-1 min-w-0" style={{ fontSize: textPx(11.5), lineHeight: 1.45, color: "rgb(var(--c-charcoal-soft))" }}>
          {Icon && (
            <span className="inline-flex text-status-good" style={{ verticalAlign: -2, marginInlineEnd: 4 }}>
              <Icon size={12} strokeWidth={2.2} aria-hidden />
            </span>
          )}
          <b style={{ color: "rgb(var(--c-charcoal))" }}>{name}</b> {text}
          {f.clientReply && (
            <span className="block" style={{ marginTop: 4, color: "rgb(var(--c-charcoal-muted))" }}>
              <b style={{ color: "rgb(var(--c-charcoal-soft))" }}>{t("You:")}</b> {f.clientReply}
            </span>
          )}
        </span>
        {!f.clientReply && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={t("Reply to {name}", { name })}
            className="tap relative shrink-0 text-primary-deep-text before:absolute before:-inset-[12px] before:content-['']"
            style={{ fontSize: textPx(11), fontWeight: 700 }}
          >
            {t("Reply")}
          </button>
        )}
      </div>

      <BottomSheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Reply to {name}", { name })}
        footer={
          <div>
            {error && (
              <p role="alert" className="text-status-high text-center" style={{ margin: "0 0 10px", fontSize: textPx(12), fontWeight: 600 }}>
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !draft.trim()}
              className="tap w-full inline-flex items-center justify-center disabled:opacity-50"
              style={{ height: 52, borderRadius: 16, background: "rgb(var(--c-primary-fill))", color: "rgb(var(--c-on-primary-fill))", fontSize: textPx(15), fontWeight: 700 }}
            >
              {busy ? t("Sending…") : t("Send reply")}
            </button>
          </div>
        }
      >
        <p style={{ margin: "0 0 10px", fontSize: textPx(12.5), lineHeight: 1.5, color: "rgb(var(--c-charcoal-soft))" }}>
          <b style={{ color: "rgb(var(--c-charcoal))" }}>{name}</b> {text}
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value.slice(0, REPLY_MAX))}
          maxLength={REPLY_MAX}
          rows={4}
          aria-label={t("Your reply")}
          placeholder={t("Your reply")}
          className="w-full focus:outline-none focus:ring-2 focus:ring-primary/20"
          style={{ resize: "none", borderRadius: 12, padding: "10px 12px", background: "rgb(var(--c-cream-soft))", border: "1px solid rgb(var(--c-charcoal) / 0.10)", fontSize: textPx(14), color: "rgb(var(--c-charcoal))" }}
        />
      </BottomSheet>
    </div>
  );
}
