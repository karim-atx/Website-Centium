import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { BottomSheet } from "../ui/BottomSheet";
import { PopupMenu } from "../ui/PopupMenu";
import { useConsoleAccess } from "../../hooks/useConsoleAccess";
import { startMemberThread } from "../../services/messaging";
import { initials } from "../professionals/typeColour";
import { fetchClassRoster } from "../../services/venues/console";
import { isMaskedLabel, methodLabel, money, splitRoster, type RosterEntry } from "../../services/venues/consoleLogic";
import { range12 } from "../../utils/time12";
import { useOnline } from "../../hooks/useOnline";
import { CARD, DIVIDER, VAvatar, VCardError, VDetailRow, VOfflineLine, VPill, VSkeletonRows, VTextTabs, type PillTone } from "./VenueKit";
import { useMarkBookingPaid } from "./useMarkBookingPaid";
import { ATTENDANCE_LABEL, attendanceOpen, canUndo, fetchAttendanceMarks, markClassAttendance, ROSTER_COPY, type Attendance } from "../../services/no-shows";
import { t, tk } from "../../i18n/core";
import { formatShortDate } from "../../utils/date";

// One class's roster (stage A4, venue_class_roster()): who is booked and who
// is waiting, a first name and a minor flag each. Gated on the class's
// business, so a class with no venue still has a roster. Restyled per
// OURS-OP1-class-roster: the OpsTabsV4 sheet (K15, header 62), a session
// line, K14 Booked / Waitlist tabs and the K9 rows of OP1 083's "Booked
// members" card (the one roster language, Q-R1). No cap: the sheet is the
// "See all".
//
// CL-08: venue_class_roster returns booking_id, so a booked row awaiting
// payment opens "Mark as paid" for a seat with front desk access
// (useMarkBookingPaid, OP1-083 K2). Waitlist rows never do.
//
// OURS-AN4-member-rosters #28 (B7 MB-02): a booked row opens the same
// PopupMenu with "Message" for a seat with `messages`: start_member_thread
// with venue_class_roster's person_id (customers count as own customers),
// then the thread (VenueMembersRoster's pattern). One menu holds both actions.
//
// Round F2 AB4 (Karim F20–F22): once the class has started, a booked row's
// menu also marks it Attended or No-show (mark_class_attendance, staff with
// schedule or front desk, as the roster itself is gated), and Undo clears the
// mark within 24 hours of it (when the mark was made is read for the desk;
// the server answers ATXS1 / ATXS2 otherwise). The mark shows as a pill
// beside the payment one. A desk check-in that day marks attended by itself.
const ATT_TONE: Record<Attendance, PillTone> = { attended: "good", no_show: "high" };

const PAY: Record<string, { label: string; tone: PillTone }> = {
  paid: { label: tk("Paid"), tone: "good" },
  pending: { label: tk("Awaiting payment"), tone: "caution" },
  refunded: { label: tk("Refunded"), tone: "soft" },
};

export interface RosterSession {
  date: string;
  startTime: string;
  endTime: string;
  maxCapacity?: number | null;
}

/** "Mon, Oct 12" from an ISO date (no time zone shift). */
export function weekdayDayMonth(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return formatShortDate(new Date(y, m - 1, d), { weekday: "short", month: "short", day: "numeric" });
}

/** "Oct 2" from a timestamp, on this device's calendar. */
const dayMonth = (ts: string) => formatShortDate(new Date(ts), { month: "short", day: "numeric" });

