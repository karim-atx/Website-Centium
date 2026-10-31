import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { INK } from "../pro/proInk";
import { textPx } from "../../theme/textSize";
import { t } from "../../i18n/core";
import { useHideNumbers } from "../../hooks/useHideNumbers";
import { daysLabel, portionLabel, type SharedPlan } from "../../services/messaging/groupCardsModel";
import { fetchSharedMealPlan } from "../../services/messaging/sharedMealPlan";
import { MusicSection } from "../music/MusicSection";
import { providerHeading } from "../../services/music/whichMusic";

/**
 * Round D · a meal plan shared in a group, opened by a member from its card
 * (shared_meal_plan_detail, 20261223060000): day by day, each meal's items
 * with their portion and note. Never calories or macros (the server sends
 * none). In recovery-sensitive mode the portions are left out too.
 */
export const SharedMealPlanSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  messageId: string;
  fallbackName: string;
  /** Round E: the professional who shared it, for "{name}'s playlist". */
  senderFirstName?: string;
}> = ({ open, onClose, messageId, fallbackName, senderFirstName }) => {
  const hideNumbers = useHideNumbers();
  const [state, setState] = useState<{ key: string; plan: SharedPlan | null; error: string | null } | null>(null);
  const [tick, setTick] = useState(0);
  const key = `${messageId}:${tick}`;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void fetchSharedMealPlan(messageId).then((r) => {
      if (!cancelled) setState({ key, plan: r.ok ? r.plan : null, error: r.ok ? null : r.message });
    });
    return () => {
      cancelled = true;
    };
  }, [open, messageId, key]);

  const loaded = state?.key === key ? state : null;
  const plan = loaded?.plan ?? null;
  const days = daysLabel(plan?.days);

  return (
    <BottomSheet open={open} onClose={onClose} title={plan?.name ?? fallbackName}>
      {!loaded ? (
        <p style={{ fontSize: textPx(13), color: INK.chF }}>{t("Opening the plan…")}</p>
      ) : loaded.error ? (
        <div className="flex flex-col items-start" style={{ gap: 6 }}>
          <p style={{ fontSize: textPx(13), color: INK.hi }}>{loaded.error}</p>
          <button type="button" onClick={() => setTick((k) => k + 1)} className="tap" style={{ minHeight: 44, fontSize: textPx(13), fontWeight: 700, color: INK.prDeep }}>
            {t("Try again")}
          </button>
        </div>
      ) : !plan ? (
        <p style={{ fontSize: textPx(13), color: INK.chF }}>{t("This plan isn't available any more.")}</p>
      ) : (
        <div className="flex flex-col" style={{ gap: 16 }}>
          {days && <p style={{ fontSize: textPx(12), color: INK.chF, marginTop: -4 }}>{days}</p>}
          {/* Round E: the plan's playlist (and the member's own cooking favourite beside it). */}
          {plan.playlistUrl && <MusicSection moment="cooking" provider={{ url: plan.playlistUrl, heading: providerHeading(senderFirstName) }} playlistsOnly />}
          {plan.dayList.map((d) => (
            <section key={d.index} className="flex flex-col" style={{ gap: 8 }}>
              <h3 style={{ fontSize: textPx(14), fontWeight: 700, color: INK.hi }}>{d.label}</h3>
              {d.meals.map((m, i) => (
                <div key={`${m.slot}-${i}`} className="rounded-[12px] border border-charcoal/10" style={{ padding: "10px 12px" }}>
                  <p style={{ fontSize: textPx(11), fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: INK.chF, marginBottom: 4 }}>{m.title}</p>
                  <ul className="flex flex-col" style={{ gap: 6 }}>
                    {m.items.map((it, j) => {
                      const portion = hideNumbers ? null : portionLabel(it);
                      return (
                        <li key={j} className="min-w-0">
                          <p style={{ fontSize: textPx(13), color: INK.hi }}>
                            {it.name}
                            {portion && <span style={{ color: INK.chF }}> · {portion}</span>}
                          </p>
                          {it.note && <p style={{ fontSize: textPx(12), color: INK.chF }}>{it.note}</p>}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      )}
    </BottomSheet>
  );
};
