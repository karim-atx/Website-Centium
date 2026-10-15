import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarX, Repeat, Trash2 } from "lucide-react";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { time12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { useApp } from "../../../context/AppContext";
import { fetchClassRoster } from "../../../services/venues/console";
import { splitRoster } from "../../../services/venues/consoleLogic";
import { uploadClassCover } from "../../../services/business-classes/schedule";
import { sendMessage, startThread } from "../../../services/messaging";
import { cancelBody, cancelledToast, dayMonth, repeatsSentence, seriesToast, toldTail } from "../../../services/business-classes/scheduleRules";
import { ClassSheet } from "./ClassSheet";
import { blankForm, carryOf, formOf, type ClassForm } from "./classForm";
import { SubstituteSheet } from "./SubstituteSheet";
import { MessageMembersSheet } from "./MessageMembersSheet";
import { useConsoleAccess } from "../../../hooks/useConsoleAccess";
import { useOps } from "./opsTheme";
import { dayWords, shortDate, todayIso, type Session } from "./scheduleModel";
import type { ScheduleApi } from "./useSchedule";

// The actions a session offers wherever it is shown (Schedule row menu,
// session page tiles, Needs attention): Create / Edit (the class sheet, with
// the OP1-085 "this or all future" pop-up first for a repeating class),
// Request a substitute, Message members (OP1-088, B7 MB-02), Cancel session
// (OP1-086 / 087, B9 cancel_class_session), Delete (only while nobody has
// booked: the server refuses it otherwise, ATXE1) and, OURS, Stop repeating
// (B9 end_class_series). One place, so every entry behaves the same.
// Messaging needs both messages and front_desk: the booked list
// (venue_class_roster) is a desk reader.

/** A draft kept while the owner goes to Team to add an employee (AN3-024 S1). */
let parkedDraft: ClassForm | null = null;
export const takeParkedDraft = () => {
  const d = parkedDraft;
  parkedDraft = null;
  return d;
};

export interface ToastState {
  message: string;
  action?: { label: string; onClick: () => void };
  key: number;
}

type SheetState = { mode: "create" | "edit"; scope: "this" | "future"; initial: ClassForm; editingId?: string };

export function useSessionActions(api: ScheduleApi, opts: { onCreated?: (id: string) => void; onDeleted?: (s: Session) => void } = {}) {
  const navigate = useNavigate();
  const c = useOps();
  const { authUserId } = useApp();
  const today = todayIso();
  const [sheet, setSheet] = useState<SheetState | null>(null);
  const [seriesFor, setSeriesFor] = useState<Session | null>(null);
  const [subFor, setSubFor] = useState<string | null>(null);
  const [msgFor, setMsgFor] = useState<string | null>(null);
  const access = useConsoleAccess();
  /** Message members: the seat may message and read who booked. */
  const canMessage = access.meets("messages") && access.meets("front_desk");
  const [deleteFor, setDeleteFor] = useState<Session | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cancelFor, setCancelFor] = useState<Session | null>(null);
  const [cancelCounts, setCancelCounts] = useState<{ waitlist: number; paid: number }>({ waitlist: 0, paid: 0 });
  const [cancelReason, setCancelReason] = useState("");
  const [cancelBusy, setCancelBusy] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [endFor, setEndFor] = useState<Session | null>(null);
  const [endBusy, setEndBusy] = useState(false);
  const [endError, setEndError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, action?: ToastState["action"]) => setToast({ message, action, key: Date.now() }), []);

  const openCreate = useCallback((initial?: ClassForm) => setSheet({ mode: "create", scope: "this", initial: initial ?? blankForm(todayIso()) }), []);
  const openEditScope = useCallback(
    (id: string, scope: "this" | "future") => {
      const row = api.classes.find((x) => x.id === id);
      if (row) setSheet({ mode: "edit", scope, initial: formOf(row), editingId: id });
    },
    [api.classes]
  );
  /** OP1-085: a repeating class asks "this or all future" first; a one-off opens the sheet. */
  const openEdit = useCallback(
    (id: string) => {
      const s = api.sessions.find((x) => x.id === id);
      if (s?.seriesId && api.seriesOf(s.seriesId)) setSeriesFor(s);
      else openEditScope(id, "this");
    },
    [api, openEditScope]
  );
  const openSubstitute = useCallback((id: string) => setSubFor(id), []);
  const openMessage = useCallback((id: string) => setMsgFor(id), []);
  const openDelete = useCallback(
    (id: string) => {
      const s = api.sessions.find((x) => x.id === id);
      if (s && s.booked === 0 && !s.cancelled) {
        setDeleteError(null);
        setDeleteFor(s);
      }
    },
    [api.sessions]
  );
  const openCancel = useCallback(
    (id: string) => {
      const s = api.sessions.find((x) => x.id === id);
      if (!s || s.cancelled) return;
      setCancelError(null);
      setCancelReason("");
      setCancelCounts({ waitlist: 0, paid: 0 });
      setCancelFor(s);
      // The waitlist and paid counts for the body come from the desk's roster
      // (front_desk). Without it the body names the booked count only.
      void fetchClassRoster(id).then((r) => {
        if (!r.ok) return;
        const { booked, waitlist } = splitRoster(r.value);
        setCancelCounts({ waitlist: waitlist.length, paid: booked.filter((e) => e.paymentStatus === "paid").length });
      });
    },
    [api.sessions]
  );
  const openEndSeries = useCallback(
    (id: string) => {
      const s = api.sessions.find((x) => x.id === id);
      if (s?.seriesId) {
        setEndError(null);
        setEndFor(s);
      }
    },
    [api.sessions]
  );

  const editing = sheet?.editingId ? api.classes.find((x) => x.id === sheet.editingId) ?? null : null;
  const editingBooked = sheet?.editingId ? api.sessions.find((s) => s.id === sheet.editingId)?.booked ?? 0 : 0;
  const editingSeries = editing ? api.seriesOf(editing.seriesId) : null;
  const subSession = subFor ? api.sessions.find((s) => s.id === subFor) ?? null : null;
  const msgSession = msgFor ? api.sessions.find((s) => s.id === msgFor) ?? null : null;
  const seriesRule = seriesFor ? api.seriesOf(seriesFor.seriesId) : null;
  const offline = !api.online;
  const people = api.people;

  const elements = (
    <>
      <ClassSheet
        open={!!sheet}
        mode={sheet?.mode ?? "create"}
        scope={sheet?.scope ?? "this"}
        series={editingSeries}
        editing={editing}
        bookedCount={editingBooked}
        initial={sheet?.initial ?? blankForm(today)}
        today={today}
        instructors={api.instructors}
        instructorsLoaded={api.instructorsLoaded}
        sessions={api.sessions}
        online={api.online}
        people={people}
        onUploadCover={async (file) => {
          if (!authUserId || !api.businessId) return { ok: false, message: "Couldn't upload the photo. Try again." };
          return uploadClassCover(authUserId, api.businessId, file);
        }}
        onClose={() => setSheet(null)}
        onAddEmployee={(form) => {
          parkedDraft = form;
          setSheet(null);
          navigate("/app/business/more/employees");
        }}
        onSave={async (draft, rule) => {
          if (!sheet) return { ok: false, message: "" };
          if (sheet.mode === "edit" && sheet.editingId) {
            const r = await api.edit(sheet.editingId, sheet.scope, draft);
            if (!r.ok) return r;
            setSheet(null);
            // OURS-AN3 A8: "Changes saved. {n} clients were told." / "Changes saved."
            // Future (OURS): how many sessions took the edit.
            show(sheet.scope === "future" && r.changed > 1 ? `Changes saved to ${r.changed} sessions.` : `Changes saved.${toldTail(r.told, people)}`);
            return { ok: true };
          }
          if (rule) {
            const r = await api.createSeries(draft, rule);
            if (!r.ok) return r;
            setSheet(null);
            const first = r.created[0];
            // AN3-055 row 4 / O1-O3, with "View class" (row 5; S1 unspecified: the first session's page).
            show(seriesToast(rule, r.created.length), first ? { label: "View class", onClick: () => navigate(`/app/business/classes/${first.id}`) } : undefined);
            if (first) opts.onCreated?.(first.id);
            return { ok: true };
          }
          const r = await api.create(draft);
          if (!r.ok) return r;
          const saved = r.created;
          const carried = carryOf({ ...sheet.initial, classType: draft.classType, date: draft.date, professionalId: draft.professionalId ?? "", paymentType: draft.paymentType ?? "Cash" });
          setSheet(null);
          // OP1-154 / AN3-053 (12-hour, V6-164 card date) + "Create another" (V6-162).
          show(`Class created: ${saved.title}, ${shortDate(saved.date)}, ${time12(saved.startTime)}.`, {
            label: "Create another",
            onClick: () => {
              setToast(null);
              setSheet({ mode: "create", scope: "this", initial: blankForm(carried.date ?? todayIso(), carried) });
            },
          });
          opts.onCreated?.(saved.id);
          return { ok: true };
        }}
      />
      {/* OP1-085: Edit a repeating class, this session or all future. */}
      <ConfirmCard
        open={!!seriesFor}
        layout="stacked"
        icon={<Repeat size={20} strokeWidth={2.2} />}
        title={seriesFor ? `Edit ${seriesFor.title}` : ""}
        subtitle={seriesRule ? repeatsSentence(seriesRule, seriesRule.startTime) : undefined}
        confirmLabel="Only this session"
        secondary={{
          label: "This and all future sessions",
          onClick: () => {
            const id = seriesFor?.id;
            setSeriesFor(null);
            if (id) openEditScope(id, "future");
          },
        }}
        cancelLabel="Cancel"
        onCancel={() => setSeriesFor(null)}
        onConfirm={() => {
          const id = seriesFor?.id;
          setSeriesFor(null);
          if (id) openEditScope(id, "this");
        }}
      />
      <SubstituteSheet
        open={!!subFor}
        session={subSession}
        instructors={api.instructors}
        sessions={api.sessions}
        businessId={api.businessId}
        nameOf={api.nameOf}
        today={today}
        people={people}
        onClose={() => setSubFor(null)}
        onAssign={async (pid, note) => {
          if (!subSession) return { ok: false, message: "" };
          // OP1-072 row 6: booked members get a message with the new instructor.
          const r = await api.assign(subSession.id, pid, subSession.booked > 0);
          if (!r.ok) return r;
          // OP1-092 S1: the note goes to the substitute, in the owner's thread with them, after the assignment landed.
          const noteSent = note && authUserId ? await sendNote(pid, authUserId, note) : true;
          setSubFor(null);
          // OP1-073 T4 (12-hour day words), "{n} {people} were told." only when the notice went out.
          show(`${api.nameOf(pid)} now teaches ${subSession.title} ${dayWords(subSession.date, today)}.${toldTail(r.told, people)}${noteSent ? "" : " Couldn't send your note."}`);
          return { ok: true };
        }}
      />
      <MessageMembersSheet
        open={!!msgFor}
        session={msgSession}
        businessId={api.businessId}
        people={people}
        online={api.online}
        onClose={() => setMsgFor(null)}
        onSent={(m) => show(m)}
      />
      {/* OP1-086 / OURS-AN3 C: Cancel session. */}
      <ConfirmCard
        open={!!cancelFor}
        layout="stacked"
        tone="destructive"
        icon={<CalendarX size={20} strokeWidth={2.2} />}
        title={cancelFor ? `Cancel ${cancelFor.title} ${dayWords(cancelFor.date, today)} at ${time12(cancelFor.startTime)}?` : ""}
        subtitle={cancelFor ? cancelBody(cancelFor.booked, cancelCounts.waitlist, cancelCounts.paid, people) : undefined}
        extra={
          <div style={{ marginTop: 14, textAlign: "left" }}>
            <label htmlFor="cancel-reason" className="block" style={{ fontSize: textPx(12), fontWeight: 600, lineHeight: linePx(16), color: c.inkSoft, marginBottom: 6 }}>
              Reason (optional)
            </label>
            <input
              id="cancel-reason"
              value={cancelReason}
              maxLength={300}
              disabled={cancelBusy}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Only your team sees this"
              className="w-full focus:outline-none"
              style={{ height: 44, borderRadius: 12, background: c.soft, border: `1px solid ${c.inputBd}`, padding: "0 12px", fontSize: textPx(14), color: c.ink }}
            />
            {(cancelError || offline) && (
              <p role="alert" style={{ margin: "8px 0 0", fontSize: textPx(12.5), lineHeight: linePx(17), fontWeight: 600, color: c.dark ? "#F2A497" : "#9B2C1E", textAlign: "center" }}>
                {offline ? "You're offline. Connect to cancel this session." : cancelError}
              </p>
            )}
          </div>
        }
        confirmLabel={cancelBusy ? "Cancelling…" : cancelError ? "Try again" : "Cancel session"}
        confirmDisabled={offline}
        cancelLabel="Keep session"
        cancelVariant="outlined"
        initialFocus="cancel"
        busy={cancelBusy}
        confirmStyle={{ background: "#C0392B", color: "#FFFFFF", opacity: cancelBusy ? 0.7 : undefined }}
        onCancel={() => !cancelBusy && setCancelFor(null)}
        onConfirm={async () => {
          if (!cancelFor || cancelBusy) return;
          setCancelBusy(true);
          setCancelError(null);
          const r = await api.cancel(cancelFor.id, cancelReason, people);
          setCancelBusy(false);
          if (!r.ok) {
            setCancelError(r.message);
            return;
          }
          const gone = cancelFor;
          setCancelFor(null);
          // OP1-087 / OURS-AN3 C9; the count is everyone the server told (booked and waitlisted).
          show(cancelledToast(gone.title, dayWords(gone.date, today), r.value.membersTold, people));
        }}
      />
      {/* OURS (no frame): stop a series after this session (end_class_series). */}
      <ConfirmCard
        open={!!endFor}
        layout="stacked"
        icon={<Repeat size={20} strokeWidth={2.2} />}
        title={endFor ? `Stop repeating ${endFor.title} after ${shortDate(endFor.date)}?` : ""}
        subtitle={`Later sessions nobody has booked are removed. Booked ones stay, so you can cancel them and the ${people} are told.`}
        extra={
          endError ? (
            <p role="alert" style={{ margin: "10px 0 0", fontSize: textPx(12.5), lineHeight: linePx(17), fontWeight: 600, color: c.dark ? "#F2A497" : "#9B2C1E" }}>
              {endError}
            </p>
          ) : undefined
        }
        confirmLabel={endBusy ? "Saving…" : endError ? "Try again" : "Stop repeating"}
        confirmDisabled={offline}
        cancelLabel="Keep repeating"
        initialFocus="cancel"
        busy={endBusy}
        onCancel={() => !endBusy && setEndFor(null)}
        onConfirm={async () => {
          if (!endFor?.seriesId || endBusy) return;
          setEndBusy(true);
          setEndError(null);
          const r = await api.endSeries(endFor.seriesId, endFor.date);
          setEndBusy(false);
          if (!r.ok) {
            setEndError(r.message);
            return;
          }
          const s = endFor;
          setEndFor(null);
          const kept = r.value.keptWithBookings;
          show(
            `${s.title} stops repeating after ${dayMonth(s.date)}.${
              kept > 0 ? ` ${kept} booked ${kept === 1 ? "session stays" : "sessions stay"}: cancel ${kept === 1 ? "it" : "them"} to tell the ${people}.` : ""
            }`
          );
        }}
      />
      <ConfirmCard
        open={!!deleteFor}
        layout="stacked"
        tone="destructive"
        icon={<Trash2 size={20} strokeWidth={2.2} />}
        title={deleteFor ? `Delete ${deleteFor.title} ${dayWords(deleteFor.date, today)} at ${time12(deleteFor.startTime)}?` : ""}
        subtitle={deleteError ?? "Nobody has booked it yet. It's removed from your schedule and from Explore."}
        confirmLabel={deleteBusy ? "Deleting…" : deleteError ? "Try again" : "Delete class"}
        cancelLabel="Keep class"
        cancelVariant="outlined"
        initialFocus="cancel"
        busy={deleteBusy}
        confirmStyle={{ background: "#C0392B", color: "#FFFFFF" }}
        onCancel={() => !deleteBusy && setDeleteFor(null)}
        onConfirm={async () => {
          if (!deleteFor) return;
          setDeleteBusy(true);
          const r = await api.remove(deleteFor.id);
          setDeleteBusy(false);
          if (!r.ok) {
            setDeleteError(r.message ?? "Couldn't delete the class. Check your connection and try again.");
            return;
          }
          const gone = deleteFor;
          setDeleteFor(null);
          show(`${gone.title} ${dayWords(gone.date, today)} is deleted.`);
          opts.onDeleted?.(gone);
        }}
      />
      {toast && (
        <Toast
          key={toast.key}
          open
          variant="business"
          shape="ops"
          bottom={150}
          message={toast.message}
          action={toast.action}
          onExpire={() => setToast(null)}
        />
      )}
    </>
  );

  return { elements, openCreate, openEdit, openSubstitute, openMessage, canMessage, openDelete, openCancel, openEndSeries, show };
}

export type SessionActions = ReturnType<typeof useSessionActions>;

/** The substitute's note (OP1-089 row 4): their direct thread with the sender, opened or found. */
async function sendNote(professionalId: string, senderId: string, note: string): Promise<boolean> {
  const t = await startThread(professionalId);
  if (!t.ok) return false;
  const m = await sendMessage(t.threadId, senderId, note);
  return m.ok;
}
