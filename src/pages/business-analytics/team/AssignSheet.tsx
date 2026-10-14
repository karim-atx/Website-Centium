import { useEffect, useMemo, useState } from "react";
import { Check, UserPlus, UserX, WifiOff } from "lucide-react";
import { useOnline } from "../../../hooks/useOnline";
import { range12, time12 } from "../../../utils/time12";
import { availabilityFor, overlaps } from "./model";
import { Avatar, Buttons, ErrLine, LeadRow, RowsCard, Sheet, Strip } from "./parts";
import { assignInstructor, loadClasses, loadOffOn, type ClassRow, type TeamPerson } from "./teamData";
import { dayDate, weekday } from "./fmt";
import type { Vocab } from "./vocab";

// AN5-024 (option list), AN5-026 (selected), AN5-027 (confirm), AN5-029
// (cancel: closes, nothing saved), AN5-030 (nobody free), AN5-035 (Fix 3a
// reassign: saves straight away), OURS availability A1 (off that day, from
// B6 instructor_unavailable_dates), A2, A6, A9, A10, A11.
//
// Saving writes business_classes.professional_id (owner UPDATE grant) after a
// fresh read of that day's sessions, so a person booked meanwhile is refused
// (A11). The server-side check and the instructor's notice are B9.

type Step = "list" | "confirm" | "failed";

