import React from "react";
import { CentiumMark } from "../../icons/CentiumMark";
import type { ShareCard } from "../../../services/messaging/shareCards";
import { clock12 } from "../../../utils/time12";
import { textPx } from "../../../theme/textSize";
import { INK } from "../proInk";

/**
 * Release 3 · MO27 group chat: a programme (programme_share) or a session
 * (session_share) the professional shared, as the frame draws it on the
 * professional's side: ChatCard's frame (r18, 1.5 primary.dark border, #FBFAFE
 * / card), the Centium mark, the kind 11 / 800 caps 0.12em primary.deep and
 * the time 10 / 600 text.faint; inside, a card r14 with a 1px 10% border, pad
 * 12: the name 13.5 / 700 primary.deep and the facts 12 text.soft.
 *
 * NOT DRAWN: the members' "open it in Workout" / "book from here" buttons
 * (the client's side, W7 CU24; booking a place from a shared session has no
 * backend), and "{n} of {n} places taken" (a calendar event has no capacity).
 */
export const ShareChatCard: React.FC<{ card: ShareCard; time: string }> = ({ card, time }) => {
  const kind = card.kind === "programme_share" ? "Programme" : "Group session";
  const title = card.kind === "programme_share" ? card.name : card.title;
  const facts =
    card.kind === "programme_share"
      ? [card.durationWeeks ? `${card.durationWeeks} ${card.durationWeeks === 1 ? "week" : "weeks"}` : null, card.exerciseCount ? `${card.exerciseCount} ${card.exerciseCount === 1 ? "exercise" : "exercises"}` : null]
      : [
          card.startsAt ? `${new Date(card.startsAt).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })} · ${clock12(card.startsAt)}` : null,
          card.durationMin ? `${card.durationMin} min` : null,
          card.location,
        ];
  const line = facts.filter(Boolean).join(" · ");
  return (
    <div data-share-card={card.kind} className="w-full rounded-[18px] border-[1.5px] border-primary-dark bg-[#FBFAFE] dark:bg-cream-card flex flex-col p-3" style={{ gap: 10 }}>
      <div className="flex items-center" style={{ gap: 7, minHeight: 18 }}>
        <CentiumMark height={(16 * 713) / 648} framing="png" />
        <span className="flex-1 min-w-0 truncate uppercase" style={{ fontSize: textPx(11), fontWeight: 800, letterSpacing: "0.12em", color: INK.prDeep }}>
          {kind}
        </span>
        <span className="shrink-0" style={{ fontSize: textPx(10), fontWeight: 600, color: INK.chF }}>
          {time}
        </span>
      </div>
      <div style={{ background: INK.card, border: `1px solid ${INK.b10}`, borderRadius: 14, padding: 12 }}>
        <p style={{ fontSize: textPx(13.5), fontWeight: 700, color: INK.prDeep, overflowWrap: "anywhere" }}>{title}</p>
        {line && <p style={{ fontSize: textPx(12), color: INK.chS, marginTop: 4 }}>{line}</p>}
        {card.note && <p style={{ fontSize: textPx(12), color: INK.ch, marginTop: 6, whiteSpace: "pre-line" }}>{card.note}</p>}
      </div>
    </div>
  );
};
