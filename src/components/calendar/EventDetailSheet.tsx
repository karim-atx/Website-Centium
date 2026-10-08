import React from "react";
import clsx from "clsx";
import { Check, Dumbbell, FileText, Link as LinkIcon, MapPin, Paperclip, Ticket, X } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { eventColours } from "./eventColour";
import { linkLabel, normaliseLink } from "./calendarTime";
import { range12 } from "../../utils/time12";
import type { ClientCalendarEvent } from "../../services/calendar";

/**
 * OURS-Calendar-event-detail: the read-only sheet for an event this account
 * cannot edit (an invitation, a session the coach scheduled, a booked class,
 * a calendar row a booking made). Own events keep opening the edit sheet
 * (MO1.6.4). Built from the MO1.6.4 lavender-header BottomSheet and the
 * MO1.6 / MO1.6.2 tokens:
 * - the colour bar (3 x 32, r9999, the event colour; dark shade in dark) and
 *   the date and time 14 / 20 600 charcoal;
 * - repeat, location, notes 12 / 16 400 faint (#8C8378 / #B8B3C7), MapPin and
 *   FileText 11;
 * - the status line 11 / 600 in the Week badge's colours;
 * - link and attachment 12 / 600 primary-deep-text;
 * - the delisted note 12 / 16 italic faint;
 * - Decline + Accept as the sheet CTA pair (52, r16, gap 8, icons 15).
 * The links open in a new tab. While offline the answers are disabled and the
 * sheet says so.
 */
export const EventDetailSheet: React.FC<{
  event: ClientCalendarEvent | null;
  onClose: () => void;
  dark: boolean;
  /** Set for a booked class (overlay or booking-made row). */
  booked?: { businessName: string; businessActive: boolean } | null;
  responding: boolean;
  online: boolean;
  onRespond: (accepted: boolean) => void;
  onOpenAttachment: (path: string) => void;
}> = ({ event, onClose, dark, booked, responding, online, onRespond, onOpenAttachment }) => {
  const e = event;
  if (!e) return null;

  const { bar } = eventColours(e.color, dark);
  const status = e.invite?.status;
  const dateLabel = new Date(`${e.date}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const href = normaliseLink(e.url);
  const repeat = e.repeat !== "none" ? `Repeats ${e.repeat}` : null;

  return (
    <BottomSheet open onClose={onClose} title={e.title}>
      <div className="flex flex-col gap-2 pb-2">
        <div className="flex items-center gap-[11px]">
          <span aria-hidden className="w-[3px] h-8 rounded-full shrink-0" style={{ background: bar }} />
          <p className="text-[14px] leading-[20px] font-semibold text-charcoal">
            {dateLabel}
            <span className="block">{e.allDay ? "All day" : range12(e.startTime, e.endTime)}</span>
          </p>
        </div>

        {repeat && <p className="text-[12px] leading-4 text-charcoal-faint">{repeat}</p>}
        {e.location && (
          <p className="flex items-center gap-1 text-[12px] leading-4 text-charcoal-faint">
            <MapPin size={11} aria-hidden className="shrink-0" /> {e.location}
          </p>
        )}

        {/* The status line: who made it, or where the invitation stands. */}
        {status ? (
          <p
            className={clsx(
              "text-[11px] font-semibold",
              status === "accepted" ? "text-primary-dark" : status === "declined" ? "text-charcoal-faint" : "text-[#9A7424] dark:text-[#CAB082]"
            )}
          >
            {status === "accepted" ? "Going" : status === "declined" ? "Declined" : "Invitation"}
          </p>
        ) : e.assignmentSourced ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-teal-dark dark:text-teal-deep-text">
            <Dumbbell size={11} aria-hidden /> Scheduled by your coach
          </p>
        ) : booked ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-[#9A7424] dark:text-[#CAB082]">
            <Ticket size={11} aria-hidden /> Booked with {booked.businessName}
          </p>
        ) : null}

        {e.notes && (
          <p className="flex items-start gap-1 text-[12px] leading-4 text-charcoal-faint">
            <FileText size={11} aria-hidden className="mt-0.5 shrink-0" /> {e.notes}
          </p>
        )}

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="tap inline-flex items-center gap-1 max-w-full text-[12px] font-semibold text-primary-deep-text underline underline-offset-2 decoration-primary-deep-text/40 self-start"
          >
            <LinkIcon size={11} aria-hidden className="shrink-0" />
            <span className="truncate">{linkLabel(href)}</span>
          </a>
        )}

        {e.attachmentPath && (
          <button
            type="button"
            onClick={() => onOpenAttachment(e.attachmentPath!)}
            className="tap flex items-center gap-1 text-[12px] font-semibold text-primary-deep-text self-start"
          >
            <Paperclip size={11} aria-hidden /> Open attachment
          </button>
        )}

        {booked && !booked.businessActive && (
          <p className="text-[12px] leading-4 italic text-charcoal-faint">
            {booked.businessName} is no longer listed on Explore. Your booking still stands.
          </p>
        )}

        {e.invite && (
          <>
            {!online && <p className="text-[12px] leading-4 text-charcoal-faint">You're offline.</p>}
            <div className="flex gap-2 mt-2">
              <CtaButton
                size="sheet"
                variant="secondary"
                label={status === "declined" ? "Declined" : "Decline"}
                icon={<X size={15} aria-hidden />}
                disabled={!online || responding || status === "declined"}
                onClick={() => onRespond(false)}
              />
              <CtaButton
                size="sheet"
                label={status === "accepted" ? "Going" : "Accept"}
                icon={<Check size={15} aria-hidden />}
                disabled={!online || responding || status === "accepted"}
                onClick={() => onRespond(true)}
              />
            </div>
          </>
        )}
        {/* "View booking" (#13) opens the class page once the classes area
            links there; hidden until then, as the checklist says. */}
      </div>
    </BottomSheet>
  );
};
