import { useState } from "react";
import { Check } from "lucide-react";
import { BottomSheet } from "../../components/ui/BottomSheet";
import { CtaButton } from "../../components/ui/PinnedCta";
import { VENUE_POLICY_TITLES } from "../../services/marketplace/classBooking";
import type { PendingClassPolicy } from "../../services/marketplace";
import { DetailLabel } from "./venueParts";

// OURS-class-terms (B9, ATXE4): the venue's terms before a first booking.
// NO FRAME EXISTS for this step (Part B and the Business UI customer side
// draw none), so it is designed in the Part B client language: a Part B
// bottom sheet, each document under its section label (MO1.4.4 #25) with the
// business's text VERBATIM in a scrolling block (the info tiles' #F7F7FA /
// cream-soft, r14), an "I agree" check per document (the booking popup's
// radio, MO1.4.4.1), then one pinned "Agree and book" (fill.pinned), off
// until every document is agreed. The text is never shortened or reworded:
// it is the business's own legal / safety wording. Scrim, Escape and Back
// close it without booking. Strings written here are flagged in the report.

export function ClassTermsSheet({
  docs,
  businessName,
  busy,
  online,
  error,
  onAgree,
  onClose,
  booked = false,
}: {
  docs: PendingClassPolicy[] | null;
  businessName: string;
  busy: boolean;
  online: boolean;
  error: string | null;
  onAgree: () => void;
  onClose: () => void;
  /** B12: the terms of an appointment the business already booked: "before your appointment", "Agree". */
  booked?: boolean;
}) {
  // What has been agreed, for this set of documents only: a new set (ATXE4
  // again, a document published meanwhile) starts unticked.
  const key = (docs ?? []).map((d) => d.versionId).join();
  const [agreed, setAgreed] = useState<{ key: string; ids: Set<string> }>({ key: "", ids: new Set() });
  const set = agreed.key === key ? agreed.ids : new Set<string>();
  const toggle = (id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setAgreed({ key, ids: next });
  };
  return (
    <BottomSheet
      open={!!docs && docs.length > 0}
      onClose={onClose}
      title="Before you book"
      chrome="partB"
      footer={
        docs && (
          <TermsFooter docs={docs} set={set} busy={busy} online={online} error={error} onAgree={onAgree} booked={booked} />
        )
      }
    >
      {docs && <TermsBody docs={docs} set={set} toggle={toggle} businessName={businessName} booked={booked} />}
    </BottomSheet>
  );
}

function TermsBody({
  docs,
  set,
  toggle,
  businessName,
  booked,
}: {
  docs: PendingClassPolicy[];
  set: Set<string>;
  toggle: (id: string) => void;
  businessName: string;
  booked: boolean;
}) {
  return (
    <div data-class-terms="">
      <p className="m-0 text-[13px] leading-[19.5px] text-charcoal-soft">
        {docs.length === 1
          ? `${businessName} asks you to read and accept this before ${booked ? "your appointment" : "booking"}.`
          : `${businessName} asks you to read and accept these before ${booked ? "your appointment" : "booking"}.`}
      </p>
      {docs.map((d) => {
        const title = VENUE_POLICY_TITLES[d.kind];
        const on = set.has(d.versionId);
        return (
          <section key={d.versionId} className="mt-[22px]" data-class-term={d.kind}>
            <DetailLabel>{title}</DetailLabel>
            <div
              tabIndex={0}
              role="document"
              aria-label={title}
              className="mt-2 max-h-[220px] overflow-y-auto rounded-[14px] bg-[#F7F7FA] dark:bg-cream-soft px-3 py-2.5 text-[13px] leading-[20.8px] text-charcoal-soft whitespace-pre-wrap [overflow-wrap:anywhere] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              {d.body}
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(d.versionId)}
              className="tap mt-1.5 w-full min-h-11 flex items-center gap-2.5 text-start"
            >
              <span
                aria-hidden
                className={`w-5 h-5 rounded-[6px] flex items-center justify-center shrink-0 ${
                  on ? "bg-th-9a8cd6 text-white dark:bg-primary-fill dark:text-on-primary-fill" : "border-[1.5px] border-charcoal/[0.18]"
                }`}
              >
                {on && <Check size={12} strokeWidth={3} />}
              </span>
              <span className="text-[13.5px] leading-[20.3px] font-bold text-charcoal">I agree to the {title.toLowerCase()}</span>
            </button>
          </section>
        );
      })}
    </div>
  );
}

function TermsFooter({
  docs,
  set,
  busy,
  online,
  error,
  onAgree,
  booked,
}: {
  docs: PendingClassPolicy[];
  set: Set<string>;
  busy: boolean;
  online: boolean;
  error: string | null;
  onAgree: () => void;
  booked: boolean;
}) {
  const all = docs.every((d) => set.has(d.versionId));
  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="m-0 text-[12px] font-semibold text-status-high">
          {error}
        </p>
      )}
      {!online && <p className="m-0 text-[12px] font-semibold text-charcoal-soft">You're offline.</p>}
      <CtaButton label={booked ? "Agree" : "Agree and book"} loading={busy} disabled={!all || !online} onClick={onAgree} className="!bg-fill-pinned !text-on-primary-fill" />
    </div>
  );
}
