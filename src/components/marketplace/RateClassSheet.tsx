import { useState } from "react";
import { BottomSheet } from "../ui/BottomSheet";
import { CtaButton } from "../ui/PinnedCta";
import { ReviewForm } from "./ReviewForm";
import { writeClassReview } from "../../services/venues";

// B14 RP-04 "Rate your visit" from a class booking (write_class_review).
// One review per person per venue (or business): writing again edits the
// existing review and tags it with this class and its instructor, which the
// sheet says up front. No frame exists: MO1.2.1.2's review flow in the
// app's own BottomSheet, the strings flagged in the B14 report.

export function RateClassSheet({
  open,
  bookingId,
  classTitle,
  businessName,
  onClose,
}: {
  open: boolean;
  bookingId: string | null;
  classTitle: string;
  businessName: string;
  onClose: () => void;
}) {
  const [done, setDone] = useState(false);
  const close = () => {
    setDone(false);
    onClose();
  };

  return (
    <BottomSheet open={open && !!bookingId} onClose={close} title={`Rate ${classTitle}`}>
      {done ? (
        <div className="space-y-5">
          <p role="status" className="m-0 text-[13px] leading-[1.55] text-charcoal-soft">
            Thanks. Your review is posted.
          </p>
          <CtaButton size="page" label="Done" onClick={close} className="!bg-fill-pinned !text-on-primary-fill" />
        </div>
      ) : (
        <>
          <p className="mt-0 mb-4 text-[12px] leading-[1.5] text-charcoal-faint">
            If you've already reviewed {businessName}, this updates that review.
          </p>
          {bookingId && (
            <ReviewForm
              key={bookingId}
              placeholder={`How was ${classTitle}?`}
              submitLabel="Submit review"
              onSubmit={async (rating, text) => {
                const r = await writeClassReview(bookingId, rating, text);
                if (!r.ok) return r.message;
                setDone(true);
                return null;
              }}
            />
          )}
        </>
      )}
    </BottomSheet>
  );
}
