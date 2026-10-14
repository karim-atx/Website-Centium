import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { BottomSheet } from "../../../components/ui/BottomSheet";
import { PopupMenu, type PopupMenuOption } from "../../../components/ui/PopupMenu";
import { time12 } from "../../../utils/time12";
import { linePx, textPx } from "../../../theme/textSize";
import { fetchInstructorAvailability, type AvailabilityData, type Instructor } from "../../../services/business-classes";
import { useOps } from "./opsTheme";
import { Avatar } from "./ClassSheet";
import { overlaps, weekdayShort, type Session, type SessionLite } from "./scheduleModel";

// Request a substitute (OP1-089 … 093). Assigning names someone else on THIS
// session only (business_classes.professional_id; the guard trigger refuses
// anyone not on the team). Who is free is worked out here until
// instructors_free_for() (B9): busy = another session of this business at an
// overlapping time, or an unavailable date, or availability rows that do not
// cover the slot (B6 instructor_availability). Telling the booked members
// and the substitute needs business→member messages (B7): until then the
// note line is left out and the toast says only who now teaches.

export function SubstituteSheet({
  open,
  session,
  instructors,
  sessions,
  businessId,
  nameOf,
  today,
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
  onClose: () => void;
  onAssign: (professionalId: string) => Promise<{ ok: true } | { ok: false; message: string }>;
}) {
  const c = useOps();
  const [pick, setPick] = useState<string>("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [avail, setAvail] = useState<AvailabilityData | null>(null);
  const [availLoaded, setAvailLoaded] = useState(false);
  const [pickerEl, setPickerEl] = useState<HTMLButtonElement | null>(null);
  const [groupEl, setGroupEl] = useState<HTMLDivElement | null>(null);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setPick("");
      setError(null);
      setAvailLoaded(false);
    }
  }

  useEffect(() => {
    if (!open || !businessId) return;
    let alive = true;
    void fetchInstructorAvailability(businessId).then((r) => {
      if (!alive) return;
      setAvail(r.ok ? r.value : null);
      setAvailLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [open, businessId]);

  if (!session) return null;

  const others = instructors.filter((i) => i.professionalId !== session.professionalId);
  const busyWith = (id: string): SessionLite | null =>
    sessions.find((s) => s.id !== session.id && s.professionalId === id && overlaps(s, session)) ?? null;
  const unavailable = (id: string): boolean => {
    if (!avail) return false;
    if (avail.offDates.some((d) => d.professionalId === id && d.date === session.date)) return true;
    const rows = avail.windows.filter((w) => w.professionalId === id);
    if (rows.length === 0) return false; // no hours set yet: not counted against them
    const wd = ((new Date(`${session.date}T00:00:00`).getDay() + 6) % 7) + 1; // ISO weekday
    return !rows.some((w) => w.weekday === wd && w.startsAt <= session.startTime && w.endsAt >= session.endTime);
  };
  const usualType = (id: string) => {
    const counts = new Map<string, number>();
    for (const s of sessions) if (s.professionalId === id && s.classType) counts.set(s.classType, (counts.get(s.classType) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  const rows = others
    .map((i) => {
      const clash = busyWith(i.professionalId);
      const off = !clash && unavailable(i.professionalId);
      const type = usualType(i.professionalId);
      return {
        i,
        free: !clash && !off,
        sub: clash ? `Teaching ${clash.title} at ${time12(clash.startTime)}` : off ? "Not available then" : type ? `Free · teaches ${type}` : "Free",
      };
    })
    // Free first, then busy (OP1-090 row 6); by name inside each.
    .sort((a, b) => Number(b.free) - Number(a.free) || a.i.firstName.localeCompare(b.i.firstName));

  const options: PopupMenuOption<string>[] = rows.map((r) => ({
    value: r.i.professionalId,
    label: r.i.firstName,
    note: r.sub,
    disabled: !r.free,
    icon: <Avatar c={c} name={r.i.firstName} size={28} />,
  }));

  const dayWord = session.date === today ? "Today" : weekdayShort(session.date);
  const chosen = pick ? nameOf(pick) : "";

  const assign = async () => {
    if (!pick || busy) return;
    // Still free? (OP1-092 O3)
    if (busyWith(pick)) {
      setError(`${chosen} is no longer free at ${time12(session.startTime)}. Choose someone else.`);
      setMenuOpen(true);
      return;
    }
    setBusy(true);
    setError(null);
    const r = await onAssign(pick);
    setBusy(false);
    if (!r.ok) setError("Couldn't assign. Check your connection and try again.");
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
          {!availLoaded ? (
            <p style={{ margin: 0, minHeight: 48, display: "flex", alignItems: "center", fontSize: textPx(14), fontWeight: 700, color: c.faint }}>Finding who's free…</p>
          ) : others.length === 0 ? (
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
        open={menuOpen}
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
        variant="field"
        backdrop={false}
      />
    </>
  );
}

