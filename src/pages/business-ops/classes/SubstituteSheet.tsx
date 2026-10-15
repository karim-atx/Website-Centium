import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { time12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { fetchInstructorAvailability, type Instructor } from "../../../services/business-classes";
import { instructorsFreeFor, type FreeInstructor } from "../../../services/business-classes/schedule";
import { useOps } from "./opsTheme";
import { Avatar } from "./ClassSheet";
import { overlaps, running, weekdayShort, type Session, type SessionLite } from "./scheduleModel";

// Request a substitute (OP1-089 … 093). Assigning names someone else on THIS
// session only, through assign_class_instructor() (B9 CL-04): the server
// re-checks that the person is on the team and free in ANY business (ATXD9),
// and tells the booked members ("New instructor", never naming anyone).
//
// WHO IS FREE is instructors_free_for() (B9): is_busy is a plain yes / no
// across every business, never where; marked_unavailable is a date they took
// off; within_availability is false both outside their hours and when they
// set none, so their B6 availability rows (readable by the owner) tell the
// two apart: none set reads "No availability set" and stays choosable. A busy
// teammate on one of THIS business's sessions is named from the schedule
// ("Teaching {class} at {time}", OP1-090); elsewhere it's "Busy at that time"
// (OURS-AN5 A12). The note to the substitute (OP1-072 row 5, OP1-089 row 4,
// OP1-092 row 2) goes to the substitute in the owner's direct thread with
// them (B7 messaging) once the assignment has landed; see SessionActions.

export function SubstituteSheet({
  open,
  session,
  instructors,
  sessions,
  businessId,
  nameOf,
  today,
  people,
  onClose,
  onAssign,
}: {
  open: boolean;
  session: Session | null;
  instructors: Instructor[];
  sessions: SessionLite[];
  businessId: string | null;
  nameOf: (id: string | null) => string;
  today: string;
  people: "clients" | "members";
  onClose: () => void;
  /** The note is trimmed; empty when none was written. */
  onAssign: (professionalId: string, note: string) => Promise<{ ok: true } | { ok: false; message: string; busy?: boolean }>;
}) {
  const c = useOps();
  const [pick, setPick] = useState<string>("");
  const [note, setNote] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [free, setFree] = useState<FreeInstructor[] | null>(null);
  const [hasHours, setHasHours] = useState<Set<string> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [pickerEl, setPickerEl] = useState<HTMLButtonElement | null>(null);
  const [groupEl, setGroupEl] = useState<HTMLDivElement | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPick("");
      setNote("");
      setError(null);
      setFree(null);
      setLoadFailed(false);
    }
  }

  const sessionId = session?.id ?? null;
  useEffect(() => {
    if (!open || !sessionId) return;
    let alive = true;
    void Promise.all([instructorsFreeFor(sessionId), businessId ? fetchInstructorAvailability(businessId) : Promise.resolve({ ok: false as const })]).then(([r, a]) => {
      if (!alive) return;
      if (!r.ok) {
        setLoadFailed(true);
        return;
      }
      setLoadFailed(false);
      setFree(r.value);
      setHasHours(a.ok ? new Set(a.value.windows.map((w) => w.professionalId)) : null);
    });
    return () => {
      alive = false;
    };
  }, [open, sessionId, businessId, tick]);

  if (!session) return null;

  const live = running(sessions as (SessionLite & { cancelled?: boolean })[]);
  const here = (id: string): SessionLite | null => live.find((s) => s.id !== session.id && s.professionalId === id && overlaps(s, session)) ?? null;
  const usualType = (id: string) => {
    const counts = new Map<string, number>();
    for (const s of live) if (s.professionalId === id && s.classType) counts.set(s.classType, (counts.get(s.classType) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  const rows = (free ?? [])
    .filter((f) => !f.isCurrent)
    .map((f) => {
      const clash = f.isBusy ? here(f.professionalId) : null;
      const noHours = !f.withinAvailability && hasHours !== null && !hasHours.has(f.professionalId);
      const outside = !f.withinAvailability && !noHours;
      const ok = !f.isBusy && !f.markedUnavailable && !outside;
      const type = usualType(f.professionalId);
      const sub = f.isBusy
        ? clash
          ? `Teaching ${clash.title} at ${time12(clash.startTime)}`
          : "Busy at that time"
        : f.markedUnavailable || outside
          ? "Not available then"
          : noHours
            ? "No availability set"
            : type
              ? `Free · teaches ${type}`
              : "Free";
      return { f, free: ok, sub };
    })
    // Free first, then busy (OP1-090 row 6); by name inside each.
    .sort((a, b) => Number(b.free) - Number(a.free) || a.f.firstName.localeCompare(b.f.firstName));

  const options: PopupMenuOption<string>[] = rows.map((r) => ({
    value: r.f.professionalId,
    label: r.f.firstName,
    note: r.sub,
    disabled: !r.free,
    icon: <Avatar c={c} name={r.f.firstName} size={28} />,
  }));

  // OP1-090 O2: everyone busy → one line under the heading instead of the rows.
  const nobodyFree = rows.length > 0 && rows.every((r) => !r.free);
  const dayWord = session.date === today ? "Today" : weekdayShort(session.date);
  const chosen = pick ? rows.find((r) => r.f.professionalId === pick)?.f.firstName || nameOf(pick) : "";
  const teamSize = instructors.filter((i) => i.professionalId !== session.professionalId).length;

  const assign = async () => {
    if (!pick || busy) return;
    setBusy(true);
    setError(null);
    const r = await onAssign(pick, note.trim());
    setBusy(false);
    if (!r.ok) {
      // OP1-092 O3: no longer free (the server's re-check, ATXD9) reopens the list.
      if (r.busy) {
        setError(`${chosen} is no longer free at ${time12(session.startTime)}. Choose someone else.`);
        setPick("");
        setTick((t) => t + 1);
        setMenuOpen(true);
      } else setError(r.message);
    }
  };

  const fieldLabel = (t: string) => (
    <p className="whitespace-nowrap" style={{ margin: "0 0 6px", fontSize: textPx(12), fontWeight: 700, color: c.inkSoft }}>
      {t}
    </p>
  );

  return (
    <>
      <BottomSheet
        open={open}
        onClose={() => !busy && onClose()}
        title="Request a substitute"
        tone="business"
        headerHeight={62}
        animateExit
        bodyPadding={{ top: 18, right: 18, bottom: 30, left: 18 }}
      >
        <div className="flex items-center" style={{ gap: 12, background: c.soft, borderRadius: 16, padding: "12px 14px", marginBottom: 14 }}>
          <span aria-hidden className="self-stretch" style={{ width: 4, borderRadius: 999, background: c.primary }} />
          <div className="flex-1 min-w-0">
            <p style={{ margin: 0, fontSize: textPx(13.5), fontWeight: 800, color: c.ink }}>
              {session.title} · {dayWord} {time12(session.startTime)}
            </p>
            <p style={{ margin: 0, fontSize: textPx(12), color: c.inkSoft }}>
              {session.professionalId ? nameOf(session.professionalId) : "No instructor yet"} · {session.booked} booked
            </p>
          </div>
        </div>

        <div ref={setGroupEl} style={{ marginBottom: 14 }}>
          {fieldLabel("Who covers it?")}
          {loadFailed ? (
            <p style={{ margin: 0, minHeight: 48, display: "flex", alignItems: "center", gap: 10, fontSize: textPx(12.5), fontWeight: 600, color: c.high }}>
              Couldn't check who's free.
              <button type="button" onClick={() => setTick((t) => t + 1)} className="tap" style={{ minHeight: 44, fontSize: textPx(12.5), fontWeight: 800, color: c.pDark }}>
                Retry
              </button>
            </p>
          ) : !free ? (
            <p style={{ margin: 0, minHeight: 48, display: "flex", alignItems: "center", fontSize: textPx(14), fontWeight: 700, color: c.faint }}>Finding who's free…</p>
          ) : rows.length === 0 && teamSize === 0 ? (
            <p style={{ margin: 0, fontSize: textPx(12), lineHeight: linePx(17), color: c.inkSoft }}>Nobody else is on your team yet. Invite an instructor in Team and access.</p>
          ) : (
            <button
              ref={setPickerEl}
              type="button"
              aria-haspopup="listbox"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(true)}
              className="tap w-full flex items-center text-left"
              style={{
                minHeight: 48,
                borderRadius: 14,
                background: c.input,
                border: `1px solid ${c.border}`,
                padding: "0 14px",
                gap: 8,
                fontSize: textPx(14),
                lineHeight: linePx(20),
                boxShadow: menuOpen ? `0 0 0 2px ${c.primary}` : "none",
              }}
            >
              <span className="flex-1 min-w-0 truncate" style={{ fontWeight: 700, color: chosen ? c.ink : c.faint }}>
                {chosen || "Choose an instructor"}
              </span>
              <ChevronDown size={16} style={{ color: c.faint }} />
            </button>
          )}
        </div>

        {/* OP1-089 row 4 / OP1-092 row 2 (OpsTabsV4 l.614 F(): h 84, align top, padding 12 14; label 12/700 inkSoft mb 6; value 14/600/20 ink; placeholder faint 500). */}
        <div style={{ marginBottom: 14 }}>
          <label htmlFor="sub-note" className="block whitespace-nowrap" style={{ margin: "0 0 6px", fontSize: textPx(12), fontWeight: 700, color: c.inkSoft }}>
            Note for them (optional)
          </label>
          <style>{`.sub-note::placeholder { color: ${c.faint}; font-weight: 500; opacity: 1; }`}</style>
          <textarea
            id="sub-note"
            value={note}
            maxLength={1000}
            disabled={busy}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Anything they should know"
            className="sub-note w-full block resize-none focus:outline-none"
            style={{
              minHeight: 84,
              borderRadius: 14,
              background: c.input,
              border: `1px solid ${c.border}`,
              padding: "12px 14px",
              fontSize: textPx(14),
              lineHeight: linePx(20),
              fontWeight: 600,
              color: c.ink,
              caretColor: c.pDark,
            }}
          />
        </div>

        {/* OP1-072 row 6: the booked are told (assign_class_instructor p_tell_members). */}
        {session.booked > 0 && (
          <p style={{ margin: "0 0 14px", fontSize: textPx(12), lineHeight: linePx(17), color: c.inkSoft }}>
            Booked {people} get a message with the new instructor.
          </p>
        )}

        <button
          type="button"
          onClick={() => void assign()}
          disabled={!pick || busy}
          aria-disabled={!pick || busy || undefined}
          className="tap w-full flex items-center justify-center"
          style={{ minHeight: 52, borderRadius: 16, background: c.fill, color: c.onFill, fontSize: textPx(14.5), fontWeight: 800, opacity: !pick || busy ? 0.45 : 1 }}
        >
          {busy ? "Assigning…" : chosen ? `Assign ${chosen}` : "Assign"}
        </button>
        {error && (
          <p role="alert" style={{ margin: "8px 0 0", fontSize: textPx(11.5), fontWeight: 700, color: c.high }}>
            {error}
          </p>
        )}
      </BottomSheet>
      <PopupMenu
        open={menuOpen && !!free}
        onClose={() => setMenuOpen(false)}
        anchor={pickerEl}
        matchWidth={groupEl}
        options={options}
        selected={pick || null}
        onSelect={(v) => {
          setPick(v);
          setError(null);
          setMenuOpen(false);
        }}
        heading={`Free at ${time12(session.startTime)}`}
        emptyNote={
          nobodyFree ? (
            <p style={{ margin: "0 4px 4px", fontSize: textPx(12), lineHeight: linePx(17), color: c.inkSoft }}>
              Nobody is free at {time12(session.startTime)}. Message your team or cancel the session.
            </p>
          ) : undefined
        }
        variant="field"
        backdrop={false}
      />
    </>
  );
}
