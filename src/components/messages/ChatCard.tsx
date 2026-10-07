import React from "react";
import { Check, CircleCheck } from "lucide-react";
import { useApp } from "../../context/AppContext";
import { ThemedMark } from "../ui/ThemedMark";
import { cardDate, cardPriceLine, planButtonState, type MessageCard } from "../../services/messaging/cards";

/**
 * The two A3 chat cards, drawn in place of their message's text bubble.
 *
 * MO1.2.1.3.7 "Rami's plans" (plans_offer) and MO1.2.1.3.8 "Plan confirmed"
 * (hire_confirmed). Both: the content column's full width (358), #FBFAFE with a
 * 1.5 #7D6BB5 border, r 18; the header is the Centium mark, the title 11/800
 * #5F5093 and the time 10/600 #8C8378, gap 7. Each plan is a white r 14 card
 * with a 1 rgba(36,31,27,0.1) border, padding 12: the name 13.5/700 #5F5093,
 * the price 12.5/700 #241F1B, the features 11.5/400 #5B5349, and on the
 * client's side the button: "Choose" 12.5/700 white on #9A8CD6, "Choose"
 * disabled in #A79E93 once a plan is held, and "Selected" 12.5/700 #5F5093 with
 * CircleCheck 15/2 on the held plan (MO1.2.1.3.8 #10-12). The "Plan confirmed"
 * card pads 12/14 and shows Check 16/2.4, the plan · price 13.5/700 and the
 * date 11.5/400 #8C8378.
 *
 * NOT DRAWN, and why: the gold "Popular" tag (MO1.2.1.3.7 #11 — plans have no
 * popular flag in the backend) and "View receipt" (MO1.2.1.3.8 #13 — its
 * destination is unspecified on the board, and Centium moves no money, so
 * there is no receipt to open).
 */
export const ChatCard: React.FC<{
  card: MessageCard;
  /** The viewer posted it (the professional's own offer, or their own confirmation). */
  mine: boolean;
  /** Whose plans, for the header: the professional's first name, on the client's side. */
  senderName: string;
  /** When the message was sent (ISO): the header's time and the confirmation date. */
  createdAt: string;
  /** The header's time, star and (own messages) tick, already rendered by the thread. */
  meta: React.ReactNode;
  /** Plans the viewer holds a live hire on with this professional (professional_plans_for.is_hired). */
  hiredPlanIds: ReadonlySet<string>;
  /** Client side: open the MO1.2.1.5.1 checkout for this plan. */
  onChoose: (planId: string) => void;
}> = ({ card, mine, senderName, createdAt, meta, hiredPlanIds, onChoose }) => {
  const { colorTheme } = useApp();
  const title = card.kind === "plans_offer" ? (mine ? "Your plans" : `${senderName}'s plans`) : "Plan confirmed";

  return (
    <div
      className={`w-full rounded-[18px] border-[1.5px] border-primary-dark bg-[#FBFAFE] dark:bg-cream-card flex flex-col ${
        card.kind === "plans_offer" ? "p-3 gap-2.5" : "px-3.5 py-3 gap-1.5"
      }`}
    >
      <div className="flex items-center gap-[7px] min-h-[18px]">
        {colorTheme === "centium" ? (
          <img
            src="/centium-mark.png"
            alt=""
            aria-hidden="true"
            className="shrink-0 object-contain"
            style={{ width: (16 * 687) / 648, height: (16 * 713) / 648 }}
          />
        ) : (
          <ThemedMark width={(16 * 687) / 648} height={(16 * 713) / 648} className="shrink-0" />
        )}
        <span className="flex-1 min-w-0 truncate text-[11px] font-extrabold uppercase tracking-[0.12em] text-primary-deep-text">
          {title}
        </span>
        <span className="flex items-center gap-1 text-[10px] font-semibold text-charcoal-faint shrink-0">{meta}</span>
      </div>

      {card.kind === "plans_offer" ? (
        <div className="flex flex-col gap-2">
          {card.plans.map((plan) => {
            const state = planButtonState(plan.planId, hiredPlanIds);
            return (
              <div key={plan.planId} className="rounded-[14px] border border-charcoal/10 bg-cream-card p-3 flex flex-col">
                <p className="text-[13.5px] font-bold leading-[1.3] text-primary-deep-text break-words">{plan.name}</p>
                <p className="text-[12.5px] font-bold text-charcoal mt-1">{cardPriceLine(plan.price, plan.billing)}</p>
                {plan.features.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-[11.5px] leading-[1.4] text-charcoal-soft break-words">
                        <span aria-hidden className="w-[5px] h-[5px] rounded-full bg-th-9a8cd6 mt-[6px] shrink-0" />
                        <span className="min-w-0">{f}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {/* The professional sees their own offer as sent: no buttons. */}
                {!mine &&
                  (state === "selected" ? (
                    <span className="mt-3 h-[33px] w-full rounded-[10px] bg-primary-pale text-primary-deep-text text-[12.5px] font-bold flex items-center justify-center gap-1.5">
                      <CircleCheck size={15} strokeWidth={2} aria-hidden />
                      Selected
                    </span>
                  ) : (
                    <button
                      type="button"
                      disabled={state === "disabled"}
                      onClick={() => onChoose(plan.planId)}
                      // A press on the button is not the start of a long press on the card.
                      onPointerDown={(e) => e.stopPropagation()}
                      aria-label={`Choose ${plan.name}`}
                      className={`tap mt-3 h-[33px] w-full rounded-[10px] text-[12.5px] font-bold ${
                        state === "disabled"
                          ? "bg-cream-soft text-charcoal-tertiary"
                          : "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill"
                      }`}
                    >
                      Choose
                    </button>
                  ))}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-primary-pale flex items-center justify-center shrink-0">
            <Check size={16} strokeWidth={2.4} className="text-primary-dark" aria-hidden />
          </span>
          <span className="min-w-0 flex flex-col">
            <span className="text-[13.5px] font-bold text-charcoal break-words">
              {card.planName} · {cardPriceLine(card.price, card.billing)}
            </span>
            <span className="text-[11.5px] text-charcoal-faint">
              {cardDate(createdAt)}
              {card.expiresOn ? ` · until ${cardDate(card.expiresOn)}` : ""}
            </span>
          </span>
        </div>
      )}
    </div>
  );
};