export function ClassRosterSheet({
  classId,
  title,
  onClose,
  session,
  onMarkedPaid,
}: {
  classId: string | null;
  title: string;
  onClose: () => void;
  session?: RosterSession | null;
  /** CL-08: a booking was marked paid (the caller toasts and reloads its own copy). */
  onMarkedPaid?: () => void;
}) {
  const online = useOnline();
  const [state, setState] = useState<{ classId: string; entries: RosterEntry[] } | null>(null);
  const [error, setError] = useState<{ classId: string; message: string } | null>(null);
  const [tab, setTab] = useState<"booked" | "waitlist">("booked");
  const [tick, setTick] = useState(0);
  const pay = useMarkBookingPaid({
    onDone: () => {
      setTick((t) => t + 1);
      onMarkedPaid?.();
    },
  });
  const navigate = useNavigate();
  const access = useConsoleAccess();
  const canMessage = access.ready && access.meets("messages") && !!access.businessId;
  const [menu, setMenu] = useState<{ entry: RosterEntry; anchor: HTMLElement } | null>(null);
  const [msgBusy, setMsgBusy] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);
  const messageable = (e: RosterEntry) => canMessage && e.kind === "booked" && !!e.personId;
  // AB4: staff with schedule or front desk mark attendance once the class has started.
  const canMark = access.ready && (access.meets("front_desk") || access.meets("schedule"));
  const [marks, setMarks] = useState<Map<string, string | null>>(new Map());
  const [attBusy, setAttBusy] = useState(false);
  const [attNote, setAttNote] = useState<{ text: string; error: boolean } | null>(null);
  const markable = (e: RosterEntry) => canMark && e.kind === "booked" && !!e.bookingId && attendanceOpen(session);
  const undoable = (e: RosterEntry) => markable(e) && !!e.attendance && canUndo(e.bookingId ? marks.get(e.bookingId) : null);
  const mark = async (e: RosterEntry, a: Attendance | null) => {
    setMenu(null);
    if (attBusy || !e.bookingId) return;
    setAttBusy(true);
    setAttNote(null);
    const r = await markClassAttendance(e.bookingId, a);
    setAttBusy(false);
    if (!r.ok) return setAttNote({ text: r.message, error: true });
    const id = e.bookingId;
    setMarks((m) => new Map(m).set(id, a ? new Date().toISOString() : null));
    setAttNote({ text: t(a === "attended" ? ROSTER_COPY.markedAttended : a === "no_show" ? ROSTER_COPY.markedNoShow : ROSTER_COPY.undone), error: false });
    setTick((x) => x + 1);
  };
  const message = async (e: RosterEntry) => {
    setMenu(null);
    if (msgBusy || !access.businessId || !e.personId) return;
    setMsgBusy(true);
    setMsgError(null);
    const r = await startMemberThread(access.businessId, e.personId);
    setMsgBusy(false);
    if (!r.ok) return setMsgError(r.message);
    navigate("/app/messages", { state: { threadId: r.threadId } });
  };

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
      // AB4: when each mark was made, for Undo's 24 hours (the desk can read it).
      const marked = r.value.flatMap((e) => (e.attendance && e.bookingId ? [e.bookingId] : []));
      if (marked.length > 0) {
        const m = await fetchAttendanceMarks(marked);
        if (!cancelled) setMarks((prev) => new Map([...prev, ...m]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [classId, tick]);

  // A new class opens on Booked.
  const [shownFor, setShownFor] = useState<string | null>(classId);
  if (shownFor !== classId) {
    setShownFor(classId);
    setTab("booked");
  }

  const entries = state && state.classId === classId ? state.entries : null;
  const failed = error && error.classId === classId ? error.message : null;
  const { booked, waitlist } = splitRoster(entries ?? []);
  const view = waitlist.length === 0 ? "booked" : tab;
  const list = view === "booked" ? booked : waitlist;

  const row = (e: RosterEntry, i: number) => {
    const pay0 = e.paymentStatus ? PAY[e.paymentStatus] : null;
    const tag = pay0 ? { ...pay0, label: t(pay0.label) } : null;
    const payable = pay.can(e);
    const actionable = payable || messageable(e) || markable(e);
    const att = e.attendance ? { label: t(ATTENDANCE_LABEL[e.attendance]), tone: ATT_TONE[e.attendance] } : null;
    const price = e.priceAgreed !== null ? (e.priceAgreed > 0 ? money(e.priceAgreed) : t("Free")) : null;
    const sub =
      e.kind === "booked"
        ? [e.at ? t("Booked {date}", { date: dayMonth(e.at) }) : null, price, methodLabel(e.paymentMethod) ? t(methodLabel(e.paymentMethod)) : null].filter(Boolean).join(" · ")
        : t("Waiting, number {n} in line", { n: e.waitlistPosition ?? "–" });
    return (
      <VDetailRow
        key={`${e.kind}-${i}`}
        avatar={e.kind === "waitlist" ? <VAvatar number={e.waitlistPosition ?? i + 1} /> : isMaskedLabel(e.label) ? <VAvatar masked /> : <VAvatar initial={initials(e.label)} />}
        title={e.label}
        titleExtra={e.isMinor && <VPill tone="pale" label={t("Under 18")} />}
        sub={sub}
        right={
          e.kind === "booked" && (tag || att) ? (
            <span className="flex items-center gap-[6px]">
              {att && <VPill tone={att.tone} label={att.label} />}
              {tag && <VPill tone={tag.tone} label={tag.label} />}
            </span>
          ) : undefined
        }
        onClick={
          actionable
            ? (ev) => {
                setMsgError(null);
                setMenu({ entry: e, anchor: ev.currentTarget });
              }
            : undefined
        }
        ariaLabel={actionable ? `${e.label}${att ? `${t(", ")}${att.label}` : ""}${tag ? `${t(", ")}${tag.label}` : ""}. ${t("Actions")}` : undefined}
        disabled={actionable ? pay.busy || msgBusy || attBusy : undefined}
      />
    );
  };

  return (
    <BottomSheet
      open={!!classId}
      onClose={onClose}
      title={title || t("Class roster")}
      tone="business"
      headerHeight={62}
      bodyPadding={{ top: 18, right: 18, bottom: 30, left: 18 }}
    >
      <div className="space-y-[14px]">
        {session && (
          <div className="relative rounded-[16px] bg-cream-soft overflow-hidden" style={{ paddingBlock: "12px", paddingInline: "18px 14px" }}>
            <span aria-hidden className="absolute start-0 top-0 bottom-0 w-[4px] bg-primary-fill" />
            <p className="text-[13.5px] font-extrabold text-charcoal">
              {weekdayDayMonth(session.date)} · {range12(session.startTime, session.endTime)}
            </p>
            {entries && (
              <p className="text-[12px] text-charcoal-soft mt-[2px]">
                {session.maxCapacity ? t("{booked} of {cap} booked", { booked: booked.length, cap: session.maxCapacity }) : t("{n} booked", { n: booked.length })} · {t("{n} waiting", { n: waitlist.length })}
              </p>
            )}
          </div>
        )}
        {!online && <VOfflineLine />}
        {entries && waitlist.length > 0 && (
          <VTextTabs
            label={t("Roster")}
            value={view}
            onChange={setTab}
            tabs={[
              { value: "booked", label: t("Booked ({n})", { n: booked.length }) },
              { value: "waitlist", label: t("Waitlist ({n})", { n: waitlist.length }) },
            ]}
          />
        )}
        <div className={`${CARD} rounded-[22px] overflow-hidden [&>*:first-child]:border-t-0`}>
          {!entries && !failed && <VSkeletonRows rows={4} pill />}
          {failed && !entries && <VCardError title={t("Couldn't load this roster")} message={failed} onRetry={() => setTick((t) => t + 1)} />}
          {entries && waitlist.length === 0 && (
            <p className="text-[14px] font-extrabold text-charcoal" style={{ padding: "14px 16px 6px" }}>
              {t("Booked ({n})", { n: booked.length })}
            </p>
          )}
          {entries && list.map(row)}
          {entries && view === "booked" && booked.length === 0 && <VDetailRow avatar={<VAvatar icon={Users} />} title={t("Nobody has booked yet.")} />}
          {(pay.error || msgError) && (
            <p className={`border-t ${DIVIDER} text-[11.5px] font-bold leading-[16px] text-status-high`} role="alert" style={{ padding: "10px 16px" }}>
              {pay.error ?? msgError}
            </p>
          )}
          {attNote && !pay.error && !msgError && (
            <p
              className={`border-t ${DIVIDER} text-[11.5px] font-bold leading-[16px] ${attNote.error ? "text-status-high" : "text-charcoal-faint"}`}
              role={attNote.error ? "alert" : "status"}
              style={{ padding: "10px 16px" }}
            >
              {attNote.text}
            </p>
          )}
        </div>
      </div>
      <PopupMenu
        open={!!menu}
        onClose={() => setMenu(null)}
        anchor={menu?.anchor ?? null}
        variant="field"
        width={204}
        heading={menu?.entry.label}
        options={[
          ...(menu && pay.can(menu.entry)
            ? [
                { value: "paid", label: t("Mark as paid"), disabled: !online },
                { value: "ref", label: t("Add a reference"), disabled: !online },
              ]
            : []),
          ...(menu && markable(menu.entry)
            ? [
                ...(menu.entry.attendance !== "attended" ? [{ value: "attended", label: t(ROSTER_COPY.markAttended), disabled: !online }] : []),
                ...(menu.entry.attendance !== "no_show" ? [{ value: "no_show", label: t(ROSTER_COPY.markNoShow), disabled: !online }] : []),
                ...(undoable(menu.entry) ? [{ value: "undo", label: t(ROSTER_COPY.undo), disabled: !online }] : []),
              ]
            : []),
          ...(menu && messageable(menu.entry) ? [{ value: "message", label: t("Message"), disabled: !online }] : []),
        ]}
        onSelect={(v) => {
          if (!menu) return;
          const e = menu.entry;
          setMenu(null);
          if (v === "attended" || v === "no_show") return void mark(e, v);
          if (v === "undo") return void mark(e, null);
          if (v === "ref") return pay.openReference(e);
          void (v === "message" ? message(e) : pay.run(e));
        }}
      />
      {pay.element}
    </BottomSheet>
  );
}
