import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { usePremium } from "../../services/premium/hooks";
import { fetchStreakShields } from "../../services/premium/g2Calls";
import { shieldsLeftText, shieldStreaksText, type StreakShields as Shields } from "../../services/premium/g2";
import { formatShortDate } from "../../utils/date";
import { t } from "../../i18n/core";

// undrawn (Round G, no handover)
// Round G2 · streak shields, on the streaks area: how many are left this
// month, and which days a shield covered (the nightly run uses one
// automatically when yesterday was missed on a live streak; 2 a calendar
// month). Hidden in recovery-sensitive mode like streaks, while the switch
// is off, without Premium, and when my_streak_shields() says shields_on is
// false or isn't there.

const dayText = (ymd: string) => formatShortDate(new Date(`${ymd}T12:00:00`), { weekday: "short", day: "numeric", month: "short" });

export function StreakShieldsLine({ className = "" }: { className?: string }) {
  const { authUserId } = useApp();
  const { premium } = usePremium();
  const hide = useHideNumbers();
  const on = !!premium?.premiumOn && premium.premium && !hide;
  const [shields, setShields] = useState<{ userId: string; value: Shields | null } | null>(null);

  useEffect(() => {
    if (!on || !authUserId) return;
    let live = true;
    void fetchStreakShields().then((value) => live && setShields({ userId: authUserId, value }));
    return () => {
      live = false;
    };
  }, [on, authUserId]);

  const s = on && shields?.userId === authUserId ? shields.value : null;
  if (!s) return null;
  return (
    <div data-streak-shields="" className={`rounded-2xl bg-cream-card px-4 py-3 shadow-soft ${className}`}>
      {s.shieldsLeft !== null && (
        <p className="flex items-center gap-2 text-[12.5px] font-bold text-charcoal">
          <ShieldCheck size={15} aria-hidden className="text-primary-deep-text" />
          {shieldsLeftText(s.shieldsLeft)}
        </p>
      )}
      {s.used.slice(0, 3).map((u) => (
        <p key={u.day} className="mt-1 text-[11.5px] leading-[17px] text-charcoal-faint">
          {t("A shield covered {day}: {streaks}", { day: dayText(u.day), streaks: shieldStreaksText(u.streaks) })}
        </p>
      ))}
    </div>
  );
}