export function AssignSheet({
  open,
  session,
  mode,
  businessId,
  people,
  classes,
  vocab,
  onClose,
  onBack,
  onDone,
  onInvite,
  onMove,
}: {
  open: boolean;
  session: ClassRow | null;
  mode: "assign" | "reassign";
  businessId: string | null;
  people: TeamPerson[];
  classes: ClassRow[];
  vocab: Vocab;
  onClose: () => void;
  onBack?: () => void;
  onDone: (status: string) => void;
  onInvite: () => void;
  onMove: (s: ClassRow) => void;
}) {
  const online = useOnline();
  const [step, setStep] = useState<Step>("list");
  const [pick, setPick] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [justBooked, setJustBooked] = useState<string | null>(null);
  const [extraBusy, setExtraBusy] = useState<ClassRow[]>([]);
  const [offRead, setOffRead] = useState<{ date: string; ids: ReadonlySet<string> } | null>(null);

  useEffect(() => {
    if (!open) return;
    setStep("list");
    setPick(null);
    setBusy(false);
    setJustBooked(null);
    setExtraBusy([]);
  }, [open, session?.id]);

  // A1: who is off that day. The list shows at once; off rows join when read.
  const sessionDate = session?.date ?? null;
  useEffect(() => {
    if (!open || !businessId || !sessionDate) return;
    let cancelled = false;
    void loadOffOn(businessId, sessionDate).then((ids) => !cancelled && setOffRead({ date: sessionDate, ids }));
    return () => {
      cancelled = true;
    };
  }, [open, businessId, sessionDate]);

  const offToday = useMemo<ReadonlySet<string>>(() => (offRead && offRead.date === sessionDate ? offRead.ids : new Set()), [offRead, sessionDate]);
  const rows = useMemo(
    () => (session ? availabilityFor(session, people, [...classes, ...extraBusy], mode === "reassign" ? session.professionalId : null, offToday) : []),
    [session, people, classes, extraBusy, mode, offToday]
  );
  const pending = people.filter((p) => !p.acceptedAt);
  if (!session) return null;

  const at = time12(session.start);
  const free = rows.filter((r) => !r.busyWith && !r.off);
  const anyOff = rows.some((r) => r.off);
  const chosen = people.find((p) => p.id === pick) ?? null;
  const accepted = people.filter((p) => p.acceptedAt && (mode === "assign" || p.id !== session.professionalId));
  const when = `${dayDate(session.date)}, ${range12(session.start, session.end)}`;

  const save = async () => {
    if (!chosen || !businessId) return;
    setBusy(true);
    // A11: re-read that day; someone may have been booked meanwhile.
    const fresh = await loadClasses(businessId, session.date, session.date);
    if (!fresh.ok) {
      setBusy(false);
      setStep("failed");
      return;
    }
    const clash = fresh.value.find(
      (c) => c.id !== session.id && c.professionalId === chosen.id && overlaps(c.start, c.end, session.start, session.end)
    );
    if (clash) {
      setBusy(false);
      setExtraBusy((x) => [...x, clash]);
      setJustBooked(chosen.name);
      setPick(null);
      setStep("list");
      return;
    }
    const ok = await assignInstructor(session.id, chosen.id);
    setBusy(false);
    if (!ok) {
      setStep("failed");
      return;
    }
    onDone(`${chosen.name} now runs ${session.title} on ${dayDate(session.date)}.`);
  };

  // A9 · nobody on the team at all.
  if (accepted.length === 0 && mode === "assign") {
    return (
      <Sheet open={open} onClose={onClose} title={`You have no ${vocab.plural} yet`}>
        <LeadRow icon={UserPlus}>Add a professional to your team, then assign them to classes.</LeadRow>
        <Buttons primary={{ label: "Add an employee", onClick: onInvite }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "failed" && chosen) {
    return (
      <Sheet open={open} onClose={onClose} title={`Couldn't assign ${chosen.name}`}>
        <LeadRow icon={WifiOff} tone="high">
          Check your connection and try again. Nothing was changed.
        </LeadRow>
        <Buttons alt={{ label: "Cancel", onClick: onClose }} primary={{ label: "Try again", onClick: () => void save(), busy }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "confirm" && chosen) {
    return (
      <Sheet open={open} onClose={onClose} title={`Assign ${chosen.name} to ${session.title}?`}>
        <LeadRow>The class shows them as the {vocab.singular}.</LeadRow>
        <RowsCard
          rows={[
            { l: "Class", v: session.title },
            { l: "When", v: when },
            { l: "Booked", v: `${session.booked} of ${session.capacity}` },
            { l: vocab.singular === "instructor" ? "Instructor" : "Staff", v: chosen.name, bold: true },
          ]}
        />
        <Buttons
          alt={{ label: "Back", onClick: () => setStep("list"), disabled: busy }}
          primary={{ label: busy ? "Assigning…" : "Assign", onClick: () => void save(), busy, disabled: !online }}
          marginTop={16}
        />
      </Sheet>
    );
  }

  // AN5-030 / A10 · nobody (else) is free.
  if (free.length === 0 && !justBooked) {
    const reassign = mode === "reassign";
    return (
      <Sheet open={open} onClose={onClose} title={reassign ? `Nobody else is free at ${at}` : `No ${vocab.plural} are free at ${at}`}>
        <LeadRow icon={UserX} tone="high">
          {reassign
            ? anyOff
              ? "Everyone else on your team is teaching or off at that time."
              : "Everyone else on your team is teaching at that time."
            : anyOff
              ? "Everyone on your team is teaching or off at that time."
              : "Everyone on your team is teaching at that time."}
        </LeadRow>
        {!reassign && (
          <RowsCard
            rows={[
              { l: "Class", v: `${session.title}, ${weekday(session.date)} ${at}` },
              { l: "Your team", v: accepted.length === 1 ? `1 ${vocab.singular}, ${anyOff ? "not free" : "busy"}` : `${accepted.length} ${vocab.plural}, ${anyOff ? "none free" : "all busy"}` },
            ]}
          />
        )}
        <Buttons
          alt={reassign ? { label: "Back", onClick: onBack ?? onClose } : { label: "Add an employee", onClick: onInvite }}
          primary={{ label: reassign ? `Move ${session.title}` : "Change the time", onClick: () => onMove(session) }}
          marginTop={16}
        />
      </Sheet>
    );
  }

  const assignNow = mode === "reassign";
  return (
    <Sheet open={open} onClose={onClose} title={mode === "reassign" ? `Give ${session.title} to…` : `Assign ${vocab.aSingular}`}>
      {!online && <Strip offline text="You're offline. Assigning needs a connection." />}
      <p className="an5-leadt" style={{ marginBottom: 14 }}>
        {mode === "reassign" ? `${dayDate(session.date)}, ${range12(session.start, session.end)}` : `${session.title} · ${when}`}
      </p>
      <div className="an5-optlist" role="listbox" aria-label={`Available ${vocab.plural}`}>
        <p className="an5-optlist-l">Available at {at}</p>
        {rows.map(({ person, busyWith, off }) => {
          const selected = pick === person.id;
          const disabled = !!busyWith || off || !online;
          return (
            <button
              key={person.id}
              type="button"
              role="option"
              className="an5-opt tap"
              aria-selected={selected}
              aria-disabled={disabled || undefined}
              onClick={() => {
                if (!disabled) setPick(person.id);
              }}
            >
              <Avatar name={person.name} seat={person.seat} />
              <span className="min-w-0">
                <span className="an5-opt-n block">{person.name}</span>
                <span className={`an5-opt-s block${busyWith ? " is-busy" : ""}`}>
                  {busyWith
                    ? `Already teaching ${busyWith.title} at ${time12(busyWith.start)}`
                    : off
                      ? `Off on ${dayDate(session.date)}`
                      : `Free ${weekday(session.date)} ${range12(session.start, session.end)}`}
                </span>
              </span>
              <span className="an5-opt-check">{selected && <Check size={16} strokeWidth={2.6} aria-hidden />}</span>
            </button>
          );
        })}
        {pending.map((p) => (
          <div key={p.id} className="an5-opt" role="option" aria-selected={false} aria-disabled>
            <span className="an5-av is-pending" style={{ width: 30, height: 30, fontSize: 11 }} aria-hidden>
              {p.name.slice(0, 1).toUpperCase()}
            </span>
            <span className="min-w-0">
              <span className="an5-opt-n block">{p.name}</span>
              <span className="an5-opt-s block">Invite pending. You can assign them once they join.</span>
            </span>
            <span />
          </div>
        ))}
      </div>
      {justBooked && <ErrLine text={`${justBooked} was just booked at that time. Choose someone else.`} />}
      <Buttons
        marginTop={16}
        alt={{ label: mode === "reassign" ? "Back" : "Cancel", onClick: mode === "reassign" ? onBack ?? onClose : onClose, disabled: busy }}
        primary={
          chosen
            ? {
                label: busy ? "Assigning…" : `Assign ${chosen.name}`,
                onClick: () => (assignNow ? void save() : setStep("confirm")),
                busy,
                disabled: !online,
              }
            : { label: `Choose ${vocab.aSingular}`, onClick: () => undefined, tone: "soft", disabled: true }
        }
      />
    </Sheet>
  );
}
