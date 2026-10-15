import { useState } from "react";
import { PopupMenu } from "../ui/PopupMenu";
import { BottomSheet } from "../ui/BottomSheet";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { useOnline } from "../../hooks/useOnline";
import { markPaid } from "../../services/business-revenue";
import { offerPromotionUsed } from "../../components/promotions/promotionUsed";
import { useOps } from "../../pages/business-ops/classes/opsTheme";
import { linePx, textPx } from "../../theme/textSize";

import { canMarkBookingPaid, type RosterEntry } from "../../services/venues/consoleLogic";

// CL-08 · Mark as paid on a class booking (OP1-083 K2): tapping a booked row
// that is awaiting payment opens the PopupMenu with "Mark as paid" and "Add a
// reference" (OURS-OP1-class-roster row 10: an optional reference, 120
// characters, in a small K15 sheet); then the toast "Marked as paid." The
// call is the existing mark_class_booking_paid(booking, reference)
// (business-revenue markPaid), which needs front_desk, so the action only
// exists for a seat that meets it. Waitlist rows never have it, and a roster
// without booking_id (an older database) keeps the rows inert.

export const REFERENCE_MAX = 120;

export function useMarkBookingPaid({ onDone }: { onDone: (entry: RosterEntry) => void }) {
  const access = useConsoleAccess();
  const online = useOnline();
  const c = useOps();
  const deskOk = access.ready && access.meets("front_desk");
  const [menu, setMenu] = useState<{ entry: RosterEntry; anchor: HTMLElement } | null>(null);
  const [refFor, setRefFor] = useState<RosterEntry | null>(null);
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** Whether this row opens the menu. */
  const can = (e: RosterEntry) => deskOk && canMarkBookingPaid(e);

  const open = (entry: RosterEntry, anchor: HTMLElement) => {
    if (!can(entry) || busy) return;
    setError(null);
    setMenu({ entry, anchor });
  };

  const run = async (entry: RosterEntry, ref: string | null = null): Promise<boolean> => {
    setMenu(null);
    if (busy || !entry.bookingId) return false;
    setBusy(true);
    setError(null);
    const r = await markPaid({ kind: "class", id: entry.bookingId }, ref);
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return false;
    }
    onDone(entry);
    offerPromotionUsed({ kind: "class_booking", sourceId: entry.bookingId });
    return true;
  };

  /** "Add a reference": the K15 sheet, then the same call with the reference. */
  const openReference = (entry: RosterEntry) => {
    setMenu(null);
    setError(null);
    setReference("");
    setRefFor(entry);
  };

  const element = (
    <>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        variant="field"
        width={204}
        heading={menu?.entry.label}
        options={
          menu
            ? [
                { value: "paid", label: "Mark as paid", disabled: !online },
                { value: "ref", label: "Add a reference", disabled: !online },
              ]
            : []
        }
        onSelect={(v) => {
          if (!menu) return;
          if (v === "ref") openReference(menu.entry);
          else void run(menu.entry);
        }}
      />
      {/* K15 sheet (OURS-OP1-venue-console-page K15; SubstituteSheet geometry). */}
      <BottomSheet
        open={!!refFor}
        onClose={() => !busy && setRefFor(null)}
        title="Add a reference"
        tone="business"
        headerHeight={62}
        animateExit
        bodyPadding={{ top: 18, right: 18, bottom: 30, left: 18 }}
      >
        <label htmlFor="pay-ref" className="block whitespace-nowrap" style={{ margin: "0 0 6px", fontSize: textPx(12), fontWeight: 700, color: c.inkSoft }}>
          Reference (optional)
        </label>
        <style>{`.pay-ref::placeholder { color: ${c.faint}; font-weight: 500; opacity: 1; }`}</style>
        <input
          id="pay-ref"
          value={reference}
          maxLength={REFERENCE_MAX}
          disabled={busy}
          onChange={(e) => setReference(e.target.value)}
          placeholder="e.g. receipt or transfer number"
          className="pay-ref w-full block focus:outline-none"
          style={{ minHeight: 48, borderRadius: 14, background: c.input, border: `1px solid ${c.border}`, padding: "0 14px", fontSize: textPx(14), lineHeight: linePx(20), fontWeight: 600, color: c.ink, caretColor: c.pDark }}
        />
        <p className="tabular-nums" style={{ margin: "5px 2px 14px", textAlign: "right", fontSize: textPx(11), color: c.faint }}>
          {reference.length}/{REFERENCE_MAX}
        </p>
        <button
          type="button"
          onClick={async () => {
            if (!refFor) return;
            if (await run(refFor, reference)) setRefFor(null);
          }}
          disabled={busy || !online}
          className="tap w-full flex items-center justify-center"
          style={{ minHeight: 52, borderRadius: 16, background: c.fill, color: c.onFill, fontSize: textPx(14.5), fontWeight: 800, opacity: busy || !online ? 0.45 : 1 }}
        >
          {busy ? "Saving…" : "Mark as paid"}
        </button>
        {error && refFor && (
          <p role="alert" style={{ margin: "5px 0 0", fontSize: textPx(11.5), fontWeight: 700, color: c.high }}>
            {error}
          </p>
        )}
      </BottomSheet>
    </>
  );

  // `run` lets a caller with its own menu (ClassRosterSheet: Mark as paid + Message) mark one row paid;
  // `openReference` opens the reference sheet from that menu.
  return { can, open, run, openReference, busy, error, element };
}
