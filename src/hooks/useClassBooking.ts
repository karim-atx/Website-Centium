import { useCallback, useState } from "react";
import { acceptClassPolicies, bookClass, pendingClassPolicies, type PendingClassPolicy } from "../services/marketplace";

// Booking a class since B9: book_class() refuses (ATXE4) until the member has
// accepted the venue's published liability waiver, class terms and house
// rules. So Book first asks pending_policies(); with documents waiting it
// shows them (ClassTermsSheet), records an acceptance per document and only
// then books. A refusal that still says ATXE4 (a document published between
// the two calls) reads the documents again and shows them. Shared by the
// class page (MO1.4.4.1) and the gym page's Book a class (MO1.4.2.1.1).

export type BookOutcome = { kind: "booked" } | { kind: "terms" } | { kind: "error"; message: string; code?: string };

export function useClassBooking({ classId, businessId, userId }: { classId: string | null; businessId: string | null; userId: string | null }) {
  const [terms, setTerms] = useState<PendingClassPolicy[] | null>(null);
  const [termsError, setTermsError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const showTerms = useCallback(async (): Promise<BookOutcome | null> => {
    if (!businessId) return null;
    const p = await pendingClassPolicies(businessId);
    if (!p.ok) return { kind: "error", message: p.message, code: p.code };
    if (p.value.length === 0) return null;
    setTermsError(null);
    setTerms(p.value);
    return { kind: "terms" };
  }, [businessId]);

  const book = useCallback(async (): Promise<BookOutcome> => {
    if (!classId) return { kind: "error", message: "Couldn't book that class. Try again." };
    const r = await bookClass(classId);
    if (r.ok) return { kind: "booked" };
    if (r.code === "ATXE4") {
      const again = await showTerms();
      if (again) return again;
    }
    return { kind: "error", message: r.message, code: r.code };
  }, [classId, showTerms]);

  /** Book: the venue's terms first when any are waiting, else book_class(). */
  const start = useCallback(async (): Promise<BookOutcome> => {
    if (busy) return { kind: "error", message: "" };
    setBusy(true);
    try {
      const t = await showTerms();
      if (t) return t;
      return await book();
    } finally {
      setBusy(false);
    }
  }, [busy, showTerms, book]);

  /** "Agree and book": one acceptance per document, then book_class(). */
  const agree = useCallback(async (): Promise<BookOutcome> => {
    if (busy || !terms || !userId) return { kind: "error", message: "" };
    setBusy(true);
    try {
      const a = await acceptClassPolicies(
        userId,
        terms.map((d) => d.versionId)
      );
      if (!a.ok) {
        // The sheet stays open with the line; nothing was booked.
        setTermsError(a.message);
        return { kind: "terms" };
      }
      const r = await book();
      // Booked, or refused for another reason (full, closed, …: the
      // acceptances stand and the page shows why): the sheet closes. A
      // second ATXE4 has already put the new documents in it.
      if (r.kind !== "terms") setTerms(null);
      return r;
    } finally {
      setBusy(false);
    }
  }, [busy, terms, userId, book]);

  const closeTerms = useCallback(() => {
    if (busy) return;
    setTerms(null);
    setTermsError(null);
  }, [busy]);

  return { terms, termsError, busy, start, agree, closeTerms };
}
