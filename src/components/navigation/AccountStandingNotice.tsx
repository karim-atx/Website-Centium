import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MailCheck, ShieldAlert } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { resendVerificationEmail, useAccountStanding } from "../../services/account-standing";
import { startSupportThread } from "../../services/support";
import { useTurnstile } from "../security/useTurnstile";
import { SecurityCheck } from "../security/SecurityCheck";
import { t } from "../../i18n/core";

// Round I · FG (Karim 2026-11-05; Database 20261226490000): what a new account
// sees when the sign-up check asks more of it. Shown where the account
// deletion notice is (the app's layout, phone and web), in the same card.
//
// - verify_email (a step-up): "Verify your email to unlock rewards", with the
//   confirmation email sent again. Until then referral rewards wait and
//   vouchers aren't offered; everything else works.
// - under_review (a hold): "Your account is being reviewed", what waits, and
//   the support chat, which is never affected.
//
// Never the score or the reasons. In shadow mode the standing is always 'ok',
// so this renders nothing until the check is switched to enforce.
export const AccountStandingNotice: React.FC = () => {
  const { authUserId } = useApp();
  const { standing } = useAccountStanding(!!authUserId);
  if (standing === "ok") return null;
  return standing === "verify_email" ? <VerifyEmailNotice /> : <UnderReviewNotice />;
};

/** The step-up: verify the email. The resend carries a Turnstile token, as sign-up's does. */
const VerifyEmailNotice: React.FC = () => {
  const { user, theme } = useApp();
  const { token, status, container, reset, required } = useTurnstile(theme);
  const [sent, setSent] = useState<"idle" | "busy" | "sent" | "failed">("idle");
  const resend = async () => {
    if (!user.email || sent === "busy" || (required && !token)) return;
    setSent("busy");
    const ok = await resendVerificationEmail(user.email, token ?? undefined);
    // Cloudflare refuses a token twice: a fresh one for any next try.
    reset();
    setSent(ok ? "sent" : "failed");
  };
  return (
    <div role="status" className="rounded-2xl bg-primary-pale border border-primary-accent/20 px-4 py-3.5 mb-5">
      <div className="flex items-start gap-2.5">
        <MailCheck size={16} className="text-primary-accent shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-charcoal">{t("Verify your email to unlock rewards")}</p>
          <p className="text-[11.5px] text-charcoal-soft mt-0.5">
            {t("Open the link we emailed you. Until then, referral rewards wait for you and vouchers aren't offered. Everything else works as usual.")}
          </p>
          {sent === "sent" && <p className="text-[11.5px] font-semibold text-charcoal mt-1.5">{t("Sent. Check your inbox and spam folder.")}</p>}
          {sent === "failed" && <p className="text-[11.5px] font-semibold text-status-high mt-1.5">{t("Couldn't send it. Try again in a minute.")}</p>}
          {user.email && sent !== "sent" && (
            <div className="mt-2">
              <SecurityCheck status={status} container={container} />
            </div>
          )}
        </div>
        {user.email && sent !== "sent" && (
          <button
            type="button"
            onClick={() => void resend()}
            disabled={sent === "busy" || (required && !token)}
            className="tap shrink-0 rounded-xl bg-cream-card text-charcoal text-[11.5px] font-semibold px-3 py-1.5 shadow-soft disabled:opacity-50"
          >
            {sent === "busy" ? t("Sending…") : t("Send the email again")}
          </button>
        )}
      </div>
    </div>
  );
};

/** The hold: what waits while the account is reviewed, and the support chat, which never does. */
const UnderReviewNotice: React.FC = () => {
  const navigate = useNavigate();
  const [chatBusy, setChatBusy] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chat = async () => {
    if (chatBusy) return;
    setChatBusy(true);
    setChatError(null);
    const r = await startSupportThread();
    setChatBusy(false);
    if (!r.ok) return setChatError(r.message);
    navigate("/app/messages", { state: { threadId: r.threadId } });
  };
  return (
    <div role="status" className="rounded-2xl bg-status-high-bg border border-status-high/25 px-4 py-3.5 mb-5">
      <div className="flex items-start gap-2.5">
        <ShieldAlert size={16} className="text-status-high shrink-0 mt-0.5" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-charcoal">{t("Your account is being reviewed")}</p>
          <p className="text-[11.5px] text-charcoal-soft mt-0.5">
            {t("While we check it, you can't message new people, post in the forum, write reviews, use a referral code or invite clients. Your own logging, settings and the support chat work as usual.")}
          </p>
          {chatError && <p className="text-[11.5px] font-semibold text-status-high mt-1.5">{t(chatError)}</p>}
        </div>
        <button
          type="button"
          onClick={() => void chat()}
          disabled={chatBusy}
          className="tap shrink-0 rounded-xl bg-cream-card text-charcoal text-[11.5px] font-semibold px-3 py-1.5 shadow-soft disabled:opacity-50"
        >
          {chatBusy ? t("Opening…") : t("Chat with support")}
        </button>
      </div>
    </div>
  );
};
