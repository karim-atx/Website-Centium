import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Bell } from "lucide-react";
import { Button } from "../ui/Button";
import { useApp } from "../../context/AppContext";
import { enablePush } from "../../services/push";
import { onPushAsk, snoozePushAsk, type PushAskMoment } from "../../services/push/ask";
import { textPx } from "../../theme/textSize";
import { t, tk } from "../../i18n/core";

/**
 * Round J · J-2b (website PLAN.md §2.2, app Z2.1): the short card that asks
 * to turn on notifications in the phone app, never at launch, only right
 * after a moment that explains itself (services/push/ask.ts). "Turn on" is
 * the only way to the phone's own prompt; "Not now" waits 30 days.
 *
 * Mounted once, in the app only (App.tsx); rendered as NativeAppGate's
 * update bar is, above the tab bar.
 */
const COPY: Record<PushAskMoment, { title: string; body: string }> = {
  message: {
    title: tk("Know when they reply"),
    body: tk("Turn on notifications to hear about replies, even when Centium is closed."),
  },
  reminder: {
    title: tk("Get your reminders on time"),
    body: tk("Turn on notifications so your reminders reach you, even when Centium is closed."),
  },
  booking: {
    title: tk("Stay on top of your booking"),
    body: tk("Turn on notifications for reminders and any changes to your bookings."),
  },
};

export const PushAskCard: React.FC = () => {
  const { authUserId } = useApp();
  const [moment, setMoment] = useState<PushAskMoment | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => onPushAsk(setMoment), []);

  if (!moment || !authUserId) return null;
  const copy = COPY[moment];

  const notNow = () => {
    snoozePushAsk();
    setMoment(null);
  };
  const turnOn = async () => {
    setBusy(true);
    // The phone's prompt, then this install's registration; whatever the
    // answer, Settings › Notifications says where it stands.
    await enablePush(authUserId);
    setBusy(false);
    setMoment(null);
  };

  return createPortal(
    <div
      role="dialog"
      aria-label={t(copy.title)}
      data-push-ask={moment}
      className="fixed inset-x-0 z-[900] flex justify-center px-4"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)" }}
    >
      <div
        className="w-full max-w-[420px] bg-cream-card"
        style={{ borderRadius: 16, padding: "14px 14px 12px", boxShadow: "0 8px 24px rgba(0,0,0,0.16)" }}
      >
        <div className="flex items-start" style={{ gap: 12 }}>
          <span
            aria-hidden
            className="shrink-0 flex items-center justify-center bg-primary-pale text-primary-accent"
            style={{ width: 36, height: 36, borderRadius: 11 }}
          >
            <Bell size={17} strokeWidth={1.75} />
          </span>
          <div className="flex-1 min-w-0">
            <p style={{ margin: 0, fontSize: textPx(15), fontWeight: 700, color: "rgb(var(--c-charcoal))" }}>{t(copy.title)}</p>
            <p style={{ margin: "4px 0 0", fontSize: textPx(13), lineHeight: 1.45, color: "rgb(var(--c-charcoal-muted))" }}>{t(copy.body)}</p>
          </div>
        </div>
        <div className="flex justify-end" style={{ gap: 8, marginTop: 10 }}>
          <Button variant="ghost" size="sm" onClick={notNow} disabled={busy}>
            {t("Not now")}
          </Button>
          <Button size="sm" onClick={() => void turnOn()} disabled={busy}>
            {t("Turn on")}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
