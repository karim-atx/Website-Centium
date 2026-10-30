import {
  createEvent,
  endSeries,
  setOccurrence,
  updateEvent,
  type CalendarEventDraft,
  type ClientCalendarEvent,
} from "../../services/calendar";
import { addDays, dayBefore, daysBetween } from "./occurrences";
import type { RepeatScope } from "./RepeatScopePopup";
import { EVENT_SWATCHES } from "./eventColour";

/**
 * Saves an edit to one occurrence of a repeating event, in the scope the
 * person chose (MO1.6 B5, PB-O-64; Database B3, HANDOVER_API "Calendar: a
 * repeat can end, and one occurrence can differ"):
 *
 * - "all": the series row itself. Its first date stays its own; moving the
 *   tapped day moves the whole series by the same number of days.
 * - "following": the old series ends the day before (repeat_until) and a new
 *   series starts on the tapped day with the edited values. From the first
 *   date, this is the same as "all".
 * - "one": an exception for that day. An override can carry only title, times,
 *   location, notes and all day, and never a new date; any other change
 *   (date, colour, link, alert, repeat) cancels that day and adds the edited
 *   event as a one-off instead, so nothing the person typed is dropped.
 */
export async function saveRepeating(
  userId: string,
  series: ClientCalendarEvent,
  occurrence: string,
  scope: RepeatScope,
  draft: CalendarEventDraft
): Promise<{ ok: boolean; message?: string }> {
  if (scope === "all" || (scope === "following" && occurrence <= series.date)) {
    const date = addDays(series.date, daysBetween(occurrence, draft.date));
    const r = await updateEvent(userId, series.id, { ...draft, date });
    return r.ok ? { ok: true } : r;
  }

  if (scope === "following") {
    const ended = await endSeries(userId, series.id, dayBefore(occurrence));
    if (!ended.ok) return ended;
    const r = await createEvent(userId, draft);
    return r.ok ? { ok: true } : r;
  }

  const sameUrl = (series.url ?? "") === (draft.url ?? "");
  // Round E: an occurrence's override can't carry a playlist, so a changed one
  // makes this date its own event, like a changed link.
  const samePlaylist = draft.playlistUrl === undefined || (series.playlistUrl ?? "") === (draft.playlistUrl?.trim() ?? "");
  const overridable =
    draft.date === occurrence &&
    draft.repeat === series.repeat &&
    // An event saved with no colour opens with the first swatch selected.
    (draft.color ?? EVENT_SWATCHES[0]) === (series.color ?? EVENT_SWATCHES[0]) &&
    sameUrl &&
    samePlaylist &&
    (draft.alert ?? series.alert) === series.alert;

  if (overridable) {
    return setOccurrence(series.id, occurrence, {
      override: {
        title: draft.title,
        all_day: draft.allDay,
        start_time: draft.allDay ? null : draft.startTime ?? null,
        end_time: draft.allDay ? null : draft.endTime ?? null,
        location: draft.location?.trim() || null,
        notes: draft.notes?.trim() || null,
      },
    });
  }

  const cancelled = await setOccurrence(series.id, occurrence, { cancelled: true });
  if (!cancelled.ok) return cancelled;
  const r = await createEvent(userId, { ...draft, repeat: "none", repeatUntil: null });
  return r.ok ? { ok: true } : r;
}
