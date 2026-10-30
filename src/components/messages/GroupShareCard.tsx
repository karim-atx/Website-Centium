import { useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck } from "lucide-react";
import { ShareChatCard } from "../pro/messages/ShareChatCard";
import { ConfirmCard } from "../ui/ConfirmCard";
import { useOpenThread } from "./useOpenThread";
import { useProSubtype } from "../../hooks/useProSubtype";
import { mealPlansHref } from "../pro/nutrition/nav";
import { SharedMealPlanSheet } from "./SharedMealPlanSheet";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { clock12 } from "../../utils/time12";
import { browserOffline } from "../../services/health-log/offlineQueue";
import { OFFLINE_MESSAGE } from "../../services/network-error";
import type { ShareCard } from "../../services/messaging/shareCards";
import { bookSharedSession, cancelSharedSessionBooking } from "../../services/messaging/sessionPlaces";
import { placesAfter, placesLine, sessionAction, type SessionPlaces } from "../../services/messaging/groupCardsModel";
import { appLocale } from "../../i18n/format";
import { t, tn } from "../../i18n/core";

/**
 * Round D · a card the professional shared into a group (DT4), drawn by
 * ShareChatCard with what each viewer can do under it:
 *
 * - SESSION (D-S14, free sessions only, no waitlist): "{taken} of {capacity}
 *   places taken" (no line when there is no limit), then "Book a place" (a
 *   confirmation first), "You're booked" with "Cancel booking", "Full ·
 *   {n} places", or, for a paid session, "Ask {pro}" (opens the chat with the
 *   professional). The professional sees the places line on their own card.
 * - MEAL PLAN (D-S13): name, days and note only. The professional who sent it
 *   gets "Open plan" (their builder). Members get "View plan", a sheet read
 *   through shared_meal_plan_detail (20261223060000): the days, meals and
 *   items, never calories or macros.
 * - PROGRAMME: unchanged (read-only).
 */
export const GroupShareCard: React.FC<{
  card: ShareCard;
  time: string;
  messageId: string;
  /** The viewer sent it (the professional). */
  mine: boolean;
  /** The viewer is a professional (their own Messages). */
  viewerIsPro: boolean;
  senderId: string | null;
  senderFirstName: string;
  places: SessionPlaces | undefined;
  onPlaces: (p: SessionPlaces) => void;
  /** Read the places again after a refusal (somebody else may have booked). */
  onRefresh: () => void;
  /** The group is closed or the viewer left: nothing can be done from the card. */
  readOnly: boolean;
}> = ({ card, time, messageId, mine, viewerIsPro, senderId, senderFirstName, places, onPlaces, onRefresh, readOnly }) => {
  const footer =
    card.kind === "session_share" ? (
      <SessionFooter
        card={card}
        messageId={messageId}
        mine={mine}
        senderId={senderId}
        pro={senderFirstName}
        places={places}
        onPlaces={onPlaces}
        onRefresh={onRefresh}
        readOnly={readOnly}
      />
    ) : card.kind === "meal_plan_share" && mine && viewerIsPro && card.mealPlanId ? (
      <MealPlanLink planId={card.mealPlanId} />
    ) : card.kind === "meal_plan_share" && !mine && !readOnly ? (
      <ViewSharedPlan messageId={messageId} name={card.name} senderFirstName={senderFirstName} />
    ) : null;
  return <ShareChatCard card={card} time={time} footer={footer} />;
};

const ViewSharedPlan: React.FC<{ messageId: string; name: string; senderFirstName: string }> = ({ messageId, name, senderFirstName }) => {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="tap h-11 -my-[5.5px] w-full flex items-center"
      >
        <span className="h-[33px] w-full rounded-[10px] border border-charcoal/10 flex items-center justify-center" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
          {t("View plan")}
        </span>
      </button>
      <SharedMealPlanSheet open={open} onClose={() => setOpen(false)} messageId={messageId} fallbackName={name} senderFirstName={senderFirstName} />
    </>
  );
};

const MealPlanLink: React.FC<{ planId: string }> = ({ planId }) => {
  const { lane } = useProSubtype();
  if (!lane || lane === "clinical_overview") return null;
  return (
    <Link
      to={mealPlansHref(lane, "plans", { plan: planId })}
      onPointerDown={(e) => e.stopPropagation()}
      className="tap h-11 -my-[5.5px] w-full flex items-center"
    >
      <span className="h-[33px] w-full rounded-[10px] border border-charcoal/10 flex items-center justify-center" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.prDeep }}>
        {t("Open plan")}
      </span>
    </Link>
  );
};

