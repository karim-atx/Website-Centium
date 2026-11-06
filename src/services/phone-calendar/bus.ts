// Round J · J-2d: "a booking or a cancellation happened", so the phone's
// calendar syncs again (PhoneCalendarSync listens). Called by the booking and
// cancelling services on success; does nothing when nobody listens (a
// browser).
const listeners = new Set<() => void>();

export function calendarChanged(): void {
  for (const l of listeners) l();
}

export function onCalendarChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
