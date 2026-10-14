import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { ConfirmCard } from "../../../components/ui/ConfirmCard";
import { Toast } from "../../../components/ui/Toast";
import { time12 } from "../../../utils/time12";
import { ClassSheet } from "./ClassSheet";
import { blankForm, carryOf, formOf, type ClassForm } from "./classForm";
import { SubstituteSheet } from "./SubstituteSheet";
import { dayWords, shortDate, todayIso, type Session } from "./scheduleModel";
import type { ScheduleApi } from "./useSchedule";

// The actions a session offers wherever it is shown (Schedule row menu,
// session page tiles, Needs attention): Create / Edit (the class sheet),
// Request a substitute, Delete. One place, so every entry behaves the same.
//
// CANCEL SESSION (V6-55): cancel_class_session is B9 and not on the stack, so
// a session with bookings offers no cancel at all (never the silent delete,
// OURS-AN3 C12); a session nobody has booked can be deleted behind a confirm.

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

export function useSessionActions(api: ScheduleApi, opts: { onCreated?: (id: string) => void; onDeleted?: (s: Session) => void } = {}) {
  const navigate = useNavigate();
  const today = todayIso();
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; initial: ClassForm; editingId?: string } | null>(null);
  const [subFor, setSubFor] = useState<string | null>(null);
  const [deleteFor, setDeleteFor] = useState<Session | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((message: string, action?: ToastState["action"]) => setToast({ message, action, key: Date.now() }), []);

  const openCreate = useCallback((initial?: ClassForm) => setSheet({ mode: "create", initial: initial ?? blankForm(todayIso()) }), []);
  const openEdit = useCallback(
    (id: string) => {
      const row = api.classes.find((c) => c.id === id);
      if (row) setSheet({ mode: "edit", initial: formOf(row), editingId: id });
    },
    [api.classes]
  );
  const openSubstitute = useCallback((id: string) => setSubFor(id), []);
  const openDelete = useCallback(
    (id: string) => {
      const s = api.sessions.find((x) => x.id === id);
      if (s && s.booked === 0) {
        setDeleteError(null);
        setDeleteFor(s);
      }
    },
    [api.sessions]
  );

  const editing = sheet?.editingId ? api.classes.find((c) => c.id === sheet.editingId) ?? null : null;
  const editingBooked = sheet?.editingId ? api.sessions.find((s) => s.id === sheet.editingId)?.booked ?? 0 : 0;
  const subSession = subFor ? api.sessions.find((s) => s.id === subFor) ?? null : null;

  const elements = (
    <>
      <ClassSheet
        open={!!sheet}
        mode={sheet?.mode ?? "create"}
        editing={editing}
        bookedCount={editingBooked}
        initial={sheet?.initial ?? blankForm(today)}
        today={today}
        instructors={api.instructors}
        instructorsLoaded={api.instructorsLoaded}
        sessions={api.sessions}
        online={api.online}
        people={api.people as "clients" | "members"}
        onClose={() => setSheet(null)}
        onAddEmployee={(form) => {
          parkedDraft = form;
          setSheet(null);
          navigate("/app/business/more/employees");
        }}
        onSave={async (draft) => {
          if (!sheet) return { ok: false, message: "" };
          if (sheet.mode === "edit" && sheet.editingId) {
            const r = await api.update(sheet.editingId, draft);
            if (!r.ok) return r;
            setSheet(null);
            show("Changes saved.");
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
              setSheet({ mode: "create", initial: blankForm(carried.date ?? todayIso(), carried) });
            },
          });
          opts.onCreated?.(saved.id);
          return { ok: true };
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
        onClose={() => setSubFor(null)}
        onAssign={async (pid) => {
          if (!subSession) return { ok: false, message: "" };
          const r = await api.assign(subSession.id, pid);
          if (!r.ok) return r;
          setSubFor(null);
          // OP1-093 without "{n} members were told" until B7 can tell them.
          show(`${api.nameOf(pid)} now teaches ${subSession.title} ${dayWords(subSession.date, today)}.`);
          return { ok: true };
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

  return { elements, openCreate, openEdit, openSubstitute, openDelete, show };
}

export type SessionActions = ReturnType<typeof useSessionActions>;