const SessionFooter: React.FC<{
  card: Extract<ShareCard, { kind: "session_share" }>;
  messageId: string;
  mine: boolean;
  senderId: string | null;
  pro: string;
  places: SessionPlaces | undefined;
  onPlaces: (p: SessionPlaces) => void;
  onRefresh: () => void;
  readOnly: boolean;
}> = ({ card, messageId, mine, senderId, pro, places, onPlaces, onRefresh, readOnly }) => {
  const [confirm, setConfirm] = useState<"book" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When the card was drawn; the minute poll re-reads the places (and the server refuses a started session anyway).
  const [now] = useState(() => Date.now());
  const ask = useOpenThread(senderId ?? "");
  const line = placesLine(places);
  const action = readOnly ? ({ kind: "none" } as const) : sessionAction(places, { mine, startsAt: card.startsAt, now });
  if (!line && action.kind === "none") return null;

  const run = async (kind: "book" | "cancel") => {
    if (busy || !places) return;
    if (browserOffline()) {
      setConfirm(null);
      return setError(OFFLINE_MESSAGE);
    }
    setBusy(true);
    setError(null);
    const r = kind === "book" ? await bookSharedSession(messageId, pro) : await cancelSharedSessionBooking(messageId);
    setBusy(false);
    setConfirm(null);
    if (!r.ok) {
      setError(r.message);
      onRefresh();
      return;
    }
    onPlaces(placesAfter(places, kind === "book"));
    onRefresh();
  };

  const when = card.startsAt
    ? t("{date} at {time}", { date: new Date(card.startsAt).toLocaleDateString(appLocale("en-US"), { weekday: "short", day: "numeric", month: "short" }), time: clock12(card.startsAt) })
    : null;
  const button = (label: string, onClick: () => void, filled: boolean, disabled = false) => (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="tap h-11 -my-[5.5px] w-full flex items-center disabled:opacity-60"
    >
      <span
        className={`h-[33px] w-full rounded-[10px] flex items-center justify-center ${filled ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border border-charcoal/10"}`}
        style={{ fontSize: textPx(12.5), fontWeight: 700, color: filled ? undefined : INK.prDeep }}
      >
        {label}
      </span>
    </button>
  );

  return (
    <div className="flex flex-col" style={{ gap: 8 }} data-session-places={places ? `${places.taken}/${places.capacity ?? "-"}` : undefined}>
      {line && (
        <p style={{ fontSize: textPx(12), fontWeight: 600, color: INK.chS }} aria-live="polite">
          {line}
        </p>
      )}
      {action.kind === "book" && button(t("Book a place"), () => setConfirm("book"), true)}
      {(action.kind === "cancel" || action.kind === "booked") && (
        <span className="h-[33px] w-full rounded-[10px] bg-primary-pale text-primary-deep-text flex items-center justify-center gap-1.5" style={{ fontSize: textPx(12.5), fontWeight: 700 }}>
          <CircleCheck size={15} strokeWidth={2} aria-hidden />
          {t("You're booked")}
        </span>
      )}
      {action.kind === "cancel" && button(t("Cancel booking"), () => setConfirm("cancel"), false)}
      {action.kind === "full" && (
        <span className="h-[33px] w-full rounded-[10px] bg-cream-soft flex items-center justify-center" style={{ fontSize: textPx(12.5), fontWeight: 700, color: INK.chS }}>
          {t("Full")} · {tn(action.capacity, "{n} place", "{n} places")}
        </span>
      )}
      {action.kind === "ask" && senderId && button(ask.busy ? t("Opening…") : t("Ask {name}", { name: pro }), () => void ask.open(), false, ask.busy)}
      {(error || ask.error) && (
        <p role="alert" style={{ fontSize: textPx(12), fontWeight: 600, color: INK.hi }}>
          {error ?? ask.error}
        </p>
      )}
      <ConfirmCard
        open={confirm === "book"}
        layout="decision"
        title={t("Book {title}?", { title: card.title })}
        subtitle={[when, card.location].filter(Boolean).join(" · ") || undefined}
        confirmLabel={t("Book a place")}
        cancelLabel={t("Not now")}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run("book")}
      />
      <ConfirmCard
        open={confirm === "cancel"}
        layout="decision"
        tone="destructive"
        title={t("Cancel your booking?")}
        subtitle={t("Your place on {title} goes back to the group.", { title: card.title })}
        confirmLabel={t("Cancel booking")}
        cancelLabel={t("Keep my place")}
        busy={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => void run("cancel")}
      />
    </div>
  );
};
