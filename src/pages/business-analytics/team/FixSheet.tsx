import { useEffect, useMemo, useState } from "react";
import { CalendarClock, ChevronRight, CircleAlert, CircleCheck, Clock, UserRoundCog, WifiOff } from "lucide-react";
import { WheelPicker } from "../../../components/ui/WheelPicker";
import { useOnline } from "../../../hooks/useOnline";
import { todayLocal } from "../../../utils/date";
import { formatMinutes12, range12, rangeMinutes12, time12 } from "../../../utils/time12";
import { minutesOf, overlaps } from "./model";
import { Buttons, LeadRow, RowsCard, Sheet } from "./parts";
import { moveClassSession } from "../../../services/business-classes/schedule";
import type { ClassRow, TeamPerson } from "./teamData";
import { dayDate, hhmmOf } from "./fmt";

// AN5-033 (both sessions + choices), AN5-033 O2 (already sorted), AN5-036
// (move time, 12-hour wheel), AN5-038 (confirm), OURS availability A7/A8.
// Move (B9 CL-03): move_class_session for every session, booked or not: the
// server re-checks the instructor is free in any business (ATXD9), moves the
// members' calendar entries and what they owe, and tells them (a
// "Class time changed" push). The toast says how many were told.

type Step = "pair" | "time" | "confirm" | "failed" | "sorted";

