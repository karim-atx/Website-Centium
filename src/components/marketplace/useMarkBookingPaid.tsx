import { useState } from "react";
import { PopupMenu } from "../ui/PopupMenu";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { useOnline } from "../../hooks/useOnline";
import { markPaid } from "../../services/business-revenue";
import { offerPromotionUsed } from "../../components/promotions/promotionUsed";

import { canMarkBookingPaid, type RosterEntry } from "../../services/venues/consoleLogic";

// CL-08 · Mark as paid on a class booking (OP1-083 K2): tapping a booked row
// that is awaiting payment opens the PopupMenu with "Mark as paid"; then the
// toast "Marked as paid." The call is the existing mark_class_booking_paid
// (business-revenue markPaid), which needs front_desk, so the action only
// exists for a seat that meets it. Waitlist rows never have it, and a roster
// without booking_id (an older database) keeps the rows inert.

export function useMarkBookingPaid({ onDone }: { onDone: (entry: RosterEntry) => void }) {
  const access = useConsoleAccess();
  const online = useOnline();
  const deskOk = access.ready && access.meets("front_desk");
  const [menu, setMenu] = useState<{ entry: RosterEntry; anchor: HTMLElement } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Whether this row opens the menu. */
  const can = (e: RosterEntry) => deskOk && canMarkBookingPaid(e);

  const open = (entry: RosterEntry, anchor: HTMLElement) => {
    if (!can(entry) || busy) return;
    setError(null);
    setMenu({ entry, anchor });
  };

  const run = async (entry: RosterEntry) => {
    setMenu(null);
    if (busy || !entry.bookingId) return;
    setBusy(true);
    setError(null);
    const r = await markPaid({ kind: "class", id: entry.bookingId });
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    onDone(entry);
    offerPromotionUsed({ kind: "class_booking", sourceId: entry.bookingId });
  };

  const element = (
    <PopupMenu
      open={!!menu}
      onClose={() => setMenu(null)}
      anchor={menu?.anchor ?? null}
      variant="field"
      width={204}
      heading={menu?.entry.label}
      options={menu ? [{ value: "paid", label: "Mark as paid", disabled: !online }] : []}
      onSelect={() => menu && void run(menu.entry)}
    />
  );

  return { can, open, busy, error, element };
}
