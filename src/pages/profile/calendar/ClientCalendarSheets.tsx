import { Toast } from "../../../components/ui/Toast";
import { EventComposeSheet } from "../../../components/calendar/EventComposeSheet";
import { EventDetailSheet } from "../../../components/calendar/EventDetailSheet";
import { RateClassSheet } from "../../../components/marketplace/RateClassSheet";
import { InstructorReviewDialog } from "../../../components/market/InstructorReviewDialog";
import { sentText } from "../../../services/instructor-reviews";
import { RepeatScopePopup } from "../../../components/calendar/RepeatScopePopup";
import { occurrenceKey } from "../../../components/calendar/occurrences";
import { AlertCircle } from "lucide-react";
import { t } from "../../../i18n/core";
import { openAttachment, type ClientCalendar } from "./useClientCalendar";

/** The page's sheets, popups and toasts (compose, repeat scope, event detail, rate, review), for both pages. */
export function ClientCalendarSheets({ cal }: { cal: ClientCalendar }) {
  const { navigate, composeOpen, setComposeOpen, editingId, scopeAsk, setScopeAsk, draft, setDraft, confirmDelete, setConfirmDelete, linkError, dark, saving, saveError, respondingTo, respondFailed, setRespondFailed, detailId, setDetailId, alertSaving, toast, setToast, rate, setRate, reviewTarget, setReviewTarget, reviewStrip, showReviewStrip, openRate, online, bookedById, linkedById, bookingOf, occurrences, editingRepeats, saveEvent, removeEvent, respond, saveInviteAlert, todayIso } = cal;
  return (
    <>
      <EventComposeSheet
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        editing={!!editingId}
        draft={draft}
        setDraft={setDraft}
        todayIso={todayIso}
        saving={saving}
        error={saveError}
        linkError={linkError}
        onSave={() => void saveEvent()}
        onDelete={() => {
          // A repeat asks which occurrences instead (that popup is the confirm).
          if (editingRepeats) {
            void removeEvent();
            return;
          }
          if (!confirmDelete) {
            setConfirmDelete(true);
            setTimeout(() => setConfirmDelete(false), 3000);
            return;
          }
          void removeEvent();
        }}
        confirmDelete={confirmDelete}
      />

      <RepeatScopePopup
        mode={scopeAsk}
        busy={saving}
        onCancel={() => setScopeAsk(null)}
        onChoose={(scope) => void (scopeAsk === "delete" ? removeEvent(scope) : saveEvent(scope))}
      />

      {(() => {
        const detail = detailId ? occurrences.find((x) => occurrenceKey(x) === detailId) ?? null : null;
        // "View booking" (#13): the class page, where the booking is changed
        // or cancelled. A hire or an appointment has no page to open.
        const classId = detail ? (bookedById.get(detail.id)?.id ?? linkedById.get(detail.id)?.classId) : undefined;
        // An overlay row's notes start "Booked with …" for the cards; the
        // sheet says that in its status line, so it shows the class's own.
        const overlay = detail ? bookedById.get(detail.id) : undefined;
        const booking = detail ? bookingOf(detail) : null;
        const ended = !!detail && new Date(`${detail.date}T${detail.endTime ?? detail.startTime ?? "23:59"}`).getTime() < new Date().getTime();
        return (
          <EventDetailSheet
            event={detail && overlay ? { ...detail, notes: overlay.notes || undefined } : detail}
            onClose={() => setDetailId(null)}
            dark={dark}
            booked={detail ? bookingOf(detail) : null}
            responding={!!detail?.invite && respondingTo === detail.invite.id}
            online={online}
            onRespond={(accepted) => detail && void respond(detail, accepted)}
            onOpenAttachment={(path) => void openAttachment(path)}
            bookingMade={!!detail?.sourceKind}
            onViewBooking={classId ? () => navigate(`/app/marketplace/class?id=${encodeURIComponent(classId)}`) : undefined}
            onRate={
              booking && ended && detail
                ? () => {
                    openRate({ bookingId: booking.bookingId, title: detail.title, businessName: booking.businessName, classId: classId ?? null });
                    setDetailId(null);
                  }
                : undefined
            }
            onInviteAlert={(alert) => detail && void saveInviteAlert(detail, alert)}
            alertSaving={alertSaving}
          />
        );
      })()}

      <RateClassSheet
        open={!!rate}
        bookingId={rate?.bookingId ?? null}
        classTitle={rate?.title ?? ""}
        businessName={rate?.businessName ?? ""}
        onClose={() => setRate(null)}
      />
      <InstructorReviewDialog
        target={reviewTarget}
        onClose={() => setReviewTarget(null)}
        onSent={(target) => {
          setReviewTarget(null);
          showReviewStrip(sentText(target.professionalName, target.gymName), "success", { label: t("View"), onPress: () => navigate(`/app/professionals/${encodeURIComponent(target.professionalId)}`) });
        }}
      />
      {reviewStrip}

      {/* MO1.6 K10: a failed invitation answer, the shared toast with the
          danger icon (#C0392B / #F09A8E). */}
      <Toast
        open={respondFailed}
        message={t("Couldn't save your response. Try again.")}
        icon={<AlertCircle size={15} strokeWidth={2.4} aria-hidden className="flex-none text-status-high" />}
        onExpire={() => setRespondFailed(false)}
      />
      <Toast
        open={!!toast}
        message={toast ?? ""}
        icon={<AlertCircle size={15} strokeWidth={2.4} aria-hidden className="flex-none text-status-high" />}
        onExpire={() => setToast(null)}
      />
    </>
  );
}