export function FixSheet({
  open,
  pair,
  move,
  people,
  classes,
  onClose,
  onReassign,
  onDone,
}: {
  open: boolean;
  /** The overlap (Fix flow). */
  pair: { a: ClassRow; b: ClassRow; professionalId: string } | null;
  /** A single session to move (from AN5-030 "Change the time"). */
  move: ClassRow | null;
  people: TeamPerson[];
  classes: ClassRow[];
  onClose: () => void;
  onReassign: (s: ClassRow) => void;
  onDone: (status: string) => void;
}) {
  const online = useOnline();
  const target = move ?? pair?.b ?? null;
  const [step, setStep] = useState<Step>("pair");
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [editing, setEditing] = useState<"start" | "end">("start");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // The overlap may be gone by the time the sheet opens (O2).
  const stillOverlaps = useMemo(() => {
    if (!pair) return true;
    const a = classes.find((c) => c.id === pair.a.id);
    const b = classes.find((c) => c.id === pair.b.id);
    return !!a && !!b && a.professionalId === b.professionalId && a.date === b.date && overlaps(a.start, a.end, b.start, b.end);
  }, [pair, classes]);

  useEffect(() => {
    if (!open || !target) return;
    setStep(move ? "time" : stillOverlaps ? "pair" : "sorted");
    setStart(minutesOf(target.start));
    setEnd(minutesOf(target.end));
    setEditing("start");
    setBusy(false);
    setFailure(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target?.id, move]);

  if (!target) return null;
  const pid = target.professionalId;
  const who = people.find((p) => p.id === pid)?.name ?? "";
  const length = minutesOf(target.end) - minutesOf(target.start);

  // Live check against the instructor's other sessions that day (S1, O2-O4).
  const others = classes.filter((c) => c.id !== target.id && pid && c.professionalId === pid && c.date === target.date);
  const clash = others.find((c) => minutesOf(c.start) < end && start < minutesOf(c.end));
  const now = new Date();
  const past = target.date === todayLocal() && start <= now.getHours() * 60 + now.getMinutes();
  const problem =
    end <= start ? "Ends must be after it starts." : past ? "Choose a time later than now." : clash ? `Still overlaps ${clash.title} until ${time12(clash.end)}.` : null;
  const prevEnding = [...others].filter((c) => minutesOf(c.end) <= start).sort((x, y) => minutesOf(y.end) - minutesOf(x.end))[0];
  const okLine = prevEnding ? `No overlap: ${prevEnding.title} ends at ${time12(prevEnding.end)}.` : "No overlap with their other classes that day.";

  // 12-hour wheel: hour 1-12, minutes 00/15/30/45, AM/PM (DECIDED, AN5-036 row 8).
  const value = editing === "start" ? start : end;
  const setValue = (m: number) => {
    if (editing === "start") {
      setStart(m);
      setEnd(Math.min(m + length, 24 * 60 - 1)); // Ends follows and keeps the length (row 5).
    } else setEnd(m);
  };
  const h12 = Math.floor(value / 60) % 12 === 0 ? 12 : Math.floor(value / 60) % 12;
  const mer = value >= 720 ? "PM" : "AM";
  const min = value % 60;
  const compose = (h: number, m: number, p: string) => ((h % 12) + (p === "PM" ? 12 : 0)) * 60 + m;

  const save = async () => {
    setBusy(true);
    const r = await moveClassSession(target.id, target.date, hhmmOf(start), hhmmOf(end));
    setBusy(false);
    if (r.ok) {
      const told = r.value;
      onDone(`${target.title} now runs ${rangeMinutes12(start, end)}.${told > 0 ? ` ${told} ${told === 1 ? "member was" : "members were"} told.` : ""}`);
      return;
    }
    setFailure(r.refusal === "network" ? null : r.message);
    setStep("failed");
  };

  if (step === "sorted") {
    return (
      <Sheet open={open} onClose={onClose} title="Already sorted">
        <LeadRow icon={CircleCheck} tone="good">
          These sessions no longer overlap.
        </LeadRow>
        <Buttons primary={{ label: "Back to coverage", onClick: onClose }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "failed") {
    return (
      <Sheet open={open} onClose={onClose} title={`Couldn't move ${target.title}`}>
        <LeadRow icon={WifiOff} tone="high">
          {failure ?? "Check your connection and try again. Nothing was changed."}
        </LeadRow>
        <Buttons alt={{ label: "Cancel", onClick: onClose }} primary={{ label: "Try again", onClick: () => void save(), busy }} marginTop={16} />
      </Sheet>
    );
  }

  if (step === "confirm") {
    const n = target.booked;
    return (
      <Sheet open={open} onClose={onClose} title={`Move ${target.title} to ${formatMinutes12(start)}?`}>
        <LeadRow>
          {n === 0
            ? "Nobody is booked yet."
            : `${n === 1 ? "1 member is" : `${n} members are`} booked. They'll get a message about the new time.`}
        </LeadRow>
        <RowsCard
          rows={[
            { l: "Was", v: range12(target.start, target.end) },
            { l: "Now", v: rangeMinutes12(start, end), bold: true },
            ...(who ? [{ l: "Instructor", v: who }] : []),
          ]}
        />
        <Buttons
          alt={{ label: "Back", onClick: () => setStep("time"), disabled: busy }}
          primary={{
            label: busy ? "Moving…" : "Move class",
            onClick: () => void save(),
            busy,
            disabled: !online,
          }}
          marginTop={16}
        />
      </Sheet>
    );
  }

  if (step === "time") {
    return (
      <Sheet open={open} onClose={onClose} title={`Move ${target.title}`}>
        <p className="an5-leadt" style={{ marginBottom: 14 }}>
          {dayDate(target.date)}
          {who ? ` · ${who}` : ""}
        </p>
        <div className="an5-times">
          {(["start", "end"] as const).map((k) => (
            <button key={k} type="button" className="an5-time tap" aria-pressed={editing === k} onClick={() => setEditing(k)}>
              <span className="an5-time-l block">{k === "start" ? "Starts" : "Ends"}</span>
              <span className="an5-time-v block">{formatMinutes12(k === "start" ? start : end)}</span>
            </button>
          ))}
        </div>
        <div className="an5-wheelbox">
          <WheelPicker
            band="business"
            columns={[
              {
                label: "Hour",
                value: h12,
                options: Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
                onChange: (h) => setValue(compose(Number(h), min - (min % 15), mer)),
              },
              {
                label: "Minutes",
                value: min - (min % 15),
                options: [0, 15, 30, 45].map((m) => ({ value: m, label: String(m).padStart(2, "0") })),
                onChange: (m) => setValue(compose(h12, Number(m), mer)),
              },
              {
                label: "AM or PM",
                value: mer,
                options: [
                  { value: "AM", label: "AM" },
                  { value: "PM", label: "PM" },
                ],
                onChange: (p) => setValue(compose(h12, min - (min % 15), String(p))),
              },
            ]}
          />
        </div>
        <p className={`an5-result ${problem ? "is-bad" : "is-good"}`} role="status">
          {problem && <CircleAlert size={14} style={{ flexShrink: 0, marginTop: 1 }} aria-hidden />}
          {problem ?? okLine}
        </p>
        <Buttons
          alt={{ label: "Back", onClick: move ? onClose : () => setStep("pair") }}
          primary={{ label: "Save new time", onClick: () => setStep("confirm"), disabled: !!problem || !online }}
          marginTop={16}
        />
      </Sheet>
    );
  }

  // step === "pair"
  const p = pair as NonNullable<typeof pair>;
  const from = Math.max(minutesOf(p.a.start), minutesOf(p.b.start));
  const to = Math.min(minutesOf(p.a.end), minutesOf(p.b.end));
  return (
    <Sheet open={open} onClose={onClose} title={`${who || "This instructor"} is booked twice`}>
      <p className="an5-leadt" style={{ marginBottom: 14 }}>
        {dayDate(p.a.date)}
      </p>
      <div className="an5-pair">
        {[p.a, p.b].map((s, i) => (
          <div key={s.id} className="an5-sess">
            <p className="an5-sess-k">Session {i + 1}</p>
            <p className="an5-sess-t">{s.title}</p>
            <p className="an5-sess-time">{range12(s.start, s.end)}</p>
            <p className="an5-sess-s">
              {who} · {s.booked} booked
            </p>
          </div>
        ))}
      </div>
      <p className="an5-overlap-t">They overlap from {rangeMinutes12(from, to)}. Change one of them:</p>
      <div className="an5-choices">
        <button type="button" className="an5-choice tap" disabled={!online} onClick={() => onReassign(p.b)}>
          <span className="an5-choice-tile">
            <UserRoundCog size={16} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="an5-choice-t block">Give {p.b.title} to someone else</span>
            <span className="an5-choice-s block">Pick a free instructor</span>
          </span>
          <ChevronRight size={15} style={{ color: "var(--an-faint)" }} aria-hidden />
        </button>
        <button type="button" className="an5-choice tap" disabled={!online} onClick={() => setStep("time")}>
          <span className="an5-choice-tile">
            <Clock size={16} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="an5-choice-t block">Move {p.b.title}</span>
            <span className="an5-choice-s block">Change its start and end time</span>
          </span>
          <ChevronRight size={15} style={{ color: "var(--an-faint)" }} aria-hidden />
        </button>
      </div>
      {!online && (
        <p className="an5-err">
          <CalendarClock size={14} aria-hidden />
          You're offline. Changes need a connection.
        </p>
      )}
    </Sheet>
  );
}
