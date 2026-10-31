import React, { useState } from "react";
import clsx from "clsx";
import { Bell, Check, ChevronDown, Dumbbell, FileText, Link as LinkIcon, MapPin, Paperclip, Ticket, X } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { PopupMenu } from "../ui/PopupMenu";
import { ALERT_OPTIONS, alertLabel, type EventAlert } from "./eventAlert";
import { eventColours } from "./eventColour";
import { linkLabel, normaliseLink } from "./calendarTime";
import { range12 } from "../../utils/time12";
import type { ClientCalendarEvent } from "../../services/calendar";
import { PlaylistCard } from "../music/PlaylistCard";
import { appLocale } from "../../i18n/format";

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
  /**
   * A booking made this row (calendar_events.source_kind, B3) but the
   * booking's details are not readable here (a hire or an appointment): the
   * status line still says why it can't be edited.
   */
  bookingMade?: boolean;
  /** "View booking" (#13): opens the class page, where the booking is changed or cancelled. */
  onViewBooking?: () => void;
  /** B14 RP-04: a booked class that has ended can be rated (write_class_review). */
  onRate?: () => void;
  /** The invitee's own reminder (B3, PB-O-65), shown once they have accepted. */
  onInviteAlert?: (alert: EventAlert) => void;
  alertSaving?: boolean;
}> = ({ event, onClose, dark, booked, responding, online, onRespond, onOpenAttachment, bookingMade, onViewBooking, onRate, onInviteAlert, alertSaving }) => {
  const [alertAnchor, setAlertAnchor] = useState<HTMLElement | null>(null);
  const e = event;
  if (!e) return null;

  const { bar } = eventColours(e.color, dark);
  const status = e.invite?.status;
  const dateLabel = new Date(`${e.date}T00:00:00`).toLocaleDateString(appLocale("en-US"), {
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
              status === "accepted" ? "text-primary-dark" : status === "declined" ? "text-charcoal-faint" : "text-[color:var(--gold-pill-ink)] dark:text-[#CAB082]"
            )}
          >
            {status === "accepted" ? "Going" : status === "declined" ? "Declined" : "Invitation"}
          </p>
        ) : e.assignmentSourced ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-teal-dark dark:text-teal-deep-text">
            <Dumbbell size={11} aria-hidden /> Scheduled by your coach
          </p>
        ) : booked ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-[color:var(--gold-pill-ink)] dark:text-[#CAB082]">
            <Ticket size={11} aria-hidden /> Booked with {booked.businessName}
          </p>
        ) : bookingMade ? (
          <p className="flex items-center gap-1 text-[11px] font-semibold text-[color:var(--gold-pill-ink)] dark:text-[#CAB082]">
            <Ticket size={11} aria-hidden /> Added by a booking
          </p>
        ) : null}
        {/* B3 (PB-O-62, ATXB3): a booking's event changes only through the booking. */}
        {(booked || bookingMade) && !e.invite && (
          <p className="text-[12px] leading-4 text-charcoal-faint">To change or cancel it, change the booking.</p>
        )}

        {e.notes && (
          <p className="flex items-start gap-1 text-[12px] leading-4 text-charcoal-faint">
            <FileText size={11} aria-hidden className="mt-0.5 shrink-0" /> {e.notes}
          </p>
        )}

        {/* Round E: the session's playlist. */}
        {e.playlistUrl && <PlaylistCard url={e.playlistUrl} heading="Session playlist" style={{ marginTop: 4 }} />}

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
        {/* OURS (PB-O-65, not drawn): the invitee's own reminder, once they
            are going (the sweep queues nothing for an unanswered or declined
            invitation). The compose sheet's Alert field: 12 / 600 label with
            Bell 12 over a 40 field, ChevronDown 14, the app dropdown. */}
        {e.invite && status === "accepted" && onInviteAlert && (
          <div className="mt-2 min-w-0">
            <span className="text-xs font-semibold text-charcoal-soft mb-1.5 flex items-center gap-1.5">
              <Bell size={12} aria-hidden /> Your reminder
            </span>
            <button
              type="button"
              onClick={(ev) => setAlertAnchor(ev.currentTarget)}
              disabled={!online || alertSaving}
              aria-haspopup="menu"
              aria-expanded={!!alertAnchor}
              aria-label={`Your reminder, ${alertLabel(e.invite.alert)}`}
              className="tap w-full h-10 rounded-xl bg-cream-soft border border-charcoal/10 px-3 text-sm text-charcoal flex items-center justify-between gap-2 text-start disabled:opacity-60"
            >
              <span className="truncate">{alertLabel(e.invite.alert)}</span>
              <ChevronDown size={14} className="text-charcoal-faint shrink-0" aria-hidden />
            </button>
            <PopupMenu
              open={!!alertAnchor}
              onClose={() => setAlertAnchor(null)}
              anchor={alertAnchor}
              options={ALERT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              selected={e.invite.alert}
              onSelect={(v) => {
                setAlertAnchor(null);
                onInviteAlert(v);
              }}
            />
          </div>
        )}

        {/* #13 "View booking": the class page, where the booking is changed or cancelled. */}
        {onViewBooking && (
          <button
            type="button"
            onClick={onViewBooking}
            className="tap min-h-11 self-start text-[13px] font-bold text-primary-deep-text"
          >
            View booking
          </button>
        )}
        {onRate && (
          <button type="button" onClick={onRate} className="tap min-h-11 self-start text-[13px] font-bold text-primary-deep-text">
            Rate this class
          </button>
        )}
      </div>
    </BottomSheet>
  );
};
