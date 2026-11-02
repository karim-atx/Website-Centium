import React, { useEffect, useState } from "react";
import { useApp } from "../../context/AppContext";
import { fetchNeedsDateOfBirth } from "../../services/profile";
import { DobInline } from "./DobInline";
import { t } from "../../i18n/core";

const DISMISS_KEY = (userId: string) => `centium:dob-prompt-dismissed:${userId}`;

function dismissedThisSession(userId: string): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY(userId)) === "1";
  } catch {
    return false;
  }
}

/**
 * Task T: "Add your date of birth", for an account that finished onboarding
 * before a date of birth was required (needs_date_of_birth()).
 *
 * GENTLE AND NON-BLOCKING. Nothing is refused to these accounts; this sits
 * on Home and Profile until a date is saved. "Not now" hides it for the rest
 * of this session (sessionStorage, per account), and it comes back next
 * session until a date is added.
 *
 * NOT FOR PROFESSIONALS: they already meet the listing prompt (DobInline in
 * the public listing sheet), which asks for the same date for a reason that
 * matters to them.
 */
export const DobPromptCard: React.FC<{
  className?: string;
  /** Profile: the Recovery-card style (DobInline `tile`). Home keeps its own. */
  tile?: boolean;
  /** Business Dashboard (OURS-DA-kept-features #3): the setup card language; Not now inside the card. */
  setup?: boolean;
}> = ({ className, tile, setup }) => {
  const { authUserId, user } = useApp();
  const [needs, setNeeds] = useState<{ userId: string; value: boolean } | null>(null);
  const [dismissed, setDismissed] = useState<string | null>(null);

  useEffect(() => {
    if (!authUserId || user.accountType === "professional") return;
    let cancelled = false;
    void fetchNeedsDateOfBirth().then((value) => {
      if (!cancelled && value !== null) setNeeds({ userId: authUserId, value });
    });
    return () => {
      cancelled = true;
    };
  }, [authUserId, user.accountType]);

  if (!authUserId || user.accountType === "professional") return null;
  if (!needs || needs.userId !== authUserId || !needs.value) return null;
  if (user.dateOfBirth) return null;
  if (dismissed === authUserId || dismissedThisSession(authUserId)) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY(authUserId), "1");
    } catch {
      /* private mode: hidden for this page view only */
    }
    setDismissed(authUserId);
  };

  if (setup)
    return (
      <div className={className}>
        <DobInline
          setup
          title={t("Add your date of birth")}
          body={t("It keeps your age, calorie targets and health suggestions right. Check it before saving; to change it later, contact support.")}
          onSaved={() => setNeeds({ userId: authUserId, value: false })}
          after={
            <button type="button" onClick={dismiss} className="tap self-start min-h-[44px] text-[11.5px] font-bold text-primary-deep-text">
              {t("Not now")}
            </button>
          }
        />
      </div>
    );

  return (
    <div className={className}>
      <DobInline
        tile={tile}
        title={t("Add your date of birth")}
        body={t("It keeps your age, calorie targets and health suggestions right. Check it before saving; to change it later, contact support.")}
        onSaved={() => setNeeds({ userId: authUserId, value: false })}
      />
      <button
        type="button"
        onClick={dismiss}
        className="tap mt-1.5 w-full text-center text-xs font-semibold text-charcoal-soft"
      >
        {t("Not now")}
      </button>
    </div>
  );
};
