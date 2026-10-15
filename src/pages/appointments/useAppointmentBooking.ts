import { useCallback, useState } from "react";
import { acceptClassPolicies, pendingClassPolicies, type PendingClassPolicy } from "../../services/marketplace";
import { APPOINTMENT_POLICY_KINDS } from "../../services/marketplace/classBooking";
import { bookAppointment, bookErrorMessage } from "../../services/appointments";

// B12 booking, the class flow (useClassBooking) with the appointment's
// documents: book_appointment() refuses with ATXE4 until the client has
// accepted the business's published appointment waiver, liability waiver and
// house rules. Book first asks pending_policies(); with documents waiting it
// shows them (ClassTermsSheet), records one acceptance per document and only
// then books. A second ATXE4 (a document published between the two calls)
// reads the documents again.

export type ApptBookOutcome = { kind: "booked"; id: string } | { kind: "terms" } | { kind: "error"; message: string; code?: string };

const FALLBACK = "Couldn't book. Try again.";

export function useAppointmentBooking(businessId: string, userId: string | null) {
  const [terms, setTerms] = useState<PendingClassPolicy[] | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showTerms = useCallback(async (): Promise<ApptBookOutcome | null> => {
    const p = await pendingClassPolicies(businessId, APPOINTMENT_POLICY_KINDS);
    if (!p.ok) return { kind: "error", message: p.message, code: p.code };
    if (p.value.length === 0) return null;
    setTermsError(null);
    setTerms(p.value);
    return { kind: "terms" };
  }, [businessId]);

  const book = useCallback(
    async (serviceId: string, staffId: string, startsAt: string): Promise<ApptBookOutcome> => {
      const r = await bookAppointment(serviceId, staffId, startsAt);
      if (r.ok) return { kind: "booked", id: r.value };
      if (r.code === "ATXE4") {
        const again = await showTerms();
        if (again) return again;
      }
      if (r.pending) return { kind: "error", message: "Booking is coming soon." };
      return { kind: "error", code: r.code, message: bookErrorMessage(r.code, r.message ?? "", FALLBACK) };
    },
    [showTerms]
  );

  /** Book: the business's terms first when any are waiting, else book_appointment(). */
  const start = useCallback(
    async (serviceId: string, staffId: string, startsAt: string): Promise<ApptBookOutcome> => {
      if (busy) return { kind: "error", message: "" };
      setBusy(true);
      try {
        const t = await showTerms();
        if (t) return t;
        return await book(serviceId, staffId, startsAt);
      } finally {
        setBusy(false);
      }
    },
    [busy, showTerms, book]
  );

  /** "Agree and book": one acceptance per document, then book_appointment(). */
  const agree = useCallback(
    async (serviceId: string, staffId: string, startsAt: string): Promise<ApptBookOutcome> => {
      if (busy || !terms || !userId) return { kind: "error", message: "" };
      setBusy(true);
      try {
        const a = await acceptClassPolicies(
          userId,
          terms.map((d) => d.versionId)
        );
        if (!a.ok) {
          setTermsError(a.message);
          return { kind: "terms" };
        }
        const r = await book(serviceId, staffId, startsAt);
        if (r.kind !== "terms") setTerms(null);
        return r;
      } finally {
        setBusy(false);
      }
    },
    [busy, terms, userId, book]
  );

  const closeTerms = useCallback(() => {
    if (busy) return;
    setTerms(null);
    setTermsError(null);
  }, [busy]);

  return { terms, termsError, busy, start, agree, closeTerms };
}
