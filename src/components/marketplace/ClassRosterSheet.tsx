import { useEffect, useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { Card } from "../ui/Card";
import { MemberTag } from "./MemberTag";
import { initials } from "../professionals/typeColour";
import { fetchClassRoster } from "../../services/venues/console";
import { methodLabel, money, splitRoster, type RosterEntry } from "../../services/venues/consoleLogic";

// One class's roster (stage A4, venue_class_roster()): who is booked and who
// is waiting, a first name and a minor flag each. Gated on the class's
// business, so a class with no venue still has a roster. Drawn with the
// business console's sheet and card rows; NOT YET MATCHED TO THE BUSINESS UI
// BOARD.

const PAY: Record<string, { label: string; tone: "member" | "pending" | "muted" }> = {
  paid: { label: "Paid", tone: "member" },
  pending: { label: "Awaiting payment", tone: "pending" },
  refunded: { label: "Refunded", tone: "muted" },
};

export function ClassRosterSheet({ classId, title, onClose }: { classId: string | null; title: string; onClose: () => void }) {
  const [state, setState] = useState<{ classId: string; entries: RosterEntry[] } | null>(null);
  const [error, setError] = useState<{ classId: string; message: string } | null>(null);

  useEffect(() => {
    if (!classId) return;
    let cancelled = false;
    void (async () => {
      const r = await fetchClassRoster(classId);
      if (cancelled) return;
      if (!r.ok) {
        setError({ classId, message: r.message });
        return;
      }
      setError(null);
      setState({ classId, entries: r.value });
    })();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  const entries = state && state.classId === classId ? state.entries : null;
  const failed = error && error.classId === classId ? error.message : null;
  const { booked, waitlist } = splitRoster(entries ?? []);

  const row = (e: RosterEntry, i: number) => {
    const pay = e.paymentStatus ? PAY[e.paymentStatus] : null;
    return (
      <Card key={`${e.kind}-${i}`} className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-primary-pale flex items-center justify-center shrink-0 text-sm font-bold text-primary-dark">
          {e.kind === "waitlist" && e.waitlistPosition ? e.waitlistPosition : initials(e.firstName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-charcoal flex items-center gap-1.5 min-w-0">
            <span className="truncate">{e.firstName}</span>
            {e.isMinor && <MemberTag label="Under 18" tone="muted" />}
          </p>
          <p className="text-xs text-charcoal-faint truncate">
            {e.kind === "booked"
              ? [e.priceAgreed !== null ? (e.priceAgreed > 0 ? money(e.priceAgreed) : "Free") : null, methodLabel(e.paymentMethod)].filter(Boolean).join(" · ")
              : `Waiting, number ${e.waitlistPosition ?? "–"} in line`}
          </p>
        </div>
        {pay && <MemberTag label={pay.label} tone={pay.tone} />}
      </Card>
    );
  };

  return (
    <BottomSheet open={!!classId} onClose={onClose} title={title || "Class roster"}>
      <div className="space-y-4 animate-fade-slide-up">
        {failed && <p className="rounded-xl bg-cream-soft px-3.5 py-2.5 text-xs font-semibold text-status-high">{failed}</p>}
        {!entries && !failed && <p className="text-xs text-charcoal-faint">Loading roster…</p>}
        {entries && (
          <>
            <div>
              <p className="section-label text-charcoal-faint mb-2.5">Booked ({booked.length})</p>
              <div className="space-y-2.5">
                {booked.map(row)}
                {booked.length === 0 && <p className="text-sm text-charcoal-faint">Nobody has booked yet.</p>}
              </div>
            </div>
            {waitlist.length > 0 && (
              <div>
                <p className="section-label text-charcoal-faint mb-2.5">Waitlist ({waitlist.length})</p>
                <div className="space-y-2.5">{waitlist.map(row)}</div>
              </div>
            )}
          </>
        )}
      </div>
    </BottomSheet>
  );
}
